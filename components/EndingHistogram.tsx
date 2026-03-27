import type { HistogramBin } from "@/lib/monteCarlo";

type EndingHistogramProps = {
  bins: HistogramBin[];
};

export function EndingHistogram({ bins }: EndingHistogramProps) {
  const maxCount = Math.max(...bins.map((bin) => bin.count), 1);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">Ending Value Distribution</h3>
      <p className="mb-4 mt-1 text-xs text-slate-500">Histogram of ending balances across all trials.</p>

      <div className="space-y-2">
        {bins.map((bin, index) => {
          const width = `${(bin.count / maxCount) * 100}%`;
          return (
            <div key={`${bin.label}-${index}`} className="grid grid-cols-[1fr_auto] items-center gap-3">
              <div className="h-6 rounded-md bg-slate-100">
                <div
                  className="h-6 rounded-md bg-gradient-to-r from-blue-500 to-indigo-500"
                  style={{ width }}
                  title={`${bin.label}: ${bin.count}`}
                />
              </div>
              <span className="text-xs text-slate-500">{bin.count}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex justify-between text-[11px] text-slate-500">
        <span>${Math.round(bins[0]?.min ?? 0).toLocaleString()}</span>
        <span>${Math.round(bins[bins.length - 1]?.max ?? 0).toLocaleString()}</span>
      </div>
    </div>
  );
}
