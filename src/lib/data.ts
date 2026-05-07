export type Role = "User" | "Seller" | "Reseller" | "Admin";
export type SubscriptionStatus = "None" | "Trial" | "Active" | "Past Due";

export const demoAccounts = [
  {
    id: "user-demo",
    name: "Standard User",
    email: "user@standard.gg",
    role: "User" as Role,
    subscription: "None" as SubscriptionStatus,
    redirect: "/account?role=user",
  },
  {
    id: "seller-demo",
    name: "DevStudio",
    email: "seller@standard.gg",
    role: "Seller" as Role,
    subscription: "Active" as SubscriptionStatus,
    plan: "Pro Seller",
    redirect: "/dashboard?role=seller",
  },
  {
    id: "reseller-demo",
    name: "NovaKeys",
    email: "reseller@standard.gg",
    role: "Reseller" as Role,
    subscription: "Active" as SubscriptionStatus,
    plan: "Reseller Pro",
    redirect: "/dashboard?role=reseller",
  },
  {
    id: "admin-demo",
    name: "Standard Admin",
    email: "admin@standard.gg",
    role: "Admin" as Role,
    subscription: "Active" as SubscriptionStatus,
    redirect: "/admin",
  },
];

export const games = [
  "Valorant",
  "CS2",
  "Fortnite",
  "Apex Legends",
  "Call of Duty",
  "League of Legends",
  "Escape from Tarkov",
  "Rust",
];

export const paymentMethods = [
  "Crypto",
  "PayPal G&S",
  "PayPal F&F",
  "Card",
  "CashApp",
  "Skrill",
  "Wise",
  "Gift Cards",
  "Bank Transfer",
];

export const listings = [
  {
    slug: "phantomx-tracker",
    name: "PhantomX Tracker",
    seller: "PhantomX Labs",
    game: "Valorant",
    category: "Analytics / Overlay",
    architecture: "External",
    claimStatus: "Unclaimed",
    integrity: null as number | null,
    confidence: "Pending",
    activity: { vouches: 326, views: 28400, replies: 184, lastSeen: "Recently active" },
    verifiedPayments: [] as string[],
    pendingFacts: ["Pricing", "Payment methods", "Provider proof", "Feature set"],
  },
  {
    slug: "shadow-overlay-reference",
    name: "Shadow Overlay Reference",
    seller: "Shadow Market",
    game: "CS2",
    category: "Overlay / Utility",
    architecture: "Unknown",
    claimStatus: "Unclaimed",
    integrity: null as number | null,
    confidence: "Pending",
    activity: { vouches: 84, views: 6840, replies: 51, lastSeen: "Unknown" },
    verifiedPayments: [] as string[],
    pendingFacts: ["Architecture", "Payment profile", "Seller identity"],
  },
  {
    slug: "novakeys-reseller-offer",
    name: "NovaKeys Reseller Offer",
    seller: "NovaKeys",
    game: "Valorant",
    category: "Reseller Offer",
    architecture: "Unknown",
    claimStatus: "Claim Pending",
    integrity: null as number | null,
    confidence: "Low",
    activity: { vouches: 0, views: 0, replies: 0, lastSeen: "Submitted" },
    verifiedPayments: ["Crypto", "PayPal G&S"],
    pendingFacts: ["Authorization proof", "Stock proof", "Refund policy"],
  },
];

export const sellerProducts = [
  {
    name: "PhantomX Tracker",
    status: "Unclaimed Reference",
    toolStatus: "Pending Verification",
    game: "Valorant",
    features: ["Match analytics", "Overlay", "Rank tracking"],
    views: 28400,
    outboundClicks: 1320,
    integrity: "Pending",
    nextAction: "Claim and verify listing facts",
  },
  {
    name: "Shadow Overlay Reference",
    status: "Pending Review",
    toolStatus: "Updating",
    game: "CS2",
    features: ["Overlay HUD", "Crosshair sync", "Map awareness"],
    views: 6840,
    outboundClicks: 412,
    integrity: "Pending",
    nextAction: "Submit proof and payment profile",
  },
];

export const resellerOffers = [
  {
    tool: "PhantomX Tracker",
    reseller: "NovaKeys",
    status: "Pending Verification",
    stock: "Available",
    delivery: "15 min manual",
    payments: ["Crypto", "PayPal G&S"],
    price: "$27 / month",
    disputes: "0 open",
  },
  {
    tool: "Shadow Overlay Reference",
    reseller: "ByteMarket",
    status: "Needs Proof",
    stock: "Limited",
    delivery: "Manual",
    payments: ["Crypto", "Gift Cards"],
    price: "$12 / week",
    disputes: "1 open",
  },
];

export const analytics = [
  { label: "Listing views", value: "38.6K", change: "+18.6%" },
  { label: "Outbound clicks", value: "2.1K", change: "+12.4%" },
  { label: "Claim conversion", value: "7.8%", change: "+2.1%" },
  { label: "Payment filter usage", value: "41%", change: "+9.3%" },
];

export const trafficSources = [
  ["Marketplace", 47],
  ["Game filters", 24],
  ["Payment filters", 18],
  ["Seller profile", 11],
];

export const adminSignals = [
  {
    title: "Claim proof missing",
    meta: "PhantomX Tracker needs provider proof before verification.",
    risk: "Medium",
  },
  {
    title: "High-risk payment profile",
    meta: "ByteMarket lists Gift Cards and Crypto without refund policy.",
    risk: "High",
  },
  {
    title: "Review pattern watch",
    meta: "8 new positive reviews from low-age accounts on one reference.",
    risk: "Medium",
  },
];

export const claimQueue = [
  {
    listing: "PhantomX Tracker",
    requester: "seller@standard.gg",
    type: "Provider claim",
    status: "Needs proof",
  },
  {
    listing: "NovaKeys Reseller Offer",
    requester: "reseller@standard.gg",
    type: "Reseller application",
    status: "Under review",
  },
];

export const plans = [
  {
    name: "Starter Seller",
    price: "$29",
    limit: "5 product listings",
    target: "Small providers",
  },
  {
    name: "Pro Seller",
    price: "$79",
    limit: "10 product listings + analytics",
    target: "Active providers",
  },
  {
    name: "Reseller Pro",
    price: "$59",
    limit: "25 reseller offers",
    target: "Verified resellers",
  },
  {
    name: "Big Seller",
    price: "$199",
    limit: "30 listings / 100 offers",
    target: "Large catalogs",
  },
];
