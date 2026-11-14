// The host is compared as a whole: searching the link for "youtube.com" would
// also accept "notyoutube.com" or "https://evil.example/youtube.com/...".
const ID = /^[\w-]{11}$/;

const isYoutubeHost = (host) => host === "youtube.com" || host.endsWith(".youtube.com");

// Video id of a YouTube link (watch?v=, youtu.be/, /shorts/, /embed/, /live/), or null.
export const youtubeId = (link) => {
    try {
        const url = new URL(link);
        if (url.protocol !== "https:" && url.protocol !== "http:") {
            return null;
        }
        let id = null;
        if (url.hostname === "youtu.be") {
            id = url.pathname.slice(1).split("/")[0];
        } else if (isYoutubeHost(url.hostname)) {
            const [, kind, value] = url.pathname.split("/");
            id = ["shorts", "embed", "live"].includes(kind) ? value : url.searchParams.get("v");
        }
        return id && ID.test(id) ? id : null;
    } catch {
        // not a URL
        return null;
    }
};

// Still image of the video, for cards without a video file.
export const youtubeThumbnail = (link) => {
    const id = youtubeId(link);
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "";
};
