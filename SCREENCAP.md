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
