
-- Create a storage bucket for logos
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true);

-- Policy to allow anyone to see logos
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'logos' );

-- Policy to allow authenticated admins to upload logos
create policy "Admin Upload"
  on storage.objects for insert
  with check ( bucket_id = 'logos' and auth.role() = 'authenticated' );

-- Policy to allow authenticated admins to update logos
create policy "Admin Update"
  on storage.objects for update
  with check ( bucket_id = 'logos' and auth.role() = 'authenticated' );
