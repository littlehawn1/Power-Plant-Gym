/* Power Plant messages: the client ↔ coaches conversation, shared by the client app and the coach dashboard.
   One conversation per client (public.messages); any coach can answer. Clients can attach a form-check video
   (private storage bucket "form-checks", folder = the client's user id); coaches can reply with a Loom link. */
(() => {
"use strict";
const COLS = "id,client_id,sender_id,body,video_path,loom_url,workout_id,ex,created_at,read_at";
const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const MAX_VIDEO = 50 * 1024 * 1024; // the bucket's limit (Supabase free plan)
const LOOM = /loom\.com\/(?:share|embed)\/([a-f0-9]{32})/i;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const when = (iso) => new Date(iso).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
// Text with web links made clickable.
const linkify = (s) => esc(s).replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)"'\]]/g, (u) => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`);

const CSS = `
.pm-list{display:flex;flex-direction:column;gap:10px}
.pm{max-width:88%;padding:10px 12px;border-radius:14px;display:flex;flex-direction:column;gap:6px;overflow-wrap:anywhere;background:var(--surface);border:1px solid var(--line);align-self:flex-start;border-bottom-left-radius:4px}
.pm.mine{align-self:flex-end;background:var(--accent-soft);border-color:transparent;border-bottom-left-radius:14px;border-bottom-right-radius:4px}
.pm .who{font-size:12px;color:var(--muted)}
.pm .tag{font-size:12px;font-weight:600;align-self:flex-start;padding:2px 8px;border-radius:999px;background:var(--sunken);color:var(--ink)}
.pm .tag a{color:inherit}
.pm .body{white-space:pre-wrap}
.pm video{width:100%;max-width:420px;max-height:60vh;border-radius:10px;background:#000}
.pm .loom{position:relative;width:100%;max-width:480px;aspect-ratio:16/10;border-radius:10px;overflow:hidden;background:#000}
.pm .loom iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.pm-empty{color:var(--muted);text-align:center;padding:18px}
`;
function css() { if (!document.getElementById("pm-css")) { const s = document.createElement("style"); s.id = "pm-css"; s.textContent = CSS; document.head.appendChild(s); } }

// One message as a chat bubble. o: { mine, who, tag (html), tagHref }
function bubble(m, o) {
  const loom = m.loom_url && LOOM.exec(m.loom_url);
  return `<div class="pm${o.mine ? " mine" : ""}"><span class="who">${esc(o.who)} · ${esc(when(m.created_at))}</span>
    ${o.tag ? `<span class="tag">${o.tag}</span>` : ""}
    ${m.body ? `<div class="body">${linkify(m.body)}</div>` : ""}
    ${m.video_path ? `<video controls playsinline preload="metadata" data-path="${esc(m.video_path)}" aria-label="Form-check video"></video>` : ""}
    ${loom ? `<div class="loom"><iframe src="https://www.loom.com/embed/${loom[1]}" allowfullscreen loading="lazy" title="Video reply"></iframe></div><a href="${esc(m.loom_url)}" target="_blank" rel="noopener">Open the video in Loom</a>`
      : m.loom_url ? `<a href="${esc(m.loom_url)}" target="_blank" rel="noopener">Watch the video reply</a>` : ""}
  </div>`;
}

// Private videos play through short-lived signed links, fetched for whatever is on screen.
const urls = {};
async function hydrate(root) {
  const c = window.PPCloud && window.PPCloud.client(); if (!c || !root) return;
  const vids = [...root.querySelectorAll("video[data-path]")].filter((v) => !v.getAttribute("src"));
  const need = [...new Set(vids.map((v) => v.dataset.path).filter((p) => !(urls[p] && urls[p].exp > Date.now())))];
  if (need.length) {
    try {
      const { data, error } = await c.storage.from("form-checks").createSignedUrls(need, 3600);
      if (!error) for (const d of data || []) if (d && d.signedUrl) urls[d.path] = { url: d.signedUrl, exp: Date.now() + 55 * 60000 };
    } catch {}
  }
  for (const v of vids) {
    const u = urls[v.dataset.path];
    if (u) v.src = u.url;
    else v.outerHTML = `<span class="who">The video couldn’t be loaded. Check your connection and open this page again.</span>`;
  }
}

function checkVideo(file) {
  if (!file) return "";
  if (!VIDEO_TYPES.includes(file.type)) return "That file isn’t a video this app can send. Choose an MP4 or MOV video from your camera.";
  if (file.size > MAX_VIDEO) return `That video is ${Math.ceil(file.size / 1048576)} MB and the limit is 50 MB. Trim it or record a shorter clip (about a minute is plenty).`;
  return "";
}
async function upload(clientId, file) {
  const c = window.PPCloud.client();
  const ext = ((file.name.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5)) || (file.type === "video/quicktime" ? "mov" : "mp4");
  const path = `${clientId}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error } = await c.storage.from("form-checks").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}
async function removeUpload(path) { try { await window.PPCloud.client().storage.from("form-checks").remove([path]); } catch {} }
// A link the coach pastes: must be a web address.
function cleanLink(s) { s = String(s || "").trim(); if (!s) return ""; if (!/^https?:\/\//i.test(s)) s = "https://" + s; try { const u = new URL(s); return /^https?:$/.test(u.protocol) && u.hostname.includes(".") ? u.href : null; } catch { return null; } }

window.PPMessages = { COLS, MAX_VIDEO, css, bubble, hydrate, checkVideo, upload, removeUpload, cleanLink, esc, when };
})();
