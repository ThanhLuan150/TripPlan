// File name made from a user text: no characters a file system rejects.
export const safeFileName = (name: string | undefined, fallback: string): string => {
  const clean = [...(name ?? '')]
    .map(ch => (ch.charCodeAt(0) < 32 ? ' ' : ch))
    .join('')
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
  return clean || fallback;
};

// Saves a Blob through the browser's download (no new tab, nothing uploaded).
export const saveBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
