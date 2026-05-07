import Link from "next/link";
import { Badge, Card } from "@/components/ui";

export function AccountMenuPreview() {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="font-bold">Logged-in menu preview</div>
          <p className="mt-1 text-sm text-slate-500">
            Once auth is connected, the navbar can show an avatar menu instead of public Login.
          </p>
        </div>
        <Badge tone="purple">Preview</Badge>
      </div>

      <div className="mt-5 grid gap-2">
        <Link href="/account" className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-300">
          Account
        </Link>
        <Link href="/dashboard" className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-300">
          Seller Dashboard
        </Link>
        <Link href="/admin" className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-300">
          Admin
        </Link>
        <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Logout
        </div>
      </div>
    </Card>
  );
}
