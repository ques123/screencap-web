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
- Mac app (`apps/desktop`): bundle id `co.screencap.desktop`, URL scheme `screencap-desktop://`,
  talks to screencap.co, Screencap icons and backgrounds, updates from this repository's GitHub
  Releases (Tauri updater, our own signing key), no Cap telemetry or crash reporting.
- CI: upstream workflows removed; `.github/workflows/screencap-image.yml` builds
  `ghcr.io/ques123/screencap-web` on every push to `main`.

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
