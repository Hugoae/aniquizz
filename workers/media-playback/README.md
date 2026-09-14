# Media playback Worker

Cloudflare Worker that streams match / Quiz-du-jour MP4s from the existing
`aniquizz-videos` R2 bucket. The filename never appears in the browser Network
tab: the game server seals `{ videoKey, exp }` into an AES-GCM token and the
client loads `{MEDIA_PLAYBACK_URL}/v/{token}`.

This does **not** stop Shazam or downloading the bytes. It only hides the
catalogue key (`DEATHNOTE-1535-OP2.mp4`) from socket payloads and request URLs
during guessing. The bucket stays public in this lot (Library / ETL still use
the raw keys).

## Bindings and secrets

| Name                    | Kind            | Purpose                                        |
| ----------------------- | --------------- | ---------------------------------------------- |
| `MEDIA`                 | R2 binding      | Same bucket as `R2_BUCKET` (`aniquizz-videos`) |
| `MEDIA_PLAYBACK_SECRET` | Wrangler secret | Must match Render `MEDIA_PLAYBACK_SECRET`      |
| `CORS_ORIGIN`           | `vars`          | Comma-separated SPA origins                    |

```bash
cd workers/media-playback
cp .dev.vars.example .dev.vars   # local only
npx wrangler secret put MEDIA_PLAYBACK_SECRET
npx wrangler deploy
```

Point the Worker at a custom hostname (for example `media.aniquizz.com`) and set
Render `MEDIA_PLAYBACK_URL` to that origin (no trailing path).

## Local fallback

If the game server has no `MEDIA_PLAYBACK_URL`, it keeps emitting public R2 keys
so `pnpm dev` works without this Worker.

## Routes

- `OPTIONS /v/{token}` — CORS preflight
- `GET /v/{token}` — stream the object (`Range` / `206` for seek)
- `HEAD /v/{token}` — metadata only

Invalid token → 404. Expired token → 410. Missing object → 404. Logs never
include `videoKey`.

After changing `wrangler.jsonc`, regenerate Env types (no runtime dump):

```bash
pnpm cf-typegen
```
