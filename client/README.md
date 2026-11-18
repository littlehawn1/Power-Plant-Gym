# Power Plant (client app)

The client app for Power Plant Gym. Workouts come from two places:

- **Coach-created:** the program the coach writes for this client. The **Train** tab shows the next workout; the **Program** tab shows every week and day with the coach's prescription (sets × reps, load as a weight, % of max or RPE, rest, notes). Coach workouts never change weights automatically; the coach decides progression.
- **User-added:** the client's own routines (**Routines** tab) and empty "freestyle" workouts, with Lift Log's automatic weight increases.

There is no AI in this app.

## Status

Accounts aren't connected yet. Until the gym's Supabase project exists, data is saved on the phone and a clearly labeled **sample program** ("Strength Foundations", 4 weeks × 3 days) stands in for a real one. All program reads go through `program()` and saving finished workouts tags them with `prog: { id, w, d }`, so swapping in the backend is contained.

## Program format (what the coach dashboard will produce)

```json
{ "id": "…", "name": "Strength Foundations", "coach": "Coach name",
  "weeks": [ { "note": "…", "days": [ { "name": "Lower", "note": "…",
    "items": [ { "ex": "squat", "sets": 4, "reps": 6, "load": { "t": "pct", "v": 75 }, "rest": 150, "note": "…" } ] } ] } ] }
```

`load.t` is `lb` (fixed weight), `pct` (% of the client's max), `rpe` (target effort) or `none`. Timed items use `time` (seconds) and carries/runs use `dist`.

**Supersets and circuits:** give consecutive items the same `group` letter (`"group": "A"`). Two items make a superset, three or more a circuit. There's no rest between them; the `rest` on the last item in the group runs after each round. Clients can also link exercises into a superset in their own workouts.

## Files

Same structure as Lift Log: `index.html`, `styles.css`, `app.js`, `exercises.js` (exercise library text), `sw.js` (offline + automatic updates), `manifest.webmanifest`, `icons/`, and `videos/<exercise id>.mp4` for coach demo videos.

Local storage keys use the `pp1.` prefix and caches use `pp-`, so this app never collides with Lift Log if both are served from the same web address.

## Demo videos

The guide shows, in order of preference:
1. A YouTube link on the program item (`"video": "https://youtu.be/…"`) — the coach can attach any of the gym's tutorials to an exercise in a client's program.
2. The gym's default video for that exercise (`GYM_VIDEOS` in `app.js`: tutorials from youtube.com/@powerplantgym for Romanian Deadlift, Barbell Hip Thrust, Bulgarian Split Squat, Walking Lunge, Bench Press, Pull-up, Chin-up, Back Extension, Overhead Press, Triceps Pushdown and Plank).
3. A file at `videos/<exercise id>.mp4`.
4. Otherwise, "Video demo coming soon".

YouTube videos play through youtube-nocookie.com and need an internet connection.
