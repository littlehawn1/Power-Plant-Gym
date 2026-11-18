/* Power Plant program format, shared by the coach dashboard and the client app.

   A program as the coach builds it (version 2):
   {
     v: 2, id, name, clientId, coach, weeks: 6,                 // number of weeks
     schedule: "weekly" | "flexible", startDate: "YYYY-MM-DD",  // weekly = each day has a weekday; flexible = any order
     notes,
     days: [{ id, name, weekday: 0-6 | null, note, warmup,      // warmup = free text for remote clients
       blocks: [{ id, ex, group: "A" | null, rest: seconds, note, video, warmupSets: bool,
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
    s = String(s || "").trim();
    if (!s) return null;
    let m;
    if ((m = s.match(/^(\d+(?:\.\d+)?)\s*%$/))) return { t: "pct", v: num(m[1]) };
    if ((m = s.match(/^rpe\s*(\d+(?:\.\d+)?)$/i))) return { t: "rpe", v: num(m[1]) };
    if ((m = s.match(/^rir\s*(\d+(?:\.\d+)?)$/i))) return { t: "rir", v: num(m[1]) };
    if ((m = s.match(/^(\d+(?:\.\d+)?)\s*(lb|lbs|kg)?$/i))) return { t: m[2] && m[2].toLowerCase() === "kg" ? "kg" : "lb", v: num(m[1]) };
    if (/^(bw|bodyweight)$/i.test(s)) return { t: "bw" };
    return undefined; // not understood
  }
  function parseTarget(s) {
    s = String(s || "").trim();
    let m;
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
      if ((m = seg.match(/^tempo\s*[:\s]\s*(.+)$/i))) { out.tempo = m[1].trim(); continue; }
      if ((m = seg.match(/^pause\b\s*(.*)$/i))) { out.pause = m[1].trim() || "pause"; continue; }
      const lab = seg.match(/\(([^)]*)\)/); if (lab) { label = lab[1].trim(); seg = seg.replace(lab[0], "").trim(); }
      let main = seg, loadTxt = "";
      const at = seg.indexOf("@"); if (at >= 0) { main = seg.slice(0, at).trim(); loadTxt = seg.slice(at + 1).trim(); }
      const load = loadTxt ? parseLoad(loadTxt) : null;
      if (load === undefined) { out.errors.push(seg); continue; }
      let g = null;
      if ((m = main.match(/^(\d+)\s*[x×]\s*(.+)$/i))) { const t = parseTarget(m[2]); if (t) g = { sets: +m[1], ...t }; }
      else if ((m = main.match(/^amrap\s+(.+)$/i))) { const t = parseTarget(m[1]); if (t && t.time) g = { sets: 1, amrap: true, time: t.time, capped: true }; }
      if (!g || g.sets < 1 || g.sets > 30) { out.errors.push(seg); continue; }
      if (load) g.load = load;
      if (label) g.label = label;
      out.groups.push(g);
    }
    return out;
  }
  const mmss = (s) => { s = Math.round(s || 0); const m = Math.floor(s / 60), r = s % 60; return m ? `${m}:${String(r).padStart(2, "0")}` : `${r}s`; };
  function loadText(l, units) {
    if (!l) return "";
    if (l.t === "pct") return `${l.v}%`;
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
    return (l ? `${t} @ ${l}` : t) + (g.label ? ` (${g.label})` : "");
  }
  function prescriptionText(p, units) {
    const parts = p.groups.map((g) => groupText(g, units));
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
  function dayDate(program, w, day) {
    if (program.schedule !== "weekly" || !program.startDate || day.weekday == null) return null;
    const start = new Date(program.startDate + "T12:00:00");
    const toWeekday = (day.weekday - start.getDay() + 7) % 7;
    const d = new Date(start.getTime() + (w * 7 + toWeekday) * 864e5);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  // Turns a coach program (v2) into the week-by-week list the client app runs.
  function compile(program) {
    if (!program || program.v !== 2) return program; // older programs are already in week form
    const weeks = [];
    for (let w = 0; w < program.weeks; w++) {
      const days = program.days.map((day) => ({
        id: day.id, name: day.name, weekday: day.weekday, date: dayDate(program, w, day), note: day.note || "", warmup: day.warmup || "",
        items: day.blocks.map((b) => {
          const cell = (b.weeks || [])[w] || ""; if (!cell.trim()) return null;
          const rx = parsePrescription(cell);
          if (!rx.groups.length) return null;
          const wn = (b.weekNotes || [])[w] || "";
          return { ex: b.ex, groups: rx.groups, tempo: rx.tempo, pause: rx.pause, rest: b.rest || 0, note: [b.note, wn].filter(Boolean).join(" "), group: b.group || null, video: b.video || "", fields: b.fields || null, format: b.format || null, warmupSets: !!b.warmupSets, sets: rx.groups.reduce((n, g) => n + g.sets, 0) };
        }).filter(Boolean),
      })).filter((d) => d.items.length || d.warmup);
      weeks.push({ note: (program.weekNotes || [])[w] || "", days });
    }
    return { id: program.id, name: program.name, coach: program.coach, schedule: program.schedule, startDate: program.startDate, sample: !!program.sample, weeks };
  }
  const api = { parsePrescription, parseLoad, prescriptionText, groupText, loadText, formatText, compile, dayDate, mmss, WEEKDAYS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.PPProgram = api;
})(typeof window !== "undefined" ? window : globalThis);
