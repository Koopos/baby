import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';

// WHO 体重参考曲线 (男宝，kg) — 中位数 ± 标准差区间
const WEIGHT_REF = {
  0:  [2.5,  3.3,  4.4],
  1:  [3.4,  4.5,  6.0],
  2:  [4.3,  5.6,  7.4],
  3:  [5.0,  6.4,  8.4],
  4:  [5.6,  7.0,  9.1],
  5:  [6.0,  7.5,  9.8],
  6:  [6.4,  7.9, 10.4],
  7:  [6.7,  8.3, 10.9],
  8:  [6.9,  8.6, 11.4],
  9:  [7.1,  8.9, 11.8],
  10: [7.4,  9.2, 12.2],
  11: [7.6,  9.4, 12.6],
  12: [7.7,  9.6, 12.9],
  15: [8.3, 10.3, 13.9],
  18: [8.8, 11.0, 14.9],
  21: [9.2, 11.6, 15.9],
  24: [9.7, 12.2, 17.0],
};

// WHO 身高参考曲线 (男宝，cm) — P3 / 中位数 / P97
const HEIGHT_REF = {
  0:  [46.1, 49.9, 54.0],
  1:  [50.8, 54.7, 58.9],
  2:  [54.4, 58.4, 62.6],
  3:  [57.3, 61.4, 65.7],
  4:  [59.7, 63.9, 68.3],
  5:  [61.7, 65.9, 70.3],
  6:  [63.3, 67.6, 72.0],
  7:  [64.8, 69.2, 73.5],
  8:  [66.2, 70.6, 75.0],
  9:  [67.5, 72.0, 76.5],
  10: [68.7, 73.3, 77.9],
  11: [69.9, 74.5, 79.2],
  12: [71.0, 75.7, 80.5],
  15: [74.1, 79.1, 84.2],
  18: [76.9, 82.3, 87.7],
  21: [79.4, 85.1, 90.9],
  24: [81.7, 87.8, 94.0],
};

// WEIGHT_REF entries: [P3, 中位数, P97]
// HEIGHT_REF entries: [P3, 中位数, P97]

const HEIGHT = 180;
const PL = 42;
const PR = 14;
const PT = 14;
const PB = 36;
const CH = HEIGHT - PT - PB;
const MIN_CHART_WIDTH = 280;

// 刻度月龄
const MONTHS = [0, 3, 6, 9, 12, 15, 18, 21, 24];

function lerp(a, b, t) {
  return a + t * (b - a);
}

function interpolateRef(ref, month) {
  const ms = Object.keys(ref).map(Number).sort((a, b) => a - b);
  if (month <= ms[0]) return ref[ms[0]];
  if (month >= ms[ms.length - 1]) return ref[ms[ms.length - 1]];
  for (let i = 0; i < ms.length - 1; i++) {
    if (month >= ms[i] && month <= ms[i + 1]) {
      const t = (month - ms[i]) / (ms[i + 1] - ms[i]);
      return ref[ms[i]].map((v, idx) => lerp(v, ref[ms[i + 1]][idx], t));
    }
  }
  return ref[ms[0]];
}

// 构建 P3-P97 填充带路径
function buildBand(ref, monthRange, xScale, yScale) {
  const pts = [];
  for (let m = monthRange[0]; m <= monthRange[monthRange.length - 1]; m += 0.5) {
    const v = interpolateRef(ref, m);
    pts.push({ x: m, y: yScale(v[0]) });
  }
  for (let m = monthRange[monthRange.length - 1]; m >= monthRange[0]; m -= 0.5) {
    const v = interpolateRef(ref, m);
    pts.push({ x: m, y: yScale(v[2]) });
  }
  if (pts.length < 3) return '';
  return pts.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${xScale(p.x)} ${p.y}`
  ).join(' ') + ' Z';
}

// 构建单条参考线
function buildRefLine(ref, monthRange, percentileIdx, xScale, yScale) {
  const pts = monthRange.map((m) => {
    const v = interpolateRef(ref, m)[percentileIdx];
    return { x: m, y: yScale(v) };
  });
  return pts.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${xScale(p.x)} ${p.y}`
  ).join(' ');
}

// 构建用户数据折线
function buildDataLine(records, xScale, yScale) {
  if (records.length === 0) return '';
  const pts = records.map((r) => ({ x: r.age, y: yScale(r.value) }));
  return pts.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${xScale(p.x)} ${p.y}`
  ).join(' ');
}

function formatValue(record, unit) {
  if (!record) return '--';
  return `${record.value.toFixed(unit === 'kg' ? 1 : 0)}${unit}`;
}

function buildTrend(records, unit) {
  if (records.length < 2) return '记录 2 次后显示趋势';
  const latest = records[records.length - 1];
  const previous = records[records.length - 2];
  const diff = latest.value - previous.value;
  if (Math.abs(diff) < 0.05) return '与上次基本持平';
  const sign = diff > 0 ? '+' : '';
  const value = unit === 'kg' ? diff.toFixed(1) : diff.toFixed(0);
  return `较上次 ${sign}${value}${unit}`;
}

function makeSummary(records, unit) {
  const latest = records[records.length - 1];
  return {
    value: formatValue(latest, unit),
    age: latest ? `${latest.age}月龄` : '未记录',
    trend: buildTrend(records, unit),
  };
}

function withAlpha(hex, alpha) {
  return `${hex}${alpha}`;
}

const MetricChart = ({
  title,
  unit,
  records,
  refData,
  dataColor,
  refColor,
  fillColor,
  yMin,
  yMax,
  yTicks,
  monthRange,
  chartWidth,
}) => {
  const width = Math.max(chartWidth, MIN_CHART_WIDTH);
  const chartContentWidth = width - PL - PR;
  const xMax = monthRange[monthRange.length - 1] || 24;
  const xScale = (month) => PL + (month / xMax) * chartContentWidth;
  const yScale = (v) => PT + CH - ((v - yMin) / (yMax - yMin)) * CH;

  const band   = buildBand(refData, monthRange, xScale, yScale);
  const median = buildRefLine(refData, monthRange, 1, xScale, yScale); // 中位数
  const low    = buildRefLine(refData, monthRange, 0, xScale, yScale);  // P3
  const high   = buildRefLine(refData, monthRange, 2, xScale, yScale);  // P97
  const data   = buildDataLine(records, xScale, yScale);
  const summary = makeSummary(records, unit);

  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.header}>
        <View>
          <Text style={cardStyles.title}>{title}</Text>
          <Text style={cardStyles.subTitle}>{summary.trend}</Text>
        </View>
        <View style={[cardStyles.latestPill, { backgroundColor: withAlpha(dataColor, '14') }]}>
          <Text style={[cardStyles.latestValue, { color: dataColor }]}>{summary.value}</Text>
          <Text style={cardStyles.latestAge}>{summary.age}</Text>
        </View>
      </View>

      <Svg width={width} height={HEIGHT}>
        {/* P3-P97 填充带（浅色） */}
        {band && <Path d={band} fill={fillColor} opacity={0.16} />}

        {/* 垂直网格 */}
        {monthRange.map((m) => (
          <Line
            key={`v-${m}`}
            x1={xScale(m)} y1={PT}
            x2={xScale(m)} y2={PT + CH}
            stroke="#EFEFEF" strokeWidth={0.8}
          />
        ))}

        {/* P3 边界（灰色虚线） */}
        <Path d={low}   stroke={refColor} strokeWidth={0.8} strokeDasharray="4,4" fill="none" opacity={0.5} />
        {/* P97 边界（灰色虚线） */}
        <Path d={high}  stroke={refColor} strokeWidth={0.8} strokeDasharray="4,4" fill="none" opacity={0.5} />
        {/* 中位数（灰色实线，稍粗） */}
        <Path d={median} stroke={refColor} strokeWidth={1.4} fill="none" opacity={0.6} />

        {/* 用户实测折线（彩色实线） */}
        {data && <Path d={data} stroke={dataColor} strokeWidth={2.5} fill="none" strokeLinejoin="round" />}

        {/* 数据点 */}
        {records.map((r, i) => (
          <Circle
            key={i}
            cx={xScale(r.age)}
            cy={yScale(r.value)}
            r={records.length > 1 ? 3.5 : 5}
            fill={dataColor}
          />
        ))}

        {/* Y 轴标签 */}
        {yTicks.map((v) => (
          <SvgText
            key={`y-${v}`}
            x={PL - 5}
            y={yScale(v) + 4}
            fontSize={10} fill="#BBB" textAnchor="end"
          >
            {v}
          </SvgText>
        ))}

        {/* X 轴标签 */}
        {monthRange.map((m) => (
          <SvgText
            key={`x-${m}`}
            x={xScale(m)}
            y={HEIGHT - 6}
            fontSize={10} fill="#BBB" textAnchor="middle"
          >
            {m}月
          </SvgText>
        ))}
      </Svg>

      {/* 图例 */}
      <View style={cardStyles.legend}>
        <View style={cardStyles.legendItem}>
          <View style={[cardStyles.legendDot, { backgroundColor: dataColor }]} />
          <Text style={cardStyles.legendText}>实测值</Text>
        </View>
        <View style={cardStyles.legendItem}>
          <View style={[cardStyles.legendLine, { backgroundColor: refColor }]} />
          <Text style={cardStyles.legendText}>标准区间</Text>
        </View>
        <View style={cardStyles.legendItem}>
          <View style={[cardStyles.legendLineBold, { backgroundColor: refColor }]} />
          <Text style={cardStyles.legendText}>标准中位</Text>
        </View>
      </View>
    </View>
  );
};

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 0,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginBottom: 4,
  },
  title: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  subTitle: { fontSize: 11, color: '#999', marginTop: 3, fontWeight: '600' },
  latestPill: {
    minWidth: 84,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'flex-end',
  },
  latestValue: { fontSize: 16, fontWeight: '900' },
  latestAge: { fontSize: 10, color: '#999', marginTop: 1, fontWeight: '700' },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    paddingTop: 2,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLine: { width: 20, height: 2, borderRadius: 1 },
  legendLineBold: { width: 20, height: 2.5, borderRadius: 1, opacity: 0.7 },
  legendText: { fontSize: 11, color: '#AAA' },
});

const GrowthChart = ({
  weightRecords = [],
  heightRecords = [],
  birthWeight = null,
  birthHeight = null,
  maxAge = 24,
}) => {
  const [chartWidth, setChartWidth] = useState(MIN_CHART_WIDTH);

  const allWeight = useMemo(() => {
    const records = birthWeight
      ? [{ age: 0, value: parseFloat(birthWeight) }, ...weightRecords]
      : weightRecords;
    return records
      .filter((r) => Number.isFinite(r.age) && Number.isFinite(r.value))
      .sort((a, b) => a.age - b.age);
  }, [birthWeight, weightRecords]);

  const allHeight = useMemo(() => {
    const records = birthHeight
      ? [{ age: 0, value: parseFloat(birthHeight) }, ...heightRecords]
      : heightRecords;
    return records
      .filter((r) => Number.isFinite(r.age) && Number.isFinite(r.value))
      .sort((a, b) => a.age - b.age);
  }, [birthHeight, heightRecords]);

  const monthRange = useMemo(() => {
    const rangeMax = Math.max(24, maxAge || 24);
    const range = MONTHS.filter((m) => m <= rangeMax);
    if (range[range.length - 1] < rangeMax) {
      range.push(rangeMax);
    }
    return range;
  }, [maxAge]);

  const hasAnyRecord = allWeight.length > 0 || allHeight.length > 0;

  return (
    <View
      style={styles.container}
      onLayout={(event) => {
        const nextWidth = Math.floor(event.nativeEvent.layout.width);
        if (nextWidth > 0 && Math.abs(nextWidth - chartWidth) > 1) {
          setChartWidth(nextWidth);
        }
      }}
    >
      <View style={styles.insightBar}>
        <View style={styles.insightItem}>
          <Text style={styles.insightLabel}>体重记录</Text>
          <Text style={styles.insightValue}>{allWeight.length}次</Text>
        </View>
        <View style={styles.insightDivider} />
        <View style={styles.insightItem}>
          <Text style={styles.insightLabel}>身高记录</Text>
          <Text style={styles.insightValue}>{allHeight.length}次</Text>
        </View>
        <View style={styles.insightDivider} />
        <View style={styles.insightItem}>
          <Text style={styles.insightLabel}>观察范围</Text>
          <Text style={styles.insightValue}>0-{monthRange[monthRange.length - 1]}月</Text>
        </View>
      </View>
      {!hasAnyRecord ? (
        <View style={styles.emptyHint}>
          <Text style={styles.emptyTitle}>还没有可绘制的数据</Text>
          <Text style={styles.emptyText}>添加出生身高体重或体检记录后，这里会自动生成趋势线。</Text>
        </View>
      ) : null}
      <MetricChart
        title="体重"
        unit="kg"
        records={allWeight}
        refData={WEIGHT_REF}
        dataColor="#4A9EFF"
        refColor="#CCCCCC"
        fillColor="#4A9EFF"
        yMin={0}
        yMax={20}
        yTicks={[0, 5, 10, 15, 20]}
        monthRange={monthRange}
        chartWidth={chartWidth}
      />
      <MetricChart
        title="身高"
        unit="cm"
        records={allHeight}
        refData={HEIGHT_REF}
        dataColor="#FF6E68"
        refColor="#CCCCCC"
        fillColor="#FF6E68"
        yMin={40}
        yMax={100}
        yTicks={[40, 55, 70, 85, 100]}
        monthRange={monthRange}
        chartWidth={chartWidth}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%' },
  insightBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  insightItem: { flex: 1 },
  insightLabel: { fontSize: 11, color: '#999', fontWeight: '700', marginBottom: 4 },
  insightValue: { fontSize: 15, color: '#1A1A1A', fontWeight: '900' },
  insightDivider: { width: 1, height: 28, backgroundColor: '#F1F1F1', marginHorizontal: 8 },
  emptyHint: {
    backgroundColor: '#FFF8E7',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 14, color: '#D46B08', fontWeight: '800', marginBottom: 3 },
  emptyText: { fontSize: 12, color: '#A66A16', lineHeight: 18 },
});

export default GrowthChart;
