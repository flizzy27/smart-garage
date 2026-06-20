"use client";

import type { FuelChartPoint } from "@/lib/fuel/analytics";

type LineChartProps = {
  data: FuelChartPoint[];
  unit?: string;
  height?: number;
  color?: string;
};

export function FuelLineChart({
  data,
  unit = "",
  height = 140,
  color = "var(--accent)",
}: LineChartProps) {
  if (data.length < 2) return null;

  const width = 100;
  const padX = 4;
  const padY = 8;
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = data
    .map((d, i) => {
      const x = padX + (i / (data.length - 1)) * (width - padX * 2);
      const y = height - padY - ((d.value - min) / range) * (height - padY * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const last = data[data.length - 1];

  return (
    <div className="space-y-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full text-accent"
        preserveAspectRatio="none"
        role="img"
        aria-hidden
      >
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          points={points}
        />
        {data.map((d, i) => {
          const x = padX + (i / (data.length - 1)) * (width - padX * 2);
          const y = height - padY - ((d.value - min) / range) * (height - padY * 2);
          return (
            <circle
              key={d.date}
              cx={x}
              cy={y}
              r="1.8"
              fill={color}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{data[0]?.label}</span>
        <span className="font-medium tabular-nums text-foreground">
          {last.value.toFixed(2)}
          {unit}
        </span>
        <span>{last.label}</span>
      </div>
    </div>
  );
}

type BarChartProps = {
  data: FuelChartPoint[];
  unit?: string;
  height?: number;
  color?: string;
};

export function FuelBarChart({
  data,
  unit = "",
  height = 140,
  color = "var(--accent)",
}: BarChartProps) {
  if (data.length === 0) return null;

  const width = 100;
  const padX = 6;
  const padY = 10;
  const barGap = 2;
  const max = Math.max(...data.map((d) => d.value), 0.01);
  const barWidth = (width - padX * 2 - barGap * (data.length - 1)) / data.length;

  return (
    <div className="space-y-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        preserveAspectRatio="none"
        role="img"
        aria-hidden
      >
        {data.map((d, i) => {
          const barHeight = ((d.value / max) * (height - padY * 2));
          const x = padX + i * (barWidth + barGap);
          const y = height - padY - barHeight;
          return (
            <rect
              key={d.date}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx="1.5"
              fill={color}
              opacity={0.85}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{data[0]?.label}</span>
        <span className="font-medium tabular-nums text-foreground">
          {data[data.length - 1]?.value.toFixed(2)}
          {unit}
        </span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}
