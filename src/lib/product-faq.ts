/**
 * Per-product FAQ helpers.
 *
 * Storage shape (products.faq, jsonb):
 *   [{ q: "Is this beginner-friendly?", a: "Yes — …" }, ...]
 *
 * Editor uses parseFaq() on initial load (defensive — anything in jsonb)
 * and the API uses it again on write so a malformed payload from the
 * client can't poison the row.
 */

export type FaqItem = {
  q: string;
  a: string;
};

const MAX_ITEMS = 20;
const MAX_Q_LENGTH = 200;
const MAX_A_LENGTH = 2000;

export function parseFaq(value: unknown): FaqItem[] {
  if (!Array.isArray(value)) return [];
  const items: FaqItem[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const q = typeof (raw as { q?: unknown }).q === "string"
      ? ((raw as { q: string }).q).trim().slice(0, MAX_Q_LENGTH)
      : "";
    const a = typeof (raw as { a?: unknown }).a === "string"
      ? ((raw as { a: string }).a).trim().slice(0, MAX_A_LENGTH)
      : "";
    if (!q && !a) continue;
    items.push({ q, a });
    if (items.length >= MAX_ITEMS) break;
  }
  return items;
}

/**
 * Suggested questions sellers can add with one click — the ones buyers
 * actually keep asking. The order matches Standard's most common
 * support DMs so the highest-value answers surface first.
 */
export const SUGGESTED_FAQ_QUESTIONS: string[] = [
  "How fast is delivery?",
  "What happens after purchase?",
  "Is this beginner-friendly?",
  "Do you offer support?",
  "Can I get a refund?",
  "What payment methods do you accept?",
  "How long does the license last?",
  "Is there a free trial?",
];
