export type LandingFaqItem = { q: string; a: string };

export const buyerLandingFaq: ReadonlyArray<LandingFaqItem> = [
  {
    q: "How does Standard verify sellers?",
    a: "Each Verified Seller is reviewed by the Standard team. We check official-website ownership, public community channels, and the consistency of seller-provided information before the Verified badge is granted.",
  },
  {
    q: "What should buyers check before leaving for a seller website?",
    a: "Read the verified payment methods, refund policy, support channels, and the seller's verification tag on the product page. Those signals reduce the risk of bad outcomes once you click through to the seller's own site.",
  },
  {
    q: "Why do payment methods matter?",
    a: "Some payment methods give buyers stronger protection than others. Standard verifies the checkout setup a seller actually uses, so you can see which methods are real and supported before you commit.",
  },
  {
    q: "How are products sorted or filtered?",
    a: "Browse by game and product category from the marketplace. Featured slots appear first; the rest are surfaced by recency and seller verification status.",
  },
];
