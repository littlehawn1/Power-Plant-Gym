# Power Plant Gym apps

Software for Power Plant Gym (Aston, PA).

| Folder | What it is | Live at |
| --- | --- | --- |
| `client/` | The client app: the coach's program, the client's own workouts, progress, exercise guides with the gym's videos | `/app/` |
| `coach/` | Coach dashboard: clients, recent workouts and notes, and the week-by-week program builder | `/coach/` |
| `shared/` | Code both use: the program format and shorthand reader (`program.js`), the exercise list (`library.js`) and the sample program (`sample.js`) | copied into both |

Every push to `main` deploys to GitHub Pages (see `.github/workflows/pages.yml` and `build.sh`). To try it locally: `sh build.sh && cd _site && python3 -m http.server`.

Status: both apps are connected to the gym's Supabase project. Clients and coaches sign in with email and password; clients' workouts, settings and 5RMs sync to their account, and coaches see every client, write programs that appear in the client's app, approve target maxes and keep private notes. The database is set up by `supabase/setup.sql` (safe to run again); the shared connection code is `shared/cloud.js`, and `shared/supabase.js` is supabase-js 2.45.4, kept in the repo so the app works offline.
