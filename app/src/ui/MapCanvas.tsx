import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, View } from 'react-native';
import Svg, {
  Circle,
  Path,
  Rect,
  G,
  Text as SvgText,
  Line,
} from 'react-native-svg';
import { LocateFixed, Minus, Plus } from 'lucide-react-native';
import { Coordinates, MapPoint } from '../core/types';
import { IconButton, Label, useTheme } from './theme';

export const categoryLabel = {
  meeting: 'Toplanma',
  water: 'Su noktası',
  medical: 'Sağlık',
  hazard: 'Tehlike',
};
/** Offline coordinate canvas. No remote tiles, fabricated roads or official places. */
export function MapCanvas({
  points = [],
  location,
  height = 260,
  compact = false,
  onSelect,
}: {
  points?: MapPoint[];
  location?: Coordinates | null;
  height?: number;
  compact?: boolean;
  onSelect?: (point: MapPoint) => void;
}) {
  const c = useTheme();
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const start = useRef(pan);
  const center = location ||
    points[0] || { latitude: 40.9904, longitude: 29.027 };
  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          !compact && Math.abs(g.dx) + Math.abs(g.dy) > 8,
        onPanResponderGrant: () => {
          start.current = pan;
        },
        onPanResponderMove: (_, g) => {
          setPan({
            x: Math.max(-150, Math.min(150, start.current.x + g.dx / 2)),
            y: Math.max(-150, Math.min(150, start.current.y + g.dy / 2)),
          });
        },
      }),
    [pan, compact],
  );
  const project = (p: Coordinates) => ({
    x: 180 + (p.longitude - center.longitude) * 8000,
    y: 150 - (p.latitude - center.latitude) * 10500,
  });
  return (
    <View
      style={{
        height,
        backgroundColor: c.map,
        borderRadius: 16,
        overflow: 'hidden',
      }}
      {...responder.panHandlers}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 360 300"
        preserveAspectRatio="xMidYMid slice"
        accessibilityLabel="Çevrimdışı koordinat planı; gerçek yol haritası değildir"
      >
        <Rect width="360" height="300" fill={c.map} />
        <G
          transform={`translate(${pan.x}, ${pan.y}) translate(180,150) scale(${zoom}) translate(-180,-150)`}
        >
          {Array.from({ length: 15 }, (_, i) => (
            <G key={i}>
              <Line
                x1={i * 40 - 100}
                x2={i * 40 - 100}
                y1={-200}
                y2={500}
                stroke={c.road}
                strokeWidth={1.5}
              />
              <Line
                y1={i * 40 - 100}
                y2={i * 40 - 100}
                x1={-200}
                x2={600}
                stroke={c.road}
                strokeWidth={1.5}
              />
            </G>
          ))}
          <Circle
            cx="180"
            cy="150"
            r="96"
            fill="none"
            stroke={c.primary}
            strokeOpacity={0.18}
            strokeWidth="1"
            strokeDasharray="4 6"
          />
          <Circle
            cx="180"
            cy="150"
            r="48"
            fill="none"
            stroke={c.primary}
            strokeOpacity={0.14}
            strokeWidth="1"
          />
          {points.map(p => {
            const xy = project(p),
              color = p.category === 'hazard' ? c.orange : c.primary;
            return (
              <G
                key={p.id}
                onPress={() => onSelect?.(p)}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`${categoryLabel[p.category]}: ${p.title}`}
              >
                <Circle
                  cx={xy.x}
                  cy={xy.y}
                  r={23 / zoom}
                  fill={color}
                  fillOpacity={0.08}
                />
                <Circle
                  cx={xy.x}
                  cy={xy.y}
                  r={13 / zoom}
                  fill={color}
                  stroke={c.surface}
                  strokeWidth={3 / zoom}
                />
                <SvgText
                  x={xy.x}
                  y={xy.y + 5 / zoom}
                  textAnchor="middle"
                  fontWeight="bold"
                  fontSize={13 / zoom}
                  fill={c.surface}
                >
                  {p.category === 'medical'
                    ? '+'
                    : p.category === 'hazard'
                    ? '!'
                    : p.category === 'water'
                    ? 'S'
                    : 'T'}
                </SvgText>
                <SvgText
                  x={xy.x}
                  y={xy.y + 34 / zoom}
                  fontSize={12 / zoom}
                  fill={c.ink}
                  textAnchor="middle"
                >
                  {p.title.slice(0, 20)}
                </SvgText>
              </G>
            );
          })}
          {location && (
            <G>
              <Circle
                cx="180"
                cy="150"
                r="23"
                fill={c.primary}
                fillOpacity={0.12}
              />
              <Circle
                cx="180"
                cy="150"
                r="8"
                fill={c.primary}
                stroke={c.surface}
                strokeWidth="3"
              />
            </G>
          )}
          {!location && points.length === 0 && (
            <G>
              <Circle cx="180" cy="140" r="24" fill={c.surface} />
              <Path
                d="M180 124a12 12 0 0 0-12 12c0 9 12 19 12 19s12-10 12-19a12 12 0 0 0-12-12z"
                fill="none"
                stroke={c.primary}
                strokeWidth="2"
              />
              <Circle
                cx="180"
                cy="136"
                r="4"
                fill="none"
                stroke={c.primary}
                strokeWidth="2"
              />
            </G>
          )}
        </G>
      </Svg>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 8,
          backgroundColor: c.surface,
        }}
      >
        <Label size={11} weight="600">
          {location || points.length ? 'KOORDİNAT PLANI' : 'KONUMUNUZU EKLEYİN'}
        </Label>
      </View>
      {!compact && (
        <View
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            backgroundColor: c.surface,
            borderRadius: 14,
          }}
        >
          <IconButton
            icon={Plus}
            label="Haritayı yakınlaştır"
            onPress={() => setZoom(z => Math.min(8, z * 1.5))}
          />
          <IconButton
            icon={Minus}
            label="Haritayı uzaklaştır"
            onPress={() => setZoom(z => Math.max(0.125, z / 1.5))}
          />
          <IconButton
            icon={LocateFixed}
            label="Planı ortala"
            onPress={() => {
              setPan({ x: 0, y: 0 });
              setZoom(1);
            }}
          />
        </View>
      )}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          right: compact ? 12 : 68,
          backgroundColor: c.surface,
          borderRadius: 8,
          padding: 8,
        }}
      >
        <Label size={11} color={c.muted}>
          {location || points.length
            ? 'Şematik alan · Yol / resmi tesis verisi içermez'
            : 'Çevrimdışı şema · Gerçek yol haritası değildir'}
        </Label>
      </View>
    </View>
  );
}
