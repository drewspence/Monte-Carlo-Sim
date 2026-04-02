import { historicalReturns } from "./historicalReturns";

export type HistoricalInputs = {
  startingBalance: number;
  years: 20 | 25 | 30;
  annualWithdrawal: number;
  inflationRate: number;
  feeDrag: number;
  stockAllocation: number;
  bondAllocation: number;
};

export type InputValidationErrors = Partial<Record<keyof HistoricalInputs | "allocationTotal", string>>;

export type PathPercentiles = {
  p10: number[];
  p50: number[];
  p90: number[];
};

export type HistogramBin = {
  label: string;
  count: number;
  min: number;
  max: number;
};

export type HistoricalSummary = {
  successRate: number;
  depletionRate: number;
  medianDepletionYear: number | null;
  medianEndingValue: number;
  periodsTested: number;
  bestOutcome: { period: string; endingValue: number };
  worstOutcome: { period: string; endingValue: number };
};

export type HistoricalResult = {
  summary: HistoricalSummary;
  years: number[];
  percentilePaths: PathPercentiles;
  endingValueHistogram: HistogramBin[];
};

export const DEFAULT_INPUTS: HistoricalInputs = {
  startingBalance: 1_000_000,
  years: 30,
  annualWithdrawal: 40_000,
  inflationRate: 3,
  feeDrag: 0.25,
  stockAllocation: 60,
  bondAllocation: 40,
};

export function getAllocationTotal(inputs: Pick<HistoricalInputs, "stockAllocation" | "bondAllocation">): number {
  return inputs.stockAllocation + inputs.bondAllocation;
}

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

  const bins =
    requestedBins && requestedBins > 0
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

export function validateInputs(inputs: HistoricalInputs): InputValidationErrors {
  const errors: InputValidationErrors = {};
  const allocationTotal = getAllocationTotal(inputs);

  if (inputs.startingBalance <= 0) errors.startingBalance = "Starting portfolio must be greater than $0.";
  if (![20, 25, 30].includes(inputs.years)) errors.years = "Analysis period must be 20, 25, or 30 years.";
  if (inputs.annualWithdrawal < 0) errors.annualWithdrawal = "Withdrawal amount cannot be negative.";
  if (inputs.inflationRate < 0) errors.inflationRate = "Inflation rate cannot be negative.";
  if (inputs.feeDrag < 0) errors.feeDrag = "Fees cannot be negative.";
  if (inputs.stockAllocation < 0 || inputs.stockAllocation > 100) errors.stockAllocation = "Stock allocation must be between 0% and 100%.";
  if (inputs.bondAllocation < 0 || inputs.bondAllocation > 100) errors.bondAllocation = "Bond allocation must be between 0% and 100%.";
  if (Math.abs(allocationTotal - 100) > 0.01) {
    errors.allocationTotal = `Allocation totals ${allocationTotal.toFixed(1)}%. It must equal exactly 100%.`;
  }

  return errors;
}

export function runHistoricalSimulation(inputs: HistoricalInputs): HistoricalResult {
  const years = Array.from({ length: inputs.years + 1 }, (_, index) => index);
  const periodsToTest = historicalReturns.length - inputs.years + 1;

  const endingValues: number[] = [];
  const depletionYears: number[] = [];
  const yearlyBalancesByPeriod: number[][] = [];
  const outcomes: { period: string; endingValue: number }[] = [];

  for (let startIndex = 0; startIndex < periodsToTest; startIndex += 1) {
    let balance = inputs.startingBalance;
    let withdrawal = inputs.annualWithdrawal;
    let depletionYear: number | null = null;
    const path: number[] = [balance];

    for (let offset = 0; offset < inputs.years; offset += 1) {
      if (balance <= 0) {
        path.push(0);
        withdrawal *= 1 + inputs.inflationRate / 100;
        continue;
      }

      balance -= withdrawal;

      if (balance <= 0 && depletionYear === null) {
        balance = 0;
        depletionYear = offset + 1;
        path.push(0);
        withdrawal *= 1 + inputs.inflationRate / 100;
        continue;
      }

      const current = historicalReturns[startIndex + offset];
      const blendedReturn =
        (inputs.stockAllocation / 100) * current.stocks + (inputs.bondAllocation / 100) * current.bonds - inputs.feeDrag / 100;

      balance *= 1 + blendedReturn;

      path.push(Math.max(0, balance));
      withdrawal *= 1 + inputs.inflationRate / 100;
    }

    if (depletionYear !== null) {
      depletionYears.push(depletionYear);
    }

    const endingReal = path[path.length - 1] / (1 + inputs.inflationRate / 100) ** inputs.years;
    const normalizedEnding = Math.max(0, endingReal);
    endingValues.push(normalizedEnding);
    yearlyBalancesByPeriod.push(path);

    const startYear = historicalReturns[startIndex].year;
    const endYear = historicalReturns[startIndex + inputs.years - 1].year;
    outcomes.push({
      period: `${startYear}-${endYear}`,
      endingValue: normalizedEnding,
    });
  }

  const successCount = endingValues.filter((value) => value > 0).length;
  const sortedEndings = [...endingValues].sort((a, b) => a - b);
  const sortedDepletion = [...depletionYears].sort((a, b) => a - b);

  const percentilePaths: PathPercentiles = { p10: [], p50: [], p90: [] };
  for (let year = 0; year <= inputs.years; year += 1) {
    const balances = yearlyBalancesByPeriod.map((path) => path[year]).sort((a, b) => a - b);
    percentilePaths.p10.push(percentile(balances, 0.1));
    percentilePaths.p50.push(percentile(balances, 0.5));
    percentilePaths.p90.push(percentile(balances, 0.9));
  }

  const sortedOutcomes = [...outcomes].sort((a, b) => a.endingValue - b.endingValue);

  return {
    summary: {
      successRate: successCount / periodsToTest,
      depletionRate: 1 - successCount / periodsToTest,
      medianDepletionYear: sortedDepletion.length ? percentile(sortedDepletion, 0.5) : null,
      medianEndingValue: percentile(sortedEndings, 0.5),
      periodsTested: periodsToTest,
      worstOutcome: sortedOutcomes[0],
      bestOutcome: sortedOutcomes[sortedOutcomes.length - 1],
    },
    years,
    percentilePaths,
    endingValueHistogram: buildHistogram(endingValues),
  };
}
