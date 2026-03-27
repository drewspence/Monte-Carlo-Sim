export type WithdrawalMode = "fixedDollar" | "fixedPercent";

export type AllocationMix = {
  usStocks: number;
  intlStocks: number;
  usBonds: number;
  cash: number;
};

export type MonteCarloInputs = {
  startingBalance: number;
  years: number;
  withdrawalMode: WithdrawalMode;
  annualWithdrawal: number;
  withdrawalPercent: number;
  inflationRate: number;
  expectedReturn: number;
  volatility: number;
  feeDrag: number;
  allocation: AllocationMix;
  trials: number;
};

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

export type MonteCarloSummary = {
  successProbability: number;
  depletionProbability: number;
  medianEndingValue: number;
  medianDepletionYear: number | null;
};

export type MonteCarloResult = {
  summary: MonteCarloSummary;
  years: number[];
  percentilePaths: PathPercentiles;
  endingValueHistogram: HistogramBin[];
  endingValues: number[];
  depletionYears: number[];
  derivedAssumptions: {
    blendedReturn: number;
    blendedVolatility: number;
  };
};

export const DEFAULT_ASSET_ASSUMPTIONS: Record<
  keyof AllocationMix,
  { expectedReturn: number; volatility: number; label: string }
> = {
  usStocks: { label: "U.S. Stocks", expectedReturn: 0.09, volatility: 0.18 },
  intlStocks: { label: "International Stocks", expectedReturn: 0.085, volatility: 0.2 },
  usBonds: { label: "U.S. Bonds", expectedReturn: 0.045, volatility: 0.07 },
  cash: { label: "Cash", expectedReturn: 0.025, volatility: 0.01 },
};

export const DEFAULT_INPUTS: MonteCarloInputs = {
  startingBalance: 1_000_000,
  years: 30,
  withdrawalMode: "fixedDollar",
  annualWithdrawal: 40_000,
  withdrawalPercent: 4,
  inflationRate: 3,
  expectedReturn: 7,
  volatility: 15,
  feeDrag: 0.25,
  allocation: {
    usStocks: 60,
    intlStocks: 20,
    usBonds: 15,
    cash: 5,
  },
  trials: 3000,
};

export function normalizeAllocation(allocation: AllocationMix): AllocationMix {
  const rawTotal = Object.values(allocation).reduce((acc, value) => acc + value, 0);
  if (rawTotal <= 0) {
    return { ...DEFAULT_INPUTS.allocation };
  }

  return {
    usStocks: (allocation.usStocks / rawTotal) * 100,
    intlStocks: (allocation.intlStocks / rawTotal) * 100,
    usBonds: (allocation.usBonds / rawTotal) * 100,
    cash: (allocation.cash / rawTotal) * 100,
  };
}

export function getAllocationTotal(allocation: AllocationMix): number {
  return Object.values(allocation).reduce((acc, value) => acc + value, 0);
}

export function deriveBlendedAssumptions(allocation: AllocationMix): {
  blendedReturn: number;
  blendedVolatility: number;
} {
  const weights = normalizeAllocation(allocation);
  const weightedReturn =
    (weights.usStocks / 100) * DEFAULT_ASSET_ASSUMPTIONS.usStocks.expectedReturn +
    (weights.intlStocks / 100) * DEFAULT_ASSET_ASSUMPTIONS.intlStocks.expectedReturn +
    (weights.usBonds / 100) * DEFAULT_ASSET_ASSUMPTIONS.usBonds.expectedReturn +
    (weights.cash / 100) * DEFAULT_ASSET_ASSUMPTIONS.cash.expectedReturn;

  const weightedVariance =
    (weights.usStocks / 100) ** 2 * DEFAULT_ASSET_ASSUMPTIONS.usStocks.volatility ** 2 +
    (weights.intlStocks / 100) ** 2 * DEFAULT_ASSET_ASSUMPTIONS.intlStocks.volatility ** 2 +
    (weights.usBonds / 100) ** 2 * DEFAULT_ASSET_ASSUMPTIONS.usBonds.volatility ** 2 +
    (weights.cash / 100) ** 2 * DEFAULT_ASSET_ASSUMPTIONS.cash.volatility ** 2;

  return {
    blendedReturn: weightedReturn * 100,
    blendedVolatility: Math.sqrt(weightedVariance) * 100,
  };
}

function randomNormal(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
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

function buildHistogram(values: number[], bins = 12): HistogramBin[] {
  if (!values.length) return [];

  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  if (max === min) {
    return [
      {
        label: `${Math.round(min).toLocaleString()}`,
        min,
        max,
        count: values.length,
      },
    ];
  }

  const width = (max - min) / bins;
  const counts = new Array(bins).fill(0);

  for (const value of values) {
    const idx = Math.min(Math.floor((value - min) / width), bins - 1);
    counts[idx] += 1;
  }

  return counts.map((count, index) => {
    const start = min + index * width;
    const end = start + width;
    return {
      label: `${Math.round(start).toLocaleString()}-${Math.round(end).toLocaleString()}`,
      min: start,
      max: end,
      count,
    };
  });
}

export function runMonteCarloSimulation(inputs: MonteCarloInputs): MonteCarloResult {
  const years = Array.from({ length: inputs.years + 1 }, (_, i) => i);
  const yearlyBalancesByTrial: number[][] = [];
  const depletionYears: number[] = [];
  const endingValues: number[] = [];

  const allocationBlend = deriveBlendedAssumptions(inputs.allocation);
  const meanReturn = (inputs.expectedReturn + allocationBlend.blendedReturn) / 2 / 100;
  const sigma = (inputs.volatility + allocationBlend.blendedVolatility) / 2 / 100;
  const feeDrag = inputs.feeDrag / 100;

  for (let trial = 0; trial < inputs.trials; trial += 1) {
    const path: number[] = [inputs.startingBalance];
    let balance = inputs.startingBalance;
    let withdrawalDollar = inputs.annualWithdrawal;
    let failedAtYear: number | null = null;

    for (let year = 1; year <= inputs.years; year += 1) {
      if (balance <= 0) {
        path.push(0);
        continue;
      }

      const growth = meanReturn + sigma * randomNormal() - feeDrag;
      balance = balance * (1 + growth);

      const withdrawal =
        inputs.withdrawalMode === "fixedDollar"
          ? withdrawalDollar
          : balance * (inputs.withdrawalPercent / 100);

      balance -= withdrawal;

      if (inputs.withdrawalMode === "fixedDollar") {
        withdrawalDollar *= 1 + inputs.inflationRate / 100;
      }

      if (balance <= 0 && failedAtYear === null) {
        balance = 0;
        failedAtYear = year;
      }

      path.push(Math.max(0, balance));
    }

    if (failedAtYear !== null) {
      depletionYears.push(failedAtYear);
    }

    yearlyBalancesByTrial.push(path);
    endingValues.push(path[path.length - 1]);
  }

  const successfulTrials = endingValues.filter((value) => value > 0).length;
  const successProbability = successfulTrials / inputs.trials;
  const depletionProbability = 1 - successProbability;

  const percentilePaths: PathPercentiles = {
    p10: [],
    p50: [],
    p90: [],
  };

  for (let year = 0; year <= inputs.years; year += 1) {
    const balancesForYear = yearlyBalancesByTrial.map((trialPath) => trialPath[year]).sort((a, b) => a - b);
    percentilePaths.p10.push(percentile(balancesForYear, 0.1));
    percentilePaths.p50.push(percentile(balancesForYear, 0.5));
    percentilePaths.p90.push(percentile(balancesForYear, 0.9));
  }

  const sortedEndingValues = [...endingValues].sort((a, b) => a - b);
  const sortedDepletionYears = [...depletionYears].sort((a, b) => a - b);

  return {
    summary: {
      successProbability,
      depletionProbability,
      medianEndingValue: percentile(sortedEndingValues, 0.5),
      medianDepletionYear: sortedDepletionYears.length ? percentile(sortedDepletionYears, 0.5) : null,
    },
    years,
    percentilePaths,
    endingValueHistogram: buildHistogram(endingValues),
    endingValues,
    depletionYears,
    derivedAssumptions: allocationBlend,
  };
}
