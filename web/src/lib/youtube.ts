// Links are read with the URL parser and the host is compared as a whole:
// searching the text for "youtube.com" would also accept
// "https://evil.example/youtube.com/watch?v=..." or "notyoutube.com".

const ID = /^[\w-]{11}$/;

const parse = (link: string): URL | null => {
  try {
    const url = new URL(link);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
  } catch {
    return null;
  }
};

const isYoutubeHost = (host: string) => host === 'youtube.com' || host.endsWith('.youtube.com');

// Video id of a YouTube link (watch?v=, youtu.be/, /shorts/, /embed/, /live/), or null.
export const youtubeId = (link: string): string | null => {
  const url = parse(link);
  if (!url) {
    return null;
  }
  let id: string | null = null;
  if (url.hostname === 'youtu.be') {
    id = url.pathname.split('/')[1] ?? null;
  } else if (isYoutubeHost(url.hostname)) {
    const [, kind, value] = url.pathname.split('/');
    id = ['shorts', 'embed', 'live'].includes(kind) ? value : url.searchParams.get('v');
  }
  return id && ID.test(id) ? id : null;
};

// Still image of the video, "" for any other URL.
export const youtubeThumbnail = (link: string) => {
  const id = youtubeId(link);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '';
};

// Player that can be put in an <iframe> (privacy-enhanced domain, starts playing).
export const youtubeEmbedUrl = (id: string) =>
  `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`;

// Shorts are vertical
export const isYoutubeShort = (link: string) => {
  const url = parse(link);
  return !!url && isYoutubeHost(url.hostname) && url.pathname.startsWith('/shorts/');
};
