export type AccountRole = "USER" | "SELLER" | "ADMIN";
export type SellerSubscriptionStatus = "NONE" | "TRIAL" | "ACTIVE" | "PAST_DUE";
export type SellerTag = "NONE" | "VERIFIED_SELLER" | "PROVIDER_DEVELOPER";

export type MockSession = {
  id: string;
  email: string;
  name: string;
  role: AccountRole;
  sellerSubscriptionStatus: SellerSubscriptionStatus;
  sellerTag: SellerTag;
};

export const mockSessions: MockSession[] = [
  {
    id: "user-demo",
    email: "user@standard.gg",
    name: "Standard User",
    role: "USER",
    sellerSubscriptionStatus: "NONE",
    sellerTag: "NONE",
  },
  {
    id: "seller-active",
    email: "seller@standard.gg",
    name: "DevStudio",
    role: "SELLER",
    sellerSubscriptionStatus: "ACTIVE",
    sellerTag: "PROVIDER_DEVELOPER",
  },
  {
    id: "seller-no-sub",
    email: "new@standard.gg",
    name: "New Seller",
    role: "SELLER",
    sellerSubscriptionStatus: "NONE",
    sellerTag: "NONE",
  },
  {
    id: "admin-demo",
    email: "admin@standard.gg",
    name: "Standard Admin",
    role: "ADMIN",
    sellerSubscriptionStatus: "ACTIVE",
    sellerTag: "NONE",
  },
];

export function getPostLoginRedirect(session: MockSession) {
  if (session.role === "ADMIN") return "/admin";
  if (session.role === "SELLER" && session.sellerSubscriptionStatus === "ACTIVE") {
    return "/dashboard";
  }
  if (session.role === "SELLER") return "/account?view=sell";
  return "/account";
}

export const authLogicSteps = [
  {
    label: "User",
    condition: "role === USER",
    redirect: "/account",
    description: "Buyer account with watchlist, reviews, alerts, and payment preferences.",
  },
  {
    label: "Seller, active subscription",
    condition: "role === SELLER && sellerSubscriptionStatus === ACTIVE",
    redirect: "/dashboard",
    description: "Full seller dashboard with listings, offers, payments, analytics, verification, and billing.",
  },
  {
    label: "Seller, no active subscription",
    condition: "role === SELLER && sellerSubscriptionStatus !== ACTIVE",
    redirect: "/account?view=sell",
    description: "Seller onboarding and plan selection before dashboard access.",
  },
  {
    label: "Admin",
    condition: "role === ADMIN",
    redirect: "/admin",
    description: "Admin control center for submissions, provider tags, payment risk, and moderation.",
  },
];
