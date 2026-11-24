import {api} from '../src/lib/apiClient';
import {uploadImage} from '../src/lib/upload';

describe('uploadImage', () => {
  let post: jest.SpyInstance;
  beforeEach(() => {
    post = jest
      .spyOn(api, 'post')
      .mockResolvedValue({data: {url: 'https://api/files/9'}});
  });
  afterEach(() => post.mockRestore());

  it('posts the photo as multipart "image" and returns its url', async () => {
    const url = await uploadImage({
      uri: 'file:///a.png',
      fileName: 'a.png',
      type: 'image/png',
    });
    expect(url).toBe('https://api/files/9');
    const [path, form, config] = post.mock.calls[0];
    expect(path).toBe('/upload/image');
    expect(config.headers['Content-Type']).toBe('multipart/form-data');
    expect(form).toBeInstanceOf(FormData);
  });

  it('defaults the name and type', async () => {
    const append = jest.spyOn(FormData.prototype, 'append');
    await uploadImage({uri: 'file:///b'});
    expect(append).toHaveBeenCalledWith('image', {
      uri: 'file:///b',
      name: 'photo.jpg',
      type: 'image/jpeg',
    });
    append.mockRestore();
  });

  it('lets an upload error through', async () => {
    post.mockRejectedValue(new Error('boom'));
    await expect(uploadImage({uri: 'x'})).rejects.toThrow('boom');
  });
});
