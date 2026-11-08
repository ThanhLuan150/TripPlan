import {useQuery} from '@tanstack/react-query';
import {rankingApi} from '../api/rankingApi';
import type {RankingPeriod} from '../types';

export const useRanking = (period: RankingPeriod) =>
  useQuery({
    queryKey: ['rankings', period],
    queryFn: () => rankingApi.get(period),
  });

// i18n key of the title for an amount of experience
export const rankTitleKey = (experience: number) => {
  if (experience >= 0 && experience < 200) {
    return 'ranking.titleRookie';
  }
  if (experience >= 200 && experience < 500) {
    return 'ranking.titleAdventurer';
  }
  if (experience >= 500 && experience < 1000) {
    return 'ranking.titleKnight';
  }
  if (experience >= 1000 && experience < 2000) {
    return 'ranking.titleLegend';
  }
  return null;
};
