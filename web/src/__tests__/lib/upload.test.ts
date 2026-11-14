import {afterEach, describe, expect, it, vi} from 'vitest';
import {api} from '@/lib/apiClient';
import {compressImage, uploadErrorKey, uploadImage} from '@/lib/upload';

const file = (type: string, size = 10, name = 'photo.png') =>
  new File([new Uint8Array(size)], name, {type});

describe('uploadErrorKey', () => {
  const rejected = (code?: string) => ({response: {status: 400, data: {code}}});

  it('maps the backend upload codes to i18n keys', () => {
    expect(uploadErrorKey(rejected('IMAGE_TOO_LARGE'))).toBe('common.imageTooLarge');
    expect(uploadErrorKey(rejected('IMAGE_TYPE'))).toBe('common.imageType');
  });

  it('returns null for other errors', () => {
    expect(uploadErrorKey(rejected('AI_BUSY'))).toBeNull();
    expect(uploadErrorKey(rejected())).toBeNull();
    expect(uploadErrorKey(new Error('x'))).toBeNull();
  });
});

describe('compressImage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('leaves GIFs and other types untouched', async () => {
    const gif = file('image/gif');
    const pdf = file('application/pdf');

    await expect(compressImage(gif)).resolves.toBe(gif);
    await expect(compressImage(pdf)).resolves.toBe(pdf);
  });

  it('leaves the file untouched where the browser cannot decode images', async () => {
    vi.stubGlobal('createImageBitmap', undefined);
    const png = file('image/png');

    await expect(compressImage(png)).resolves.toBe(png);
  });

  it('keeps small images as they are', async () => {
    const close = vi.fn();
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({width: 800, height: 600, close})));
    const png = file('image/png', 1000);

    await expect(compressImage(png)).resolves.toBe(png);
    expect(close).toHaveBeenCalled();
  });

  describe('resizing (fake canvas)', () => {
    const ctx = {fillStyle: '', fillRect: vi.fn(), drawImage: vi.fn()};
    const bitmap = (width: number, height: number) => ({width, height, close: vi.fn()});
    let canvasSize: {width: number; height: number};

    const fakeCanvas = (blob: Blob | null, context: unknown = ctx) => {
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
        canvasSize = {width: this.width, height: this.height};
        return context as CanvasRenderingContext2D;
      });
      vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => callback(blob));
    };

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('shrinks a large photo to 1600 px (JPEG, white background)', async () => {
      const big = bitmap(3200, 2400);
      vi.stubGlobal('createImageBitmap', vi.fn(async () => big));
      const jpeg = new Blob(['small'], {type: 'image/jpeg'});
      fakeCanvas(jpeg);

      const result = await compressImage(file('image/png', 5_000_000));

      expect(result).toBe(jpeg);
      expect(canvasSize).toEqual({width: 1600, height: 1200});
      expect(ctx.fillStyle).toBe('#fff');
      expect(ctx.drawImage).toHaveBeenCalledWith(big, 0, 0, 1600, 1200);
      expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.82);
      expect(big.close).toHaveBeenCalled();
    });

    it('re-encodes a heavy photo even when it is small enough in pixels', async () => {
      vi.stubGlobal('createImageBitmap', vi.fn(async () => bitmap(1200, 800)));
      const jpeg = new Blob(['x'], {type: 'image/jpeg'});
      fakeCanvas(jpeg);

      await expect(compressImage(file('image/webp', 900_000))).resolves.toBe(jpeg);
      expect(canvasSize).toEqual({width: 1200, height: 800});
    });

    it('keeps the original when re-encoding does not make it smaller', async () => {
      vi.stubGlobal('createImageBitmap', vi.fn(async () => bitmap(4000, 3000)));
      fakeCanvas(new Blob([new Uint8Array(100)], {type: 'image/jpeg'}));
      const original = file('image/jpeg', 50);

      await expect(compressImage(original)).resolves.toBe(original);
    });

    it('keeps the original when the canvas gives nothing', async () => {
      vi.stubGlobal('createImageBitmap', vi.fn(async () => bitmap(4000, 3000)));
      const original = file('image/jpeg', 2_000_000);

      fakeCanvas(null);
      await expect(compressImage(original)).resolves.toBe(original);

      vi.restoreAllMocks();
      const b = bitmap(4000, 3000);
      vi.stubGlobal('createImageBitmap', vi.fn(async () => b));
      fakeCanvas(null, null); // no 2D context
      await expect(compressImage(original)).resolves.toBe(original);
      expect(b.close).toHaveBeenCalled();
    });

    it('uploadImage sends the compressed photo as .jpg', async () => {
      vi.stubGlobal('createImageBitmap', vi.fn(async () => bitmap(3000, 3000)));
      fakeCanvas(new Blob(['small'], {type: 'image/jpeg'}));
      const post = vi.spyOn(api, 'post').mockResolvedValue({data: {url: 'http://api.test/files/2'}});

      await uploadImage(file('image/png', 3_000_000, 'IMG_0001.png'));

      const [, form] = post.mock.calls[0] as [string, FormData];
      expect((form.get('image') as File).name).toBe('IMG_0001.jpg');
    });
  });

  it('falls back to the original when decoding fails', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => Promise.reject(new Error('corrupt'))));
    const jpeg = file('image/jpeg', 10, 'a.jpg');

    await expect(compressImage(jpeg)).resolves.toBe(jpeg);
  });
});

describe('uploadImage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('posts the image as multipart field "image" and returns its URL', async () => {
    const post = vi
      .spyOn(api, 'post')
      .mockResolvedValue({data: {url: 'http://api.test/files/1'}});
    const gif = file('image/gif', 10, 'funny.gif');

    await expect(uploadImage(gif)).resolves.toBe('http://api.test/files/1');

    const [url, form] = post.mock.calls[0] as [string, FormData];
    expect(url).toBe('/upload/image');
    const sent = form.get('image') as File;
    expect(sent.name).toBe('funny.gif');
    expect(sent.size).toBe(10);
  });
});
