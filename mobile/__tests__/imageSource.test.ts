jest.mock('../src/lib/config', () => ({API_URL: 'https://api.example.com'}));

import {imageSource} from '../src/lib/imageSource';

describe('imageSource', () => {
  it('returns undefined without a url', () => {
    expect(imageSource()).toBeUndefined();
    expect(imageSource(null)).toBeUndefined();
    expect(imageSource('')).toBeUndefined();
  });

  it('prefixes a backend path with the API url and sends the ngrok header', () => {
    expect(imageSource('/files/abc')).toEqual({
      uri: 'https://api.example.com/files/abc',
      headers: {'ngrok-skip-browser-warning': '1'},
    });
  });

  it.each([
    'http://localhost:8080/files/abc',
    'http://127.0.0.1:8080/files/abc',
    'http://10.0.2.2:8080/files/abc',
    'http://0.0.0.0/files/abc',
  ])('points %s at the backend the app talks to', url => {
    expect(imageSource(url)?.uri).toBe(
      url.endsWith('/files/abc') ? 'https://api.example.com/files/abc' : '',
    );
  });

  it('trims the url', () => {
    expect(imageSource('  /files/x  ')?.uri).toBe(
      'https://api.example.com/files/x',
    );
  });

  it('keeps an outside url and sends a browser-like User-Agent', () => {
    const src = imageSource('https://upload.wikimedia.org/a.jpg');
    expect(src?.uri).toBe('https://upload.wikimedia.org/a.jpg');
    expect(src?.headers?.['User-Agent']).toContain('AlocaMobile');
  });

  it('does not rewrite hosts that only start like localhost', () => {
    expect(imageSource('http://localhost.example.com/a.jpg')?.uri).toBe(
      'http://localhost.example.com/a.jpg',
    );
  });
});
