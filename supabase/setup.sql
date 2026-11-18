-- Power Plant Gym: database setup
-- Paste this whole file into Supabase → SQL Editor → New query, then click Run.
-- It is safe to run again: it only creates what is missing and replaces its own policies.
--
-- BEFORE YOU RUN IT: change the email on the line marked  >>> COACH EMAILS <<<  near the bottom
-- to the email(s) the coaches will log in to the app with. Anyone else who signs up is a client.
--
-- Who can see what:
--   Coaches see every client, program, workout, max, note, message and video in the gym.
--   A client sees only their own programs, workouts, maxes, messages and videos.
--   Private coach notes (day flags and client notes) are never visible to clients.

-- ============================================================
-- People
-- ============================================================
create table if not exists public.coach_emails (
  email text primary key check (email = lower(email))
);

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        text not null default 'client' check (role in ('client', 'coach')),
  name        text not null default '',
  email       text not null default '',
  units       text not null default 'lb' check (units in ('lb', 'kg')),
  coach_id    uuid references public.profiles (id) on delete set null,  -- the client's main coach
  created_at  timestamptz not null default now()
);

-- Is the person making this request a coach? (used by every policy below)
create or replace function public.is_coach() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'coach');
$$;

-- A new login gets a profile automatically; emails on the coach list become coaches.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    lower(coalesce(new.email, '')),
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    case when exists (select 1 from public.coach_emails where email = lower(new.email)) then 'coach' else 'client' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Adding an email to the coach list later also upgrades someone who already signed up.
create or replace function public.sync_coach_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set role = 'coach' where email = new.email;
  elsif tg_op = 'DELETE' then
    update public.profiles set role = 'client' where email = old.email;
  end if;
  return null;
end;
$$;

drop trigger if exists coach_emails_sync on public.coach_emails;
create trigger coach_emails_sync after insert or delete on public.coach_emails
  for each row execute function public.sync_coach_role();

-- ============================================================
-- Training data
-- ============================================================

-- Programs written in the coach dashboard. client_id is empty for a saved program (template).
create table if not exists public.programs (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid references public.profiles (id) on delete cascade,
  name        text not null default '',
  data        jsonb not null default '{}'::jsonb,   -- the whole program, same format as the download file
  active      boolean not null default true,
  created_by  uuid references public.profiles (id) on delete set null,
  updated_at  timestamptz not null default now()
);
create index if not exists programs_client on public.programs (client_id);

-- Logged workouts from the client app.
create table if not exists public.workouts (
  id          text primary key,                      -- the app's own workout id
  client_id   uuid not null references public.profiles (id) on delete cascade,
  done_at     timestamptz not null,
  data        jsonb not null,                        -- the whole workout, same format as the app
  created_at  timestamptz not null default now()
);
create index if not exists workouts_client_date on public.workouts (client_id, done_at desc);

-- Maxes per client per lift. Only coaches set the target; a new 5RM from the app waits in "pending".
create table if not exists public.client_maxes (
  client_id   uuid not null references public.profiles (id) on delete cascade,
  ex          text not null,                         -- exercise id, e.g. 'squat'
  rm5         numeric,
  rm1         numeric,
  target      numeric,
  pending     jsonb,                                 -- {rm5, suggested, at} until a coach approves
  updated_at  timestamptz not null default now(),
  primary key (client_id, ex)
);

-- The client app's own settings: bars, pinned exercise notes, and so on.
create table if not exists public.client_state (
  client_id   uuid primary key references public.profiles (id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- Private coach notes on a calendar day (the red flag). Clients never see these.
create table if not exists public.day_notes (
  client_id   uuid not null references public.profiles (id) on delete cascade,
  day         date not null,
  note        text not null,
  author_id   uuid references public.profiles (id) on delete set null,
  updated_at  timestamptz not null default now(),
  primary key (client_id, day)
);

-- Private coach notes about a client. Clients never see these.
create table if not exists public.client_notes (
  client_id   uuid primary key references public.profiles (id) on delete cascade,
  note        text not null default '',
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- Messages and form-check videos
-- ============================================================

-- One conversation per client; any coach can answer it.
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.profiles (id) on delete cascade,
  sender_id   uuid not null references public.profiles (id) on delete cascade,
  body        text not null default '',
  video_path  text,                                  -- file in the form-checks storage bucket
  loom_url    text,                                  -- a coach's Loom reply
  workout_id  text references public.workouts (id) on delete set null,
  ex          text,                                  -- the movement a form check is for
  created_at  timestamptz not null default now(),
  read_at     timestamptz
);
create index if not exists messages_client on public.messages (client_id, created_at);
create index if not exists messages_ex on public.messages (client_id, ex) where video_path is not null;

-- ============================================================
-- Rules (row level security)
-- ============================================================
alter table public.coach_emails  enable row level security;
alter table public.profiles      enable row level security;
alter table public.programs      enable row level security;
alter table public.workouts      enable row level security;
alter table public.client_maxes  enable row level security;
alter table public.client_state  enable row level security;
alter table public.day_notes     enable row level security;
alter table public.client_notes  enable row level security;
alter table public.messages      enable row level security;

-- coach list: coaches only
drop policy if exists "coaches manage coach list" on public.coach_emails;
create policy "coaches manage coach list" on public.coach_emails for all
  using (public.is_coach()) with check (public.is_coach());

-- profiles: see yourself; coaches see and edit everyone
drop policy if exists "see own profile" on public.profiles;
create policy "see own profile" on public.profiles for select using (id = auth.uid() or public.is_coach());
drop policy if exists "edit own profile" on public.profiles;
create policy "edit own profile" on public.profiles for update
  using (id = auth.uid() or public.is_coach()) with check (id = auth.uid() or public.is_coach());
-- Nobody can make themselves a coach by editing their profile: role changes only via the coach list.
revoke update on public.profiles from authenticated, anon;
grant update (name, units, coach_id) on public.profiles to authenticated;

-- programs: coaches do everything; a client reads their own
drop policy if exists "coaches manage programs" on public.programs;
create policy "coaches manage programs" on public.programs for all
  using (public.is_coach()) with check (public.is_coach());
drop policy if exists "clients read own programs" on public.programs;
create policy "clients read own programs" on public.programs for select using (client_id = auth.uid());

-- workouts: a client logs their own; coaches read all
drop policy if exists "clients manage own workouts" on public.workouts;
create policy "clients manage own workouts" on public.workouts for all
  using (client_id = auth.uid()) with check (client_id = auth.uid());
drop policy if exists "coaches read workouts" on public.workouts;
create policy "coaches read workouts" on public.workouts for select using (public.is_coach());

-- maxes: coaches do everything; a client reads their own and reports a 5RM through report_5rm()
drop policy if exists "coaches manage maxes" on public.client_maxes;
create policy "coaches manage maxes" on public.client_maxes for all
  using (public.is_coach()) with check (public.is_coach());
drop policy if exists "clients read own maxes" on public.client_maxes;
create policy "clients read own maxes" on public.client_maxes for select using (client_id = auth.uid());

-- app settings: a client manages their own; coaches read
drop policy if exists "clients manage own state" on public.client_state;
create policy "clients manage own state" on public.client_state for all
  using (client_id = auth.uid()) with check (client_id = auth.uid());
drop policy if exists "coaches read state" on public.client_state;
create policy "coaches read state" on public.client_state for select using (public.is_coach());

-- private coach notes: coaches only
drop policy if exists "coaches only" on public.day_notes;
create policy "coaches only" on public.day_notes for all using (public.is_coach()) with check (public.is_coach());
drop policy if exists "coaches only" on public.client_notes;
create policy "coaches only" on public.client_notes for all using (public.is_coach()) with check (public.is_coach());

-- messages: the client and every coach can read and write in that client's conversation
drop policy if exists "read conversation" on public.messages;
create policy "read conversation" on public.messages for select using (client_id = auth.uid() or public.is_coach());
drop policy if exists "send in conversation" on public.messages;
create policy "send in conversation" on public.messages for insert
  with check (sender_id = auth.uid() and (client_id = auth.uid() or public.is_coach()));
drop policy if exists "mark read" on public.messages;
create policy "mark read" on public.messages for update
  using (client_id = auth.uid() or public.is_coach()) with check (client_id = auth.uid() or public.is_coach());
drop policy if exists "delete own message" on public.messages;
create policy "delete own message" on public.messages for delete using (sender_id = auth.uid());
revoke update on public.messages from authenticated, anon;
grant update (read_at) on public.messages to authenticated;

-- A client saves a new 5-rep max. Their 5RM updates; the target only changes when a coach approves.
create or replace function public.report_5rm(p_ex text, p_rm5 numeric, p_suggested numeric)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into public.client_maxes (client_id, ex, rm5, pending, updated_at)
  values (auth.uid(), p_ex, p_rm5, jsonb_build_object('rm5', p_rm5, 'suggested', p_suggested, 'at', now()), now())
  on conflict (client_id, ex) do update
    set rm5 = excluded.rm5, pending = excluded.pending, updated_at = now()
    where client_maxes.rm5 is null or excluded.rm5 > client_maxes.rm5;
end;
$$;
revoke execute on function public.report_5rm(text, numeric, numeric) from public, anon;
grant execute on function public.report_5rm(text, numeric, numeric) to authenticated;

-- ============================================================
-- Form-check video storage
-- ============================================================
-- Private bucket. Files go in a folder named after the client's user id: <client id>/<file>.
-- 50 MB per file is the free plan's limit.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('form-checks', 'form-checks', false, 52428800, array['video/mp4', 'video/quicktime', 'video/webm', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

drop policy if exists "form checks: read" on storage.objects;
create policy "form checks: read" on storage.objects for select
  using (bucket_id = 'form-checks' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_coach()));
drop policy if exists "form checks: upload" on storage.objects;
create policy "form checks: upload" on storage.objects for insert
  with check (bucket_id = 'form-checks' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_coach()));
drop policy if exists "form checks: delete" on storage.objects;
create policy "form checks: delete" on storage.objects for delete
  using (bucket_id = 'form-checks' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_coach()));

-- ============================================================
-- Live updates (new messages and workouts show up without refreshing)
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array['messages', 'workouts', 'client_maxes'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ============================================================
-- >>> COACH EMAILS <<<   Change this to the coaches' login emails (lowercase), then run.
-- You can add the other coaches later with the same line, one email per row.
-- ============================================================
insert into public.coach_emails (email) values
  ('change-me@example.com')
on conflict do nothing;
