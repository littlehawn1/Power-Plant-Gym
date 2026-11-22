-- Power Plant Gym update: owner level for coaches, and archiving clients
-- Paste into Supabase → SQL Editor → New query, change the two emails marked  >>> OWNERS <<<  and click Run.
-- Safe to run again.
--
-- Owners are coaches who can also add and remove coaches (and make other coaches owners).
-- Every other coach still sees and coaches every client, but can't change the coach list.
-- Until at least one owner is set, every coach counts as an owner, so nobody gets locked out.

alter table public.coach_emails add column if not exists is_owner boolean not null default false;

-- Is the person making this request an owner?
create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_coach() and (
    not exists (select 1 from public.coach_emails where is_owner)
    or exists (select 1 from public.profiles p join public.coach_emails c on c.email = lower(p.email)
               where p.id = auth.uid() and c.is_owner)
  );
$$;

-- Coaches can see the coach list; only owners can change it.
drop policy if exists "coaches manage coach list" on public.coach_emails;
drop policy if exists "coaches read coach list" on public.coach_emails;
drop policy if exists "owners add coaches" on public.coach_emails;
drop policy if exists "owners change coaches" on public.coach_emails;
drop policy if exists "owners remove coaches" on public.coach_emails;
create policy "coaches read coach list" on public.coach_emails for select using (public.is_coach());
create policy "owners add coaches" on public.coach_emails for insert with check (public.is_owner());
create policy "owners change coaches" on public.coach_emails for update using (public.is_owner()) with check (public.is_owner());
create policy "owners remove coaches" on public.coach_emails for delete using (public.is_owner());

-- Archiving: a client who has left can be archived. Nothing is deleted; they just drop out of the coaches' list.
alter table public.profiles add column if not exists archived boolean not null default false;
grant update (name, units, coach_id, remote, archived) on public.profiles to authenticated;

-- >>> OWNERS <<<  Put the owners' login emails here (lowercase). They must already be on the coach list or are added.
insert into public.coach_emails (email, is_owner) values
  (littlehawn1@gmail.com, true),
  (jess@thepowerplantgym.com, true)
on conflict (email) do update set is_owner = true;
