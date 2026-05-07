import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export async function requireRole(allowedRoles: Array<"user" | "seller" | "admin">) {
  // Keeps the prototype navigable before env vars are configured. Once Supabase
  // env vars exist, this becomes real server-side route protection.
  if (!isSupabaseConfigured()) return { user: null, role: "demo" as const };

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(allowedRoles.includes("admin") ? "/admin" : "/dashboard")}`);

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single<{ role: "user" | "seller" | "admin" }>();
  if (!profile || !allowedRoles.includes(profile.role)) redirect("/account");
  return { user, role: profile.role };
}
