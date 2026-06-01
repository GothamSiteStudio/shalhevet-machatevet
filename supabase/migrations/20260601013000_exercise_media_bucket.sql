-- =====================================================================
-- Storage bucket למדיה של תרגילים (תמונות / GIF / וידאו), קריאה ציבורית
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('exercise-media', 'exercise-media', true)
on conflict (id) do nothing;

-- קריאה ציבורית (התמונות גלויות לכולם)
drop policy if exists exercise_media_read on storage.objects;
create policy exercise_media_read on storage.objects
  for select using (bucket_id = 'exercise-media');

-- כתיבה/עדכון/מחיקה — למשתמשים מחוברים (בפועל: המאמנת מוסיפה תרגילים)
drop policy if exists exercise_media_insert on storage.objects;
create policy exercise_media_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'exercise-media');

drop policy if exists exercise_media_update on storage.objects;
create policy exercise_media_update on storage.objects
  for update to authenticated using (bucket_id = 'exercise-media');

drop policy if exists exercise_media_delete on storage.objects;
create policy exercise_media_delete on storage.objects
  for delete to authenticated using (bucket_id = 'exercise-media');
