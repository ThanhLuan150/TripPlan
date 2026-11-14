// Video id of a YouTube link (watch?v=, youtu.be/, /shorts/, /embed/), or null.
export const youtubeId = (link) => {
    try {
        const url = new URL(link);
        const host = url.hostname.replace(/^www\./, "");
        if (host === "youtu.be") {
            return url.pathname.slice(1).split("/")[0] || null;
        }
        if (host.endsWith("youtube.com")) {
            const [, kind, id] = url.pathname.split("/");
            if (["shorts", "embed", "live"].includes(kind)) {
                return id || null;
            }
            return url.searchParams.get("v");
        }
    } catch {
        // not a URL
    }
    return null;
};

// Still image of the video, for cards without a video file.
export const youtubeThumbnail = (link) => {
    const id = youtubeId(link);
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "";
};
