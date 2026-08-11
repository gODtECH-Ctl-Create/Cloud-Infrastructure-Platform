import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CircleDollarSign,
  Gauge,
  LogOut,
  Recycle,
  Tags,
  Timer,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useActiveBranch } from "@/hooks/use-branch";
import { useRoles, useSession } from "@/hooks/use-auth";

const NAV = [
  { to: "/dashboard", label: "Overview", icon: Gauge },
  { to: "/floor", label: "Floor", icon: Timer },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/plans", label: "Plans & rates", icon: Tags },
  { to: "/payments", label: "Payments", icon: CircleDollarSign },
  { to: "/branches", label: "Branches", icon: Building2 },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { branches, activeBranch, select } = useActiveBranch();
  const { user } = useSession();
  const { data: roles = [] } = useRoles(user);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Recycle className="size-5" />
            </span>
            <span className="hidden font-display text-lg font-semibold sm:block">
              Waste to Work
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-3">
            {activeBranch?.is_paused ? (
              <Badge variant="outline" className="border-warning text-warning">
                Branch paused
              </Badge>
            ) : null}
            <Select value={activeBranch?.id ?? ""} onValueChange={select}>
              <SelectTrigger className="w-[190px]">
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>

        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2 pb-2">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                }`}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
          {roles.length > 0 ? (
            <span className="ml-auto self-center px-3 text-xs uppercase tracking-wider text-muted-foreground">
              {roles.join(" · ")}
            </span>
          ) : null}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
