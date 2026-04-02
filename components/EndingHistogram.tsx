import type { HistogramBin } from "@/lib/historicalAnalysis";

type EndingHistogramProps = {
  bins: HistogramBin[];
  totalTrials: number;
};

export function EndingHistogram({ bins, totalTrials }: EndingHistogramProps) {
  const maxCount = Math.max(...bins.map((bin) => bin.count), 1);
  const binnedTotal = bins.reduce((sum, bin) => sum + bin.count, 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">Ending Value Distribution (Real Dollars)</h3>
      <p className="mb-4 mt-1 text-xs text-slate-500">Histogram of ending balances across all rolling historical periods.</p>

      <div className="space-y-2">
        {bins.map((bin, index) => {
          const width = `${(bin.count / maxCount) * 100}%`;
          return (
            <div key={`${bin.label}-${index}`} className="grid grid-cols-[130px_1fr_auto] items-center gap-3">
              <span className="truncate text-[11px] text-slate-500" title={bin.label}>
                ${Math.round(bin.min).toLocaleString()}–${Math.round(bin.max).toLocaleString()}
              </span>
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

      <p className="mt-3 text-[11px] text-slate-500">Binned periods: {binnedTotal.toLocaleString()} / {totalTrials.toLocaleString()}</p>
    </div>
  );
}
