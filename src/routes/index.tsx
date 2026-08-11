import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Building2, QrCode, Recycle, Timer } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Waste to Work — Multi-Branch Workspace Operations" },
      {
        name: "description",
        content:
          "One centralized system for Waste to Work internet workspaces: shared customer IDs, subscriptions, time tracking and revenue across every branch.",
      },
      { property: "og:title", content: "Waste to Work — Multi-Branch Workspace Operations" },
      {
        property: "og:description",
        content:
          "Centralized customer identity, subscription hours and session billing across all Waste to Work branches.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: QrCode,
    title: "One customer, every branch",
    body: "Each customer gets a global Waste to Work ID (WTW-000001) with QR identification that works at any location.",
  },
  {
    icon: Timer,
    title: "Server-timed sessions",
    body: "Clock-in, pauses, power outages and extensions are all timed by the database — never by a browser clock.",
  },
  {
    icon: Building2,
    title: "Built for many branches",
    body: "Subscriptions, rollover hours, payments and revenue reporting all read from one shared source of truth.",
  },
];

function Landing() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  return (
    <div className="grid-noise min-h-screen">
      <header className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Recycle className="size-5" />
          </span>
          <span className="font-display text-lg font-semibold">Waste to Work</span>
        </div>
        <Button asChild variant="secondary">
          <Link to={signedIn ? "/dashboard" : "/auth"}>
            {signedIn ? "Open console" : "Staff sign in"}
          </Link>
        </Button>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-16 pb-20">
        <p className="code-id text-xs uppercase tracking-[0.25em] text-primary">
          Centralized operations
        </p>
        <h1 className="mt-5 max-w-3xl text-5xl leading-[1.05] font-semibold sm:text-6xl">
          Run every Waste to Work branch from one shared database.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          Workspace time tracking, subscriptions with rollover hours, walk-in billing and branch
          revenue — synchronized across locations, so a customer account works everywhere.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to={signedIn ? "/dashboard" : "/auth"}>
              {signedIn ? "Go to console" : "Sign in to console"}
              <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-20 grid gap-4 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <article key={title} className="panel p-6">
              <Icon className="size-5 text-primary" />
              <h2 className="mt-4 text-lg font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
