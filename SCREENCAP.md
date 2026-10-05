# Screencap

This repository is a fork of [CapSoftware/Cap](https://github.com/CapSoftware/Cap), rebranded as
Screencap and run as a personal, self-hosted instance at https://screencap.co. It is licensed under
AGPL-3.0 like upstream (see `LICENSE`); this public repository is the corresponding source.

Changes from upstream, all on top of upstream `main`:
- Branding: logo components (`packages/ui/src/components/icons/screencap-brand.ts`), icons in
  `apps/web/public`, preview-image templates in `apps/web/lib/og`, and user-visible text.
- Analytics: self-hosted Umami + Matomo snippets in `apps/web/app/layout.tsx`.
- Self-hosted builds hide Cap's compliance cards and the signed-out marketing nav on share pages.
- CI: upstream workflows removed; `.github/workflows/screencap-image.yml` builds
  `ghcr.io/ques123/screencap-web` on every push to `main`.

Updating from upstream: `git fetch upstream && git rebase upstream/main`, resolve conflicts, push.

Deployment config lives in a separate private repo (ques123/screencap).
