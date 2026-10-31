import { ThreadType } from "../models/index.js";
export type SendCustomStickerOptions = {
    /** Public URL of the static image used as the original, thumbnail, and HD image. */
    staticImgUrl: string;
    /** Public URL of the WebP image used by Zalo's sticker-like message renderer. */
    animationImgUrl: string;
    width: number;
    height: number;
    /** Optional serialized reference-message payload, matching Zalo's refMessage field. */
    reply?: string;
    /** Message TTL in seconds. Defaults to 0. */
    ttl?: number;
};
export type SendCustomStickerResponse = {
    msgId: number;
};
export declare const sendCustomStickerFactory: (ctx: import("../context.js").ContextBase, api: import("../apis.js").API) => (options: SendCustomStickerOptions, threadId: string, type?: ThreadType) => Promise<SendCustomStickerResponse>;
