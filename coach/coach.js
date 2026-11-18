/* Power Plant Coach dashboard.
   Until the gym's Supabase project is connected, everything is saved in this browser and starts with labeled sample data. */
(() => {
"use strict";
const P = window.PPProgram, LIBR = window.PPLibrary;

/* ================= Helpers ================= */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const clone = (o) => JSON.parse(JSON.stringify(o));
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const dateLabel = (iso) => new Date(iso.length === 10 ? iso + "T12:00:00" : iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
const mmss = (s) => P.mmss(s);
const parseTime = (v) => { const s = String(v || "").trim(); if (!s) return 0; if (s.includes(":")) return s.split(":").reduce((a, b) => a * 60 + (+b || 0), 0); return Math.round(+s.replace(/[^0-9.]/g, "") || 0); };
let toastT = null;
function toast(text, action) {
  const el = $("#toast"); clearTimeout(toastT);
  el.innerHTML = `<span>${esc(text)}</span>${action ? `<button data-act="${action.act}">${esc(action.label)}</button>` : ""}`;
  el.hidden = false; toastT = setTimeout(() => (el.hidden = true), action ? 8000 : 3000);
}

/* ================= Exercises ================= */
const LIB = {};
for (const [id, name, kind, muscle, sets, repsMin, repsMax, extra] of LIBR.LIB_ROWS) LIB[id] = { id, name, kind, muscle, track: "wr", ...(extra || {}) };
const exMeta = (id) => LIB[id] || db.custom[id] || { id, name: id, kind: "other", muscle: "Other", track: "wr" };
const defaultFields = (id) => LIBR.TRACK_FIELDS[exMeta(id).track || "wr"] || ["w", "r"];
const fieldsText = (f) => f.map((k) => LIBR.FIELD_NAMES[k].toLowerCase()).join(", ");

/* ================= Data (this browser until accounts are live) ================= */
const KEY = "ppc1.db";
let db = null;
function load() { try { db = JSON.parse(localStorage.getItem(KEY)); } catch { db = null; } if (!db || !db.v) db = seed(); }
let saveT = null;
function save() { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { toast("Couldn’t save in this browser. Free some space and try again."); } }, 250); }
window.addEventListener("pagehide", () => { clearTimeout(saveT); try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {} });
function seed() {
  const d = { v: 1, sample: true, me: "c1", coaches: [{ id: "c1", name: "You" }, { id: "c2", name: "Second coach (sample)" }], clients: [], programs: [], logs: [], custom: {} };
  d.clients = [
    { id: "k1", name: "Sample client: Alex", email: "", coachId: "c1", remote: true, notes: "Remote client. Old left knee irritation, watch deep knee flexion." },
    { id: "k2", name: "Sample client: Jordan", email: "", coachId: "c1", remote: false, notes: "Training for first strongman show in spring." },
    { id: "k3", name: "Sample client: Sam", email: "", coachId: "c2", remote: false, notes: "" },
  ];
  const pr = PPSample.program(); pr.id = "p1"; pr.clientId = "k1"; pr.name = "Strength Block 1"; pr.coach = "You"; pr.sample = false;
  pr.days[0].warmup = "5 min bike, 10 bodyweight squats, 10 glute bridges, 2 rounds.";
  d.programs.push(pr);
  // Sample logged workouts, built from the program's first week so the feed has something to show.
  const c = P.compile(pr), max = { squat: 225, bench: 155, trap_dl: 275 };
  const loadW = (ex, g) => (g.load && g.load.t === "pct" && max[ex] ? Math.round((max[ex] * g.load.v) / 100 / 5) * 5 : g.load && (g.load.t === "lb") ? g.load.v : g.load && g.load.t === "rpe" ? ({ rdl: 135, row: 115, bulgarian: 25, db_shoulder: 30, face_pull: 40 }[ex] || 0) : 0);
  const notes = { squat: "Left knee felt a little tight on the last back-off set.", sled_push: "Turf was slippery today." };
  c.weeks[0].days.forEach((day, di) => {
    const date = new Date(Date.now() - (6 - di * 2) * 864e5).toISOString();
    d.logs.push({ id: uid("l"), clientId: "k1", date, name: `Week 1 · ${day.name}`, minutes: 52 + di * 4, note: di === 0 ? "Slept badly, energy was low at the start." : "",
      exercises: day.items.map((it) => ({ ex: it.ex, rx: P.prescriptionText(it), note: notes[it.ex] || "",
        sets: it.groups.flatMap((g) => Array.from({ length: g.sets }, () => ({ w: loadW(it.ex, g), r: g.reps || 8, s: g.time || (g.dist ? 14 + Math.round(Math.random() * 4) : 0), d: g.dist || 0 }))) })) });
  });
  return d;
}
const me = () => db.coaches.find((c) => c.id === db.me) || db.coaches[0];
const client = (id) => db.clients.find((c) => c.id === id);
const programsOf = (cid) => db.programs.filter((p) => p.clientId === cid);
function programWeekNow(p) {
  if (!p.startDate) return null;
  const w = Math.floor((Date.now() - new Date(p.startDate + "T00:00:00").getTime()) / (7 * 864e5));
  return w < 0 ? "Starts " + dateLabel(p.startDate) : w >= p.weeks ? "Finished" : `Week ${w + 1} of ${p.weeks}`;
}

/* ================= Views ================= */
const UI = { day: 0, previewWeek: 0, editing: null, picker: null, confirm: null };
function route() {
  const h = location.hash.slice(1);
  let m;
  if ((m = h.match(/^program-(.+)$/)) && db.programs.find((p) => p.id === m[1])) return renderProgram(m[1]);
  if ((m = h.match(/^client-(.+)$/)) && client(m[1])) return renderClient(m[1]);
  return renderClients();
}
function setNav(k) { document.querySelectorAll("[data-nav]").forEach((a) => a.setAttribute("aria-current", a.dataset.nav === k ? "page" : "false")); }
function renderTop() {
  $("#me").innerHTML = db.coaches.map((c) => `<option value="${c.id}" ${c.id === db.me ? "selected" : ""}>${esc(c.name)}</option>`).join("");
  $("#sample-pill").hidden = !db.sample;
}

function renderClients() {
  setNav("clients");
  const rows = db.clients.map((c) => {
    const ps = programsOf(c.id), cur = ps[ps.length - 1], last = db.logs.filter((l) => l.clientId === c.id).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    const coach = db.coaches.find((x) => x.id === c.coachId);
    return `<a class="panel ccard" href="#client-${c.id}"><b>${esc(c.name)}</b>
      <span class="sub">${coach ? "Coach: " + esc(coach.name) : ""}${c.remote ? " · Remote" : " · In person"}</span>
      <span>${cur ? `${esc(cur.name)} · <span class="sub">${esc(programWeekNow(cur) || "")}</span>` : `<span class="sub">No program yet</span>`}</span>
      <span class="sub">${last ? `Last workout ${dateLabel(last.date)}: ${esc(last.name)}` : "No workouts logged yet"}</span></a>`;
  }).join("");
  $("#view").innerHTML = `<div class="row"><div class="grow"><div class="eyebrow">${db.clients.length} clients · everyone’s clients are visible to every coach</div><h1>Clients</h1></div>
      <button class="btn primary" data-act="client-new">+ Add client</button></div>
    ${UI.confirm === "client-new" ? `<form class="panel" id="newclient"><h2>New client</h2><div class="form2">
        <label class="f">Name<input class="in" id="nc-name" required></label><label class="f">Email (for their invite, once accounts are live)<input class="in" id="nc-email" type="email"></label>
        <label class="f">Coach<select class="in" id="nc-coach">${db.coaches.map((c) => `<option value="${c.id}" ${c.id === db.me ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label>
        <label class="f">Training<select class="in" id="nc-remote"><option value="0">In person</option><option value="1">Remote</option></select></label></div>
        <div class="row"><button class="btn primary">Add client</button><button type="button" class="btn ghost" data-act="cancel">Cancel</button></div></form>` : ""}
    <div class="clients">${rows || `<div class="empty">No clients yet.</div>`}</div>
    ${db.sample ? `<p class="sub">These are sample clients so you can try the dashboard. They’re saved only in this browser. <button class="btn small ghost" data-act="reset-sample">Start over with fresh sample data</button></p>` : ""}`;
}

function setsText(e) {
  const f = e.sets[0] ? Object.keys(e.sets[0]) : [];
  return e.sets.map((x) => [x.w ? x.w + (x.r ? "×" + x.r : "") : x.r ? x.r + " reps" : "", x.d ? x.d + (x.w ? "" : "") + "yd" : "", x.s ? mmss(x.s) : "", x.h ? x.h + "in" : ""].filter(Boolean).join(" ")).join(", ");
}
function renderClient(cid) {
  setNav("clients");
  const c = client(cid), logs = db.logs.filter((l) => l.clientId === cid).sort((a, b) => (a.date < b.date ? 1 : -1));
  const feed = logs.map((l) => `<article class="panel wcard"><div class="hd"><b>${esc(l.name)}</b><span class="sub">${dateLabel(l.date)}${l.minutes ? ` · ${l.minutes} min` : ""}</span></div>
      ${l.note ? `<div class="cnote">“${esc(l.note)}”</div>` : ""}
      ${l.exercises.map((e) => `<div class="wex"><span><b>${esc(exMeta(e.ex).name)}</b><br><span class="rx">${esc(e.rx || "")}</span></span><span class="num">${esc(setsText(e))}${e.note ? `<div class="cnote" style="margin-top:6px">“${esc(e.note)}”</div>` : ""}</span></div>`).join("")}
    </article>`).join("");
  const progs = programsOf(cid).map((p) => `<div class="pitem"><div class="grow"><b>${esc(p.name)}</b><div class="sub">${p.weeks} weeks · ${p.days.length} days/week · ${p.schedule === "weekly" ? "scheduled by day" : "any order"} · ${esc(programWeekNow(p) || "")}</div></div>
      <a class="btn small primary" href="#program-${p.id}" style="text-decoration:none">Edit</a><button class="btn small" data-act="prog-dup" data-id="${p.id}">Copy…</button></div>`).join("");
  const dup = UI.confirm && UI.confirm.startsWith("dup:") ? db.programs.find((p) => p.id === UI.confirm.slice(4)) : null;
  $("#view").innerHTML = `<div class="row"><a href="#clients" class="btn small ghost" style="text-decoration:none">← Clients</a></div>
    <div class="row"><div class="grow"><div class="eyebrow">${c.remote ? "Remote" : "In person"} · Coach: ${esc((db.coaches.find((x) => x.id === c.coachId) || {}).name || "–")}</div><h1>${esc(c.name)}</h1></div></div>
    <div class="cols">
      <section class="feed"><h2>Recent workouts</h2>${feed || `<div class="empty">No workouts logged yet. Once accounts are live, every workout ${esc(c.name)} finishes shows up here with their notes.</div>`}</section>
      <aside style="display:flex;flex-direction:column;gap:18px">
        <section class="panel"><h2>Programs</h2><div class="plist">${progs || `<div class="empty">No program yet.</div>`}</div>
          ${dup ? `<div class="panel" style="background:var(--sunken)"><b>Copy “${esc(dup.name)}” to:</b><select class="in" id="dup-to">${db.clients.map((x) => `<option value="${x.id}" ${x.id === cid ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select><div class="row"><button class="btn small primary" data-act="dup-yes" data-id="${dup.id}">Make a copy</button><button class="btn small ghost" data-act="cancel">Cancel</button></div></div>` : ""}
          <button class="btn" data-act="prog-new" data-c="${cid}">+ New program</button></section>
        <section class="panel"><h2>Coach notes</h2><textarea class="in" id="cnotes" data-c="${cid}" rows="5" placeholder="Injuries, goals, anything other coaches should know. Clients don’t see this.">${esc(c.notes || "")}</textarea></section>
      </aside>
    </div>`;
}

function newProgram(cid) {
  const start = new Date(); start.setDate(start.getDate() + ((8 - start.getDay()) % 7 || 7)); // next Monday
  const sd = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
  const p = { v: 2, id: uid("p"), clientId: cid, coach: me().name, name: "New program", weeks: 6, schedule: "weekly", startDate: sd, notes: "", weekNotes: [],
    days: [{ id: uid("d"), name: "Day 1", weekday: 1, note: "", warmup: "", blocks: [] }, { id: uid("d"), name: "Day 2", weekday: 3, note: "", warmup: "", blocks: [] }, { id: uid("d"), name: "Day 3", weekday: 5, note: "", warmup: "", blocks: [] }] };
  db.programs.push(p); save(); return p;
}

/* ---- Program editor ---- */
const prog = (id) => db.programs.find((p) => p.id === id);
function groupLabels(blocks) {
  const out = []; for (let i = 0; i < blocks.length; i++) {
    const g = blocks[i].group; if (!g) { out.push(null); continue; }
    let s = i; while (s > 0 && blocks[s - 1].group === g) s--; let e = i; while (e < blocks.length - 1 && blocks[e + 1].group === g) e++;
    out.push(e > s ? { label: g + (i - s + 1), start: i === s, kind: e - s >= 2 ? "Circuit" : "Superset" } : null);
  } return out;
}
function cellPreview(text) {
  if (!String(text || "").trim()) return `<div class="pv">–</div>`;
  const r = P.parsePrescription(text);
  if (r.errors.length) return `<div class="pv err">Not understood: ${esc(r.errors.join(" · "))}</div>`;
  return `<div class="pv">${esc(P.prescriptionText(r))}</div>`;
}
function weekRange(p, w) {
  if (p.schedule !== "weekly" || !p.startDate) return "";
  const s = new Date(p.startDate + "T12:00:00"); s.setDate(s.getDate() + w * 7); const e = new Date(s); e.setDate(e.getDate() + 6);
  const f = (d) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" }); return `${f(s)}–${f(e)}`;
}
function previewHTML(p, day) {
  const cp = P.compile(p), pw = Math.min(UI.previewWeek, p.weeks - 1), pday = cp.weeks[pw] && cp.weeks[pw].days.find((d) => d.id === (day && day.id));
  let preview = `<div class="empty">Nothing scheduled for this day in week ${pw + 1}.</div>`;
  if (pday) {
    const gl = groupLabels(pday.items);
    preview = `<div class="pview"><div class="row"><b style="font-family:var(--display);font-size:22px;text-transform:uppercase">Week ${pw + 1} · ${esc(pday.name)}</b>${pday.date ? `<span class="pill">${dateLabel(pday.date)}</span>` : ""}</div>
      ${pday.note ? `<div class="cnote">${esc(pday.note)}</div>` : ""}${pday.warmup ? `<div class="cnote"><b>Warm-up:</b> ${esc(pday.warmup)}</div>` : ""}
      ${pday.items.map((it, i) => `${gl[i] && gl[i].start ? `<div class="grp">${gl[i].kind} · no rest between · ${it.group && pday.items.filter((x) => x.group === it.group).slice(-1)[0].rest ? "rest " + mmss(pday.items.filter((x) => x.group === it.group).slice(-1)[0].rest) + " after each round" : ""}</div>` : ""}<div class="pex">${gl[i] ? `<span class="glabel">${gl[i].label}</span> ` : ""}<b>${esc(exMeta(it.ex).name)}</b><div>${esc(P.prescriptionText(it))}${it.rest && !gl[i] ? ` · rest ${mmss(it.rest)}` : ""}</div>${it.format ? `<div class="sub">${esc(P.formatText(it.format))}</div>` : ""}${it.note ? `<div class="sub">${esc(it.note)}</div>` : ""}<div class="sub">Client records: ${fieldsText(it.fields || defaultFields(it.ex))}${it.warmupSets ? " · warm-up sets added" : ""}</div></div>`).join("")}</div>`;
  }
  return preview;
}
function renderProgram(pid) {
  setNav("clients");
  const p = prog(pid), c = client(p.clientId);
  if (UI.day >= p.days.length) UI.day = 0;
  const day = p.days[UI.day];
  const tabs = p.days.map((d, i) => `<button class="dtab" data-act="day" data-i="${i}" aria-pressed="${i === UI.day}">${p.schedule === "weekly" && d.weekday != null ? `<small>${P.WEEKDAYS[d.weekday].slice(0, 3)}</small>` : `<small>Day ${i + 1}</small>`}${esc(d.name)}</button>`).join("");
  const labels = day ? groupLabels(day.blocks) : [];
  const head = `<tr><th class="exh">Exercise</th>${Array.from({ length: p.weeks }, (_, w) => `<th>Week ${w + 1}<span class="sub">${weekRange(p, w)}</span>${w > 0 ? `<button class="btn small ghost" data-act="copy-col" data-w="${w}" title="Copy week ${w} into week ${w + 1}">Copy week ${w} →</button>` : ""}</th>`).join("")}</tr>`;
  const rows = day ? day.blocks.map((b, bi) => {
    const m = exMeta(b.ex), lab = labels[bi], f = b.fields || defaultFields(b.ex);
    const meta = [b.rest ? `rest ${mmss(b.rest)}` : "", `records ${fieldsText(f)}`, b.format ? P.formatText(b.format) : "", b.warmupSets ? "warm-up sets" : "", b.video ? "video ✓" : "", b.note ? "note ✓" : ""].filter(Boolean).join(" · ");
    return `<tr class="${lab && lab.start ? "group-start" : ""}"><td class="exh"><div class="exname">${lab ? `<span class="glabel" title="${lab.kind}">${lab.label}</span>` : ""}<button class="nm" data-act="ex-settings" data-b="${bi}" title="Exercise settings">${esc(m.name)}</button></div>
        <div class="meta">${esc(meta)}</div>
        <div class="rowtools"><button class="btn small" data-act="ex-settings" data-b="${bi}">Settings</button><button class="icon" data-act="b-up" data-b="${bi}" aria-label="Move up" ${bi === 0 ? "disabled" : ""}>▲</button><button class="icon" data-act="b-down" data-b="${bi}" aria-label="Move down" ${bi === day.blocks.length - 1 ? "disabled" : ""}>▼</button><button class="icon" data-act="b-rm" data-b="${bi}" aria-label="Remove ${esc(m.name)}">✕</button></div></td>
      ${Array.from({ length: p.weeks }, (_, w) => { const v = (b.weeks || [])[w] || ""; return `<td class="cell${v.trim() ? "" : " off"}"><textarea data-cell="${bi}:${w}" aria-label="${esc(m.name)}, week ${w + 1}" placeholder="e.g. 3x5 @75%">${esc(v)}</textarea>${cellPreview(v)}</td>`; }).join("")}</tr>`;
  }).join("") : "";
  const pw = Math.min(UI.previewWeek, p.weeks - 1), preview = previewHTML(p, day);
  $("#view").innerHTML = `<div class="row"><a href="#client-${c.id}" class="btn small ghost" style="text-decoration:none">← ${esc(c.name)}</a><span class="grow"></span><span class="sub" id="saved">Saved in this browser</span>
      <button class="btn small" data-act="download">Download for the client app</button></div>
    <section class="panel"><div class="ptop">
      <label class="f">Program name<input class="in name" id="p-name" value="${esc(p.name)}"></label>
      <label class="f">Weeks<input class="in" id="p-weeks" type="number" min="1" max="16" value="${p.weeks}"></label>
      <label class="f">Schedule<select class="in" id="p-sched"><option value="weekly" ${p.schedule === "weekly" ? "selected" : ""}>On set days of the week</option><option value="flexible" ${p.schedule === "flexible" ? "selected" : ""}>In order, whenever they train</option></select></label>
      <label class="f">Start date<input class="in" id="p-start" type="date" value="${esc(p.startDate || "")}" ${p.schedule === "weekly" ? "" : "disabled"}></label>
      <span class="sub">${esc(programWeekNow(p) || "")}</span></div></section>
    <div class="days">${tabs}<button class="btn small" data-act="day-add">+ Add day</button></div>
    ${day ? `<section class="panel"><div class="dayset">
        <label class="f">Day name<input class="in" id="d-name" value="${esc(day.name)}"></label>
        <label class="f">Day of week<select class="in" id="d-wd" ${p.schedule === "weekly" ? "" : "disabled"}><option value="">–</option>${P.WEEKDAYS.map((n, i) => `<option value="${i}" ${day.weekday === i ? "selected" : ""}>${n}</option>`).join("")}</select></label>
        <label class="f">Note for this day<input class="in" id="d-note" value="${esc(day.note || "")}" placeholder="Shown at the top of the workout"></label>
        <label class="f">Warm-up (for remote clients)<input class="in" id="d-warm" value="${esc(day.warmup || "")}" placeholder="e.g. 5 min bike, 2 rounds of…"></label>
        ${UI.confirm === "day-rm" ? `<span class="row"><button class="btn small danger" data-act="day-rm-yes">Delete day</button><button class="btn small ghost" data-act="cancel">Keep</button></span>` : `<button class="btn small ghost danger" data-act="day-rm">Delete day</button>`}
      </div></section>
      <div class="gridwrap"><table class="grid"><thead>${head}</thead><tbody>${rows}<tr class="addrow"><td class="exh"><button class="btn primary" data-act="b-add">+ Add exercise</button></td><td colspan="${p.weeks}" class="sub" style="padding:12px">Type each week’s sets in the cells. Empty cell = not this week.</td></tr></tbody></table></div>
      <div class="cols">
        <section class="panel"><div class="row"><h2 class="grow">What the client sees</h2><label class="f" style="flex-direction:row;align-items:center;gap:8px">Week <select class="in" id="pv-week">${Array.from({ length: p.weeks }, (_, w) => `<option value="${w}" ${w === pw ? "selected" : ""}>${w + 1}</option>`).join("")}</select></label></div><div id="pv">${preview}</div></section>
        <section class="panel help"><h2>Shorthand</h2><dl>
          <dt><code>3x5 @75%</code></dt><dd>sets × reps at % of the client’s max</dd>
          <dt><code>1x3 @85%, 3x5 @75%</code></dt><dd>top set, then back-off sets (add <code>(top set)</code> to label one)</dd>
          <dt><code>3x8-10 @RPE8</code></dt><dd>rep range at an effort; <code>@RIR2</code> also works</dd>
          <dt><code>3xAMRAP @70%</code></dt><dd>as many reps as possible; <code>1x5+</code> = at least 5</dd>
          <dt><code>4x6 @135</code></dt><dd>fixed weight in lb (<code>@60kg</code> for kg), <code>@BW</code> bodyweight</dd>
          <dt><code>3x30s</code> <code>3x2min</code></dt><dd>timed sets</dd>
          <dt><code>4x40yd @200</code></dt><dd>distance (yd, m, ft) with a weight</dd>
          <dt><code>AMRAP 60s @200</code></dt><dd>max reps in a time window</dd>
          <dt><code>tempo 3-1-1</code> <code>pause 2s</code></dt><dd>tempo or pause for that week</dd>
        </dl><p class="sub">Supersets, circuits, EMOMs, intervals, rest, what the client records (weight, reps, time, distance, height), warm-up sets and video links are in each exercise’s <b>Settings</b>.</p></section>
      </div>` : `<div class="empty">Add a day to start.</div>`}`;
}

/* ---- Exercise picker and settings (modal) ---- */
function openModal(html) { $("#modal").innerHTML = `<div class="modal-wrap" data-act="modal-bg"><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`; }
function closeModal() { $("#modal").innerHTML = ""; UI.picker = null; UI.editing = null; }
function pickerHTML(q) {
  const all = [...Object.values(LIB), ...Object.values(db.custom)];
  const lo = q.trim().toLowerCase();
  const hits = all.filter((m) => !lo || m.name.toLowerCase().includes(lo) || m.muscle.toLowerCase().includes(lo));
  const groups = {}; for (const m of hits) (groups[m.muscle] = groups[m.muscle] || []).push(m);
  let list = ""; for (const mu of LIBR.MUSCLES) if (groups[mu]) list += `<div class="grp">${esc(mu)}</div>` + groups[mu].map((m) => `<button data-act="pick" data-id="${esc(m.id)}"><span>${esc(m.name)}</span><span class="sub">${esc(m.kind)}${db.custom[m.id] ? " · yours" : ""}</span></button>`).join("");
  for (const mu of Object.keys(groups)) if (!LIBR.MUSCLES.includes(mu)) list += `<div class="grp">${esc(mu)}</div>` + groups[mu].map((m) => `<button data-act="pick" data-id="${esc(m.id)}"><span>${esc(m.name)}</span><span class="sub">yours</span></button>`).join("");
  const exact = all.some((m) => m.name.toLowerCase() === lo);
  return list + (lo && !exact ? `<div class="grp">New exercise</div><div style="padding:12px" class="form2">
      <label class="f">Name<input class="in" id="nx-name" value="${esc(q.trim())}"></label>
      <label class="f">Muscle / category<input class="in" id="nx-muscle" value="Strongman" list="muscles"><datalist id="muscles">${[...LIBR.MUSCLES, "Strongman", "Mobility", "Warm-up"].map((x) => `<option value="${x}">`).join("")}</datalist></label>
      <label class="f">Equipment<input class="in" id="nx-kind" value="strongman" list="kinds"><datalist id="kinds">${[...LIBR.KINDS, "strongman", "kettlebell", "band", "other"].map((x) => `<option value="${x}">`).join("")}</datalist></label>
      <label class="f">YouTube link (optional)<input class="in" id="nx-video" placeholder="https://youtu.be/…"></label>
      <div class="fields" style="grid-column:1/-1"><span class="sub">Client records:</span>${Object.entries(LIBR.FIELD_NAMES).map(([k, n]) => `<label><input type="checkbox" class="nx-f" value="${k}" ${k === "w" || k === "r" ? "checked" : ""}> ${n}</label>`).join("")}</div>
      <button class="btn primary" data-act="pick-new" style="grid-column:1/-1">Create and add</button></div>` : "");
}
function openPicker(mode) {
  UI.picker = { mode, q: "" };
  openModal(`<div class="row"><h2 class="grow">${mode === "add" ? "Add exercise" : "Change exercise"}</h2><button class="btn small ghost" data-act="modal-close">Close</button></div>
    <input class="in" id="pick-q" placeholder="Search, or type a new exercise name (e.g. Yoke carry)" autocomplete="off">
    <div class="picklist" id="pick-list">${pickerHTML("")}</div>`);
  setTimeout(() => $("#pick-q")?.focus(), 30);
}
function settingsHTML(p, b) {
  const m = exMeta(b.ex), f = b.fields || defaultFields(b.ex), fm = b.format || {};
  return `<div class="row"><div class="grow"><div class="eyebrow">${esc(m.muscle)} · ${esc(m.kind)}</div><h2>${esc(m.name)}</h2></div><button class="btn small ghost" data-act="modal-close">Done</button></div>
    <div class="form2">
      <label class="f">Superset / circuit letter<input class="in" id="s-group" maxlength="2" value="${esc(b.group || "")}" placeholder="e.g. A (same letter on neighbors)"></label>
      <label class="f">Rest after ${b.group ? "each round" : "each set"} (m:ss)<input class="in" id="s-rest" value="${b.rest ? mmss(b.rest).replace(/^(\d+)s$/, "0:$1") : ""}" placeholder="e.g. 2:00"></label>
      <label class="f" style="grid-column:1/-1">Note for every week<input class="in" id="s-note" value="${esc(b.note || "")}" placeholder="Coaching cue shown to the client"></label>
      <label class="f" style="grid-column:1/-1">Video link (YouTube)<input class="in" id="s-video" value="${esc(b.video || "")}" placeholder="https://youtu.be/… — plays in the client’s exercise guide"></label>
    </div>
    <div class="fields"><span class="sub">Client records:</span>${Object.entries(LIBR.FIELD_NAMES).map(([k, n]) => `<label><input type="checkbox" class="s-f" value="${k}" ${f.includes(k) ? "checked" : ""}> ${n}</label>`).join("")}</div>
    <div class="form2">
      <label class="f">Format<select class="in" id="s-fmt"><option value="">Regular sets</option><option value="emom" ${fm.t === "emom" ? "selected" : ""}>EMOM</option><option value="interval" ${fm.t === "interval" ? "selected" : ""}>Intervals</option></select></label>
      <span></span>
      ${fm.t === "emom" ? `<label class="f">Every (m:ss)<input class="in" id="s-every" value="${mmss(fm.every || 60).replace(/^(\d+)s$/, "0:$1")}"></label><label class="f">Rounds<input class="in" id="s-rounds" type="number" min="1" value="${fm.rounds || 10}"></label>` : ""}
      ${fm.t === "interval" ? `<label class="f">Work (m:ss)<input class="in" id="s-work" value="${mmss(fm.work || 40).replace(/^(\d+)s$/, "0:$1")}"></label><label class="f">Rest (m:ss)<input class="in" id="s-irest" value="${mmss(fm.rest || 20).replace(/^(\d+)s$/, "0:$1")}"></label><label class="f">Rounds<input class="in" id="s-rounds" type="number" min="1" value="${fm.rounds || 8}"></label>` : ""}
    </div>
    <label class="fields"><input type="checkbox" id="s-warm" ${b.warmupSets ? "checked" : ""}> Add warm-up sets before this lift (the client app builds them from the first working set)</label>
    <div class="row"><button class="btn small" data-act="ex-change">Swap exercise…</button><span class="grow"></span><span class="sub">Changes save as you go.</span></div>`;
}
function openSettings(bi) { UI.editing = bi; const p = prog(cur()), b = p.days[UI.day].blocks[bi]; openModal(settingsHTML(p, b)); }
const cur = () => (location.hash.match(/^#program-(.+)$/) || [])[1];

/* ================= Events ================= */
let undoSnap = null;
document.addEventListener("click", (ev) => {
  const t = ev.target.closest("[data-act]"); if (!t) return;
  const a = t.dataset.act;
  if (a === "modal-bg" && ev.target !== t) return;
  const p = cur() ? prog(cur()) : null, day = p ? p.days[UI.day] : null;
  switch (a) {
    case "client-new": UI.confirm = "client-new"; route(); setTimeout(() => $("#nc-name")?.focus(), 0); break;
    case "cancel": UI.confirm = null; route(); break;
    case "reset-sample": db = seed(); save(); UI.confirm = null; renderTop(); route(); toast("Sample data reset."); break;
    case "prog-new": { const np = newProgram(t.dataset.c); UI.day = 0; location.hash = "#program-" + np.id; break; }
    case "prog-dup": UI.confirm = "dup:" + t.dataset.id; route(); break;
    case "dup-yes": { const src = prog(t.dataset.id), np = clone(src); np.id = uid("p"); np.clientId = $("#dup-to").value; np.name = src.name + " (copy)"; db.programs.push(np); save(); UI.confirm = null; location.hash = "#program-" + np.id; toast(`Copied to ${client(np.clientId).name}.`); break; }
    case "day": UI.day = +t.dataset.i; UI.confirm = null; route(); break;
    case "day-add": p.days.push({ id: uid("d"), name: `Day ${p.days.length + 1}`, weekday: null, note: "", warmup: "", blocks: [] }); UI.day = p.days.length - 1; save(); route(); break;
    case "day-rm": UI.confirm = "day-rm"; route(); break;
    case "day-rm-yes": undoSnap = clone(p); p.days.splice(UI.day, 1); UI.day = 0; UI.confirm = null; save(); route(); toast("Day deleted.", { act: "undo", label: "Undo" }); break;
    case "copy-col": { const w = +t.dataset.w; undoSnap = clone(p); for (const b of day.blocks) { b.weeks = b.weeks || []; b.weeks[w] = b.weeks[w - 1] || ""; } save(); route(); toast(`Copied week ${w} into week ${w + 1} for ${day.name}.`, { act: "undo", label: "Undo" }); break; }
    case "undo": if (undoSnap) { const i = db.programs.findIndex((x) => x.id === undoSnap.id); if (i >= 0) db.programs[i] = undoSnap; undoSnap = null; save(); route(); $("#toast").hidden = true; } break;
    case "b-add": openPicker("add"); break;
    case "b-up": case "b-down": { const i = +t.dataset.b, j = a === "b-up" ? i - 1 : i + 1; [day.blocks[i], day.blocks[j]] = [day.blocks[j], day.blocks[i]]; save(); route(); break; }
    case "b-rm": undoSnap = clone(p); day.blocks.splice(+t.dataset.b, 1); save(); route(); toast("Exercise removed.", { act: "undo", label: "Undo" }); break;
    case "ex-settings": openSettings(+t.dataset.b); break;
    case "ex-change": { const bi = UI.editing; openPicker("change"); UI.picker.bi = bi; break; }
    case "modal-close": case "modal-bg": closeModal(); route(); break;
    case "pick": case "pick-new": {
      let id = t.dataset.id;
      if (a === "pick-new") {
        const name = ($("#nx-name").value || "").trim(); if (!name) break;
        id = "c_" + name.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 30) + "_" + Math.random().toString(36).slice(2, 5);
        const fields = [...document.querySelectorAll(".nx-f:checked")].map((x) => x.value);
        db.custom[id] = { id, name, muscle: $("#nx-muscle").value.trim() || "Other", kind: $("#nx-kind").value.trim() || "other", track: "wr", fields: fields.length ? fields : ["w", "r"], video: $("#nx-video").value.trim() };
      }
      const pk = UI.picker;
      if (pk.mode === "change") { const b = day.blocks[pk.bi]; b.ex = id; b.fields = db.custom[id] && db.custom[id].fields || null; if (db.custom[id] && db.custom[id].video && !b.video) b.video = db.custom[id].video; save(); closeModal(); route(); openSettings(pk.bi); break; }
      const nb = { id: uid("b"), ex: id, group: null, rest: 0, note: "", video: (db.custom[id] && db.custom[id].video) || "", fields: (db.custom[id] && db.custom[id].fields) || null, format: null, warmupSets: false, weeks: Array(p.weeks).fill("") };
      day.blocks.push(nb); save(); closeModal(); route();
      setTimeout(() => document.querySelector(`[data-cell="${day.blocks.length - 1}:0"]`)?.focus(), 0);
      break;
    }
    case "download": {
      const blob = new Blob([JSON.stringify(p, null, 1)], { type: "application/json" }), url = URL.createObjectURL(blob);
      const el = document.createElement("a"); el.href = url; el.download = `${p.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.json`; document.body.appendChild(el); el.click(); el.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast("Saved. In the client app: Profile → Load a program file."); break;
    }
  }
});
document.addEventListener("input", (ev) => {
  const t = ev.target, p = cur() ? prog(cur()) : null;
  if (t.dataset.cell && p) {
    const [bi, w] = t.dataset.cell.split(":").map(Number), b = p.days[UI.day].blocks[bi];
    b.weeks = b.weeks || []; b.weeks[w] = t.value; save();
    t.parentElement.querySelector(".pv").outerHTML = cellPreview(t.value);
    t.parentElement.classList.toggle("off", !t.value.trim());
    return;
  }
  if (t.id === "pick-q" && UI.picker) { UI.picker.q = t.value; $("#pick-list").innerHTML = pickerHTML(t.value); return; }
  if (t.id === "cnotes") { client(t.dataset.c).notes = t.value; save(); return; }
  if (p && ["p-name", "d-name", "d-note", "d-warm"].includes(t.id)) {
    if (t.id === "p-name") p.name = t.value; else p.days[UI.day][{ "d-name": "name", "d-note": "note", "d-warm": "warmup" }[t.id]] = t.value;
    save(); if (t.id === "d-name") document.querySelector(`.dtab[aria-pressed="true"]`).lastChild.textContent = t.value; return;
  }
  if (UI.editing != null && p && ["s-group", "s-rest", "s-note", "s-video", "s-every", "s-rounds", "s-work", "s-irest"].includes(t.id)) applySettings(p);
});
document.addEventListener("change", (ev) => {
  const t = ev.target, p = cur() ? prog(cur()) : null;
  if (t.id === "me") { db.me = t.value; save(); route(); return; }
  if (UI.editing != null && p && (t.classList.contains("s-f") || ["s-fmt", "s-warm"].includes(t.id))) { applySettings(p); if (t.id === "s-fmt") openSettings(UI.editing); return; }
  if (!p) return;
  if (t.id === "p-weeks") { const n = Math.max(1, Math.min(16, Math.round(+t.value || 1))); p.weeks = n; for (const d of p.days) for (const b of d.blocks) { b.weeks = b.weeks || []; while (b.weeks.length < n) b.weeks.push(""); } save(); route(); }
  else if (t.id === "p-sched") { p.schedule = t.value; save(); route(); }
  else if (t.id === "p-start") { p.startDate = t.value; save(); route(); }
  else if (t.id === "d-wd") { p.days[UI.day].weekday = t.value === "" ? null : +t.value; save(); route(); }
  else if (t.id === "pv-week") { UI.previewWeek = +t.value; route(); }
  else if (t.dataset.cell || ["d-note", "d-warm", "p-name"].includes(t.id)) { const pv = $("#pv"); if (pv) pv.innerHTML = previewHTML(p, p.days[UI.day]); } // refresh only the client preview, keep focus
});
function applySettings(p) {
  const b = p.days[UI.day].blocks[UI.editing]; if (!b) return;
  b.group = ($("#s-group").value || "").trim().toUpperCase() || null;
  b.rest = parseTime($("#s-rest").value);
  b.note = $("#s-note").value.trim();
  b.video = $("#s-video").value.trim();
  const f = [...document.querySelectorAll(".s-f:checked")].map((x) => x.value);
  const def = defaultFields(b.ex); b.fields = f.length && f.join() !== def.join() ? f : null;
  const fmt = $("#s-fmt").value;
  b.format = fmt === "emom" ? { t: "emom", every: parseTime($("#s-every")?.value) || 60, rounds: +($("#s-rounds")?.value) || 10 }
    : fmt === "interval" ? { t: "interval", work: parseTime($("#s-work")?.value) || 40, rest: parseTime($("#s-irest")?.value) || 20, rounds: +($("#s-rounds")?.value) || 8 } : null;
  b.warmupSets = $("#s-warm").checked;
  save();
}
document.addEventListener("submit", (ev) => {
  if (ev.target.id !== "newclient") return; ev.preventDefault();
  const name = $("#nc-name").value.trim(); if (!name) return;
  const c = { id: uid("k"), name, email: $("#nc-email").value.trim(), coachId: $("#nc-coach").value, remote: $("#nc-remote").value === "1", notes: "" };
  db.clients.push(c); save(); UI.confirm = null; location.hash = "#client-" + c.id;
});
document.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && $("#modal").innerHTML) { closeModal(); route(); } });
window.addEventListener("hashchange", () => { UI.confirm = null; closeModal(); route(); window.scrollTo(0, 0); });

load(); renderTop(); route();
})();
