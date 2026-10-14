# <DNE Roster>

A small app for managing a World of Warcraft raid team's roster. Players enter their preferences (do they want to play, which spec) on a per-boss basis and register planned absences. Officers see everything in one overview and can override any preference to build the final comp for each boss.

## How the final comp is decided

For every player and boss, the roster status and spec are resolved in this order:

1. **Officer override** (set in the roster management page)
2. **Player preference** (set by the player)
3. **Default** (the "no preference" option, and the player's main spec)

## Features

- **Player preferences:** per boss, choose whether you want to play, bonus roll, or sit out, and optionally pick an alternative spec.
- **Planned absences:** players can enter upcoming absences. Officers can enter absences for anyone.
- **Roster overview:** a table grouped by role (tank, healer, melee, ranged) showing every player's status per boss, with absence indicators.
- **Officer tools:** override a player's spec or roster status per boss, or mass-override a whole row (In / Out / Away).
- **Boss order:** drag and drop to reorder bosses, and hide bosses that should not appear in the final comp.
- **Discord login** via Supabase Auth.

## Tech stack

- [Next.js](https://nextjs.org) (App Router)
- [Supabase](https://supabase.com) for database and auth, using `@supabase/ssr` for cookie-based sessions
- [Discord OAuth](https://supabase.com/docs/guides/auth/social-login/auth-discord) for sign-in
- [Tailwind CSS](https://tailwindcss.com) and [shadcn/ui](https://ui.shadcn.com/) for styling and components
- [dnd kit](https://dndkit.com/) for drag and drop

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

Create a project at [supabase.com](https://supabase.com), then copy the project URL and API key from **Project Settings → API**.

### 3. Set environment variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

> Use the variable names your project actually reads (see `lib/supabase/client.ts`).

### 4. Set up the database

Run the contents of [`schema.sql`](./schema.sql) in the Supabase **SQL Editor**. This creates the tables, row level security policies and seed data.

The app relies on specific seed rows, so do not renumber them:

| Table                | id  | Meaning                     |
| -------------------- | --- | --------------------------- |
| `preference_options` | 1   | Will bonus roll             |
| `preference_options` | 2   | Wants to play               |
| `preference_options` | 3   | No preference (the default) |
| `preference_options` | 4   | Wants to sit out            |
| `roster_options`     | 1   | In                          |
| `roster_options`     | 2   | Out                         |
| `roster_options`     | 3   | Away                        |

### 5. Configure Discord login

1. Create an application in the [Discord Developer Portal](https://discord.com/developers/applications).
2. Add the Supabase callback URL (shown in **Authentication → Providers → Discord**) as a redirect URI.
3. Paste the Discord client ID and secret into the Supabase Discord provider settings and enable it.

### 6. Run the app

```bash
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

## Database overview

| Table                                | Purpose                                                                                         |
| ------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `players`                            | Raid members, linked to a Supabase auth user, with a main spec and a role (`raider` or officer) |
| `classes`, `classes_specializations` | Classes and their specs, with icons and roles                                                   |
| `raids`, `raid_bosses`               | Raid tiers and their bosses (with display order and visibility)                                 |
| `preference_options`                 | The choices a player can make per boss (bonus roll, play, no preference, sit out)               |
| `player_preferences`                 | A player's chosen option and spec per boss                                                      |
| `player_absences`                    | Planned absences with start and end dates                                                       |
| `roster_options`                     | Final roster statuses (In, Out, Away)                                                           |
| `boss_rosters`                       | Officer overrides per player and boss                                                           |

## Roles and permissions

- **Raiders** can edit their own preferences and absences.
- **Officers** can additionally reorder and hide bosses and override any player's spec or roster status.

Permissions are enforced with Supabase row level security.

## Known limitations

- Nothing verifies that a player claims the correct character profile. The team is small and trusted, so this is intentional for now.

## Roadmap

- Let officers manage raids, raid bosses and new players.
- Let officers manage existing players' specs and roles.
