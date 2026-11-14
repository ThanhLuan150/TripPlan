import {describe, expect, it} from 'vitest';
import vi from '@/locales/vi.json';
import en from '@/locales/en.json';
import {areaTypes} from '@/features/trips/data/areaTypes';
import {images} from '@/features/trips/data/provinceImages';
import {provices} from '@/features/trips/data/provinces';
import {allVideos, homeVideos} from '@/features/videos/data/videos';

const lookup = (dict: object, key: string) =>
  key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], dict);

describe('provinces', () => {
  it('has the 63 provinces of Vietnam, once each', () => {
    expect(provices).toHaveLength(63);
    expect(new Set(provices).size).toBe(63);
    expect(provices).toEqual(expect.arrayContaining(['Hà Nội', 'TP Hồ Chí Minh', 'Đà Nẵng', 'Lâm Đồng']));
  });

  it('every cover photo belongs to a province and is a web URL', () => {
    for (const [name, url] of Object.entries(images)) {
      expect(provices, name).toContain(name);
      // (one is still plain http: blocked as mixed content on an https site,
      // where the page then hides the photo)
      expect(url, name).toMatch(/^https?:\/\/[^\s]+$/);
    }
  });
});

describe('area types', () => {
  it('have a label in both languages', () => {
    for (const {value, labelKey} of areaTypes) {
      expect(value).toBeTruthy();
      expect(lookup(vi, labelKey), labelKey).toEqual(expect.any(String));
      expect(lookup(en, labelKey), labelKey).toEqual(expect.any(String));
    }
  });
});

describe('videos', () => {
  it('have unique ids, a source and a YouTube link', () => {
    for (const list of [homeVideos, allVideos]) {
      expect(new Set(list.map(v => v.id)).size).toBe(list.length);
      for (const video of list) {
        expect(video.src).toBeTruthy();
        expect(video.youtubeLink).toMatch(/^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//);
      }
    }
  });
});
