import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const NAVY = '#131B2E';
const NAVY_MID = '#1C2842';
const NAVY_LIGHT = '#243052';
const ORANGE = '#FF6B35';
const BLUE = '#2D9CDB';
const OFF_WHITE = '#F5F7FA';
const GRAY = '#8B95A5';
const SUCCESS = '#34C759';
const ERROR = '#FF3B30';
const PURPLE = '#9B59B6';

type TimePeriod = 'Today' | '7 Days' | '30 Days' | 'All Time';

interface PeriodData {
  topStats: { value: string; label: string; change: string; positive: boolean }[];
  dauChart: { days: string[]; values: number[] };
  activations: { name: string; completions: number; rate: number }[];
  pointsDist: { tier: string; pct: number }[];
  topSchools: { name: string; users: number }[];
  rewards: { redeemed: string; distributed: string; avgPerUser: string; topReward: string; topCount: number };
}

const DATA: Record<TimePeriod, PeriodData> = {
  Today: {
    topStats: [
      { value: '1,247', label: 'DAU', change: '+12.3%', positive: true },
      { value: '1,247', label: 'MAU', change: '+5.7%', positive: true },
      { value: '4.8m', label: 'Avg Session', change: '+0.6m', positive: true },
      { value: '69%', label: 'Retention', change: '+4.1%', positive: true },
    ],
    dauChart: { days: ['6am', '9am', '12pm', '3pm', '6pm', '9pm', 'Now'], values: [120, 340, 580, 720, 890, 1100, 1247] },
    activations: [
      { name: 'Check-in', completions: 623, rate: 91 },
      { name: 'Trivia', completions: 445, rate: 76 },
      { name: 'Photo Challenge', completions: 389, rate: 68 },
      { name: 'Noise Meter', completions: 312, rate: 55 },
      { name: 'Predictions', completions: 278, rate: 49 },
    ],
    pointsDist: [
      { tier: 'Rookie', pct: 44 },
      { tier: 'Starter', pct: 29 },
      { tier: 'All-Star', pct: 15 },
      { tier: 'MVP', pct: 8 },
      { tier: 'Hall of Fame', pct: 4 },
    ],
    topSchools: [
      { name: 'Kent State', users: 342 },
      { name: 'UMass', users: 287 },
      { name: 'Ball State', users: 231 },
      { name: 'Temple', users: 198 },
      { name: 'Akron', users: 156 },
    ],
    rewards: { redeemed: '187', distributed: '340K', avgPerUser: '272', topReward: 'Rally T-Shirt', topCount: 52 },
  },
  '7 Days': {
    topStats: [
      { value: '1,247', label: 'DAU', change: '+12.3%', positive: true },
      { value: '8,432', label: 'MAU', change: '+5.7%', positive: true },
      { value: '4.2m', label: 'Avg Session', change: '-0.3m', positive: false },
      { value: '67%', label: 'Retention', change: '+2.1%', positive: true },
    ],
    dauChart: { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], values: [890, 1120, 980, 1340, 1567, 1890, 1247] },
    activations: [
      { name: 'Check-in', completions: 4521, rate: 89 },
      { name: 'Trivia', completions: 3217, rate: 72 },
      { name: 'Photo Challenge', completions: 2890, rate: 65 },
      { name: 'Noise Meter', completions: 2456, rate: 58 },
      { name: 'Predictions', completions: 2102, rate: 51 },
    ],
    pointsDist: [
      { tier: 'Rookie', pct: 45 },
      { tier: 'Starter', pct: 28 },
      { tier: 'All-Star', pct: 15 },
      { tier: 'MVP', pct: 8 },
      { tier: 'Hall of Fame', pct: 4 },
    ],
    topSchools: [
      { name: 'Kent State', users: 2341 },
      { name: 'UMass', users: 1876 },
      { name: 'Ball State', users: 1543 },
      { name: 'Temple', users: 1298 },
      { name: 'Akron', users: 1102 },
    ],
    rewards: { redeemed: '1,234', distributed: '2.4M', avgPerUser: '1,850', topReward: 'Rally T-Shirt', topCount: 342 },
  },
  '30 Days': {
    topStats: [
      { value: '1,891', label: 'DAU', change: '+18.2%', positive: true },
      { value: '12,654', label: 'MAU', change: '+9.3%', positive: true },
      { value: '5.1m', label: 'Avg Session', change: '+0.8m', positive: true },
      { value: '72%', label: 'Retention', change: '+5.4%', positive: true },
    ],
    dauChart: { days: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7'], values: [1450, 1680, 1520, 1890, 2100, 2340, 1891] },
    activations: [
      { name: 'Check-in', completions: 18234, rate: 92 },
      { name: 'Trivia', completions: 12876, rate: 78 },
      { name: 'Photo Challenge', completions: 10540, rate: 69 },
      { name: 'Noise Meter', completions: 9102, rate: 61 },
      { name: 'Predictions', completions: 7890, rate: 54 },
    ],
    pointsDist: [
      { tier: 'Rookie', pct: 40 },
      { tier: 'Starter', pct: 30 },
      { tier: 'All-Star', pct: 17 },
      { tier: 'MVP', pct: 9 },
      { tier: 'Hall of Fame', pct: 4 },
    ],
    topSchools: [
      { name: 'Kent State', users: 4521 },
      { name: 'UMass', users: 3890 },
      { name: 'Ball State', users: 3210 },
      { name: 'Temple', users: 2876 },
      { name: 'Akron', users: 2543 },
    ],
    rewards: { redeemed: '4,567', distributed: '8.9M', avgPerUser: '2,340', topReward: 'Rally T-Shirt', topCount: 1023 },
  },
  'All Time': {
    topStats: [
      { value: '2,341', label: 'DAU', change: '+24.1%', positive: true },
      { value: '18,920', label: 'MAU', change: '+15.2%', positive: true },
      { value: '4.6m', label: 'Avg Session', change: '+0.4m', positive: true },
      { value: '64%', label: 'Retention', change: '+1.2%', positive: true },
    ],
    dauChart: { days: ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'], values: [980, 1340, 1780, 1560, 2100, 2341, 1980] },
    activations: [
      { name: 'Check-in', completions: 45210, rate: 94 },
      { name: 'Trivia', completions: 32170, rate: 81 },
      { name: 'Photo Challenge', completions: 28900, rate: 73 },
      { name: 'Noise Meter', completions: 24560, rate: 66 },
      { name: 'Predictions', completions: 21020, rate: 58 },
    ],
    pointsDist: [
      { tier: 'Rookie', pct: 38 },
      { tier: 'Starter', pct: 28 },
      { tier: 'All-Star', pct: 19 },
      { tier: 'MVP', pct: 10 },
      { tier: 'Hall of Fame', pct: 5 },
    ],
    topSchools: [
      { name: 'Kent State', users: 8765 },
      { name: 'UMass', users: 7432 },
      { name: 'Ball State', users: 6210 },
      { name: 'Temple', users: 5876 },
      { name: 'Akron', users: 5123 },
    ],
    rewards: { redeemed: '12,345', distributed: '24.1M', avgPerUser: '3,120', topReward: 'Rally T-Shirt', topCount: 3421 },
  },
};

const PERIODS: TimePeriod[] = ['Today', '7 Days', '30 Days', 'All Time'];

const TIER_COLORS = [BLUE, ORANGE, SUCCESS, PURPLE, ERROR];

export default function AnalyticsDashboard() {
  const [period, setPeriod] = useState<TimePeriod>('7 Days');
  const data = DATA[period];
  const maxChartVal = Math.max(...data.dauChart.values);
  const CHART_HEIGHT = 140;

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Time Period Selector */}
        <View style={styles.periodRow}>
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodChip, period === p && styles.periodChipActive]}
              onPress={() => setPeriod(p)}
              activeOpacity={0.7}
            >
              <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Top Stats Bar */}
        <View style={styles.topStatsRow}>
          {data.topStats.map((stat, i) => (
            <View key={i} style={styles.topStatItem}>
              <Text style={styles.topStatValue}>{stat.value}</Text>
              <Text style={styles.topStatLabel}>{stat.label}</Text>
              <View style={styles.changeRow}>
                <Ionicons
                  name={stat.positive ? 'arrow-up' : 'arrow-down'}
                  size={10}
                  color={stat.positive ? SUCCESS : ERROR}
                />
                <Text style={[styles.changeText, { color: stat.positive ? SUCCESS : ERROR }]}>
                  {stat.change}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* DAU Chart */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {period === 'Today' ? 'Users Today - Hourly' : `Daily Active Users - Last ${period}`}
          </Text>
          <View style={styles.chartContainer}>
            {/* Scale line */}
            <View style={styles.scaleLine}>
              <Text style={styles.scaleText}>{maxChartVal.toLocaleString()}</Text>
            </View>
            <View style={styles.chartBars}>
              {data.dauChart.values.map((val, i) => {
                const height = (val / maxChartVal) * CHART_HEIGHT;
                return (
                  <View key={i} style={styles.barColumn}>
                    <Text style={styles.barValue}>
                      {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                    </Text>
                    <View style={[styles.bar, { height, backgroundColor: ORANGE }]} />
                    <Text style={styles.barLabel}>{data.dauChart.days[i]}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Top Activations */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Top Activations</Text>
          {data.activations.map((act, i) => (
            <View key={i} style={styles.activationItem}>
              <View style={styles.activationHeader}>
                <View style={styles.activationRank}>
                  <Text style={styles.rankText}>{i + 1}</Text>
                </View>
                <Text style={styles.activationName}>{act.name}</Text>
                <Text style={styles.activationCount}>
                  {act.completions.toLocaleString()}
                </Text>
                <Text style={styles.activationRate}>{act.rate}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[styles.progressFill, { width: `${act.rate}%`, backgroundColor: ORANGE }]}
                />
              </View>
            </View>
          ))}
        </View>

        {/* Points Distribution */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Points Distribution</Text>
          {data.pointsDist.map((tier, i) => (
            <View key={i} style={styles.distItem}>
              <Text style={styles.distLabel}>{tier.tier}</Text>
              <View style={styles.distBarTrack}>
                <View
                  style={[
                    styles.distBarFill,
                    { width: `${tier.pct}%`, backgroundColor: TIER_COLORS[i] },
                  ]}
                />
              </View>
              <Text style={styles.distPct}>{tier.pct}%</Text>
            </View>
          ))}
        </View>

        {/* Top Schools */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Top Schools by Engagement</Text>
          {data.topSchools.map((school, i) => {
            const maxUsers = data.topSchools[0].users;
            return (
              <View key={i} style={styles.schoolItem}>
                <View style={styles.schoolRank}>
                  <Text style={styles.rankText}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.schoolRow}>
                    <Text style={styles.schoolName}>{school.name}</Text>
                    <Text style={styles.schoolUsers}>
                      {school.users.toLocaleString()} users
                    </Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${(school.users / maxUsers) * 100}%`,
                          backgroundColor: BLUE,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Revenue & Rewards */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Revenue & Rewards</Text>
          <View style={styles.rewardsGrid}>
            <View style={styles.rewardStat}>
              <Ionicons name="gift" size={20} color={ORANGE} />
              <Text style={styles.rewardValue}>{data.rewards.redeemed}</Text>
              <Text style={styles.rewardLabel}>Redeemed</Text>
            </View>
            <View style={styles.rewardStat}>
              <Ionicons name="star" size={20} color={BLUE} />
              <Text style={styles.rewardValue}>{data.rewards.distributed}</Text>
              <Text style={styles.rewardLabel}>Pts Distributed</Text>
            </View>
            <View style={styles.rewardStat}>
              <Ionicons name="person" size={20} color={SUCCESS} />
              <Text style={styles.rewardValue}>{data.rewards.avgPerUser}</Text>
              <Text style={styles.rewardLabel}>Avg Pts/User</Text>
            </View>
            <View style={styles.rewardStat}>
              <Ionicons name="trophy" size={20} color={PURPLE} />
              <Text style={styles.rewardValue}>{data.rewards.topCount.toLocaleString()}</Text>
              <Text style={styles.rewardLabel}>{data.rewards.topReward}</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NAVY,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 32,
  },

  /* Period Selector */
  periodRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  periodChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: NAVY_MID,
    alignItems: 'center',
  },
  periodChipActive: {
    backgroundColor: ORANGE,
  },
  periodText: {
    fontSize: 12,
    fontWeight: '600',
    color: GRAY,
  },
  periodTextActive: {
    color: '#FFFFFF',
  },

  /* Top Stats */
  topStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  topStatItem: {
    flex: 1,
    backgroundColor: NAVY_MID,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  topStatValue: {
    fontSize: 16,
    fontWeight: '800',
    color: OFF_WHITE,
  },
  topStatLabel: {
    fontSize: 10,
    color: GRAY,
    marginTop: 2,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 2,
  },
  changeText: {
    fontSize: 10,
    fontWeight: '600',
  },

  /* Card */
  card: {
    backgroundColor: NAVY_MID,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: OFF_WHITE,
    marginBottom: 12,
  },

  /* Chart */
  chartContainer: {
    marginTop: 4,
  },
  scaleLine: {
    borderBottomWidth: 1,
    borderBottomColor: NAVY_LIGHT,
    paddingBottom: 4,
    marginBottom: 8,
  },
  scaleText: {
    fontSize: 10,
    color: GRAY,
    textAlign: 'right',
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 170,
    paddingTop: 20,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
  },
  bar: {
    width: '65%',
    borderRadius: 4,
    minHeight: 4,
  },
  barValue: {
    fontSize: 9,
    color: GRAY,
    marginBottom: 4,
    fontWeight: '600',
  },
  barLabel: {
    fontSize: 10,
    color: GRAY,
    marginTop: 6,
    fontWeight: '500',
  },

  /* Activation Items */
  activationItem: {
    marginBottom: 10,
  },
  activationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  activationRank: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: NAVY_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  rankText: {
    fontSize: 11,
    fontWeight: '700',
    color: OFF_WHITE,
  },
  activationName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: OFF_WHITE,
  },
  activationCount: {
    fontSize: 12,
    color: GRAY,
    marginRight: 8,
  },
  activationRate: {
    fontSize: 12,
    fontWeight: '700',
    color: ORANGE,
    width: 36,
    textAlign: 'right',
  },
  progressTrack: {
    height: 6,
    backgroundColor: NAVY_LIGHT,
    borderRadius: 3,
    overflow: 'hidden',
    marginLeft: 30,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  /* Points Distribution */
  distItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  distLabel: {
    width: 80,
    fontSize: 12,
    color: OFF_WHITE,
    fontWeight: '500',
  },
  distBarTrack: {
    flex: 1,
    height: 18,
    backgroundColor: NAVY_LIGHT,
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  distBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  distPct: {
    width: 36,
    fontSize: 12,
    fontWeight: '700',
    color: OFF_WHITE,
    textAlign: 'right',
  },

  /* Top Schools */
  schoolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  schoolRank: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: NAVY_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  schoolRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  schoolName: {
    fontSize: 13,
    fontWeight: '600',
    color: OFF_WHITE,
  },
  schoolUsers: {
    fontSize: 12,
    color: GRAY,
  },

  /* Rewards Grid */
  rewardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rewardStat: {
    width: '48%' as any,
    flexGrow: 1,
    flexBasis: '46%',
    backgroundColor: NAVY_LIGHT,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  rewardValue: {
    fontSize: 18,
    fontWeight: '800',
    color: OFF_WHITE,
  },
  rewardLabel: {
    fontSize: 11,
    color: GRAY,
    textAlign: 'center',
  },
});
