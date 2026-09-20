-- ============================================================
-- Daily — Storage
-- Migration 0003
--
-- Private bucket for podcast audio. Files are namespaced by
-- user id: podcast-audio/{user_id}/{report_id}.mp3
--
-- The pipeline (service_role) writes files. Users read their
-- own files via signed URLs OR via the policies below if you
-- choose to serve them directly.
-- ============================================================

-- Create the bucket (private — not publicly listable)
insert into storage.buckets (id, name, public)
values ('podcast-audio', 'podcast-audio', false)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- Storage RLS: users can read files under their own user_id
-- folder. The first path segment is the user id.
-- ------------------------------------------------------------
create policy "Users can read own podcast audio"
  on storage.objects for select
  using (
    bucket_id = 'podcast-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Note: no insert/update/delete policy for users — the pipeline
-- writes with service_role which bypasses these checks.
