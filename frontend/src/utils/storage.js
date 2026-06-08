// Utility to build storage URLs that respect REACT_APP_API_URL or the current origin
export function storageBase() {
    const api = process.env.REACT_APP_API_URL;
    if (api) return api.replace(/\/api\/v1\/?$/, "").replace(/\/api\/?$/, "");
    if (
        typeof window !== "undefined" &&
        window.location &&
        window.location.origin
    )
        return window.location.origin;
    return "";
}

export function storageUrl(path) {
    if (!path) return "";

    // If passed a File or Blob, create an object URL so the browser can load it
    if (
        typeof Blob !== "undefined" &&
        (path instanceof Blob || path instanceof File)
    ) {
        try {
            return URL.createObjectURL(path);
        } catch (e) {
            console.warn("storageUrl: failed to create object URL for blob", e);
            return "";
        }
    }

    // If an object was passed, try common properties
    if (typeof path === "object") {
        if (path.url && typeof path.url === "string") path = path.url;
        else if (path.path && typeof path.path === "string") path = path.path;
        else if (path.image && typeof path.image === "string")
            path = path.image;
        else {
            console.debug("storageUrl: received non-string path object", path);
            return "";
        }
    }

    // At this point we expect a string
    if (typeof path !== "string") {
        console.debug(
            "storageUrl: path is not a string after normalization",
            path
        );
        return "";
    }

    // Already an absolute URL or data/blob URL
    if (/^https?:\/\//i.test(path) || /^data:|^blob:/i.test(path)) return path;

    // strip leading slashes if present
    // strip leading slashes if present
    let p = path.replace(/^\/+/, "");
    // If caller already included a storage/ prefix (e.g. "storage/menus/.." or "/storage/..."), remove it
    p = p.replace(/^storage\//i, "");
    const result = `${storageBase()}/storage/${p}`;
    if (
        typeof process !== "undefined" &&
        process &&
        process.env &&
        process.env.NODE_ENV !== "production"
    ) {
        console.debug("storageUrl ->", {
            input: path,
            normalized: p,
            url: result,
        });
    }
    return result;
}

export default storageUrl;
