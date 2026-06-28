import { supabase } from "./supabase";

// Mark a report as read for a user (idempotent — keeps the first read time).
// Reads live in report_reads so `reports` stays read-only from the frontend.
export async function markReportRead(userId: string, reportId: string): Promise<void> {
  await supabase
    .from("report_reads")
    .upsert(
      { user_id: userId, report_id: reportId },
      { onConflict: "user_id,report_id", ignoreDuplicates: true },
    );
}
