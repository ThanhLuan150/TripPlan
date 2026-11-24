import {afterEach, describe, expect, it, vi} from 'vitest';
import {safeFileName, saveBlob} from '@/lib/download';

describe('safeFileName', () => {
  it('keeps the name and drops characters a file name cannot have', () => {
    expect(safeFileName('Đà Lạt 3 ngày', 'trip')).toBe('Đà Lạt 3 ngày');
    expect(safeFileName('a/b\\c:d*e?"f<g>h|i\nj', 'trip')).toBe('a b c d e f g h i j');
    expect(safeFileName('x'.repeat(300), 'trip')).toHaveLength(100);
  });

  it('uses the fallback when nothing is left', () => {
    expect(safeFileName(undefined, 'trip')).toBe('trip');
    expect(safeFileName(' // ', 'trip')).toBe('trip');
  });
});

describe('saveBlob', () => {
  afterEach(() => vi.restoreAllMocks());

  it('clicks a temporary download link and cleans up', () => {
    const createUrl = vi.fn(() => 'blob:x');
    const revokeUrl = vi.fn();
    Object.assign(URL, {createObjectURL: createUrl, revokeObjectURL: revokeUrl});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const blob = new Blob(['a']);

    saveBlob(blob, 'Trip.pdf');

    expect(createUrl).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalledTimes(1);
    expect(click.mock.instances[0]).toMatchObject({download: 'Trip.pdf', href: 'blob:x'});
    expect(revokeUrl).toHaveBeenCalledWith('blob:x');
    expect(document.querySelector('a[download]')).toBeNull();
  });
});
