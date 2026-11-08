import {api} from '@/lib/apiClient';
import type {RankingPeriod, RankItem} from '../types';

const paths: Record<RankingPeriod, string> = {
  weekly: '/rankings/weekly',
  monthly: '/rankings/monthly',
  highest: '/rankings/rankingUserHighest',
};

export const rankingApi = {
  get: async (period: RankingPeriod) =>
    (await api.get<{dataRanks?: RankItem[]}>(paths[period])).data.dataRanks ?? [],
};
