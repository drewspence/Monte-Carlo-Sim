import { describe, expect, it } from "vitest";
import { monthlyReturns } from "./monthlyReturns";
import {
  annualPercentToDecimal,
  annualToMonthlyRate,
  annualToMonthlyWithdrawal,
  runHistoricalBootstrapSimulation,
} from "./historicalBootstrap";
import { DEFAULT_INPUTS } from "./historicalAnalysis";

describe("monthly returns dataset", () => {
  it("is sorted ascending and uses decimal returns", () => {
    expect(monthlyReturns.length).toBeGreaterThan(600);
    for (let index = 1; index < monthlyReturns.length; index += 1) {
      expect(monthlyReturns[index - 1].date < monthlyReturns[index].date).toBe(true);
    }

    const sample = monthlyReturns.find((entry) => entry.date === "1962-02");
    expect(sample).toBeDefined();
    expect(sample?.stocks).toBeCloseTo(0.0201, 6);
    expect(sample?.stocks).toBeLessThan(1);
    expect(sample?.bonds).toBeLessThan(1);
  });
});

describe("bootstrap conversion helpers", () => {
  it("converts percentages and annual rates correctly", () => {
    expect(annualPercentToDecimal(3)).toBeCloseTo(0.03, 10);
    expect(annualToMonthlyWithdrawal(12_000)).toBe(1_000);
    expect((1 + annualToMonthlyRate(3)) ** 12 - 1).toBeCloseTo(0.03, 10);
    expect((1 + annualToMonthlyRate(0.25)) ** 12 - 1).toBeCloseTo(0.0025, 10);
  });
});

describe("runHistoricalBootstrapSimulation", () => {
  it("returns consistent output and chart-integrity metrics", () => {
    const result = runHistoricalBootstrapSimulation({
      ...DEFAULT_INPUTS,
      simulations: 500,
      rebalanceFrequencyMonths: 12,
    });

    expect(result.summary.successProbability + result.summary.depletionProbability).toBeCloseTo(1, 10);
    expect(result.summary.p50EndingValue).toBeCloseTo(result.summary.medianEndingValue, 8);
    expect(result.months.length).toBe(30 * 12 + 1);
    expect(result.percentilePaths.p10.length).toBe(result.months.length);
    expect(result.percentilePaths.p50.length).toBe(result.months.length);
    expect(result.percentilePaths.p90.length).toBe(result.months.length);
    expect(result.endingValueHistogram.reduce((sum, bin) => sum + bin.count, 0)).toBe(result.summary.simulationsRun);
  });

  it("marks depletion immediately when monthly withdrawal exceeds balance", () => {
    const result = runHistoricalBootstrapSimulation(
      {
        ...DEFAULT_INPUTS,
        years: 20,
        startingBalance: 100,
        annualWithdrawal: 2_000,
        inflationRate: 0,
        feeDrag: 0,
        stockAllocation: 100,
        bondAllocation: 0,
        simulations: 200,
        rebalanceFrequencyMonths: 12,
      },
      () => 0,
    );

    expect(result.summary.successProbability).toBe(0);
    expect(result.summary.depletionProbability).toBe(1);
    expect(result.summary.medianDepletionMonth).toBe(1);
    expect(result.summary.medianDepletionYear).toBeCloseTo(1 / 12, 8);
    expect(result.summary.medianEndingValue).toBe(0);
  });

  it("does not break rolling historical mode assumptions", () => {
    const bootstrap = runHistoricalBootstrapSimulation({
      ...DEFAULT_INPUTS,
      simulations: 300,
      rebalanceFrequencyMonths: 12,
    });
    expect(bootstrap.summary.simulationsRun).toBe(300);
    expect(bootstrap.summary.p10EndingValue).toBeLessThanOrEqual(bootstrap.summary.p50EndingValue);
    expect(bootstrap.summary.p50EndingValue).toBeLessThanOrEqual(bootstrap.summary.p90EndingValue);
  });
});
