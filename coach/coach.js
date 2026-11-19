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
const dateLabel = (iso) => !iso ? "" : new Date(iso.length === 10 ? iso + "T12:00:00" : iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
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
// An exercise as coaches see it. The gym's built-in exercises can be edited or deleted: those changes are kept in
// db.custom under the same id (only what changed, plus deleted: true) and laid over the original.
const exMeta = (id) => { const l = LIB[id], c = db.custom[id]; return l ? (c ? { ...l, ...c, id } : l) : c || { id, name: id, kind: "other", muscle: "Other", track: "wr" }; };
const isBuiltIn = (id) => !!LIB[id];
const allEx = (withDeleted) => [...new Set([...Object.keys(LIB), ...Object.keys(db.custom)])].map(exMeta).filter((m) => m && m.name && (withDeleted || !m.deleted));
const defaultFields = (id) => LIBR.TRACK_FIELDS[exMeta(id).track || "wr"] || ["w", "r"];
const fieldsText = (f) => f.map((k) => LIBR.FIELD_NAMES[k].toLowerCase()).join(", ");

/* ================= Data (this browser until accounts are live) ================= */
const KEY = "ppc1.db";
let db = null;
function load() { try { db = JSON.parse(localStorage.getItem(KEY)); } catch { db = null; } if (!db || !db.v) db = seed(); migrate(db); }
function migrate(d) {
  d.maxTemplates = d.maxTemplates || [{ id: "mt1", name: "Squat, bench, deadlift", lifts: ["squat", "bench", "deadlift"] }];
  d.dayNotes = d.dayNotes || {};
  d.warmupDefault = P.warmupDefaultOf(d.warmupDefault);
  for (const c of d.clients) c.maxes = c.maxes || {};
  d.v = 2;
}
let saveT = null;
function save() {
  clearTimeout(saveT);
  if (db.cloud) { saveT = setTimeout(() => { saveT = null; pushCloud(); }, 500); return; }
  saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { toast("Couldn’t save in this browser. Free some space and try again."); } }, 250);
}
window.addEventListener("pagehide", () => { if (db && db.cloud) { if (saveT) { clearTimeout(saveT); saveT = null; pushCloud(); } return; } clearTimeout(saveT); try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {} });
window.addEventListener("beforeunload", (e) => { if (db && db.cloud && (saveT || pushing || pushFailed)) { e.preventDefault(); e.returnValue = ""; } });
const pid = () => (crypto.randomUUID ? crypto.randomUUID() : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)));

/* ================= Data: the gym's Supabase project ================= */
// Everything loads into the same `db` shape the dashboard always used. After each change, save() compares
// db with what was last loaded or saved and writes only the rows that changed.
const Cloud = window.PPCloud;
let meUser = null, snap = null, pushing = false, pushAgain = false, pushFailed = false, loadedAt = 0;
async function loadCloud() {
  const c = Cloud.client(), q = (t, cols) => c.from(t).select(cols);
  const [pf, cn, mx, pr, wo, dn, gs] = await Promise.all([
    q("profiles", "id,role,name,email,coach_id,remote,created_at").order("created_at"),
    q("client_notes", "client_id,note"),
    q("client_maxes", "client_id,ex,rm5,rm1,target,pending"),
    q("programs", "id,client_id,name,data,updated_at"),
    q("workouts", "id,client_id,done_at,data").order("done_at", { ascending: false }).limit(3000),
    q("day_notes", "client_id,day,note"),
    q("gym_settings", "key,data"),
  ]);
  const bad = [pf, cn, mx, pr, wo, dn, gs].find((r) => r.error); if (bad) throw bad.error;
  const d = { v: 2, sample: false, cloud: true, me: meUser.id, coaches: [], clients: [], programs: [], logs: [], custom: {}, dayNotes: {} };
  for (const p of pf.data) {
    const name = p.name || p.email || "Unnamed";
    if (p.role === "coach") d.coaches.push({ id: p.id, name });
    else d.clients.push({ id: p.id, name, email: p.email, coachId: p.coach_id, remote: !!p.remote, notes: "", maxes: {} });
  }
  const cl = (id) => d.clients.find((x) => x.id === id);
  for (const n of cn.data) { const k = cl(n.client_id); if (k) k.notes = n.note || ""; }
  for (const m of mx.data) { const k = cl(m.client_id); if (!k) continue; const o = {}; for (const f of ["rm5", "rm1", "target"]) if (m[f] != null && +m[f] > 0) o[f] = +m[f]; if (m.pending) o.pending = m.pending; k.maxes[m.ex] = o; }
  const rows = [...pr.data].sort((a, b) => ((a.data && a.data.startDate) || "").localeCompare((b.data && b.data.startDate) || "") || (a.updated_at || "").localeCompare(b.updated_at || ""));
  for (const r of rows) { const p = { ...(r.data || {}) }; delete p.exercises; delete p.maxes; p.id = r.id; p.clientId = r.client_id; p.template = !r.client_id; p.name = p.name || r.name || "Program"; d.programs.push(p); }
  for (const r of wo.data) d.logs.push({ ...(r.data || {}), id: r.id, clientId: r.client_id });
  for (const n of dn.data) (d.dayNotes[n.client_id] = d.dayNotes[n.client_id] || {})[n.day] = n.note;
  const s = (gs.data.find((x) => x.key === "coach") || {}).data || {};
  d.custom = s.custom || {}; if (s.maxTemplates) d.maxTemplates = s.maxTemplates; if (s.warmupDefault) d.warmupDefault = s.warmupDefault;
  migrate(d);
  return d;
}
// db as database rows, keyed so two snapshots can be compared.
function rowsOf(d) {
  const out = { prof: {}, note: {}, max: {}, prog: {}, day: {}, set: {} };
  for (const c of d.clients) {
    out.prof[c.id] = { coach_id: c.coachId || null, remote: !!c.remote };
    out.note[c.id] = { client_id: c.id, note: c.notes || "" };
    for (const [ex, m] of Object.entries(c.maxes || {})) out.max[c.id + "|" + ex] = { client_id: c.id, ex, rm5: m.rm5 ?? null, rm1: m.rm1 ?? null, target: m.target ?? null, pending: m.pending || null };
  }
  for (const p of d.programs) {
    const used = new Set((p.days || []).flatMap((x) => (x.blocks || []).map((b) => b.ex)));
    const data = { ...p, warmupDefault: d.warmupDefault, exercises: Object.fromEntries(Object.entries(d.custom || {}).filter(([id]) => used.has(id))) };
    delete data.clientId; delete data.template;
    out.prog[p.id] = { id: p.id, client_id: p.template ? null : p.clientId || null, name: p.name || "", data };
  }
  for (const [cid, days] of Object.entries(d.dayNotes || {})) for (const [day, note] of Object.entries(days)) if (note) out.day[cid + "|" + day] = { client_id: cid, day, note };
  out.set.coach = { key: "coach", data: { custom: d.custom || {}, maxTemplates: d.maxTemplates || [], warmupDefault: d.warmupDefault } };
  return out;
}
const hashRows = (r) => Object.fromEntries(Object.entries(r).map(([k, m]) => [k, Object.fromEntries(Object.entries(m).map(([id, v]) => [id, Cloud.hash(v)]))]));
async function pushCloud() {
  if (!snap) return;
  if (pushing) { pushAgain = true; return; }
  pushing = true;
  const c = Cloud.client(), now = rowsOf(db), h = hashRows(now), ts = new Date().toISOString();
  const changed = (k) => Object.keys(h[k]).filter((id) => snap[k][id] !== h[k][id]);
  const removed = (k) => Object.keys(snap[k]).filter((id) => !(id in h[k]));
  const ok = (r) => { if (r.error) throw r.error; };
  const up = async (k, table, extra) => {
    const ids = changed(k); if (!ids.length) return;
    ok(await c.from(table).upsert(ids.map((id) => ({ ...now[k][id], ...extra(id) }))));
    for (const id of ids) snap[k][id] = h[k][id];
  };
  try {
    for (const id of changed("prof")) { ok(await c.from("profiles").update(now.prof[id]).eq("id", id)); snap.prof[id] = h.prof[id]; }
    await up("note", "client_notes", () => ({ updated_at: ts }));
    await up("max", "client_maxes", () => ({ updated_at: ts }));
    await up("prog", "programs", (id) => ({ updated_at: ts, ...(snap.prog[id] ? {} : { created_by: meUser.id }) }));
    await up("day", "day_notes", () => ({ author_id: meUser.id, updated_at: ts }));
    await up("set", "gym_settings", () => ({ updated_at: ts }));
    for (const id of removed("max")) { const [cid, ex] = id.split("|"); ok(await c.from("client_maxes").delete().eq("client_id", cid).eq("ex", ex)); delete snap.max[id]; }
    for (const id of removed("day")) { const [cid, day] = id.split("|"); ok(await c.from("day_notes").delete().eq("client_id", cid).eq("day", day)); delete snap.day[id]; }
    for (const id of removed("prog")) { ok(await c.from("programs").delete().eq("id", id)); delete snap.prog[id]; }
    if (pushFailed) toast("Saved.");
    pushFailed = false;
  } catch (e) {
    if (!pushFailed) toast(`Couldn’t save: ${Cloud.friendly(e)} Your changes are kept here and will save on your next change.`);
    pushFailed = true;
  } finally {
    pushing = false;
    if (pushAgain) { pushAgain = false; pushCloud(); }
  }
}
// Pick up other coaches' changes and new workouts when coming back to this tab, unless something is being edited.
async function refreshCloud() {
  if (!db || !db.cloud || saveT || pushing || pushFailed || Date.now() - loadedAt < 30000) return;
  if ($("#modal").innerHTML || UI.confirm || /^#program-/.test(location.hash)) return;
  const a = document.activeElement; if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.id !== "me") return;
  try { const d = await loadCloud(); if (saveT || pushing) return; db = d; snap = hashRows(rowsOf(db)); loadedAt = Date.now(); renderTop(); route(); loadMessages().catch(() => {}); } catch {}
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") refreshCloud(); });
window.addEventListener("focus", refreshCloud);
async function boot() {
  if (!Cloud || !Cloud.client()) { load(); renderTop(); route(); toast("Can’t reach the gym’s account server. This is sample data, saved only in this browser."); return; }
  $("#view").innerHTML = `<div class="empty">Loading…</div>`;
  let s = await Cloud.session();
  if (!s || Cloud.isRecovery()) s = await Cloud.authScreen({ app: "Power Plant Coach", sub: "For coaches. Use the email that’s on the gym’s coach list." });
  meUser = s.user;
  try { db = await loadCloud(); } catch (e) { $("#view").innerHTML = `<section class="panel"><h1>Couldn’t load the gym’s data</h1><p>${esc(Cloud.friendly(e))}</p><button class="btn" data-act="reload">Try again</button></section>`; return; }
  if (!db.coaches.some((x) => x.id === meUser.id)) {
    $("#view").innerHTML = `<section class="panel"><h1>This isn’t a coach account</h1><p>You’re signed in as ${esc(meUser.email)}, which isn’t on the gym’s coach list. Sign in with your coach email, or ask the gym to add this one as a coach.</p><button class="btn" data-act="signout">Sign out</button></section>`;
    $("#me").closest("label").hidden = true; return;
  }
  snap = hashRows(rowsOf(db)); loadedAt = Date.now();
  renderTop(); route();
  loadMessages().catch(() => {}); subscribeMessages();
}
const appLink = () => new URL("../app/", location.href).href;

/* ================= Messages ================= */
// One conversation per client; any coach can answer. Kept out of `db` (it isn't edited, only added to), loaded on
// sign-in and kept live. A client's message counts as unread until any coach opens that conversation.
const PM = window.PPMessages;
const MS = { list: [], ch: null, drafts: {}, loom: {}, sending: false, err: "" };
const convOf = (cid) => MS.list.filter((m) => m.client_id === cid);
const unreadOf = (cid) => MS.list.filter((m) => m.client_id === cid && m.sender_id === cid && !m.read_at).length;
function msgBadge() { const el = $("#msg-badge"); if (!el || !db || !db.cloud) return; const n = MS.list.filter((m) => m.sender_id === m.client_id && !m.read_at).length; el.textContent = n > 99 ? "99+" : String(n); el.hidden = !n; }
async function loadMessages() {
  if (!db || !db.cloud) return;
  const r = await Cloud.client().from("messages").select(PM.COLS).order("created_at", { ascending: true }).limit(5000);
  if (r.error) return;
  const changed = Cloud.hash(r.data) !== Cloud.hash(MS.list);
  MS.list = r.data; msgBadge();
  if (!changed) return;
  const h = location.hash;
  if (h === "#messages") route();
  else if (/^#client-/.test(h) && UI.clientTab === "messages") refreshConv();
  else if (h === "#feed" || /^#client-/.test(h)) { const a = document.activeElement; if (!(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) route(); }
}
function subscribeMessages() {
  const c = Cloud.client(); if (!c.channel || MS.ch) return;
  MS.ch = c.channel("coach-msgs").on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => loadMessages()).subscribe();
}
async function markRead(cid) {
  if (!unreadOf(cid) || document.visibilityState !== "visible") return;
  const now = new Date().toISOString();
  const { error } = await Cloud.client().from("messages").update({ read_at: now }).eq("client_id", cid).eq("sender_id", cid).is("read_at", null);
  if (!error) { for (const m of MS.list) if (m.client_id === cid && m.sender_id === cid && !m.read_at) m.read_at = now; msgBadge(); }
}
function msgTag(m) {
  const l = m.workout_id && db.logs.find((x) => x.id === m.workout_id);
  return m.ex || l ? `Form check${m.ex ? " · " + esc(exMeta(m.ex).name) : ""}${l ? " · " + esc(dateLabel(l.date)) + " " + esc(l.name || "") : ""}` : "";
}
function convListHTML(cid) {
  const list = convOf(cid), c = client(cid);
  if (!list.length) return `<div class="pm-empty">No messages with ${esc(c ? c.name : "this client")} yet.</div>`;
  return list.map((m) => {
    const mine = m.sender_id === meUser.id, coach = db.coaches.find((x) => x.id === m.sender_id);
    return PM.bubble(m, { mine, who: mine ? "You" : coach ? coach.name : c ? c.name : "Client", tag: msgTag(m) });
  }).join("");
}
function conversationHTML(cid) {
  PM.css();
  const c = client(cid);
  return `<section class="panel"><div class="pm-list" id="conv">${convListHTML(cid)}</div></section>
    <section class="panel conv-compose"><h2>Reply</h2>
      <textarea class="in" id="cm-body" data-c="${cid}" rows="3" placeholder="Write to ${esc(c ? c.name : "the client")}. Every coach can see this conversation.">${esc(MS.drafts[cid] || "")}</textarea>
      <label class="f">Loom video link (optional)<input class="in" id="cm-loom" data-c="${cid}" inputmode="url" placeholder="https://www.loom.com/share/…" value="${esc(MS.loom[cid] || "")}"></label>
      <div id="cm-err">${MS.err ? `<span class="sub" role="alert" style="color:var(--bad)">${esc(MS.err)}</span>` : ""}</div>
      <div class="row"><button class="btn primary" data-act="cm-send" data-c="${cid}" ${MS.sending ? "disabled" : ""}>${MS.sending ? "Sending…" : "Send"}</button></div></section>`;
}
function refreshConv() { const el = $("#conv"); const cid = (location.hash.match(/^#client-(.+)$/) || [])[1]; if (!el || !cid) return; el.innerHTML = convListHTML(cid); PM.hydrate(el); el.lastElementChild?.scrollIntoView({ block: "nearest" }); markRead(cid); }
function renderInbox() {
  setNav("messages"); PM.css();
  const byClient = new Map();
  for (const m of MS.list) byClient.set(m.client_id, m); // the list is oldest first, so this keeps the latest
  const rows = [...byClient.entries()].sort((a, b) => (a[1].created_at < b[1].created_at ? 1 : -1)).map(([cid, m]) => {
    const c = client(cid), n = unreadOf(cid), fromClient = m.sender_id === cid;
    const snip = m.body || (m.video_path ? "🎥 Form-check video" : m.loom_url ? "🎥 Loom video" : "");
    return `<a class="panel${n ? " unread" : ""}" href="#client-${cid}" data-act="open-conv" data-c="${cid}"><b>${esc(c ? c.name : "Former client")}</b>${n ? `<span class="nbadge">${n}</span>` : ""}
      <span class="snip">${fromClient ? "" : "Coach: "}${esc(snip)}</span><span class="sub">${esc(PM.when(m.created_at))}</span></a>`;
  }).join("");
  $("#view").innerHTML = `<div class="row"><div class="grow"><div class="eyebrow">Every client’s conversation, newest first · any coach can answer</div><h1>Messages</h1></div></div>
    <div class="inbox">${rows || `<div class="empty">No messages yet. When a client sends a message or a form-check video from the app, it shows up here.</div>`}</div>`;
}
async function sendCoachMessage(cid) {
  if (MS.sending) return;
  const body = ($("#cm-body")?.value || "").trim(), loomRaw = ($("#cm-loom")?.value || "").trim(), loom = PM.cleanLink(loomRaw);
  const errEl = () => $("#cm-err"), show = (t) => { MS.err = t; const e = errEl(); if (e) e.innerHTML = t ? `<span class="sub" role="alert" style="color:var(--bad)">${esc(t)}</span>` : ""; };
  if (!body && !loomRaw) return show("Write a reply or paste a Loom link first.");
  if (loomRaw && !loom) return show("That Loom link doesn’t look like a web address. Copy it from Loom’s Share button.");
  MS.sending = true; show(""); const btn = $("[data-act='cm-send']"); if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }
  const { error } = await Cloud.client().from("messages").insert({ client_id: cid, sender_id: meUser.id, body, loom_url: loom || null });
  MS.sending = false;
  if (error) { if (btn) { btn.disabled = false; btn.textContent = "Send"; } return show("Couldn’t send: " + Cloud.friendly(error)); }
  MS.drafts[cid] = ""; MS.loom[cid] = ""; MS.err = "";
  await loadMessages(); route();
}
function seed() {
  const d = { v: 2, sample: true, me: "c1", coaches: [{ id: "c1", name: "You" }, { id: "c2", name: "Second coach (sample)" }], clients: [], programs: [], logs: [], custom: {}, dayNotes: {} };
  d.clients = [
    { id: "k1", name: "Sample client: Alex", email: "", coachId: "c1", remote: true, notes: "Remote client. Old left knee irritation, watch deep knee flexion.",
      maxes: { squat: { rm5: 185 }, bench: { rm5: 130, rm1: 160, target: 155 }, trap_dl: { rm5: 230, pending: { rm5: 245, suggested: 300, at: new Date(Date.now() - 2 * 864e5).toISOString() } } } },
    { id: "k2", name: "Sample client: Jordan", email: "", coachId: "c1", remote: false, notes: "Training for first strongman show in spring." },
    { id: "k3", name: "Sample client: Sam", email: "", coachId: "c2", remote: false, notes: "" },
  ];
  const pr = PPSample.program(); pr.id = "p1"; pr.clientId = "k1"; pr.name = "Strength Block 1"; pr.coach = "You"; pr.sample = false;
  pr.days[0].warmup = "5 min bike, 10 bodyweight squats, 10 glute bridges, 2 rounds.";
  d.programs.push(pr);
  // Sample logged workouts, built from the program's first week so the feed has something to show.
  pr.startDate = (() => { const x = new Date(); x.setDate(x.getDate() - ((x.getDay() + 6) % 7) - 7); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; })(); // started last week
  const c = P.compile(pr), max = { squat: 225, bench: 155, trap_dl: 280 };
  const loadW = (ex, g) => (g.load && g.load.t === "pct" && max[ex] ? Math.round((max[ex] * g.load.v) / 100 / 5) * 5 : g.load && (g.load.t === "lb") ? g.load.v : g.load && g.load.t === "rpe" ? ({ rdl: 135, row: 115, bulgarian: 25, db_shoulder: 30, face_pull: 40 }[ex] || 0) : 0);
  const notes = { squat: "Left knee felt a little tight on the last back-off set, a bit of pain going down.", sled_push: "Turf was slippery today." };
  c.weeks[0].days.forEach((day, di) => {
    if (di === 1) return; // week 1 Wednesday was missed
    const date = day.date + "T17:30:00";
    d.logs.push({ id: uid("l"), clientId: "k1", date, name: `Week 1 · ${day.name}`, prog: { id: pr.id, w: 0, d: di }, minutes: 52 + di * 4, note: di === 0 ? "Slept badly, energy was low at the start." : "",
      prs: di === 2 ? ["Trap Bar Deadlift: 245×5"] : [], maxes: di === 2 ? [{ ex: "trap_dl", name: "Trap Bar Deadlift", rm5: 245, prev: 230, suggested: 300 }] : [],
      exercises: day.items.map((it) => ({ ex: it.ex, rx: P.prescriptionText(it), rxSets: it.groups.reduce((n, g) => n + g.sets, 0), rxReps: (it.groups[0] || {}).reps || 0, note: notes[it.ex] || "",
        sets: it.groups.flatMap((g) => Array.from({ length: g.sets }, (_, k) => ({ w: it.ex === "trap_dl" && k === 0 ? 245 : loadW(it.ex, g), r: it.ex === "rdl" && k === 2 ? 6 : g.reps || (g.dist || g.time ? 0 : 8), s: g.time || (g.dist ? 14 + Math.round(Math.random() * 4) : 0), d: g.dist || 0 }))) })) });
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
const UI = { day: 0, previewWeek: 0, editing: null, picker: null, confirm: null, clientTab: "calendar", calMonth: null, feedFlagged: false };
function route() {
  const h = location.hash.slice(1);
  let m;
  if ((m = h.match(/^program-(.+)$/)) && db.programs.find((p) => p.id === m[1])) return renderProgram(m[1]);
  if ((m = h.match(/^client-(.+)$/)) && client(m[1])) return renderClient(m[1]);
  if (h === "feed") return renderFeed();
  if (h === "messages" && db.cloud) return renderInbox();
  if (h === "templates") return renderTemplates();
  if (h === "settings") return renderSettings();
  if (h === "exercises") return renderExercises();
  return renderClients();
}
function setNav(k) { document.querySelectorAll("[data-nav]").forEach((a) => a.setAttribute("aria-current", a.dataset.nav === k ? "page" : "false")); }
function renderTop() {
  if (db.cloud) {
    $("#me").innerHTML = `<option>${esc(me().name)}</option>`; $("#me").disabled = true;
    if (!$("#signout")) $("#me").closest("label").insertAdjacentHTML("afterend", `<button class="btn small ghost" id="signout" data-act="signout">Sign out</button>`);
  } else $("#me").innerHTML = db.coaches.map((c) => `<option value="${c.id}" ${c.id === db.me ? "selected" : ""}>${esc(c.name)}</option>`).join("");
  $("#sample-pill").hidden = !db.sample;
  const ml = document.querySelector('[data-nav="messages"]'); if (ml) ml.hidden = !db.cloud;
  msgBadge();
}

function renderClients() {
  setNav("clients");
  const rows = db.clients.map((c) => {
    const ps = programsOf(c.id), cur = ps[ps.length - 1], last = logsOf(c.id)[0], pend = Object.values(c.maxes || {}).some((m) => m.pending), lf = last ? logFlags(last) : null;
    const coach = db.coaches.find((x) => x.id === c.coachId);
    return `<a class="panel ccard" href="#client-${c.id}"><b>${esc(c.name)}</b>
      <span class="sub">${coach ? "Coach: " + esc(coach.name) : ""}${c.remote ? " · Remote" : " · In person"}</span>
      <span>${cur ? `${esc(cur.name)} · <span class="sub">${esc(programWeekNow(cur) || "")}</span>` : `<span class="sub">No program yet</span>`}</span>
      <span class="sub">${last ? `Last workout ${dateLabel(last.date)}: ${esc(last.name)}` : "No workouts logged yet"}</span>
      ${pend || (lf && lf.any) ? `<span class="flags">${pend ? `<span class="flag pr">Target max to review</span>` : ""}${lf && lf.pain.length ? `<span class="flag pain">Pain noted</span>` : ""}${lf && lf.missed.length ? `<span class="flag miss">Missed reps</span>` : ""}</span>` : ""}</a>`;
  }).join("");
  $("#view").innerHTML = `<div class="row"><div class="grow"><div class="eyebrow">${db.clients.length} clients · everyone’s clients are visible to every coach</div><h1>Clients</h1></div>
      <button class="btn primary" data-act="client-new">+ Add client</button></div>
    ${UI.confirm === "client-new" && db.cloud ? `<section class="panel"><h2>Add a client</h2>
        <p>Clients make their own account in the app, so their workouts save to them. Send them this link and have them tap <b>Create an account</b> with their email:</p>
        <div class="row"><a href="${esc(appLink())}" target="_blank" rel="noopener">${esc(appLink())}</a><button class="btn small" data-act="copy-link">Copy link</button></div>
        <p class="sub">They appear in this list once they’ve confirmed their email. Then open their page to set their main coach and whether they train in person or remotely.</p>
        <div class="row"><button type="button" class="btn ghost" data-act="cancel">Close</button></div></section>` : ""}
    ${UI.confirm === "client-new" && !db.cloud ? `<form class="panel" id="newclient"><h2>New client</h2><div class="form2">
        <label class="f">Name<input class="in" id="nc-name" required></label><label class="f">Email (for their invite, once accounts are live)<input class="in" id="nc-email" type="email"></label>
        <label class="f">Coach<select class="in" id="nc-coach">${db.coaches.map((c) => `<option value="${c.id}" ${c.id === db.me ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label>
        <label class="f">Training<select class="in" id="nc-remote"><option value="0">In person</option><option value="1">Remote</option></select></label></div>
        <div class="row"><button class="btn primary">Add client</button><button type="button" class="btn ghost" data-act="cancel">Cancel</button></div></form>` : ""}
    <div class="clients">${rows || `<div class="empty">No clients yet.</div>`}</div>
    ${db.sample ? `<p class="sub">These are sample clients so you can try the dashboard. They’re saved only in this browser. <button class="btn small ghost" data-act="reset-sample">Start over with fresh sample data</button></p>` : ""}`;
}

function setsText(e) {
  return (e.sets || []).filter((x) => x.t !== "w").map((x) => [x.w ? x.w + (x.r ? "×" + x.r : "") : x.r ? x.r + " reps" : "", x.d ? x.d + "yd" : "", x.s ? mmss(x.s) : "", x.h ? x.h + "in" : ""].filter(Boolean).join(" ")).join(", ");
}
const rxStr = (e) => (typeof e.rx === "string" ? e.rx : e.rx ? P.prescriptionText(e.rx) : "");
// What a coach should notice in a finished workout: PRs and new maxes, missed reps or sets, pain.
const PAIN = /\b(pain|painful|hurt|hurts|hurting|tweak|tweaked|injur|sharp|pinch|strain|sore knee|sore back|sore shoulder)/i;
function logFlags(l) {
  const f = { pr: [...(l.prs || []), ...(l.maxes || []).map((m) => `New 5RM: ${m.name || exMeta(m.ex).name} ${m.rm5}`)], missed: [], pain: [] };
  for (const e of l.exercises || []) {
    const name = exMeta(e.ex).name, rx = e.rx && typeof e.rx === "object" ? e.rx : null;
    const want = rx && rx.groups ? rx.groups.reduce((n, g) => n + g.sets, 0) : e.rxSets || 0;
    const work = (e.sets || []).filter((x) => x.t !== "w");
    if (want && work.length < want) f.missed.push(`${name}: ${work.length} of ${want} sets`);
    const minReps = rx && rx.groups ? Math.min(...rx.groups.filter((g) => g.reps && !g.amrap).map((g) => g.reps)) : e.rxReps || 0;
    if (minReps > 0 && isFinite(minReps) && work.some((x) => x.r > 0 && x.r < minReps)) f.missed.push(`${name}: under ${minReps} reps`);
    if (PAIN.test(e.note || "")) f.pain.push(`${name}: “${e.note}”`);
  }
  if (PAIN.test(l.note || "")) f.pain.push(`“${l.note}”`);
  f.any = f.pr.length + f.missed.length + f.pain.length > 0;
  return f;
}
function logCardHTML(l, showClient) {
  try { return logCardInner(l, showClient); } catch (e) {
    console.error("Couldn't show workout", l && l.id, e);
    return `<article class="panel wcard"><div class="hd"><b>${esc((l && l.name) || "Workout")}</b><span class="sub">${l && l.date ? dateLabel(l.date) : ""}</span></div><div class="sub">This workout couldn’t be shown in full.</div></article>`;
  }
}
function logCardInner(l, showClient) {
  const f = logFlags(l), c = client(l.clientId);
  return `<article class="panel wcard${f.pain.length ? " has-pain" : ""}"><div class="hd"><b>${showClient && c ? `<a href="#client-${c.id}">${esc(c.name)}</a> · ` : ""}${esc(l.name)}</b><span class="sub">${dateLabel(l.date)}${l.minutes ? ` · ${l.minutes} min` : ""}${l.volume ? ` · ${l.volume.toLocaleString()} lb lifted` : ""}</span></div>
    ${f.any ? `<div class="flags">${f.pr.map((x) => `<span class="flag pr">PR · ${esc(x)}</span>`).join("")}${f.missed.map((x) => `<span class="flag miss">Missed · ${esc(x)}</span>`).join("")}${f.pain.map((x) => `<span class="flag pain">Pain · ${esc(x)}</span>`).join("")}</div>` : ""}
    ${l.note ? `<div class="cnote">“${esc(l.note)}”</div>` : ""}
    ${(() => { const fc = MS.list.filter((m) => m.workout_id === l.id && m.video_path); return fc.length ? `<a class="fcl" href="#client-${l.clientId}" data-act="open-conv" data-c="${l.clientId}">🎥 ${fc.length === 1 ? "Form-check video" : fc.length + " form-check videos"}${fc[0].ex ? ` · ${esc(exMeta(fc[0].ex).name)}` : ""}: open in messages</a>` : ""; })()}
    ${(l.exercises || []).map((e) => `<div class="wex"><span><b>${esc(exMeta(e.ex).name)}</b><br><span class="rx">${esc(rxStr(e))}</span></span><span class="num">${esc(setsText(e))}${e.note ? `<div class="cnote" style="margin-top:6px">“${esc(e.note)}”</div>` : ""}</span></div>`).join("")}
  </article>`;
}
const logsOf = (cid) => db.logs.filter((l) => l.clientId === cid).sort((a, b) => (a.date < b.date ? 1 : -1));

/* ---- Maxes ---- */
const UNITS = "lb";
function maxesCardHTML(c) {
  const ids = Object.keys(c.maxes);
  const rows = ids.map((id) => {
    const m = c.maxes[id], est = P.est1RM(m.rm5, UNITS), tgt = P.targetOf(m, UNITS);
    return `<tr><th>${esc(exMeta(id).name)}${m.pending ? `<div class="pend">New 5RM ${m.pending.rm5} logged → target ${m.pending.suggested}? <button class="btn small primary" data-act="max-approve" data-c="${c.id}" data-ex="${esc(id)}">Approve</button><button class="btn small ghost" data-act="max-dismiss" data-c="${c.id}" data-ex="${esc(id)}">Not yet</button></div>` : ""}</th>
      <td><input class="in num" data-mx="${c.id}|${esc(id)}|rm5" value="${m.rm5 || ""}" inputmode="decimal" aria-label="${esc(exMeta(id).name)} 5RM"></td>
      <td class="num sub">${est || "–"}</td>
      <td><input class="in num" data-mx="${c.id}|${esc(id)}|rm1" value="${m.rm1 || ""}" inputmode="decimal" aria-label="${esc(exMeta(id).name)} tested 1RM"></td>
      <td><input class="in num tgt" data-mx="${c.id}|${esc(id)}|target" value="${m.target || ""}" placeholder="${tgt || ""}" inputmode="decimal" aria-label="${esc(exMeta(id).name)} target max"></td>
      <td><button class="icon" data-act="max-rm" data-c="${c.id}" data-ex="${esc(id)}" aria-label="Stop tracking ${esc(exMeta(id).name)}">✕</button></td></tr>`;
  }).join("");
  const tracked = new Set(ids);
  const opts = allEx().filter((m) => !tracked.has(m.id)).map((m) => `<option value="${esc(m.id)}">${esc(m.name)}</option>`).join("");
  return `<section class="panel"><div class="row"><h2 class="grow">Maxes</h2><span class="sub">lb</span></div>
    ${rows ? `<table class="maxt"><thead><tr><th>Lift</th><th>5RM</th><th>Est. 1RM</th><th>Tested 1RM</th><th>Target max</th><th></th></tr></thead><tbody>${rows}</tbody></table>` : `<div class="empty">No maxes tracked yet.</div>`}
    <p class="sub">Percentages in this client’s programs use the <b>target max</b>. Leave it blank to use the tested 1RM, or the estimate (5RM ÷ 0.83, rounded up to 5). New 5RMs the client logs are saved here; a new target waits for your OK.</p>
    <div class="row"><select class="in" id="mx-add" data-c="${c.id}"><option value="">+ Track a lift…</option>${opts}</select>
      <select class="in" id="mx-tpl" data-c="${c.id}"><option value="">Apply a max group…</option>${db.maxTemplates.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join("")}</select>
      ${ids.length ? `<button class="btn small ghost" data-act="mx-save-tpl" data-c="${c.id}">Save these lifts as a group</button>` : ""}</div></section>`;
}

/* ---- Calendar (completed green, missed red, upcoming white; private coach notes flagged) ---- */
function scheduledFor(cid) {
  const out = [];
  for (const p of programsOf(cid)) {
    if (p.schedule !== "weekly" || !p.startDate) continue;
    const cp = P.compile(p);
    cp.weeks.forEach((wk, w) => wk.days.forEach((day, d) => { if (day.date) out.push({ date: day.date, p, w, d, day }); }));
  }
  return out;
}
function calendarHTML(c) {
  const today = todayISO(), ym = UI.calMonth || today.slice(0, 7), [Y, M] = ym.split("-").map(Number);
  const first = new Date(Y, M - 1, 1), start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7));
  const logs = logsOf(c.id), sched = scheduledFor(c.id), notes = db.dayNotes[c.id] || {};
  const used = new Set(), cells = [];
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  for (let i = 0; i < 42; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i); const k = iso(d), inMonth = d.getMonth() === M - 1;
    if (i >= 35 && !inMonth) break;
    const items = [];
    for (const s of sched.filter((x) => x.date === k)) {
      const l = logs.find((x) => x.prog && x.prog.id === s.p.id && x.prog.w === s.w && x.prog.d === s.d);
      if (l) used.add(l.id);
      items.push({ title: `${s.day.name}`, note: s.day.note, status: l ? "done" : k < today ? "missed" : "up", log: l, rx: s.day.items, drag: l ? "" : `${s.p.id}|${s.w}|${s.day.id}`, moved: s.day.moved });
    }
    for (const l of logs.filter((x) => !used.has(x.id) && x.date.slice(0, 10) === k)) { used.add(l.id); items.push({ title: l.name, status: "done", log: l }); }
    cells.push(`<div class="cday${inMonth ? "" : " out"}${k === today ? " today" : ""}" data-date="${k}"><div class="cd-hd"><span>${d.getDate()}</span><button class="flagbtn${notes[k] ? " on" : ""}" data-act="daynote" data-c="${c.id}" data-d="${k}" title="${notes[k] ? esc(notes[k]) : "Add a private note (only coaches see it)"}" aria-label="Private note for ${k}">⚑</button></div>
      ${items.map((it) => `<div class="cw ${it.status}${it.drag ? " drag" : ""}"${it.drag ? ` draggable="true" data-drag="${it.drag}" data-act="wk-move" data-c="${c.id}" tabindex="0" role="button" title="Drag to another day to move it, or click to pick a date"` : ""}><b>${esc(it.title)}${it.moved ? ` <span class="moved" title="Moved from its usual day">↷</span>` : ""}</b>${it.note ? `<div class="cwn">${esc(it.note)}</div>` : ""}
        ${it.log ? (it.log.exercises || []).map((e) => `<div class="cx"><span class="ck ${(e.sets || []).length ? "y" : "n"}">${(e.sets || []).length ? "✓" : "✗"}</span><span>${esc(exMeta(e.ex).name)}<br><span class="sub num">${esc(setsText(e) || "–")}</span></span></div>`).join("")
          : (it.rx || []).map((x) => `<div class="cx"><span class="ck">${it.status === "missed" ? "✗" : "·"}</span><span>${esc(exMeta(x.ex).name)}</span></div>`).join("")}</div>`).join("")}
    </div>`);
  }
  const label = first.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  return `<section class="panel"><div class="row"><button class="btn small" data-act="cal-move" data-d="-1" aria-label="Previous month">‹</button><h2 class="grow" style="text-align:center">${label}</h2><button class="btn small" data-act="cal-move" data-d="1" aria-label="Next month">›</button><button class="btn small ghost" data-act="cal-today">Today</button></div>
    <div class="cal-key sub"><span class="cw done">Completed</span><span class="cw missed">Missed</span><span class="cw up">Upcoming</span><span>⚑ private coach note</span><span>Drag a workout to move it</span></div>
    <div class="cal">${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((x) => `<div class="cdow">${x}</div>`).join("")}${cells.join("")}</div></section>`;
}

function renderClient(cid) {
  setNav("clients");
  const c = client(cid), logs = logsOf(cid), tab = UI.clientTab || "calendar";
  const progs = programsOf(cid).map((p) => `<div class="pitem"><div class="grow"><b>${esc(p.name)}</b><div class="sub">${p.weeks} weeks · ${p.days.length} days/week · ${p.schedule === "weekly" ? "scheduled by day" : "any order"} · ${esc(programWeekNow(p) || "")}</div></div>
      <a class="btn small primary" href="#program-${p.id}" style="text-decoration:none">Edit</a><button class="btn small" data-act="prog-dup" data-id="${p.id}">Copy…</button><button class="btn small ghost" data-act="prog-rm" data-id="${p.id}">Remove</button></div>
      ${UI.confirm === "rm:" + p.id ? `<div class="panel" style="background:var(--sunken)"><b>Remove “${esc(p.name)}” from ${esc(c.name)}?</b><div class="sub">Its workouts come off their calendar and app. Workouts they already logged stay.</div><div class="row"><button class="btn small danger" data-act="prog-rm-yes" data-id="${p.id}">Remove</button><button class="btn small ghost" data-act="cancel">Cancel</button></div></div>` : ""}`).join("");
  const dup = UI.confirm && UI.confirm.startsWith("dup:") ? db.programs.find((p) => p.id === UI.confirm.slice(4)) : null;
  const tpls = db.programs.filter((p) => p.template);
  $("#view").innerHTML = `<div class="row"><a href="#clients" class="btn small ghost" style="text-decoration:none">← Clients</a><span class="grow"></span>
      ${db.cloud ? "" : `<label class="btn small" for="logfile" role="button" tabindex="0">Load workouts file from ${esc(c.name.replace(/^Sample client: /, ""))}</label><input type="file" id="logfile" data-c="${cid}" accept=".json,application/json" hidden>`}</div>
    <div class="row"><div class="grow">${db.cloud
      ? `<div class="row"><label class="eyebrow">Main coach <select class="in" id="c-coach" data-c="${cid}"><option value="">–</option>${db.coaches.map((x) => `<option value="${x.id}" ${x.id === c.coachId ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></label>
          <select class="in" id="c-remote" data-c="${cid}" aria-label="Training"><option value="0">In person</option><option value="1" ${c.remote ? "selected" : ""}>Remote</option></select><span class="sub">${esc(c.email || "")}</span></div>`
      : `<div class="eyebrow">${c.remote ? "Remote" : "In person"} · Main coach: ${esc((db.coaches.find((x) => x.id === c.coachId) || {}).name || "–")}</div>`}<h1>${esc(c.name)}</h1></div></div>
    <div class="cols">
      <section class="feed"><div class="row"><div class="seg" role="tablist"><button role="tab" data-act="ctab" data-t="calendar" aria-selected="${tab === "calendar"}">Calendar</button><button role="tab" data-act="ctab" data-t="feed" aria-selected="${tab === "feed"}">Recent workouts</button>${db.cloud ? `<button role="tab" data-act="ctab" data-t="messages" aria-selected="${tab === "messages"}">Messages${unreadOf(cid) ? `<span class="nbadge">${unreadOf(cid)}</span>` : ""}</button>` : ""}</div></div>
        ${tab === "messages" && db.cloud ? conversationHTML(cid) : tab === "calendar" ? calendarHTML(c) : logs.map((l) => logCardHTML(l)).join("") || `<div class="empty">${db.cloud ? `No workouts logged yet. Every workout ${esc(c.name)} finishes in the app shows up here with their notes.` : `No workouts logged yet. Once accounts are live, every workout ${esc(c.name)} finishes shows up here with their notes. Until then, load the file they send from the app (Profile → Send my workouts to my coach).`}</div>`}</section>
      <aside style="display:flex;flex-direction:column;gap:18px">
        ${maxesCardHTML(c)}
        <section class="panel"><h2>Programs</h2><div class="plist">${progs || `<div class="empty">No program yet.</div>`}</div>
          ${dup ? `<div class="panel" style="background:var(--sunken)"><b>Copy “${esc(dup.name)}” to:</b><select class="in" id="dup-to">${db.clients.map((x) => `<option value="${x.id}" ${x.id === cid ? "selected" : ""}>${esc(x.name)}</option>`).join("")}<option value="__tpl">Saved programs (template)</option></select><div class="row"><button class="btn small primary" data-act="dup-yes" data-id="${dup.id}">Make a copy</button><button class="btn small ghost" data-act="cancel">Cancel</button></div></div>` : ""}
          <div class="row"><button class="btn" data-act="prog-new" data-c="${cid}">+ New program</button>${tpls.length ? `<select class="in" id="from-tpl" data-c="${cid}"><option value="">Start from a saved program…</option>${tpls.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join("")}</select>` : ""}</div></section>
        <section class="panel"><h2>Coach notes</h2><textarea class="in" id="cnotes" data-c="${cid}" rows="5" placeholder="Injuries, goals, anything other coaches should know. Clients don’t see this.">${esc(c.notes || "")}</textarea></section>
      </aside>
    </div>`;
  if (tab === "messages" && db.cloud) setTimeout(() => { const el = $("#conv"); PM.hydrate(el); markRead(cid); el?.lastElementChild?.scrollIntoView({ block: "nearest" }); }, 0);
}

/* ---- Everyone's workouts ---- */
function renderFeed() {
  setNav("feed");
  const only = UI.feedFlagged, logs = [...db.logs].sort((a, b) => (a.date < b.date ? 1 : -1)).filter((l) => !only || logFlags(l).any).slice(0, 100);
  const pend = db.clients.flatMap((c) => Object.entries(c.maxes || {}).filter(([, m]) => m.pending).map(([id, m]) => ({ c, id, m })));
  $("#view").innerHTML = `<div class="row"><div class="grow"><div class="eyebrow">Every client, newest first</div><h1>Feed</h1></div>
      <label class="f" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" id="feed-flag" ${only ? "checked" : ""}> Only PRs, missed reps and pain</label></div>
    ${pend.length ? `<section class="panel"><h2>Target maxes to review</h2>${pend.map(({ c, id, m }) => `<div class="row"><span class="grow"><a href="#client-${c.id}"><b>${esc(c.name)}</b></a> · ${esc(exMeta(id).name)}: new 5RM ${m.pending.rm5} → suggested target ${m.pending.suggested}${(c.maxes[id] || {}).target ? ` (now ${(c.maxes[id] || {}).target})` : ""}</span><button class="btn small primary" data-act="max-approve" data-c="${c.id}" data-ex="${esc(id)}">Approve</button><button class="btn small ghost" data-act="max-dismiss" data-c="${c.id}" data-ex="${esc(id)}">Not yet</button></div>`).join("")}</section>` : ""}
    <div class="feed" style="max-width:900px">${logs.map((l) => logCardHTML(l, true)).join("") || `<div class="empty">${only ? "Nothing flagged." : "No workouts yet."}</div>`}</div>`;
}

/* ---- Saved programs (templates) ---- */
/* ---- Exercises: the gym's library plus the ones coaches added ---- */
const GYMV = window.PPVideos || {};
const videoOf = (m) => (m && m.video) || GYMV[m && m.id] || "";
function exUses(id) { return db.programs.filter((p) => (p.days || []).some((d) => (d.blocks || []).some((b) => b.ex === id))); }
function exListHTML() {
  const q = (UI.exQ || "").trim().toLowerCase(), f = UI.exF || "all";
  if (f === "deleted") { const del = allEx(true).filter((m) => m.deleted).sort((a, b) => a.name.localeCompare(b.name));
    return `<p class="sub">${del.length} deleted. Restoring one puts it back in the list coaches pick from.</p>${del.map((m) => `<div class="exrow"><span class="grow"><b>${esc(m.name)}</b><span class="sub"> · ${esc(m.muscle || "Other")}</span></span><button class="btn small" data-act="ex-restore" data-id="${esc(m.id)}">Restore</button></div>`).join("") || `<div class="empty">Nothing deleted.</div>`}`; }
  const all = allEx()
    .filter((m) => f === "all" || (f === "yours" ? !isBuiltIn(m.id) : f === "changed" ? isBuiltIn(m.id) && db.custom[m.id] : f === "video" ? videoOf(m) : f === "novideo" ? !videoOf(m) : true))
    .filter((m) => !q || m.name.toLowerCase().includes(q) || (m.muscle || "").toLowerCase().includes(q) || (m.kind || "").toLowerCase().includes(q));
  const groups = {}; for (const m of all) (groups[m.muscle || "Other"] = groups[m.muscle || "Other"] || []).push(m);
  const order = [...LIBR.MUSCLES, ...Object.keys(groups).filter((x) => !LIBR.MUSCLES.includes(x)).sort()];
  const out = order.filter((mu) => groups[mu]).map((mu) => `<div class="exgrp"><h3>${esc(mu)} <span class="sub">${groups[mu].length}</span></h3>${groups[mu].sort((a, b) => a.name.localeCompare(b.name)).map((m) => {
    const v = videoOf(m), mine = !isBuiltIn(m.id), changed = !mine && db.custom[m.id];
    return `<button class="exrow" data-act="ex-open" data-id="${esc(m.id)}"><span class="grow"><b>${esc(m.name)}</b><span class="sub"> · ${esc(m.kind || "other")}</span></span>${mine ? `<span class="tag">Added by coaches</span>` : changed ? `<span class="tag">Edited</span>` : ""}${v ? `<span class="tag vid">▶ Video</span>` : ""}</button>`;
  }).join("")}</div>`).join("");
  return `<p class="sub">${all.length} exercise${all.length === 1 ? "" : "s"}</p>${out || `<div class="empty">Nothing matches. Use “+ New exercise” to add it.</div>`}`;
}
function renderExercises() {
  setNav("exercises");
  const n = allEx().length;
  $("#view").innerHTML = `<div class="row"><h1 class="grow">Exercises</h1><button class="btn" data-act="ex-export">Download exercise list</button><button class="btn primary" data-act="ex-new">+ New exercise</button></div>
    <p class="sub">All ${n} exercises coaches can put in a program. The gym’s exercises come with the app, and many have a video from the gym’s YouTube channel. Click any exercise to change its name, category, equipment, video or what clients record, or to delete it. Changes are saved for every coach and reach clients with their programs.</p>
    <div class="row"><input class="in grow" id="ex-q" placeholder="Search by name, muscle or equipment" value="${esc(UI.exQ || "")}" autocomplete="off">
      <select class="in" id="ex-f" aria-label="Show"><option value="all">All</option><option value="yours" ${UI.exF === "yours" ? "selected" : ""}>Added by coaches</option><option value="video" ${UI.exF === "video" ? "selected" : ""}>With a video</option><option value="novideo" ${UI.exF === "novideo" ? "selected" : ""}>Without a video</option><option value="changed" ${UI.exF === "changed" ? "selected" : ""}>Gym exercises you edited</option><option value="deleted" ${UI.exF === "deleted" ? "selected" : ""}>Deleted</option></select></div>
    <div id="ex-list">${exListHTML()}</div>`;
}
// The written guide clients see under "How to": coaches' version if they wrote one, else the app's.
const GUIDE = () => window.LiftGuide;
const baseGuide = (id) => (GUIDE() && LIB[id] && GUIDE().info(id)) || null;
const guideFor = (id) => { const c = db.custom[id]; return (c && c.guide) || baseGuide(id) || null; };
const lines = (v) => String(v || "").split("\n").map((x) => x.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, "").trim()).filter(Boolean);
function guideFormHTML(g) {
  g = g || {}; const m = g.m || ["", ""], ta = (id, label, v, rows, ph) => `<label class="f" style="grid-column:1/-1">${label}<textarea class="in" id="${id}" rows="${rows}" placeholder="${ph}">${esc((v || []).join("\n"))}</textarea></label>`;
  return `<h3 style="margin:14px 0 4px">What clients see under “How to”</h3><p class="sub" style="margin:0 0 8px">One step, cue or mistake per line. Leave a box empty to hide that section. **Bold** works.</p>
    <div class="form2">
      <label class="f">Works (main muscles)<input class="in" id="g-m0" value="${esc(m[0] || "")}" placeholder="e.g. Quads, glutes"></label>
      <label class="f">Also works<input class="in" id="g-m1" value="${esc(m[1] || "")}" placeholder="e.g. Lower back, core"></label>
      <label class="f" style="grid-column:1/-1">Note at the top (optional)<input class="in" id="g-n" value="${esc(g.n || "")}" placeholder="e.g. Use the blue handles on the yoke"></label>
      ${ta("g-s", "How to do it", g.s, 5, "Set the bar on your upper back…")}
      ${ta("g-c", "Form cues", g.c, 4, "Brace before you go down")}
      ${ta("g-x", "Common mistakes", g.x, 3, "Knees caving in")}
    </div>`;
}
function readGuide() {
  if (!$("#g-s")) return undefined;
  const g = { m: [$("#g-m0").value.trim(), $("#g-m1").value.trim()], s: lines($("#g-s").value), c: lines($("#g-c").value), x: lines($("#g-x").value), n: $("#g-n").value.trim() };
  return g.m[0] || g.m[1] || g.s.length || g.c.length || g.x.length || g.n ? g : null;
}
const sameGuide = (a, b) => JSON.stringify(normG(a)) === JSON.stringify(normG(b));
const normG = (g) => g ? { m: [(g.m || [])[0] || "", (g.m || [])[1] || ""], s: g.s || [], c: g.c || [], x: g.x || [], n: g.n || "" } : null;
function exFormHTML(m) {
  const f = (m && m.fields) || ["w", "r"], cats = [...new Set([...LIBR.MUSCLES, "Strongman", "Mobility", "Warm-up", ...allEx().map((x) => x.muscle)])].filter(Boolean);
  return `<div class="form2">
      <label class="f">Name<input class="in" id="nx-name" value="${esc((m && m.name) || "")}" placeholder="e.g. Yoke carry"></label>
      <label class="f">Muscle / category<input class="in" id="nx-muscle" value="${esc((m && m.muscle) || "Strongman")}" list="muscles"><datalist id="muscles">${cats.map((x) => `<option value="${esc(x)}">`).join("")}</datalist></label>
      <label class="f">Equipment<input class="in" id="nx-kind" value="${esc((m && m.kind) || "strongman")}" list="kinds"><datalist id="kinds">${LIBR.KINDS.map((x) => `<option value="${x}">`).join("")}</datalist></label>
      <label class="f">YouTube link (optional)<input class="in" id="nx-video" value="${esc((m && m.video) || "")}" placeholder="https://youtu.be/…"></label>
      <div class="fields" style="grid-column:1/-1"><span class="sub">Clients record:</span>${Object.entries(LIBR.FIELD_NAMES).map(([k, n]) => `<label><input type="checkbox" class="nx-f" value="${k}" ${f.includes(k) ? "checked" : ""}> ${n}</label>`).join("")}</div>
    </div>${guideFormHTML(m && m.id ? guideFor(m.id) : null)}`;
}
function readExForm() {
  const name = ($("#nx-name").value || "").trim(); if (!name) { toast("Give the exercise a name."); return null; }
  const fields = [...document.querySelectorAll(".nx-f:checked")].map((x) => x.value);
  const out = { name, muscle: $("#nx-muscle").value.trim() || "Other", kind: $("#nx-kind").value.trim().toLowerCase() || "other", video: $("#nx-video").value.trim(), fields: fields.length ? fields : ["w", "r"] };
  const g = readGuide(); if (g !== undefined) out.guide = g;
  return out;
}
function openExercise(id) {
  const m = exMeta(id), mine = !isBuiltIn(id), changed = !mine && db.custom[id], v = videoOf(m), uses = exUses(id);
  const used = uses.length ? `Used in ${uses.length} program${uses.length === 1 ? "" : "s"}: ${uses.slice(0, 6).map((p) => esc(p.name) + (p.clientId && client(p.clientId) ? ` (${esc(client(p.clientId).name)})` : "")).join(", ")}${uses.length > 6 ? "…" : ""}` : "Not in any program yet.";
  const form = { ...m, video: m.video || (GYMV[id] || ""), fields: m.fields || defaultFields(id) };
  openModal(`<div class="row"><div class="grow"><div class="eyebrow">${esc(m.muscle || "Other")} · ${esc(m.kind || "other")}${mine ? " · added by coaches" : changed ? " · gym exercise, edited" : " · gym exercise"}</div><h2>${esc(m.name)}</h2></div><button class="btn small ghost" data-act="modal-close">Close</button></div>
    ${v ? `<p><a href="${esc(v)}" target="_blank" rel="noopener">▶ Watch the video</a></p>` : `<p class="sub">No video yet. Add a YouTube link below.</p>`}
    <p class="sub">${used}</p>
    ${exFormHTML(form)}
    <div class="row"><button class="btn primary" data-act="ex-save" data-id="${esc(id)}">Save</button>${changed ? `<button class="btn" data-act="ex-reset" data-id="${esc(id)}">Reset to the original</button>` : ""}<span class="grow"></span>
      ${uses.length ? `<span class="sub">To delete it, take it out of those programs first.</span>` : `<button class="btn danger" data-act="ex-del" data-id="${esc(id)}">Delete</button>`}</div>
    ${uses.length ? "" : `<p class="sub">${mine ? "Deleting removes it for every coach (you can undo right after)." : "A deleted gym exercise can be brought back from the “Deleted” filter."}</p>`}`);
}
function newExerciseModal() {
  openModal(`<div class="row"><h2 class="grow">New exercise</h2><button class="btn small ghost" data-act="modal-close">Close</button></div>
    <p class="sub">It’s saved for every coach and shows up when you add an exercise to a program.</p>${exFormHTML(null)}
    <div class="row"><button class="btn primary" data-act="ex-create">Add exercise</button></div>`);
  setTimeout(() => $("#nx-name")?.focus(), 30);
}

/* ---- Gym settings ---- */
const wuText = (plan) => plan.length ? plan.map((x) => `${fmtW(x.w)}×${x.r}`).join(", ") : "no warm-up sets";
const fmtW = (w) => String(Math.round(w * 100) / 100);
function renderSettings() {
  setNav("settings");
  const d = db.warmupDefault, ex = (work, max, custom) => wuText(P.warmupPlan({ work, bar: 45, max, step: 5, def: d, custom }));
  $("#view").innerHTML = `<h1>Gym settings</h1>
    <section class="panel" style="max-width:760px"><h2>Warm-up sets</h2>
      <p class="sub">When a lift has warm-up sets turned on (in the program, under that exercise’s Settings), the client app fills them in before the first working set. The weights go up in even jumps from the empty bar to the working weight, rounded up to the nearest 5 lb.</p>
      <div class="form3">
        <label class="f">Reps for each warm-up set, light to heavy<input class="in" id="wu-reps" value="${esc(d.reps.join(", "))}"></label>
        <label class="f">Heavy day: working weight at least this % of their max<input class="in" id="wu-at" type="number" min="50" max="100" value="${d.heavyAt}"></label>
        <label class="f">Reps on a heavy day<input class="in" id="wu-heavy" value="${esc(d.heavyReps.join(", "))}"></label>
      </div>
      <p class="sub">The number of reps you list is the number of warm-up sets.</p>
      <div class="panel" style="background:var(--sunken)"><b>Examples</b> (45 lb bar, max 245)
        <div class="wu-ex">Working at 180 (73%): <span class="num">${ex(180, 245)}</span></div>
        <div class="wu-ex">Working at 220 (90%): <span class="num">${ex(220, 245)}</span></div>
        <div class="wu-ex">Deadlift at 125 with “start 95”: <span class="num">${ex(125, 0, "start 95")}</span></div>
      </div>
      <p class="sub">To change one client’s warm-up for one lift, open their program, click the exercise, and write it under “Warm-up for this lift”: <b>start 95</b> (start there instead of the bar), <b>95x5, 105x5, 115x3</b> (exactly those), <b>bar x5, 50%x5, 75%x3</b> (% of the working weight), or <b>none</b>.</p>
    </section>`;
}
function renderTemplates() {
  setNav("templates");
  const t = db.programs.filter((p) => p.template);
  $("#view").innerHTML = `<div class="row"><div class="grow"><div class="eyebrow">Reusable programs you can copy to any client</div><h1>Saved programs</h1></div><label class="btn" style="cursor:pointer">Import programs file<input type="file" id="tplfile" accept=".json,application/json" hidden></label><button class="btn primary" data-act="tpl-new">+ New saved program</button></div>
    <div class="plist">${t.map((p) => `<div class="pitem panel" style="flex-direction:row"><div class="grow"><b>${esc(p.name)}</b><div class="sub">${p.weeks} weeks · ${p.days.length} days/week</div></div><a class="btn small primary" href="#program-${p.id}" style="text-decoration:none">Edit</a><button class="btn small" data-act="prog-dup" data-id="${p.id}">Copy to a client…</button></div>`).join("") || `<div class="empty">No saved programs yet. Open any client’s program and choose <b>Save as a saved program</b>, or start a new one here.</div>`}</div>
    ${UI.confirm && UI.confirm.startsWith("dup:") ? (() => { const dup = prog(UI.confirm.slice(4)); return `<div class="panel"><b>Copy “${esc(dup.name)}” to:</b><select class="in" id="dup-to">${db.clients.map((x) => `<option value="${x.id}">${esc(x.name)}</option>`).join("")}</select><div class="row"><button class="btn small primary" data-act="dup-yes" data-id="${dup.id}">Make a copy</button><button class="btn small ghost" data-act="cancel">Cancel</button></div></div>`; })() : ""}`;
}

function newProgram(cid) {
  const start = new Date(); start.setDate(start.getDate() + ((8 - start.getDay()) % 7 || 7)); // next Monday
  const sd = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
  const p = { v: 2, id: pid(), clientId: cid, coach: me().name, name: "New program", weeks: 6, schedule: "weekly", startDate: sd, notes: "", weekNotes: [],
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
function cellPreview(text, ex, p) {
  const t = String(text || "").trim();
  if (!t) return `<div class="pv">–</div>`;
  if (/^(skip|off|none|n\/a|-+|—)$/i.test(t)) return `<div class="pv">Not this week</div>`;
  const r = P.parsePrescription(t), c = p && client(p.clientId), m = c && ex ? P.targetOf(c.maxes[ex], UNITS) : 0;
  const wts = m ? r.groups.filter((g) => g.load && g.load.t === "pct").map((g) => `${g.load.v}% = ${P.pctOf(m, g.load.v, UNITS)}`) : [];
  const logs = r.groups.length ? `logs ${r.groups.reduce((n, g) => n + g.sets, 0)} set${r.groups.reduce((n, g) => n + g.sets, 0) === 1 ? "" : "s"}` : "logs 1 set";
  if (r.errors.length || r.loose) return `<div class="pv">Shown as written · ${logs}${wts.length ? " · " + wts.join(", ") + " lb" : ""}</div>`;
  return `<div class="pv">${esc(P.prescriptionText(r))}${wts.length ? ` <b>(${wts.join(", ")} lb)</b>` : ""}</div>`;
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
      ${pday.note ? `<div class="cnote">${P.richText(pday.note)}</div>` : ""}${pday.warmup ? `<div class="cnote"><b>Warm-up:</b> ${P.richText(pday.warmup)}</div>` : ""}
      ${pday.items.map((it, i) => `${gl[i] && gl[i].start ? `<div class="grp">${gl[i].kind} · no rest between · ${it.group && pday.items.filter((x) => x.group === it.group).slice(-1)[0].rest ? "rest " + mmss(pday.items.filter((x) => x.group === it.group).slice(-1)[0].rest) + " after each round" : ""}</div>` : ""}<div class="pex">${gl[i] ? `<span class="glabel">${gl[i].label}</span> ` : ""}<b>${esc(exMeta(it.ex).name)}</b><div>${P.richText(P.prescriptionText(it))}${(() => { const c = client(p.clientId), m = c ? P.targetOf(c.maxes[it.ex], UNITS) : 0, w = m ? it.groups.filter((g) => g.load && g.load.t === "pct").map((g) => P.pctOf(m, g.load.v, UNITS) + " lb") : []; return w.length ? ` <span class="sub">(${w.join(", ")})</span>` : ""; })()}${it.rest && !gl[i] ? ` · rest ${mmss(it.rest)}` : ""}</div>${it.format ? `<div class="sub">${esc(P.formatText(it.format))}</div>` : ""}${it.note ? `<div class="sub">${P.richText(it.note)}</div>` : ""}<div class="sub">Client records: ${fieldsText(it.fields || defaultFields(it.ex))}${it.warmupSets ? " · warm-up sets added" : ""}</div></div>`).join("")}${pday.cooldown ? `<div class="cnote"><b>Cool-down:</b> ${P.richText(pday.cooldown)}</div>` : ""}</div>`;
  }
  return preview;
}
function renderProgram(pid) {
  setNav("clients");
  const p = prog(pid), c = client(p.clientId) || null;
  if (UI.day >= p.days.length) UI.day = 0;
  const day = p.days[UI.day];
  const tabs = p.days.map((d, i) => `<button class="dtab" data-act="day" data-i="${i}" aria-pressed="${i === UI.day}">${p.schedule === "weekly" && d.weekday != null ? `<small>${P.WEEKDAYS[d.weekday].slice(0, 3)}</small>` : `<small>Day ${i + 1}</small>`}${esc(d.name)}</button>`).join("");
  const labels = day ? groupLabels(day.blocks) : [];
  const head = `<tr><th class="exh">Exercise</th>${Array.from({ length: p.weeks }, (_, w) => `<th>Week ${w + 1}<span class="sub">${weekRange(p, w)}</span>${w > 0 ? `<button class="btn small ghost" data-act="copy-col" data-w="${w}" title="Copy week ${w} into week ${w + 1}">Copy week ${w} →</button>` : ""}</th>`).join("")}</tr>`;
  const rows = day ? day.blocks.map((b, bi) => {
    const m = exMeta(b.ex), lab = labels[bi], f = b.fields || defaultFields(b.ex);
    const meta = [b.rest ? `rest ${mmss(b.rest)}` : "", `records ${fieldsText(f)}`, b.format ? P.formatText(b.format) : "", b.warmup ? `warm-up: ${b.warmup}` : b.warmupSets ? "warm-up sets" : "", b.video ? "video ✓" : "", b.note ? "note ✓" : ""].filter(Boolean).join(" · ");
    return `<tr class="${lab && lab.start ? "group-start" : ""}"><td class="exh"><div class="exname">${lab ? `<span class="glabel" title="${lab.kind}">${lab.label}</span>` : ""}<button class="nm" data-act="ex-settings" data-b="${bi}" title="Exercise settings">${esc(m.name)}</button></div>
        <div class="meta">${esc(meta)}</div>
        <div class="rowtools"><button class="btn small" data-act="ex-settings" data-b="${bi}">Settings</button><button class="icon" data-act="b-up" data-b="${bi}" aria-label="Move up" ${bi === 0 ? "disabled" : ""}>▲</button><button class="icon" data-act="b-down" data-b="${bi}" aria-label="Move down" ${bi === day.blocks.length - 1 ? "disabled" : ""}>▼</button><button class="icon" data-act="b-rm" data-b="${bi}" aria-label="Remove ${esc(m.name)}">✕</button></div></td>
      ${Array.from({ length: p.weeks }, (_, w) => { const v = (b.weeks || [])[w] || ""; return `<td class="cell${v.trim() ? "" : " off"}"><textarea data-cell="${bi}:${w}" aria-label="${esc(m.name)}, week ${w + 1}" placeholder="e.g. 3x5 @75%">${esc(v)}</textarea>${cellPreview(v, b.ex, p)}</td>`; }).join("")}</tr>`;
  }).join("") : "";
  const pw = Math.min(UI.previewWeek, p.weeks - 1), preview = previewHTML(p, day);
  $("#view").innerHTML = `<div class="row">${c ? `<a href="#client-${c.id}" class="btn small ghost" style="text-decoration:none">← ${esc(c.name)}</a>` : `<a href="#templates" class="btn small ghost" style="text-decoration:none">← Saved programs</a><span class="pill accent">Saved program</span>`}<span class="grow"></span><span class="sub" id="saved">Saved in this browser</span>
      ${c ? `<button class="btn small" data-act="save-tpl">Save as a saved program</button><button class="btn small" data-act="download">Download for the client app</button>` : `<button class="btn small" data-act="prog-dup" data-id="${p.id}">Copy to a client…</button>`}</div>
    ${UI.confirm && UI.confirm.startsWith("dup:") ? `<div class="panel"><b>Copy “${esc(p.name)}” to:</b><select class="in" id="dup-to">${db.clients.map((x) => `<option value="${x.id}">${esc(x.name)}</option>`).join("")}</select><div class="row"><button class="btn small primary" data-act="dup-yes" data-id="${p.id}">Make a copy</button><button class="btn small ghost" data-act="cancel">Cancel</button></div></div>` : ""}
    ${UI.confirm === "day-copy" ? `<div class="panel"><b>Copy “${esc(day.name)}” (all weeks) into:</b><select class="in" id="daycopy-to">${db.programs.filter((x) => x.id !== p.id).map((x) => `<option value="${x.id}">${esc(x.template ? "Saved: " + x.name : (client(x.clientId) || {}).name + ": " + x.name)}</option>`).join("")}</select><div class="row"><button class="btn small primary" data-act="day-copy-yes">Copy day</button><button class="btn small ghost" data-act="cancel">Cancel</button></div></div>` : ""}
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
        <span class="row" style="justify-content:flex-end"><button class="btn small" data-act="day-copy" ${db.programs.length > 1 ? "" : "disabled"}>Copy day to…</button>${UI.confirm === "day-rm" ? `<button class="btn small danger" data-act="day-rm-yes">Delete day</button><button class="btn small ghost" data-act="cancel">Keep</button>` : `<button class="btn small ghost danger" data-act="day-rm">Delete day</button>`}</span>
      </div>
      <div class="form3">
        <label class="f">Coaching notes for this day (clients see this at the top; **bold**)<textarea class="in" id="d-note" rows="3" placeholder="e.g. Think Lil Jon and **get LOW**!">${esc(day.note || "")}</textarea></label>
        <label class="f">Warm-up<textarea class="in" id="d-warm" rows="3" placeholder="e.g. 5 min bike, 2 rounds of…">${esc(day.warmup || "")}</textarea></label>
        <label class="f">Cool-down<textarea class="in" id="d-cool" rows="3" placeholder="e.g. Couch stretch 2 x 30s each side">${esc(day.cooldown || "")}</textarea></label>
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
          <dt><code>2x3 @90% of top</code></dt><dd>back-offs from the heaviest set the client logs first (“build to a heavy triple, then…” works)</dd>
          <dt><code>3x8/side</code></dt><dd>per side, leg or arm</dd>
          <dt><code>skip</code></dt><dd>not this week</dd>
          <dt>anything else</dt><dd>shown to the client word for word</dd>
        </dl><p class="sub">Percentages use each client’s target max and round up to the nearest 5 lb.</p><p class="sub">Supersets, circuits, EMOMs, intervals, rest, what the client records (weight, reps, time, distance, height), warm-up sets and video links are in each exercise’s <b>Settings</b>.</p></section>
      </div>` : `<div class="empty">Add a day to start.</div>`}`;
}

/* ---- Exercise picker and settings (modal) ---- */
function openModal(html) { $("#modal").innerHTML = `<div class="modal-wrap" data-act="modal-bg"><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`; }
function closeModal() { $("#modal").innerHTML = ""; UI.picker = null; UI.editing = null; }
function pickerHTML(q) {
  const all = allEx();
  const lo = q.trim().toLowerCase();
  const hits = all.filter((m) => !lo || m.name.toLowerCase().includes(lo) || m.muscle.toLowerCase().includes(lo));
  const groups = {}; for (const m of hits) (groups[m.muscle] = groups[m.muscle] || []).push(m);
  let list = ""; for (const mu of LIBR.MUSCLES) if (groups[mu]) list += `<div class="grp">${esc(mu)}</div>` + groups[mu].map((m) => `<button data-act="pick" data-id="${esc(m.id)}"><span>${esc(m.name)}</span><span class="sub">${esc(m.kind)}${!isBuiltIn(m.id) ? " · added by coaches" : ""}</span></button>`).join("");
  for (const mu of Object.keys(groups)) if (!LIBR.MUSCLES.includes(mu)) list += `<div class="grp">${esc(mu)}</div>` + groups[mu].map((m) => `<button data-act="pick" data-id="${esc(m.id)}"><span>${esc(m.name)}</span><span class="sub">${esc(m.kind || "")}${!isBuiltIn(m.id) ? " · added by coaches" : ""}</span></button>`).join("");
  const exact = all.some((m) => m.name.toLowerCase() === lo);
  return list + (lo && !exact ? `<div class="grp">New exercise</div><div style="padding:12px" class="form2">
      <label class="f">Name<input class="in" id="nx-name" value="${esc(q.trim())}"></label>
      <label class="f">Muscle / category<input class="in" id="nx-muscle" value="Strongman" list="muscles"><datalist id="muscles">${[...LIBR.MUSCLES, "Strongman", "Mobility", "Warm-up"].map((x) => `<option value="${x}">`).join("")}</datalist></label>
      <label class="f">Equipment<input class="in" id="nx-kind" value="strongman" list="kinds"><datalist id="kinds">${[...new Set([...LIBR.KINDS, "strongman", "kettlebell", "band", "other"])].map((x) => `<option value="${x}">`).join("")}</datalist></label>
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
      <label class="f" style="grid-column:1/-1">Coaching cues for every week (clients see this; **bold** works)<textarea class="in" id="s-note" rows="3" placeholder="e.g. 3 count pause on your chest. **Big drive** up and out of the bottom.">${esc(b.note || "")}</textarea></label>
      <label class="f" style="grid-column:1/-1">Video link (YouTube)<input class="in" id="s-video" value="${esc(b.video || "")}" placeholder="https://youtu.be/… — plays in the client’s exercise guide"></label>
    </div>
    <div class="fields"><span class="sub">Client records:</span>${Object.entries(LIBR.FIELD_NAMES).map(([k, n]) => `<label><input type="checkbox" class="s-f" value="${k}" ${f.includes(k) ? "checked" : ""}> ${n}</label>`).join("")}</div>
    <div class="form2">
      <label class="f">Format<select class="in" id="s-fmt"><option value="">Regular sets</option><option value="emom" ${fm.t === "emom" ? "selected" : ""}>EMOM</option><option value="interval" ${fm.t === "interval" ? "selected" : ""}>Intervals</option></select></label>
      <span></span>
      ${fm.t === "emom" ? `<label class="f">Every (m:ss)<input class="in" id="s-every" value="${mmss(fm.every || 60).replace(/^(\d+)s$/, "0:$1")}"></label><label class="f">Rounds<input class="in" id="s-rounds" type="number" min="1" value="${fm.rounds || 10}"></label>` : ""}
      ${fm.t === "interval" ? `<label class="f">Work (m:ss)<input class="in" id="s-work" value="${mmss(fm.work || 40).replace(/^(\d+)s$/, "0:$1")}"></label><label class="f">Rest (m:ss)<input class="in" id="s-irest" value="${mmss(fm.rest || 20).replace(/^(\d+)s$/, "0:$1")}"></label><label class="f">Rounds<input class="in" id="s-rounds" type="number" min="1" value="${fm.rounds || 8}"></label>` : ""}
    </div>
    <label class="fields"><input type="checkbox" id="s-warm" ${b.warmupSets || (b.warmup && !/^\s*(none|no|off|skip)\s*$/i.test(b.warmup)) ? "checked" : ""}> Add warm-up sets before this lift (the client app fills them in from the working weight)</label>
    <label class="f">Warm-up for this lift <span class="sub">(optional; blank uses the <a href="#settings">gym default</a>)</span><input class="in" id="s-wu" value="${esc(b.warmup || "")}" placeholder="start 95 · or 95x5, 105x5, 115x3 · or bar x5, 50%x5, 75%x3 · or none"></label>
    <div class="sub" id="s-wu-pv">${wuPreview(p, b)}</div>
    <div class="row"><button class="btn small" data-act="ex-change">Swap exercise…</button><span class="grow"></span><span class="sub">Changes save as you go.</span></div>`;
}
// What the warm-up would be for this client's first week of this lift.
function wuPreview(p, b, text) {
  const custom = text ?? b.warmup ?? "", pw = P.parseWarmup(custom);
  if (pw && pw.kind === "bad") return `Couldn’t read “${esc(pw.text)}”. Write sets like 95x5, bar x5 or 50%x5, separated by commas.`;
  const c = client(p.clientId), m = c && c.maxes && c.maxes[b.ex], max = m ? P.targetOf(m, "lb") : 0;
  const rx = P.parsePrescription((b.weeks || []).find((x) => x && x.trim()) || ""), g = (rx.groups || []).find((x) => x.load);
  const work = g && g.load.t === "pct" && max ? P.pctOf(max, g.load.v, "lb") : g && g.load.t === "lb" ? g.load.v : 0;
  if (!work) return pw && pw.kind === "list" && pw.steps.every((x) => typeof x.w === "number") ? `Warm-up: ${wuText(P.warmupPlan({ work: 0, custom, def: db.warmupDefault }))}` : "The app works out the weights from the working weight on the day.";
  return `Week 1 at ${fmtW(work)}${max ? ` (max ${fmtW(max)})` : ""}, 45 lb bar: ${esc(wuText(P.warmupPlan({ work, bar: 45, max, step: 5, def: db.warmupDefault, custom })))}`;
}
function openSettings(bi) { UI.editing = bi; const p = prog(cur()), b = p.days[UI.day].blocks[bi]; openModal(settingsHTML(p, b)); }
const cur = () => (location.hash.match(/^#program-(.+)$/) || [])[1];

/* ================= Events ================= */
let undoSnap = null, removedProg = null, deletedEx = null;
// Move one week's session of a program to another date (null puts it back on its usual day).
function moveSession(drag, date) {
  const [pid, ws, did] = String(drag || "").split("|"), w = +ws, pr = db.programs.find((x) => x.id === pid);
  const dd = pr && pr.days.find((x) => x.id === did); if (!dd) return;
  const usual = P.dayDate(pr, w, dd), key = P.moveKey(w, dd);
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
  if ((P.movedDate(pr, w, dd) || usual) === (date || usual)) return;
  undoSnap = clone(pr); pr.moves = { ...(pr.moves || {}) };
  if (!date || date === usual) delete pr.moves[key]; else pr.moves[key] = date;
  if (!Object.keys(pr.moves).length) delete pr.moves;
  save(); route();
  toast(`Moved ${dd.name} (week ${w + 1}) to ${dateLabel(date || usual)}.`, { act: "undo", label: "Undo" });
}
// Drag and drop on the client calendar.
let dragKey = null;
document.addEventListener("dragstart", (ev) => { const el = ev.target.closest && ev.target.closest("[data-drag]"); if (!el) return; dragKey = el.dataset.drag; ev.dataTransfer.effectAllowed = "move"; try { ev.dataTransfer.setData("text/plain", dragKey); } catch {} el.classList.add("dragging"); });
document.addEventListener("dragend", () => { dragKey = null; document.querySelectorAll(".dragging,.drop-on").forEach((x) => x.classList.remove("dragging", "drop-on")); });
document.addEventListener("dragover", (ev) => { if (!dragKey) return; const cell = ev.target.closest && ev.target.closest(".cday[data-date]"); if (!cell) return; ev.preventDefault(); ev.dataTransfer.dropEffect = "move";
  document.querySelectorAll(".drop-on").forEach((x) => x !== cell && x.classList.remove("drop-on")); cell.classList.add("drop-on"); });
document.addEventListener("drop", (ev) => { if (!dragKey) return; const cell = ev.target.closest && ev.target.closest(".cday[data-date]"); if (!cell) return; ev.preventDefault(); const k = dragKey; dragKey = null; moveSession(k, cell.dataset.date); });
document.addEventListener("click", (ev) => {
  const t = ev.target.closest("[data-act]"); if (!t) return;
  const a = t.dataset.act;
  if (a === "modal-bg" && ev.target !== t) return;
  const p = cur() ? prog(cur()) : null, day = p ? p.days[UI.day] : null;
  switch (a) {
    case "client-new": UI.confirm = "client-new"; route(); setTimeout(() => $("#nc-name")?.focus(), 0); break;
    case "open-conv": UI.clientTab = "messages"; if (location.hash === "#client-" + t.dataset.c) route(); break;
    case "cm-send": sendCoachMessage(t.dataset.c); break;
    case "copy-link": navigator.clipboard.writeText(appLink()).then(() => toast("Link copied."), () => toast(appLink())); break;
    case "signout": Cloud.signOut().then(() => location.reload()); break;
    case "reload": location.reload(); break;
    case "cancel": UI.confirm = null; route(); break;
    case "reset-sample": db = seed(); save(); UI.confirm = null; renderTop(); route(); toast("Sample data reset."); break;
    case "prog-new": { const np = newProgram(t.dataset.c); UI.day = 0; location.hash = "#program-" + np.id; break; }
    case "prog-dup": UI.confirm = "dup:" + t.dataset.id; route(); break;
    case "ex-new": newExerciseModal(); break;
    case "ex-export": { // every exercise with where it came from and how many programs use it (for tidying the list)
      const uses = {}; for (const p of db.programs) for (const d of p.days || []) for (const b of d.blocks || []) (uses[b.ex] = uses[b.ex] || new Set()).add(p.id);
      const list = allEx(true).map((m) => ({ id: m.id, name: m.name, muscle: m.muscle || "", kind: m.kind || "", source: isBuiltIn(m.id) ? (db.custom[m.id] ? "gym (edited)" : "gym") : "added", deleted: !!m.deleted,
        video: videoOf(m) || "", hasGuide: !!guideFor(m.id), fields: m.fields || null, programs: uses[m.id] ? uses[m.id].size : 0 }));
      const blob = new Blob([JSON.stringify({ app: "powerplant-exercises", v: 1, at: new Date().toISOString(), count: list.length, exercises: list }, null, 1)], { type: "application/json" });
      const url = URL.createObjectURL(blob), el = document.createElement("a"); el.href = url; el.download = `power-plant-exercises-${todayISO()}.json`; document.body.appendChild(el); el.click(); el.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast(`Downloaded ${list.length} exercises.`); break; }
    case "ex-open": openExercise(t.dataset.id); break;
    case "ex-create": { const v = readExForm(); if (!v) break;
      const clash = allEx(true).find((m) => m.name.toLowerCase() === v.name.toLowerCase());
      if (clash && clash.deleted) { toast(`“${clash.name}” was deleted. Restore it from the Deleted filter.`); break; }
      if (clash) { toast(`“${clash.name}” is already in the list.`); break; }
      const id = "c_" + v.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 30) + "_" + Math.random().toString(36).slice(2, 5);
      db.custom[id] = { id, track: "wr", ...v }; if (!v.guide) delete db.custom[id].guide; save(); closeModal(); route(); toast(`Added “${v.name}”.`); break; }
    case "ex-save": { const id = t.dataset.id, v = readExForm(); if (!v) break;
      const clash = allEx(true).find((m) => m.id !== id && m.name.toLowerCase() === v.name.toLowerCase());
      if (clash) { toast(`Another exercise is already called “${clash.name}”.`); break; }
      if (isBuiltIn(id)) { // keep only what differs from the gym's original
        const l = LIB[id], o = { id };
        if (v.name !== l.name) o.name = v.name; if (v.muscle !== l.muscle) o.muscle = v.muscle; if (v.kind !== l.kind) o.kind = v.kind;
        if (v.video !== (GYMV[id] || "")) o.video = v.video; if (v.fields.join() !== defaultFields(id).join() || (db.custom[id] && db.custom[id].fields)) o.fields = v.fields;
        if (o.fields && o.fields.join() === (LIBR.TRACK_FIELDS[l.track || "wr"] || ["w", "r"]).join()) delete o.fields;
        if (!sameGuide(v.guide, baseGuide(id))) o.guide = v.guide || { m: ["", ""], s: [], c: [], x: [], n: "" };
        if (Object.keys(o).length > 1) db.custom[id] = o; else delete db.custom[id];
      } else { db.custom[id] = { ...db.custom[id], ...v }; if (!v.guide) delete db.custom[id].guide; }
      save(); closeModal(); route(); toast("Saved."); break; }
    case "ex-reset": delete db.custom[t.dataset.id]; save(); closeModal(); route(); toast("Back to the gym’s original."); break;
    case "ex-del": { const id = t.dataset.id; if (exUses(id).length) break;
      deletedEx = db.custom[id] ? clone(db.custom[id]) : { id, _none: true };
      if (isBuiltIn(id)) db.custom[id] = { ...(db.custom[id] || {}), id, deleted: true }; else delete db.custom[id];
      save(); closeModal(); route(); toast(`Deleted “${exMeta(id).name}”.`, { act: "ex-undel", label: "Undo" }); break; }
    case "ex-restore": { const id = t.dataset.id, c = db.custom[id]; if (!c) break; delete c.deleted; if (Object.keys(c).length <= 1) delete db.custom[id];
      save(); route(); toast(`Restored “${exMeta(id).name}”.`); break; }
    case "ex-undel": if (deletedEx) { if (deletedEx._none) delete db.custom[deletedEx.id]; else db.custom[deletedEx.id] = deletedEx; deletedEx = null; save(); route(); $("#toast").hidden = true; } break;
    case "prog-rm": UI.confirm = "rm:" + t.dataset.id; route(); break;
    case "prog-rm-yes": { const i = db.programs.findIndex((x) => x.id === t.dataset.id); if (i < 0) break;
      removedProg = db.programs[i]; db.programs.splice(i, 1); UI.confirm = null; save(); route();
      toast(`Removed “${removedProg.name}”.`, { act: "prog-restore", label: "Undo" }); break; }
    case "prog-restore": if (removedProg) { db.programs.push(removedProg); removedProg = null; save(); route(); $("#toast").hidden = true; } break;
    case "wk-move": { const [pid, w, did] = t.dataset.drag.split("|"), pr = prog(pid); if (!pr) break;
      const dd = pr.days.find((x) => x.id === did); if (!dd) break;
      const cur = P.movedDate(pr, +w, dd) || P.dayDate(pr, +w, dd);
      openModal(`<div class="row"><h2 class="grow">Move ${esc(dd.name)} · week ${+w + 1}</h2><button class="btn small ghost" data-act="modal-close">Close</button></div>
        <p class="sub">Only this week’s ${esc(dd.name)} moves. The client sees it on the new date in their app. You can also drag workouts on the calendar.</p>
        <label class="f">New date<input class="in" type="date" id="mv-date" value="${cur}" data-drag="${esc(t.dataset.drag)}"></label>
        <div class="row"><button class="btn primary" data-act="mv-save">Move</button>${P.movedDate(pr, +w, dd) ? `<button class="btn" data-act="mv-reset">Put back on ${esc(dateLabel(P.dayDate(pr, +w, dd)))}</button>` : ""}</div>`);
      break; }
    case "mv-save": case "mv-reset": { const inp = $("#mv-date"); moveSession(inp.dataset.drag, a === "mv-reset" ? null : inp.value); closeModal(); break; }
    case "dup-yes": {
      const src = prog(t.dataset.id), np = clone(src), to = $("#dup-to").value; np.id = pid(); np.coach = me().name; delete np.moves;
      if (to === "__tpl") { np.clientId = null; np.template = true; np.name = src.name; } else { np.clientId = to; np.template = false; np.name = src.template ? src.name : src.name + " (copy)"; }
      db.programs.push(np); save(); UI.confirm = null; location.hash = "#program-" + np.id; toast(to === "__tpl" ? "Saved to Saved programs." : `Copied to ${client(np.clientId).name}. Set the start date and adjust anything for them.`); break;
    }
    case "save-tpl": { const np = clone(p); np.id = pid(); delete np.moves; np.clientId = null; np.template = true; db.programs.push(np); save(); route(); toast(`“${p.name}” added to Saved programs.`); break; }
    case "tpl-new": { const np = newProgram(null); np.template = true; np.name = "New saved program"; save(); UI.day = 0; location.hash = "#program-" + np.id; break; }
    case "day-copy": UI.confirm = "day-copy"; route(); break;
    case "day-copy-yes": { const dest = prog($("#daycopy-to").value); if (!dest) break; const nd = clone(day); nd.id = uid("d"); nd.blocks.forEach((b) => { b.id = uid("b"); b.weeks = (b.weeks || []).slice(0, dest.weeks); while (b.weeks.length < dest.weeks) b.weeks.push(""); }); dest.days.push(nd); save(); UI.confirm = null; route(); toast(`Copied ${day.name} into “${dest.name}”.`); break; }
    case "ctab": UI.clientTab = t.dataset.t; route(); break;
    case "cal-move": { const [y, m] = (UI.calMonth || todayISO().slice(0, 7)).split("-").map(Number), d = new Date(y, m - 1 + +t.dataset.d, 1); UI.calMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; route(); break; }
    case "cal-today": UI.calMonth = null; route(); break;
    case "daynote": { const cid = t.dataset.c, d = t.dataset.d, cur = (db.dayNotes[cid] || {})[d] || "";
      openModal(`<div class="row"><h2 class="grow">Private note · ${dateLabel(d)}</h2><button class="btn small ghost" data-act="modal-close">Close</button></div><p class="sub">Only coaches see this. The client never does.</p><textarea class="in" id="dn-text" rows="5" data-c="${cid}" data-d="${d}" placeholder="e.g. Check in about the knee; deload if it’s still sore.">${esc(cur)}</textarea><div class="row"><button class="btn primary" data-act="dn-save">Save</button>${cur ? `<button class="btn ghost danger" data-act="dn-del">Delete note</button>` : ""}</div>`); setTimeout(() => $("#dn-text")?.focus(), 30); break; }
    case "dn-save": case "dn-del": { const ta = $("#dn-text"), cid = ta.dataset.c, d = ta.dataset.d, v = a === "dn-del" ? "" : ta.value.trim(); db.dayNotes[cid] = db.dayNotes[cid] || {}; if (v) db.dayNotes[cid][d] = v; else delete db.dayNotes[cid][d]; save(); closeModal(); route(); break; }
    case "max-approve": { const c = client(t.dataset.c), m = c.maxes[t.dataset.ex]; if (m && m.pending) { m.target = m.pending.suggested; m.rm5 = Math.max(m.rm5 || 0, m.pending.rm5); delete m.pending; save(); route(); toast(`${exMeta(t.dataset.ex).name} target max is now ${m.target}.${db.cloud ? ` ${c.name}’s app picks it up on its own.` : ` Download the program again for ${c.name}.`}`); } break; }
    case "max-dismiss": { const c = client(t.dataset.c), m = c.maxes[t.dataset.ex]; if (m) { delete m.pending; save(); route(); } break; }
    case "max-rm": { const c = client(t.dataset.c); delete c.maxes[t.dataset.ex]; save(); route(); break; }
    case "mx-save-tpl": { const c = client(t.dataset.c), name = prompt("Name this group of maxes", "Group " + (db.maxTemplates.length + 1)); if (name) { db.maxTemplates.push({ id: uid("mt"), name: name.slice(0, 60), lifts: Object.keys(c.maxes) }); save(); route(); toast("Max group saved."); } break; }
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
      const c = client(p.clientId), used = new Set(p.days.flatMap((d) => d.blocks.map((b) => b.ex)));
      const out = { ...clone(p), warmupDefault: db.warmupDefault, maxes: c ? clone(c.maxes) : {}, exercises: Object.fromEntries(Object.entries(db.custom).filter(([id]) => used.has(id))) };
      for (const m of Object.values(out.maxes)) delete m.pending;
      const blob = new Blob([JSON.stringify(out, null, 1)], { type: "application/json" }), url = URL.createObjectURL(blob);
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
    t.parentElement.querySelector(".pv").outerHTML = cellPreview(t.value, b.ex, p);
    t.parentElement.classList.toggle("off", !t.value.trim());
    return;
  }
  if (t.id === "ex-q") { UI.exQ = t.value; $("#ex-list").innerHTML = exListHTML(); return; }
  if (t.id === "pick-q" && UI.picker) { UI.picker.q = t.value; $("#pick-list").innerHTML = pickerHTML(t.value); return; }
  if (t.id === "cnotes") { client(t.dataset.c).notes = t.value; save(); return; }
  if (t.id === "cm-body") { MS.drafts[t.dataset.c] = t.value; return; }
  if (t.id === "cm-loom") { MS.loom[t.dataset.c] = t.value; return; }
  if (p && ["p-name", "d-name", "d-note", "d-warm", "d-cool"].includes(t.id)) {
    if (t.id === "p-name") p.name = t.value; else p.days[UI.day][{ "d-name": "name", "d-note": "note", "d-warm": "warmup", "d-cool": "cooldown" }[t.id]] = t.value;
    save(); if (t.id === "d-name") document.querySelector(`.dtab[aria-pressed="true"]`).lastChild.textContent = t.value; return;
  }
  if (UI.editing != null && p && ["s-group", "s-rest", "s-note", "s-video", "s-every", "s-rounds", "s-work", "s-irest", "s-wu"].includes(t.id)) {
    applySettings(p);
    if (t.id === "s-wu") { const b = p.days[UI.day].blocks[UI.editing], pv = $("#s-wu-pv"), cb = $("#s-warm"); if (pv) pv.innerHTML = wuPreview(p, b, t.value); if (cb && b.warmupSets) cb.checked = true; }
  }
});
document.addEventListener("change", (ev) => {
  const t = ev.target, p = cur() ? prog(cur()) : null;
  if (t.id === "me") { if (db.cloud) return; db.me = t.value; save(); route(); return; }
  if (t.id === "ex-f") { UI.exF = t.value; $("#ex-list").innerHTML = exListHTML(); return; }
  if (["wu-reps", "wu-at", "wu-heavy"].includes(t.id)) {
    db.warmupDefault = P.warmupDefaultOf({ reps: $("#wu-reps").value, heavyAt: +$("#wu-at").value, heavyReps: $("#wu-heavy").value });
    save(); route(); toast("Warm-up default saved. Clients get it the next time their app loads."); return;
  }
  if (t.id === "c-coach") { client(t.dataset.c).coachId = t.value || null; save(); return; }
  if (t.id === "c-remote") { client(t.dataset.c).remote = t.value === "1"; save(); return; }
  if (t.dataset.mx) { const [cid, ex, f] = t.dataset.mx.split("|"), c = client(cid), v = parseFloat(t.value); c.maxes[ex] = c.maxes[ex] || {}; if (isFinite(v) && v > 0) c.maxes[ex][f] = v; else delete c.maxes[ex][f]; save(); route(); return; }
  if (t.id === "mx-add" && t.value) { client(t.dataset.c).maxes[t.value] = {}; save(); route(); return; }
  if (t.id === "mx-tpl" && t.value) { const c = client(t.dataset.c), tp = db.maxTemplates.find((x) => x.id === t.value); for (const id of tp.lifts) c.maxes[id] = c.maxes[id] || {}; save(); route(); return; }
  if (t.id === "from-tpl" && t.value) { const src = prog(t.value), np = clone(src); np.id = pid(); np.clientId = t.dataset.c; np.template = false; np.coach = me().name; db.programs.push(np); save(); UI.day = 0; location.hash = "#program-" + np.id; toast("Copied. Set the start date and adjust anything for this client."); return; }
  if (t.id === "feed-flag") { UI.feedFlagged = t.checked; route(); return; }
  if (t.id === "tplfile") {
    // A file of saved programs made from another coaching app (e.g. the TrueCoach import). Adding the same file twice adds nothing new.
    const f = t.files && t.files[0]; if (!f) return;
    f.text().then((txt) => {
      const d = JSON.parse(txt); if (!d || d.app !== "powerplant-templates" || !Array.isArray(d.programs)) throw new Error("bad");
      const key = (p) => p.source ? `${p.source.from}:${p.source.programId}:${p.source.part || 1}` : null;
      const have = new Set(db.programs.map(key).filter(Boolean)); let n = 0, ex = 0;
      for (const [id, e] of Object.entries(d.custom || {})) if (!db.custom[id] && !LIB[id]) { db.custom[id] = e; ex++; }
      for (const p of d.programs) {
        if (p.v !== 2 || !Array.isArray(p.days) || have.has(key(p))) continue;
        db.programs.push({ ...p, id: pid(), template: true, clientId: null }); n++;
      }
      save(); route(); toast(n || ex ? `Added ${n} saved program${n === 1 ? "" : "s"} and ${ex} exercise${ex === 1 ? "" : "s"}.` : "Everything in that file is already here.");
    }).catch(() => toast("That isn’t a saved-programs file."));
    t.value = "";
    return;
  }
  if (t.id === "logfile") {
    const f = t.files && t.files[0], cid = t.dataset.c; if (!f) return;
    f.text().then((txt) => {
      const d = JSON.parse(txt); if (!d || d.app !== "powerplant-log" || !Array.isArray(d.workouts)) throw new Error("bad");
      const have = new Set(db.logs.map((l) => l.id)), c = client(cid); let n = 0, maxes = 0;
      for (const w of d.workouts) {
        if (have.has(w.id)) continue; n++;
        db.logs.push({ ...w, clientId: cid, exercises: (w.exercises || []).map((e) => ({ ...e, sets: e.sets || [] })) });
        for (const m of w.maxes || []) { const cur = c.maxes[m.ex] = c.maxes[m.ex] || {}; if (!(cur.rm5 >= m.rm5)) { const before = P.targetOf(cur, UNITS); if (!cur.target && before) cur.target = before; /* the program keeps its weights until a coach approves */ cur.rm5 = m.rm5; if (m.suggested > P.targetOf(cur, UNITS) || !cur.target) cur.pending = { rm5: m.rm5, suggested: m.suggested, at: w.date }; maxes++; } }
      }
      save(); route(); toast(n ? `Loaded ${n} new workout${n === 1 ? "" : "s"}${maxes ? ` and ${maxes} new 5RM${maxes === 1 ? "" : "s"} to review` : ""}.` : "Nothing new in that file.");
    }).catch(() => toast("That isn’t a workouts file from the Power Plant app."));
    return;
  }
  if (UI.editing != null && p && (t.classList.contains("s-f") || ["s-fmt", "s-warm"].includes(t.id))) { applySettings(p); if (t.id === "s-fmt") openSettings(UI.editing); return; }
  if (!p) return;
  if (t.id === "p-weeks") { const n = Math.max(1, Math.min(16, Math.round(+t.value || 1))); p.weeks = n; for (const d of p.days) for (const b of d.blocks) { b.weeks = b.weeks || []; while (b.weeks.length < n) b.weeks.push(""); } save(); route(); }
  else if (t.id === "p-sched") { p.schedule = t.value; save(); route(); }
  else if (t.id === "p-start") { p.startDate = t.value; save(); route(); }
  else if (t.id === "d-wd") { p.days[UI.day].weekday = t.value === "" ? null : +t.value; save(); route(); }
  else if (t.id === "pv-week") { UI.previewWeek = +t.value; route(); }
  else if (t.dataset.cell || ["d-note", "d-warm", "d-cool", "p-name"].includes(t.id)) { const pv = $("#pv"); if (pv) pv.innerHTML = previewHTML(p, p.days[UI.day]); } // refresh only the client preview, keep focus
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
  b.warmup = $("#s-wu").value.trim(); if (!b.warmup) delete b.warmup;
  b.warmupSets = $("#s-warm").checked || !!(b.warmup && !/^\s*(none|no|off|skip)\s*$/i.test(b.warmup));
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

boot();
})();
