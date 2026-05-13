"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { FeatureGroup } from "@/lib/product-features";

/**
 * Vertical stack editor for grouped product features.
 *
 * Every category is rendered as its own panel, stacked top-to-bottom. Each
 * panel contains: the editable category name, a remove button, the list of
 * features as full-width rows, and an "Add a feature" input. A "+ Add
 * category" button at the bottom of the stack spawns a new empty category
 * and focuses its name input.
 */
export function FeatureGroupsEditor({
  value,
  onChange,
}: {
  value: FeatureGroup[];
  onChange: (next: FeatureGroup[]) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const nameInputsRef = useRef<Map<number, HTMLInputElement | null>>(new Map());
  const focusIndexRef = useRef<number | null>(null);

  useEffect(() => {
    if (focusIndexRef.current !== null) {
      const input = nameInputsRef.current.get(focusIndexRef.current);
      if (input) {
        input.focus();
        input.select();
      }
      focusIndexRef.current = null;
    }
  }, [value]);

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

  const addCategoryWithName = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    focusIndexRef.current = value.length;
    update([...value, { name: trimmed, features: [] }]);
  };

  const addEmptyCategory = () => {
    focusIndexRef.current = value.length;
    update([...value, { name: "New category", features: [] }]);
  };

  const handleFirstCategoryKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addCategoryWithName(firstName);
      setFirstName("");
    }
  };

  return (
    <fieldset className="grid gap-3">
      <legend className="text-sm font-semibold text-slate-200">Features by category</legend>
      <p className="-mt-1 text-xs text-slate-500">
        Group features under named categories. Each category becomes its own
        block on the public product page.
      </p>

      {value.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-slate-950/40 p-5">
          <p className="text-sm text-slate-300">Add your first category.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              onKeyDown={handleFirstCategoryKey}
              placeholder="Category name"
              className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-orange-400/50"
              maxLength={60}
            />
            <button
              type="button"
              onClick={() => {
                addCategoryWithName(firstName);
                setFirstName("");
              }}
              disabled={!firstName.trim()}
              className="inline-flex items-center gap-1 rounded-xl bg-orange-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span aria-hidden="true">+</span>
              Add category
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          {value.map((group, index) => (
            <FeatureGroupPanel
              key={`group-${index}`}
              group={group}
              nameInputRef={(el) => {
                if (el) {
                  nameInputsRef.current.set(index, el);
                } else {
                  nameInputsRef.current.delete(index);
                }
              }}
              onRename={(name) => renameGroup(index, name)}
              onRemove={() => removeGroup(index)}
              onAddFeature={(feature) => addFeature(index, feature)}
              onRemoveFeature={(featureIndex) => removeFeature(index, featureIndex)}
            />
          ))}
          <button
            type="button"
            onClick={addEmptyCategory}
            className="inline-flex items-center justify-center gap-1 rounded-2xl border border-dashed border-white/15 px-3 py-3 text-sm font-semibold text-slate-300 transition hover:border-orange-400/40 hover:bg-orange-500/10 hover:text-orange-100"
          >
            <span aria-hidden="true">+</span>
            Add category
          </button>
        </div>
      )}
    </fieldset>
  );
}

function FeatureGroupPanel({
  group,
  nameInputRef,
  onRename,
  onRemove,
  onAddFeature,
  onRemoveFeature,
}: {
  group: FeatureGroup;
  nameInputRef: (el: HTMLInputElement | null) => void;
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
    <div className="grid gap-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid flex-1 min-w-[12rem] gap-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-200/80">
          Category name
          <input
            ref={nameInputRef}
            value={group.name}
            onChange={(event) => onRename(event.target.value)}
            placeholder="Category name"
            className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-base font-bold text-white outline-none transition focus:border-orange-400/50"
            maxLength={60}
          />
        </label>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/20"
        >
          Remove category
        </button>
      </div>

      <div className="grid gap-2">
        {group.features.length === 0 ? (
          <p className="text-xs text-slate-500">No features in this category yet.</p>
        ) : (
          group.features.map((feature, featureIndex) => (
            <div
              key={`${feature}-${featureIndex}`}
              className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-200"
            >
              <span className="truncate">{feature}</span>
              <button
                type="button"
                onClick={() => onRemoveFeature(featureIndex)}
                aria-label={`Remove ${feature}`}
                className="shrink-0 rounded-md px-1 text-slate-500 transition hover:bg-red-500/10 hover:text-red-300"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
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
