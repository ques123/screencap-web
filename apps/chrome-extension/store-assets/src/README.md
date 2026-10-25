# Store asset sources

HTML sources for the Chrome Web Store images in the parent folder. Nothing here is shipped in the extension.

- `capture.mjs` loads `dist/` as an unpacked extension (mocked signed-in state, placeholder camera feed and an "Acme" demo page) and writes the real UI to `captures/*.png`.
- `compose.mjs` renders `shot-*.html`, `promo-small.html` and `promo-marquee.html` (they reference `../../public/sky`, `../../public/fonts` and `captures/`) to flat 24-bit PNGs in `store-assets/`.

Regenerate (from `apps/chrome-extension`, after `bun run build`):

```sh
node store-assets/src/capture.mjs && node store-assets/src/compose.mjs
```

Needs Playwright's Chromium (monorepo `node_modules`) and `ffmpeg`. `sticker-logo.svg` is the logo from `src/shared/sticker.ts`.
