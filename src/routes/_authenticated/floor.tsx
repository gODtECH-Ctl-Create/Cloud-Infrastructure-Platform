import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Pause, Play, Plus, Search, Square, TimerReset } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useActiveBranch } from "@/hooks/use-branch";
import { formatDuration, formatMoney, liveElapsedSeconds } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/floor")({
  head: () => ({
    meta: [
      { title: "Workspace Floor — Waste to Work Console" },
      {
        name: "description",
        content:
          "Clock customers in and out, pause for power outages, extend time and close out billing with database-timed sessions.",
      },
      { property: "og:title", content: "Workspace Floor — Waste to Work Console" },
      {
        property: "og:description",
        content: "Live clock-in, pause, extend and checkout for Waste to Work workspace sessions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Floor,
});

function useTick(intervalMs = 1000) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}

function Floor() {
  useTick();
  const queryClient = useQueryClient();
  const { activeBranch, activeBranchId } = useActiveBranch();
  const [search, setSearch] = useState("");
  const [openStart, setOpenStart] = useState(false);
  const [plannedMinutes, setPlannedMinutes] = useState("60");

  const sessions = useQuery({
    queryKey: ["floor-sessions", activeBranchId],
    enabled: !!activeBranchId,
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select(
          "*, customers(full_name, customer_code, category), session_pauses(reason, paused_at, resumed_at)",
        )
        .eq("branch_id", activeBranchId!)
        .in("status", ["active", "paused"])
        .order("started_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const recent = useQuery({
    queryKey: ["floor-recent", activeBranchId],
    enabled: !!activeBranchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("*, customers(full_name, customer_code)")
        .eq("branch_id", activeBranchId!)
        .eq("status", "completed")
        .order("ended_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const candidates = useQuery({
    queryKey: ["customer-search", search],
    enabled: openStart,
    queryFn: async () => {
      let q = supabase
        .from("customers")
        .select("id, full_name, customer_code, phone, category")
        .eq("is_active", true)
        .limit(8);
      if (search.trim()) {
        const term = `%${search.trim()}%`;
        q = q.or(`full_name.ilike.${term},customer_code.ilike.${term},phone.ilike.${term}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["floor-sessions"] });
    queryClient.invalidateQueries({ queryKey: ["floor-recent"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }

  const startSession = useMutation({
    mutationFn: async (customerId: string) => {
      const minutes = Number.parseInt(plannedMinutes, 10);
      const valid = Number.isFinite(minutes) && minutes > 0;
      const { error } = await supabase.rpc("start_session", {
        _customer_id: customerId,
        _branch_id: activeBranchId!,
        ...(valid ? { _planned_minutes: minutes } : {}),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Session started");
      setOpenStart(false);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pause = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase.rpc("pause_session", {
        _session_id: id,
        _reason: reason || "Paused by attendant",
        _scope: "session",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Session paused");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resume = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("resume_session", { _session_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Session resumed");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const extend = useMutation({
    mutationFn: async ({ id, minutes }: { id: string; minutes: number }) => {
      const { error } = await supabase.rpc("extend_session", {
        _session_id: id,
        _minutes: minutes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Time extended");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const end = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc("end_session", { _session_id: id });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const amount = data && !Array.isArray(data) ? (data as { amount_due_minor: number }) : null;
      toast.success(
        amount ? `Session closed — ${formatMoney(amount.amount_due_minor)} due` : "Session closed",
      );
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const paused = activeBranch?.is_paused;

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Workspace floor</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Elapsed time and charges are calculated by the database, not this screen.
          </p>
        </div>
        <Dialog open={openStart} onOpenChange={setOpenStart}>
          <DialogTrigger asChild>
            <Button disabled={!activeBranchId || paused}>
              <Plus className="size-4" /> Clock in
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Clock in a customer</DialogTitle>
              <DialogDescription>
                Search by Waste to Work ID, name or phone. Subscribers are billed from their weekly
                allowance automatically.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="q">Find customer</Label>
              <div className="relative">
                <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
                <Input
                  id="q"
                  className="pl-9"
                  placeholder="WTW-000001, name or phone"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="planned">Planned minutes (optional)</Label>
              <Input
                id="planned"
                type="number"
                min={1}
                value={plannedMinutes}
                onChange={(e) => setPlannedMinutes(e.target.value)}
              />
            </div>
            <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-lg border border-border">
              {(candidates.data ?? []).map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 p-3">
                  <div>
                    <p className="text-sm font-medium">{c.full_name}</p>
                    <p className="code-id text-xs text-muted-foreground">
                      {c.customer_code} · {c.category === "subscriber" ? "Subscriber" : "Walk-in"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    disabled={startSession.isPending}
                    onClick={() => startSession.mutate(c.id)}
                  >
                    Start
                  </Button>
                </li>
              ))}
              {candidates.data && candidates.data.length === 0 ? (
                <li className="p-3 text-sm text-muted-foreground">No matching customer.</li>
              ) : null}
            </ul>
          </DialogContent>
        </Dialog>
      </div>

      {paused ? (
        <div className="panel mt-6 border-warning/50 p-4 text-sm">
          <strong className="text-warning">This branch is paused.</strong>{" "}
          {activeBranch?.pause_reason ?? "All running sessions are on hold."} Resume it from
          Branches to continue billing.
        </div>
      ) : null}

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {(sessions.data ?? []).map((s) => {
          const elapsed = liveElapsedSeconds(s);
          const planned = s.planned_minutes ?? 0;
          const over = planned > 0 && elapsed > planned * 60;
          return (
            <article key={s.id} className="panel p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{s.customers?.full_name}</h2>
                  <p className="code-id text-xs text-muted-foreground">
                    {s.customers?.customer_code}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant={s.billing_mode === "subscription" ? "default" : "secondary"}>
                    {s.billing_mode === "subscription" ? "Subscription" : "Walk-in"}
                  </Badge>
                  {s.status === "paused" ? (
                    <Badge variant="outline" className="border-warning text-warning">
                      Paused
                    </Badge>
                  ) : null}
                  {over ? <Badge variant="destructive">Over time</Badge> : null}
                </div>
              </div>

              <p className="code-id mt-4 font-display text-3xl">{formatDuration(elapsed)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {planned > 0 ? `Planned ${planned} min · ` : ""}
                Rate {formatMoney(s.rate_per_hour_minor)}/hr
                {s.paused_seconds > 0 ? ` · ${Math.round(s.paused_seconds / 60)} min paused` : ""}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {s.status === "active" ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => pause.mutate({ id: s.id, reason: "Paused by attendant" })}
                  >
                    <Pause className="size-4" /> Pause
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => resume.mutate(s.id)}>
                    <Play className="size-4" /> Resume
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => extend.mutate({ id: s.id, minutes: 30 })}
                >
                  <TimerReset className="size-4" /> +30 min
                </Button>
                <Button size="sm" onClick={() => end.mutate(s.id)} disabled={end.isPending}>
                  <Square className="size-4" /> Clock out
                </Button>
              </div>
            </article>
          );
        })}
        {sessions.data && sessions.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open sessions at this branch.</p>
        ) : null}
      </div>

      <section className="panel mt-10 p-6">
        <h2 className="font-semibold">Recently closed</h2>
        <ul className="mt-4 divide-y divide-border">
          {(recent.data ?? []).map((s) => (
            <li key={s.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <p className="font-medium">{s.customers?.full_name}</p>
                <p className="code-id text-xs text-muted-foreground">
                  {s.customers?.customer_code}
                </p>
              </div>
              <div className="text-right">
                <p className="code-id">{formatMoney(s.amount_due_minor)}</p>
                <p className="text-xs text-muted-foreground">
                  {s.billable_minutes ?? 0} billed min ·{" "}
                  {s.subscription_minutes_used > 0
                    ? `${s.subscription_minutes_used} min from plan`
                    : "no plan hours"}
                </p>
              </div>
            </li>
          ))}
          {recent.data && recent.data.length === 0 ? (
            <li className="py-3 text-sm text-muted-foreground">Nothing closed yet today.</li>
          ) : null}
        </ul>
      </section>
    </AppShell>
  );
}
