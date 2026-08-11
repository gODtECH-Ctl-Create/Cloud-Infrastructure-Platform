import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useActiveBranch } from "@/hooks/use-branch";
import { formatDateTime, formatMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/payments")({
  head: () => ({
    meta: [
      { title: "Payments & Revenue — Waste to Work Console" },
      {
        name: "description",
        content:
          "Review Waste to Work payments across every branch: totals by method, outstanding session balances and a full transaction log for any date range.",
      },
      { property: "og:title", content: "Payments & Revenue — Waste to Work Console" },
      {
        property: "og:description",
        content: "Revenue by branch, method and date, with outstanding session balances flagged.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Payments,
});

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function Payments() {
  const { activeBranchId } = useActiveBranch();
  const [scope, setScope] = useState<"branch" | "all">("branch");
  const [from, setFrom] = useState(isoDaysAgo(7));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  const payments = useQuery({
    queryKey: ["payments", scope, activeBranchId, from, to],
    queryFn: async () => {
      let q = supabase
        .from("payments")
        .select("*, branches(name), customers(customer_code, full_name)")
        .gte("paid_at", `${from}T00:00:00`)
        .lte("paid_at", `${to}T23:59:59`)
        .order("paid_at", { ascending: false })
        .limit(300);
      if (scope === "branch" && activeBranchId) q = q.eq("branch_id", activeBranchId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const outstanding = useQuery({
    queryKey: ["outstanding", scope, activeBranchId],
    queryFn: async () => {
      let q = supabase
        .from("sessions")
        .select("*, branches(name), customers(customer_code, full_name)")
        .eq("status", "completed")
        .gt("amount_due_minor", 0)
        .order("ended_at", { ascending: false })
        .limit(200);
      if (scope === "branch" && activeBranchId) q = q.eq("branch_id", activeBranchId);
      const { data, error } = await q;
      if (error) throw error;
      // Unpaid = collected less than billed. Compared client-side because the
      // Data API can't filter one column against another.
      return (data ?? []).filter((s) => (s.amount_paid_minor ?? 0) < s.amount_due_minor);
    },
  });

  const totals = useMemo(() => {
    const rows = payments.data ?? [];
    const byMethod: Record<string, number> = {};
    let total = 0;
    for (const p of rows) {
      total += p.amount_minor;
      byMethod[p.method] = (byMethod[p.method] ?? 0) + p.amount_minor;
    }
    return { total, byMethod, count: rows.length };
  }, [payments.data]);

  const owed = (outstanding.data ?? []).reduce(
    (sum, s) => sum + (s.amount_due_minor - (s.amount_paid_minor ?? 0)),
    0,
  );

  return (
    <AppShell>
      <div>
        <h1 className="text-3xl font-semibold">Payments</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Money collected and money still owed, for the selected branch or the whole network.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label>Scope</Label>
          <Select value={scope} onValueChange={(v) => setScope(v as typeof scope)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="branch">Active branch</SelectItem>
              <SelectItem value="all">All branches</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="from">From</Label>
          <Input
            id="from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-[160px]"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="to">To</Label>
          <Input
            id="to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-[160px]"
          />
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Collected" value={formatMoney(totals.total)} />
        <Stat label="Transactions" value={String(totals.count)} />
        <Stat label="Outstanding" value={formatMoney(owed)} tone="warning" />
        <Stat
          label="Cash share"
          value={
            totals.total > 0
              ? `${Math.round(((totals.byMethod["cash"] ?? 0) / totals.total) * 100)}%`
              : "—"
          }
        />
      </div>

      {Object.keys(totals.byMethod).length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.entries(totals.byMethod).map(([method, amount]) => (
            <Badge key={method} variant="secondary" className="capitalize">
              {method}: {formatMoney(amount)}
            </Badge>
          ))}
        </div>
      ) : null}

      <section className="panel mt-8 overflow-hidden">
        <h2 className="border-b border-border px-4 py-3 font-semibold">Transactions</h2>
        <table className="w-full text-sm">
          <thead className="bg-surface-strong text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Paid at</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Branch</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(payments.data ?? []).map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 text-muted-foreground">{formatDateTime(p.paid_at)}</td>
                <td className="px-4 py-3">
                  <span className="code-id text-xs text-primary">
                    {p.customers?.customer_code ?? "—"}
                  </span>{" "}
                  {p.customers?.full_name ?? ""}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{p.branches?.name ?? "—"}</td>
                <td className="px-4 py-3 capitalize">{p.method}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.reference ?? "—"}</td>
                <td className="code-id px-4 py-3 text-right">{formatMoney(p.amount_minor)}</td>
              </tr>
            ))}
            {payments.data && payments.data.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  No payments in this range.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="panel mt-8 overflow-hidden">
        <h2 className="border-b border-border px-4 py-3 font-semibold">
          Unpaid completed sessions
        </h2>
        <table className="w-full text-sm">
          <thead className="bg-surface-strong text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Ended</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Branch</th>
              <th className="px-4 py-3">Billed minutes</th>
              <th className="px-4 py-3 text-right">Owed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(outstanding.data ?? []).map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3 text-muted-foreground">{formatDateTime(s.ended_at)}</td>
                <td className="px-4 py-3">
                  <span className="code-id text-xs text-primary">
                    {s.customers?.customer_code ?? "—"}
                  </span>{" "}
                  {s.customers?.full_name ?? ""}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{s.branches?.name ?? "—"}</td>
                <td className="px-4 py-3">{s.billable_minutes ?? 0}</td>
                <td className="code-id px-4 py-3 text-right text-warning">
                  {formatMoney(s.amount_due_minor)}
                </td>
              </tr>
            ))}
            {outstanding.data && outstanding.data.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  Nothing outstanding. Clean books.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warning";
}) {
  return (
    <div className="panel p-5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={`mt-2 font-display text-2xl font-semibold ${
          tone === "warning" ? "text-warning" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
