/* Power Plant program format, shared by the coach dashboard and the client app.

   A program as the coach builds it (version 2):
   {
     v: 2, id, name, clientId, coach, weeks: 6,                 // number of weeks
     schedule: "weekly" | "flexible", startDate: "YYYY-MM-DD",  // weekly = each day has a weekday; flexible = any order
     notes,
     days: [{ id, name, weekday: 0-6 | null, note, warmup,      // warmup = free text for remote clients
       blocks: [{ id, ex, group: "A" | null, rest: seconds, note, video, warmupSets: bool, warmup: "" | "start 95" | "95x5, 105x5, 115x3" | "bar x5, 50%x5" | "none",
         fields: ["w","r","s","d","h"] | null,                 // what the client records; null = the exercise's default
         format: null | { t: "emom", every: 60, rounds: 10 } | { t: "interval", work: 40, rest: 20, rounds: 8 },
         weeks: ["1x3 @85%, 3x5 @75%", "…", …],                  // one prescription per week, "" = not this week
         weekNotes: ["", …] }] }]
   }

   Prescription shorthand (one cell per week), separated by commas, semicolons or new lines:
     3x5 @75%            sets × reps at % of max
     1x3 @85%, 3x5 @75%  top set then back-off sets
     3x8-10 @RPE8        rep range at an effort (RPE) ;  @RIR2 also works
     3xAMRAP @70%        as many reps as possible ;  1x5+ = at least 5, then as many as possible
     4x6 @135  /  @60kg  fixed weight (lb unless kg is written)
     3x30s  /  3x2min    timed sets
     3x40yd @200         distance (yd, m, ft, mi, km), optionally with a weight
     AMRAP 60s @200      max reps in a time window
     tempo 3-1-1         tempo for this week ;  pause 2s  (or any pause note)
     (top set)           text in brackets is shown as a label on that set group
     3x8/side            per side (also /leg, /arm, "each side")
     2x3 @90% of top     back-off sets at a % of the heaviest set logged earlier in the same exercise today
     Anything else is kept word for word and shown to the client as written.

   Maxes: percentages are of the client's target max. A 5-rep max converts with 5RM ÷ 0.83, and every
   calculated weight rounds UP to the nearest 5 lb (2.5 kg).
*/
(function (root) {
  "use strict";
  const num = (s) => parseFloat(String(s).replace(",", "."));
  const TIME_RE = /^(\d+(?:\.\d+)?)\s*(s|sec|secs|seconds?|min|mins|minutes?)$/i;
  const DIST_RE = /^(\d+(?:\.\d+)?)\s*(yd|yds|yards?|m|meters?|metres?|ft|feet|mi|miles?|km)$/i;
  const DIST_UNIT = { y: "yd", m: "m", f: "ft", k: "km" };
  const distUnit = (u) => { u = u.toLowerCase(); if (u.startsWith("mi")) return "mi"; return DIST_UNIT[u[0]] || u; };
  const secs = (v, u) => Math.round(num(v) * (/^m/i.test(u) ? 60 : 1));

  function parseLoad(s) {
    s = String(s || "").trim().replace(/[.]$/, "");
    if (!s) return null;
    let m;
    if ((m = s.match(/^(\d+(?:\.\d+)?)\s*%\s*(?:of\s+)?(?:today'?s\s+|todays\s+)?(?:top|heaviest)(?:\s*(?:set|wt|weight|single|double|triple|of the day))?$/i))) return { t: "top", v: num(m[1]) };
    if ((m = s.match(/^(\d+(?:\.\d+)?)\s*%\s*(?:of\s+)?(?:(?:your|the)\s+)?(?:(?:est(?:imated)?\.?|target|training|tm)\s*)?(?:1\s*rm|e1rm|max)?$/i))) return { t: "pct", v: num(m[1]) };
    if ((m = s.match(/^rpe\s*(\d+(?:\.\d+)?)$/i))) return { t: "rpe", v: num(m[1]) };
    if ((m = s.match(/^rir\s*(\d+(?:\.\d+)?)$/i))) return { t: "rir", v: num(m[1]) };
    if ((m = s.match(/^(\d+(?:\.\d+)?)\s*(lb|lbs|kg)?$/i))) return { t: m[2] && m[2].toLowerCase() === "kg" ? "kg" : "lb", v: num(m[1]) };
    if (/^(bw|bodyweight)$/i.test(s)) return { t: "bw" };
    return undefined; // not understood
  }
  function parseTarget(s) {
    s = String(s || "").trim();
    let m;
    if ((m = s.match(/^(.+?)\s*(?:\/\s*|each\s+|per\s+|a\s+)(side|leg|arm|hand)s?$/i))) { const t = parseTarget(m[1]); return t ? { ...t, per: m[2].toLowerCase() } : null; }
    if (/^amrap$/i.test(s)) return { amrap: true };
    if ((m = s.match(/^(\d+)\s*\+$/))) return { reps: +m[1], amrap: true };
    if ((m = s.match(/^(\d+)\s*[-–]\s*(\d+)$/))) return { reps: +m[1], repsMax: +m[2] };
    if ((m = s.match(TIME_RE))) return { time: secs(m[1], m[2]) };
    if ((m = s.match(DIST_RE))) return { dist: num(m[1]), distUnit: distUnit(m[2]) };
    if ((m = s.match(/^(\d+)$/))) return { reps: +m[1] };
    return null;
  }
  function parsePrescription(text) {
    const out = { groups: [], tempo: "", pause: "", errors: [], raw: String(text || "") };
    const segs = out.raw.split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean);
    for (let seg of segs) {
      let m, label = "";
      seg = seg.replace(/^(then|and|plus|followed by)\s+/i, "").trim();
      // "build to a heavy triple", "work up to a 3RM": one top set the client picks the weight for
      if ((m = seg.match(/^(?:build|work)(?:\s+up)?\s+to\s+(?:a\s+)?(?:heavy\s+|top\s+|hard\s+)?(single|double|triple|(\d+)\s*rm|(\d+))\b/i))) {
        const reps = { single: 1, double: 2, triple: 3 }[m[1].toLowerCase()] || +(m[2] || m[3]);
        out.groups.push({ sets: 1, reps, label: "build to a heavy " + ({ 1: "single", 2: "double", 3: "triple" }[reps] || reps + "RM"), build: true }); out.loose = true; continue;
      }
      if ((m = seg.match(/^tempo\s*[:\s]\s*([0-9xX]{1,4}(?:\s*[-–]\s*[0-9xX]{1,2}){0,3}(?:\s*(?:s|sec|secs|seconds|count|ct))?)$/i))) { out.tempo = m[1].trim(); continue; } // a tempo like 3010, 31X0 or 3-1-1, not a sentence that starts with "tempo"
      if ((m = seg.match(/^pause\b\s*(.*)$/i))) { out.pause = m[1].trim() || "pause"; continue; }
      const lab = seg.match(/\(([^)]*)\)/); if (lab) { label = lab[1].trim(); seg = seg.replace(lab[0], "").trim(); }
      let main = seg, loadTxt = "";
      const at = seg.indexOf("@"); if (at >= 0) { main = seg.slice(0, at).trim(); loadTxt = seg.slice(at + 1).trim(); }
      const load = loadTxt ? parseLoad(loadTxt) : null;
      if (load === undefined) { out.errors.push(seg); continue; }
      let g = null;
      if ((m = main.match(/^(\d+)\s*[x×]\s*(.+)$/i))) { const t = parseTarget(m[2]); if (t) g = { sets: +m[1], ...t }; }
      else if ((m = main.match(/^amrap\s+(.+)$/i))) { const t = parseTarget(m[1]); if (t && t.time) g = { sets: 1, amrap: true, time: t.time, capped: true }; }
      if (!g && (m = main.match(/^(\d+)\s*[x×]\s*(\S+?)(?:\s+(.+))?$/i))) { const t = parseTarget(m[2]); if (t) { g = { sets: +m[1], ...t }; out.loose = true; } } // "3 x 10 3ct tempo eccentric": sets and reps, rest kept as written
      if (!g || g.sets < 1 || g.sets > 30) { out.errors.push(seg); continue; }
      if (load) g.load = load;
      if (label) g.label = label;
      out.groups.push(g);
    }
    // Free text with sets tucked inside sentences ("Think Lil Jon. Warm up: 4x5. 3 x 5-7 @65%."): pull those out.
    if (!out.groups.length && out.errors.length) {
      const re = /(\d+)\s*[x×]\s*(\d+\s*[-–]\s*\d+|\d+\s*\+|\d+)(?![a-z0-9:])(?:\s*@\s*([0-9][0-9.]*\s*%?(?:\s*(?:lbs?|kg))?|rpe\s*\d+(?:\.\d+)?))?/gi;
      let m; while ((m = re.exec(out.raw))) {
        const t = parseTarget(m[2].replace(/\s+/g, "")), L = m[3] ? parseLoad(m[3]) : null;
        if (t && +m[1] > 0 && +m[1] <= 20 && L !== undefined) out.groups.push({ sets: +m[1], ...t, ...(L ? { load: L } : {}) });
      }
      if (out.groups.length) out.loose = true;
    }
    return out;
  }
  const mmss = (s) => { s = Math.round(s || 0); const m = Math.floor(s / 60), r = s % 60; return m ? `${m}:${String(r).padStart(2, "0")}` : `${r}s`; };
  function loadText(l, units) {
    if (!l) return "";
    if (l.t === "pct") return `${l.v}%`;
    if (l.t === "top") return `${l.v}% of today’s top set`;
    if (l.t === "rpe") return `RPE ${l.v}`;
    if (l.t === "rir") return `${l.v} RIR`;
    if (l.t === "lb" || l.t === "kg") return `${l.v} ${l.t}`;
    if (l.t === "bw") return "bodyweight";
    return "";
  }
  function groupText(g, units) {
    let t;
    if (g.capped) t = `AMRAP in ${mmss(g.time)}`;
    else if (g.time) t = `${g.sets} × ${mmss(g.time)}`;
    else if (g.dist) t = `${g.sets} × ${g.dist} ${g.distUnit}`;
    else if (g.amrap && !g.reps) t = `${g.sets} × AMRAP`;
    else if (g.amrap) t = `${g.sets} × ${g.reps}+`;
    else t = `${g.sets} × ${g.reps}${g.repsMax ? "–" + g.repsMax : ""}`;
    const l = loadText(g.load, units);
    if (g.per) t += ` each ${g.per}`;
    return (l ? `${t} @ ${l}` : t) + (g.label ? ` (${g.label})` : "");
  }
  function prescriptionText(p, units) {
    if (!p || typeof p !== "object") return typeof p === "string" ? p : "";
    if (p.text) return p.text; // the coach's own words
    const parts = (Array.isArray(p.groups) ? p.groups : []).filter(Boolean).map((g) => groupText(g, units));
    if (p.tempo) parts.push(`tempo ${p.tempo}`);
    if (p.pause) parts.push(`pause ${p.pause}`);
    return parts.join(" · ");
  }
  function formatText(f) {
    if (!f) return "";
    if (f.t === "emom") return `EMOM: every ${mmss(f.every)} for ${f.rounds} rounds`;
    if (f.t === "interval") return `Intervals: ${mmss(f.work)} on / ${mmss(f.rest)} off × ${f.rounds}`;
    return "";
  }
  const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  // Days without a day of the week (common in imported programs) still land on the calendar: they follow each
  // other from the start date in their order, so Day 1 is on the start date, Day 2 the next day, and so on,
  // skipping days of the week other days already have.
  const SKIP_RE = /^(skip|off|none|n\/a|-+|—)$/i;
  // Does this day have a workout in week w? (exercises that week, or a day that's only warm-up/cool-down)
  function dayActive(day, w) {
    const bl = day.blocks || [];
    if (!bl.length) return !!(day.warmup || day.cooldown);
    return bl.some((b) => { const c = String((b.weeks || [])[w] || "").trim(); return c && !SKIP_RE.test(c); });
  }
  function autoOffset(program, day, w) {
    const start = new Date(program.startDate + "T12:00:00").getDay(), all = program.days || [];
    const days = w == null ? all : all.filter((d) => d.weekday != null || d === day || dayActive(d, w)); // only that week's workouts share out the open days
    const taken = new Set(days.filter((d) => d.weekday != null).map((d) => (d.weekday - start + 7) % 7));
    const open = [0, 1, 2, 3, 4, 5, 6].filter((o) => !taken.has(o)); if (!open.length) open.push(0, 1, 2, 3, 4, 5, 6);
    const i = days.filter((d) => d.weekday == null).findIndex((d) => d === day || (d.id && d.id === day.id));
    return i < 0 ? open[0] : open[i % open.length];
  }
  function dayDate(program, w, day) {
    if (program.schedule !== "weekly" || !program.startDate) return null;
    const start = new Date(program.startDate + "T12:00:00");
    if (isNaN(start)) return null;
    const toWeekday = day.weekday == null ? autoOffset(program, day, w) : (day.weekday - start.getDay() + 7) % 7;
    const d = new Date(start.getTime() + (w * 7 + toWeekday) * 864e5);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  // A coach can move one week's session to another date (dragged on the calendar). Kept as { "<week>:<day id>": "YYYY-MM-DD" }.
  // "off" instead of a date means the coach took that session off the calendar.
  const isOff = (program, w, day) => !!(program && program.moves && program.moves[moveKey(w, day)] === "off");
  const moveKey = (w, day) => `${w}:${day.id}`;
  function movedDate(program, w, day) {
    const m = program && program.moves; if (!m || (program.schedule !== "weekly" && program.schedule !== "dated")) return null;
    const v = m[moveKey(w, day)]; return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
  }
  // "Warm up: 4x5" inside a coach's text: those are warm-up sets (worked out up to the working weight), so they come
  // out of the working sets. Returns { groups, warmup } or null.
  function textWarmup(text, groups) {
    const m = String(text || "").match(/warm\s*-?\s*ups?\s*[:\-–]?\s*(\d+)\s*(?:x|×|sets?\s*of)\s*(\d+)/i);
    if (!m) return null;
    const n = +m[1], r = +m[2], i = (groups || []).findIndex((g) => g.sets === n && g.reps === r && !g.load);
    return { groups: i < 0 ? groups : groups.filter((_, k) => k !== i), warmup: `${n} sets of ${r}` };
  }
  // A day counts as a workout in a week only if it has exercises that week. Warm-up or cool-down text alone counts
  // only for a day with no exercises at all (a mobility day); otherwise imported days showed up empty every week.
  // Turns a coach program (v2) into the week-by-week list the client app runs.
  function compile(program) {
    if (!program || program.v !== 2) return program; // older programs are already in week form
    const weeks = [];
    for (let w = 0; w < program.weeks; w++) {
      const days = program.days.map((day) => ({
        id: day.id, name: day.name, weekday: day.weekday, date: movedDate(program, w, day) || dayDate(program, w, day), moved: program.schedule === "weekly" && !!movedDate(program, w, day), off: isOff(program, w, day), note: day.note || "", warmup: day.warmup || "", cooldown: day.cooldown || "",
        items: day.blocks.map((b) => {
          const cell = (b.weeks || [])[w] || ""; if (!cell.trim() || /^(skip|off|none|n\/a|-+|—)$/i.test(cell.trim())) return null;
          const rx = parsePrescription(cell);
          const wn = (b.weekNotes || [])[w] || "";
          // Cells that aren't all shorthand are shown word for word; whatever could be read still sets up the logging rows.
          // A coach can set the exact sets for one day (b.rows[w]) and its warm-up (b.wu[w]) from the calendar.
          // The client still reads the coach's text; the app logs these sets and warm-ups.
          const rowsTxt = String((b.rows || [])[w] || "").trim(), rr = rowsTxt ? parsePrescription(rowsTxt) : null, lg = rr && rr.groups.length ? rr : rx;
          const tw = !rr && (rx.errors.length || rx.loose) ? textWarmup(cell, rx.groups) : null; if (tw) lg.groups = tw.groups; // lg is rx here
          const wuTxt = String((b.wu || [])[w] || "").trim() || (tw ? tw.warmup : "");
          return { ex: b.ex, warmup: wuTxt || b.warmup || "", text: rx.errors.length || rx.loose ? cell.trim() : "", groups: lg.groups, tempo: rx.tempo, pause: rx.pause, rest: b.rest || 0, note: [b.note, wn].filter(Boolean).join(" "), group: b.group || null, video: b.video || "", fields: b.fields || null, format: b.format || null, warmupSets: wuTxt ? !/^(none|no|off|skip)$/i.test(wuTxt) : !!b.warmupSets, sets: lg.groups.reduce((n, g) => n + g.sets, 0) };
        }).filter(Boolean),
      })).filter((d, i) => (d.items.length || (!(program.days[i].blocks || []).length && (d.warmup || d.cooldown))) && (program.schedule !== "dated" || d.date) && !d.off); // a "dated" program only runs the workouts put on the calendar
      weeks.push({ note: (program.weekNotes || [])[w] || "", days });
    }
    return { warmupDefault: program.warmupDefault || null, id: program.id, name: program.name, coach: program.coach, schedule: program.schedule, startDate: program.startDate, sample: !!program.sample, maxes: program.maxes || null, weeks };
  }

  /* ---- Maxes ---- */
  const ceilTo = (w, step) => (step > 0 ? Math.ceil(w / step - 1e-9) * step : w); // always round up
  const roundStep = (units) => (units === "kg" ? 2.5 : 5);

  /* ---- Warm-up sets ----
     Gym default (set by coaches): reps for each warm-up set, light to heavy, and a second list used when the
     working weight is at least heavyAt% of the client's max (the last warm-ups are heavy, so fewer reps).
     The weights climb in even jumps from the empty bar (or a chosen start) up to the working weight, rounded up.
     A coach can write a different warm-up for one client's lift:
       "start 95"                  the default reps, starting at 95 instead of the empty bar
       "95x5, 105x5, 115x3"        exactly these (a weight on its own means 5 reps)
       "bar x5, 50%x5, 75%x3"      "bar" is the empty bar; % is of the working weight
       "none"                      no warm-up sets */
  const WARMUP_DEFAULT = { reps: [5, 5, 5, 5], heavyReps: [5, 5, 3, 2], heavyAt: 85 };
  const repList = (v, fb) => { const a = (Array.isArray(v) ? v : String(v || "").split(/[^0-9]+/)).map((x) => Math.round(+x)).filter((x) => x > 0 && x < 100).slice(0, 10); return a.length ? a : fb; };
  function warmupDefaultOf(d) {
    d = d && typeof d === "object" ? d : {};
    const at = +d.heavyAt;
    return { reps: repList(d.reps, WARMUP_DEFAULT.reps), heavyReps: repList(d.heavyReps, WARMUP_DEFAULT.heavyReps), heavyAt: at > 0 && at <= 100 ? at : WARMUP_DEFAULT.heavyAt };
  }
  function parseWarmup(text) {
    const t = String(text || "").trim().toLowerCase();
    if (!t) return null;
    if (/^(none|no|off|skip|-+)$/.test(t)) return { kind: "none" };
    let m = t.match(/^(?:start(?:ing)?|from)\s*(?:at\s*)?(\d+(?:\.\d+)?)$/);
    if (m) return { kind: "start", start: +m[1] };
    m = t.match(/^(\d+)\s*sets?\s*of\s*(\d+)$/);
    if (m && +m[1] > 0 && +m[1] <= 10) return { kind: "reps", reps: Array(+m[1]).fill(+m[2] || 5) };
    const steps = [];
    for (const part of t.split(/[,;\n]+|\s+then\s+/).map((x) => x.trim()).filter(Boolean)) {
      m = part.match(/^(bar|empty bar|\d+(?:\.\d+)?\s*%|\d+(?:\.\d+)?)\s*(?:(?:x|×|\*|for)\s*(\d+))?(?:\s*reps?)?$/);
      if (!m) return { kind: "bad", text: part };
      const w = /bar/.test(m[1]) ? "bar" : m[1].includes("%") ? { pct: parseFloat(m[1]) } : +m[1];
      steps.push({ w, r: m[2] ? +m[2] : 5 });
    }
    return steps.length ? { kind: "list", steps } : null;
  }
  // { work, bar, max, step, def, custom } → [{ w, r }]; work is the heaviest working weight for the lift.
  function warmupPlan({ work, bar = 0, max = 0, step = 5, def, custom } = {}) {
    const c = parseWarmup(custom), d = warmupDefaultOf(def);
    if (c && (c.kind === "none" || c.kind === "bad")) return [];
    const fit = (w) => { if (!(work > 0)) return w; let x = ceilTo(w, step); if (x >= work) x = Math.floor(w / step + 1e-9) * step; return x; };
    const out = [], seen = new Set();
    const add = (w, r) => { if (!(w >= 0) || (work > 0 && w >= work) || seen.has(w)) return; seen.add(w); out.push({ w, r }); };
    if (c && c.kind === "list") {
      for (const st of c.steps) add(st.w === "bar" ? bar : st.w.pct ? fit(work * st.w.pct / 100) : st.w, st.r);
      return work > 0 || c.steps.every((st) => typeof st.w === "number" || st.w === "bar") ? out : [];
    }
    if (!(work > 0)) return [];
    const start = c && c.kind === "start" ? c.start : bar;
    if (!(work > start)) return [];
    const reps = c && c.kind === "reps" ? c.reps : max > 0 && work >= (max * d.heavyAt) / 100 ? d.heavyReps : d.reps, n = reps.length;
    for (let i = 0; i < n; i++) add(i === 0 ? start : fit(start + ((work - start) * i) / n), reps[i]);
    return out;
  }
  const est1RM = (rm5, units) => (rm5 > 0 ? ceilTo(rm5 / 0.83, roundStep(units)) : 0); // the gym's 5RM ÷ 0.83 rule
  // m = { rm5, rm1, target }: the coach's target wins, then a tested 1RM, then the estimate from the 5RM.
  const targetOf = (m, units) => (!m ? 0 : m.target > 0 ? m.target : m.rm1 > 0 ? m.rm1 : est1RM(m.rm5, units));
  const pctOf = (max, pct, units) => (max > 0 ? ceilTo((max * pct) / 100, roundStep(units)) : 0);
  // **bold** in coach notes; everything else is escaped.
  const richText = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");

  const api = { textWarmup, dayActive, isOff, WARMUP_DEFAULT, warmupDefaultOf, parseWarmup, warmupPlan, moveKey, movedDate, parsePrescription, parseLoad, prescriptionText, groupText, loadText, formatText, compile, dayDate, mmss, WEEKDAYS, ceilTo, roundStep, est1RM, targetOf, pctOf, richText };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.PPProgram = api;
})(typeof window !== "undefined" ? window : globalThis);
