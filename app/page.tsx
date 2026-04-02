"use client";

import { useMemo, useState } from "react";
import { EndingHistogram } from "@/components/EndingHistogram";
import { PathChart } from "@/components/PathChart";
import {
  DEFAULT_INPUTS,
  getAllocationTotal,
  runHistoricalSimulation,
  validateInputs,
  type HistoricalInputs,
} from "@/lib/historicalAnalysis";

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
});

function NumberField({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
  suffix,
  error,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  error?: string;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-medium tracking-wide text-slate-600">{label}</span>
      <div className="relative">
        <input
          type="number"
          value={Number.isFinite(value) ? value : ""}
          min={min}
          max={max}
          step={step}
          onChange={(event) => onChange(Number(event.target.value))}
          className={`w-full rounded-lg border bg-white px-3 py-2 pr-10 text-sm text-slate-900 outline-none transition focus:ring-2 ${
            error
              ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100"
              : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"
          }`}
        />
        {suffix ? <span className="pointer-events-none absolute right-3 top-2 text-xs text-slate-500">{suffix}</span> : null}
      </div>
      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
    </label>
  );
}

export default function Home() {
  const [draftInputs, setDraftInputs] = useState<HistoricalInputs>(DEFAULT_INPUTS);
  const [activeInputs, setActiveInputs] = useState<HistoricalInputs>(DEFAULT_INPUTS);

  const allocationTotal = getAllocationTotal(draftInputs);
  const validationErrors = useMemo(() => validateInputs(draftInputs), [draftInputs]);
  const hasValidationErrors = Object.keys(validationErrors).length > 0;

  const simulation = useMemo(() => runHistoricalSimulation(activeInputs), [activeInputs]);

  const setField = <K extends keyof HistoricalInputs>(key: K, value: HistoricalInputs[K]) => {
    setDraftInputs((current) => ({ ...current, [key]: value }));
  };

  const runSimulation = () => {
    if (!hasValidationErrors) {
      setActiveInputs(draftInputs);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-7xl grid-cols-1 gap-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[330px_1fr] md:p-6">
        <aside className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Retirement Analysis</p>
            <h1 className="mt-2 text-xl font-semibold">Historical Inputs</h1>
            <p className="mt-1 text-sm text-slate-500">Tests every rolling historical period from 1928 through 2024.</p>
          </div>

          <div className="space-y-4">
            <NumberField
              label="Starting Portfolio Balance"
              value={draftInputs.startingBalance}
              min={1}
              step={1000}
              onChange={(value) => setField("startingBalance", value)}
              suffix="USD"
              error={validationErrors.startingBalance}
            />

            <label className="space-y-1.5">
              <span className="text-xs font-medium tracking-wide text-slate-600">Analysis Period</span>
              <select
                value={draftInputs.years}
                onChange={(event) => setField("years", Number(event.target.value) as 20 | 25 | 30)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value={20}>20 years</option>
                <option value={25}>25 years</option>
                <option value={30}>30 years</option>
              </select>
              {validationErrors.years ? <p className="text-xs font-medium text-rose-600">{validationErrors.years}</p> : null}
            </label>

            <NumberField
              label="Annual Withdrawal (Real-Dollar)"
              value={draftInputs.annualWithdrawal}
              min={0}
              step={500}
              onChange={(value) => setField("annualWithdrawal", value)}
              suffix="USD"
              error={validationErrors.annualWithdrawal}
            />
            <NumberField
              label="User Inflation"
              value={draftInputs.inflationRate}
              min={0}
              step={0.1}
              onChange={(value) => setField("inflationRate", value)}
              suffix="%"
              error={validationErrors.inflationRate}
            />
            <NumberField
              label="Annual Fees Drag"
              value={draftInputs.feeDrag}
              min={0}
              step={0.05}
              onChange={(value) => setField("feeDrag", value)}
              suffix="%"
              error={validationErrors.feeDrag}
            />

            <section className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold">Allocation Mix</h2>
              <div className="space-y-3">
                <NumberField
                  label="U.S. Stocks"
                  value={draftInputs.stockAllocation}
                  min={0}
                  max={100}
                  step={1}
                  suffix="%"
                  onChange={(value) => setField("stockAllocation", value)}
                  error={validationErrors.stockAllocation}
                />
                <NumberField
                  label="U.S. Bonds"
                  value={draftInputs.bondAllocation}
                  min={0}
                  max={100}
                  step={1}
                  suffix="%"
                  onChange={(value) => setField("bondAllocation", value)}
                  error={validationErrors.bondAllocation}
                />
              </div>
              <p className="mt-3 text-xs text-slate-500">Total: {allocationTotal.toFixed(1)}%</p>
              {validationErrors.allocationTotal ? (
                <p className="mt-1 text-xs font-medium text-rose-600">{validationErrors.allocationTotal}</p>
              ) : null}
            </section>

            <button
              type="button"
              onClick={runSimulation}
              disabled={hasValidationErrors}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Run historical analysis
            </button>
          </div>
        </aside>

        <main className="rounded-xl border border-slate-200 p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Rolling Historical Results</h2>
              <p className="mt-1 text-sm text-slate-500">
                {activeInputs.years}-year windows from 1928-2024 · {simulation.summary.periodsTested.toLocaleString()} periods tested
              </p>
            </div>
            <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500">
              Allocation: {activeInputs.stockAllocation.toFixed(0)}% stocks / {activeInputs.bondAllocation.toFixed(0)}% bonds
            </span>
          </div>

          <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Success Rate</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-600">{percentFormatter.format(simulation.summary.successRate)}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Depletion Rate</p>
              <p className="mt-2 text-2xl font-semibold text-rose-600">{percentFormatter.format(simulation.summary.depletionRate)}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Median Depletion Year</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {simulation.summary.medianDepletionYear ? `Year ${simulation.summary.medianDepletionYear.toFixed(0)}` : "N/A"}
              </p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Median Ending Value (Real)</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{moneyFormatter.format(simulation.summary.medianEndingValue)}</p>
            </article>
          </div>

          <div className="mb-6 grid gap-3 md:grid-cols-2">
            <article className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Best Outcome</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{simulation.summary.bestOutcome.period}</p>
              <p className="text-sm text-emerald-600">{moneyFormatter.format(simulation.summary.bestOutcome.endingValue)}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Worst Outcome</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{simulation.summary.worstOutcome.period}</p>
              <p className="text-sm text-rose-600">{moneyFormatter.format(simulation.summary.worstOutcome.endingValue)}</p>
            </article>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <PathChart
              years={simulation.years}
              series={[
                { label: "10th percentile", color: "#ef4444", values: simulation.percentilePaths.p10 },
                { label: "50th percentile", color: "#3b82f6", values: simulation.percentilePaths.p50 },
                { label: "90th percentile", color: "#10b981", values: simulation.percentilePaths.p90 },
              ]}
            />
            <EndingHistogram bins={simulation.endingValueHistogram} totalTrials={simulation.summary.periodsTested} />
          </div>

          <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Methodology</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              This tool does not use random Monte Carlo draws. It evaluates every consecutive {activeInputs.years}-year historical
              sequence (for example, 1928-{1928 + activeInputs.years - 1}) and applies your chosen stock/bond blend each year,
              applies withdrawals at the beginning of each year, then applies net returns after fees, grows withdrawals by your inflation setting, and records depletion events.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
