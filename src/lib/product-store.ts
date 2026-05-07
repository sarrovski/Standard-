import { featuredSlots } from "@/lib/data";
import type { LocalFeaturedSlot, LocalPaymentRequest, LocalProduct, LocalSession } from "@/lib/product-types";

// v21 is Supabase-first. These arrays are a browser-safe demo fallback so the
// prototype remains clickable before project env vars and database migrations
// are configured. Replace callers with live queries from /lib/repositories as
// each screen is wired to Supabase.
let demoProducts: LocalProduct[] = [];
let demoPaymentRequests: LocalPaymentRequest[] = [];
let demoFeaturedSlots: LocalFeaturedSlot[] | null = null;
let demoSession: LocalSession | null = null;

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function getLocalProducts(): LocalProduct[] {
  return demoProducts;
}

export function saveLocalProducts(products: LocalProduct[]) {
  demoProducts = products;
}

export function addLocalProduct(product: LocalProduct) {
  saveLocalProducts([product, ...demoProducts.filter((item) => item.slug !== product.slug)]);
}

export function getPaymentRequests(): LocalPaymentRequest[] {
  return demoPaymentRequests;
}

export function savePaymentRequests(requests: LocalPaymentRequest[]) {
  demoPaymentRequests = requests;
}

export function addPaymentRequest(request: LocalPaymentRequest) {
  savePaymentRequests([request, ...demoPaymentRequests]);
}

export function getFeaturedSlots(): LocalFeaturedSlot[] {
  if (!demoFeaturedSlots) {
    demoFeaturedSlots = featuredSlots.map((slot) => ({
      ...slot,
      productSlug: slot.product ? slugify(slot.product) : null,
    })) as LocalFeaturedSlot[];
  }
  return demoFeaturedSlots;
}

export function saveFeaturedSlots(slots: LocalFeaturedSlot[]) {
  demoFeaturedSlots = slots;
}

export function getSession(): LocalSession | null {
  return demoSession;
}

export function saveSession(session: LocalSession) {
  demoSession = session;
}

export function clearSession() {
  demoSession = null;
}
