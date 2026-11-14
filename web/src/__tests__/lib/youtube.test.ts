import {describe, expect, it} from 'vitest';
import {isYoutubeShort, youtubeEmbedUrl, youtubeId, youtubeThumbnail} from '@/lib/youtube';

describe('youtube links', () => {
  it.each([
    ['https://www.youtube.com/watch?v=abcdefghijk', 'abcdefghijk'],
    ['https://youtube.com/watch?feature=x&v=abcdefghijk', 'abcdefghijk'],
    ['https://youtu.be/abcdefghijk?si=x', 'abcdefghijk'],
    ['https://youtube.com/shorts/abcdefghijk', 'abcdefghijk'],
    ['https://www.youtube.com/embed/abcdefghijk', 'abcdefghijk'],
    ['https://www.youtube.com/live/abcdefghijk', 'abcdefghijk'],
  ])('%s -> %s', (link, id) => {
    expect(youtubeId(link)).toBe(id);
  });

  it('has no id in other links', () => {
    expect(youtubeId('https://example.com/watch?v=abcdefghijk')).toBeNull();
    expect(youtubeId('')).toBeNull();
  });

  it('builds the thumbnail and the embed URL, and tells shorts', () => {
    expect(youtubeThumbnail('https://youtu.be/abcdefghijk')).toBe('https://img.youtube.com/vi/abcdefghijk/hqdefault.jpg');
    expect(youtubeThumbnail('https://example.com')).toBe('');
    expect(youtubeEmbedUrl('abcdefghijk')).toContain('https://www.youtube-nocookie.com/embed/abcdefghijk?autoplay=1');
    expect(isYoutubeShort('https://youtube.com/shorts/abcdefghijk')).toBe(true);
    expect(isYoutubeShort('https://youtu.be/abcdefghijk')).toBe(false);
  });
});
