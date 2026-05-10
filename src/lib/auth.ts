export type AccountRole = "user" | "seller" | "admin";
export type SellerSubscriptionStatus = "none" | "trial" | "active" | "past_due";
export type SellerTag = "none" | "verified_seller" | "provider_developer";

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
    role: "user",
    sellerSubscriptionStatus: "none",
    sellerTag: "none",
  },
  {
    id: "seller-active",
    email: "seller@standard.gg",
    name: "DevStudio",
    role: "seller",
    sellerSubscriptionStatus: "active",
    sellerTag: "provider_developer",
  },
  {
    id: "seller-no-sub",
    email: "new@standard.gg",
    name: "New Seller",
    role: "seller",
    sellerSubscriptionStatus: "none",
    sellerTag: "none",
  },
  {
    id: "admin-demo",
    email: "admin@standard.gg",
    name: "Standard Admin",
    role: "admin",
    sellerSubscriptionStatus: "active",
    sellerTag: "none",
  },
];

export function getPostLoginRedirect(session: MockSession) {
  if (session.role === "admin") return "/admin";
  if (session.role === "seller" && session.sellerSubscriptionStatus === "active") {
    return "/dashboard";
  }
  if (session.role === "seller") return "/account?view=sell";
  return "/account";
}

export const authLogicSteps = [
  {
    label: "User",
    condition: 'role === "user"',
    redirect: "/account",
    description: "Buyer account with watchlist, reviews, alerts, and payment preferences.",
  },
  {
    label: "Seller, active subscription",
    condition: 'role === "seller" && sellerSubscriptionStatus === "active"',
    redirect: "/dashboard",
    description: "Full seller dashboard with products, payment verification, analytics, provider tag, and billing.",
  },
  {
    label: "Seller, no active subscription",
    condition: 'role === "seller" && sellerSubscriptionStatus !== "active"',
    redirect: "/account?view=sell",
    description: "Seller onboarding and plan selection before dashboard access.",
  },
  {
    label: "Admin",
    condition: 'role === "admin"',
    redirect: "/admin",
    description: "Admin control center for submissions, provider tags, payment risk, and moderation.",
  },
];
