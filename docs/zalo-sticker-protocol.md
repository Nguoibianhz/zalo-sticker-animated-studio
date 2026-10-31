# Zalo custom animated sticker protocol notes

This document records tested implementation details for custom animated WebP sticker messages that can be forwarded and reused from Zalo PC Recent / Gần đây.

## Transport

Use the session-aware zca-js API factory. For user chats the path is `/api/message/photo_url`; for groups it is `/api/group/photo_url`, based on the file service URL from `api.zpwServiceMap`. The library handles URL parameters, AES payload encoding, requests and response decoding. No authentication bypass is involved.

## Required compatibility details in the tested flow

- Original/HD image URL: animated WebP. Thumbnail URL: a PNG with visible subject.
- `webp`: serialized object with width, height and animation URL.
- `jcp`: serialized `{pStickerType:1}`. This is how the tested PC implementation serializes the classification; adding only a random top-level field is not equivalent.
- `properties`: type 3, subType 0, color/size -1, and serialized extension `{sSrcStr:"",sSrcType:-1}`.
- `contentId` and `clientId`: fresh identifiers for a new send; thumb/output dimensions match media.
- Recipient: `toId` for direct messages; `grid` and `visibility:0` for groups.

Internally the tested Zalo client calls pStickerType 1 AI_STICKER. That renderer classification does not assert that the artwork was made by AI or published in the official sticker store.

## Verified failure / correction

1. The initial custom photo-style payload showed animation on phone but was not reusable from PC recents.
2. Adding `jcp.pStickerType:1` enabled recents, but PNG ori/hd caused static or dark rendering.
3. Setting ori/hd to the animated WebP and using a clear PNG thumbnail resolved the observed behavior.

The tested output profile was 256×256, 15 FPS, quality 78 and infinite loop. Those are practical starting values, **not claimed Zalo server limits**. The implementation fetches the Zalo-uploaded animation and parses its WebP frames before sending.

## Sources and verification scope

- https://github.com/RFS-ADRENO/zca-js/pull/389
- https://github.com/tranvnthuong/zca-js/commit/edcbe7cbbf50e4e80af3e94c9b02b17f1c7e6a1c
- Read-only local inspection of Zalo PC 26.10.20, plus user-selected reference-message metadata and user-confirmed animation/forwarding/recents behavior on 2026-10-30.

No user message samples, identifiers, credentials, application binaries or private database extracts are published with these notes. This is a compatibility recipe for an undocumented API, not an official contract. Test new sends on both phone and PC after changing the library or payload.
