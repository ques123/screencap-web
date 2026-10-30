# Screencap

This repository is a fork of [CapSoftware/Cap](https://github.com/CapSoftware/Cap), rebranded as
Screencap and run at https://screencap.co by Dharma Loop LLC. It is licensed under AGPL-3.0 like
upstream (see `LICENSE`); this public repository is the corresponding source for the hosted service
and the Mac app.

## Changes from upstream (all on top of upstream `main`)
- Branding: logo components (`packages/ui/src/components/icons/screencap-brand.ts`), icons in
  `apps/web/public`, preview-image templates in `apps/web/lib/og`, user-visible text and email
  subjects. Fonts are Geist (OFL, see `licenses/fonts/`); `ASSETS.md` lists every bundled asset and
  its licence.
- Web: free-beta limits (`apps/web/lib/screencap-limits.ts`, `/api/upload/limits`), a Report link on
  share pages (`/api/report`), sign-up refusal by country (off by default), sign-in codes revoked
  after five wrong guesses, email through Brevo, self-hosted Umami + Matomo analytics.
- Web: free browser tools. Only the paths in `screencapToolPaths` (`apps/web/proxy.ts`) are served:
  `/tools`, MP4 to GIF, MOV to MP4 and the video speed controller; every other upstream tool route
  stays a 404. On Screencap builds `app/(site)/layout.tsx` wraps them in a header and footer matching
  the static site (`ScreencapHeader`/`ScreencapFooter`, fonts in `app/(site)/fonts`), and the
  converter hides its format pickers so it never links to a disabled route.
- Web: the dashboard's toolbar and empty state point people at the apps they don't have yet:
  `ChromeRecorderButton` shows "Record with extension" when the Screencap extension is installed (it stamps
  `data-cap-chrome-extension-installed` on screencap.co pages), "Add to Chrome" in Chrome without it, nothing
  elsewhere; `MacAppButton` (Macs only) shows "Open Mac app" once the app has signed in to the account
  (`userHasDesktopApp`: `screencap_user_clients` or a desktop auth key), "Get the Mac app" otherwise.
- Web: the admin panel shows where each user signed up from (`screencap_user_sources`, migration 0056):
  `SIGNUP_SOURCE_SNIPPET` (`@cap/database/screencap-sources`, run in the root layout and copied to the
  deploy repo's `site/assets/ref.js`; keep both in step) sets a first-touch `sc_ref` cookie on the first
  visit with an outside referrer, utm/ad-click params or a `/s/` share link; NextAuth `events.createUser`
  saves it (no cookie = "Direct"). Labels (ChatGPT, Google, Share link...) are computed at read time in
  `lib/screencap-admin/sources.ts`, so the rules can change without a backfill. Accounts made before
  2026-10-27 show "Not tracked".
- Web: the admin panel shows which apps each user has (`screencap_user_clients`: Mac app version
  from the `X-Cap-Desktop-Version` header on authenticated API calls, plus signed-in extension/mobile
  keys) and what made each recording (`screencap_video_clients`: Mac app version + Instant/Studio,
  web recorder or upload with browser and OS). Written by `@cap/database/screencap-clients`
  (migration `0055_screencap_clients`); recordings older than that are guessed from `videos.source`
  and marked "(guessed)". Read side: `lib/screencap-admin/clients.ts`.
- Web: admin Stats tab (`/dashboard/admin/stats`, `lib/screencap-admin/analytics.ts`, `adminStats(range, includeInternal)`).
  Days are Bangkok days (UTC+7; DB timestamps are UTC); 7d/30d/90d = today plus the days before, compared with the
  same-length window right before; "all" starts at the first sign-up day. Internal accounts = `SCREENCAP_ADMIN_EMAILS`
  plus the `internalEmails` setting (matched case-insensitively on `users.email`); unless included, their sign-ups,
  recordings, views of their recordings (`video_views.ownerId`) and views they made while signed in are left out.
  Views = `video_views` rows, viewers = distinct `sessionId`. Shared = recordings whose first `video_views` row falls
  in the period (owner views are never written). Funnel = people who signed up in the period who ever recorded / ever
  got a recording viewed. Platforms come from `screencap_video_clients` (falling back to `videos.source` type for older
  recordings). Sign-up sources reuse `classifySignupSource` (tracked since 2026-10-27).
- Web: admin Tools tab (`/dashboard/admin/tools`, `lib/screencap-admin/tools.ts`) shows whether the
  free tools are used, work and bring sign-ups: views, funnel, daily chart, failures by browser and
  error, sources (utm_source, else referrer: ChatGPT links carry utm_source=chatgpt.com but no referrer), countries, file sizes, and a Files log of the names of files picked (with outcome). Events come from `toolEvent()` in
  `components/tools/toolEvents.ts` via `POST /api/tools/events` into `screencap_tool_events`
  (migration 0054; `file_name` added in 0058 for `file_selected` and rejected-file events): buckets
  plus the picked file's name, no IP or raw user agent, deleted after 90 days by the
  nightly purge. `/signup?from=tool-<slug>` sets a 30-day `sc_tool` cookie and NextAuth
  `events.createUser` records `signed_up`.
- Web: transcripts and AI titles/summaries/chapters run on each user's own OpenRouter key (BYOK).
  Settings → AI & transcription (`app/(org)/dashboard/settings/ai`, connect via OpenRouter OAuth PKCE
  or paste a key); keys are encrypted in the `user_ai_settings` table (migration
  `0050_screencap_user_ai_settings`; renumber it if upstream adds its own 0050). Transcription uses
  `/api/v1/audio/transcriptions` on 5-minute MP3 chunks (`lib/openrouter/`), only models that return
  word timestamps are offered, and prices shown are per hour of video, rounded up. The video owner's
  key pays. Server-level AssemblyAI / `AI_PROVIDER` keys still work and are used when a user has no key.
- Mac app (`apps/desktop`): bundle id `co.screencap.desktop`, URL scheme `screencap-desktop://`,
  talks to screencap.co, Screencap icons and backgrounds, updates from this repository's GitHub
  Releases (Tauri updater, our own signing key), no Cap telemetry or crash reporting.
- End-to-end encrypted recordings (opt-in Mac app setting "End-to-end encrypt recordings", macOS
  only): the app encrypts every stored object before upload and the share link carries the key
  after `#k=`, so the server never sees plaintext. Format and shared test vectors:
  `packages/e2ee/FORMAT.md`, `packages/e2ee/test-vectors.json` (generated by
  `packages/e2ee/scripts/gen-vectors.py`); Rust `crates/e2ee` (+ `screencap-e2ee` CLI), browser
  `@cap/e2ee`. Encrypted recordings are always fMP4 segments (Studio and camera-only are remuxed on
  the Mac by `cap_enc_ffmpeg::remux_mp4_to_segments`), finalized by `/api/upload/recording-complete`
  without the media server (`apps/web/lib/e2ee-*.ts`), and played by hls.js with a decrypting
  fragment loader (`apps/web/app/s/[videoId]/_components/e2ee/`). Columns `videos.e2ee`,
  `videos.keyFingerprint`, `screencap_reports.decryptionKey` (migration 0053). Every media job skips
  e2ee videos. Never log or send a full share link: the fragment is the key.
- CI: upstream workflows removed; `.github/workflows/screencap-image.yml` builds
  `ghcr.io/ques123/screencap-web` on every push to `main`.

## Build it yourself
You don't have to trust our download. The Mac app in this repository is the app we ship, and you can
build it on your own Mac and still use screencap.co for sign-in, sharing and hosting.

1. Get the code: `git clone https://github.com/ques123/screencap-web.git && cd screencap-web`
2. Check it, or have an AI assistant check it. For example, open the folder in Claude Code and ask:
   "Review this repository before I build and install it. What does the Mac app send, and to which
   servers? What does `scripts/build-from-source.sh` download and run? Is there anything unsafe?"
3. Install the tools: Xcode from the App Store (open it once), Rust (https://rustup.rs),
   Bun (https://bun.sh), Node 20+ and cmake (`brew install cmake`).
4. Build: `scripts/build-from-source.sh` (the first build takes 15 to 40 minutes).
5. Install: `ditto target/<arch>/release/bundle/macos/Screencap.app /Applications/Screencap.app`
   (the script prints the exact path).

Your build is signed locally, so it opens without the "unidentified developer" step on the Mac that
built it. It talks to https://screencap.co like the official app. It still checks this repository's
releases for updates and may offer our signed build; decline it to stay on your own, and rebuild from
the latest code when you want to update. The build script downloads FFmpeg and other native libraries
from upstream Cap's GitHub releases (`scripts/setup.js`) and packages from npm and crates.io.

## Mac releases
Version `0.6.1NN` means upstream 0.6.1 plus our release NN; bump `apps/desktop/src-tauri/Cargo.toml`
(the build syncs `apps/desktop-gpui`), commit, then on a Mac with the Dharma Loop signing identity,
App Store Connect key and updater key:

    scripts/screencap-release.sh            # build both chips, notarize, publish screencap-vX.Y.Z
    scripts/screencap-release.sh --draft    # same, as a draft release (publish it later on GitHub)
    scripts/screencap-release.sh --skip-build   # reuse the last build of each target

The script builds with Tauri (signing only), makes the DMG with dmgbuild (no Finder scripting, so a
locked Mac is fine), notarizes and staples the DMG, then packs and signs the updater archive and
`latest.json`. The app checks `releases/latest/download/latest.json` a minute after launch and every
two hours. A team's first notarizations can take hours; the script waits and survives network drops.

Updating from upstream: `git fetch upstream && git rebase upstream/main`, resolve conflicts, run the
web unit tests (`cd apps/web && bunx vitest run __tests__/unit`), push.

Deployment config lives in a separate private repo (ques123/screencap).

## Guest recording (/record)
Anyone can record in the browser at `/record` without an account, up to 5 minutes
(`GUEST_MAX_RECORDING_MS` in `apps/web/lib/guest-record.ts`, the shared contract). Nothing is uploaded
before sign-in: the recording stays in the tab until the guest presses Stop and verifies an email.
- Flow: Stop opens `GuestSignInDialog` (`components/guest/`), which uses the normal email one-time-code
  sign-in (`signIn("email")`, then `/api/auth/callback/email`) without redirecting. New emails get an
  account plus "My Organization" (auth adapter `createUser`, so `sc_ref` attribution and the sign-up gates
  all apply); existing emails just sign in. The page then creates the video, uploads, and opens the share
  page with the link copied.
- Blocked sign-ups (blocked email or domain, blocked account, allowlist mode, blocked country) show up as
  next-auth `SignupBlocked`, `SignupCountryBlocked` or `AccessDenied`; `lib/guest-signin.ts` turns them
  into a plain message for the pop-up (it never says which rule fired).
- `GET /api/record/bootstrap` (session required, no-store): `{ userId, email, organisationId, isPro,
  maxRecordingSeconds }`. If an account has no organisation yet (invited or SSO users), it creates one.
- `POST /api/record/claim { videoId }` (session and ownership required, idempotent): sets
  `screencap_video_clients.detail = "guest"` on that video so the admin panel can count guest conversions.
- Funnel events (Umami and Matomo): `guest-record-start|stop|email|verified|blocked|uploaded|download`.
