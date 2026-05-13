"use client";

import { useState, type KeyboardEvent } from "react";
import type { FeatureGroup } from "@/lib/product-features";

/**
 * Seller-side editor for grouped product features.
 *
 * The seller can:
 *   - Name each category ("Aimbot", "Visuals", "Movement", ...) inline
 *   - Add / remove features under each category
 *   - Add / remove categories
 *
 * State stays local; the parent owns the `FeatureGroup[]` array via
 * `value` / `onChange`, then sends it to /api/seller/products as
 * `features_grouped`.
 */
export function FeatureGroupsEditor({
  value,
  onChange,
}: {
  value: FeatureGroup[];
  onChange: (next: FeatureGroup[]) => void;
}) {
  const [newCategoryName, setNewCategoryName] = useState("");

  const update = (next: FeatureGroup[]) => onChange(next);

  const renameGroup = (index: number, name: string) => {
    update(value.map((group, i) => (i === index ? { ...group, name } : group)));
  };

  const removeGroup = (index: number) => {
    update(value.filter((_, i) => i !== index));
  };

  const addFeature = (index: number, feature: string) => {
    const trimmed = feature.trim();
    if (!trimmed) return;
    update(
      value.map((group, i) =>
        i === index && !group.features.includes(trimmed)
          ? { ...group, features: [...group.features, trimmed] }
          : group,
      ),
    );
  };

  const removeFeature = (groupIndex: number, featureIndex: number) => {
    update(
      value.map((group, i) =>
        i === groupIndex
          ? {
              ...group,
              features: group.features.filter((_, fi) => fi !== featureIndex),
            }
          : group,
      ),
    );
  };

  const addCategory = (name?: string) => {
    const raw = (name ?? newCategoryName).trim();
    if (!raw) return;
    update([...value, { name: raw, features: [] }]);
    setNewCategoryName("");
  };

  const handleAddCategoryKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      // Stop the outer product form from submitting when the seller
      // hits Enter inside the category-name input.
      event.preventDefault();
      addCategory();
    }
  };

  return (
    <fieldset className="grid gap-4">
      <legend className="text-sm font-semibold text-slate-200">Features by category</legend>
      <p className="-mt-2 text-xs text-slate-500">
        Group features under named categories — e.g. Aimbot, Visuals,
        Movement, Spoofer. Buyers see the same groups on the public
        product page.
      </p>

      {value.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-slate-950/40 p-5 text-sm text-slate-400">
          No categories yet. Add one below to start grouping features.
        </div>
      ) : (
        <div className="grid gap-3">
          {value.map((group, groupIndex) => (
            <FeatureGroupCard
              key={`group-${groupIndex}`}
              group={group}
              onRename={(name) => renameGroup(groupIndex, name)}
              onRemove={() => removeGroup(groupIndex)}
              onAddFeature={(feature) => addFeature(groupIndex, feature)}
              onRemoveFeature={(featureIndex) =>
                removeFeature(groupIndex, featureIndex)
              }
            />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={newCategoryName}
          onChange={(event) => setNewCategoryName(event.target.value)}
          onKeyDown={handleAddCategoryKey}
          placeholder="New category name — e.g. Aimbot"
          className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-orange-400/50"
          maxLength={60}
        />
        <button
          type="button"
          onClick={() => addCategory()}
          disabled={!newCategoryName.trim()}
          className="inline-flex items-center gap-1 rounded-xl border border-orange-400/40 bg-orange-500/15 px-3 py-2 text-xs font-semibold text-orange-100 transition hover:bg-orange-500/25 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span aria-hidden="true">+</span>
          Add category
        </button>
      </div>
    </fieldset>
  );
}

function FeatureGroupCard({
  group,
  onRename,
  onRemove,
  onAddFeature,
  onRemoveFeature,
}: {
  group: FeatureGroup;
  onRename: (name: string) => void;
  onRemove: () => void;
  onAddFeature: (feature: string) => void;
  onRemoveFeature: (featureIndex: number) => void;
}) {
  const [featureDraft, setFeatureDraft] = useState("");

  const submitFeature = () => {
    onAddFeature(featureDraft);
    setFeatureDraft("");
  };

  const handleKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitFeature();
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="grid flex-1 min-w-[12rem] gap-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Category
          <input
            value={group.name}
            onChange={(event) => onRename(event.target.value)}
            placeholder="Category name"
            className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm font-bold text-white outline-none transition focus:border-orange-400/50"
            maxLength={60}
          />
        </label>
        <button
          type="button"
          onClick={onRemove}
          className="self-end rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/20"
        >
          Remove category
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {group.features.length === 0 && (
          <p className="text-xs text-slate-500">No features yet.</p>
        )}
        {group.features.map((feature, featureIndex) => (
          <span
            key={`${feature}-${featureIndex}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-slate-200"
          >
            {feature}
            <button
              type="button"
              onClick={() => onRemoveFeature(featureIndex)}
              aria-label={`Remove ${feature}`}
              className="text-slate-500 transition hover:text-red-300"
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          value={featureDraft}
          onChange={(event) => setFeatureDraft(event.target.value)}
          onKeyDown={handleKey}
          placeholder="Add a feature and press Enter"
          className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-orange-400/50"
          maxLength={120}
        />
        <button
          type="button"
          onClick={submitFeature}
          disabled={!featureDraft.trim()}
          className="inline-flex items-center gap-1 rounded-xl bg-orange-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span aria-hidden="true">+</span>
          Add feature
        </button>
      </div>
    </div>
  );
}
