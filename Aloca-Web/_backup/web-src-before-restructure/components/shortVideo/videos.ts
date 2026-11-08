import shortvideo from '../../assets/videos/shortvideo.mp4';
import shortvideotravel1 from '../../assets/videos/shortvideotravel1.mp4';
import shortvideotravel2 from '../../assets/videos/shortvideotravel2.mp4';
import shortvideotravel3 from '../../assets/videos/shortvideotravel3.mp4';

export interface VideoItem {
  id: number;
  src: string;
  youtubeLink: string;
}

// "Video nổi bật" on the home screen
export const homeVideos: VideoItem[] = [
  {
    id: 1,
    src: shortvideo,
    youtubeLink: 'https://youtube.com/shorts/UklwTkNkr8c?si=LLpw6xPVOiIffMhR',
  },
  {
    id: 2,
    src: shortvideotravel1,
    youtubeLink: 'https://youtube.com/shorts/UklwTkNkr8c?si=1tS0sOXrWGhiey30',
  },
  {
    id: 3,
    src: shortvideotravel2,
    youtubeLink: 'https://youtube.com/shorts/Zfaavxyy4Gs?si=KJyCywt4SuZQvZMF',
  },
  {
    id: 4,
    src: shortvideotravel3,
    youtubeLink: 'https://youtube.com/shorts/BlWVo5CB6RU?si=XHaP3gdkX1IAcEC4',
  },
];

// VideoTravel screen ("Xem thêm")
export const allVideos: VideoItem[] = [
  {
    id: 1,
    src: shortvideotravel3,
    youtubeLink: 'https://youtube.com/shorts/UklwTkNkr8c?si=LLpw6xPVOiIffMhR',
  },
  {
    id: 2,
    src: shortvideo,
    youtubeLink: 'https://youtube.com/shorts/UklwTkNkr8c?si=LLpw6xPVOiIffMhR',
  },
  {
    id: 3,
    src: shortvideotravel1,
    youtubeLink: 'https://youtube.com/shorts/UklwTkNkr8c?si=LLpw6xPVOiIffMhR',
  },
  {
    id: 4,
    src: shortvideotravel2,
    youtubeLink: 'https://youtube.com/shorts/UklwTkNkr8c?si=LLpw6xPVOiIffMhR',
  },
  {
    id: 5,
    src: shortvideotravel1,
    youtubeLink: 'https://youtube.com/shorts/UklwTkNkr8c?si=LLpw6xPVOiIffMhR',
  },
  {
    id: 6,
    src: shortvideotravel1,
    youtubeLink: 'https://youtube.com/shorts/UklwTkNkr8c?si=LLpw6xPVOiIffMhR',
  },
];
