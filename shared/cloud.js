/* Power Plant cloud: the gym's Supabase project, shared by the client app and the coach dashboard.
   Sign-in screen (email + password), plus small helpers. The anon key is public by design: what each
   person can see is enforced by the database's row level security (see supabase/setup.sql). */
(() => {
"use strict";
const URL_ = "https://gikykxhyliaybrvxhfee.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdpa3lreGh5bGlheWJydnhoZmVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUwMzExMjIsImV4cCI6MjExMDYwNzEyMn0.yyr4o714SMm9DMzp7jbCsaVpLLBe_o6u5IsJ3e9gfQE";

let sb = null;
function client() {
  if (!sb) {
    if (!window.supabase || !window.supabase.createClient) return null;
    sb = window.supabase.createClient(URL_, ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: "pp-auth" } });
    sb.auth.onAuthStateChange((ev) => { if (ev === "PASSWORD_RECOVERY") recovery = true; });
  }
  return sb;
}
let recovery = /type=recovery/.test(location.hash);

async function session() {
  const c = client(); if (!c) return null;
  try { const { data } = await c.auth.getSession(); return data.session || null; } catch { return null; }
}

/* ---------- Sign-in screen ---------- */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const CSS = `
.ppauth{position:fixed;inset:0;z-index:9999;background:#141516;color:#f2f2f2;display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto;font-family:"IBM Plex Sans",system-ui,sans-serif}
.ppauth form{width:100%;max-width:380px;display:flex;flex-direction:column;gap:12px}
.ppauth h1{font-family:"Barlow Condensed",system-ui,sans-serif;font-weight:800;font-size:34px;letter-spacing:.5px;margin:0;text-transform:uppercase}
.ppauth h1 span{color:#f07521}
.ppauth p{margin:0;color:#b9bbbe;font-size:15px;line-height:1.45}
.ppauth label{display:flex;flex-direction:column;gap:6px;font-size:14px;color:#d6d7d9}
.ppauth input{font:inherit;font-size:16px;padding:12px;border-radius:10px;border:1px solid #3a3c3f;background:#1f2022;color:#fff}
.ppauth input:focus{outline:2px solid #f07521;outline-offset:1px}
.ppauth button{font:inherit;font-size:16px;font-weight:600;padding:12px;border-radius:10px;border:0;cursor:pointer}
.ppauth .go{background:#f07521;color:#141516}
.ppauth .go[disabled]{opacity:.6;cursor:default}
.ppauth .link{background:none;color:#f7a35c;padding:4px;font-weight:500}
.ppauth .row{display:flex;justify-content:space-between;flex-wrap:wrap;gap:4px}
.ppauth .err{color:#ff8a80}
.ppauth .ok{color:#9be29b}
`;
function authScreen({ app = "Power Plant", sub = "" } = {}) {
  return new Promise((resolve) => {
    if (!document.getElementById("ppauth-css")) { const st = document.createElement("style"); st.id = "ppauth-css"; st.textContent = CSS; document.head.appendChild(st); }
    const el = document.createElement("div"); el.className = "ppauth"; document.body.appendChild(el);
    let mode = recovery ? "reset" : "in", msg = "", ok = "";
    const c = client();
    const draw = () => {
      const email = (el.querySelector("#pa-email") || {}).value || "";
      const title = { in: "Sign in", up: "Create your account", forgot: "Reset your password", reset: "Choose a new password", check: "Check your email" }[mode];
      el.innerHTML = `<form novalidate>
        <h1>${esc(app.replace(/ (Coach)$/, ""))}${/ Coach$/.test(app) ? " <span>Coach</span>" : ""}</h1>
        <p><b>${title}</b>${mode === "in" && sub ? `<br>${esc(sub)}` : ""}</p>
        ${mode === "check" ? `<p>${esc(ok)}</p><button type="button" class="go" data-m="in">Back to sign in</button>` : `
        ${mode === "up" ? `<label>Your name<input id="pa-name" autocomplete="name" required></label>` : ""}
        ${mode !== "reset" ? `<label>Email<input id="pa-email" type="email" autocomplete="email" inputmode="email" required value="${esc(email)}"></label>` : ""}
        ${mode !== "forgot" ? `<label>${mode === "in" ? "Password" : "New password (at least 8 characters)"}<input id="pa-pass" type="password" autocomplete="${mode === "in" ? "current-password" : "new-password"}" minlength="${mode === "in" ? 1 : 8}" required></label>` : ""}
        ${msg ? `<p class="err" role="alert">${esc(msg)}</p>` : ""}${ok ? `<p class="ok">${esc(ok)}</p>` : ""}
        <button class="go">${{ in: "Sign in", up: "Create account", forgot: "Email me a reset link", reset: "Save password" }[mode]}</button>
        <div class="row">${mode === "in" ? `<button type="button" class="link" data-m="up">New here? Create an account</button><button type="button" class="link" data-m="forgot">Forgot password?</button>` : mode === "reset" ? "" : `<button type="button" class="link" data-m="in">I already have an account</button>`}</div>`}
      </form>`;
      const f = el.querySelector("#pa-name") || el.querySelector("#pa-email") || el.querySelector("#pa-pass"); if (f) f.focus();
    };
    el.addEventListener("click", (e) => { const b = e.target.closest("[data-m]"); if (!b) return; mode = b.dataset.m; msg = ok = ""; draw(); });
    el.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!c) { msg = "Can’t reach the server. Check your internet connection and try again."; draw(); return; }
      const v = (id) => ((el.querySelector(id) || {}).value || "").trim();
      const email = v("#pa-email").toLowerCase(), pass = (el.querySelector("#pa-pass") || {}).value || "", name = v("#pa-name");
      const btn = el.querySelector(".go"); btn.disabled = true; msg = ok = "";
      const back = location.href.split("#")[0];
      try {
        if (mode === "in") {
          const { error } = await c.auth.signInWithPassword({ email, password: pass });
          if (error) throw error;
          el.remove(); resolve(await session()); return;
        }
        if (mode === "up") {
          if (!name) throw new Error("Enter your name.");
          if (pass.length < 8) throw new Error("Use a password of at least 8 characters.");
          const { data, error } = await c.auth.signUp({ email, password: pass, options: { data: { name }, emailRedirectTo: back } });
          if (error) throw error;
          if (data.session) { el.remove(); resolve(data.session); return; }
          mode = "check"; ok = `We sent a link to ${email}. Open it on this device to finish creating your account, then sign in.`;
        } else if (mode === "forgot") {
          const { error } = await c.auth.resetPasswordForEmail(email, { redirectTo: back });
          if (error) throw error;
          mode = "check"; ok = `If ${email} has an account, a reset link is on its way. Open it on this device.`;
        } else if (mode === "reset") {
          if (pass.length < 8) throw new Error("Use a password of at least 8 characters.");
          const { error } = await c.auth.updateUser({ password: pass });
          if (error) throw error;
          recovery = false; history.replaceState(null, "", back); el.remove(); resolve(await session()); return;
        }
      } catch (err) { msg = friendly(err); }
      draw();
    });
    draw();
  });
}
function friendly(err) {
  const m = String((err && err.message) || err || "");
  if (/invalid login credentials/i.test(m)) return "That email and password don’t match. Try again, or reset your password.";
  if (/email not confirmed/i.test(m)) return "Open the link we emailed you to confirm your account first.";
  if (/already registered|already exists/i.test(m)) return "There’s already an account with that email. Sign in instead.";
  if (/rate limit|too many/i.test(m)) return "Too many tries for now. Wait a few minutes and try again.";
  if (/failed to fetch|network/i.test(m)) return "Can’t reach the server. Check your internet connection.";
  return m || "Something went wrong. Try again.";
}

async function signOut() { const c = client(); if (c) { try { await c.auth.signOut(); } catch {} } }

// A cheap fingerprint of a value, to tell which records changed since the last sync.
function hash(v) { const s = JSON.stringify(v ?? null); let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return s.length + ":" + (h >>> 0).toString(36); }

window.PPCloud = { client, session, authScreen, signOut, hash, friendly, isRecovery: () => recovery };
})();
