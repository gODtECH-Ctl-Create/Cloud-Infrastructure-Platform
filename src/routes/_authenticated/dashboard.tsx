import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CircleDollarSign, Timer, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useRoles, useSession } from "@/hooks/use-auth";
import { useActiveBranch } from "@/hooks/use-branch";
import { formatDuration, formatMoney, liveElapsedSeconds } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Branch Overview — Waste to Work Console" },
      {
        name: "description",
        content:
          "Live branch overview: open workspace sessions, today's revenue, registered customers and active subscribers across Waste to Work.",
      },
      { property: "og:title", content: "Branch Overview — Waste to Work Console" },
      {
        property: "og:description",
        content: "Live sessions, daily revenue and customer counts for your Waste to Work branch.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { data: roles = [], isLoading: rolesLoading, refetch: refetchRoles } = useRoles(user);
  const { activeBranch, activeBranchId, branches } = useActiveBranch();

  const stats = useQuery({
    queryKey: ["dashboard", activeBranchId],
    enabled: !!activeBranchId && roles.length > 0,
    refetchInterval: 20_000,
    queryFn: async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const [open, payments, customers, subs] = await Promise.all([
        supabase
          .from("sessions")
          .select("id, started_at, paused_at, paused_seconds, status, ended_at, customer_id, customers(full_name, customer_code)")
          .eq("branch_id", activeBranchId!)
          .in("status", ["active", "paused"])
          .order("started_at", { ascending: true }),
        supabase
          .from("payments")
          .select("amount_minor")
          .eq("branch_id", activeBranchId!)
          .eq("status", "confirmed")
          .gte("paid_at", startOfDay.toISOString()),
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase
          .from("customer_subscriptions")
          .select("id", { count: "exact", head: true })
          .eq("status", "active"),
      ]);

      if (open.error) throw open.error;
      if (payments.error) throw payments.error;

      return {
        open: open.data ?? [],
        revenueToday: (payments.data ?? []).reduce((sum, p) => sum + Number(p.amount_minor), 0),
        customerCount: customers.count ?? 0,
        subscriberCount: subs.count ?? 0,
      };
    },
  });

  async function claimAdmin() {
    const { data, error } = await supabase.rpc("claim_first_admin");
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data) {
      toast.success("You are now the system administrator.");
      refetchRoles();
      queryClient.invalidateQueries();
    } else {
      toast.error("An administrator already exists — ask them to grant you a role.");
    }
  }

  if (!rolesLoading && roles.length === 0) {
    return (
      <AppShell>
        <div className="panel mx-auto max-w-lg p-8 text-center">
          <AlertTriangle className="mx-auto size-6 text-warning" />
          <h1 className="mt-4 text-xl font-semibold">No staff role assigned</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account exists but has no role yet, so operational data stays hidden. If this is a
            brand-new system, claim the administrator role now — this is only possible once.
          </p>
          <Button className="mt-6" onClick={claimAdmin}>
            Claim administrator role
          </Button>
        </div>
      </AppShell>
    );
  }

  const noBranches = branches.length === 0;

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">
            {activeBranch ? activeBranch.name : "Overview"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live figures for this branch. Customers, hours and balances are shared system-wide.
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link to="/customers">
            <UserPlus className="size-4" /> Register customer
          </Link>
        </Button>
      </div>

      {noBranches ? (
        <div className="panel mt-6 p-6">
          <h2 className="font-semibold">Add your first branch</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sessions and payments are always recorded against a branch, so create one to begin.
          </p>
          <Button asChild className="mt-4">
            <Link to="/branches">Go to branches</Link>
          </Button>
        </div>
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Timer className="size-4 text-primary" />}
          label="Open sessions"
          value={String(stats.data?.open.length ?? 0)}
        />
        <StatCard
          icon={<CircleDollarSign className="size-4 text-primary" />}
          label="Revenue today"
          value={formatMoney(stats.data?.revenueToday ?? 0)}
        />
        <StatCard
          icon={<Users className="size-4 text-primary" />}
          label="Customers (all branches)"
          value={String(stats.data?.customerCount ?? 0)}
        />
        <StatCard
          icon={<Users className="size-4 text-primary" />}
          label="Active subscriptions"
          value={String(stats.data?.subscriberCount ?? 0)}
        />
      </div>

      <section className="panel mt-8 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">On the floor now</h2>
          <Button asChild size="sm" variant="ghost">
            <Link to="/floor">Manage floor</Link>
          </Button>
        </div>
        {stats.data && stats.data.open.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No one is clocked in at this branch.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {(stats.data?.open ?? []).map((s) => (
              <li key={s.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{s.customers?.full_name ?? "Unknown"}</p>
                  <p className="code-id text-xs text-muted-foreground">
                    {s.customers?.customer_code}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {s.status === "paused" ? (
                    <Badge variant="outline" className="border-warning text-warning">
                      Paused
                    </Badge>
                  ) : null}
                  <span className="code-id text-sm">{formatDuration(liveElapsedSeconds(s))}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="panel p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-3 font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}
