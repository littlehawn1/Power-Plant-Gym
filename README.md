# Power Plant Gym apps

Software for Power Plant Gym (Aston, PA).

| Folder | What it is | Live at |
| --- | --- | --- |
| `client/` | The client app: the coach's program, the client's own workouts, progress, exercise guides with the gym's videos | `/app/` |
| `coach/` | Coach dashboard: clients, recent workouts and notes, and the week-by-week program builder | `/coach/` |
| `shared/` | Code both use: the program format and shorthand reader (`program.js`), the exercise list (`library.js`) and the sample program (`sample.js`) | copied into both |

Every push to `main` deploys to GitHub Pages (see `.github/workflows/pages.yml` and `build.sh`). To try it locally: `sh build.sh && cd _site && python3 -m http.server`.

Status: the client app runs on a labeled sample program with data saved on the phone. Accounts, the coach's real programs and syncing arrive when the gym's Supabase project is connected. See `client/README.md` for details.
