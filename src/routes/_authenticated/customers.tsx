import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Search, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useActiveBranch } from "@/hooks/use-branch";
import { useSession } from "@/hooks/use-auth";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/customers")({
  head: () => ({
    meta: [
      { title: "Customer Directory — Waste to Work Console" },
      {
        name: "description",
        content:
          "Search the shared Waste to Work customer directory by ID, name or phone, and register new subscribers and walk-in customers.",
      },
      { property: "og:title", content: "Customer Directory — Waste to Work Console" },
      {
        property: "og:description",
        content: "One global customer record per person, usable at every Waste to Work branch.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Customers,
});

function Customers() {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { activeBranchId } = useActiveBranch();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    category: "walk_in" as "walk_in" | "subscriber",
    address: "",
    notes: "",
  });

  const customers = useQuery({
    queryKey: ["customers", search],
    queryFn: async () => {
      let q = supabase
        .from("customers")
        .select("*, branches:registered_branch_id(name)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (search.trim()) {
        const term = `%${search.trim()}%`;
        q = q.or(
          `full_name.ilike.${term},customer_code.ilike.${term},phone.ilike.${term},email.ilike.${term}`,
        );
      }
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.full_name.trim()) throw new Error("Customer name is required");
      const { data, error } = await supabase
        .from("customers")
        .insert({
          // Filled in by the database trigger with the next WTW-###### id.
          customer_code: "",
          full_name: form.full_name.trim(),
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          category: form.category,
          address: form.address.trim() || null,
          notes: form.notes.trim() || null,
          registered_branch_id: activeBranchId,
          created_by: user?.id ?? null,
        })
        .select("customer_code")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Customer registered as ${data.customer_code}`);
      setOpen(false);
      setForm({
        full_name: "",
        phone: "",
        email: "",
        category: "walk_in",
        address: "",
        notes: "",
      });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Customers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            One record per person, shared by every branch. The Waste to Work ID is the identifier —
            never the name.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="size-4" /> Register customer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Register customer</DialogTitle>
              <DialogDescription>
                A globally unique WTW ID and QR token are issued automatically.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input
                  id="full_name"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v as typeof form.category })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walk_in">Walk-in / regular</SelectItem>
                    <SelectItem value="subscriber">Subscriber</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <Button
                className="w-full"
                disabled={create.isPending}
                onClick={() => create.mutate()}
              >
                Register
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mt-6 max-w-md">
        <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by WTW ID, name, phone or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="panel mt-6 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-strong text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">WTW ID</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Registered</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(customers.data ?? []).map((c) => (
              <tr key={c.id} className="hover:bg-surface-strong/50">
                <td className="code-id px-4 py-3">{c.customer_code}</td>
                <td className="px-4 py-3 font-medium">{c.full_name}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.phone ?? "—"}</td>
                <td className="px-4 py-3">
                  <Badge variant={c.category === "subscriber" ? "default" : "secondary"}>
                    {c.category === "subscriber" ? "Subscriber" : "Walk-in"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {c.branches?.name ?? "—"} · {formatDateTime(c.created_at)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button asChild size="sm" variant="ghost">
                    <Link to="/customers/$customerId" params={{ customerId: c.id }}>
                      Open
                    </Link>
                  </Button>
                </td>
              </tr>
            ))}
            {customers.data && customers.data.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  No customers found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
