# Chrome Web Store Listing

Everything below is ready to paste into the Chrome Web Store Developer Dashboard. Keep claims in sync with the extension version being submitted.

## Store Fields

Name: Screencap - Screen Recorder & Screen Capture

Short name: Screencap

Summary (132 char max, mirrors manifest description): Free, open source screen recorder. Capture your screen, tab, camera & mic in Chrome and share a video link the moment you stop.

Category: Productivity → Communication

Language: English

Website: https://screencap.co

Support: https://screencap.co

Privacy policy: https://screencap.co/privacy

## Detailed Description (paste as plain text)

Screencap is a free screen recorder for Chrome. Record your screen, a window, the current browser tab, or camera-only video. Your recording uploads while you record, so a shareable link is ready the moment you stop. No exports, no waiting, no switching tools.

WHY SCREENCAP

Screencap is a Loom alternative built to stay out of your way: one click to start, one link when you stop.

• Instant share links: video uploads as you record, so the link is live the second you stop.
• Fast and lightweight: a small recorder panel and a simple recording bar, nothing else on the page.
• Record what you need: a browser tab, a window, your full screen, or just your camera.
• Open source: the code is public on GitHub.

WHAT YOU CAN RECORD

• Current browser tab: perfect for web app demos and bug reports.
• Full screen or a single window.
• Camera-only video for quick personal updates.
• Microphone audio, system audio (where Chrome supports it), and a webcam overlay for walkthroughs.

MADE FOR EVERYDAY VIDEO

Screen recording for async standups, code reviews, bug reports, product demos, customer support, onboarding, tutorials, design feedback, and sales outreach. Record once, share a link, and skip the meeting.

HOW IT WORKS

1. Click the Screencap icon and pick tab, screen, window, or camera.
2. Choose your microphone and camera, then hit record.
3. Stop recording. Your video is already uploaded to your Screencap account and the share link is ready.

SCREENCAP EVERYWHERE

The extension is part of Screencap: record from Chrome and manage your recordings from your library at screencap.co. Recordings stay connected to your Screencap account wherever you capture them.

Open source on GitHub: https://github.com/ques123/screencap-web

## SEO Positioning

Primary keywords (use naturally in the description, never stuffed):

- screen recorder / screen recorder for Chrome
- screen capture / screen recording
- record browser tab
- screen recorder with camera and microphone
- webcam recorder
- video messaging / async video
- Loom alternative (used exactly once in the detailed description; never in the name, summary, or screenshot text)

Name strategy: "Screencap - Screen Recorder & Screen Capture" leads with the brand and covers the two highest-volume queries, matching how the top competitor titles its listing without keyword spam.

Summary strategy: front-loads "free screen recorder" (differentiator + keyword), lists capture surfaces, and ends on the instant-share-link benefit.

Review-safety notes:

- Keep every claim true for the submitted build (system audio is "where Chrome supports it").
- Do not mention competitor names in metadata fields other than the single description mention.
- Do not talk about plans or pricing in any store field.

## Icons

Toolbar and store icons live in `public/icons/` (16, 32, 48, 128 with padding, 256). The 128px icon is the store listing icon.

## Graphics assets

All in `store-assets/` (PNG, 24-bit, no alpha). Sources and the regenerate command are in `store-assets/src/README.md`. Screenshots show the real extension UI captured from `dist/` on a made-up "Acme" page with a placeholder camera feed; no real people, emails or third-party logos.

| Asset | Size | File | Shows |
|---|---|---|---|
| Screenshot 1 | 1280x800 | `store-assets/screenshot-1-record.png` | "Record in one click": the toolbar dropdown under the toolbar icon |
| Screenshot 2 | 1280x800 | `store-assets/screenshot-2-modes.png` | "Tab, window, screen or camera": the mode list open |
| Screenshot 3 | 1280x800 | `store-assets/screenshot-3-camera-mic.png` | "Camera and mic, your way": in-page "Ready to record" bar with the camera bubble |
| Screenshot 4 | 1280x800 | `store-assets/screenshot-4-recording.png` | "A small bar, nothing in the way": timer pill and camera bubble while recording |
| Screenshot 5 | 1280x800 | `store-assets/screenshot-5-link-ready.png` | "Your link is ready the moment you stop": the "Your recording is ready" page |
| Small promo tile | 440x280 | `store-assets/promo-small-440x280.png` | Sticker logo, "Screen recorder" on the sky photo (required) |
| Marquee | 1400x560 | `store-assets/promo-marquee-1400x560.png` | Logo, headline and the dropdown UI (optional, needed for featuring) |

---

## Privacy tab

### Single purpose

> Record the user's screen, a window, the current tab or their camera, with microphone and system audio, and upload the recording to the user's Screencap account so a share link is ready when they stop.

### Permission justifications

One per permission in `public/manifest.json` (version 1.0.4). Paste each into the matching field.

| Permission | Justification |
|---|---|
| `activeTab` | Lets the extension act on the tab the user is looking at when they click the toolbar icon or start a recording, for example to show the recording controls on that tab and to pick it as the tab to record. It is only used after a user gesture. |
| `identity` | Sign-in. The extension calls `chrome.identity.launchWebAuthFlow` to open the Screencap sign-in page at screencap.co in an isolated auth window and receive the result, so the user's password is never handled by the extension. |
| `offscreen` | Recording, encoding and uploading run in an offscreen document, because a Manifest V3 service worker cannot hold a media stream or use MediaRecorder and is shut down when idle. This keeps a recording going when the toolbar popup is closed. |
| `scripting` | Injects the in-page recording overlay (recording bar, countdown, camera bubble) into tabs that were already open before the extension was installed or updated, which the manifest content script does not reach. Nothing is injected except the extension's own overlay script. |
| `storage` | Keeps the sign-in token, the selected recording mode, camera and microphone, overlay preferences and the current recording state, so settings persist and a recording survives the service worker restarting. |
| `tabCapture` | Records the current browser tab (the "Current tab" mode) with its audio, through `chrome.tabCapture.getMediaStreamId`. Only used when the user picks that mode and starts a recording. |
| Host permissions (`http://*/*`, `https://*/*`, `file:///*`) | Needed to show the recording bar, countdown and camera bubble on whichever page the user chooses to record, and to inject them into tabs that are already open. The extension also talks to its own backend at https://screencap.co for sign-in and upload. The extension does not read, scrape or send page content, and it does not ask for any other host. |
| Content script on all pages (`content-bootstrap.js`) | A tiny script that waits for a message from the extension and, only when the user starts or opens a recording, loads the overlay (recording bar, countdown, camera bubble) onto the page being recorded. It has to be present on any page the user might record. It reads no page content. |

### Remote code

No. All JavaScript that runs is inside the extension package. No eval, no remotely hosted scripts. The extension only exchanges data (sign-in, recording upload) with https://screencap.co.

### Data usage disclosures

Declare exactly this. It must match the privacy policy at https://screencap.co/privacy.

| Chrome Web Store category | Collected? | Why |
|---|---|---|
| Personally identifiable information | Yes | The email address and name of the user's Screencap account, returned by screencap.co after sign-in so the extension knows who is signed in. |
| Health information | No | |
| Financial and payment information | No | |
| Authentication information | Yes | A sign-in token (API key) issued by screencap.co after sign-in, stored in `chrome.storage.local` and sent to screencap.co to authorise uploads. The extension never sees the user's password. |
| Personal communications | No | |
| Location | No | |
| Web history | No | The extension does not read or send URLs or titles of visited pages. Tab titles are compared locally to match a tab being captured and are not transmitted. |
| User activity | No | No analytics, tracking or telemetry code is in the extension. |
| Website content | Yes | Only what the user chooses to record: the screen, window or tab video plus microphone, system and tab audio and optional camera video, uploaded to the user's Screencap account. Nothing is captured until the user starts a recording. |

Use of data: app functionality only (sign-in and creating the recording the user asked for). Not advertising, not personalization, not sold.

### Certifications (tick all three)

- I do not sell or transfer user data to third parties, outside of the approved use cases. (Recordings are stored with Screencap's storage providers to deliver the service.)
- I do not use or transfer user data for purposes that are unrelated to the item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

### Privacy policy URL

https://screencap.co/privacy

---

## Before submitting

- [ ] Version in `public/manifest.json` is higher than any version already uploaded
- [ ] Store zip built with `bun run package:store` (manifest at the archive root)
- [ ] https://screencap.co/privacy is live and says what the data table above says (account email, sign-in token, uploaded recordings)
- [ ] Verify the "open source" claim: the GitHub link in the description (`ques123/screencap-web`) must be public, otherwise drop that line and the word "open source" from the summary and the manifest description
- [ ] Verify "system audio (where Chrome supports it)" still matches the build
- [ ] 128px store icon uploaded; 5 screenshots 1280x800; small promo tile 440x280; marquee 1400x560
- [ ] Listing text contains no em dashes, plan or pricing talk, or competitor names other than the single description mention
- [ ] Support URL and website URL set to https://screencap.co
- [ ] Single purpose, all permission justifications and the data table pasted from the Privacy tab section above
- [ ] The three certifications ticked
- [ ] Developer account email verified, and screencap.co verified in Search Console under the same Google account if you want the publisher line to show the domain
- [ ] A test account for reviewers (sign-in needs a Screencap account): add credentials in the dashboard's test instructions field, or state that sign-up is open
- [ ] After approval: add the listing URL to the website's install buttons
