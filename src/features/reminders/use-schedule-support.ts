"use client";
import { useQuery } from "@tanstack/react-query";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/** Gate new writes until the deployed schema actually accepts them. Old boards still work. */
export function useScheduleSupport(ownerId: string | null) {
  const query = useQuery({
    queryKey: ["schedule-support", ownerId], enabled: Boolean(ownerId), retry: false, staleTime: 60_000,
    queryFn: async () => {
      const { error } = await getSupabaseBrowserClient().from("notes").select("remind_at,repeat_rule,recurrence_source_id").limit(0);
      if (error) {
        if (error.code === "42703" || error.code === "PGRST204") throw new Error("Cloud scheduling is not ready. Apply migration 0004_note_schedules.sql, then retry.");
        throw new Error(`Could not check cloud scheduling: ${error.message}. Check the Supabase connection and retry.`);
      }
      return true;
    },
  });
  return { ready: !ownerId || query.data === true, loading: Boolean(ownerId) && query.isLoading, error: query.error, retry: () => void query.refetch() };
}
