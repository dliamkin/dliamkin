import { describe, expect, it } from "vitest";
import { runSimulation } from "../monteCarlo";
import { mulberry32 } from "../prng";
import { TAIL_RISK_PRESETS } from "../presets";
import {
	defaultPolicy,
	TAIL_RISK_PRICING,
	type Policy,
	type Scenario,
	type SimulationSummary,
	type StepParams,
} from "../types";

function makeStep(overrides: Partial<StepParams> = {}): StepParams {
	return {
		id: "step-1",
		label: "Step",
		inputTokensK: [10, 20],
		outputTokensK: [2, 4],
		loopRisk: 0.3,
		loopDecay: 0.82,
		retryContextGrowth: 0.3,
		...overrides,
	};
}

function makeScenario(steps: StepParams[]): Scenario {
	return { id: "test", name: "Test", steps, targetModel: "opus" };
}

function policyWith(overrides: Partial<Policy> = {}): Policy {
	return { ...defaultPolicy(), ...overrides };
}

/** elapsedMs is wall-clock and legitimately differs run to run. */
function stripElapsed(summary: SimulationSummary): Omit<SimulationSummary, "elapsedMs"> {
	const { elapsedMs: _elapsedMs, ...rest } = summary;
	return rest;
}

describe("mulberry32", () => {
	it("is deterministic per seed and emits values in [0, 1)", () => {
		const a = mulberry32(123);
		const b = mulberry32(123);
		const c = mulberry32(124);
		const seqA = Array.from({ length: 100 }, () => a());
		const seqB = Array.from({ length: 100 }, () => b());
		const seqC = Array.from({ length: 100 }, () => c());
		expect(seqA).toEqual(seqB);
		expect(seqA).not.toEqual(seqC);
		expect(seqA.every((v) => v >= 0 && v < 1)).toBe(true);
	});
});

describe("runSimulation", () => {
	it("is reproducible: same seed ⇒ identical summary", () => {
		const preset = TAIL_RISK_PRESETS[0]!;
		const policy = policyWith({ seed: 777 });
		const first = runSimulation(preset, policy, TAIL_RISK_PRICING);
		const second = runSimulation(preset, policy, TAIL_RISK_PRICING);
		expect(stripElapsed(first)).toEqual(stripElapsed(second));
	});

	it("differs across seeds", () => {
		const preset = TAIL_RISK_PRESETS[0]!;
		const a = runSimulation(preset, policyWith({ seed: 1 }), TAIL_RISK_PRICING);
		const b = runSimulation(preset, policyWith({ seed: 2 }), TAIL_RISK_PRICING);
		expect(a.p50).not.toBe(b.p50);
	});

	it("variance shares sum to ~1 and cover every step", () => {
		for (const preset of TAIL_RISK_PRESETS) {
			const summary = runSimulation(preset, policyWith(), TAIL_RISK_PRICING);
			const total = summary.varianceShare.reduce((sum, s) => sum + s.share, 0);
			expect(total).toBeCloseTo(1, 9);
			expect(summary.varianceShare.map((s) => s.stepId)).toEqual(
				preset.steps.map((s) => s.id),
			);
		}
	});

	it("retry cap monotonically reduces P99 across seeds", () => {
		const preset = TAIL_RISK_PRESETS[0]!;
		for (const seed of [11, 42, 1234, 98765]) {
			let previous = Infinity;
			for (const retryCap of [10, 4, 2, 1]) {
				const summary = runSimulation(
					preset,
					policyWith({ seed, retryCap }),
					TAIL_RISK_PRICING,
				);
				expect(summary.p99).toBeLessThanOrEqual(previous);
				previous = summary.p99;
			}
		}
	});

	it("is degenerate-deterministic when lo == hi and loopRisk = 0", () => {
		const step = makeStep({
			inputTokensK: [10, 10],
			outputTokensK: [2, 2],
			loopRisk: 0,
		});
		const summary = runSimulation(
			makeScenario([step]),
			policyWith({ trials: 1000 }),
			TAIL_RISK_PRICING,
		);
		// 10K input · $0.005/K + 2K output · $0.025/K = $0.10 every trial.
		expect(summary.p50).toBeCloseTo(0.1, 9);
		expect(summary.p99).toBeCloseTo(0.1, 9);
		expect(summary.mean).toBeCloseTo(0.1, 9);
		expect(summary.varianceShare[0]?.share).toBe(0);
	});

	it("applies the output token cap", () => {
		const step = makeStep({ outputTokensK: [100, 100], loopRisk: 0 });
		const uncapped = runSimulation(makeScenario([step]), policyWith(), TAIL_RISK_PRICING);
		const capped = runSimulation(
			makeScenario([step]),
			policyWith({ outputTokenCapK: 10 }),
			TAIL_RISK_PRICING,
		);
		// Output cost drops from 100K·$0.025 to 10K·$0.025 ⇒ $2.25 cheaper.
		expect(uncapped.p50 - capped.p50).toBeCloseTo(2.25, 9);
	});

	it("computes probOverBudget consistently with percentiles", () => {
		const preset = TAIL_RISK_PRESETS[0]!;
		const base = runSimulation(preset, policyWith(), TAIL_RISK_PRICING);
		const atP90 = runSimulation(preset, policyWith({ budgetUsd: base.p90 }), TAIL_RISK_PRICING);
		expect(atP90.probOverBudget).toBeGreaterThan(0.05);
		expect(atP90.probOverBudget).toBeLessThanOrEqual(0.1);
		const impossible = runSimulation(preset, policyWith({ budgetUsd: 1e9 }), TAIL_RISK_PRICING);
		expect(impossible.probOverBudget).toBe(0);
	});

	it("handles 1-step and 12-step scenarios", () => {
		const one = runSimulation(makeScenario([makeStep()]), policyWith(), TAIL_RISK_PRICING);
		expect(one.varianceShare).toHaveLength(1);
		expect(one.varianceShare[0]?.share).toBeCloseTo(1, 9);

		const twelve = makeScenario(
			Array.from({ length: 12 }, (_, i) => makeStep({ id: `step-${i}` })),
		);
		const summary = runSimulation(twelve, policyWith(), TAIL_RISK_PRICING);
		expect(summary.varianceShare).toHaveLength(12);
		expect(summary.p99).toBeGreaterThan(summary.p50);
	});

	it("survives hostile params: inverted ranges and risk 1 with decay 1", () => {
		const hostile = makeStep({
			inputTokensK: [40, 20],
			outputTokensK: [4, 2],
			loopRisk: 1,
			loopDecay: 1,
		});
		const summary = runSimulation(
			makeScenario([hostile]),
			policyWith({ trials: 1000 }),
			TAIL_RISK_PRICING,
		);
		expect(Number.isFinite(summary.p99)).toBe(true);
		expect(summary.p99).toBeGreaterThan(0);
	});

	it("keeps preset 1's story: fat tail uncapped, amputated by retryCap 2", () => {
		const preset = TAIL_RISK_PRESETS[0]!;
		const uncapped = runSimulation(preset, policyWith(), TAIL_RISK_PRICING);
		const capped = runSimulation(preset, policyWith({ retryCap: 2 }), TAIL_RISK_PRICING);
		expect(uncapped.p50).toBeGreaterThan(1.5);
		expect(uncapped.p50).toBeLessThan(3.5);
		expect(uncapped.p99).toBeGreaterThanOrEqual(uncapped.p50 * 4);
		// The knob's promise: P99 cut by >50%, P50 moved by <10%.
		expect(capped.p99).toBeLessThan(uncapped.p99 * 0.5);
		expect(Math.abs(capped.p50 - uncapped.p50) / uncapped.p50).toBeLessThan(0.1);
	});
});
