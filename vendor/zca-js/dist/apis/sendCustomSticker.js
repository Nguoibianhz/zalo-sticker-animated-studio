import { ZaloApiError } from "../Errors/ZaloApiError.js";
import { ThreadType } from "../models/index.js";
import { apiFactory, removeUndefinedKeys } from "../utils.js";
export const sendCustomStickerFactory = apiFactory()((api, _ctx, utils) => {
    const serviceURL = {
        [ThreadType.User]: utils.makeURL(`${api.zpwServiceMap.file[0]}/api/message/photo_url`, {
            nretry: "0",
        }),
        [ThreadType.Group]: utils.makeURL(`${api.zpwServiceMap.file[0]}/api/group/photo_url`, {
            nretry: "0",
        }),
    };
    /**
     * Send a custom sticker-style image message using public image URLs.
     *
     * This uses an undocumented Zalo endpoint and is not the same as registering
     * a sticker in Zalo's sticker catalog. Endpoint compatibility may change.
     */
    return async function sendCustomSticker(options, threadId, type = ThreadType.User) {
        var _a;
        if (!(options === null || options === void 0 ? void 0 : options.staticImgUrl) || !(options === null || options === void 0 ? void 0 : options.animationImgUrl)) {
            throw new ZaloApiError("Missing custom sticker image URL");
        }
        if (!threadId)
            throw new ZaloApiError("Missing threadId");
        if (type !== ThreadType.User && type !== ThreadType.Group) {
            throw new ZaloApiError("Thread type is invalid");
        }
        if (!Number.isFinite(options.width) || options.width <= 0) {
            throw new ZaloApiError("Invalid sticker width");
        }
        if (!Number.isFinite(options.height) || options.height <= 0) {
            throw new ZaloApiError("Invalid sticker height");
        }
        const isGroupMessage = type === ThreadType.Group;
        const params = {
            clientId: Date.now(),
            title: "",
            oriUrl: options.animationImgUrl,
            thumbUrl: options.staticImgUrl,
            hdUrl: options.animationImgUrl,
            width: options.width,
            height: options.height,
            properties: JSON.stringify({
                subType: 0,
                color: -1,
                size: -1,
                type: 3,
                ext: JSON.stringify({ sSrcStr: "", sSrcType: -1 }),
            }),
            contentId: Date.now(),
            jcp: JSON.stringify({ pStickerType: 1 }),
            thumb_height: options.height,
            thumb_width: options.width,
            webp: JSON.stringify({
                width: options.width,
                height: options.height,
                url: options.animationImgUrl,
            }),
            zsource: -1,
            ttl: (_a = options.ttl) !== null && _a !== void 0 ? _a : 0,
            refMessage: options.reply,
            toId: isGroupMessage ? undefined : threadId,
            visibility: isGroupMessage ? 0 : undefined,
            grid: isGroupMessage ? threadId : undefined,
        };
        removeUndefinedKeys(params);
        const encryptedParams = utils.encodeAES(JSON.stringify(params));
        if (!encryptedParams)
            throw new ZaloApiError("Failed to encrypt custom sticker params");
        const response = await utils.request(serviceURL[type], {
            method: "POST",
            body: new URLSearchParams({ params: encryptedParams }),
        });
        return utils.resolve(response);
    };
});
