# Third-party notices

## zca-js — MIT

Upstream: https://github.com/RFS-ADRENO/zca-js

Vendored baseline: https://github.com/tranvnthuong/zca-js/commit/edcbe7cbbf50e4e80af3e94c9b02b17f1c7e6a1c

Custom sticker proposal: https://github.com/RFS-ADRENO/zca-js/pull/389

Copyright (c) 2024–2025 RFS-ADRENO, truong9c2208, JustKemForFun. The fork contributor tranvnthuong provided the custom sticker implementation in PR #389. The original notice is preserved in [vendor/zca-js/LICENSE](vendor/zca-js/LICENSE).

`vendor/zca-js/src/` and `dist/`, including local compatibility changes to `apis/sendCustomSticker`, remain MIT-licensed. Changes set `oriUrl`/`hdUrl` to the animated WebP URL, add `jcp.pStickerType=1`, and set the matching sticker source metadata. The application's PolyForm license does not remove permissions granted by these third-party licenses.

The dependency manifests and lockfile are included. Installed `node_modules` are not redistributed; `npm run setup` installs the locked dependencies, each retaining its own license.

## FFmpeg and imageio-ffmpeg

FFmpeg: https://ffmpeg.org/ · licensing: https://ffmpeg.org/legal.html

imageio-ffmpeg: https://github.com/imageio/imageio-ffmpeg (BSD-2-Clause wrapper, version 0.7.0 used by setup).

No FFmpeg binary or Python dependency directory is committed. The setup helper obtains a binary through imageio-ffmpeg, or the user can supply `FFMPEG_PATH`. FFmpeg builds can carry LGPL/GPL obligations depending on configuration. The tested Windows binary was FFmpeg 7.1 essentials by gyan.dev with GPL enabled. Anyone redistributing binaries must separately comply with the applicable binary license and corresponding-source obligations.

## Typography

The UI requests Be Vietnam Pro from Google Fonts, falling back to installed system fonts. No font binary is included. Project: https://github.com/bettergui/BeVietnamPro (SIL Open Font License 1.1). Loading the font makes a request to Google Fonts; the application works with the system-font fallback offline.

## Zalo and media

Zalo is a third-party service and trademark. This project is unofficial and is not endorsed by Zalo or VNG. User-supplied images/videos retain their respective ownership; the code license does not license media uploaded by users. No sample personal media, account databases, credentials or QR images are part of the repository.
