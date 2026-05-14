"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { FeatureGroup } from "@/lib/product-features";

/**
 * Vertical-tab editor for grouped product features.
 *
 * Left rail shows each category as a stacked tab + a "+ Add category"
 * button at the bottom. The right panel renders the active category's
 * editor: editable name, remove button, vertical list of features as
 * full-width rows, and an "Add a feature" input. Mirrors a classic
 * cheat-menu layout.
 */
export function FeatureGroupsEditor({
  value,
  onChange,
}: {
  value: FeatureGroup[];
  onChange: (next: FeatureGroup[]) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [firstName, setFirstName] = useState("");
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const focusOnNextRender = useRef(false);

  useEffect(() => {
    if (focusOnNextRender.current && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
      focusOnNextRender.current = false;
    }
  }, [activeIndex, value]);

  useEffect(() => {
    if (activeIndex >= value.length && value.length > 0) {
      setActiveIndex(value.length - 1);
    }
  }, [value.length, activeIndex]);

  const update = (next: FeatureGroup[]) => onChange(next);

  const renameGroup = (index: number, name: string) => {
    update(value.map((group, i) => (i === index ? { ...group, name } : group)));
  };

  const removeGroup = (index: number) => {
    const next = value.filter((_, i) => i !== index);
    update(next);
    if (next.length === 0) {
      setActiveIndex(0);
    } else if (index <= activeIndex) {
      setActiveIndex(Math.max(0, activeIndex - 1));
    }
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
    const next = [...value, { name: trimmed, features: [] }];
    update(next);
    setActiveIndex(next.length - 1);
    focusOnNextRender.current = true;
  };

  const addEmptyCategory = () => {
    const next = [...value, { name: "New category", features: [] }];
    update(next);
    setActiveIndex(next.length - 1);
    focusOnNextRender.current = true;
  };

  const handleFirstCategoryKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addCategoryWithName(firstName);
      setFirstName("");
    }
  };

  const activeGroup = value[activeIndex] ?? null;

  return (
    <fieldset className="grid gap-3">
      <legend className="text-sm font-semibold text-slate-200">Features by category</legend>
      <p className="-mt-1 text-xs text-slate-500">
        Group features under named categories. Pick a category on the left
        to edit its features.
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
        <div className="grid gap-3 rounded-2xl border border-white/10 bg-slate-950/40 p-3 sm:grid-cols-[200px_1fr]">
          <div
            role="tablist"
            aria-label="Feature categories"
            className="flex flex-col gap-1"
          >
            {value.map((group, index) => {
              const isActive = index === activeIndex;
              const label = group.name.trim() || "Untitled";
              return (
                <button
                  key={`tab-${index}`}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveIndex(index)}
                  className={
                    "flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold transition " +
                    (isActive
                      ? "bg-orange-500/15 text-white shadow-[0_4px_18px_-12px_rgba(249,115,22,0.55)]"
                      : "text-slate-400 hover:bg-white/[0.04] hover:text-white")
                  }
                >
                  <span className="truncate">{label}</span>
                  <span
                    className={
                      "shrink-0 rounded-full px-1.5 text-[10px] font-bold transition " +
                      (isActive
                        ? "bg-orange-500/30 text-orange-100"
                        : "bg-white/[0.06] text-slate-400")
                    }
                  >
                    {group.features.length}
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={addEmptyCategory}
              className="mt-1 inline-flex items-center justify-center gap-1 rounded-xl border border-dashed border-white/15 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:border-orange-400/40 hover:bg-orange-500/10 hover:text-orange-100"
            >
              <span aria-hidden="true">+</span>
              Add category
            </button>
          </div>

          {activeGroup && (
            <FeatureGroupPanel
              key={`panel-${activeIndex}`}
              group={activeGroup}
              nameInputRef={nameInputRef}
              onRename={(name) => renameGroup(activeIndex, name)}
              onRemove={() => removeGroup(activeIndex)}
              onAddFeature={(feature) => addFeature(activeIndex, feature)}
              onRemoveFeature={(featureIndex) =>
                removeFeature(activeIndex, featureIndex)
              }
            />
          )}
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
  nameInputRef: React.RefObject<HTMLInputElement>;
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
    <div className="grid gap-3 rounded-xl border border-white/10 bg-black/30 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid flex-1 min-w-[12rem] gap-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-200/80">
          Category name
          <input
            ref={nameInputRef}
            value={group.name}
            onChange={(event) => onRename(event.target.value)}
            placeholder="Category name"
            className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-base font-bold text-white outline-none transition focus:border-orange-400/50"
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
              className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-200"
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
          className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none transition focus:border-orange-400/50"
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
