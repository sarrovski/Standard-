import Stripe from "stripe";
import { getSiteUrl } from "@/lib/site-url";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
  apiVersion: "2024-06-20",
});

// Re-exported so existing Stripe route imports (`from "@/lib/stripe"`) keep
// working without modification. New code should import from "@/lib/site-url".
export { getSiteUrl };
