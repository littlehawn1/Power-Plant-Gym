# Power Plant setup bot

A private Telegram bot that interviews Jess about how the coach dashboard and client app should work.
It runs on Claude and saves her answers for whoever is building the apps.

- Code: `src/worker.js` (a Cloudflare Worker). No secrets are stored in this repo.
- Storage (Workers KV):
  - `answers`: the answers recorded one by one
  - `summary`: the final write-up
  - `log:<chat id>`: the full transcript
  - `chat:<chat id>`: the conversation memory
- Access: only chats that open `t.me/<bot>?start=<INVITE_CODE>` can talk to it.

## Secrets (set in Cloudflare → Workers → powerplant-setup-bot → Settings → Variables and Secrets)
| Name | What |
| --- | --- |
| `TELEGRAM_TOKEN` | Token from @BotFather |
| `ANTHROPIC_API_KEY` | Claude API key (console.anthropic.com) |
| `WEBHOOK_SECRET` | Any long random string |
| `INVITE_CODE` | Short random code used in the start link |

## Deploy
```
npm install
npm run build                      # optional check; wrangler bundles on its own
npx wrangler kv namespace create KV  # put the id in wrangler.toml
npx wrangler deploy
```
Then open `https://<worker url>/connect?code=<INVITE_CODE>` once. It connects Telegram and prints the start link to send to Jess.

Model: `claude-opus-5-5` at low effort, with server-side fallbacks turned on.
