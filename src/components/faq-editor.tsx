"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { SUGGESTED_FAQ_QUESTIONS, type FaqItem } from "@/lib/product-faq";

/**
 * Per-product FAQ editor.
 *
 * Buyer-facing FAQ helps both SEO (Google renders rich FAQ blocks in
 * search results) and conversion (no DMs for the six questions every
 * buyer asks). Each row is a question + an answer; the seller can
 * reorder by removing / re-adding, add a row from the "Suggested"
 * pill bar, or write a custom question.
 */
export function FaqEditor({
  value,
  onChange,
}: {
  value: FaqItem[];
  onChange: (next: FaqItem[]) => void;
}) {
  const [customQuestion, setCustomQuestion] = useState("");

  const existingQuestions = useMemo(
    () =>
      new Set(
        value.map((item) => item.q.trim().toLowerCase()).filter(Boolean),
      ),
    [value],
  );

  const remainingSuggestions = SUGGESTED_FAQ_QUESTIONS.filter(
    (question) => !existingQuestions.has(question.toLowerCase()),
  );

  const update = (next: FaqItem[]) => onChange(next);

  const addItem = (q: string, a = "") => {
    const trimmedQ = q.trim();
    if (!trimmedQ) return;
    if (existingQuestions.has(trimmedQ.toLowerCase())) return;
    update([...value, { q: trimmedQ, a }]);
  };

  const removeItem = (index: number) => {
    update(value.filter((_, i) => i !== index));
  };

  const renameQuestion = (index: number, q: string) => {
    update(value.map((item, i) => (i === index ? { ...item, q } : item)));
  };

  const editAnswer = (index: number, a: string) => {
    update(value.map((item, i) => (i === index ? { ...item, a } : item)));
  };

  const handleAnswerInput = (
    event: ChangeEvent<HTMLTextAreaElement>,
    index: number,
  ) => {
    editAnswer(index, event.target.value);
  };

  return (
    <fieldset className="grid gap-3">
      <legend className="text-sm font-semibold text-slate-200">FAQ</legend>
      <p className="-mt-1 text-xs text-slate-500">
        Answer the questions buyers always ask. Rich FAQ blocks help with
        Google search results and cut down on support DMs.
      </p>

      {remainingSuggestions.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Suggested questions
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {remainingSuggestions.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => addItem(question)}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-orange-400/40 hover:bg-orange-500/10 hover:text-orange-100"
              >
                <span aria-hidden="true" className="text-orange-300">+</span>
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {value.length === 0 && remainingSuggestions.length === 0 && (
          <p className="text-xs text-slate-500">No FAQ entries yet.</p>
        )}
        {value.map((item, index) => (
          <div
            key={`faq-${index}`}
            className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"
          >
            <div className="flex flex-wrap items-end gap-3">
              <label className="grid flex-1 min-w-[14rem] gap-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Question
                <input
                  value={item.q}
                  onChange={(event) => renameQuestion(index, event.target.value)}
                  placeholder="What buyers ask…"
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm font-bold text-white outline-none transition focus:border-orange-400/50"
                  maxLength={200}
                />
              </label>
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/20"
              >
                Remove
              </button>
            </div>
            <label className="mt-3 grid gap-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Answer
              <textarea
                value={item.a}
                onChange={(event) => handleAnswerInput(event, index)}
                placeholder="Clear, specific answer in 1–3 sentences."
                rows={3}
                className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-orange-400/50"
                maxLength={2000}
              />
            </label>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={customQuestion}
          onChange={(event) => setCustomQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addItem(customQuestion);
              setCustomQuestion("");
            }
          }}
          placeholder="Custom question — press Enter to add"
          className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-orange-400/50"
          maxLength={200}
        />
        <button
          type="button"
          onClick={() => {
            addItem(customQuestion);
            setCustomQuestion("");
          }}
          disabled={!customQuestion.trim()}
          className="inline-flex items-center gap-1 rounded-xl border border-orange-400/40 bg-orange-500/15 px-3 py-2 text-xs font-semibold text-orange-100 transition hover:bg-orange-500/25 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span aria-hidden="true">+</span>
          Add question
        </button>
      </div>
    </fieldset>
  );
}
