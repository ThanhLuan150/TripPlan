import type {AdminAnnouncement, CampaignStatus} from '../types';

// What the app does with an announcement: a draft is hidden, a published one
// is shown from its date on (before that it is scheduled).
export const announcementState = (item: AdminAnnouncement, now = Date.now()): CampaignStatus =>
  item.status === 'draft' ? 'draft' : new Date(item.publishAt).getTime() > now ? 'scheduled' : 'sent';

const pad = (n: number) => String(n).padStart(2, '0');

// ISO time -> value of <input type="datetime-local"> (local time)
export const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
