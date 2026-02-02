-- Enable RLS updates (optional/good practice)
alter table public.candidate_profiles enable row level security;

-- Add address columns if they don't exist
do $$
begin
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'candidate_profiles' and column_name = 'address_street') then
        alter table public.candidate_profiles add column address_street text;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'candidate_profiles' and column_name = 'address_city') then
        alter table public.candidate_profiles add column address_city text;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'candidate_profiles' and column_name = 'address_state') then
        alter table public.candidate_profiles add column address_state text;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'candidate_profiles' and column_name = 'address_pincode') then
        alter table public.candidate_profiles add column address_pincode text;
    end if;
    -- Just in case we need to store resume URL here as well or ensure it is in sync, though usually it is in applications.
    -- But let's check resume_url in this table too.
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'candidate_profiles' and column_name = 'resume_url') then
        alter table public.candidate_profiles add column resume_url text;
    end if;
end $$;

-- Verify RLS Policies (Ensure users can insert/update their own profile)
-- Drop existing policies to be safe and recreate or just ensure existence.
-- Simplified for now: allow all for authenticated users on their own rows.

create policy "Users can insert their own profile" on public.candidate_profiles for
insert
with
    check (auth.uid () = user_id);

create policy "Users can update their own profile" on public.candidate_profiles for
update using (auth.uid () = user_id);

create policy "Users can select their own profile" on public.candidate_profiles for
select using (auth.uid () = user_id);