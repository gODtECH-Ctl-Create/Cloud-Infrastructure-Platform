import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Building2, Plus, Power, Zap } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/branches")({
  head: () => ({
    meta: [
      { title: "Branch Operations — Waste to Work Console" },
      {
        name: "description",
        content:
          "Add Waste to Work branches, edit their details, and pause or resume a whole branch during power outages so no customer is billed for downtime.",
      },
      { property: "og:title", content: "Branch Operations — Waste to Work Console" },
      {
        property: "og:description",
        content: "Every branch runs on one shared database, with its own outage pause control.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Branches,
});

function Branches() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", address: "", phone: "" });
  const [pauseTarget, setPauseTarget] = useState<string | null>(null);
  const [pauseReason, setPauseReason] = useState("Power outage");

  const branches = useQuery({
    queryKey: ["branches-manage"],
    queryFn: async () => {
      const { data, error } = await supabase.from("branches").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const liveCounts = useQuery({
    queryKey: ["branch-live-counts"],
    refetchInterval: 20000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("branch_id, status")
        .in("status", ["active", "paused"]);
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const s of data ?? []) map[s.branch_id] = (map[s.branch_id] ?? 0) + 1;
      return map;
    },
  });

  const createBranch = useMutation({
    mutationFn: async () => {
      if (!form.code.trim() || !form.name.trim()) throw new Error("Code and name are required");
      const { error } = await supabase.from("branches").insert({
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Branch added");
      setForm({ code: "", name: "", address: "", phone: "" });
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["branches-manage"] });
      queryClient.invalidateQueries({ queryKey: ["branches"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("branches").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches-manage"] });
      queryClient.invalidateQueries({ queryKey: ["branches"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setPause = useMutation({
    mutationFn: async ({
      branchId,
      paused,
      reason,
    }: {
      branchId: string;
      paused: boolean;
      reason: string | null;
    }) => {
      const { error } = await supabase.rpc("set_branch_pause", {
        _branch_id: branchId,
        _paused: paused,
        ...(reason ? { _reason: reason } : {}),
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(
        vars.paused
          ? "Branch paused — all running sessions are on hold"
          : "Branch resumed — timers running again",
      );
      setPauseTarget(null);
      queryClient.invalidateQueries({ queryKey: ["branches-manage"] });
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      queryClient.invalidateQueries({ queryKey: ["floor-sessions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Branches</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every branch shares this one database. Pausing a branch freezes every running timer
            there — nobody pays for a power outage.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" /> Add branch
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add branch</DialogTitle>
              <DialogDescription>
                The short code appears on reports and staff handovers.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="b_code">Branch code</Label>
                <Input
                  id="b_code"
                  placeholder="IKJ"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="b_name">Branch name</Label>
                <Input
                  id="b_name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="b_addr">Address</Label>
                <Input
                  id="b_addr"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="b_phone">Phone</Label>
                <Input
                  id="b_phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <Button
                className="w-full"
                disabled={createBranch.isPending}
                onClick={() => createBranch.mutate()}
              >
                Add branch
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(branches.data ?? []).map((b) => (
          <article key={b.id} className="panel p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="code-id text-xs text-muted-foreground">{b.code}</p>
                <h2 className="font-display text-lg font-semibold">{b.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{b.address ?? "No address"}</p>
              </div>
              <span className="flex size-9 items-center justify-center rounded-lg bg-secondary">
                <Building2 className="size-4" />
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {b.is_paused ? (
                <Badge variant="outline" className="border-warning text-warning">
                  Paused · {b.pause_reason ?? "no reason"}
                </Badge>
              ) : (
                <Badge variant="secondary">Running</Badge>
              )}
              <Badge variant="outline">{liveCounts.data?.[b.id] ?? 0} on the floor</Badge>
            </div>

            {b.is_paused && b.paused_at ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Paused since {formatDateTime(b.paused_at)}
              </p>
            ) : null}

            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Switch
                  checked={b.is_active}
                  onCheckedChange={(v) => toggleActive.mutate({ id: b.id, is_active: v })}
                  aria-label="Branch active"
                />
                <span className="text-sm text-muted-foreground">
                  {b.is_active ? "Open" : "Closed"}
                </span>
              </div>
              {b.is_paused ? (
                <Button
                  size="sm"
                  onClick={() => setPause.mutate({ branchId: b.id, paused: false, reason: null })}
                >
                  <Zap className="size-4" /> Resume
                </Button>
              ) : (
                <Button size="sm" variant="destructive" onClick={() => setPauseTarget(b.id)}>
                  <Power className="size-4" /> Pause branch
                </Button>
              )}
            </div>
          </article>
        ))}
        {branches.data && branches.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No branches yet — add your first one.</p>
        ) : null}
      </div>

      <Dialog open={pauseTarget !== null} onOpenChange={(v) => !v && setPauseTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pause this branch</DialogTitle>
            <DialogDescription>
              Every active session at this branch stops accruing billable time until you resume.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Input
                id="reason"
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              variant="destructive"
              disabled={setPause.isPending}
              onClick={() =>
                pauseTarget &&
                setPause.mutate({
                  branchId: pauseTarget,
                  paused: true,
                  reason: pauseReason.trim() || "Power outage",
                })
              }
            >
              Pause branch now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
