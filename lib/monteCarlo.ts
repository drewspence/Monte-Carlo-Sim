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

export type InputValidationErrors = Partial<Record<keyof MonteCarloInputs | "allocationTotal", string>>;

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
  successLabel: string;
  depletionLabel: string;
  fixedPercentWithdrawalFloor: number | null;
  medianRealWithdrawal: number | null;
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

  const normalized: AllocationMix = {
    usStocks: (allocation.usStocks / rawTotal) * 100,
    intlStocks: (allocation.intlStocks / rawTotal) * 100,
    usBonds: (allocation.usBonds / rawTotal) * 100,
    cash: (allocation.cash / rawTotal) * 100,
  };

  const rounded: AllocationMix = {
    usStocks: Math.round(normalized.usStocks * 10) / 10,
    intlStocks: Math.round(normalized.intlStocks * 10) / 10,
    usBonds: Math.round(normalized.usBonds * 10) / 10,
    cash: Math.round(normalized.cash * 10) / 10,
  };

  const keys: (keyof AllocationMix)[] = ["usStocks", "intlStocks", "usBonds", "cash"];
  const roundedTotal = getAllocationTotal(rounded);
  const diff = Math.round((100 - roundedTotal) * 10) / 10;
  if (Math.abs(diff) > 0 && keys.length) {
    const lastKey = keys[keys.length - 1];
    rounded[lastKey] = Math.round((rounded[lastKey] + diff) * 10) / 10;
  }

  return rounded;
}

export function getAllocationTotal(allocation: AllocationMix): number {
  return Object.values(allocation).reduce((acc, value) => acc + value, 0);
}

export function validateInputs(inputs: MonteCarloInputs): InputValidationErrors {
  const errors: InputValidationErrors = {};
  const allocationTotal = getAllocationTotal(inputs.allocation);

  if (inputs.years < 1) errors.years = "Time horizon must be at least 1 year.";
  if (inputs.startingBalance <= 0) errors.startingBalance = "Starting portfolio must be greater than $0.";
  if (inputs.annualWithdrawal < 0) errors.annualWithdrawal = "Withdrawal amount cannot be negative.";
  if (inputs.withdrawalPercent < 0 || inputs.withdrawalPercent > 100) {
    errors.withdrawalPercent = "Withdrawal percentage must be between 0% and 100%.";
  }
  if (inputs.inflationRate < 0) errors.inflationRate = "Inflation rate cannot be negative.";
  if (inputs.expectedReturn < -100 || inputs.expectedReturn > 100) {
    errors.expectedReturn = "Expected return should be between -100% and 100%.";
  }
  if (inputs.volatility <= 0) errors.volatility = "Volatility must be greater than 0%.";
  if (inputs.feeDrag < 0) errors.feeDrag = "Fees cannot be negative.";
  if (inputs.trials < 100 || inputs.trials > 100000) {
    errors.trials = "Trials must be between 100 and 100,000.";
  }

  if (Math.abs(allocationTotal - 100) > 0.01) {
    errors.allocationTotal = `Allocation totals ${allocationTotal.toFixed(1)}%. It must equal exactly 100%.`;
  }

  return errors;
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

function buildHistogram(values: number[], requestedBins?: number): HistogramBin[] {
  if (!values.length) return [];

  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  if (max === min) {
    return [
      {
        label: `${Math.round(min).toLocaleString()} to ${Math.round(max).toLocaleString()}`,
        min,
        max,
        count: values.length,
      },
    ];
  }

  const bins = requestedBins ? Math.max(10, Math.min(20, Math.round(requestedBins))) : Math.max(10, Math.min(20, Math.round(Math.sqrt(values.length) / 2)));
  const width = (max - min) / bins;
  const counts = new Array(bins).fill(0);

  for (const value of values) {
    const idx = Math.min(Math.floor((value - min) / width), bins - 1);
    counts[idx] += 1;
  }

  const histogram = counts.map((count, index) => {
    const start = min + index * width;
    const end = index === bins - 1 ? max : start + width;
    return {
      label: `${Math.round(start).toLocaleString()} to ${Math.round(end).toLocaleString()}`,
      min: start,
      max: end,
      count,
    };
  });

  const totalCount = histogram.reduce((sum, bin) => sum + bin.count, 0);
  if (totalCount !== values.length) {
    histogram[histogram.length - 1].count += values.length - totalCount;
  }

  return histogram;
}

export function runMonteCarloSimulation(inputs: MonteCarloInputs): MonteCarloResult {
  const years = Array.from({ length: inputs.years + 1 }, (_, i) => i);
  const yearlyBalancesByTrial: number[][] = [];
  const depletionYears: number[] = [];
  const realEndingValues: number[] = [];
  const allRealWithdrawals: number[] = [];
  const fixedPercentFloor =
    inputs.withdrawalMode === "fixedPercent" ? (inputs.startingBalance * inputs.withdrawalPercent) / 100 : null;
  let floorMetCount = 0;

  const allocationBlend = deriveBlendedAssumptions(inputs.allocation);
  const meanReturn = (inputs.expectedReturn + allocationBlend.blendedReturn) / 2 / 100;
  const sigma = (inputs.volatility + allocationBlend.blendedVolatility) / 2 / 100;
  const feeDrag = inputs.feeDrag / 100;

  for (let trial = 0; trial < inputs.trials; trial += 1) {
    const path: number[] = [inputs.startingBalance];
    let balance = inputs.startingBalance;
    let withdrawalDollar = inputs.annualWithdrawal;
    let failedAtYear: number | null = null;
    let minRealWithdrawal = Number.POSITIVE_INFINITY;

    for (let year = 1; year <= inputs.years; year += 1) {
      if (balance <= 0) {
        path.push(0);
        if (inputs.withdrawalMode === "fixedPercent") {
          minRealWithdrawal = 0;
        }
        continue;
      }

      const growth = meanReturn + sigma * randomNormal() - feeDrag;
      balance = balance * (1 + growth);

      const withdrawal =
        inputs.withdrawalMode === "fixedDollar"
          ? withdrawalDollar
          : balance * (inputs.withdrawalPercent / 100);

      const inflationFactor = (1 + inputs.inflationRate / 100) ** year;
      const realWithdrawal = inflationFactor > 0 ? withdrawal / inflationFactor : withdrawal;
      allRealWithdrawals.push(realWithdrawal);
      if (inputs.withdrawalMode === "fixedPercent") {
        minRealWithdrawal = Math.min(minRealWithdrawal, realWithdrawal);
      }

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

    if (inputs.withdrawalMode === "fixedDollar" && failedAtYear !== null) {
      depletionYears.push(failedAtYear);
    }

    if (inputs.withdrawalMode === "fixedPercent" && fixedPercentFloor !== null && minRealWithdrawal >= fixedPercentFloor) {
      floorMetCount += 1;
    }

    yearlyBalancesByTrial.push(path);
    const realEndingValue = path[path.length - 1] / (1 + inputs.inflationRate / 100) ** inputs.years;
    realEndingValues.push(Math.max(0, realEndingValue));
  }

  const successfulTrials =
    inputs.withdrawalMode === "fixedDollar"
      ? realEndingValues.filter((value) => value > 0).length
      : floorMetCount;

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

  const sortedEndingValues = [...realEndingValues].sort((a, b) => a - b);
  const sortedDepletionYears = [...depletionYears].sort((a, b) => a - b);
  const sortedRealWithdrawals = [...allRealWithdrawals].sort((a, b) => a - b);

  return {
    summary: {
      successProbability,
      depletionProbability,
      medianEndingValue: percentile(sortedEndingValues, 0.5),
      medianDepletionYear: inputs.withdrawalMode === "fixedDollar" && sortedDepletionYears.length ? percentile(sortedDepletionYears, 0.5) : null,
      successLabel:
        inputs.withdrawalMode === "fixedDollar"
          ? "Success Probability"
          : "Spending Floor Success",
      depletionLabel:
        inputs.withdrawalMode === "fixedDollar"
          ? "Depletion Probability"
          : "Floor Shortfall Probability",
      fixedPercentWithdrawalFloor: fixedPercentFloor,
      medianRealWithdrawal: sortedRealWithdrawals.length ? percentile(sortedRealWithdrawals, 0.5) : null,
    },
    years,
    percentilePaths,
    endingValueHistogram: buildHistogram(realEndingValues),
    endingValues: realEndingValues,
    depletionYears,
    derivedAssumptions: allocationBlend,
  };
}
