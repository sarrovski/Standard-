"use client";

import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import {
  CREATOR_REQUEST_STATUS_LABEL,
  type UICreatorRequest,
} from "@/lib/creator-marketplace";

/**
 * Seller dashboard "Creators" tab.
 *
 * Sellers discover creators on /creators and send a brief from any
 * creator's profile page — the brief auto-attaches this seller's id.
 * This tab is just a tracker for the briefs they've sent: status, who,
 * what, when. No messaging — the creator responds externally.
 */
export function SellerCreatorsTab({
  supabaseSourced,
  requests,
}: {
  supabaseSourced: boolean;
  requests: UICreatorRequest[];
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 p-5">
        <div>
          <h2 className="text-xl font-bold">Creators</h2>
          <p className="mt-1 text-sm text-slate-400">
            Discover media creators for showcases, thumbnails, trailers,
            reviews, and promos. Send a brief from a creator&apos;s profile —
            payments and delivery are handled externally.
          </p>
        </div>
        <Link
          href="/creators"
          className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-400"
        >
          Browse creators
        </Link>
      </div>

      {!supabaseSourced ? (
        <div className="p-6 text-sm text-slate-500">
          Demo mode — connect Supabase to track the briefs you&apos;ve sent.
        </div>
      ) : requests.length === 0 ? (
        <div className="p-6 text-sm text-slate-500">
          You haven&apos;t sent any creator briefs yet.{" "}
          <Link
            href="/creators"
            className="text-orange-300 hover:underline"
          >
            Browse creators
          </Link>{" "}
          to send your first one.
        </div>
      ) : (
        <ul className="divide-y divide-white/10">
          {requests.map((req) => {
            const tone =
              req.status === "open"
                ? "amber"
                : req.status === "responded"
                  ? "green"
                  : req.status === "declined"
                    ? "red"
                    : "default";
            return (
              <li key={req.id} className="grid gap-2 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={tone}>
                    {CREATOR_REQUEST_STATUS_LABEL[req.status]}
                  </Badge>
                  <span className="text-sm font-semibold text-white">
                    {req.title}
                  </span>
                  {req.creatorSlug ? (
                    <Link
                      href={`/creators/${req.creatorSlug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-orange-200 transition hover:text-orange-100"
                    >
                      to {req.creatorName} ↗
                    </Link>
                  ) : (
                    <span className="text-xs text-slate-500">
                      to {req.creatorName}
                    </span>
                  )}
                  <span className="text-xs text-slate-500">
                    {new Date(req.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm leading-6 text-slate-300 whitespace-pre-line">
                  {req.brief}
                </p>
                <div className="text-xs text-slate-500">
                  Budget: {req.budget ?? "—"} · Timeline:{" "}
                  {req.timeline ?? "—"}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
