import {Platform} from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import {exportTripPdf, safeFileName} from '../src/lib/exportPdf';
import * as session from '../src/store/session';

const blob = ReactNativeBlobUtil as any;
const fetchMock = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  blob.config.mockReturnValue({fetch: fetchMock});
  jest.spyOn(session, 'getAccessToken').mockReturnValue('tok');
});

describe('safeFileName', () => {
  it('drops characters a file system rejects and falls back when nothing is left', () => {
    expect(safeFileName('Da Nang: PDF/test', 'trip')).toBe('Da Nang PDF test');
    expect(safeFileName('  ', 'trip')).toBe('trip');
    expect(safeFileName(undefined, 'trip')).toBe('trip');
  });
});

describe('exportTripPdf', () => {
  it('downloads with the token and the language, then opens it on Android', async () => {
    Platform.OS = 'android';
    fetchMock.mockResolvedValue({info: () => ({status: 200})});

    await exportTripPdf('t1', 'en', 'Hue 3 days');

    expect(blob.config).toHaveBeenCalledWith({path: '/cache/Hue 3 days.pdf'});
    expect(fetchMock).toHaveBeenCalledWith(
      'GET',
      expect.stringMatching(/\/trip-plan\/t1\/export-pdf\?lang=en$/),
      {Authorization: 'Bearer tok'},
    );
    expect(blob.android.actionViewIntent).toHaveBeenCalledWith(
      '/cache/Hue 3 days.pdf',
      'application/pdf',
    );
  });

  it('opens the document on iOS, and any other language asks for Vietnamese', async () => {
    Platform.OS = 'ios';
    fetchMock.mockResolvedValue({info: () => ({status: 200})});

    await exportTripPdf('t1', 'vi-VN', undefined);

    expect(fetchMock.mock.calls[0][1]).toMatch(/lang=vi$/);
    expect(blob.ios.openDocument).toHaveBeenCalledWith('/cache/trip.pdf');
  });

  it('removes the file and fails when the backend refuses (not the owner, deleted trip...)', async () => {
    fetchMock.mockResolvedValue({info: () => ({status: 404})});

    await expect(exportTripPdf('t1', 'en', 'x')).rejects.toThrow('404');
    expect(blob.fs.unlink).toHaveBeenCalledWith('/cache/x.pdf');
    expect(blob.android.actionViewIntent).not.toHaveBeenCalled();
    expect(blob.ios.openDocument).not.toHaveBeenCalled();
  });
});
