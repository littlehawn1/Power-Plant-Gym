/* Power Plant — client app for Power Plant Gym. Workouts come from the coach's program or the client's own routines.
   Until accounts are live, data (and a sample program) live on this device. */
(() => {
"use strict";
const APP_VERSION = "0.2.2";
const APP_NAME = "Power Plant";

/* ================= Exercise library ================= */
// track: "wr" weight+reps · "time" seconds · "dt" distance+time · "wd" weight+distance
// better: for time tracks, whether a higher or lower time is better. dist: "long" (mi/km) or "short" (yd/m).
// [id, name, kind, muscle, sets, repsMin, repsMax, extra]
const LIB_ROWS = [
  ["squat", "Barbell Back Squat", "barbell", "Legs", 3, 5, 5],
  ["front_squat", "Front Squat", "barbell", "Legs", 3, 5, 8],
  ["deadlift", "Deadlift", "barbell", "Back", 1, 5, 5],
  ["trap_dl", "Trap Bar Deadlift", "barbell", "Back", 3, 3, 5, { barW: true }],
  ["rdl", "Romanian Deadlift", "barbell", "Hamstrings", 3, 8, 10],
  ["hip_thrust", "Barbell Hip Thrust", "barbell", "Glutes", 3, 8, 12],
  ["leg_press", "Leg Press", "machine", "Legs", 3, 10, 12],
  ["hack_squat", "Hack Squat", "machine", "Legs", 3, 8, 12],
  ["leg_ext", "Leg Extension", "machine", "Quads", 3, 10, 15],
  ["leg_curl", "Lying Leg Curl", "machine", "Hamstrings", 3, 10, 12],
  ["seated_leg_curl", "Seated Leg Curl", "machine", "Hamstrings", 3, 10, 12],
  ["goblet", "Goblet Squat", "dumbbell", "Legs", 3, 10, 12],
  ["bulgarian", "Bulgarian Split Squat", "dumbbell", "Legs", 3, 8, 12],
  ["lunge", "Walking Lunge", "dumbbell", "Legs", 3, 10, 12],
  ["hip_abd", "Hip Abduction", "machine", "Glutes", 3, 12, 15],
  ["calf_raise", "Standing Calf Raise", "machine", "Calves", 4, 10, 15],
  ["seated_calf", "Seated Calf Raise", "machine", "Calves", 3, 12, 15],
  ["bench", "Barbell Bench Press", "barbell", "Chest", 3, 5, 5],
  ["incline_bench", "Incline Barbell Bench", "barbell", "Chest", 3, 6, 10],
  ["db_bench", "Dumbbell Bench Press", "dumbbell", "Chest", 3, 8, 12],
  ["incline_db", "Incline Dumbbell Press", "dumbbell", "Chest", 3, 8, 12],
  ["chest_press", "Machine Chest Press", "machine", "Chest", 3, 8, 12],
  ["pec_deck", "Pec Deck Fly", "machine", "Chest", 3, 12, 15],
  ["cable_fly", "Cable Fly", "cable", "Chest", 3, 12, 15],
  ["dip", "Dip", "bodyweight", "Chest", 3, 6, 12],
  ["pushup", "Push-up", "bodyweight", "Chest", 3, 10, 20],
  ["hrpu", "Hand-Release Push-up", "bodyweight", "Chest", 1, 20, 60],
  ["row", "Barbell Row", "barbell", "Back", 3, 5, 8],
  ["pullup", "Pull-up", "bodyweight", "Back", 3, 5, 10],
  ["chinup", "Chin-up", "bodyweight", "Back", 3, 5, 10],
  ["lat_pulldown", "Lat Pulldown", "cable", "Back", 3, 8, 12],
  ["seated_row", "Seated Cable Row", "cable", "Back", 3, 8, 12],
  ["db_row", "One-Arm Dumbbell Row", "dumbbell", "Back", 3, 8, 12],
  ["tbar_row", "T-Bar Row", "machine", "Back", 3, 8, 12],
  ["machine_row", "Chest-Supported Machine Row", "machine", "Back", 3, 8, 12],
  ["straight_arm", "Straight-Arm Pulldown", "cable", "Back", 3, 12, 15],
  ["back_ext", "Back Extension", "bodyweight", "Lower back", 3, 10, 15],
  ["ohp", "Overhead Press", "barbell", "Shoulders", 3, 5, 5],
  ["db_shoulder", "Seated Dumbbell Shoulder Press", "dumbbell", "Shoulders", 3, 8, 12],
  ["machine_shoulder", "Machine Shoulder Press", "machine", "Shoulders", 3, 8, 12],
  ["lateral", "Dumbbell Lateral Raise", "dumbbell", "Shoulders", 3, 12, 15],
  ["cable_lateral", "Cable Lateral Raise", "cable", "Shoulders", 3, 12, 15],
  ["rear_delt", "Reverse Pec Deck", "machine", "Rear delts", 3, 12, 15],
  ["face_pull", "Face Pull", "cable", "Rear delts", 3, 12, 15],
  ["shrug", "Dumbbell Shrug", "dumbbell", "Traps", 3, 10, 15],
  ["bb_curl", "Barbell Curl", "barbell", "Biceps", 3, 8, 12],
  ["db_curl", "Dumbbell Curl", "dumbbell", "Biceps", 3, 8, 12],
  ["hammer", "Hammer Curl", "dumbbell", "Biceps", 3, 10, 12],
  ["cable_curl", "Cable Curl", "cable", "Biceps", 3, 10, 15],
  ["preacher", "Machine Preacher Curl", "machine", "Biceps", 3, 10, 12],
  ["pushdown", "Triceps Pushdown", "cable", "Triceps", 3, 10, 15],
  ["oh_ext", "Overhead Cable Triceps Extension", "cable", "Triceps", 3, 10, 15],
  ["skull", "EZ-Bar Skull Crusher", "barbell", "Triceps", 3, 8, 12],
  ["close_bench", "Close-Grip Bench Press", "barbell", "Triceps", 3, 6, 10],
  ["hang_leg", "Hanging Leg Raise", "bodyweight", "Core", 3, 10, 15],
  ["cable_crunch", "Cable Crunch", "cable", "Core", 3, 12, 15],
  ["ab_wheel", "Ab Wheel Rollout", "bodyweight", "Core", 3, 8, 12],
  ["plank", "Plank", "bodyweight", "Core", 3, 0, 0, { track: "time", better: "higher", defS: 60 }],
  ["dead_hang", "Dead Hang", "bodyweight", "Grip", 3, 0, 0, { track: "time", better: "higher", defS: 45 }],
  ["farmer", "Farmer Carry", "dumbbell", "Grip", 3, 0, 0, { track: "wd", dist: "short", defD: 40 }],
  ["sled_push", "Sled Push", "machine", "Legs", 4, 0, 0, { track: "wd", dist: "short", defD: 25 }],
  ["sdc", "Sprint-Drag-Carry", "cardio", "Conditioning", 1, 0, 0, { track: "time", better: "lower", defS: 150 }],
  ["run2mi", "2-Mile Run", "cardio", "Conditioning", 1, 0, 0, { track: "time", better: "lower", defS: 1080 }],
  ["run", "Run", "cardio", "Conditioning", 1, 0, 0, { track: "dt", dist: "long", defD: 2, defS: 1080 }],
  ["sprints", "Sprint Intervals", "cardio", "Conditioning", 6, 0, 0, { track: "dt", dist: "short", defD: 100, defS: 18 }],
  ["row_erg", "Rowing Machine", "cardio", "Conditioning", 1, 0, 0, { track: "dt", dist: "short", defD: 2000, defS: 480 }],
  ["bike", "Stationary Bike", "cardio", "Conditioning", 1, 0, 0, { track: "dt", dist: "long", defD: 5, defS: 900 }],
  ["stairs", "Stair Climber", "cardio", "Conditioning", 1, 0, 0, { track: "time", better: "higher", defS: 900 }],
];
const KINDS = ["barbell", "dumbbell", "machine", "cable", "bodyweight", "cardio"];
const TRACKS = { wr: "Weight × reps", time: "Time", dt: "Distance + time", wd: "Weight + distance" };
const MUSCLES = ["Chest", "Back", "Shoulders", "Rear delts", "Traps", "Legs", "Quads", "Hamstrings", "Glutes", "Calves", "Lower back", "Biceps", "Triceps", "Core", "Grip", "Conditioning", "Other"];
const LIB = {};
for (const [id, name, kind, muscle, sets, repsMin, repsMax, extra] of LIB_ROWS) LIB[id] = { id, name, kind, muscle, sets, repsMin, repsMax, track: "wr", ...(extra || {}) };

const KIND_DEFAULTS = {
  lb: { barbell: { w: 45, inc: 5 }, dumbbell: { w: 20, inc: 5 }, machine: { w: 50, inc: 10 }, cable: { w: 30, inc: 5 }, bodyweight: { w: 0, inc: 5 }, cardio: { w: 0, inc: 0 } },
  kg: { barbell: { w: 20, inc: 2.5 }, dumbbell: { w: 8, inc: 2 }, machine: { w: 25, inc: 5 }, cable: { w: 15, inc: 2.5 }, bodyweight: { w: 0, inc: 2.5 }, cardio: { w: 0, inc: 0 } },
};
const LOWER_BARBELL = new Set(["squat", "front_squat", "deadlift", "trap_dl", "rdl", "hip_thrust"]);
const PLATES = {
  lb: [[45, "--plate-blue", 30], [35, "--plate-yellow", 27], [25, "--plate-green", 24], [10, "--plate-white", 18], [5, "--plate-black", 15], [2.5, "--plate-black", 12]],
  kg: [[25, "--plate-red", 30], [20, "--plate-blue", 30], [15, "--plate-yellow", 27], [10, "--plate-green", 24], [5, "--plate-white", 18], [2.5, "--plate-black", 14], [1.25, "--plate-black", 11]],
};
const SEED_ROUTINES = [
  { id: "push", name: "Push", items: ["bench", "incline_db", "db_shoulder", "cable_lateral", "pushdown", "oh_ext"] },
  { id: "pull", name: "Pull", items: ["deadlift", "lat_pulldown", "seated_row", "face_pull", "db_curl", "hammer"] },
  { id: "legs", name: "Legs", items: ["squat", "rdl", "leg_press", "leg_curl", "calf_raise", "plank"] },
];
const SET_TYPES = ["n", "w", "d", "f"]; // normal (working), warm-up, drop, failure
const SET_LABEL = { w: "W", d: "D", f: "F" };

/* ================= Helpers ================= */
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (n) => (Math.round((+n || 0) * 100) / 100).toString();
const roundTo = (w, st) => (st > 0 ? Math.round(w / st) * st : w);
const floorTo = (w, st) => (st > 0 ? Math.floor(w / st + 1e-9) * st : w);
const mmss = (sec) => { sec = Math.max(0, Math.round(+sec || 0)); const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60; return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`; };
function parseTime(v) {
  const s = String(v ?? "").trim(); if (!s) return 0;
  if (s.includes(":")) return s.split(":").map((x) => +x || 0).reduce((a, b) => a * 60 + b, 0);
  const n = Math.round(+s.replace(/[^0-9]/g, "")) || 0; // "130" -> 1:30, "90" -> 90s
  return n >= 100 ? Math.floor(n / 100) * 60 + (n % 100) : n;
}
const dateLabel = (iso) => new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
const uid = (p = "w") => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || "x";
const clone = (o) => JSON.parse(JSON.stringify(o));
const lsGet = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const e1rm = (w, r) => (w > 0 && r > 0 && r <= 12 ? w * (1 + r / 30) : 0);

/* ================= State ================= */
function defaults(units = "lb") {
  return { v: 3, units, bar: units === "lb" ? 45 : 20, trapBar: units === "lb" ? 60 : 25, ex: {}, custom: {}, routines: [], next: null, maxes: {}, restOk: 90, restFail: 180, restHeavy: 180, active: null };
}
function normalize(s) {
  const units = s && s.units === "kg" ? "kg" : "lb";
  const d = defaults(units);
  if (!s || typeof s !== "object") return d;
  s = clone(s);
  if (s.lifts && !s.ex) { // first 5×5-only version
    const out = { ...d, bar: s.bar ?? d.bar };
    for (const k of ["squat", "bench", "row", "ohp", "deadlift"]) if (s.lifts[k]) out.ex[k] = { weight: s.lifts[k].weight, fails: s.lifts[k].fails || 0 };
    return out;
  }
  const out = { ...d, ...s, v: 3 };
  out.ex = s.ex && typeof s.ex === "object" ? s.ex : {};
  out.custom = s.custom && typeof s.custom === "object" ? s.custom : {};
  out.routines = Array.isArray(s.routines) ? s.routines.filter((r) => r && r.id && Array.isArray(r.items)) : d.routines;
  out.maxes = s.maxes && typeof s.maxes === "object" ? s.maxes : {};
  if (!out.routines.find((r) => r.id === out.next)) out.next = out.routines[0]?.id || null;
  if (out.active && !Array.isArray(out.active.items)) out.active = null;
  if (out.active) for (const it of out.active.items) { // older versions stored sets as rep counts with one weight per exercise
    if (it.sets.some((x) => typeof x !== "object" || x === null)) {
      const target = (out.ex[it.ex] && out.ex[it.ex].repsMax) || (LIB[it.ex] && LIB[it.ex].repsMax) || 5;
      it.sets = it.sets.map((r) => ({ t: "n", w: it.weight ?? 0, r: typeof r === "number" ? r : target, done: typeof r === "number" }));
    }
    it.note = it.note || "";
  }
  return out;
}
const S = {
  state: null,
  workouts: [],
  days: {},
  ui: { view: "workout", confirm: null, summary: null, chartEx: null, openRoutine: null, openItem: null, picker: null, newEx: null, note: null, msg: "", openDay: null },
};

function load() {
  S.state = normalize(lsGet("pp1.state"));
  S.workouts = lsGet("pp1.workouts") || [];
  S.days = lsGet("pp1.days") || {};
  S.program = lsGet("pp1.program") || sampleProgram(); // replaced by the coach's program once accounts are live
}
let saveTimer = null, storageWarned = false;
function saveState() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { if (!lsSet("pp1.state", S.state)) warnStorage(); }, 150);
}
function saveWorkouts() { if (!lsSet("pp1.workouts", S.workouts)) warnStorage(); }
function saveDays() { if (!lsSet("pp1.days", S.days)) warnStorage(); }
function warnStorage() { if (!storageWarned) { storageWarned = true; toast("Couldn’t save to this device. Make a backup in Setup and free some space."); } }
window.addEventListener("pagehide", () => { clearTimeout(saveTimer); lsSet("pp1.state", S.state); });

/* ================= Exercises ================= */
function meta(id) { return LIB[id] || (S.state.custom[id] ? { track: "wr", ...S.state.custom[id], id } : null); }
function getEx(id) {
  const m = meta(id) || { id, name: id, kind: "machine", muscle: "Other", sets: 3, repsMin: 8, repsMax: 12, track: "wr" };
  const kd = KIND_DEFAULTS[S.state.units][m.kind] || KIND_DEFAULTS[S.state.units].machine;
  let inc = kd.inc;
  if (m.kind === "barbell" && LOWER_BARBELL.has(id)) inc = S.state.units === "lb" ? 10 : 5;
  const barW = m.barW ? S.state.trapBar : S.state.bar;
  const base = { weight: m.kind === "barbell" ? barW : kd.w, inc, sets: m.sets, repsMin: m.repsMin, repsMax: m.repsMax, fails: 0 };
  return { ...m, id, custom: !LIB[id], barWeight: barW, ...base, ...(S.state.ex[id] || {}) };
}
function setEx(id, patch) { S.state.ex[id] = { ...(S.state.ex[id] || {}), ...patch }; }
function smallStep(kind) { const u = S.state.units; return kind === "dumbbell" ? (u === "lb" ? 5 : 2) : u === "lb" ? 5 : 2.5; }
function distUnit(e) { const lb = S.state.units === "lb"; return e.dist === "short" ? (lb ? "yd" : "m") : (lb ? "mi" : "km"); }
function schemeLabel(e) {
  if (e.track === "time") return `${e.sets}× time${e.better === "lower" ? " (faster is better)" : ""}`;
  if (e.track === "dt") return `${e.sets}× distance + time`;
  if (e.track === "wd") return `${e.sets}× carry`;
  return e.repsMin === e.repsMax ? `${e.sets}×${e.repsMax}` : `${e.sets}×${e.repsMin}–${e.repsMax}`;
}
function weightLabel(e, w) {
  const u = S.state.units;
  if (e.track !== "wr" && e.track !== "wd") return "";
  if (e.kind === "bodyweight") return w > 0 ? `BW +${fmt(w)} ${u}` : "Bodyweight";
  if (e.kind === "dumbbell") return `${fmt(w)} ${u} each`;
  return `${fmt(w)} ${u}`;
}
function allMetas() { return [...Object.values(LIB), ...Object.entries(S.state.custom).map(([id, m]) => ({ track: "wr", ...m, id }))]; }
function findEx(q) {
  if (!q) return null;
  const s = String(q).trim(), lo = s.toLowerCase();
  if (meta(s)) return s;
  const all = allMetas();
  return (all.find((m) => m.name.toLowerCase() === lo) || all.find((m) => m.name.toLowerCase().includes(lo)) || all.find((m) => lo.includes(m.name.toLowerCase())))?.id || null;
}
function addCustom(name, kind, muscle, track) {
  name = String(name).trim(); name = name.charAt(0).toUpperCase() + name.slice(1);
  let id = "c_" + slug(name), n = 2;
  while (meta(id)) id = "c_" + slug(name) + "_" + n++;
  const tr = TRACKS[track] ? track : (kind === "cardio" ? "dt" : "wr");
  S.state.custom[id] = { name: name.slice(0, 60), kind: KINDS.includes(kind) ? kind : "machine", muscle: MUSCLES.includes(muscle) ? muscle : "Other", sets: tr === "wr" || tr === "wd" ? 3 : 1, repsMin: tr === "wr" ? 8 : 0, repsMax: tr === "wr" ? 12 : 0, track: tr, ...(tr === "dt" ? { dist: "long", defD: 1, defS: 600 } : tr === "wd" ? { dist: "short", defD: 40 } : tr === "time" ? { better: "higher", defS: 60 } : {}) };
  return id;
}
const routine = (id) => S.state.routines.find((r) => r.id === id) || null;
const findRoutine = (q) => { const k = String(q || "").toLowerCase(); return S.state.routines.find((r) => r.id.toLowerCase() === k || r.name.toLowerCase() === k) || null; };
function nextRoutineAfter(id) { const rs = S.state.routines; const i = rs.findIndex((r) => r.id === id); return rs.length ? rs[(i + 1) % rs.length].id : null; }

/* ================= History helpers ================= */
// Normalizes logged exercises from all versions to { id, name, kind, muscle, track, repsMin, repsMax, note, sets:[{t,w,r,s,d}] }
function wEx(e) {
  const id = e.ex || e.lift; const m = meta(id) || {};
  const base = { id, name: e.name || m.name || id, kind: e.kind || m.kind || "machine", muscle: e.muscle || m.muscle || "Other", track: e.track || m.track || "wr", better: m.better, repsMin: e.repsMin ?? e.reps ?? 5, repsMax: e.repsMax ?? e.reps ?? 5, note: e.note || "" };
  const sets = (e.sets || []).map((x) => (typeof x === "number" ? { t: "n", w: e.weight || 0, r: x } : x)).filter(Boolean);
  return { ...base, sets };
}
const wName = (w) => w.name || (w.type ? `5×5 ${w.type}` : "Workout");
function lastSession(exId, before) {
  for (const w of S.workouts) { if (before && w.date >= before) continue; for (const raw of w.exercises || []) { const e = wEx(raw); if (e.id === exId) return { date: w.date, ...e }; } }
  return null;
}
function setText(e, x) {
  if (!x) return "–";
  if (e.track === "time") return mmss(x.s);
  if (e.track === "dt") return `${fmt(x.d)} ${distUnit(e)} · ${mmss(x.s)}`;
  if (e.track === "wd") return `${fmt(x.w)}×${fmt(x.d)}${distUnit(e)}`;
  return e.kind === "bodyweight" && !(x.w > 0) ? `${x.r} reps` : `${fmt(x.w)}×${x.r}`;
}
function bestOf(e, sets) { // a single comparable score per session, higher is better
  if (e.track === "wr") return Math.max(0, ...sets.filter((x) => x.t !== "w").map((x) => e1rm(x.w, x.r) || (e.kind === "bodyweight" ? x.r : 0)));
  if (e.track === "time") return e.better === "lower" ? -Math.min(...sets.map((x) => x.s || 1e9)) : Math.max(0, ...sets.map((x) => x.s || 0));
  if (e.track === "dt") return Math.max(0, ...sets.map((x) => (x.s > 0 ? x.d / x.s : 0))); // speed
  if (e.track === "wd") return Math.max(0, ...sets.map((x) => (x.w || 0) * (x.d || 0)));
  return 0;
}
function records() {
  const out = {};
  const chron = [...S.workouts].reverse();
  for (const w of chron) for (const raw of w.exercises || []) {
    const e = wEx(raw); if (!e.sets.length) continue;
    const r = out[e.id] || (out[e.id] = { id: e.id, name: e.name, track: e.track, kind: e.kind, better: e.better, dist: (meta(e.id) || {}).dist });
    if (e.track === "wr") {
      for (const x of e.sets) { if (x.t === "w") continue; const v = e1rm(x.w, x.r); if (v > (r.e1 || 0)) { r.e1 = v; r.e1Set = x; r.e1Date = w.date; } if ((x.w || 0) > (r.heavy?.w || 0) || ((x.w || 0) === (r.heavy?.w || 0) && x.r > (r.heavy?.r || 0))) { r.heavy = x; r.heavyDate = w.date; } if (e.kind === "bodyweight" && x.r > (r.reps || 0)) { r.reps = x.r; r.repsDate = w.date; } }
    } else {
      const b = bestOf(e, e.sets);
      if (r.score == null || b > r.score) { r.score = b; r.bestSets = e.sets; r.bestDate = w.date; }
    }
  }
  return out;
}
function recordText(r) {
  const u = S.state.units, e = { track: r.track, kind: r.kind, dist: r.dist };
  if (r.track === "wr") return r.e1 ? `${fmt(Math.round(r.e1))} ${u} est. 1RM · best set ${setText(e, r.e1Set)}` : r.reps ? `${r.reps} reps` : "–";
  if (r.track === "time") return mmss(Math.abs(r.score));
  if (r.track === "dt") { const best = r.bestSets.reduce((a, x) => (x.s > 0 && x.d / x.s > (a ? a.d / a.s : 0) ? x : a), null); return best ? setText(e, best) : "–"; }
  if (r.track === "wd") { const best = r.bestSets.reduce((a, x) => ((x.w || 0) * (x.d || 0) > (a ? a.w * a.d : 0) ? x : a), null); return best ? setText(e, best) : "–"; }
  return "–";
}

/* ================= Workout logic ================= */
function newSet(exId, t, from) {
  const e = getEx(exId), last = from || null;
  const tr = e.track;
  if (tr === "time") return { t, s: last?.s || e.defS || 60, done: false };
  if (tr === "dt") return { t, d: last?.d ?? e.defD ?? 1, s: last?.s || e.defS || 600, done: false };
  if (tr === "wd") return { t, w: last?.w ?? e.weight, d: last?.d ?? e.defD ?? 40, done: false };
  return { t, w: last?.w ?? e.weight, r: last?.r ?? e.repsMax, done: false };
}
function activeEntry(id) {
  const e = getEx(id), prev = lastSession(id);
  const prevWork = prev ? prev.sets.filter((x) => x.t !== "w") : [];
  const sets = [];
  for (let i = 0; i < e.sets; i++) {
    if (e.track === "wr") sets.push(newSet(id, "n"));
    else sets.push(newSet(id, "n", prevWork[i] || prevWork[prevWork.length - 1]));
  }
  return { ex: id, note: "", sets };
}
function startWorkout(rid) {
  const r = rid ? routine(rid) : null;
  S.state.active = { routine: r ? r.id : null, name: r ? r.name : "Freestyle", startedAt: new Date().toISOString(), note: "", restEndsAt: null, items: r ? r.items.filter((id) => meta(id)).map(activeEntry) : [] };
  S.ui.summary = null;
  saveState(); render(); window.scrollTo(0, 0);
}
function warmupSets(it) {
  const e = getEx(it.ex); const work = it.sets.find((x) => x.t === "n");
  const W = work ? work.w : e.weight; const bar = e.barWeight; const st = smallStep(e.kind);
  if (!(W > bar)) return [];
  const plan = [[bar, 10], [W * 0.45, 5], [W * 0.65, 3], [W * 0.85, 2]];
  const out = []; const seen = new Set();
  for (const [w0, r] of plan) {
    const w = Math.max(bar, floorTo(w0, st));
    if (w >= W || seen.has(w)) continue; seen.add(w);
    out.push({ t: "w", w, r, done: false });
  }
  return out;
}
function finishWorkout() {
  const a = S.state.active; if (!a) return;
  const recBefore = records();
  const results = [];
  for (const it of a.items) {
    const e = getEx(it.ex);
    const done = it.sets.filter((x) => x.done);
    if (!done.length) { results.push({ ex: it.ex, name: e.name, skipped: true }); continue; }
    if (e.track !== "wr" || a.prog) { results.push({ ex: it.ex, name: e.name, track: e.track, sets: done, rx: it.rx }); continue; }
    const working = it.sets.filter((x) => x.t === "n" || x.t === "f");
    const doneWork = working.filter((x) => x.done);
    if (!doneWork.length) { results.push({ ex: it.ex, name: e.name, track: "wr", sets: done, outcome: "warmup" }); continue; }
    const topW = Math.max(...doneWork.map((x) => x.w || 0));
    const allTop = working.every((x) => x.done && x.r >= e.repsMax && (x.w || 0) >= topW);
    const anyMiss = working.some((x) => !x.done || x.r < e.repsMin);
    let outcome, next = topW, fails = e.fails || 0;
    if (allTop) { next = e.inc > 0 ? topW + e.inc : topW; fails = 0; outcome = e.inc > 0 ? "up" : "top"; }
    else if (anyMiss) {
      fails += 1;
      if (fails >= 3 && topW > 0) { next = Math.max(e.kind === "barbell" ? e.barWeight : 0, roundTo(topW * 0.9, smallStep(e.kind))); fails = 0; outcome = "deload"; }
      else outcome = "repeat";
    } else { fails = 0; outcome = "build"; }
    setEx(it.ex, { weight: next, fails });
    results.push({ ex: it.ex, name: e.name, kind: e.kind, track: "wr", sets: done, outcome, next, repsMax: e.repsMax });
  }
  const minutes = Math.round((Date.now() - Date.parse(a.startedAt)) / 60000);
  const w = {
    id: uid(), v: 3, date: a.startedAt, name: a.name, routine: a.routine, prog: a.prog || null, minutes, units: S.state.units, note: a.note || "",
    exercises: a.items.filter((it) => it.sets.some((x) => x.done)).map((it) => {
      const e = getEx(it.ex);
      return { ex: it.ex, name: e.name, kind: e.kind, muscle: e.muscle, track: e.track, repsMin: e.repsMin, repsMax: e.repsMax, rx: it.rx || null, group: it.group || null, note: it.note || "", sets: it.sets.filter((x) => x.done).map(({ done, ...x }) => x) };
    }),
  };
  if (w.exercises.length) { S.workouts = [w, ...S.workouts].sort((x, y) => (x.date < y.date ? 1 : -1)); saveWorkouts(); }
  const recAfter = records(); const prs = [];
  for (const ex of w.exercises) {
    const b = recBefore[ex.ex], af = recAfter[ex.ex]; if (!af || !b) continue; // first session isn't a "record"
    if (af.track === "wr" ? (af.e1 || 0) > (b.e1 || 0) + 0.01 || (af.reps || 0) > (b.reps || 0) : (af.score ?? -1e12) > (b.score ?? -1e12) + 1e-9) prs.push(`${ex.name}: ${recordText(af)}`);
  }
  if (a.routine) S.state.next = nextRoutineAfter(a.routine);
  S.state.active = null;
  S.ui.summary = { name: a.name, minutes, results, prs, coach: !!a.prog };
  S.ui.confirm = null;
  releaseWake(); saveState(); render(); window.scrollTo(0, 0);
}

/* ================= Demo videos ================= */
// The gym's YouTube tutorials (youtube.com/@powerplantgym), by exercise. A program item can also carry its own `video` link, which wins.
const GYM_VIDEOS = {
  rdl: "https://www.youtube.com/watch?v=E3hUfnNjE7Y",          // Dumbbell RDL (Romanian Deadlift)
  hip_thrust: "https://www.youtube.com/watch?v=QUjKZj1ynx4",   // Barbell Hip Thrusts: Hinge Your Way to Stronger Glutes
  bulgarian: "https://www.youtube.com/watch?v=mTQ_m34NCoA",    // Rear Foot Elevated (RFE) Split Squat aka Bulgarian Split Squat
  lunge: "https://www.youtube.com/watch?v=X1P5nAEVpkI",        // Dumbbell Walking Lunge
  bench: "https://www.youtube.com/watch?v=UwzZLhkJBRM",        // Bar Path in the Bench Press - "Push Back" for Bigger Lifts!
  pullup: "https://www.youtube.com/watch?v=-JKuHRAH9cw",       // Pull Up Variations
  chinup: "https://www.youtube.com/watch?v=-JKuHRAH9cw",       // Pull Up Variations
  back_ext: "https://www.youtube.com/watch?v=Pwoi4GND-1Q",     // 45-degree Back Hyper Demo
  ohp: "https://www.youtube.com/watch?v=pOZUEGzgMG0",          // Ideal Shoulder Position for Overhead Press
  pushdown: "https://www.youtube.com/watch?v=TfmunxJE_Xc",     // Band Pushdown Demo (band instead of cable)
  plank: "https://www.youtube.com/watch?v=NKVi5HXK1nc",        // Weighted Plank - Uses, Cues, Common Faults
};
function ytId(url) {
  const m = String(url || "").match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}
function videoLinkFor(id) {
  const pr = S.program;
  if (pr) for (const w of pr.weeks) for (const d of w.days) for (const it of d.items) if (it.ex === id && ytId(it.video)) return it.video;
  return GYM_VIDEOS[id] || null;
}
function videoFor(id) { return ytId(videoLinkFor(id)); }
const isShort = (url) => /youtube\.com\/shorts\//.test(String(url || ""));

/* ================= Coach program ================= */
// A program as the coach writes it:
// { id, name, coach, sample?, weeks: [{ note, days: [{ name, note, items: [{ ex, sets, reps, repsMax, time, dist, load: { t: "lb"|"pct"|"rpe"|"none", v }, rest, note, group }] }] }] }
// Consecutive items with the same `group` letter are a superset (2) or circuit (3+): no rest between them, `rest` on the last one runs after each round.
function sampleProgram() {
  const W = [[75, 7], [77.5, 7.5], [80, 8], [70, 6]];
  return { id: "sample-1", sample: true, name: "Strength Foundations", coach: "your coach", weeks: W.map(([p, r], wi) => ({
    note: wi === 0 ? "Learn the movements and find your working weights. Leave 2–3 reps in the tank." : wi === 3 ? "Deload week: lighter weights, crisp reps." : wi === 2 ? "Heaviest week. Rest fully between sets." : "",
    days: [
      { name: "Lower", note: "Brace hard before every squat rep.", items: [
        { ex: "squat", sets: 4, reps: 6, load: { t: "pct", v: p }, rest: 150, note: "Pause 1 second at the bottom of the last set." },
        { ex: "rdl", sets: 3, reps: 8, load: { t: "rpe", v: r }, rest: 120 },
        { ex: "lunge", sets: 3, reps: 10, load: { t: "rpe", v: r }, rest: 90, note: "10 steps per leg." },
        { ex: "plank", sets: 3, time: 45, load: { t: "none" }, rest: 60 } ] },
      { name: "Upper", note: "", items: [
        { ex: "bench", sets: 4, reps: 6, load: { t: "pct", v: p }, rest: 150 },
        { ex: "row", sets: 4, reps: 8, load: { t: "rpe", v: r }, rest: 120, note: "Flat back, pull to your belly button." },
        { ex: "db_shoulder", sets: 3, reps: 10, load: { t: "rpe", v: r }, group: "A" },
        { ex: "face_pull", sets: 3, reps: 15, load: { t: "rpe", v: 7 }, rest: 90, group: "A" } ] },
      { name: "Full body", note: "Keep the pace up: shorter rests today.", items: [
        { ex: "trap_dl", sets: 4, reps: 5, load: { t: "rpe", v: r }, rest: 120 },
        { ex: "incline_db", sets: 3, reps: 10, load: { t: "rpe", v: r }, group: "C" },
        { ex: "lat_pulldown", sets: 3, reps: 10, load: { t: "rpe", v: r }, group: "C" },
        { ex: "farmer", sets: 3, dist: 40, load: { t: "lb", v: 50 }, rest: 90, group: "C", note: "50 lb per hand." } ] },
    ] })) };
}
function program() { return S.program; }
const gkey = (x) => x && (x.group || (x.rx && x.rx.group)) || null;
function groupInfo(items, i) {
  const gid = gkey(items[i]); if (!gid) return null;
  let a0 = i; while (a0 > 0 && gkey(items[a0 - 1]) === gid) a0--;
  let a1 = i; while (a1 < items.length - 1 && gkey(items[a1 + 1]) === gid) a1++;
  if (a0 === a1) return null; // one exercise on its own isn't a group
  return { letter: gid, idx: i - a0 + 1, size: a1 - a0 + 1, last: i === a1, start: a0, end: a1 };
}
function groupRest(items, g) { for (let j = g.end; j >= g.start; j--) { const x = items[j]; const r = x.rx ? x.rx.rest : x.rest; if (r) return r; } return 0; }
function groupHeader(items, g) {
  const r = groupRest(items, g);
  return `<div class="group-hd">${g.size >= 3 ? "Circuit" : "Superset"} ${esc(g.letter)} · ${g.size} exercises back to back${r ? ` · rest ${mmss(r)} after each round` : ""}</div>`;
}
function rxListHTML(items, withInfo) {
  return items.map((it, i) => {
    const g = groupInfo(items, i), name = esc(getEx(it.ex).name);
    const nm = withInfo ? `<button class="ex-name-btn" data-act="info" data-id="${esc(it.ex)}"><span class="n">${name}</span><span class="info-btn" aria-hidden="true">i</span></button>` : `<span class="n">${name}</span>`;
    return (g && g.idx === 1 ? groupHeader(items, g) : "") + `<div class="rx${g ? " grouped" : ""}">${g ? `<span class="glabel">${esc(g.letter)}${g.idx}</span>` : ""}${nm}<span class="s num">${esc(rxText(it, !!g))}</span>${it.note ? `<span class="rx-note">${esc(it.note)}</span>` : ""}</div>`;
  }).join("");
}
const dayKey = (w, d) => `${w}-${d}`;
function programDone(pr) {
  const out = {};
  for (const w of S.workouts) if (w.prog && pr && w.prog.id === pr.id) { const k = dayKey(w.prog.w, w.prog.d); if (!out[k] || out[k] < w.date) out[k] = w.date; }
  return out;
}
function nextDay(pr) {
  if (!pr) return null; const done = programDone(pr);
  for (let w = 0; w < pr.weeks.length; w++) for (let d = 0; d < pr.weeks[w].days.length; d++) if (!done[dayKey(w, d)]) return { w, d };
  return null;
}
function maxFor(id) { const m = S.state.maxes[id]; if (m > 0) return m; const r = records()[id]; return r && r.e1 ? Math.round(r.e1) : 0; }
function rxLoadWeight(it) {
  const e = getEx(it.ex), L = it.load || { t: "none" };
  if (L.t === "lb") return L.v;
  if (L.t === "pct") { const m = maxFor(it.ex); if (m) return Math.max(e.kind === "barbell" ? e.barWeight : 0, roundTo((m * L.v) / 100, smallStep(e.kind))); }
  const prev = lastSession(it.ex); const top = prev ? Math.max(0, ...prev.sets.filter((x) => x.t !== "w").map((x) => x.w || 0)) : 0;
  return top || e.weight;
}
function rxText(it, grouped) {
  const e = getEx(it.ex), u = S.state.units, L = it.load || { t: "none" };
  let base = it.time ? `${it.sets} × ${mmss(it.time)}` : it.dist ? `${it.sets} × ${fmt(it.dist)} ${distUnit(e)}` : `${it.sets} × ${it.reps}${it.repsMax && it.repsMax !== it.reps ? "–" + it.repsMax : ""}`;
  let load = "";
  if (L.t === "lb") load = `${fmt(L.v)} ${u}${e.kind === "dumbbell" ? " each" : ""}`;
  else if (L.t === "pct") { const m = maxFor(it.ex); load = `${fmt(L.v)}% of max${m ? ` ≈ ${fmt(rxLoadWeight(it))} ${u}` : ""}`; }
  else if (L.t === "rpe") load = `RPE ${fmt(L.v)}`;
  return [base, load, it.rest && !grouped ? `rest ${mmss(it.rest)}` : ""].filter(Boolean).join(" · ");
}
function rxEntry(it) {
  const e = getEx(it.ex), w = rxLoadWeight(it), sets = [];
  for (let i = 0; i < (it.sets || 1); i++) {
    if (e.track === "time") sets.push({ t: "n", s: it.time || e.defS || 60, done: false });
    else if (e.track === "dt") sets.push({ t: "n", d: it.dist ?? e.defD ?? 1, s: e.defS || 600, done: false });
    else if (e.track === "wd") sets.push({ t: "n", w, d: it.dist ?? e.defD ?? 40, done: false });
    else sets.push({ t: "n", w, r: it.reps || e.repsMax, done: false });
  }
  return { ex: it.ex, note: "", rx: it, group: it.group || null, sets };
}
function startCoachDay(w, d) {
  const pr = program(); const day = pr && pr.weeks[w] && pr.weeks[w].days[d]; if (!day) return;
  S.state.active = { routine: null, prog: { id: pr.id, w, d }, name: `Week ${w + 1} · ${day.name}`, coachNote: day.note || "", startedAt: new Date().toISOString(), note: "", restEndsAt: null, items: day.items.map(rxEntry) };
  S.ui.summary = null; saveState(); location.hash = "#workout"; render(); window.scrollTo(0, 0);
}
function missingMaxes(day) { return day.items.filter((it) => it.load && it.load.t === "pct" && !maxFor(it.ex)).map((it) => it.ex); }

/* ================= Rest timer ================= */
let beeped = false, wake = null, audioCtx = null;
async function requestWake() { try { if (!wake && navigator.wakeLock) { wake = await navigator.wakeLock.request("screen"); wake.addEventListener("release", () => (wake = null)); } } catch {} }
function releaseWake() { try { wake?.release(); } catch {} wake = null; }
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && S.state.active) requestWake(); });
function beep() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25, 0.5].forEach((t) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(audioCtx.destination);
      g.gain.setValueAtTime(0.0001, audioCtx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.25, audioCtx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + t + 0.18);
      o.start(audioCtx.currentTime + t); o.stop(audioCtx.currentTime + t + 0.2);
    });
  } catch {}
  try { navigator.vibrate?.([200, 100, 200]); } catch {}
}
function startRest(kind, e, rxRest) {
  const a = S.state.active; if (!a) return;
  const heavy = e && e.kind === "barbell" && e.repsMax <= 6;
  const secs = kind === "warm" ? 60 : rxRest ? rxRest : kind === "fail" ? S.state.restFail : heavy ? S.state.restHeavy : S.state.restOk;
  a.restEndsAt = new Date(Date.now() + secs * 1000).toISOString(); a.restFailed = kind === "fail"; beeped = false;
  requestWake();
}
function syncRest() {
  const el = $("#rest"); const a = S.state.active;
  if (!a || !a.restEndsAt) { el.hidden = true; return; }
  const left = (Date.parse(a.restEndsAt) - Date.now()) / 1000, over = left <= 0;
  if (over && !beeped) { beeped = true; beep(); }
  const msg = over ? "Rest is up. Next set." : a.restFailed ? "Below your rep range. Take a longer rest." : "Rest, then go again.";
  el.hidden = false;
  el.innerHTML = `<div class="rest-card${over ? " over" : ""}" role="timer"><span class="t num">${over ? "+" + mmss(-left) : mmss(left)}</span><span class="msg">${msg}</span><button data-act="rest-sub" aria-label="15 seconds less">−15s</button><button data-act="rest-add" aria-label="30 seconds more">+30s</button><button data-act="rest-skip">Dismiss</button></div>`;
}
setInterval(() => { syncRest(); const el = $("#elapsed"); if (el && S.state.active) el.textContent = mmss((Date.now() - Date.parse(S.state.active.startedAt)) / 1000); }, 1000);

/* ================= Rendering: shared ================= */
function header(eyebrow, title, right = "") { return `<div class="topline"><div style="min-width:0"><div class="eyebrow">${eyebrow}</div><h1>${title}</h1></div>${right}</div>`; }
let toastTimer = null;
function toast(text, action) {
  const el = $("#toast"); clearTimeout(toastTimer);
  el.innerHTML = `<span>${esc(text)}</span>${action ? `<button data-act="${action.act}">${esc(action.label)}</button>` : ""}`;
  el.hidden = false;
  if (!action || !action.sticky) toastTimer = setTimeout(() => (el.hidden = true), action ? 8000 : 3500);
}
function platesHTML(e, weight) {
  const u = S.state.units, bar = e.barWeight;
  if (weight < bar) return `<div class="plates">Lighter than the ${fmt(bar)} ${u} bar.</div>`;
  let rem = (weight - bar) / 2; const out = [];
  for (const [w, color, h] of PLATES[u]) while (rem + 1e-6 >= w) { out.push({ w, color, h }); rem -= w; }
  rem = Math.round(rem * 100) / 100;
  const viz = out.map((p) => `<span class="p" style="width:${Math.max(6, Math.round(p.h / 3.2))}px;height:${p.h}px;background:var(${p.color})"></span>`).join("");
  return `<div class="plates"><span class="bar-viz" aria-hidden="true"><span class="sleeve"></span>${viz}</span><span>${out.length ? out.map((p) => fmt(p.w)).join(" + ") + " per side" : "Empty bar"}${rem > 0 ? ` (+${fmt(rem)} ${u} unmatched)` : ""}</span></div>`;
}
function routinePreview(r) {
  const rows = r.items.filter((id) => meta(id)).map((id) => { const e = getEx(id); return `<span class="n">${esc(e.name)}</span><span class="s">${esc(schemeLabel(e).replace(" (faster is better)", ""))}</span><span class="w num">${esc(weightLabel(e, e.weight))}</span>`; }).join("");
  return rows ? `<div class="preview">${rows}</div>` : `<div class="empty">This routine has no exercises yet. Add some in Plan.</div>`;
}

/* ================= Train tab ================= */
function setRowHTML(ei, si, it, e, x, prev, workIdx) {
  const tyLabel = x.t === "n" ? workIdx : SET_LABEL[x.t];
  const miss = x.done && e.track === "wr" && x.t !== "w" && x.r < e.repsMin;
  const inp = (f, val, attrs) => `<input data-f="${f}" data-e="${ei}" data-s="${si}" value="${esc(val)}" ${attrs}>`;
  let cells = "";
  if (e.track === "wr") cells = (e.kind === "bodyweight" ? inp("w", x.w > 0 ? fmt(x.w) : "", `inputmode="decimal" placeholder="+0" aria-label="Added weight"`) : inp("w", fmt(x.w), `inputmode="decimal" aria-label="Weight"`)) + inp("r", x.r ?? "", `inputmode="numeric" aria-label="Reps"`);
  else if (e.track === "time") cells = inp("s", mmss(x.s), `inputmode="numeric" aria-label="Time, minutes:seconds"`);
  else if (e.track === "dt") cells = inp("d", fmt(x.d), `inputmode="decimal" aria-label="Distance in ${distUnit(e)}"`) + inp("s", mmss(x.s), `inputmode="numeric" aria-label="Time"`);
  else if (e.track === "wd") cells = inp("w", fmt(x.w), `inputmode="decimal" aria-label="Weight"`) + inp("d", fmt(x.d), `inputmode="decimal" aria-label="Distance in ${distUnit(e)}"`);
  return `<div class="setrow${x.done ? " done" : ""}${miss ? " miss" : ""}">
    <button class="ty ${x.t}" data-act="set-type" data-e="${ei}" data-s="${si}" aria-label="Set type: ${{ n: "working", w: "warm-up", d: "drop set", f: "to failure" }[x.t]}. Tap to change.">${tyLabel}</button>
    <span class="prev" title="Last time">${esc(prev ? setText(e, prev) : "–")}</span>
    ${cells}
    <button class="ck" data-act="set-done" data-e="${ei}" data-s="${si}" aria-label="${x.done ? "Mark not done" : "Mark done"}" aria-pressed="${!!x.done}">✓</button>
  </div>`;
}
function renderWorkout() {
  const st = S.state;
  if (S.ui.summary) return renderSummary();
  const a = st.active;
  if (!a) {
    const pr = program(), nd = nextDay(pr);
    let coachPanel = "";
    if (pr && nd) {
      const day = pr.weeks[nd.w].days[nd.d], wk = pr.weeks[nd.w], miss = missingMaxes(day);
      coachPanel = `<section class="panel coach-day">
        <div class="row"><div class="grow"><div class="eyebrow">From ${esc(pr.coach)} · Week ${nd.w + 1} of ${pr.weeks.length}</div><h2>${esc(day.name)}</h2></div>${pr.sample ? '<span class="pill">Sample</span>' : ""}</div>
        ${wk.note && nd.d === 0 ? `<div class="coach-note">${esc(wk.note)}</div>` : ""}
        ${day.note ? `<div class="coach-note">${esc(day.note)}</div>` : ""}
        <div class="rx-list">${rxListHTML(day.items, false)}</div>
        ${miss.length ? `<div class="msg action" style="align-self:stretch"><span>Some loads are a % of your max. Add your max for ${miss.map((id) => esc(getEx(id).name)).join(", ")} in <a href="#setup">Profile</a>, or pick a weight as you go.</span></div>` : ""}
        <button class="btn primary" data-act="start-day" data-w="${nd.w}" data-d="${nd.d}">Start ${esc(day.name)}</button>
        <a class="btn ghost" href="#program" style="text-decoration:none">See the full program</a>
      </section>`;
    } else if (pr) coachPanel = `<section class="panel"><h2>Program complete</h2><span class="sub">You finished ${esc(pr.name)}. Your coach will send your next program.</span></section>`;
    else coachPanel = `<section class="panel"><h2>No program yet</h2><span class="sub">When your coach assigns you a program, your next workout shows up here.</span></section>`;
    const sel = routine(S.ui.pickRoutine) || routine(st.next) || st.routines[0];
    const chips = st.routines.map((r) => `<button class="chip" data-act="pick" data-r="${esc(r.id)}" aria-pressed="${!!sel && r.id === sel.id}">${esc(r.name)}${r.id === st.next ? '<span class="nx">• next</span>' : ""}</button>`).join("");
    const last = S.workouts[0];
    return `${header(last ? `Last session: ${esc(wName(last))}, ${dateLabel(last.date)}` : "Ready when you are", "Today")}
      ${coachPanel}
      <h2>Your own workouts</h2>
      <section class="panel">
        ${chips ? `<div class="chips" role="group" aria-label="Routine">${chips}</div>` : ""}
        ${sel ? routinePreview(sel) : `<div class="empty">You haven’t made any routines. Build one in <a href="#plan">Routines</a>, or start an empty workout and add exercises as you go.</div>`}
        ${sel ? `<button class="btn primary" data-act="start" data-r="${esc(sel.id)}">Start ${esc(sel.name)}</button>` : ""}
        <button class="btn ghost" data-act="start-free">Start an empty workout</button>
      </section>
      <p class="note">Each row is one set. The “Last” column shows what you did last time. Adjust the numbers if needed and tap ✓ when the set is done. Tap the set number to mark it as a warm-up (W), drop set (D) or set to failure (F). In your own routines, hit the top of the rep range on every working set and the weight goes up next time. In your coach’s program, your coach sets the weights.</p>`;
  }
  const blocks = a.items.map((it, ei) => {
    const g = groupInfo(a.items, ei), linked = !!(a.items[ei + 1] && it.group && a.items[ei + 1].group === it.group);
    const e = getEx(it.ex), prev = lastSession(it.ex);
    const prevWork = prev ? prev.sets.filter((x) => x.t !== "w") : [], prevWarm = prev ? prev.sets.filter((x) => x.t === "w") : [];
    let wi = 0, wu = 0, ni = 0;
    const rows = it.sets.map((x, si) => { const p = x.t === "w" ? prevWarm[wu++] : prevWork[ni++]; if (x.t === "n") wi++; return setRowHTML(ei, si, it, e, x, p, wi); }).join("");
    const cols = e.track === "time" ? 1 : 2;
    const heads = e.track === "wr" ? [e.kind === "bodyweight" ? "+" + S.state.units : S.state.units, "Reps"] : e.track === "time" ? ["Time"] : e.track === "dt" ? [distUnit(e), "Time"] : [S.state.units, distUnit(e)];
    const topW = Math.max(0, ...it.sets.filter((x) => x.t === "n").map((x) => x.w || 0));
    const confirmRemove = S.ui.confirm === "rm:" + ei;
    const noteOpen = S.ui.note === ei || it.note;
    return `${g && g.idx === 1 ? groupHeader(a.items, g) : ""}<section class="ex${g ? " grouped" : ""}">
      <div class="ex-head"><div><div class="kind">${g ? `<span class="glabel">${esc(g.letter)}${g.idx}</span> ` : ""}${esc(e.muscle)} · ${esc(e.kind)}</div><button class="ex-name-btn" data-act="info" data-id="${esc(it.ex)}" aria-label="How to do ${esc(e.name)}"><span class="ex-name">${esc(e.name)}</span><span class="info-btn" aria-hidden="true">i</span></button>
        ${it.rx ? `<div class="ex-scheme rx-line">Coach: ${esc(rxText(it.rx, !!g))}</div>${it.rx.note ? `<div class="rx-note">${esc(it.rx.note)}</div>` : ""}` : `<div class="ex-scheme">${esc(schemeLabel(e))}${e.track === "wr" ? " reps" : ""}${e.fails ? ` · <span style="color:var(--warn)">${e.fails} prior miss${e.fails > 1 ? "es" : ""}</span>` : ""}</div>`}</div>
        ${e.track === "wr" && e.kind !== "bodyweight" ? `<span class="weight-btn num" style="border:0">${fmt(topW)}<small>${S.state.units}${e.kind === "dumbbell" ? " ea" : ""}</small></span>` : ""}</div>
      <div class="setrows" style="--cols:${cols}">
        <div class="sethead"><span>Set</span><span>Last</span>${heads.map((h) => `<span style="text-align:center">${esc(h)}</span>`).join("")}<span>Done</span></div>
        ${rows}
      </div>
      ${e.kind === "barbell" && e.track === "wr" && topW ? platesHTML(e, topW) : ""}
      ${noteOpen ? `<textarea class="ex-note" data-note="${ei}" rows="1" placeholder="Note for this exercise (how it felt, form cues, pain)…" aria-label="Note for ${esc(e.name)}">${esc(it.note)}</textarea>` : ""}
      <div class="ex-tools">${confirmRemove
        ? `<span class="sub grow">Remove from this workout?</span><button class="btn small ghost" data-act="confirm-no">Keep</button><button class="btn small danger" data-act="rm-yes" data-i="${ei}">Remove</button>`
        : `<button class="btn small ghost" data-act="set-add" data-i="${ei}">+ Set</button><button class="btn small ghost" data-act="set-rm" data-i="${ei}" ${it.sets.length <= 1 ? "disabled" : ""}>− Set</button>${e.kind === "barbell" && e.track === "wr" && !it.sets.some((x) => x.t === "w") ? `<button class="btn small ghost" data-act="warmups" data-i="${ei}">Warm-ups</button>` : ""}${noteOpen ? "" : `<button class="btn small ghost" data-act="note" data-i="${ei}">Note</button>`}${!it.rx && a.items[ei + 1] && !a.items[ei + 1].rx ? `<button class="btn small ghost" data-act="link" data-i="${ei}">${linked ? "Unlink" : "Superset ↓"}</button>` : ""}${ei > 0 ? `<button class="icon-btn" data-act="a-up" data-i="${ei}" aria-label="Move up">▲</button>` : ""}<span class="grow"></span><button class="btn small ghost" data-act="rm" data-i="${ei}">Remove</button>`}</div>
    </section>`;
  }).join("");
  const confirm = S.ui.confirm === "cancel"
    ? `<div class="panel"><b>Discard this workout?</b><span class="sub">Nothing from this session will be saved and your weights stay as they were.</span><div class="row end"><button class="btn ghost" data-act="confirm-no">Keep going</button><button class="btn danger" data-act="cancel-yes">Discard</button></div></div>`
    : S.ui.confirm === "finish"
    ? `<div class="panel"><b>Finish with unchecked sets?</b><span class="sub">Unchecked working sets on exercises you started count as missed. Exercises with no checked sets are skipped.</span><div class="row end"><button class="btn ghost" data-act="confirm-no">Back</button><button class="btn primary" data-act="finish-yes">Finish</button></div></div>`
    : "";
  return `${header(`In progress · <span id="elapsed" class="num">${mmss((Date.now() - Date.parse(a.startedAt)) / 1000)}</span>`, esc(a.name))}
    ${a.coachNote ? `<div class="coach-note">${esc(a.coachNote)}</div>` : ""}
    ${blocks || `<div class="empty">No exercises yet. Add your first one below.</div>`}
    <button class="btn wide" data-act="add-ex" data-target="active">+ Add exercise</button>
    <textarea class="ex-note" data-wnote="1" rows="2" placeholder="${a.prog ? "Note for your coach: how it felt, anything that hurt, questions…" : "Workout note: sleep, energy, anything worth remembering…"}" aria-label="Workout note">${esc(a.note)}</textarea>
    ${confirm}
    <div class="row"><button class="btn ghost" data-act="cancel">Discard</button><span class="grow"></span><button class="btn primary" data-act="finish">Finish workout</button></div>`;
}
function renderSummary() {
  const sm = S.ui.summary;
  const lines = sm.results.map((r) => {
    if (r.skipped) return `<div class="line"><span>${esc(r.name)}</span><span class="pill">Skipped</span></div>`;
    const e = getEx(r.ex);
    const sets = r.sets.map((x) => setText(e, x)).join(", ");
    let pill = "";
    if (r.rx) pill = `<span class="pill">Coach: ${esc(rxText(r.rx))}</span>`;
    else if (r.track === "wr") pill = r.outcome === "up" ? `<span class="pill good">Next: ${esc(weightLabel(e, r.next))}</span>`
      : r.outcome === "top" ? `<span class="pill good">Top of range. Add reps or load</span>`
      : r.outcome === "build" ? `<span class="pill">Same weight, chase ${r.repsMax}s</span>`
      : r.outcome === "deload" ? `<span class="pill warn">Deload to ${esc(weightLabel(e, r.next))}</span>`
      : r.outcome === "repeat" ? `<span class="pill warn">Repeat ${esc(weightLabel(e, r.next))}</span>` : `<span class="pill">Warm-ups only</span>`;
    return `<div class="line"><span><b>${esc(r.name)}</b><br><span class="sub num">${esc(sets)}</span></span>${pill}</div>`;
  }).join("");
  const prs = sm.prs.length ? `<section class="panel"><h2>New records</h2>${sm.prs.map((p) => `<div class="row"><span class="pr">PR</span><span>${esc(p)}</span></div>`).join("")}</section>` : "";
  return `${header(`Done in ${sm.minutes} min`, `${esc(sm.name)} logged`)}
    ${prs}
    <section class="panel summary"><h2>Results</h2>${lines}</section>
    ${sm.coach ? `<p class="note">Saved to your program. Once Power Plant accounts are live, your coach sees this workout and your notes automatically.</p>` : ""}
    <div class="row end"><button class="btn primary" data-act="summary-done">Done</button></div>`;
}

/* ================= Program tab ================= */
function renderProgram() {
  const pr = program();
  if (!pr) return `${header("From your coach", "Program")}<div class="empty">No program yet. When your coach assigns you one, it shows up here.</div>`;
  const done = programDone(pr), nd = nextDay(pr);
  const total = pr.weeks.reduce((n, w) => n + w.days.length, 0), finished = Object.keys(done).length;
  const weeks = pr.weeks.map((wk, w) => `<section class="panel"><div class="row"><h2 class="grow">Week ${w + 1}</h2><span class="sub num">${wk.days.filter((_, d) => done[dayKey(w, d)]).length}/${wk.days.length} done</span></div>
    ${wk.note ? `<div class="coach-note">${esc(wk.note)}</div>` : ""}
    ${wk.days.map((day, d) => {
      const k = dayKey(w, d), isNext = nd && nd.w === w && nd.d === d, open = S.ui.openDay === k;
      const status = done[k] ? `<span class="pill good">Done ${dateLabel(done[k]).replace(/^\w+, /, "")}</span>` : isNext ? `<span class="pill good">Next</span>` : "";
      return `<div class="pday"><button class="pday-hd" data-act="open-day" data-k="${k}" aria-expanded="${open}"><b class="grow">${esc(day.name)}</b>${status}<span class="sub">${day.items.length} exercises</span><span class="sub" aria-hidden="true">${open ? "▴" : "▾"}</span></button>
        ${open ? `<div class="pday-body">${day.note ? `<div class="coach-note">${esc(day.note)}</div>` : ""}<div class="rx-list">${rxListHTML(day.items, true)}</div>
          ${S.state.active ? `<span class="note">Finish your current workout before starting another.</span>` : `<button class="btn ${done[k] ? "" : "primary"}" data-act="start-day" data-w="${w}" data-d="${d}">${done[k] ? "Do it again" : "Start this workout"}</button>`}</div>` : ""}
      </div>`;
    }).join("")}</section>`).join("");
  return `${header(`From ${esc(pr.coach)} · ${finished} of ${total} workouts done`, esc(pr.name))}
    ${pr.sample ? `<div class="msg action" style="align-self:stretch"><span>This is a sample program so you can try the app. Your coach’s real program will replace it once accounts are live.</span></div>` : ""}
    <div class="bars" style="grid-template-columns:minmax(0,1fr)"><span class="track"><span class="fill" style="display:block;width:${(finished / total) * 100}%"></span></span></div>
    ${weeks}
    <p class="note"><b>How to read it:</b> “4 × 6” means 4 sets of 6 reps. “75% of max” is a percentage of your one-rep max (set yours in Profile). “RPE 8” means pick a weight that leaves about 2 reps in the tank (10 = nothing left).</p>`;
}

/* ================= Routines tab ================= */
function renderPlan() {
  const st = S.state, u = st.units;
  const cards = st.routines.map((r, ri) => {
    const open = S.ui.openRoutine === r.id;
    let body = "";
    if (open) {
      const items = r.items.map((id, ii) => {
        const e = getEx(id), key = r.id + ":" + ii, ed = S.ui.openItem === key;
        const f = (lbl, fld, val, attrs = 'inputmode="numeric"') => `<label>${lbl}<input type="text" ${attrs} id="f-${fld}-${key}" value="${esc(val)}" data-exf="${fld}" data-id="${esc(id)}"></label>`;
        const fields = !ed ? "" : `<div class="grid-fields">
          ${f("Sets", "sets", e.sets)}
          ${e.track === "wr" ? f("Min reps", "repsMin", e.repsMin) + f("Max reps", "repsMax", e.repsMax) : ""}
          ${e.track === "wr" || e.track === "wd" ? f(`${e.kind === "bodyweight" ? "Added" : "Weight"} (${u}${e.kind === "dumbbell" ? " each" : ""})`, "weight", fmt(e.weight), 'inputmode="decimal"') : ""}
          ${e.track === "wr" ? f(`Add after success (${u})`, "inc", fmt(e.inc), 'inputmode="decimal"') : ""}
        </div><span class="note">These settings apply to ${esc(e.name)} in every routine.</span>`;
        return `<div class="item"><div class="top">
          <button class="name" data-act="item-open" data-key="${esc(key)}" aria-expanded="${ed}"><b>${esc(e.name)}</b><span class="sub">${esc(schemeLabel(e))}${weightLabel(e, e.weight) ? " · " + esc(weightLabel(e, e.weight)) : ""}</span></button>
          <button class="info-btn" data-act="info" data-id="${esc(id)}" aria-label="How to do ${esc(e.name)}">i</button>
          <button class="icon-btn" data-act="item-up" data-r="${esc(r.id)}" data-i="${ii}" aria-label="Move up" ${ii === 0 ? "disabled" : ""}>▲</button>
          <button class="icon-btn" data-act="item-down" data-r="${esc(r.id)}" data-i="${ii}" aria-label="Move down" ${ii === r.items.length - 1 ? "disabled" : ""}>▼</button>
          <button class="icon-btn" data-act="item-rm" data-r="${esc(r.id)}" data-i="${ii}" aria-label="Remove ${esc(e.name)}">✕</button>
        </div>${fields}</div>`;
      }).join("");
      const confirmDel = S.ui.confirm === "rdel:" + r.id;
      body = `<div class="body">
        <label class="sub" for="rn-${esc(r.id)}">Routine name</label>
        <input class="text-in" id="rn-${esc(r.id)}" value="${esc(r.name)}" data-rname="${esc(r.id)}">
        ${items || `<div class="empty">No exercises yet.</div>`}
        <button class="btn" data-act="add-ex" data-target="routine:${esc(r.id)}">+ Add exercise</button>
        <div class="row">${confirmDel
          ? `<span class="sub grow">Delete “${esc(r.name)}”? Your logged workouts are kept.</span><button class="btn small ghost" data-act="confirm-no">Keep</button><button class="btn small danger" data-act="rdel-yes" data-r="${esc(r.id)}">Delete</button>`
          : `<button class="btn small ghost" data-act="r-up" data-i="${ri}" ${ri === 0 ? "disabled" : ""}>Move earlier</button><span class="grow"></span><button class="btn small ghost danger" data-act="rdel" data-r="${esc(r.id)}">Delete routine</button>`}</div>
      </div>`;
    }
    return `<section class="routine"><button class="hd" data-act="r-open" data-r="${esc(r.id)}" aria-expanded="${open}"><b class="grow">${esc(r.name)}</b>${r.id === st.next ? '<span class="pill good">Next</span>' : ""}<span class="sub">${r.items.length} exercise${r.items.length === 1 ? "" : "s"}</span><span class="sub" aria-hidden="true">${open ? "▴" : "▾"}</span></button>${body}</section>`;
  }).join("");
  return `${header("Workouts you build yourself", "Routines")}
    ${cards || `<div class="empty">No routines yet.</div>`}
    <div class="row"><button class="btn" data-act="r-new">+ New routine</button><span class="grow"></span></div>
    <p class="note">For weight-and-reps exercises, the first number of the rep range is the floor and the second is the target. Hit the target on every working set and the weight goes up by the amount you set.</p>`;
}

/* ================= Exercise picker ================= */
function openPicker(target) { S.ui.picker = { target, q: "" }; S.ui.newEx = null; renderSheet(); setTimeout(() => $("#pick-q")?.focus(), 30); }
function closePicker() { S.ui.picker = null; S.ui.newEx = null; renderSheet(); }
function openInfo(id) { S.ui.info = id; renderSheet(); }
function closeInfo() { S.ui.info = null; renderSheet(); }
function renderInfo(id) {
  const e = getEx(id), g = window.LiftGuide ? window.LiftGuide.info(id) : null, builtIn = !e.custom;
  const list = (tag, xs) => `<${tag}>${xs.map((x) => `<li>${esc(x)}</li>`).join("")}</${tag}>`;
  const body = g ? `
      ${g.m ? `<div class="muscles"><span class="pill good">Works: ${esc(g.m[0])}</span>${g.m[1] ? `<span class="pill">Also: ${esc(g.m[1])}</span>` : ""}</div>` : ""}
      ${g.n ? `<div class="msg action" style="align-self:stretch">${esc(g.n)}</div>` : ""}
      <section><h3>How to do it</h3>${list("ol", g.s)}</section>
      <section><h3>Form cues</h3>${list("ul", g.c)}</section>
      <section><h3>Common mistakes</h3>${list("ul", g.x)}</section>
      <p class="note">General guidance, not medical advice. Stop if something hurts sharply, and get a coach or physical therapist to check your form if you’re unsure.</p>`
    : `<div class="empty">There’s no guide for this exercise yet. Custom exercises don’t come with one. You can keep your own cues in the exercise’s workout notes.</div>`;
  return `<div class="sheet-wrap" data-act="sheet-bg"><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(e.name)} guide">
    <div class="row"><div class="grow"><div class="kind">${esc(e.muscle)} · ${esc(e.kind)}</div><h2>${esc(e.name)}</h2></div><button class="btn small ghost" data-act="info-close">${S.ui.picker ? "Back" : "Close"}</button></div>
    <div class="guide">${videoFor(id) ? `<div class="guide-video yt${isShort(videoLinkFor(id)) ? " vertical" : ""}"><iframe src="https://www.youtube-nocookie.com/embed/${videoFor(id)}?rel=0&playsinline=1&modestbranding=1" title="${esc(e.name)} video from Power Plant Gym" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe></div>` : builtIn ? `<div class="guide-video"><video id="guide-video" src="videos/${esc(id)}.mp4" autoplay muted loop playsinline preload="metadata" aria-label="${esc(e.name)} demonstration video"></video><div class="video-soon" id="video-soon" hidden><b>Video demo coming soon</b><span>A coach-recorded video of this exercise is on the way. Follow the steps below until then.</span></div></div>` : ""}${body}</div>
  </div></div>`;
}
function renderSheet() {
  const host = $("#sheet"); const p = S.ui.picker;
  if (S.ui.info) {
    host.innerHTML = renderInfo(S.ui.info);
    const v = $("#guide-video");
    if (v) {
      v.addEventListener("error", () => { v.hidden = true; const s = $("#video-soon"); if (s) s.hidden = false; }, { once: true });
      v.addEventListener("loadeddata", () => v.play().catch(() => {}), { once: true });
      v.addEventListener("click", () => (v.paused ? v.play().catch(() => {}) : v.pause()));
    }
    return;
  }
  if (!p) { host.innerHTML = ""; return; }
  if (!$("#pick-q")) host.innerHTML = `<div class="sheet-wrap" data-act="sheet-bg"><div class="sheet" role="dialog" aria-modal="true" aria-label="Add exercise">
      <div class="row"><h2 class="grow">Add exercise</h2><button class="btn small ghost" data-act="sheet-close">Close</button></div>
      <input type="search" id="pick-q" placeholder="Search, or type a new exercise name" autocomplete="off" aria-label="Search exercises">
      <div class="list" id="pick-list"></div></div></div>`;
  const q = $("#pick-q"); if (q && q.value !== p.q) q.value = p.q;
  renderPickList();
}
function renderPickList() {
  const p = S.ui.picker; if (!p) return;
  const q = p.q.trim().toLowerCase(); const all = allMetas();
  const hits = all.filter((m) => !q || m.name.toLowerCase().includes(q) || m.muscle.toLowerCase().includes(q) || m.kind.includes(q));
  const groups = {}; for (const m of hits) (groups[m.muscle] = groups[m.muscle] || []).push(m);
  let html = "";
  for (const mu of MUSCLES) if (groups[mu]) html += `<div class="grp">${esc(mu)}</div>` + groups[mu].map((m) => `<div class="pickrow"><button class="pick" data-act="pick-ex" data-id="${esc(m.id)}"><span>${esc(m.name)}</span><span class="kind">${esc(m.track === "wr" ? m.kind : TRACKS[m.track])}</span></button><button class="info-btn" data-act="info" data-id="${esc(m.id)}" aria-label="How to do ${esc(m.name)}">i</button></div>`).join("");
  if (q && !all.some((m) => m.name.toLowerCase() === q)) {
    const ne = S.ui.newEx || { kind: "machine", muscle: "Other", track: "wr" };
    html += `<div class="grp">Create “${esc(p.q.trim())}”</div><div class="grid-fields">
      <label>Equipment<select id="ne-kind">${KINDS.map((k) => `<option ${k === ne.kind ? "selected" : ""}>${k}</option>`).join("")}</select></label>
      <label>Muscle<select id="ne-muscle">${MUSCLES.map((k) => `<option ${k === ne.muscle ? "selected" : ""}>${k}</option>`).join("")}</select></label>
      <label>Track<select id="ne-track">${Object.entries(TRACKS).map(([k, v]) => `<option value="${k}" ${k === ne.track ? "selected" : ""}>${v}</option>`).join("")}</select></label>
      <label>&nbsp;<button class="btn small" data-act="pick-new">Create and add</button></label></div>`;
  }
  $("#pick-list").innerHTML = html || `<div class="empty">Type a name to create a new exercise.</div>`;
}
function addExerciseTo(target, id) {
  if (target === "active" && S.state.active) S.state.active.items.push(activeEntry(id));
  else if (target.startsWith("routine:")) { const r = routine(target.slice(8)); if (r) r.items.push(id); }
  saveState();
}

/* ================= Progress tab ================= */
function sessionPoints(exId) {
  const pts = [];
  for (const w of S.workouts) for (const raw of w.exercises || []) {
    const e = wEx(raw); if (e.id !== exId || !e.sets.length) continue;
    const v = e.track === "wr" ? (e.kind === "bodyweight" && !e.sets.some((x) => x.w > 0) ? Math.max(...e.sets.map((x) => x.r || 0)) : Math.max(0, ...e.sets.filter((x) => x.t !== "w").map((x) => e1rm(x.w, x.r))))
      : e.track === "time" ? (e.better === "lower" ? Math.min(...e.sets.map((x) => x.s || 1e9)) : Math.max(...e.sets.map((x) => x.s || 0)))
      : e.track === "dt" ? Math.max(...e.sets.map((x) => x.d || 0)) : Math.max(...e.sets.map((x) => x.w || 0));
    if (v > 0 && v < 1e9) pts.push({ t: Date.parse(w.date), v });
  }
  return pts.sort((a, b) => a.t - b.t);
}
function lineChart(pts, opts) {
  const W = 600, H = 230, L = 70, R = 16, T = 14, B = 34;
  let lo = Math.min(...pts.map((p) => p.v)), hi = Math.max(...pts.map((p) => p.v));
  const pad = (hi - lo) * 0.1 || Math.max(1, hi * 0.05); lo = Math.max(0, lo - pad); hi = hi + pad;
  const t0 = pts[0].t, t1 = pts[pts.length - 1].t;
  const x = (t) => L + ((t - t0) / Math.max(1, t1 - t0)) * (W - L - R), y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const ticks = [lo, (lo + hi) / 2, hi];
  const lab = opts.time ? (v) => mmss(v) : (v) => fmt(Math.round(v));
  const grid = ticks.map((v) => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${L - 8}" y="${y(v) + 7}" text-anchor="end" font-size="20" fill="var(--muted)" font-family="IBM Plex Mono, monospace">${lab(v)}</text>`).join("");
  const path = pts.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join("");
  const d = (t) => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label)}">${grid}
    <path d="${path}L${x(t1)},${H - B}L${x(t0)},${H - B}Z" fill="var(--accent)" opacity="0.1"/><path d="${path}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round"/>
    ${pts.map((p, i) => `<circle cx="${x(p.t).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="${i === pts.length - 1 ? 6 : 4}" fill="var(--accent)"><title>${d(p.t)}: ${lab(p.v)}</title></circle>`).join("")}
    <text x="${L}" y="${H - 8}" font-size="20" fill="var(--muted)" font-family="IBM Plex Sans, sans-serif">${d(t0)}</text>
    <text x="${W - R}" y="${H - 8}" font-size="20" text-anchor="end" fill="var(--muted)" font-family="IBM Plex Sans, sans-serif">${d(t1)}</text></svg>`;
}
function weeklySets() {
  const since = Date.now() - 7 * 864e5, m = {};
  for (const w of S.workouts) { if (Date.parse(w.date) < since) continue; for (const raw of w.exercises || []) { const e = wEx(raw); if (e.track !== "wr") continue; m[e.muscle] = (m[e.muscle] || 0) + e.sets.filter((x) => x.t !== "w" && x.r > 0).length; } }
  return m;
}
function renderHistory() {
  const u = S.state.units;
  const logged = new Map();
  for (const w of S.workouts) for (const raw of w.exercises || []) { const e = wEx(raw); if (!logged.has(e.id)) logged.set(e.id, e.name); }
  if (!S.ui.chartEx || !logged.has(S.ui.chartEx)) S.ui.chartEx = logged.keys().next().value || null;
  const opts = [...logged.entries()].map(([id, n]) => `<option value="${esc(id)}" ${id === S.ui.chartEx ? "selected" : ""}>${esc(n)}</option>`).join("");
  const ce = S.ui.chartEx ? (meta(S.ui.chartEx) ? getEx(S.ui.chartEx) : wEx({ ex: S.ui.chartEx })) : null;
  const pts = S.ui.chartEx ? sessionPoints(S.ui.chartEx) : [];
  const chartLabel = !ce ? "" : ce.track === "wr" ? (ce.kind === "bodyweight" ? "Best set (reps)" : `Estimated 1-rep max (${u})`) : ce.track === "time" ? "Best time" : ce.track === "dt" ? `Distance (${distUnit(ce)})` : `Heaviest carry (${u})`;
  const ws = weeklySets(), wsMax = Math.max(10, ...Object.values(ws));
  const bars = Object.entries(ws).sort((a, b) => b[1] - a[1]).map(([mu, n]) => `<span>${esc(mu)}</span><span class="track"><span class="fill" style="display:block;width:${(n / wsMax) * 100}%"></span></span><b class="num">${n}</b>`).join("");
  const rec = Object.values(records()).sort((a, b) => a.name.localeCompare(b.name));
  const recHTML = rec.map((r) => `<div class="rec"><span class="nm">${esc(r.name)}</span><span class="sub">${dateLabel(r.e1Date || r.repsDate || r.bestDate || Date.now()).replace(/^\w+, /, "")}</span><b class="num">${esc(recordText(r))}</b></div>`).join("");
  const items = S.workouts.slice(0, 60).map((w) => {
    const lines = (w.exercises || []).map((raw) => {
      const e = wEx(raw);
      const sets = e.sets.map((x) => { const t = setText(e, x); return x.t === "w" ? `<span class="sub">${esc(t)}</span>` : e.track === "wr" && x.r < e.repsMin ? `<span class="x">${esc(t)}</span>` : esc(t); }).join(", ");
      return `<div class="log-line" style="grid-template-columns:minmax(0,1fr)"><span><b>${esc(e.name)}</b> <span class="reps">${sets}</span>${e.note ? `<br><span class="sub">“${esc(e.note)}”</span>` : ""}</span></div>`;
    }).join("");
    const confirming = S.ui.confirm === "del:" + w.id;
    return `<div class="log-item"><div class="hd"><b>${esc(wName(w))}</b><span class="sub">${dateLabel(w.date)}${w.minutes ? ` · ${w.minutes} min` : ""}</span></div>${lines}${w.note ? `<span class="sub">Note: ${esc(w.note)}</span>` : ""}
      <div class="row end">${confirming ? `<span class="sub grow">Delete this entry? Weights won’t change.</span><button class="btn small ghost" data-act="confirm-no">Keep</button><button class="btn small danger" data-act="del-yes" data-id="${esc(w.id)}">Delete</button>` : `<button class="btn small ghost" data-act="del" data-id="${esc(w.id)}">Delete</button>`}</div></div>`;
  }).join("");
  return `${header(`${S.workouts.length} workout${S.workouts.length === 1 ? "" : "s"} logged`, "Progress")}
    <section class="panel"><h2>Last 7 days</h2>
      ${bars ? `<div class="bars">${bars}</div><span class="note">Working sets per muscle group. Many lifters aim for about 10–20 a week for each muscle they want to grow.</span>` : `<div class="empty">No sets in the last 7 days.</div>`}</section>
    <section class="panel"><div class="row"><h2 class="grow">By exercise</h2>${opts ? `<select class="select" id="chart-ex" aria-label="Exercise">${opts}</select>` : ""}</div>
      ${ce ? `<span class="sub">${esc(chartLabel)}</span>` : ""}
      ${pts.length >= 2 ? lineChart(pts, { time: ce.track === "time", label: chartLabel }) : `<div class="empty">${pts.length ? "One session logged. The chart appears after your second." : "Finish a workout to start charting."}</div>`}</section>
    <section class="panel"><h2>Records</h2>${recHTML ? `<div class="records">${recHTML}</div><span class="note">Estimated 1-rep max uses the Epley formula on your best working set of 12 reps or fewer.</span>` : `<div class="empty">Your best lifts show up here.</div>`}</section>
    ${renderBodyPanel()}
    <h2>Log</h2>
    <div class="log">${items || `<div class="empty">Finish your first workout and it shows up here.</div>`}</div>`;
}

/* ================= Food (Lose It file import) and bodyweight ================= */
const NUM = (v) => { const n = parseFloat(String(v ?? "").replace(/[^0-9.\-]/g, "")); return isFinite(n) ? n : 0; };
function parseCSV(text) {
  const rows = []; let row = [], f = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(f); rows.push(row); row = []; f = ""; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}
function toISODate(s) {
  s = String(s || "").trim(); let m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/))) { let y = m[3]; if (y.length === 2) y = "20" + y; return `${y}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`; }
  const d = new Date(s); return isNaN(d) ? null : d.toISOString().slice(0, 10);
}
function colIdx(headers, ...names) {
  const h = headers.map((x) => x.toLowerCase().replace(/^﻿/, "").trim());
  for (const n of names) { const i = h.findIndex((x) => x === n || x.startsWith(n + " ") || x.startsWith(n + "(")); if (i >= 0) return i; }
  return -1;
}
function ingestCSV(name, text, out) {
  const rows = parseCSV(text); if (rows.length < 2) return false;
  const H = rows[0]; const iDate = colIdx(H, "date"); if (iDate < 0) return false;
  if (/exercise/i.test(name) || colIdx(H, "minutes", "duration") >= 0) return false;
  const iCal = colIdx(H, "calories", "energy"), iW = colIdx(H, "weight"), iDel = colIdx(H, "deleted");
  const kind = iCal >= 0 ? "food" : iW >= 0 ? "weight" : null; if (!kind) return false;
  const iP = colIdx(H, "protein"), iC = colIdx(H, "carbohydrates", "carbs", "carbohydrate"), iF = colIdx(H, "fat", "total fat"), iFib = colIdx(H, "fiber", "fibre"), iNa = colIdx(H, "sodium");
  let used = 0;
  for (const r of rows.slice(1)) {
    if (iDel >= 0 && /^(true|1|yes)$/i.test(String(r[iDel]).trim())) continue;
    const d = toISODate(r[iDate]); if (!d) continue; used++;
    if (kind === "weight") { const w = NUM(r[iW]); if (w > 0) out.weights[d] = w; continue; }
    const t = out.food[d] || (out.food[d] = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0 });
    t.kcal += NUM(r[iCal]); if (iP >= 0) t.protein += NUM(r[iP]); if (iC >= 0) t.carbs += NUM(r[iC]); if (iF >= 0) t.fat += NUM(r[iF]); if (iFib >= 0) t.fiber += NUM(r[iFib]); if (iNa >= 0) t.sodium += NUM(r[iNa]);
  }
  return used > 0;
}
async function importFood(files) {
  const out = { food: {}, weights: {} };
  for (const f of files) {
    if (/\.zip$/i.test(f.name) || /zip/.test(f.type)) {
      if (!window.JSZip) throw new Error("The zip reader isn’t loaded yet (it needs internet the first time). Unzip the file and upload the CSV files instead.");
      const z = await window.JSZip.loadAsync(f);
      for (const name of Object.keys(z.files)) if (/\.csv$/i.test(name) && !z.files[name].dir) ingestCSV(name, await z.files[name].async("string"), out);
    } else ingestCSV(f.name, await f.text(), out);
  }
  for (const [d, t] of Object.entries(out.food)) { const r = Math.round; S.days[d] = { ...(S.days[d] || {}), kcal: r(t.kcal), protein: r(t.protein), carbs: r(t.carbs), fat: r(t.fat), fiber: r(t.fiber), sodium: r(t.sodium) }; }
  for (const [d, w] of Object.entries(out.weights)) S.days[d] = { ...(S.days[d] || {}), weight: Math.round(w * 10) / 10 };
  saveDays();
  return { foodDays: Object.keys(out.food).length, weightDays: Object.keys(out.weights).length };
}
function recentDays(n) { const cutoff = new Date(Date.now() - n * 864e5).toISOString().slice(0, 10); return Object.keys(S.days).filter((d) => d >= cutoff).sort(); }
function foodStats(n = 7) { const ds = recentDays(n).filter((d) => S.days[d].kcal > 0); if (!ds.length) return null; const avg = (k) => Math.round(ds.reduce((s, d) => s + (S.days[d][k] || 0), 0) / ds.length); return { days: ds.length, kcal: avg("kcal"), protein: avg("protein") }; }
function weightSeries(n = 90) { return recentDays(n).filter((d) => S.days[d].weight > 0).map((d) => ({ t: Date.parse(d), v: S.days[d].weight, d })); }
function renderBodyPanel() {
  const u = S.state.units, fs = foodStats(7), ws = weightSeries(90), lastW = ws[ws.length - 1];
  const w30 = weightSeries(30), delta = w30.length >= 2 ? w30[w30.length - 1].v - w30[0].v : null;
  return `<section class="panel"><h2>Food and bodyweight</h2>
    <div class="stats">
      <div><span class="k">Calories / day</span><b class="num">${fs ? fs.kcal.toLocaleString() : "–"}</b></div>
      <div><span class="k">Protein / day</span><b class="num">${fs ? fs.protein + " g" : "–"}</b></div>
      <div><span class="k">Bodyweight</span><b class="num">${lastW ? fmt(lastW.v) + " " + u : "–"}</b></div>
      <div><span class="k">30-day change</span><b class="num">${delta == null ? "–" : (delta > 0 ? "+" : "") + fmt(Math.round(delta * 10) / 10) + " " + u}</b></div>
    </div>
    <span class="note">${fs ? `7-day averages from ${fs.days} logged day${fs.days === 1 ? "" : "s"}. Days with no entries are left out.` : "No food logged yet. Import your Lose It export to fill this in."}</span>
    ${ws.length >= 2 ? lineChart(ws, { label: "Bodyweight" }) : ""}
    <div class="row">
      <label class="btn small" for="imp" role="button" tabindex="0">Import Lose It export</label>
      <input type="file" id="imp" accept=".csv,.zip,text/csv,application/zip" multiple hidden>
      <span class="grow"></span>
      <input id="bw" class="text-in" style="width:96px" type="text" inputmode="decimal" placeholder="${u}" aria-label="Today's bodyweight in ${u}">
      <button class="btn small" data-act="bw-save">Log weight</button>
    </div>
    <span class="note">In Lose It, use Export or Download data (in the app’s settings, or at loseit.com) and upload the zip or the CSV files inside it. Importing again refreshes those days.</span>
  </section>`;
}

/* ================= Setup ================= */
let installEvt = null;
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installEvt = e; if (S.ui.view === "setup") render(); });
function renderSetup() {
  const st = S.state, u = st.units;
  const standalone = matchMedia("(display-mode: standalone)").matches;
  const pr = program(); const pctIds = pr ? [...new Set(pr.weeks.flatMap((w) => w.days.flatMap((d) => d.items.filter((it) => it.load && it.load.t === "pct").map((it) => it.ex))))] : [];
  return `${header(`${APP_NAME} · version ${APP_VERSION}`, "Profile")}
    <section class="panel"><h2>Account</h2><span class="sub">Accounts aren’t live yet. For now everything is saved on this phone, and the program shown is a sample. When your coach invites you, you’ll sign in here and your real program and history will sync.</span></section>
    ${pctIds.length ? `<section class="panel"><h2>Your maxes (${u})</h2><span class="sub">Your best single rep. Your coach uses these to work out percentage-based weights. Leave blank to use your best estimated max from your logged workouts.</span>
      ${pctIds.map((id) => `<div class="field"><label for="max-${id}">${esc(getEx(id).name)}</label><input id="max-${id}" type="text" inputmode="decimal" value="${st.maxes[id] ? fmt(st.maxes[id]) : ""}" placeholder="${maxFor(id) ? "~" + fmt(maxFor(id)) : "–"}" data-max="${id}"></div>`).join("")}</section>` : ""}
    ${!standalone ? `<section class="panel"><h2>Install</h2>${installEvt ? `<span class="sub">Add Power Plant to your app drawer so it opens like any other app and works offline.</span><button class="btn primary" data-act="install">Install Power Plant</button>` : `<span class="sub">In Chrome, open the ⋮ menu and choose <b>Install app</b> (or Add to Home screen). Power Plant then shows up in your app drawer and works offline.</span>`}</section>` : ""}
    <section class="panel"><h2>Units and bars</h2>
      <div class="field"><label>Units</label><div class="toggle" role="group" aria-label="Units"><button data-act="units" data-u="lb" aria-pressed="${u === "lb"}">lb</button><button data-act="units" data-u="kg" aria-pressed="${u === "kg"}">kg</button></div></div>
      <div class="field"><label for="bar">Olympic bar (${u})</label><input id="bar" type="text" inputmode="decimal" value="${fmt(st.bar)}" data-field="bar"></div>
      <div class="field"><label for="tbar">Trap bar (${u})</label><input id="tbar" type="text" inputmode="decimal" value="${fmt(st.trapBar)}" data-field="trapBar"></div>
    </section>
    <section class="panel"><h2>Rest timer (seconds)</h2>
      <div class="field"><label for="rheavy">Heavy barbell sets (6 reps or fewer)</label><input id="rheavy" type="text" inputmode="numeric" value="${st.restHeavy}" data-field="restHeavy"></div>
      <div class="field"><label for="rok">Other working sets</label><input id="rok" type="text" inputmode="numeric" value="${st.restOk}" data-field="restOk"></div>
      <div class="field"><label for="rfail">After falling short of the range</label><input id="rfail" type="text" inputmode="numeric" value="${st.restFail}" data-field="restFail"></div>
    </section>
    <section class="panel"><h2>Backup</h2>
      <span class="sub">Your data is stored only on this device. Save a backup now and then, and before switching phones.</span>
      <div class="row"><button class="btn" data-act="backup">Save backup file</button><label class="btn ghost" for="restore" role="button" tabindex="0">Restore from backup</label><input type="file" id="restore" accept=".json,application/json" hidden></div>
      ${S.ui.confirm === "restore" ? `<div class="msg action" style="align-self:stretch"><span>Replace everything on this device with the backup from ${esc(S.ui.pendingRestore?.label || "that file")}?</span><button class="btn small ghost" data-act="confirm-no">Cancel</button><button class="btn small danger" data-act="restore-yes">Replace</button></div>` : ""}
      ${S.ui.msg ? `<span class="note">${esc(S.ui.msg)}</span>` : ""}
    </section>
    <section class="panel"><h2>Start over</h2>
      ${S.ui.confirm === "reset" ? `<span class="sub">This clears your own routines, weights and settings. Your workout log, food data and coach program are kept.</span><div class="row end"><button class="btn ghost" data-act="confirm-no">Cancel</button><button class="btn danger" data-act="reset-yes">Reset</button></div>` : `<div class="row"><span class="sub grow">Clear your own routines, weights and settings.</span><button class="btn small" data-act="reset">Reset…</button></div>`}
    </section>`;
}
function backupBlob() { return new Blob([JSON.stringify({ app: "powerplant", v: 1, exportedAt: new Date().toISOString(), state: S.state, workouts: S.workouts, days: S.days }, null, 1)], { type: "application/json" }); }
function readBackup(obj) {
  if (!obj || obj.app !== "powerplant" || !obj.state) throw new Error("That file isn’t a Power Plant backup.");
  return { program: obj.program || null, state: normalize(obj.state), workouts: Array.isArray(obj.workouts) ? obj.workouts : [], days: obj.days && typeof obj.days === "object" ? obj.days : {}, label: obj.exportedAt ? dateLabel(obj.exportedAt) : "that file" };
}

/* ================= Render + routing ================= */
function render() {
  const v = S.ui.view;
  document.querySelectorAll("nav.tabs a").forEach((a) => a.setAttribute("aria-current", a.dataset.tab === v ? "page" : "false"));
  const focusedId = document.activeElement && document.activeElement.id;
  $("#app").innerHTML = v === "history" ? renderHistory() : v === "program" ? renderProgram() : v === "setup" ? renderSetup() : v === "plan" ? renderPlan() : renderWorkout();
  if (focusedId && focusedId !== "pick-q") { const el = document.getElementById(focusedId); if (el && el.closest("#app")) el.focus(); }
  syncRest();
}
const VIEWS = ["workout", "program", "plan", "history", "setup"];
function route() {
  const h = location.hash.replace("#", "");
  S.ui.view = VIEWS.includes(h) ? h : "workout";
  S.ui.confirm = null; S.ui.msg = "";
  render(); window.scrollTo(0, 0);
}
window.addEventListener("hashchange", route);

/* ================= Events ================= */
document.addEventListener("click", async (ev) => {
  const b = ev.target.closest("[data-act]"); if (!b) return;
  const act = b.dataset.act, st = S.state, a = st.active, i = +b.dataset.i;
  if (act === "sheet-bg" && ev.target !== b) return;
  switch (act) {
    case "pick": S.ui.pickRoutine = b.dataset.r; render(); break;
    case "start": startWorkout(b.dataset.r); break;
    case "start-free": startWorkout(null); break;
    case "start-day": startCoachDay(+b.dataset.w, +b.dataset.d); break;
    case "open-day": S.ui.openDay = S.ui.openDay === b.dataset.k ? null : b.dataset.k; render(); break;
    case "set-done": {
      const it = a.items[+b.dataset.e], x = it.sets[+b.dataset.s], e = getEx(it.ex);
      x.done = !x.done;
      const g = groupInfo(a.items, +b.dataset.e);
      if (x.done && g && !g.last && x.t !== "w") { a.restEndsAt = null; toast(`No rest. Next: ${g.letter}${g.idx + 1} ${getEx(a.items[g.start + g.idx].ex).name}`); }
      else if (x.done) startRest(x.t === "w" ? "warm" : !it.rx && e.track === "wr" && x.r < e.repsMin ? "fail" : "ok", e, g ? groupRest(a.items, g) : it.rx && it.rx.rest);
      else a.restEndsAt = null;
      saveState(); render(); break;
    }
    case "set-type": { const x = a.items[+b.dataset.e].sets[+b.dataset.s]; x.t = SET_TYPES[(SET_TYPES.indexOf(x.t) + 1) % SET_TYPES.length]; saveState(); render(); break; }
    case "set-add": { const it = a.items[i]; const last = it.sets[it.sets.length - 1]; it.sets.push({ ...newSet(it.ex, last && last.t !== "w" ? last.t : "n", last), done: false }); saveState(); render(); break; }
    case "set-rm": { const it = a.items[i]; if (it.sets.length > 1) { it.sets.pop(); saveState(); render(); } break; }
    case "warmups": { const it = a.items[i]; const ws = warmupSets(it); if (ws.length) { it.sets.unshift(...ws); saveState(); render(); } else toast("No warm-ups needed at this weight."); break; }
    case "note": S.ui.note = i; render(); setTimeout(() => $(`[data-note="${i}"]`)?.focus(), 0); break;
    case "a-up": if (i > 0) { [a.items[i - 1], a.items[i]] = [a.items[i], a.items[i - 1]]; saveState(); render(); } break;
    case "rm": S.ui.confirm = "rm:" + i; render(); break;
    case "rm-yes": a.items.splice(i, 1); S.ui.confirm = null; saveState(); render(); break;
    case "finish": {
      const started = a.items.filter((it) => it.sets.some((x) => x.done));
      if (!started.length || started.some((it) => it.sets.some((x) => !x.done && x.t !== "w"))) { S.ui.confirm = "finish"; render(); } else finishWorkout();
      break;
    }
    case "finish-yes": finishWorkout(); break;
    case "cancel": S.ui.confirm = "cancel"; render(); break;
    case "cancel-yes": st.active = null; S.ui.confirm = null; releaseWake(); saveState(); render(); break;
    case "confirm-no": S.ui.confirm = null; render(); break;
    case "rest-sub": if (a?.restEndsAt) { a.restEndsAt = new Date(Math.max(Date.now(), Date.parse(a.restEndsAt) - 15000)).toISOString(); saveState(); syncRest(); } break;
    case "link": {
      const A = a.items[i], B = a.items[i + 1]; if (!B) break;
      if (A.group && B.group === A.group) B.group = null;
      else { const used = new Set(a.items.map((x) => x.group).filter(Boolean)); const L = A.group || "ABCDEFGHIJKLMNOP".split("").find((c) => !used.has(c)); A.group = L; B.group = L; }
      a.items.forEach((x, j) => { if (x.group && !groupInfo(a.items, j)) x.group = null; });
      saveState(); render(); break;
    }
    case "rest-add": if (a?.restEndsAt) { a.restEndsAt = new Date(Math.max(Date.now(), Date.parse(a.restEndsAt)) + 30000).toISOString(); beeped = false; saveState(); syncRest(); } break;
    case "rest-skip": if (a) { a.restEndsAt = null; saveState(); syncRest(); } break;
    case "summary-done": S.ui.summary = null; render(); break;
    case "add-ex": openPicker(b.dataset.target); break;
    case "sheet-bg": case "sheet-close": if (S.ui.info) closeInfo(); else closePicker(); break;
    case "info": ev.stopPropagation(); openInfo(b.dataset.id); break;
    case "info-close": closeInfo(); break;
    case "pick-ex": { const t = S.ui.picker.target; closePicker(); addExerciseTo(t, b.dataset.id); render(); break; }
    case "pick-new": { const t = S.ui.picker.target; const id = addCustom(S.ui.picker.q.trim(), $("#ne-kind")?.value, $("#ne-muscle")?.value, $("#ne-track")?.value); closePicker(); addExerciseTo(t, id); render(); break; }
    case "r-open": S.ui.openRoutine = S.ui.openRoutine === b.dataset.r ? null : b.dataset.r; S.ui.openItem = null; S.ui.confirm = null; render(); break;
    case "r-new": { const r = { id: uid("r"), name: `Routine ${st.routines.length + 1}`, items: [] }; st.routines.push(r); if (!st.next) st.next = r.id; S.ui.openRoutine = r.id; saveState(); render(); setTimeout(() => $("#rn-" + r.id)?.select(), 0); break; }
    case "r-up": if (i > 0) { [st.routines[i - 1], st.routines[i]] = [st.routines[i], st.routines[i - 1]]; saveState(); render(); } break;
    case "rdel": S.ui.confirm = "rdel:" + b.dataset.r; render(); break;
    case "rdel-yes": { const id = b.dataset.r; st.routines = st.routines.filter((r) => r.id !== id); if (st.next === id) st.next = st.routines[0]?.id || null; S.ui.confirm = null; saveState(); render(); break; }
    case "item-open": S.ui.openItem = S.ui.openItem === b.dataset.key ? null : b.dataset.key; render(); break;
    case "item-up": case "item-down": { const r = routine(b.dataset.r); const j = act === "item-up" ? i - 1 : i + 1; if (r && j >= 0 && j < r.items.length) { [r.items[i], r.items[j]] = [r.items[j], r.items[i]]; S.ui.openItem = null; saveState(); render(); } break; }
    case "item-rm": { const r = routine(b.dataset.r); if (r) { r.items.splice(i, 1); S.ui.openItem = null; saveState(); render(); } break; }
    case "chart": S.ui.chartEx = b.dataset.l; render(); break;
    case "del": S.ui.confirm = "del:" + b.dataset.id; render(); break;
    case "del-yes": S.workouts = S.workouts.filter((w) => w.id !== b.dataset.id); saveWorkouts(); S.ui.confirm = null; render(); break;
    case "bw-save": {
      const v = parseFloat($("#bw")?.value);
      if (!isFinite(v) || v <= 0 || v > 1500) { toast("Enter your weight as a number first."); break; }
      const d = todayISO(); S.days[d] = { ...(S.days[d] || {}), weight: Math.round(v * 10) / 10 }; saveDays(); toast(`Logged ${fmt(v)} ${st.units} for today.`); render(); break;
    }
    case "units": changeUnits(b.dataset.u); break;
    case "install": if (installEvt) { installEvt.prompt(); installEvt = null; } break;
    case "backup": {
      const blob = backupBlob(), url = URL.createObjectURL(blob);
      const aEl = document.createElement("a"); aEl.href = url; aEl.download = `powerplant-backup-${todayISO()}.json`; document.body.appendChild(aEl); aEl.click(); aEl.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000); S.ui.msg = "Backup saved to your Downloads."; render(); break;
    }
    case "restore-yes": { const r = S.ui.pendingRestore; if (r) { S.state = r.state; S.workouts = r.workouts; S.days = r.days; if (r.program) { S.program = r.program; lsSet("pp1.program", S.program); } lsSet("pp1.state", S.state); saveWorkouts(); saveDays(); S.ui.pendingRestore = null; S.ui.confirm = null; S.ui.msg = "Backup restored."; render(); } break; }
    case "reset": S.ui.confirm = "reset"; render(); break;
    case "reset-yes": S.state = { ...defaults(st.units), coachLog: st.coachLog }; S.ui.confirm = null; saveState(); render(); break;
    case "sw-update": swUpdate(); break;
    case "sw-reload": location.reload(); break;
  }
});
document.addEventListener("input", (ev) => {
  const t = ev.target;
  if (t.dataset.f && S.state.active) {
    const x = S.state.active.items[+t.dataset.e]?.sets[+t.dataset.s]; if (!x) return;
    if (t.dataset.f === "s") x.s = parseTime(t.value); else if (t.dataset.f === "r") x.r = Math.max(0, Math.round(NUM(t.value))); else x[t.dataset.f] = NUM(t.value);
    saveState(); return;
  }
  if (t.dataset.note != null && S.state.active) { S.state.active.items[+t.dataset.note].note = t.value; saveState(); return; }
  if (t.dataset.wnote && S.state.active) { S.state.active.note = t.value; saveState(); return; }
  if (t.id === "pick-q" && S.ui.picker) { S.ui.picker.q = t.value; renderPickList(); }
});
document.addEventListener("change", (ev) => {
  const t = ev.target, st = S.state;
  if (t.dataset.f && S.state.active) { // tidy the field in place (no re-render, so focus can move to the next box)
    const it = S.state.active.items[+t.dataset.e], si = +t.dataset.s, x = it && it.sets[si]; if (!x) return;
    if (t.dataset.f === "s") t.value = mmss(x.s);
    else if (t.dataset.f === "w" || t.dataset.f === "d") {
      const old = NUM(t.dataset.old), nv = x[t.dataset.f];
      if (t.dataset.old != null && old !== nv) it.sets.forEach((y, j) => {
        if (j > si && !y.done && y.t === x.t && y[t.dataset.f] === old) { y[t.dataset.f] = nv; const el = document.querySelector(`[data-f="${t.dataset.f}"][data-e="${t.dataset.e}"][data-s="${j}"]`); if (el) el.value = fmt(nv); }
      });
      t.dataset.old = fmt(nv);
    }
    saveState(); return;
  }
  if (t.id === "chart-ex") { S.ui.chartEx = t.value; render(); return; }
  if (t.id === "ne-kind" || t.id === "ne-muscle" || t.id === "ne-track") { S.ui.newEx = { kind: $("#ne-kind").value, muscle: $("#ne-muscle").value, track: $("#ne-track").value }; return; }
  if (t.id === "imp") {
    const files = [...(t.files || [])]; if (!files.length) return;
    importFood(files).then((r) => { toast(r.foodDays || r.weightDays ? `Imported ${r.foodDays} day${r.foodDays === 1 ? "" : "s"} of food${r.weightDays ? ` and ${r.weightDays} weigh-ins` : ""}.` : "No food or weight rows found in that file."); render(); })
      .catch((e) => toast((e && e.message) || "That file couldn’t be read."));
    return;
  }
  if (t.id === "restore") {
    const f = t.files && t.files[0]; if (!f) return;
    f.text().then((txt) => { S.ui.pendingRestore = readBackup(JSON.parse(txt)); S.ui.confirm = "restore"; render(); }).catch((e) => { S.ui.msg = e instanceof SyntaxError ? "That file isn’t a Power Plant backup." : e.message; render(); });
    return;
  }
  if (t.dataset.rname) { const r = routine(t.dataset.rname); const v = t.value.trim().slice(0, 40); if (r && v) { r.name = v; saveState(); } render(); return; }
  if (t.dataset.exf) {
    const v = parseFloat(t.value); if (!isFinite(v) || v < 0) { render(); return; }
    const f = t.dataset.exf, id = t.dataset.id, e = getEx(id), patch = {};
    if (f === "sets") patch.sets = Math.max(1, Math.min(12, Math.round(v)));
    else if (f === "repsMin") { patch.repsMin = Math.max(1, Math.round(v)); if (patch.repsMin > e.repsMax) patch.repsMax = patch.repsMin; }
    else if (f === "repsMax") { patch.repsMax = Math.max(1, Math.round(v)); if (patch.repsMax < e.repsMin) patch.repsMin = patch.repsMax; }
    else if (f === "weight") { patch.weight = v; patch.fails = 0; }
    else if (f === "inc") patch.inc = v;
    setEx(id, patch); saveState(); render(); return;
  }
  if (t.dataset.max) { const v = parseFloat(t.value); if (isFinite(v) && v > 0) S.state.maxes[t.dataset.max] = v; else delete S.state.maxes[t.dataset.max]; saveState(); return; }
  if (t.dataset.field) {
    const v = parseFloat(t.value); if (!isFinite(v) || v < 0) { render(); return; }
    st[t.dataset.field] = ["bar", "trapBar"].includes(t.dataset.field) ? v : Math.round(v); saveState();
  }
});
document.addEventListener("focusin", (ev) => { const t = ev.target; if (t.dataset && t.dataset.f) t.dataset.old = t.value; });
document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape" && S.ui.info) closeInfo(); else if (ev.key === "Escape" && S.ui.picker) closePicker();
  if (ev.key === "Enter" && ev.target.tagName === "LABEL" && ev.target.htmlFor) $("#" + ev.target.htmlFor)?.click();
});
function changeUnits(nu) {
  const st = S.state; if (st.units === nu) return;
  const f = nu === "kg" ? 1 / 2.20462 : 2.20462;
  for (const id of Object.keys(st.ex)) { const x = { ...st.ex[id] }; if (x.weight != null) x.weight = roundTo(x.weight * f, nu === "kg" ? 2.5 : 5); delete x.inc; st.ex[id] = x; }
  if (st.active) for (const it of st.active.items) for (const x of it.sets) if (x.w != null) x.w = roundTo(x.w * f, nu === "kg" ? 2.5 : 5);
  st.bar = nu === "kg" ? 20 : 45; st.trapBar = nu === "kg" ? 25 : 60; st.units = nu;
  saveState(); render();
}

/* ================= Service worker + updates ================= */
let swReg = null;
let updateRequested = false;
function swUpdate() { if (swReg && swReg.waiting) { updateRequested = true; swReg.waiting.postMessage("skipWaiting"); } }
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) return;
    // A new version just took over. Reload now unless a workout is open; then offer it instead.
    if (updateRequested || !S.state.active) { reloading = true; location.reload(); }
    else toast("Power Plant was updated. Reload when you finish this workout.", { act: "sw-reload", label: "Reload", sticky: true });
  });
  navigator.serviceWorker.register("sw.js").then((reg) => {
    swReg = reg;
    const offer = () => { if (reg.waiting && navigator.serviceWorker.controller) toast("A new version of Power Plant is ready.", { act: "sw-update", label: "Update", sticky: true }); };
    offer();
    reg.addEventListener("updatefound", () => { const nw = reg.installing; nw && nw.addEventListener("statechange", () => { if (nw.state === "installed") offer(); }); });
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") reg.update().catch(() => {}); });
  }).catch(() => {});
}

/* ================= Boot ================= */
load();
route();
})();
