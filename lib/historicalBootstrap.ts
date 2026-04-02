import { monthlyReturns } from "./monthlyReturns";

export type HistoricalBootstrapInputs = {
  startingBalance: number;
  years: number;
  annualWithdrawal: number;
  inflationRate: number;
  feeDrag: number;
  stockAllocation: number;
  bondAllocation: number;
  simulations: number;
  rebalanceFrequencyMonths: number;
};

export type HistogramBin = {
  label: string;
  count: number;
  min: number;
  max: number;
};

export type PathPercentiles = {
  p10: number[];
  p50: number[];
  p90: number[];
};

export type BootstrapSummary = {
  successProbability: number;
  depletionProbability: number;
  medianDepletionMonth: number | null;
  medianDepletionYear: number | null;
  medianEndingValue: number;
  p10EndingValue: number;
  p50EndingValue: number;
  p90EndingValue: number;
  simulationsRun: number;
};

export type HistoricalBootstrapResult = {
  summary: BootstrapSummary;
  months: number[];
  percentilePaths: PathPercentiles;
  endingValueHistogram: HistogramBin[];
};

function percentile(sortedValues: number[], p: number): number {
  if (!sortedValues.length) return 0;
  const idx = (sortedValues.length - 1) * p;
  const low = Math.floor(idx);
  const high = Math.ceil(idx);
  if (low === high) return sortedValues[low];
  const weight = idx - low;
  return sortedValues[low] * (1 - weight) + sortedValues[high] * weight;
}

function buildHistogram(values: number[], requestedBins?: number): HistogramBin[] {
  if (!values.length) return [];

  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  if (max === min) {
    return [{ label: `${Math.round(min).toLocaleString()} to ${Math.round(max).toLocaleString()}`, min, max, count: values.length }];
  }

  const bins = requestedBins
    ? Math.max(8, Math.min(20, Math.round(requestedBins)))
    : Math.max(8, Math.min(20, Math.round(Math.sqrt(values.length))));
  const width = (max - min) / bins;
  const counts = new Array(bins).fill(0);

  for (const value of values) {
    const idx = Math.min(Math.floor((value - min) / width), bins - 1);
    counts[idx] += 1;
  }

  return counts.map((count, index) => {
    const start = min + index * width;
    const end = index === bins - 1 ? max : start + width;
    return {
      label: `${Math.round(start).toLocaleString()} to ${Math.round(end).toLocaleString()}`,
      min: start,
      max: end,
      count,
    };
  });
}

export function annualPercentToDecimal(percent: number): number {
  return percent / 100;
}

export function annualToMonthlyRate(annualPercent: number): number {
  return (1 + annualPercentToDecimal(annualPercent)) ** (1 / 12) - 1;
}

export function annualToMonthlyWithdrawal(annualWithdrawal: number): number {
  return annualWithdrawal / 12;
}

export function runHistoricalBootstrapSimulation(
  inputs: HistoricalBootstrapInputs,
  randomFn: () => number = Math.random,
): HistoricalBootstrapResult {
  const totalMonths = Math.max(1, Math.round(inputs.years * 12));
  const months = Array.from({ length: totalMonths + 1 }, (_, index) => index / 12);

  const monthlyInflation = annualToMonthlyRate(inputs.inflationRate);
  const monthlyFeeDrag = annualToMonthlyRate(inputs.feeDrag);

  const endingValues: number[] = [];
  const depletionMonths: number[] = [];
  const realPaths: number[][] = [];

  for (let trial = 0; trial < inputs.simulations; trial += 1) {
    let portfolio = inputs.startingBalance;
    let monthlyWithdrawal = annualToMonthlyWithdrawal(inputs.annualWithdrawal);
    let depletionMonth: number | null = null;
    const nominalPath = [portfolio];

    for (let month = 1; month <= totalMonths; month += 1) {
      portfolio -= monthlyWithdrawal;

      if (portfolio <= 0) {
        portfolio = 0;
        depletionMonth = month;
        nominalPath.push(0);
        for (let trailing = month + 1; trailing <= totalMonths; trailing += 1) {
          nominalPath.push(0);
        }
        break;
      }

      const sampled = monthlyReturns[Math.floor(randomFn() * monthlyReturns.length)];
      const blendedReturn =
        (inputs.stockAllocation / 100) * sampled.stocks +
        (inputs.bondAllocation / 100) * sampled.bonds -
        monthlyFeeDrag;

      portfolio *= 1 + blendedReturn;
      nominalPath.push(Math.max(0, portfolio));

      if (inputs.rebalanceFrequencyMonths > 0 && month % inputs.rebalanceFrequencyMonths === 0) {
        // No-op rebalance placeholder: portfolio-level blended return already assumes target weights.
      }

      monthlyWithdrawal *= 1 + monthlyInflation;
    }

    if (depletionMonth !== null) {
      depletionMonths.push(depletionMonth);
    }

    const realPath = nominalPath.map((value, index) => value / (1 + monthlyInflation) ** index);
    realPaths.push(realPath);
    endingValues.push(Math.max(0, realPath[realPath.length - 1]));
  }

  const sortedEndings = [...endingValues].sort((a, b) => a - b);
  const sortedDepletions = [...depletionMonths].sort((a, b) => a - b);
  const successCount = endingValues.filter((value) => value > 0).length;

  const percentilePaths: PathPercentiles = { p10: [], p50: [], p90: [] };
  for (let month = 0; month <= totalMonths; month += 1) {
    const valuesAtMonth = realPaths.map((path) => path[month] ?? 0).sort((a, b) => a - b);
    percentilePaths.p10.push(percentile(valuesAtMonth, 0.1));
    percentilePaths.p50.push(percentile(valuesAtMonth, 0.5));
    percentilePaths.p90.push(percentile(valuesAtMonth, 0.9));
  }

  const medianDepletionMonth = sortedDepletions.length ? percentile(sortedDepletions, 0.5) : null;

  return {
    summary: {
      successProbability: successCount / inputs.simulations,
      depletionProbability: 1 - successCount / inputs.simulations,
      medianDepletionMonth,
      medianDepletionYear: medianDepletionMonth ? medianDepletionMonth / 12 : null,
      medianEndingValue: percentile(sortedEndings, 0.5),
      p10EndingValue: percentile(sortedEndings, 0.1),
      p50EndingValue: percentile(sortedEndings, 0.5),
      p90EndingValue: percentile(sortedEndings, 0.9),
      simulationsRun: inputs.simulations,
    },
    months,
    percentilePaths,
    endingValueHistogram: buildHistogram(endingValues),
  };
}
