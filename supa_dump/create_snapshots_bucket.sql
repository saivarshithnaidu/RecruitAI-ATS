-- Create storage bucket for proctor snapshots
insert into
    storage.buckets (id, name, public)
values (
        'proctor_snapshots',
        'proctor_snapshots',
        true
    ) on conflict (id) do nothing;

-- Allow authenticated uploads
create policy "Authenticated users can upload snapshots" on storage.objects for
insert
    to authenticated
with
    check (
        bucket_id = 'proctor_snapshots'
    );

-- Allow public read (or authenticated read) - Public for easier dashboard access for now
create policy "Public can view snapshots" on storage.objects for
select to public using (
        bucket_id = 'proctor_snapshots'
    );