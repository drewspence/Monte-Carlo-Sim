import { describe, expect, it } from "vitest";
import { DEFAULT_INPUTS, getAllocationTotal, runHistoricalSimulation, validateInputs } from "./historicalAnalysis";

describe("getAllocationTotal", () => {
  it("totals stock and bond allocations", () => {
    expect(getAllocationTotal({ stockAllocation: 60, bondAllocation: 40 })).toBe(100);
  });
});

describe("validateInputs", () => {
  it("returns errors for invalid ranges and allocation mismatch", () => {
    const errors = validateInputs({
      ...DEFAULT_INPUTS,
      years: 20,
      stockAllocation: 70,
      bondAllocation: 20,
      inflationRate: -1,
    });

    expect(errors.inflationRate).toBeTruthy();
    expect(errors.allocationTotal).toBeTruthy();
  });
});

describe("runHistoricalSimulation", () => {
  it("tests all available rolling periods and returns summary metrics", () => {
    const result = runHistoricalSimulation({
      ...DEFAULT_INPUTS,
      years: 30,
    });

    expect(result.summary.periodsTested).toBe(68);
    expect(result.summary.successRate + result.summary.depletionRate).toBeCloseTo(1, 10);
    expect(result.summary.bestOutcome.period).toMatch(/\d{4}-\d{4}/);
    expect(result.summary.worstOutcome.period).toMatch(/\d{4}-\d{4}/);
    expect(result.endingValueHistogram.reduce((sum, bin) => sum + bin.count, 0)).toBe(result.summary.periodsTested);
    expect(result.percentilePaths.p50.at(-1)).toBeCloseTo(result.summary.medianEndingValue, 6);
  });

  it("uses withdrawal-first timing and depletes immediately when withdrawal exceeds starting balance", () => {
    const result = runHistoricalSimulation({
      ...DEFAULT_INPUTS,
      years: 20,
      startingBalance: 100,
      annualWithdrawal: 120,
      inflationRate: 0,
      feeDrag: 0,
      stockAllocation: 100,
      bondAllocation: 0,
    });

    expect(result.summary.successRate).toBe(0);
    expect(result.summary.depletionRate).toBe(1);
    expect(result.summary.medianDepletionYear).toBe(1);
    expect(result.summary.medianEndingValue).toBe(0);
  });

  it("shows low historical success for aggressive withdrawal rates", () => {
    const result = runHistoricalSimulation({
      ...DEFAULT_INPUTS,
      years: 30,
      annualWithdrawal: 80_000,
      stockAllocation: 60,
      bondAllocation: 40,
    });

    expect(result.summary.successRate).toBeLessThanOrEqual(0.25);
    expect(result.summary.depletionRate).toBeGreaterThanOrEqual(0.75);
    expect(result.summary.medianDepletionYear).toBeLessThan(20);
  });
});
