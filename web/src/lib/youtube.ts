// Video id of a YouTube link (watch?v=, youtu.be/, /shorts/, /embed/, /live/), or null.
export const youtubeId = (link: string): string | null => {
  const match = link.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
  return match ? match[1] : null;
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
export const isYoutubeShort = (link: string) => /youtube\.com\/shorts\//.test(link);
