import { createClient } from "@/lib/supabase/server";

export async function getPendingPaymentVerificationRequests() {
  const supabase = createClient();
  return supabase
    .from("payment_verification_requests")
    .select("*, sellers(*), payment_methods(*), products(*)")
    .in("status", ["pending_verification", "needs_recheck"])
    .order("created_at", { ascending: true });
}

export async function getPendingProviderTagRequests() {
  const supabase = createClient();
  return supabase
    .from("provider_tag_requests")
    .select("*, sellers(*)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
}
