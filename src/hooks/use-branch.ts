import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Branch = Tables<"branches">;

const STORAGE_KEY = "wtw.active_branch";

export function useBranches() {
  return useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branches")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data as Branch[];
    },
  });
}

/**
 * The branch an attendant is currently working from. Stored locally only as a
 * UI preference — all records still carry an explicit branch_id in the shared
 * database, so switching branches never changes customer identity or balances.
 */
export function useActiveBranch() {
  const { data: branches = [], isLoading } = useBranches();
  const [branchId, setBranchId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setBranchId(window.localStorage.getItem(STORAGE_KEY));
  }, []);

  const select = useCallback((id: string) => {
    setBranchId(id);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const active =
    branches.find((b) => b.id === branchId) ?? branches.find((b) => b.is_active) ?? null;

  useEffect(() => {
    if (active && active.id !== branchId) select(active.id);
  }, [active, branchId, select]);

  return { branches, activeBranch: active, activeBranchId: active?.id ?? null, select, isLoading };
}
