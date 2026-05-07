import { featuredSlots } from "@/lib/data";
import type { LocalFeaturedSlot, LocalPaymentRequest, LocalProduct, LocalSession } from "@/lib/local-types";

export const STORAGE_KEYS = {
  session: "standard.session",
  products: "standard.products",
  paymentRequests: "standard.paymentRequests",
  featuredSlots: "standard.featuredSlots",
};

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function getLocalProducts(): LocalProduct[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.products) || "[]") as LocalProduct[];
  } catch {
    return [];
  }
}

export function saveLocalProducts(products: LocalProduct[]) {
  localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(products));
}

export function addLocalProduct(product: LocalProduct) {
  const products = getLocalProducts();
  saveLocalProducts([product, ...products.filter((item) => item.slug !== product.slug)]);
}

export function getPaymentRequests(): LocalPaymentRequest[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.paymentRequests) || "[]") as LocalPaymentRequest[];
  } catch {
    return [];
  }
}

export function savePaymentRequests(requests: LocalPaymentRequest[]) {
  localStorage.setItem(STORAGE_KEYS.paymentRequests, JSON.stringify(requests));
}

export function addPaymentRequest(request: LocalPaymentRequest) {
  const requests = getPaymentRequests();
  savePaymentRequests([request, ...requests]);
}

export function getFeaturedSlots(): LocalFeaturedSlot[] {
  if (typeof window === "undefined") return [];
  try {
    const existing = localStorage.getItem(STORAGE_KEYS.featuredSlots);
    if (existing) return JSON.parse(existing) as LocalFeaturedSlot[];
    const seeded = featuredSlots.map((slot) => ({
      ...slot,
      productSlug: slot.product ? slugify(slot.product) : null,
    })) as LocalFeaturedSlot[];
    localStorage.setItem(STORAGE_KEYS.featuredSlots, JSON.stringify(seeded));
    return seeded;
  } catch {
    return [];
  }
}

export function saveFeaturedSlots(slots: LocalFeaturedSlot[]) {
  localStorage.setItem(STORAGE_KEYS.featuredSlots, JSON.stringify(slots));
}

export function getSession(): LocalSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.session);
    return raw ? (JSON.parse(raw) as LocalSession) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: LocalSession) {
  localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.session);
}
