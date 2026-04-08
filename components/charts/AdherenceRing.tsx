import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { useThemeColors } from '../../constants/theme';

interface AdherenceRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export default function AdherenceRing({
  percentage,
  size = 80,
  strokeWidth = 8,
  label,
}: AdherenceRingProps) {
  const colors = useThemeColors();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, percentage));
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const progressColor = progress >= 80 ? colors.success : progress >= 50 ? colors.warning : colors.danger;

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        {/* Background ring */}
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={colors.cardBorder} strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress ring */}
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={progressColor} strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
        {/* Percentage text */}
        <SvgText
          x={size / 2} y={size / 2 + (label ? -2 : 5)}
          fill={colors.text}
          fontSize={size >= 80 ? 18 : 14}
          fontWeight="bold"
          textAnchor="middle"
        >
          {Math.round(progress)}%
        </SvgText>
        {label && (
          <SvgText
            x={size / 2} y={size / 2 + 14}
            fill={colors.textTertiary}
            fontSize={9}
            textAnchor="middle"
          >
            {label}
          </SvgText>
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
});
