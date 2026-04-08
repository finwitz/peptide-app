import React, { useMemo } from 'react';
import { View, Text, useWindowDimensions, StyleSheet } from 'react-native';
import Svg, { Path, Line, Circle, G, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { calculateDecay } from '../../lib/calculations';
import { useThemeColors, FontSize, Spacing, BorderRadius } from '../../constants/theme';
import type { DoseLog } from '../../lib/database';

interface DecayCurveChartProps {
  doseMcg: number;
  halfLifeHours: number;
  doseLogs?: DoseLog[];
  height?: number;
}

const PADDING = { top: 10, right: 15, bottom: 30, left: 50 };

export default function DecayCurveChart({
  doseMcg,
  halfLifeHours,
  doseLogs = [],
  height = 200,
}: DecayCurveChartProps) {
  const colors = useThemeColors();
  const { width: screenWidth } = useWindowDimensions();
  const width = screenWidth - Spacing.lg * 2;

  const chartWidth = width - PADDING.left - PADDING.right;
  const chartHeight = height - PADDING.top - PADDING.bottom;

  const { pathD, fillD, maxLevel, totalHours, nowX, doseMarkers, xTicks, yTicks } = useMemo(() => {
    // Determine time range
    const now = Date.now();
    const sortedLogs = doseLogs.length > 0
      ? [...doseLogs].sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime())
      : [];

    // Show at least 5 half-lives or the span of doses + 2 half-lives
    let spanHours = halfLifeHours * 5;
    let startTime = now - spanHours * 60 * 60 * 1000;

    if (sortedLogs.length > 0) {
      const firstLog = new Date(sortedLogs[0].logged_at).getTime();
      const extraAfter = halfLifeHours * 3;
      startTime = Math.min(startTime, firstLog);
      const endTime = now + extraAfter * 60 * 60 * 1000;
      spanHours = (endTime - startTime) / (60 * 60 * 1000);
    }

    const totalH = spanHours;
    const numPoints = 200;
    const step = totalH / numPoints;

    // Calculate composite curve (stacking multiple doses)
    const points: { hour: number; level: number }[] = [];
    let maxLvl = 0;

    for (let i = 0; i <= numPoints; i++) {
      const h = i * step;
      const absoluteTime = startTime + h * 60 * 60 * 1000;
      let level = 0;

      if (sortedLogs.length > 0) {
        for (const log of sortedLogs) {
          const logTime = new Date(log.logged_at).getTime();
          const hoursSinceDose = (absoluteTime - logTime) / (60 * 60 * 1000);
          if (hoursSinceDose >= 0) {
            level += calculateDecay(log.dose_mcg, halfLifeHours, hoursSinceDose);
          }
        }
      } else {
        // No logs — show theoretical single dose
        if (h >= 0) {
          level = calculateDecay(doseMcg, halfLifeHours, h);
        }
      }

      points.push({ hour: h, level });
      maxLvl = Math.max(maxLvl, level);
    }

    if (maxLvl === 0) maxLvl = doseMcg;

    // Scale points to SVG coordinates
    const scaleX = (h: number) => PADDING.left + (h / totalH) * chartWidth;
    const scaleY = (l: number) => PADDING.top + chartHeight - (l / maxLvl) * chartHeight;

    // Build path
    let d = `M ${scaleX(points[0].hour)} ${scaleY(points[0].level)}`;
    let fill = d;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${scaleX(points[i].hour)} ${scaleY(points[i].level)}`;
      fill += ` L ${scaleX(points[i].hour)} ${scaleY(points[i].level)}`;
    }
    // Close fill path along x-axis
    fill += ` L ${scaleX(points[points.length - 1].hour)} ${PADDING.top + chartHeight}`;
    fill += ` L ${scaleX(points[0].hour)} ${PADDING.top + chartHeight} Z`;

    // "Now" line
    const nowHours = (now - startTime) / (60 * 60 * 1000);
    const nX = nowHours >= 0 && nowHours <= totalH ? scaleX(nowHours) : null;

    // Dose markers
    const markers = sortedLogs.map(log => {
      const logH = (new Date(log.logged_at).getTime() - startTime) / (60 * 60 * 1000);
      let lvl = 0;
      for (const l of sortedLogs) {
        const lt = new Date(l.logged_at).getTime();
        const hs = (new Date(log.logged_at).getTime() - lt) / (60 * 60 * 1000);
        if (hs >= 0) lvl += calculateDecay(l.dose_mcg, halfLifeHours, hs);
      }
      return { x: scaleX(logH), y: scaleY(lvl) };
    }).filter(m => m.x >= PADDING.left && m.x <= PADDING.left + chartWidth);

    // X-axis ticks
    const xTickCount = 5;
    const xTickStep = totalH / xTickCount;
    const xt = Array.from({ length: xTickCount + 1 }, (_, i) => {
      const h = i * xTickStep;
      let label: string;
      if (totalH >= 48) {
        label = `${Math.round(h / 24)}d`;
      } else {
        label = `${Math.round(h)}h`;
      }
      return { x: scaleX(h), label };
    });

    // Y-axis ticks
    const yTickCount = 4;
    const yTickStep = maxLvl / yTickCount;
    const yt = Array.from({ length: yTickCount + 1 }, (_, i) => {
      const v = i * yTickStep;
      const label = v >= 1000 ? `${(v / 1000).toFixed(1)}mg` : `${Math.round(v)}`;
      return { y: scaleY(v), label };
    });

    return { pathD: d, fillD: fill, maxLevel: maxLvl, totalHours: totalH, nowX: nX, doseMarkers: markers, xTicks: xt, yTicks: yt };
  }, [doseMcg, halfLifeHours, doseLogs, chartWidth, chartHeight]);

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Active Compound Levels</Text>
        <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
          Half-life: {halfLifeHours >= 24 ? `${(halfLifeHours / 24).toFixed(1)}d` : halfLifeHours >= 1 ? `${halfLifeHours}h` : `${(halfLifeHours * 60).toFixed(0)}m`}
        </Text>
      </View>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.primary} stopOpacity={0.3} />
            <Stop offset="1" stopColor={colors.primary} stopOpacity={0.02} />
          </LinearGradient>
        </Defs>

        {/* Grid lines */}
        {yTicks.map((tick, i) => (
          <Line
            key={`grid-${i}`}
            x1={PADDING.left} y1={tick.y}
            x2={PADDING.left + chartWidth} y2={tick.y}
            stroke={colors.cardBorder} strokeWidth={0.5}
          />
        ))}

        {/* Fill area */}
        <Path d={fillD} fill="url(#curveGradient)" />

        {/* Curve line */}
        <Path d={pathD} fill="none" stroke={colors.primary} strokeWidth={2} />

        {/* Now line */}
        {nowX !== null && (
          <Line
            x1={nowX} y1={PADDING.top}
            x2={nowX} y2={PADDING.top + chartHeight}
            stroke={colors.accent} strokeWidth={1} strokeDasharray="4,4"
          />
        )}

        {/* Dose markers */}
        {doseMarkers.map((m, i) => (
          <Circle key={`dose-${i}`} cx={m.x} cy={m.y} r={4} fill={colors.primary} stroke="#fff" strokeWidth={1.5} />
        ))}

        {/* X-axis labels */}
        {xTicks.map((tick, i) => (
          <SvgText
            key={`x-${i}`}
            x={tick.x} y={PADDING.top + chartHeight + 18}
            fill={colors.textTertiary} fontSize={10} textAnchor="middle"
          >
            {tick.label}
          </SvgText>
        ))}

        {/* Y-axis labels */}
        {yTicks.map((tick, i) => (
          <SvgText
            key={`y-${i}`}
            x={PADDING.left - 5} y={tick.y + 4}
            fill={colors.textTertiary} fontSize={9} textAnchor="end"
          >
            {tick.label}
          </SvgText>
        ))}
      </Svg>
      {doseLogs.length === 0 && (
        <Text style={[styles.noData, { color: colors.textTertiary }]}>
          Theoretical single-dose curve — log doses to see stacking
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  title: { fontSize: FontSize.md, fontWeight: '700' },
  subtitle: { fontSize: FontSize.xs },
  noData: { fontSize: FontSize.xs, textAlign: 'center', marginTop: 4 },
});
