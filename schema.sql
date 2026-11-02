-- ============================================================
-- Database schema for the raid roster app (Supabase / Postgres)
-- Run this whole file in the Supabase SQL Editor on an empty project.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Enums
-- ------------------------------------------------------------
create type public.role as enum ('damage', 'healer', 'tank', 'ranged', 'melee');
create type public.player_role as enum ('officer', 'raider');


-- ------------------------------------------------------------
-- 2. Tables (ordered so referenced tables come first)
-- ------------------------------------------------------------
create table public.classes (
  id smallint generated always as identity not null,
  name text,
  class_colour text,
  constraint classes_pkey primary key (id)
);

create table public.classes_specializations (
  id bigint generated always as identity not null,
  class_id smallint,
  icon text,
  name text not null,
  role public.role not null default 'damage'::public.role,
  constraint classes_specializations_pkey primary key (id),
  constraint classes_specializations_class_id_fkey foreign key (class_id) references public.classes(id)
);

create table public.players (
  id bigint generated always as identity not null,
  created_at timestamp with time zone not null default now(),
  name text not null,
  main_spec bigint,
  user_id uuid unique,
  role public.player_role not null default 'raider'::public.player_role,
  main_role public.role not null default 'ranged'::public.role,
  constraint players_pkey primary key (id),
  constraint players_main_spec_fkey foreign key (main_spec) references public.classes_specializations(id),
  constraint players_user_id_fkey foreign key (user_id) references auth.users(id)
);

create table public.raids (
  id bigint generated always as identity not null,
  created_at timestamp with time zone not null default now(),
  name text,
  colour text,
  background text,
  active boolean not null default true,
  constraint raids_pkey primary key (id)
);

create table public.raid_bosses (
  id bigint generated always as identity not null,
  raid_id bigint,
  name text,
  image text,
  index smallint,
  visible boolean not null default true,
  constraint raid_bosses_pkey primary key (id),
  constraint raid_bosses_raid_id_fkey foreign key (raid_id) references public.raids(id)
);

create table public.roster_options (
  id bigint generated always as identity not null,
  created_at timestamp with time zone not null default now(),
  option text,
  colour text,
  constraint roster_options_pkey primary key (id)
);

create table public.preference_options (
  id bigint generated always as identity not null,
  created_at timestamp with time zone not null default now(),
  option text,
  colour text,
  roster_option bigint,
  constraint preference_options_pkey primary key (id),
  constraint preference_options_roster_option_fkey foreign key (roster_option) references public.roster_options(id)
);

create table public.player_preferences (
  id bigint generated always as identity not null,
  created_at timestamp with time zone not null default now(),
  boss_id bigint,
  preference bigint default '3'::bigint,
  user_id uuid not null,
  spec_preference bigint,
  constraint player_preferences_pkey primary key (id),
  constraint player_preferences_boss_id_fkey foreign key (boss_id) references public.raid_bosses(id),
  constraint player_preferences_preference_fkey foreign key (preference) references public.preference_options(id),
  constraint player_preferences_user_id_fkey foreign key (user_id) references public.players(user_id),
  constraint player_preferences_spec_preference_fkey foreign key (spec_preference) references public.classes_specializations(id),
  constraint player_preferences_user_boss_unique unique (user_id, boss_id)
);

create table public.player_absences (
  id bigint generated always as identity not null,
  created_at timestamp with time zone not null default now(),
  start_date date not null,
  end_date date not null,
  player_id bigint,
  constraint player_absences_pkey primary key (id),
  constraint player_absences_player_id_fkey foreign key (player_id) references public.players(id)
);

create table public.boss_rosters (
  id bigint generated always as identity not null,
  created_at timestamp with time zone not null default now(),
  boss_id bigint,
  player_id bigint,
  spec bigint,
  option bigint,
  constraint boss_rosters_pkey primary key (id),
  constraint boss_rosters_boss_id_fkey foreign key (boss_id) references public.raid_bosses(id),
  constraint boss_rosters_player_id_fkey foreign key (player_id) references public.players(id),
  constraint boss_rosters_spec_fkey foreign key (spec) references public.classes_specializations(id),
  constraint boss_rosters_option_fkey foreign key (option) references public.roster_options(id),
  constraint boss_rosters_player_boss_key unique (player_id, boss_id)
);


-- ------------------------------------------------------------
-- 3. Helper functions (used by the RLS policies below)
-- ------------------------------------------------------------
create or replace function public.is_officer()
  returns boolean
  language sql
  stable security definer
  set search_path to ''
as $function$
  select exists (
    select 1
    from public.players
    where user_id = (select auth.uid())
      and role = 'officer'
  );
$function$;

create or replace function public.owns_player(p_player_id bigint)
  returns boolean
  language sql
  stable security definer
  set search_path to ''
as $function$
  select exists (
    select 1
    from public.players
    where id = p_player_id
      and user_id = (select auth.uid())
  );
$function$;

create or replace function public.prevent_role_change()
  returns trigger language plpgsql as $$
  begin
    if new.role is distinct from old.role
      and auth.uid() is not null          
      and not (select public.is_officer()) then
      raise exception 'Only officers can change roles';
    end if;
    return new;
  end;
$$;

create trigger players_prevent_role_change
before update on public.players
for each row execute function public.prevent_role_change();

-- ------------------------------------------------------------
-- 4. Row level security
-- ------------------------------------------------------------
alter table public.raids enable row level security;
alter table public.classes enable row level security;
alter table public.classes_specializations enable row level security;
alter table public.players enable row level security;
alter table public.raid_bosses enable row level security;
alter table public.preference_options enable row level security;
alter table public.roster_options enable row level security;
alter table public.player_preferences enable row level security;
alter table public.player_absences enable row level security;
alter table public.boss_rosters enable row level security;

-- boss_rosters
create policy "Enable insert for officers" on public.boss_rosters as permissive for insert to authenticated with check ((select public.is_officer()));
create policy "Enable read access for all users" on public.boss_rosters as permissive for select to authenticated using (true);
create policy "officers can update roster" on public.boss_rosters as permissive for update to authenticated using ((select public.is_officer())) with check ((select public.is_officer()));
create policy "officers can delete" on public.boss_rosters for delete to authenticated using ((select is_officer()));

-- classes, classes_specializations
create policy "Enable read access for all users" on public.classes as permissive for select to public using (true);
create policy "Enable read access for all users" on public.classes_specializations as permissive for select to public using (true);

-- player_absences
create policy "Enable read access for all users" on public.player_absences as permissive for select to authenticated using (true);
create policy "officers can insert for anyone" on public.player_absences as permissive for insert to authenticated with check ((select public.is_officer()));
create policy "owner or officer can delete absences" on public.player_absences as permissive for delete to authenticated using (((select public.is_officer()) or (select public.owns_player(player_absences.player_id))));
create policy "owner or officer can insert absences" on public.player_absences as permissive for insert to authenticated with check (((select public.is_officer()) or (select public.owns_player(player_absences.player_id))));
create policy "owner or officer can update absences" on public.player_absences as permissive for update to authenticated using (((select public.is_officer()) or (select public.owns_player(player_absences.player_id)))) with check (((select public.is_officer()) or (select public.owns_player(player_absences.player_id))));

-- player_preferences
create policy "Enable delete for users based on user_id" on public.player_preferences as permissive for delete to authenticated using (((select auth.uid()) = user_id));
create policy "Enable insert for users based on user_id" on public.player_preferences as permissive for insert to authenticated with check (((select auth.uid()) = user_id));
create policy "Enable read access for all users" on public.player_preferences as permissive for select to authenticated using (true);
create policy "Enable update for users based on user_id" on public.player_preferences as permissive for update to authenticated using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));

-- players
create policy "Enable read access for all users" on public.players as permissive for select to authenticated using (true);
create policy "authenticated users can claim an unclaimed player" on public.players as permissive for update to authenticated using ((user_id is null)) with check ((user_id = (select auth.uid())));
create policy "players can update their own row" on public.players as permissive for update to authenticated using ((user_id = (select auth.uid()))) with check ((user_id = (select auth.uid())));
create policy "officers can create new" on public.players for insert to authenticated with check ((select is_officer()));
create policy "officers can delete" on public.players for delete to authenticated using ((select is_officer()));
create policy "officers can update" on public.players for update to authenticated using ((select is_officer()))
with check ((select is_officer()));

-- preference_options, roster_options
create policy "Enable read access for all users" on public.preference_options as permissive for select to authenticated using (true);
create policy "Enable read access for all users" on public.roster_options as permissive for select to public using (true);

-- raids, raid_bosses
create policy "Enable read access for all users" on public.raid_bosses as permissive for select to authenticated using (true);
create policy "officers can update raid_bosses" on public.raid_bosses as permissive for update to authenticated using ((select public.is_officer())) with check ((select public.is_officer()));
create policy "Enable read access for all users" on public.raids as permissive for select to public using (true);


-- ------------------------------------------------------------
-- 5. Seed data
-- The app hardcodes these ids (identity columns assign ids in insert order,
-- so insert them in exactly this order on an empty table):
--   roster_options:     1 = In, 2 = Out, 3 = Away
--   preference_options: 1 = Will bonus roll, 2 = Wants to play,
--                       3 = No preference (default), 4 = Wants to sit out
-- Fill in your own colours (hex without '#') and roster_option mapping.
-- ------------------------------------------------------------
-- insert into public.roster_options (option, colour) values
--   ('In',   'afe990'),
--   ('Out',  'e47d7d'),
--   ('Away', 'e4cb7d');
--
-- insert into public.preference_options (option, colour, roster_option) values
--   ('Bonus roll',    '<hex>', <roster_options id>),
--   ('Wants to play', '<hex>', <roster_options id>),
--   ('No preference', '<hex>', <roster_options id>),
--   ('Sit out',       '<hex>', <roster_options id>);
--
-- classes, classes_specializations and raids/raid_bosses also need rows
-- before the app is usable.