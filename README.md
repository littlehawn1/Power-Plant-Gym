# Power Plant Gym apps

Software for Power Plant Gym (Aston, PA).

| Folder | What it is | Live at |
| --- | --- | --- |
| `client/` | The client app: the coach's program, the client's own workouts, progress, exercise guides with the gym's videos | `/app/` |
| `coach/` | Coach dashboard: program builder, clients, form-check videos (coming next) | `/coach/` |

Every push to `main` deploys to GitHub Pages (see `.github/workflows/pages.yml`).

Status: the client app runs on a labeled sample program with data saved on the phone. Accounts, the coach's real programs and syncing arrive when the gym's Supabase project is connected. See `client/README.md` for details.
