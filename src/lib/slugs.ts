import { games, productCategories } from "@/lib/data";

export function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function gameFromSlug(slug: string): string | null {
  const normalized = slug.toLowerCase();
  return games.find((game) => toSlug(game) === normalized) ?? null;
}

export function categoryFromSlug(slug: string): string | null {
  const normalized = slug.toLowerCase();
  return (
    productCategories.find((category) => toSlug(category) === normalized) ??
    null
  );
}
