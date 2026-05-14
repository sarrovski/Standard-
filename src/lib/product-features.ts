/**
 * Helpers for the grouped-features data model.
 *
 * Storage shape (products.features_grouped, jsonb):
 *   [{ name: "Aimbot", features: ["Smooth aim", "Prediction"] }, ...]
 *
 * The flat string array (products.features, text[]) stays as a denormalized
 * view that legacy surfaces (marketplace cards, etc.) can still read without
 * parsing JSON. The API writes both on every create/update.
 */

export type FeatureGroup = {
  name: string;
  features: string[];
};

const MAX_GROUPS = 12;
const MAX_FEATURES_PER_GROUP = 24;
const MAX_NAME_LENGTH = 60;
const MAX_FEATURE_LENGTH = 120;

/**
 * Coerce arbitrary input (e.g. from a JSON column or an API body) into a
 * clean `FeatureGroup[]`. Drops malformed entries silently so a single bad
 * row doesn't break the editor or the public page.
 */
export function parseFeatureGroups(value: unknown): FeatureGroup[] {
  if (!Array.isArray(value)) return [];
  const groups: FeatureGroup[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const name = typeof (raw as { name?: unknown }).name === "string"
      ? ((raw as { name: string }).name).trim().slice(0, MAX_NAME_LENGTH)
      : "";
    const features = Array.isArray((raw as { features?: unknown }).features)
      ? ((raw as { features: unknown[] }).features)
          .filter((f): f is string => typeof f === "string")
          .map((f) => f.trim().slice(0, MAX_FEATURE_LENGTH))
          .filter((f) => f.length > 0)
          .slice(0, MAX_FEATURES_PER_GROUP)
      : [];
    if (!name && features.length === 0) continue;
    groups.push({ name: name || "Features", features });
    if (groups.length >= MAX_GROUPS) break;
  }
  return groups;
}

/**
 * Flatten grouped features into the legacy text[] shape. Used by the API
 * to keep `products.features` denormalized so older render paths
 * (marketplace card chips, product page fallback) still work.
 */
export function flattenFeatureGroups(groups: FeatureGroup[]): string[] {
  const flat: string[] = [];
  for (const group of groups) {
    for (const feature of group.features) {
      if (feature && !flat.includes(feature)) flat.push(feature);
    }
  }
  return flat;
}

/**
 * Fallback: when a product has only the legacy flat `features` array and no
 * grouped data, surface them under a single "Features" group so the
 * editor and public page never render blank.
 */
export function groupsFromFlatFeatures(flat: string[] | null | undefined): FeatureGroup[] {
  if (!flat || flat.length === 0) return [];
  return [{ name: "Features", features: flat.filter((f) => f.length > 0) }];
}
