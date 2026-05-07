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

export type PaymentVerificationStatus =
  | "Pending verification"
  | "Verified"
  | "Rejected"
  | "Needs re-check";

export type PaymentProfile = {
  method: PaymentMethod;
  status: PaymentVerificationStatus;
  processor: string;
  proofType: string;
  proofNote: string;
  checkoutUrl?: string;
  refundPolicy?: string;
  verifiedAt?: string;
  expiresAt?: string;
  adminNote?: string;
};

export function getVerifiedPayments(paymentProfiles: PaymentProfile[]) {
  return paymentProfiles
    .filter((payment) => payment.status === "Verified")
    .map((payment) => payment.method);
}


export const sellerTags = ["All", "Seller", "Verified Seller", "Provider / Developer"] as const;
export const productStatuses = ["All", "Verified", "Pending Review"] as const;

export const products = [
  {
    slug: "phantomx-tracker",
    name: "PhantomX Tracker",
    seller: "PhantomX Labs",
    sellerTag: "Provider / Developer",
    game: "Valorant",
    category: "Analytics / Overlay",
    architecture: "External",
    productStatus: "Verified",
    integrity: 92 as number | null,
    confidence: "High",
    activity: { vouches: 326, views: 28400, replies: 184, lastSeen: "Recently active" },
    verifiedPayments: ["Crypto", "Card"] as PaymentMethod[],
    paymentProfiles: [
      {
        method: "Crypto",
        status: "Verified",
        processor: "Coinbase Commerce / direct checkout",
        proofType: "Checkout page + refund policy",
        proofNote: "Crypto option visible on checkout and refund policy submitted.",
        checkoutUrl: "https://phantomx.example/checkout",
        refundPolicy: "https://phantomx.example/refunds",
        verifiedAt: "2026-05-01",
        expiresAt: "2026-08-01",
      },
      {
        method: "Card",
        status: "Verified",
        processor: "Stripe",
        proofType: "Checkout URL + processor screenshot",
        proofNote: "Card checkout verified by Standard team.",
        checkoutUrl: "https://phantomx.example/checkout",
        refundPolicy: "https://phantomx.example/refunds",
        verifiedAt: "2026-05-01",
        expiresAt: "2026-08-01",
      },
      {
        method: "PayPal G&S",
        status: "Pending verification",
        processor: "PayPal",
        proofType: "Merchant email + screenshot",
        proofNote: "Seller submitted proof, waiting admin review.",
        checkoutUrl: "https://phantomx.example/checkout",
      },
    ] as PaymentProfile[],
    features: ["Match analytics", "Overlay HUD", "Rank tracking", "Agent insights", "Session exports", "Performance timeline"],
    pricePoints: ["$6 daily", "$19 weekly", "$49 monthly"],
    delivery: "Instant",
    refundPolicy: "Visible after seller login integration",
    accent: "from-violet-500/70 to-cyan-400/40",
    summary: "A polished Valorant analytics and overlay tool built to help users track performance, improve consistency, and understand each session in detail.",
    websiteUrl: "https://phantomx.example",
    websiteLabel: "Visit official website",
    discord: "discord.gg/phantomx",
    telegram: "@phantomxupdates",
    trustSignals: ["Verified Seller", "Provider / Developer", "Payment profile reviewed", "Fast response history"],
    gallery: [
      { title: "Hero banner", accent: "from-violet-500/60 to-fuchsia-500/40" },
      { title: "Dashboard preview", accent: "from-slate-700 to-cyan-500/30" },
      { title: "Feature spotlight", accent: "from-indigo-500/50 to-cyan-500/30" },
      { title: "Pricing layout", accent: "from-purple-500/50 to-slate-700" },
    ],
    benefits: [
      "Beautiful seller-controlled product page",
      "Strong outbound CTA to the official website",
      "Trust-first layout that improves conversion quality",
      "Clear media, payments, and proof signals in one place",
    ],
    faq: [
      { q: "What is the main goal of this page?", a: "To help interested users understand the product quickly and then click through to the official website." },
      { q: "Can buyers see payment methods before leaving Standard?", a: "Yes. Standard surfaces verified payment methods directly on the product page." },
      { q: "Can sellers edit their own media and features?", a: "Yes. Sellers manage gallery items, feature blocks, pricing, and CTA settings from the dashboard builder." },
    ],
  },
  {
    slug: "shadow-overlay-reference",
    name: "Shadow Overlay",
    seller: "Shadow Market",
    sellerTag: "Seller",
    game: "CS2",
    category: "Overlay / Utility",
    architecture: "Unknown",
    productStatus: "Pending Review",
    integrity: null as number | null,
    confidence: "Pending",
    activity: { vouches: 84, views: 6840, replies: 51, lastSeen: "Unknown" },
    verifiedPayments: [] as PaymentMethod[],
    paymentProfiles: [
      {
        method: "Card",
        status: "Pending verification",
        processor: "Stripe",
        proofType: "Checkout URL required",
        proofNote: "Seller has not provided enough proof yet.",
        checkoutUrl: "https://shadow.example/checkout",
      },
      {
        method: "PayPal F&F",
        status: "Rejected",
        processor: "PayPal",
        proofType: "Risk policy missing",
        proofNote: "Rejected because seller did not provide a clear refund or dispute policy.",
        adminNote: "Do not show publicly until proof improves.",
      },
    ] as PaymentProfile[],
    features: ["Overlay HUD", "Crosshair sync", "Map awareness"],
    pricePoints: [],
    delivery: "Pending verification",
    refundPolicy: "Pending verification",
    accent: "from-fuchsia-500/60 to-slate-500/30",
    summary: "A reference product that still needs more seller proof before it becomes a strong conversion page.",
    websiteUrl: "https://shadow.example",
    websiteLabel: "Go to seller website",
    discord: "shadowtools",
    telegram: "@shadowtools",
    trustSignals: ["Review pending", "Seller-submitted information"],
    gallery: [
      { title: "Main visual", accent: "from-slate-700 to-fuchsia-500/30" },
      { title: "Use case block", accent: "from-zinc-700 to-purple-500/30" },
    ],
    benefits: ["Needs more proof", "Needs media refinement", "Needs payment verification"],
    faq: [
      { q: "Why is this page lighter on detail?", a: "The product is still under review and some fields remain unverified." },
    ],
  },
  {
    slug: "novakeys-reseller-offer",
    name: "NovaKeys Offer",
    seller: "NovaKeys",
    sellerTag: "Verified Seller",
    game: "Valorant",
    category: "Seller Offer",
    architecture: "Unknown",
    productStatus: "Pending Review",
    integrity: 74 as number | null,
    confidence: "Medium",
    activity: { vouches: 18, views: 910, replies: 14, lastSeen: "1 day ago" },
    verifiedPayments: ["Crypto"] as PaymentMethod[],
    paymentProfiles: [
      {
        method: "Crypto",
        status: "Verified",
        processor: "Manual wallet / invoice",
        proofType: "Checkout screenshot + policy",
        proofNote: "Crypto checkout verified, irreversible risk disclosed.",
        verifiedAt: "2026-05-02",
        expiresAt: "2026-08-02",
      },
      {
        method: "PayPal G&S",
        status: "Pending verification",
        processor: "PayPal",
        proofType: "Merchant email + screenshot",
        proofNote: "Seller submitted PayPal proof, waiting review.",
      },
    ] as PaymentProfile[],
    features: ["Manual delivery", "Support relay", "Payment flexibility"],
    pricePoints: ["$27 monthly"],
    delivery: "15 min manual",
    refundPolicy: "Pending admin review",
    accent: "from-cyan-500/60 to-purple-500/30",
    summary: "A seller offer layout optimized for clear pricing, delivery expectations, and quick outbound conversion.",
    websiteUrl: "https://novakeys.example",
    websiteLabel: "Open seller offer",
    discord: "novakeys",
    telegram: "@novakeys",
    trustSignals: ["Verified Seller", "Known payment methods"],
    gallery: [
      { title: "Offer card", accent: "from-cyan-500/40 to-slate-700" },
      { title: "Payment block", accent: "from-indigo-500/40 to-cyan-500/20" },
    ],
    benefits: ["Conversion-first offer layout", "Strong payment clarity"],
    faq: [
      { q: "What does this page optimize for?", a: "Clear offer positioning and outbound traffic to the seller’s own offer page." },
    ],
  },
  {
    slug: "stratpad-suite",
    name: "StratPad Suite",
    seller: "Tactical Forge",
    sellerTag: "Seller",
    game: "Fortnite",
    category: "Utility / Companion",
    architecture: "Cloud",
    productStatus: "Verified",
    integrity: 88 as number | null,
    confidence: "High",
    activity: { vouches: 143, views: 11200, replies: 63, lastSeen: "Today" },
    verifiedPayments: ["Card", "PayPal G&S", "Crypto"] as PaymentMethod[],
    paymentProfiles: [
      {
        method: "Card",
        status: "Verified",
        processor: "Stripe",
        proofType: "Checkout URL + dashboard proof",
        proofNote: "Card checkout verified.",
        verifiedAt: "2026-05-01",
        expiresAt: "2026-08-01",
      },
      {
        method: "PayPal G&S",
        status: "Verified",
        processor: "PayPal",
        proofType: "Merchant proof",
        proofNote: "PayPal Goods & Services confirmed.",
        verifiedAt: "2026-05-01",
        expiresAt: "2026-08-01",
      },
      {
        method: "Crypto",
        status: "Verified",
        processor: "Coinbase Commerce",
        proofType: "Checkout proof",
        proofNote: "Crypto checkout verified.",
        verifiedAt: "2026-05-01",
        expiresAt: "2026-08-01",
      },
    ] as PaymentProfile[],
    features: ["Route planner", "Session notes", "Loadout presets"],
    pricePoints: ["$9 weekly", "$29 monthly"],
    delivery: "Instant",
    refundPolicy: "7-day limited policy",
    accent: "from-indigo-500/70 to-cyan-500/30",
    summary: "A clean companion-tool page that emphasizes benefits, screenshots, and a polished CTA flow.",
    websiteUrl: "https://stratpad.example",
    websiteLabel: "Visit official website",
    discord: "tacticalforge",
    telegram: "@stratpad",
    trustSignals: ["Verified product", "Card payment available"],
    gallery: [
      { title: "Landing hero", accent: "from-indigo-500/50 to-cyan-500/30" },
      { title: "Workflow section", accent: "from-slate-700 to-indigo-500/20" },
      { title: "Preset library", accent: "from-cyan-500/30 to-blue-500/20" },
    ],
    benefits: ["Screenshot-driven storytelling", "Fast benefit scan"],
    faq: [
      { q: "What matters most on this page?", a: "Visual clarity and a strong CTA path to the seller website." },
    ],
  },
  {
    slug: "apex-scan-pro",
    name: "Apex Scan Pro",
    seller: "PulseWorks",
    sellerTag: "Provider / Developer",
    game: "Apex Legends",
    category: "Analytics",
    architecture: "External",
    productStatus: "Verified",
    integrity: 90 as number | null,
    confidence: "High",
    activity: { vouches: 201, views: 16700, replies: 92, lastSeen: "Recently active" },
    verifiedPayments: ["Crypto", "Card"] as PaymentMethod[],
    paymentProfiles: [
      {
        method: "Crypto",
        status: "Verified",
        processor: "Coinbase Commerce",
        proofType: "Checkout proof",
        proofNote: "Crypto checkout verified.",
        verifiedAt: "2026-05-03",
        expiresAt: "2026-08-03",
      },
      {
        method: "Card",
        status: "Verified",
        processor: "Stripe",
        proofType: "Checkout proof",
        proofNote: "Card checkout verified.",
        verifiedAt: "2026-05-03",
        expiresAt: "2026-08-03",
      },
    ] as PaymentProfile[],
    features: ["Performance scan", "Map review", "Session export"],
    pricePoints: ["$12 weekly", "$39 monthly"],
    delivery: "Instant",
    refundPolicy: "Visible after checkout integration",
    accent: "from-orange-500/60 to-purple-500/30",
    summary: "A professional product page for an official provider that mixes analytics value with strong trust and outbound conversion cues.",
    websiteUrl: "https://apexscan.example",
    websiteLabel: "Open official website",
    discord: "pulseworks",
    telegram: "@pulseworks",
    trustSignals: ["Provider / Developer", "Verified product", "Official site provided"],
    gallery: [
      { title: "Main screenshot", accent: "from-orange-500/40 to-fuchsia-500/30" },
      { title: "Analytics block", accent: "from-slate-700 to-orange-500/20" },
      { title: "Trust section", accent: "from-purple-500/30 to-orange-500/20" },
    ],
    benefits: ["Official provider presence", "Excellent outbound CTR potential"],
    faq: [
      { q: "Why does Standard highlight the official site?", a: "Because the seller’s end goal is to get qualified visitors to their own website." },
    ],
  },
  {
    slug: "rift-control",
    name: "Rift Control",
    seller: "Macro Lane",
    sellerTag: "Seller",
    game: "League of Legends",
    category: "Assistant / Utility",
    architecture: "External",
    productStatus: "Pending Review",
    integrity: 68 as number | null,
    confidence: "Medium",
    activity: { vouches: 59, views: 4200, replies: 28, lastSeen: "3 days ago" },
    verifiedPayments: ["Crypto"] as PaymentMethod[],
    paymentProfiles: [
      {
        method: "Crypto",
        status: "Verified",
        processor: "Manual wallet / invoice",
        proofType: "Checkout screenshot",
        proofNote: "Crypto accepted and verified, irreversible payment warning recommended.",
        verifiedAt: "2026-05-03",
        expiresAt: "2026-08-03",
      },
      {
        method: "Gift Cards",
        status: "Needs re-check",
        processor: "Manual",
        proofType: "Fraud policy + supported card types",
        proofNote: "High-risk method needs updated policy before public display.",
      },
    ] as PaymentProfile[],
    features: ["Session tracking", "Build sync", "Match notes"],
    pricePoints: ["$5 daily", "$16 weekly"],
    delivery: "Manual",
    refundPolicy: "Pending review",
    accent: "from-emerald-500/60 to-cyan-500/20",
    summary: "A work-in-progress product that still needs richer media and stronger section design.",
    websiteUrl: "https://riftcontrol.example",
    websiteLabel: "Visit website",
    discord: "macrolane",
    telegram: "@riftcontrol",
    trustSignals: ["Seller-submitted product"],
    gallery: [
      { title: "Placeholder visual", accent: "from-emerald-500/30 to-slate-700" },
    ],
    benefits: ["Needs better media", "Needs stronger CTA and proof blocks"],
    faq: [
      { q: "What should improve first?", a: "Media assets and a better product-page structure from the builder." },
    ],
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
    outboundCtr: "4.64%",
    integrity: "92",
    pageTemplate: "Hero Spotlight",
    mediaAssets: 6,
    website: "phantomx.example",
    nextAction: "Upload a new dashboard screenshot and refresh the pricing block",
  },
  {
    name: "Shadow Overlay",
    status: "Pending Review",
    toolStatus: "Updating",
    game: "CS2",
    features: ["Overlay HUD", "Crosshair sync", "Map awareness"],
    views: 6840,
    outboundClicks: 412,
    outboundCtr: "6.02%",
    integrity: "Pending",
    pageTemplate: "Minimal Launch",
    mediaAssets: 2,
    website: "shadow.example",
    nextAction: "Add more media and submit official website proof",
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
  { label: "Product views", value: "38.6K", change: "+18.6%" },
  { label: "Outbound clicks", value: "2.1K", change: "+12.4%" },
  { label: "Outbound CTR", value: "5.44%", change: "+1.1 pts" },
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
    meta: "8 new positive reviews from low-age accounts on one product.",
    risk: "Medium",
  },
];

export const submissionQueue = [
  {
    product: "Shadow Overlay",
    requester: "seller@standard.gg",
    type: "Provider product",
    status: "Needs proof",
  },
  {
    product: "NovaKeys Offer",
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

export const paymentVerificationQueue = [
  {
    seller: "PhantomX Labs",
    product: "PhantomX Tracker",
    method: "PayPal G&S" as PaymentMethod,
    status: "Pending verification" as PaymentVerificationStatus,
    risk: "Medium",
    submittedProof: "Merchant email + checkout screenshot",
    checkoutUrl: "https://phantomx.example/checkout",
    refundPolicy: "https://phantomx.example/refunds",
    adminAction: "Review PayPal proof",
  },
  {
    seller: "Shadow Market",
    product: "Shadow Overlay",
    method: "Card" as PaymentMethod,
    status: "Pending verification" as PaymentVerificationStatus,
    risk: "Low",
    submittedProof: "Stripe checkout URL",
    checkoutUrl: "https://shadow.example/checkout",
    refundPolicy: "Missing",
    adminAction: "Request refund policy",
  },
  {
    seller: "Shadow Market",
    product: "Shadow Overlay",
    method: "PayPal F&F" as PaymentMethod,
    status: "Rejected" as PaymentVerificationStatus,
    risk: "High",
    submittedProof: "No clear dispute or refund policy",
    checkoutUrl: "Not provided",
    refundPolicy: "Missing",
    adminAction: "Rejected until seller provides safer payment policy",
  },
];

export const plans = [
  {
    name: "Starter Seller",
    price: "$29",
    limit: "5 product products",
    target: "Small providers",
  },
  {
    name: "Pro Seller",
    price: "$79",
    limit: "10 product products + analytics",
    target: "Active sellers",
  },
  {
    name: "Big Seller",
    price: "$199",
    limit: "30 products / 100 offers",
    target: "Large catalogs",
  },
];

export const pageTemplates = [
  {
    name: "Hero Spotlight",
    description: "Best for official providers who want a premium hero, image gallery, and strong CTA to the official site.",
  },
  {
    name: "Comparison Landing",
    description: "Best for products with many benefits or versions that need more explanation before click-through.",
  },
  {
    name: "Minimal Launch",
    description: "Best for new products that want a clean CTA, a few screenshots, and a small set of key facts.",
  },
];

export const builderSections = [
  "Hero section",
  "Image gallery",
  "Feature grid",
  "Pricing cards",
  "Trust signals",
  "Payment methods",
  "FAQ",
  "Official website CTA",
  "Discord / Telegram links",
  "Sticky conversion sidebar",
];

export const mediaUploadGuide = [
  { label: "Hero image", size: "1600 × 900", note: "Main visual used at the top of the product page" },
  { label: "Product screenshot", size: "1440 × 900", note: "UI preview, dashboard screenshot, or use-case shot" },
  { label: "Feature card image", size: "1200 × 800", note: "Optional visuals for feature blocks" },
  { label: "Thumbnail", size: "800 × 800", note: "Compact visual for gallery and social previews" },
];


export const featuredSlots = [
  {
    category: "Valorant",
    status: "Occupied",
    product: "PhantomX Tracker",
    seller: "PhantomX Labs",
    startsAt: "2026-05-01",
    endsAt: "2026-05-08",
    price: "$149 / 7 days",
  },
  {
    category: "CS2",
    status: "Available",
    product: null,
    seller: null,
    startsAt: null,
    endsAt: null,
    price: "$129 / 7 days",
  },
  {
    category: "Fortnite",
    status: "Available",
    product: null,
    seller: null,
    startsAt: null,
    endsAt: null,
    price: "$119 / 7 days",
  },
  {
    category: "Apex Legends",
    status: "Occupied",
    product: "Apex Scan Pro",
    seller: "PulseWorks",
    startsAt: "2026-05-03",
    endsAt: "2026-05-10",
    price: "$109 / 7 days",
  },
  {
    category: "League of Legends",
    status: "Available",
    product: null,
    seller: null,
    startsAt: null,
    endsAt: null,
    price: "$89 / 7 days",
  },
];

export const sellerPlans = [
  {
    name: "Starter Seller",
    price: "$29",
    period: "/ month",
    description: "For small sellers who want a clean product presence.",
    features: [
      "5 product announcements",
      "Basic product builder",
      "Payment verification requests",
      "Seller profile",
    ],
  },
  {
    name: "Pro Seller",
    price: "$79",
    period: "/ month",
    description: "For active sellers who want better visibility and analytics.",
    features: [
      "10 product announcements",
      "Advanced product builder",
      "Outbound click analytics",
      "Provider tag request",
      "Priority review queue",
    ],
    highlighted: true,
  },
  {
    name: "Big Seller",
    price: "$199",
    period: "/ month",
    description: "For larger catalogs and sellers with multiple offers.",
    features: [
      "30 product announcements",
      "100 seller offers",
      "Advanced analytics",
      "Priority support",
      "Bulk product management",
    ],
  },
  {
    name: "Featured Category Slot",
    price: "From $89",
    period: "/ 7 days",
    description: "Paid placement at the top of one game category, available only if no one else is currently featured there.",
    features: [
      "Top placement in selected category",
      "Featured badge on marketplace",
      "CTA tracking",
      "One active featured seller per category",
    ],
  },
];
