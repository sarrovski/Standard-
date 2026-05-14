"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui";
import { youtubeEmbedUrl } from "@/lib/youtube";
import type { UIProductMedia } from "@/lib/adapters";

/**
 * Per-product media editor (images + YouTube links).
 *
 * Used from the seller-side product edit page. Talks directly to
 * /api/seller/products/[id]/media — no extra plumbing needed.
 *
 * Lives in its own file so both the edit page and any future media-only
 * surface (e.g. a quick "Add cover" modal) can mount it without dragging
 * the entire seller dashboard along.
 */

type ProductMediaApiRow = {
  id: string;
  storage_path: string | null;
  public_url: string | null;
  alt_text: string | null;
  sort_order: number;
  media_type?: string | null;
  external_url?: string | null;
  provider?: string | null;
  video_id?: string | null;
  thumbnail_url?: string | null;
  title?: string | null;
};

function apiMediaToUI(row: ProductMediaApiRow): UIProductMedia {
  const type = row.media_type === "youtube" ? "youtube" : "image";
  return {
    id: row.id,
    type,
    storagePath: row.storage_path,
    publicUrl: row.public_url,
    imageUrl: type === "image" ? row.public_url : null,
    thumbnailUrl: type === "youtube" ? row.thumbnail_url ?? null : row.public_url,
    embedUrl: type === "youtube" && row.video_id ? youtubeEmbedUrl(row.video_id) : null,
    externalUrl: row.external_url ?? null,
    altText: row.alt_text,
    title: row.title ?? row.alt_text ?? (type === "youtube" ? "Product video" : "Product image"),
    sortOrder: row.sort_order,
  };
}

export function ProductMediaPanel({
  productId,
  initialMedia,
  onMediaChange,
}: {
  productId: string;
  initialMedia: UIProductMedia[];
  /** Fires after every successful add/remove so the parent can react live. */
  onMediaChange?: (media: UIProductMedia[]) => void;
}) {
  const [media, setMedia] = useState<UIProductMedia[]>(initialMedia);
  useEffect(() => {
    onMediaChange?.(media);
  }, [media, onMediaChange]);
  const [altText, setAltText] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [addingVideo, setAddingVideo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyDeleteId, setBusyDeleteId] = useState<string | null>(null);
  // Tracks the most recent successful upload so we can mark it as "Saved"
  // briefly. Auto-clears after a few seconds so the badge doesn't stick on
  // older items forever.
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!savedNotice) return;
    const timeout = window.setTimeout(() => {
      setSavedNotice(null);
      setLastSavedId(null);
    }, 4000);
    return () => window.clearTimeout(timeout);
  }, [savedNotice]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset the input so the same file can be re-selected later if needed.
    event.target.value = "";
    if (!file) return;
    setError(null);
    setSavedNotice(null);
    setLastSavedId(null);

    const formData = new FormData();
    formData.append("file", file);
    if (altText.trim()) formData.append("alt_text", altText.trim());

    setUploading(true);
    try {
      const response = await fetch(`/api/seller/products/${productId}/media`, {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as {
        media?: ProductMediaApiRow;
        error?: string;
        step?: string;
        code?: string;
        details?: string;
      };
      const uploaded = payload.media;
      if (!response.ok || !uploaded) {
        const stepLabel = payload.step ? `[${payload.step}] ` : "";
        const detailSuffix = payload.details ? ` (${payload.details})` : "";
        setError(
          `${stepLabel}${payload.error ?? "Upload failed."}${detailSuffix}`,
        );
        return;
      }
      setMedia((prev) => [...prev, apiMediaToUI(uploaded)]);
      setAltText("");
      setLastSavedId(uploaded.id);
      setSavedNotice("Image uploaded and saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setUploading(false);
    }
  };

  const handleAddVideo = async () => {
    setError(null);
    setSavedNotice(null);
    setLastSavedId(null);
    if (!videoUrl.trim()) {
      setError("[validation] Enter a YouTube URL.");
      return;
    }

    setAddingVideo(true);
    try {
      const response = await fetch(`/api/seller/products/${productId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "youtube",
          url: videoUrl,
          title: videoTitle || undefined,
          alt_text: altText || undefined,
        }),
      });
      const payload = (await response.json()) as {
        media?: ProductMediaApiRow;
        error?: string;
        step?: string;
        code?: string;
        details?: string;
      };
      const added = payload.media;
      if (!response.ok || !added) {
        const stepLabel = payload.step ? `[${payload.step}] ` : "";
        const detailSuffix = payload.details ? ` (${payload.details})` : "";
        setError(`${stepLabel}${payload.error ?? "Could not add video."}${detailSuffix}`);
        return;
      }
      setMedia((prev) => [...prev, apiMediaToUI(added)]);
      setVideoUrl("");
      setVideoTitle("");
      setLastSavedId(added.id);
      setSavedNotice("Video added and saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setAddingVideo(false);
    }
  };

  const handleDelete = async (mediaId: string) => {
    setBusyDeleteId(mediaId);
    setError(null);
    try {
      const response = await fetch(`/api/seller/products/${productId}/media`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ media_id: mediaId }),
      });
      const payload = (await response.json()) as {
        error?: string;
        step?: string;
        code?: string;
      };
      if (response.status >= 400 && response.status !== 207) {
        const stepLabel = payload.step ? `[${payload.step}] ` : "";
        setError(`${stepLabel}${payload.error ?? "Delete failed."}`);
        return;
      }
      setMedia((prev) => prev.filter((m) => m.id !== mediaId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setBusyDeleteId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Media</div>
          <p className="mt-2 text-sm text-slate-400">
            Add uploaded images or seller-provided YouTube links.
          </p>
        </div>
        <Badge tone="default">{media.length} items</Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {media.map((m) => {
          const isJustSaved = m.id === lastSavedId;
          const previewUrl = m.type === "youtube" ? m.thumbnailUrl : m.imageUrl;
          return (
            <div
              key={m.id}
              className="group relative overflow-hidden rounded-xl border border-white/10 bg-black/40 aspect-square"
            >
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt={m.altText ?? m.title ?? ""}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-slate-500">
                  No URL
                </div>
              )}
              <div className="absolute left-1 top-1 rounded-md border border-white/20 bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">
                {m.type === "youtube" ? "YouTube" : "Image"}
              </div>
              {isJustSaved && (
                <div className="absolute bottom-1 left-1 rounded-md border border-emerald-400/40 bg-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-50">
                  Saved
                </div>
              )}
              <button
                type="button"
                onClick={() => handleDelete(m.id)}
                disabled={busyDeleteId === m.id}
                className="absolute right-1 top-1 rounded-md border border-red-400/30 bg-red-500/30 px-2 py-1 text-[10px] font-bold text-white opacity-0 transition group-hover:opacity-100 disabled:opacity-60"
              >
                {busyDeleteId === m.id ? "…" : "Delete"}
              </button>
            </div>
          );
        })}
        {media.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-white/15 bg-black/20 p-4 text-sm text-slate-400">
            No media yet.
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Images
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Alt text (optional)
              </span>
              <input
                value={altText}
                onChange={(event) => setAltText(event.target.value)}
                placeholder="Describe the image or video"
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white outline-none transition focus:border-orange-400/50"
              />
            </label>
            <label
              className={`inline-flex cursor-pointer items-center justify-center gap-1 rounded-lg bg-orange-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-orange-400 ${
                uploading ? "opacity-60" : ""
              }`}
            >
              <span aria-hidden="true" className="leading-none">+</span>
              {uploading ? "Uploading..." : "Upload image"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Images are saved automatically as soon as they upload.
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            YouTube video
          </div>
          <div className="mt-3 grid gap-3">
            <input
              value={videoUrl}
              onChange={(event) => setVideoUrl(event.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white outline-none transition focus:border-orange-400/50"
            />
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                value={videoTitle}
                onChange={(event) => setVideoTitle(event.target.value)}
                placeholder="Video title (optional)"
                className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white outline-none transition focus:border-orange-400/50"
              />
              <button
                type="button"
                onClick={handleAddVideo}
                disabled={addingVideo}
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-orange-400/40 bg-orange-500/15 px-4 py-2 text-xs font-semibold text-orange-100 transition hover:bg-orange-500/25 disabled:opacity-60"
              >
                <span aria-hidden="true" className="leading-none">+</span>
                {addingVideo ? "Adding..." : "Add video"}
              </button>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Standard stores a safe YouTube ID and embeds from that ID.
          </p>
        </div>
      </div>

      {savedNotice && (
        <div className="mt-3 rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-2 text-xs text-emerald-100">
          {savedNotice}
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-lg border border-red-400/30 bg-red-500/10 p-2 text-xs text-red-200">
          {error}
        </div>
      )}
    </div>
  );
}
