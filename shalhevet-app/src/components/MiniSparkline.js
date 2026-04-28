import React from 'react';
import { StyleSheet, View } from 'react-native';
import { COLORS } from '../theme/colors';

/**
 * Minimal sparkline — no SVG dep. Renders bars where height encodes value
 * relative to the local min/max. Color encodes direction (down/up).
 *
 * Props:
 *   values: number[]  (oldest → newest)
 *   width?: number    default 80
 *   height?: number   default 28
 *   goodDirection?: 'down' | 'up'   default 'down' (weight loss = good)
 */
export default function MiniSparkline({ values = [], width = 80, height = 28, goodDirection = 'down' }) {
  if (!Array.isArray(values) || values.length < 2) {
    return <View style={[styles.empty, { width, height }]} />;
  }
  const nums = values.filter(v => typeof v === 'number' && !Number.isNaN(v));
  if (nums.length < 2) return <View style={[styles.empty, { width, height }]} />;

  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const range = max - min || 1;
  const trend = nums[nums.length - 1] - nums[0];
  const isGood = goodDirection === 'down' ? trend < 0 : trend > 0;
  const isFlat = Math.abs(trend) < range * 0.05;
  const color = isFlat ? COLORS.textMuted : isGood ? '#4CAF50' : '#FFA726';

  const barWidth = Math.max(1, Math.floor(width / nums.length) - 1);
  return (
    <View style={[styles.row, { width, height, gap: 1 }]}>
      {nums.map((v, i) => {
        const ratio = (v - min) / range;
        const h = Math.max(2, Math.round(ratio * (height - 4)) + 2);
        return (
          <View
            key={i}
            style={{
              width: barWidth,
              height: h,
              backgroundColor: color,
              borderRadius: 1,
              opacity: i === nums.length - 1 ? 1 : 0.7,
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  empty: {
    backgroundColor: 'transparent',
  },
});
