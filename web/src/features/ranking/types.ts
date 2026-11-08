export type RankingPeriod = 'weekly' | 'monthly' | 'highest';

export interface RankItem {
  _id?: string;
  fullname?: string;
  image?: string;
  experience: number;
}
