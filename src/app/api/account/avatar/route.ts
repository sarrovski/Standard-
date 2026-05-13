import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/roles";
import type { Database } from "@/lib/supabase/types";

/**
 * Profile-avatar upload / removal.
 *
 *   POST   /api/account/avatar   multipart/form-data, field "file"
 *   DELETE /api/account/avatar   no body
 *
 * Auth: requires an authenticated session (cookies-scoped client).
 *
 * Storage layout (reuses the existing product-media bucket):
 *   users/{user_id}/avatar-{timestamp}.{ext}
 *
 * Uploads go through the service-role admin client. The path is built
 * server-side from the authenticated user's id, so the user cannot
 * write to anyone else's prefix.
 *
 * On replace / delete, we best-effort remove the previous file so the
 * bucket doesn't accumulate dead objects per user. Failures are logged
 * and ignored — the database update is the source of truth.
 */

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_MIME = new Set<string>([
  "image/png",
  "image/jpeg",
  "image/webp",
]);
const BUCKET = "product-media";

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
type ProfileRow = { id: string; avatar_url: string | null };

function extFromMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

/**
 * Convert a public storage URL back into the bucket-relative path so we
 * can call .remove([path]). Returns null if the URL doesn't look like a
 * Supabase public storage URL for our bucket.
 */
function pathFromPublicUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  if (i < 0) return null;
  return url.slice(i + marker.length);
}

async function bestEffortRemoveAvatar(currentUrl: string | null): Promise<void> {
  const path = pathFromPublicUrl(currentUrl);
  if (!path) return;
  try {
    const admin = createAdminClient();
    const { error } = await admin.storage.from(BUCKET).remove([path]);
    if (error) {
      console.error(
        "[api/account/avatar] storage remove failed (continuing):",
        error.message,
      );
    }
  } catch (err) {
    console.error("[api/account/avatar] storage remove threw (continuing):", err);
  }
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase not configured." },
      { status: 503 },
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data." },
      { status: 400 },
    );
  }
  const fileEntry = formData.get("file");
  if (!(fileEntry instanceof File)) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }
  if (fileEntry.size === 0) {
    return NextResponse.json({ error: "Empty file." }, { status: 400 });
  }
  if (fileEntry.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Image must be 2MB or smaller." },
      { status: 413 },
    );
  }
  if (!ALLOWED_MIME.has(fileEntry.type)) {
    return NextResponse.json(
      { error: "Use a PNG, JPEG, or WebP image." },
      { status: 415 },
    );
  }

  // Look up the current avatar so we can clean it up after the new one is
  // saved. Failures here are logged but don't block the upload.
  const { data: existing } = await supabase
    .from("profiles")
    .select("id, avatar_url")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  const ext = extFromMime(fileEntry.type);
  const path = `users/${user.id}/avatar-${Date.now()}.${ext}`;

  const admin = createAdminClient();
  const { error: uploadErr } = await admin.storage.from(BUCKET).upload(
    path,
    fileEntry,
    {
      contentType: fileEntry.type,
      cacheControl: "3600",
      upsert: false,
    },
  );
  if (uploadErr) {
    console.error("[api/account/avatar] upload failed:", uploadErr.message);
    return NextResponse.json(
      { error: "Couldn't upload avatar." },
      { status: 500 },
    );
  }

  const publicUrl = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  const update: ProfileUpdate = { avatar_url: publicUrl };
  const { error: updateErr } = await supabase
    .from("profiles")
    .update(update as never)
    .eq("id", user.id);
  if (updateErr) {
    console.error(
      "[api/account/avatar] profile update failed:",
      updateErr.message,
    );
    // Roll back the storage write so we don't end up with an orphan.
    await bestEffortRemoveAvatar(publicUrl);
    return NextResponse.json(
      { error: "Couldn't save avatar." },
      { status: 500 },
    );
  }

  // The new avatar is live in profiles; safe to drop the previous file.
  if (existing?.avatar_url && existing.avatar_url !== publicUrl) {
    await bestEffortRemoveAvatar(existing.avatar_url);
  }

  return NextResponse.json({ avatar_url: publicUrl });
}

export async function DELETE() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase not configured." },
      { status: 503 },
    );
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: existing } = await supabase
    .from("profiles")
    .select("id, avatar_url")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  const update: ProfileUpdate = { avatar_url: null };
  const { error: updateErr } = await supabase
    .from("profiles")
    .update(update as never)
    .eq("id", user.id);
  if (updateErr) {
    console.error(
      "[api/account/avatar DELETE] profile update failed:",
      updateErr.message,
    );
    return NextResponse.json(
      { error: "Couldn't remove avatar." },
      { status: 500 },
    );
  }

  if (existing?.avatar_url) {
    await bestEffortRemoveAvatar(existing.avatar_url);
  }
  return NextResponse.json({ ok: true });
}
