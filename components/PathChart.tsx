type PathChartProps = {
  years: number[];
  series: {
    label: string;
    color: string;
    values: number[];
  }[];
};

const width = 760;
const height = 320;
const padding = 40;

function pathFromPoints(points: { x: number; y: number }[]): string {
  if (!points.length) return "";
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`)
    .join(" ");
}

export function PathChart({ years, series }: PathChartProps) {
  const values = series.flatMap((entry) => entry.values);
  const maxY = Math.max(...values, 1);
  const minY = 0;

  const xScale = (year: number) => {
    const last = years[years.length - 1] || 1;
    return padding + (year / last) * (width - padding * 2);
  };

  const yScale = (value: number) => {
    const ratio = (value - minY) / (maxY - minY || 1);
    return height - padding - ratio * (height - padding * 2);
  };

  const yTicks = 5;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">Portfolio Path Percentiles</h3>
      <p className="mb-4 mt-1 text-xs text-slate-500">10th, 50th, and 90th percentile balances by year.</p>

      <svg viewBox={`0 0 ${width} ${height}`} className="h-72 w-full">
        {Array.from({ length: yTicks + 1 }, (_, i) => {
          const value = minY + ((maxY - minY) / yTicks) * i;
          const y = yScale(value);
          return (
            <g key={i}>
              <line x1={padding} x2={width - padding} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />
              <text x={8} y={y + 4} className="fill-slate-500 text-[10px]">
                ${(value / 1_000_000).toFixed(1)}M
              </text>
            </g>
          );
        })}

        {series.map((entry) => {
          const points = years.map((year, index) => ({
            x: xScale(year),
            y: yScale(entry.values[index] ?? 0),
          }));

          return (
            <path
              key={entry.label}
              d={pathFromPoints(points)}
              stroke={entry.color}
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
          );
        })}

        <line x1={padding} x2={width - padding} y1={height - padding} y2={height - padding} stroke="#94a3b8" />
        <line x1={padding} x2={padding} y1={padding} y2={height - padding} stroke="#94a3b8" />
      </svg>

      <div className="mt-2 flex flex-wrap gap-3">
        {series.map((entry) => (
          <div key={entry.label} className="inline-flex items-center gap-2 text-xs text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            {entry.label}
          </div>
        ))}
      </div>
    </div>
  );
}
