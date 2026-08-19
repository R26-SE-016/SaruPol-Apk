import { useMemo, useState } from "react";
import { View, Text } from "react-native";
import Svg, { Polyline, Polygon, Circle, Rect, Line, Text as SvgText, G } from "react-native-svg";

interface LineChartProps {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
  unit?: string;
}

/** Lightweight responsive line chart in pure SVG — no chart dependency. */
export function LineChart({ data, color = "#15803d", height = 140, unit = "" }: LineChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const width = 320;
  const pad = { top: 16, right: 16, bottom: 26, left: 36 };
  const iw = width - pad.left - pad.right;
  const ih = height - pad.top - pad.bottom;

  const { maxV, points, ticks } = useMemo(() => {
    if (!data.length) return { maxV: 1, points: [] as string[], ticks: [0, 1] };
    const maxRaw = Math.max(...data.map((d) => d.value), 1);
    const maxV = niceMax(maxRaw);
    const n = data.length;
    const stepX = n > 1 ? iw / (n - 1) : 0;
    const points = data.map((d, i) => {
      const x = pad.left + (n > 1 ? i * stepX : iw / 2);
      const y = pad.top + ih - (d.value / maxV) * ih;
      return `${x},${y}`;
    });
    const ticks = [0, Math.round(maxV / 2), maxV];
    return { maxV, points, ticks };
  }, [data, ih, iw]);

  if (!data.length) {
    return (
      <View className="flex items-center justify-center" style={{ height }}>
        <Text className="text-slate-400 text-xs">No data yet</Text>
      </View>
    );
  }

  return (
    <View className="w-full overflow-hidden">
      <Svg width={width} height={height}>
        {ticks.map((t) => {
          const y = pad.top + ih - (t / maxV) * ih;
          return (
            <G key={t}>
              <Line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="#f1f5f9" strokeWidth={1} />
              <SvgText x={pad.left - 6} y={y + 3} textAnchor="end" fontSize={9} fill="#94a3b8">{t}</SvgText>
            </G>
          );
        })}
        <Polygon
          points={`${pad.left},${pad.top + ih} ${points.join(" ")} ${pad.left + iw},${pad.top + ih}`}
          fill={color}
          fillOpacity={0.08}
        />
        <Polyline
          points={points.join(" ")}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {data.map((d, i) => {
          const [x, y] = points[i].split(",").map(Number);
          const labelSkip = data.length > 8 ? i % 2 !== 0 : false;
          return (
            <G key={i}>
              <Circle
                cx={x}
                cy={y}
                r={hover === i ? 4.5 : 2.8}
                fill={color}
                stroke="#fff"
                strokeWidth={1}
              />
              {!labelSkip && (
                <SvgText x={x} y={height - 8} textAnchor="middle" fontSize={8.5} fill="#94a3b8">{d.label}</SvgText>
              )}
            </G>
          );
        })}
        {hover !== null && (
          <G>
            <Line
              x1={Number(points[hover].split(",")[0])}
              y1={pad.top}
              x2={Number(points[hover].split(",")[0])}
              y2={pad.top + ih}
              stroke={color}
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.4}
            />
            <SvgText
              x={Number(points[hover].split(",")[0])}
              y={Number(points[hover].split(",")[1]) - 8}
              textAnchor="middle"
              fontSize={10}
              fontWeight={700}
              fill={color}
            >
              {data[hover].value}{unit}
            </SvgText>
          </G>
        )}
      </Svg>
    </View>
  );
}

function niceMax(v: number): number {
  if (v <= 5) return 5;
  if (v <= 10) return 10;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil(v / pow) * pow;
}

interface ComboChartProps {
  bars: { label: string; value: number }[];
  line: { label: string; value: number }[];
  barColor?: string;
  lineColor?: string;
  height?: number;
}

/** Yield (bars) vs. weather metric (line) on a dual-axis combo chart. */
export function ComboChart({
  bars,
  line,
  barColor = "#15803d",
  lineColor = "#0ea5e9",
  height = 170,
}: ComboChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const width = 320;
  const pad = { top: 16, right: 36, bottom: 26, left: 36 };
  const iw = width - pad.left - pad.right;
  const ih = height - pad.top - pad.bottom;

  const { maxBar, maxLine, barRects, linePts } = useMemo(() => {
    const maxBar = niceMax(Math.max(...bars.map((b) => b.value), 1));
    const maxLine = niceMax(Math.max(...line.map((l) => l.value), 1));
    const n = bars.length;
    const slot = n > 0 ? iw / n : iw;
    const barW = Math.min(slot * 0.5, 26);
    const barRects = bars.map((b, i) => ({
      x: pad.left + i * slot + (slot - barW) / 2,
      y: pad.top + ih - (b.value / maxBar) * ih,
      w: barW,
      h: (b.value / maxBar) * ih,
    }));
    const ln = line.length;
    const stepX = ln > 1 ? iw / (ln - 1) : 0;
    const linePts = line.map((l, i) => ({
      x: pad.left + (ln > 1 ? i * stepX : iw / 2),
      y: pad.top + ih - (l.value / maxLine) * ih,
    }));
    return { maxBar, maxLine, barRects, linePts };
  }, [bars, line, ih, iw]);

  if (!bars.length) {
    return (
      <View className="flex items-center justify-center" style={{ height }}>
        <Text className="text-slate-400 text-xs">No yield data yet</Text>
      </View>
    );
  }

  return (
    <View className="w-full overflow-hidden">
      <Svg width={width} height={height}>
        {[0, Math.round(maxBar / 2), maxBar].map((t) => {
          const y = pad.top + ih - (t / maxBar) * ih;
          return (
            <G key={`b${t}`}>
              <Line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="#f1f5f9" strokeWidth={1} />
              <SvgText x={pad.left - 6} y={y + 3} textAnchor="end" fontSize={9} fill={barColor}>{t}</SvgText>
            </G>
          );
        })}
        {[0, Math.round(maxLine / 2), maxLine].map((t) => {
          const y = pad.top + ih - (t / maxLine) * ih;
          return (
            <SvgText key={`l${t}`} x={width - pad.right + 6} y={y + 3} textAnchor="start" fontSize={9} fill={lineColor}>{t}</SvgText>
          );
        })}
        {barRects.map((r, i) => (
          <G key={i}>
            <Rect
              x={r.x}
              y={r.y}
              width={r.w}
              height={r.h}
              rx={3}
              fill={barColor}
              fillOpacity={hover === i ? 1 : 0.8}
            />
            <SvgText x={r.x + r.w / 2} y={height - 8} textAnchor="middle" fontSize={8} fill="#94a3b8">
              {bars[i].label}
            </SvgText>
          </G>
        ))}
        <Polyline
          points={linePts.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke={lineColor}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {linePts.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={hover === i ? 4 : 2.5} fill={lineColor} stroke="#fff" strokeWidth={1} />
        ))}
        {hover !== null && (
          <SvgText
            x={barRects[hover].x + barRects[hover].w / 2}
            y={barRects[hover].y - 6}
            textAnchor="middle"
            fontSize={10}
            fontWeight={700}
            fill={barColor}
          >
            {bars[hover].value}
          </SvgText>
        )}
      </Svg>
    </View>
  );
}
