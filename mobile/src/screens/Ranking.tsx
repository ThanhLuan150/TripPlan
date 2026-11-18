import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import RankingHeader from '../components/RankingHeader';
import RankingRow from '../components/RankingRow';
import RankingTabs from '../components/RankingTabs';
import {RankingPeriod, useRanking} from '../hooks/queries';
import {colors, shadow} from '../lib/theme';

export default function Ranking() {
  const {t} = useTranslation();
  const [period, setPeriod] = useState<RankingPeriod>('highest');
  const ranks = useRanking(period);
  const list = ranks.data ?? [];

  return (
    <View style={styles.container}>
      <RankingHeader ranks={list} />
      <RankingTabs<RankingPeriod>
        value={period}
        onChange={setPeriod}
        options={[
          {value: 'weekly', label: t('ranking.weekly')},
          {value: 'monthly', label: t('ranking.monthly')},
          {value: 'highest', label: t('ranking.highest')},
        ]}
      />
      <View style={[styles.list, shadow]}>
        <FlatList
          data={list}
          showsVerticalScrollIndicator={false}
          keyExtractor={(item, i) => item._id ?? String(i)}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.empty}>{t('ranking.empty')}</Text>}
          renderItem={({item, index}) => <RankingRow item={item} index={index} />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#fff', paddingTop: 36},
  list: {flexShrink: 1, marginHorizontal: 16, marginTop: 14, marginBottom: 96, borderRadius: 20, backgroundColor: colors.dark, overflow: 'hidden'},
  listContent: {paddingVertical: 8},
  empty: {color: 'rgba(255,255,255,0.7)', textAlign: 'center', padding: 24},
});
