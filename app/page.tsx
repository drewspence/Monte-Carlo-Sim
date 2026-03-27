"use client";

import { useMemo, useState } from "react";
import { EndingHistogram } from "@/components/EndingHistogram";
import { PathChart } from "@/components/PathChart";
import {
  DEFAULT_INPUTS,
  deriveBlendedAssumptions,
  getAllocationTotal,
  normalizeAllocation,
  runMonteCarloSimulation,
  type AllocationMix,
  type MonteCarloInputs,
  type WithdrawalMode,
} from "@/lib/monteCarlo";

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
  min = 0,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  step?: number;
  min?: number;
  suffix?: string;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-medium tracking-wide text-slate-600">{label}</span>
      <div className="relative">
        <input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          min={min}
          step={step}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        {suffix ? <span className="pointer-events-none absolute right-3 top-2 text-xs text-slate-500">{suffix}</span> : null}
      </div>
    </label>
  );
}

function AllocationFields({
  allocation,
  onChange,
}: {
  allocation: AllocationMix;
  onChange: (next: AllocationMix) => void;
}) {
  const items: { key: keyof AllocationMix; label: string }[] = [
    { key: "usStocks", label: "U.S. Stocks" },
    { key: "intlStocks", label: "International Stocks" },
    { key: "usBonds", label: "U.S. Bonds" },
    { key: "cash", label: "Cash" },
  ];

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <NumberField
          key={item.key}
          label={item.label}
          value={allocation[item.key]}
          min={0}
          step={0.5}
          suffix="%"
          onChange={(value) =>
            onChange({
              ...allocation,
              [item.key]: value,
            })
          }
        />
      ))}
    </div>
  );
}

export default function Home() {
  const [inputs, setInputs] = useState<MonteCarloInputs>(DEFAULT_INPUTS);
  const [allocationError, setAllocationError] = useState<string | null>(null);

  const allocationTotal = getAllocationTotal(inputs.allocation);
  const allocationBlend = useMemo(() => deriveBlendedAssumptions(inputs.allocation), [inputs.allocation]);

  const simulation = runMonteCarloSimulation(inputs);

  const setField = <K extends keyof MonteCarloInputs>(key: K, value: MonteCarloInputs[K]) => {
    setInputs((current) => ({ ...current, [key]: value }));
  };

  const changeWithdrawalMode = (mode: WithdrawalMode) => {
    setInputs((current) => ({ ...current, withdrawalMode: mode }));
  };

  const normalizeAllocationClick = () => {
    const normalized = normalizeAllocation(inputs.allocation);
    setInputs((current) => ({ ...current, allocation: normalized }));
    setAllocationError(null);
  };

  const updateAllocation = (allocation: AllocationMix) => {
    setInputs((current) => ({ ...current, allocation }));
    const total = getAllocationTotal(allocation);
    if (Math.abs(total - 100) > 0.01) {
      setAllocationError(`Allocation currently totals ${total.toFixed(1)}%. It should equal 100%.`);
    } else {
      setAllocationError(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-7xl grid-cols-1 gap-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[320px_1fr] md:p-6">
        <aside className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Monte Carlo Sim</p>
            <h1 className="mt-2 text-xl font-semibold">Portfolio Inputs</h1>
            <p className="mt-1 text-sm text-slate-500">Adjust assumptions to estimate longevity and success odds.</p>
          </div>

          <div className="space-y-4">
            <NumberField
              label="Starting Portfolio Balance"
              value={inputs.startingBalance}
              min={1000}
              step={1000}
              onChange={(value) => setField("startingBalance", Math.max(0, value))}
              suffix="USD"
            />
            <NumberField
              label="Time Horizon"
              value={inputs.years}
              min={1}
              step={1}
              onChange={(value) => setField("years", Math.max(1, Math.round(value)))}
              suffix="yrs"
            />

            <div className="space-y-2">
              <p className="text-xs font-medium tracking-wide text-slate-600">Withdrawal Mode</p>
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-200/70 p-1">
                <button
                  type="button"
                  onClick={() => changeWithdrawalMode("fixedDollar")}
                  className={`rounded-md px-3 py-2 text-xs font-medium transition ${
                    inputs.withdrawalMode === "fixedDollar" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
                  }`}
                >
                  Fixed Dollar
                </button>
                <button
                  type="button"
                  onClick={() => changeWithdrawalMode("fixedPercent")}
                  className={`rounded-md px-3 py-2 text-xs font-medium transition ${
                    inputs.withdrawalMode === "fixedPercent" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
                  }`}
                >
                  Fixed Percent
                </button>
              </div>
            </div>

            {inputs.withdrawalMode === "fixedDollar" ? (
              <NumberField
                label="Annual Withdrawal"
                value={inputs.annualWithdrawal}
                min={0}
                step={500}
                onChange={(value) => setField("annualWithdrawal", Math.max(0, value))}
                suffix="USD"
              />
            ) : (
              <NumberField
                label="Withdrawal Percentage"
                value={inputs.withdrawalPercent}
                min={0}
                step={0.1}
                onChange={(value) => setField("withdrawalPercent", Math.max(0, value))}
                suffix="%"
              />
            )}

            <NumberField
              label="Inflation Rate"
              value={inputs.inflationRate}
              min={0}
              step={0.1}
              onChange={(value) => setField("inflationRate", Math.max(0, value))}
              suffix="%"
            />
            <NumberField
              label="Expected Annual Return"
              value={inputs.expectedReturn}
              min={-50}
              step={0.1}
              onChange={(value) => setField("expectedReturn", value)}
              suffix="%"
            />
            <NumberField
              label="Annual Volatility"
              value={inputs.volatility}
              min={0}
              step={0.1}
              onChange={(value) => setField("volatility", Math.max(0, value))}
              suffix="%"
            />
            <NumberField
              label="Annual Fees Drag"
              value={inputs.feeDrag}
              min={0}
              step={0.05}
              onChange={(value) => setField("feeDrag", Math.max(0, value))}
              suffix="%"
            />

            <section className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Allocation Mix</h2>
                <button
                  type="button"
                  onClick={normalizeAllocationClick}
                  className="rounded-md border border-slate-300 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
                >
                  Normalize
                </button>
              </div>
              <AllocationFields allocation={inputs.allocation} onChange={updateAllocation} />
              <p className="mt-3 text-xs text-slate-500">Total: {allocationTotal.toFixed(1)}%</p>
              {allocationError ? <p className="mt-1 text-xs font-medium text-amber-600">{allocationError}</p> : null}
            </section>
          </div>
        </aside>

        <main className="rounded-xl border border-slate-200 p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Longevity Results</h2>
              <p className="mt-1 text-sm text-slate-500">{inputs.trials.toLocaleString()} Monte Carlo trials · {inputs.years} years</p>
            </div>
            <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500">
              Blended Assumptions: {allocationBlend.blendedReturn.toFixed(1)}% return / {allocationBlend.blendedVolatility.toFixed(1)}% vol
            </span>
          </div>

          <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Success Probability</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-600">
                {percentFormatter.format(simulation.summary.successProbability)}
              </p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Depletion Probability</p>
              <p className="mt-2 text-2xl font-semibold text-rose-600">
                {percentFormatter.format(simulation.summary.depletionProbability)}
              </p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Median Ending Value</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {moneyFormatter.format(simulation.summary.medianEndingValue)}
              </p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Median Depletion Year</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {simulation.summary.medianDepletionYear ? simulation.summary.medianDepletionYear.toFixed(0) : "N/A"}
              </p>
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
            <EndingHistogram bins={simulation.endingValueHistogram} />
          </div>

          <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">How to interpret this simulation</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              This estimate models hypothetical annual returns and withdrawals to show how often the portfolio lasts through
              year {inputs.years}. It is not a prediction or personalized advice. Outcomes are sensitive to return,
              volatility, inflation, fees, allocation mix, and withdrawal assumptions.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
