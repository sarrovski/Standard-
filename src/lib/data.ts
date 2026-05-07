export type Role = "User" | "Seller" | "Admin";
export type SubscriptionStatus = "None" | "Trial" | "Active" | "Past Due";

export const demoAccounts = [
  {
    id: "user-demo",
    name: "Standard User",
    email: "user@standard.gg",
    role: "User" as Role,
    subscription: "None" as SubscriptionStatus,
    access: "Buyer account",
    redirect: "/account?role=user",
  },
  {
    id: "seller-active",
    name: "DevStudio",
    email: "seller@standard.gg",
    role: "Seller" as Role,
    subscription: "Active" as SubscriptionStatus,
    access: "Seller dashboard",
    plan: "Pro Seller",
    sellerTag: "Provider / Developer",
    redirect: "/dashboard",
  },
  {
    id: "seller-no-sub",
    name: "New Seller",
    email: "new@standard.gg",
    role: "Seller" as Role,
    subscription: "None" as SubscriptionStatus,
    access: "Seller onboarding",
    plan: "No active subscription",
    sellerTag: "Seller",
    redirect: "/account?view=sell",
  },
  {
    id: "admin-demo",
    name: "Standard Admin",
    email: "admin@standard.gg",
    role: "Admin" as Role,
    subscription: "Active" as SubscriptionStatus,
    access: "Admin control center",
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
] as const;

export type PaymentMethod = (typeof paymentMethods)[number];

export const sellerTags = ["All", "Seller", "Verified Seller", "Provider / Developer"] as const;
export const listingStatuses = ["All", "Verified", "Pending Review"] as const;

export const listings = [
  {
    slug: "phantomx-tracker",
    name: "PhantomX Tracker",
    seller: "PhantomX Labs",
    sellerTag: "Provider / Developer",
    game: "Valorant",
    category: "Analytics / Overlay",
    architecture: "External",
    listingStatus: "Verified",
    integrity: 92 as number | null,
    confidence: "High",
    activity: { vouches: 326, views: 28400, replies: 184, lastSeen: "Recently active" },
    verifiedPayments: ["Crypto", "Card", "PayPal G&S"] as PaymentMethod[],
    features: ["Match analytics", "Overlay HUD", "Rank tracking", "Agent insights"],
    pricePoints: ["$6 daily", "$19 weekly", "$49 monthly"],
    delivery: "Instant",
    refundPolicy: "Visible after seller login integration",
    accent: "from-violet-500/70 to-cyan-400/40",
  },
  {
    slug: "shadow-overlay-reference",
    name: "Shadow Overlay",
    seller: "Shadow Market",
    sellerTag: "Seller",
    game: "CS2",
    category: "Overlay / Utility",
    architecture: "Unknown",
    listingStatus: "Pending Review",
    integrity: null as number | null,
    confidence: "Pending",
    activity: { vouches: 84, views: 6840, replies: 51, lastSeen: "Unknown" },
    verifiedPayments: [] as PaymentMethod[],
    features: ["Overlay HUD", "Crosshair sync", "Map awareness"],
    pricePoints: [],
    delivery: "Pending verification",
    refundPolicy: "Pending verification",
    accent: "from-fuchsia-500/60 to-slate-500/30",
  },
  {
    slug: "novakeys-reseller-offer",
    name: "NovaKeys Offer",
    seller: "NovaKeys",
    sellerTag: "Verified Seller",
    game: "Valorant",
    category: "Seller Offer",
    architecture: "Unknown",
    listingStatus: "Pending Review",
    integrity: 74 as number | null,
    confidence: "Medium",
    activity: { vouches: 18, views: 910, replies: 14, lastSeen: "1 day ago" },
    verifiedPayments: ["Crypto", "PayPal G&S"] as PaymentMethod[],
    features: ["Manual delivery", "Support relay", "Payment flexibility"],
    pricePoints: ["$27 monthly"],
    delivery: "15 min manual",
    refundPolicy: "Pending admin review",
    accent: "from-cyan-500/60 to-purple-500/30",
  },
  {
    slug: "stratpad-suite",
    name: "StratPad Suite",
    seller: "Tactical Forge",
    sellerTag: "Seller",
    game: "Fortnite",
    category: "Utility / Companion",
    architecture: "Cloud",
    listingStatus: "Verified",
    integrity: 88 as number | null,
    confidence: "High",
    activity: { vouches: 143, views: 11200, replies: 63, lastSeen: "Today" },
    verifiedPayments: ["Card", "PayPal G&S", "Crypto"] as PaymentMethod[],
    features: ["Route planner", "Session notes", "Loadout presets"],
    pricePoints: ["$9 weekly", "$29 monthly"],
    delivery: "Instant",
    refundPolicy: "7-day limited policy",
    accent: "from-indigo-500/70 to-cyan-500/30",
  },
  {
    slug: "apex-scan-pro",
    name: "Apex Scan Pro",
    seller: "PulseWorks",
    sellerTag: "Provider / Developer",
    game: "Apex Legends",
    category: "Analytics",
    architecture: "External",
    listingStatus: "Verified",
    integrity: 90 as number | null,
    confidence: "High",
    activity: { vouches: 201, views: 16700, replies: 92, lastSeen: "Recently active" },
    verifiedPayments: ["Crypto", "Card"] as PaymentMethod[],
    features: ["Performance scan", "Map review", "Session export"],
    pricePoints: ["$12 weekly", "$39 monthly"],
    delivery: "Instant",
    refundPolicy: "Visible after checkout integration",
    accent: "from-orange-500/60 to-purple-500/30",
  },
  {
    slug: "rift-control",
    name: "Rift Control",
    seller: "Macro Lane",
    sellerTag: "Seller",
    game: "League of Legends",
    category: "Assistant / Utility",
    architecture: "External",
    listingStatus: "Pending Review",
    integrity: 68 as number | null,
    confidence: "Medium",
    activity: { vouches: 59, views: 4200, replies: 28, lastSeen: "3 days ago" },
    verifiedPayments: ["Crypto"] as PaymentMethod[],
    features: ["Session tracking", "Build sync", "Match notes"],
    pricePoints: ["$5 daily", "$16 weekly"],
    delivery: "Manual",
    refundPolicy: "Pending review",
    accent: "from-emerald-500/60 to-cyan-500/20",
  },
];

export const sellerProducts = [
  {
    name: "PhantomX Tracker",
    status: "Verified",
    toolStatus: "Working",
    game: "Valorant",
    features: ["Match analytics", "Overlay", "Rank tracking"],
    views: 28400,
    outboundClicks: 1320,
    integrity: "92",
    nextAction: "Keep pricing and payments updated",
  },
  {
    name: "Shadow Overlay",
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

export const sellerOffers = [
  {
    tool: "PhantomX Tracker",
    seller: "NovaKeys",
    status: "Pending Verification",
    stock: "Available",
    delivery: "15 min manual",
    payments: ["Crypto", "PayPal G&S"] as PaymentMethod[],
    price: "$27 / month",
    disputes: "0 open",
  },
  {
    tool: "Shadow Overlay",
    seller: "ByteMarket",
    status: "Needs Proof",
    stock: "Limited",
    delivery: "Manual",
    payments: ["Crypto", "Gift Cards"] as PaymentMethod[],
    price: "$12 / week",
    disputes: "1 open",
  },
];

export const analytics = [
  { label: "Listing views", value: "38.6K", change: "+18.6%" },
  { label: "Outbound clicks", value: "2.1K", change: "+12.4%" },
  { label: "Payment filter usage", value: "41%", change: "+9.3%" },
  { label: "Verified buyer reviews", value: "186", change: "+7.4%" },
];

export const trafficSources = [
  ["Marketplace", 47],
  ["Game filters", 24],
  ["Payment filters", 18],
  ["Seller profile", 11],
] as const;

export const adminSignals = [
  {
    title: "Seller verification needed",
    meta: "Shadow Overlay needs proof before going live.",
    risk: "Medium",
  },
  {
    title: "High-risk payment profile",
    meta: "ByteMarket lists Gift Cards and Crypto without refund policy.",
    risk: "High",
  },
  {
    title: "Review pattern watch",
    meta: "8 new positive reviews from low-age accounts on one listing.",
    risk: "Medium",
  },
];

export const submissionQueue = [
  {
    listing: "Shadow Overlay",
    requester: "seller@standard.gg",
    type: "Provider listing",
    status: "Needs proof",
  },
  {
    listing: "NovaKeys Offer",
    requester: "offers@standard.gg",
    type: "Seller offer",
    status: "Under review",
  },
];

export const providerTagRequests = [
  {
    seller: "DevStudio",
    product: "PhantomX Tracker",
    website: "https://phantomx.example",
    discord: "phantomx.gg",
    telegram: "@phantomxupdates",
    proof: "Official website and community channels match the product branding.",
    status: "Approved",
  },
  {
    seller: "Shadow Market",
    product: "Shadow Overlay",
    website: "https://shadow.example",
    discord: "shadowtools",
    telegram: "@shadowtools",
    proof: "Submitted for provider review.",
    status: "Pending",
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
    target: "Active sellers",
  },
  {
    name: "Big Seller",
    price: "$199",
    limit: "30 listings / 100 offers",
    target: "Large catalogs",
  },
];
