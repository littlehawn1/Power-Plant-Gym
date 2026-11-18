/* Power Plant setup interviewer: a Telegram bot that talks with the gym's coach to pin down how the
   coach dashboard and client app should work, and saves her answers for the person building the apps.

   Runs as a Cloudflare Worker. Bindings:
     KV              KV namespace: conversations, answers, transcripts
     TELEGRAM_TOKEN  secret: the bot token from @BotFather
     ANTHROPIC_API_KEY secret: Claude API key
     WEBHOOK_SECRET  secret: shared with Telegram so only Telegram can call /telegram
     INVITE_CODE     text: the code in the start link (t.me/<bot>?start=<code>) that lets a chat talk to the bot
*/
import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-5-5";
const MAX_HISTORY_MESSAGES = 300;

const isToolResult = (m) => m.role === "user" && Array.isArray(m.content) && m.content.some((b) => b.type === "tool_result");
/* The history sent to Claude. It is sent exactly as stored, never rewritten: Claude's thinking is tied
   to the conversation it was made in, so changing an earlier message (for example swapping an old photo
   for a placeholder) makes the API reject every later reply. Only a very long chat is trimmed, from the
   front, and the trim must start on a plain user message. */
function window_(history) {
  let start = Math.max(0, history.length - MAX_HISTORY_MESSAGES);
  while (start < history.length && (history[start].role !== "user" || isToolResult(history[start]))) start++;
  return history.slice(start);
}

const SYSTEM = `You are the setup interviewer for Power Plant Gym's new coaching software. You're chatting on Telegram with Jess, a strength and strongman coach at Power Plant Gym in Aston, PA. Someone in her family is building two things for the gym with help from Claude, and you're gathering what they need to get it right:
- a client app (clients see their coach's program, log workouts, see the gym's demo videos), already working in a first version
- a coach dashboard where coaches write programs week by week, like a spreadsheet: one row per exercise, one column per week

What's already known (don't ask again; confirm only if something she says contradicts it):
- Blocks are usually 6 or 12 weeks, most often 3 days a week; some clients train more or fewer days.
- Mostly scheduled by day of the week; "do them in order whenever you train" would also be nice.
- Progression is written by hand week to week: more volume on some lifts, more weight on others, less volume as load rises.
- Sets differ within an exercise: heavy top sets with lighter back-offs, occasional AMRAPs.
- Main lifts use % of max; accessories mostly RPE; sometimes tempo or pauses.
- Sometimes EMOMs and intervals. Warm-ups programmed for remote clients; warm-up sets always before the main compound lift.
- Strongman events are tracked many ways: time and weight over a distance, stone height and weight, max reps in a time window.
- Several coaches, each with their own login; coaches need to see each other's clients (in-person clients are coached by everyone).
- At a glance she mainly wants recently completed workouts and client notes.
- She programs on a laptop and currently uses TrueCoach; importing from TrueCoach would be great.
- Her spreadsheets put weeks in columns ("Week of" dates, "Weeks out" countdown, DELOAD and NEW MOVEMENTS markers), rows have a category ("vert pull", "1 leg quad") plus the exercise, and cells are written in plain English ("4 x 4 @ 80% of est 1RM", "build to a heavy triple, then 2 x 3-5 @ 90% of today's top wt", "same wt as last week, try for faster"). Group programs sometimes have two versions of a lift for different strength levels.
- She said percentages are usually of an estimated 1RM worked out from a 5-rep max, so the app needs a place to store each client's target or estimated max.

Open questions, roughly in priority order:
1. Exactly how she turns a 5-rep max into an estimated 1RM: a formula (Epley, Brzycki, 5RM ÷ 0.87 …) or her own chart. Get a worked example with real numbers, e.g. "a 200 lb 5RM gives what estimated max?"
2. Which maxes she wants stored per client and lift: estimated 1RM, tested 1RM, 5RM, competition weights for events, anything else. When does she update them?
3. Competition weights ("70% of comp wt"): stored per client per event, or per weight class for a group program?
4. "% of today's top weight": should the app fill in back-off weights automatically once the client logs the top set?
5. Group programs with two versions of a lift: does the coach assign a version to each client, or do clients choose?
6. What she wants to see when a client finishes a workout: notifications? A feed? Comparing what was prescribed with what was done? Flags for pain or missed reps?
7. Form-check videos from clients and replying with comments or chat: how she'd like that to work, and how quickly she usually replies.
8. TrueCoach: can she find an export (Settings, or per client)? If so, ask her to send one here.
9. Coach accounts: how many coaches, their roles, whether anyone should see only some clients, whether clients have a "main" coach.
10. Anything she loves or hates in TrueCoach or other apps, and anything she wants that we haven't asked about.

How to talk:
- Telegram style: short messages, plain text, no markdown headings or tables. One question at a time, two at most.
- Friendly and coach-to-coach. Use her terms (5RM, RPE, back-offs, comp weight). Don't over-explain lifting to her.
- When an answer is ambiguous, restate it with a concrete example and ask if that's right.
- She can skip anything, come back later, answer in any order, and send screenshots, photos of notebooks, spreadsheets or PDFs.
- You can't listen to voice notes; if she sends one, say so kindly and suggest typing or her keyboard's dictation mic.
- Never promise features, prices or dates. If she asks for something, say you'll pass it along.
- Save what you learn with the record_answer tool as you go (one call per clear answer, in her words plus any numbers). When she has covered the open questions or says she's done, write a full summary with save_summary, then send her a short recap and ask if anything is wrong.
- If she asks who sees this: her messages and answers are saved for the person building the apps and the Claude assistant helping them, and nothing is shared with clients.
- The first time you talk with her, introduce yourself in two or three sentences, say it takes about 10–15 minutes and can be done in pieces, then ask the first open question.`;

const TOOLS = [
  {
    name: "record_answer",
    description: "Save one clear answer from Jess. Call whenever she answers an open question or tells you a requirement. Returns 'saved'.",
    input_schema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "Short topic, e.g. '5RM to estimated 1RM', 'competition weights', 'form-check videos'" },
        answer: { type: "string", description: "What she said, in her words where possible, including any numbers or examples" },
        confidence: { type: "string", enum: ["confirmed", "needs follow-up"], description: "'confirmed' once she has agreed with your restatement" },
      },
      required: ["topic", "answer"],
      additionalProperties: false,
    },
  },
  {
    name: "save_summary",
    description: "Save the full summary of everything learned so far, organized by topic, with open items listed at the end. Call when the interview is complete or she says she's done. Returns 'saved'.",
    input_schema: { type: "object", properties: { summary: { type: "string" } }, required: ["summary"], additionalProperties: false },
  },
];

/* ---------- Telegram ---------- */
const tg = (env, method, body) => fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/${method}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());
async function send(env, chatId, text) {
  for (let i = 0; i < text.length; i += 3900) await tg(env, "sendMessage", { chat_id: chatId, text: text.slice(i, i + 3900) });
}
async function download(env, fileId) {
  const f = await tg(env, "getFile", { file_id: fileId });
  if (!f.ok) throw new Error("getFile failed");
  const res = await fetch(`https://api.telegram.org/file/bot${env.TELEGRAM_TOKEN}/${f.result.file_path}`);
  return { bytes: new Uint8Array(await res.arrayBuffer()), path: f.result.file_path };
}
function b64(bytes) { let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); }

/* ---------- Storage ---------- */
async function getJSON(env, key, fallback) { const v = await env.KV.get(key); return v ? JSON.parse(v) : fallback; }
const putJSON = (env, key, val) => env.KV.put(key, JSON.stringify(val));
async function logLine(env, chatId, who, text) {
  const key = `log:${chatId}`, cur = (await env.KV.get(key)) || "";
  await env.KV.put(key, cur + `[${new Date().toISOString()}] ${who}: ${text}\n`);
}

/* ---------- Turn a Telegram message into Claude content ---------- */
async function toContent(env, msg) {
  const parts = [], note = [];
  if (msg.photo && msg.photo.length) {
    const best = [...msg.photo].sort((a, b) => Math.abs(a.width - 1280) - Math.abs(b.width - 1280))[0];
    const { bytes } = await download(env, best.file_id);
    parts.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64(bytes) } });
    note.push("[photo]");
  }
  if (msg.document) {
    const d = msg.document, mime = d.mime_type || "", name = d.file_name || "file";
    if (d.file_size > 15 * 1024 * 1024) return { tooBig: true };
    const { bytes } = await download(env, d.file_id);
    if (/^image\/(jpeg|png|gif|webp)$/.test(mime)) parts.push({ type: "image", source: { type: "base64", media_type: mime, data: b64(bytes) } });
    else if (mime === "application/pdf") parts.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: b64(bytes) } });
    else if (/^text\/|csv|json/.test(mime) || /\.(csv|txt|tsv|json)$/i.test(name)) parts.push({ type: "text", text: `File "${name}":\n${new TextDecoder().decode(bytes).slice(0, 60000)}` });
    else return { unsupported: name };
    note.push(`[file: ${name}]`);
  }
  const text = msg.text || msg.caption || "";
  if (text) parts.push({ type: "text", text });
  if (!parts.length) return null;
  return { content: parts, logText: [...note, text].filter(Boolean).join(" ") };
}

/* ---------- One conversational turn with Claude (with the note-taking tools) ---------- */
async function converse(env, chatId, userContent) {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const key = `chat:${chatId}`;
  const state = await getJSON(env, key, { history: [] });
  const before = state.history.length;
  state.history.push({ role: "user", content: userContent });
  let reply = "";
  for (let round = 0; round < 4; round++) {
    let res;
    try {
      res = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 4000,
        output_config: { effort: "low" },
        betas: ["server-side-fallback-2026-07-01", "thinking-binding-controls-2026-08-01"],
        // If an older thinking block no longer matches the history, drop it instead of failing the reply.
        thinking: { type: "adaptive", block_binding: { prefix_mismatch_behavior: "drop_block" } },
        fallbacks: "default",
        system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
        tools: TOOLS,
        messages: window_(state.history),
      });
    } catch (e) {
      if (e instanceof Anthropic.RateLimitError) return "I'm getting a lot of messages right now. Give me a minute and send that again?";
      if (e instanceof Anthropic.AuthenticationError) return "I can't reach my brain right now (the Claude key isn't working). I'll let the app's builder know.";
      console.error("Claude API error", e.status, e.message);
      await env.KV.put("last_error", JSON.stringify({ at: new Date().toISOString(), status: e.status, message: String(e.message).slice(0, 2000) }));
      if (e instanceof Anthropic.APIError) return "Something went wrong on my end. Could you send that again in a minute?";
      throw e;
    }
    if (res.stop_reason === "refusal") { state.history.length = before; await putJSON(env, key, state); return "Sorry, I can't help with that one. Could you put it another way?"; }
    state.history.push({ role: "assistant", content: res.content }); // append the full response, unchanged
    const said = res.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
    if (said) reply += (reply ? "\n\n" : "") + said;
    const calls = res.content.filter((b) => b.type === "tool_use");
    if (!calls.length) break;
    const results = [];
    for (const c of calls) {
      if (c.name === "record_answer") {
        const answers = await getJSON(env, "answers", []);
        answers.push({ at: new Date().toISOString(), chatId, ...c.input });
        await putJSON(env, "answers", answers);
      } else if (c.name === "save_summary") {
        await env.KV.put("summary", `${new Date().toISOString()}\n\n${c.input.summary}`);
      }
      results.push({ type: "tool_result", tool_use_id: c.id, content: "saved" });
    }
    state.history.push({ role: "user", content: results });
  }
  await putJSON(env, key, state);
  return reply.trim() || "Got it.";
}

/* ---------- HTTP ---------- */
async function handleUpdate(env, update) {
  const msg = update.message; if (!msg || !msg.chat) return;
  const chatId = msg.chat.id;
  // Telegram can resend an update; handle each one once.
  if (await env.KV.get(`seen:${update.update_id}`)) return;
  await env.KV.put(`seen:${update.update_id}`, "1", { expirationTtl: 86400 });

  const access = await getJSON(env, "access", { chats: [] });
  const text = msg.text || "";
  if (text.startsWith("/start")) {
    const code = text.split(/\s+/)[1] || "";
    if (code && code === env.INVITE_CODE && !access.chats.includes(chatId)) { access.chats.push(chatId); await putJSON(env, "access", access); }
  }
  if (!access.chats.includes(chatId)) { await send(env, chatId, "Hi! This bot is private. If you were sent a link to it, please open that link to get started."); return; }

  if (msg.voice || msg.audio || msg.video_note) { await send(env, chatId, "I can't listen to voice notes yet, sorry! Could you type that, or use the microphone on your keyboard to dictate it?"); return; }
  await tg(env, "sendChatAction", { chat_id: chatId, action: "typing" });
  const conv = await toContent(env, text.startsWith("/start") ? { ...msg, text: "Hi! (I just opened the bot.)" } : msg);
  if (!conv) return;
  if (conv.tooBig) { await send(env, chatId, "That file is too big for me (15 MB max). A screenshot or a smaller export works great."); return; }
  if (conv.unsupported) { await send(env, chatId, `I can't open ${conv.unsupported} files. A screenshot, PDF or CSV works.`); return; }
  await logLine(env, chatId, msg.from && msg.from.first_name || "Jess", conv.logText);
  const reply = await converse(env, chatId, conv.content);
  await logLine(env, chatId, "Bot", reply);
  await send(env, chatId, reply);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/telegram" && request.method === "POST") {
      if (request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== env.WEBHOOK_SECRET) return new Response("forbidden", { status: 403 });
      const update = await request.json();
      try { await handleUpdate(env, update); } catch (e) { console.error(e); }
      return new Response("ok");
    }
    // One-time hookup: tells Telegram to send this bot's messages here. Needs the invite code so strangers can't call it.
    if (url.pathname === "/connect" && url.searchParams.get("code") === env.INVITE_CODE) {
      if (!env.TELEGRAM_TOKEN) return new Response("Add the TELEGRAM_TOKEN secret first.", { status: 400 });
      const r = await tg(env, "setWebhook", { url: `${url.origin}/telegram`, secret_token: env.WEBHOOK_SECRET, allowed_updates: ["message"], drop_pending_updates: true });
      const me = await tg(env, "getMe", {});
      return new Response(r.ok ? `Connected. Start link: https://t.me/${me.result.username}?start=${env.INVITE_CODE}` : `Telegram said: ${r.description}`, { headers: { "content-type": "text/plain" } });
    }
    return new Response("Power Plant setup bot", { headers: { "content-type": "text/plain" } });
  },
};
