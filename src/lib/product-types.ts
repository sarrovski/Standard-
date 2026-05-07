import type { PaymentMethod, PaymentVerificationStatus } from "@/lib/data";

export type LocalSession = {
  email: string;
  role: "USER" | "SELLER" | "ADMIN";
  sellerSubscriptionStatus: "NONE" | "ACTIVE";
  sellerTag: "NONE" | "VERIFIED_SELLER" | "PROVIDER_DEVELOPER";
};

export type LocalProduct = {
  slug: string;
  name: string;
  seller: string;
  sellerTag: string;
  game: string;
  category: string;
  architecture: string;
  productStatus: string;
  integrity: number | null;
  confidence: string;
  verifiedPayments: PaymentMethod[];
  paymentProfiles: Array<{
    method: PaymentMethod;
    status: PaymentVerificationStatus;
    processor: string;
    proofType: string;
    proofNote: string;
    checkoutUrl?: string;
    refundPolicy?: string;
  }>;
  features: string[];
  pricePoints: string[];
  delivery: string;
  refundPolicy: string;
  accent: string;
  summary: string;
  websiteUrl: string;
  websiteLabel: string;
  discord: string;
  telegram: string;
  trustSignals: string[];
  gallery: Array<{ title: string; accent: string }>;
  benefits: string[];
  faq: Array<{ q: string; a: string }>;
  activity: {
    vouches: number;
    views: number;
    replies: number;
    lastSeen: string;
  };
};

export type LocalPaymentRequest = {
  id: string;
  seller: string;
  productSlug: string;
  productName: string;
  method: PaymentMethod;
  processor: string;
  checkoutUrl: string;
  refundPolicy: string;
  proofNote: string;
  status: PaymentVerificationStatus;
  risk: "Low" | "Medium" | "High";
  createdAt: string;
};

export type LocalFeaturedSlot = {
  category: string;
  status: "Available" | "Occupied";
  product: string | null;
  productSlug: string | null;
  seller: string | null;
  startsAt: string | null;
  endsAt: string | null;
  price: string;
};
