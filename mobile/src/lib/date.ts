export const formatDate = (d: string, lng: string) =>
  new Date(d).toLocaleDateString(lng === 'en' ? 'en-GB' : 'vi-VN');
