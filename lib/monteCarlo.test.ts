import { describe, expect, it } from "vitest";
import {
  DEFAULT_INPUTS,
  normalizeAllocation,
  runMonteCarloSimulation,
  validateInputs,
} from "./monteCarlo";

describe("normalizeAllocation", () => {
  it("normalizes to 100 with one decimal place", () => {
    const normalized = normalizeAllocation({ usStocks: 33, intlStocks: 33, usBonds: 33, cash: 33 });
    const total = Object.values(normalized).reduce((sum, value) => sum + value, 0);

    expect(total).toBeCloseTo(100, 5);
    for (const value of Object.values(normalized)) {
      expect(Number.isInteger(value * 10)).toBe(true);
    }
  });
});

describe("validateInputs", () => {
  it("returns errors for invalid ranges and allocation mismatch", () => {
    const errors = validateInputs({
      ...DEFAULT_INPUTS,
      years: 0,
      withdrawalPercent: 120,
      volatility: 0,
      allocation: { usStocks: 80, intlStocks: 20, usBonds: 10, cash: 10 },
    });

    expect(errors.years).toBeTruthy();
    expect(errors.withdrawalPercent).toBeTruthy();
    expect(errors.volatility).toBeTruthy();
    expect(errors.allocationTotal).toBeTruthy();
  });
});

describe("runMonteCarloSimulation", () => {
  it("uses floor-based success for fixed percentage mode and null depletion median", () => {
    const result = runMonteCarloSimulation({
      ...DEFAULT_INPUTS,
      trials: 300,
      years: 15,
      withdrawalMode: "fixedPercent",
      withdrawalPercent: 4,
    });

    expect(result.summary.successLabel).toContain("Floor");
    expect(result.summary.medianDepletionYear).toBeNull();
    expect(result.summary.fixedPercentWithdrawalFloor).toBeCloseTo(40_000, 5);
    expect(result.endingValueHistogram.reduce((sum, bin) => sum + bin.count, 0)).toBe(300);
  });

  it("keeps depletion-year metric for fixed dollar mode", () => {
    const result = runMonteCarloSimulation({
      ...DEFAULT_INPUTS,
      trials: 300,
      years: 20,
      withdrawalMode: "fixedDollar",
      annualWithdrawal: 150_000,
    });

    expect(result.summary.successLabel).toBe("Success Probability");
    expect(result.summary.medianDepletionYear === null || result.summary.medianDepletionYear > 0).toBe(true);
    expect(result.endingValueHistogram.length).toBeGreaterThanOrEqual(10);
    expect(result.endingValueHistogram.length).toBeLessThanOrEqual(20);
    expect(result.endingValueHistogram.reduce((sum, bin) => sum + bin.count, 0)).toBe(300);
  });
});
