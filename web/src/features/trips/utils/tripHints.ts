import {removeVietnameseTones} from '@/lib/text';
import {provices} from '../data/provinces';

// Well-known destinations -> the province the trip form uses
const placeAliases: Record<string, string> = {
  'Đà Lạt': 'Lâm Đồng',
  'Bảo Lộc': 'Lâm Đồng',
  'Sài Gòn': 'TP Hồ Chí Minh',
  'Hồ Chí Minh': 'TP Hồ Chí Minh',
  'TP.HCM': 'TP Hồ Chí Minh',
  'TPHCM': 'TP Hồ Chí Minh',
  'Hội An': 'Quảng Nam',
  'Mỹ Sơn': 'Quảng Nam',
  'Phú Quốc': 'Kiên Giang',
  'Hà Tiên': 'Kiên Giang',
  'Sa Pa': 'Lào Cai',
  'Sapa': 'Lào Cai',
  'Nha Trang': 'Khánh Hòa',
  'Cam Ranh': 'Khánh Hòa',
  'Vũng Tàu': 'Bà Rịa Vũng Tàu',
  'Côn Đảo': 'Bà Rịa Vũng Tàu',
  'Huế': 'Thừa Thiên Huế',
  'Hạ Long': 'Quảng Ninh',
  'Vịnh Hạ Long': 'Quảng Ninh',
  'Cô Tô': 'Quảng Ninh',
  'Mũi Né': 'Bình Thuận',
  'Phan Thiết': 'Bình Thuận',
  'Quy Nhơn': 'Bình Định',
  'Eo Gió': 'Bình Định',
  'Mộc Châu': 'Sơn La',
  'Tam Đảo': 'Vĩnh Phúc',
  'Buôn Ma Thuột': 'Đắk Lắk',
  'Pleiku': 'Gia Lai',
  'Tràng An': 'Ninh Bình',
  'Tam Cốc': 'Ninh Bình',
  'Cát Bà': 'Hải Phòng',
  'Đồ Sơn': 'Hải Phòng',
  'Mù Cang Chải': 'Yên Bái',
  'Phong Nha': 'Quảng Bình',
  'Đồng Văn': 'Hà Giang',
  'Mã Pí Lèng': 'Hà Giang',
  'Tây Ninh': 'Tây Ninh',
  'Núi Bà Đen': 'Tây Ninh',
  'Bà Nà': 'Đà Nẵng',
  'Ninh Chữ': 'Ninh Thuận',
  'Phan Rang': 'Ninh Thuận',
  'Lý Sơn': 'Quảng Ngãi',
  'Pù Luông': 'Thanh Hóa',
  'Sầm Sơn': 'Thanh Hóa',
  'Cửa Lò': 'Nghệ An',
  'Mai Châu': 'Hòa Bình',
  'Bản Giốc': 'Cao Bằng',
  'Ba Bể': 'Bắc Kạn',
};

// lowercase + no accents + no punctuation, padded with spaces for word matching
const normalize = (text: string) =>
  ` ${removeVietnameseTones(text.toLowerCase()).replace(/\s+/g, ' ')} `;

const candidates = [
  ...provices.map(p => ({name: p, province: p})),
  ...Object.entries(placeAliases).map(([name, province]) => ({name, province})),
]
  .map(c => ({...c, key: normalize(c.name)}))
  // longer names first: "Bà Rịa Vũng Tàu" before "Vũng Tàu", "Hà Giang" before "Giang"...
  .sort((a, b) => b.key.length - a.key.length);

export interface TripHints {
  location?: string;
  days?: number;
  people?: number;
}

// Finds the destination (first mentioned), number of days and of people in
// free text such as an AI chat answer. Texts are checked in order: put the
// most relevant one (the AI answer) first.
export const extractTripHints = (...texts: (string | undefined)[]): TripHints => {
  const hints: TripHints = {};
  for (const text of texts) {
    if (!text) {
      continue;
    }
    const norm = normalize(text);
    if (!hints.location) {
      let best: {index: number; province: string} | null = null;
      for (const c of candidates) {
        const index = norm.indexOf(c.key);
        if (index !== -1 && (best === null || index < best.index)) {
          best = {index, province: c.province};
        }
      }
      if (best) {
        hints.location = best.province;
      }
    }
    if (!hints.days) {
      const m = norm.match(/ (\d{1,2}) ?(ngay|days?) /);
      if (m) {
        hints.days = Math.min(7, Math.max(1, Number(m[1])));
      }
    }
    if (!hints.people) {
      const m = norm.match(/ (\d{1,2}) ?(nguoi|people|persons?) /);
      if (m) {
        hints.people = Math.min(10, Math.max(1, Number(m[1])));
      }
    }
  }
  return hints;
};
