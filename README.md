# Zalo Sticker Animated Studio

**Create custom animated Zalo stickers from video — crop a square, preview motion, save an editable project, scan a Zalo QR code, and send with your own `!command`.**

**Tạo sticker động Zalo từ video:** cắt vuông, zoom, đổi tốc độ, xem trước, lưu dự án, đăng nhập QR và đặt lệnh gửi. Includes the animated WebP payload compatibility changes tested for forwarding and reuse in **Zalo PC “Gần đây” (Recent stickers)**.

[![Test](https://github.com/Nguoibianhz/zalo-sticker-animated-studio/actions/workflows/test.yml/badge.svg)](https://github.com/Nguoibianhz/zalo-sticker-animated-studio/actions/workflows/test.yml)
[![License: PolyForm Noncommercial](https://img.shields.io/badge/license-PolyForm%20Noncommercial-187967)](LICENSE)
[![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-3c873a)](https://nodejs.org/)

Created by **[Nguyễn Mạnh Hiếu / Nguoibianhz](https://github.com/Nguoibianhz)**. Original repository: **https://github.com/Nguoibianhz/zalo-sticker-animated-studio**.

## What this is

A white, minimal, Vietnamese-language **local web application** for making personal Zalo animated stickers. It uses Node.js, FFmpeg and an unofficial zca-js integration. It is not a sticker pack submission service, official Zalo API, or cloud-hosted bot. No official sticker-store publication is needed for this workflow.

Useful search terms: **Zalo custom animated sticker maker**, **video to Zalo sticker**, **GIF to Zalo sticker**, **animated WebP**, **Zalo QR login**, **Zalo PC recent stickers**, **tạo sticker động Zalo**, **sticker Zalo tự tạo**, **cắt video vuông làm sticker**.

## Features

- Upload MP4, MOV, WebM or GIF (up to 100 MB and 120 seconds).
- Freely position/resize a square crop; pan and zoom the video.
- Trim start/end, adjust playback speed from 0.25× to 4×, choose 128–512 px and 10–30 FPS.
- Preview the crop and the actual rendered animated WebP; choose a clear thumbnail frame.
- Download `.webp` or save a `.zsticker` project containing the original media and editing settings.
- Reopen/edit saved projects; keep a local library with delete/undo.
- Generate the Zalo login QR **inside the web UI**.
- Set a custom `!command` per sticker, explicitly arm selected stickers, and see send activity.
- Send only in response to an exact command written by the logged-in account.
- Keep sessions in memory and media on the local machine; no public media hosting required.

## Quick start — Windows

Requirements: **Node.js 20+**, **Python 3 with pip** for automatic FFmpeg setup, Git and an Internet connection for installation/Zalo. Alternatively set `FFMPEG_PATH` to your own FFmpeg binary; then Python is unnecessary.

```powershell
git clone https://github.com/Nguoibianhz/zalo-sticker-animated-studio.git
cd zalo-sticker-animated-studio
npm run setup
npm start
```

Open **http://127.0.0.1:4317**. On subsequent runs, double-click **`start.bat`** or use `npm start`. Keep the server window open while using the application. No Bun, database server or frontend build step is needed.

`npm run setup` installs the vendored zca-js runtime dependencies from its lockfile with lifecycle scripts disabled. It prepares FFmpeg through the pinned `imageio-ffmpeg==0.7.0` Python package. FFmpeg binaries and installed dependencies are not committed to this repository.

### Bring your own FFmpeg

```powershell
$env:FFMPEG_PATH = 'C:\path\to\ffmpeg.exe'
npm run setup
npm start
```

The app can also run with Node and a compatible FFmpeg on other operating systems, but Windows is the tested target. The media integration test also accepts `FFMPEG_PATH`.

## Make and send a sticker

1. **Choose video / Chọn video**: upload or drag a file into the editor.
2. Drag the square region to select the subject. Drag its bottom-right corner to resize. Use +/− or the mouse wheel to zoom; the pan tool moves the video under the crop.
3. Adjust start/end, speed, output size and FPS. Scrub to a visible frame and choose **Chọn ảnh bìa**.
4. Name it and set the command, for example `rockmeme`; the UI adds the `!` prefix.
5. Click **Tạo sticker động**. The right-hand preview now shows the rendered WebP, with frame count and file size.
6. Download **WebP**, or **Lưu dự án** to save an editable `.zsticker`. Use **Mở dự án** to reopen it later. A project export includes the original video: share it only when you intend to share that media.
7. Close other personal-Zalo tools/listeners, then open **Kết nối Zalo → Tạo mã QR**. Scan with Zalo on your phone and approve login.
8. Select ready stickers and press **Bật các lệnh đã chọn**. From your own Zalo account, send `!rockmeme` in the conversation where you want the sticker.
9. Check motion on phone/PC, forward the new message on PC, and try reusing it from **Gần đây**. Disconnect the session when finished.

Multiple selected stickers with the same command are sent as a batch. Uploading/rendering a video alone never sends a message. Restarting the server ends the in-memory Zalo session and requires a fresh QR login.

## Delete / undo

Use **×** on a library card, confirm, then choose **Hoàn tác** within the 15-second notification if needed. Deletion disables that sticker's armed command and moves its local project into `data/_trash/<id>`. It does not retract messages already sent on Zalo. Restore does not automatically re-arm commands. A render or active send must finish before deletion.

## Configuration and storage

| Variable / path | Purpose |
| --- | --- |
| `PORT` | Local HTTP port; default `4317` |
| `FFMPEG_PATH` | Optional full path to an FFmpeg executable |
| `DATA_DIR` | Optional project storage directory; default `data/` |
| `data/<id>/project.json` | Name, command, crop and render settings |
| `data/<id>/source` | Original uploaded media |
| `data/<id>/preview.mp4` | Browser-compatible preview |
| `data/<id>/sticker.webp`, `thumbnail.png` | Generated output |
| `.zsticker` | JSON archive with base64 original media and settings; no login session |

The server binds to `127.0.0.1`, checks Host and requires a per-process token for mutations. It has no Internet-facing user authentication: **do not expose it through a public tunnel**. The current browser tab must be reloaded after a server restart so it receives the new token.

## Why some Zalo custom stickers are static or missing from PC recents

The integration uses a corrected `photo_url` payload rather than assuming every WebP image is a complete sticker. The important tested fields are:

```js
{
  oriUrl: animatedWebpUrl,
  hdUrl: animatedWebpUrl,
  thumbUrl: staticPngUrl,
  webp: JSON.stringify({ width, height, url: animatedWebpUrl }),
  jcp: JSON.stringify({ pStickerType: 1 }),
  properties: JSON.stringify({
    subType: 0, color: -1, size: -1, type: 3,
    ext: JSON.stringify({ sSrcStr: '', sSrcType: -1 })
  })
}
```

Setting `pStickerType` fixed recents in the tested PC client, but **`oriUrl` and `hdUrl` must also point to the animated asset**. Leaving PNG there caused static/black rendering. The app checks the uploaded WebP still contains multiple animation frames before sending. See [protocol notes](docs/zalo-sticker-protocol.md).

This behavior was verified in the original tool on **2026-10-30 with Zalo PC 26.10.20**. The web UI's upload/render/project round-trip/QR flow has been exercised; automated tests do not log in or send real Zalo messages. Future Zalo versions, accounts and forwarding behavior still require real-client verification.

## Development

```powershell
npm run setup
npm test
npm start
```

Tests generate a synthetic video, exercise real FFmpeg rendering and speed/trim, archive export/import, range requests, input validation, and reversible deletion. They use a temporary data directory and never send Zalo messages.

| Source | Responsibility |
| --- | --- |
| `public/index.html`, `style.css`, `app.js` | Editor, preview, library, exports and QR dialog |
| `server.mjs` | Local API, render jobs, archive format and Zalo session/listener |
| `lib.mjs` | Crop/command validation and WebP frame parsing |
| `scripts/setup.mjs` | Reproducible dependency/FFmpeg preparation |
| `vendor/zca-js/src/`, `dist/` | MIT-licensed upstream source and patched runtime |
| `tests/studio.test.mjs` | Validation and real-media integration tests |

The vendored upstream baseline is [`edcbe7c`](https://github.com/tranvnthuong/zca-js/commit/edcbe7cbbf50e4e80af3e94c9b02b17f1c7e6a1c), related to [zca-js PR #389](https://github.com/RFS-ADRENO/zca-js/pull/389). Both TypeScript source and compiled custom-sticker factory carry the compatibility changes. Rebuilding the upstream package without these changes can reintroduce the bug.

## Troubleshooting

- **Unexpected end of JSON / old server:** close the server window, reopen `start.bat`, then reload the browser. Editing source does not hot-reload Node.
- **QR expired:** generate a new QR and confirm promptly on the phone. QR images/tokens should never be posted in issues.
- **Command does nothing:** verify the session is connected, sticker has been rendered and armed, the exact command matches, and the command was written by the same account that scanned QR.
- **Still static on PC:** inspect the new message, not an old cached sticker; verify animated WebP in ori/hd and clear thumbnail. Check the send activity for upload errors.
- **Another listener stopped:** close the old tool and connect again. Personal Zalo web sessions/listeners may conflict.
- **Zalo PC accessibility lag/crash:** avoid UI-automation inspection of the native Zalo client during this workflow. One tested client had repeated UIAutomation-related crashes; this is not a diagnosis for every lag issue.

## License, authorship and commercial use

Original application code, UI and documentation: **[PolyForm Noncommercial License 1.0.0](LICENSE)**, with mandatory author/original-repository notices in [NOTICE](NOTICE). This is **source-available, not an unrestricted open-source license**.

- Noncommercial use, modification and sharing are permitted under the license.
- Preserve the license and the `Required Notice:` attribution lines when redistributing covered material.
- Commercial exploitation, paid hosted services, resale/repackaging and commercial redistribution of the covered application require separate permission unless a license exception applies. Contact [Nguoibianhz](https://github.com/Nguoibianhz).
- Do not remove author notices or falsely present the original project as your own.
- Third-party code retains its own terms; especially **zca-js remains MIT**. These restrictions do not revoke upstream rights. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

The license text controls; this summary does not override its exceptions or applicable law. Publishing on GitHub still permits platform-supported viewing/forking under GitHub's terms. No license can technically prevent all infringement or guarantee enforcement.

## Attribution

Original application: **Nguyễn Mạnh Hiếu / Nguoibianhz** — https://github.com/Nguoibianhz/zalo-sticker-animated-studio

Zalo integration foundation: **RFS-ADRENO, truong9c2208, JustKemForFun**, and **tranvnthuong**'s custom-sticker proposal. Preserve their MIT notices as well.

Zalo/VNG do not sponsor or endorse this project. The unofficial API may change and may affect account access. This project is for manually initiated personal sticker use, not mass messaging or evading platform protections.
