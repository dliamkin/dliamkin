import { describe, expect, it } from "vitest";
import { buildCdf, buildHistogram, exceedanceFromCdf, percentileSorted, Welford } from "../stats";

function sortedArray(values: number[]): Float64Array {
	return new Float64Array([...values].sort((a, b) => a - b));
}

describe("percentileSorted", () => {
	it("computes nearest-rank percentiles on 1..100", () => {
		const data = sortedArray(Array.from({ length: 100 }, (_, i) => i + 1));
		expect(percentileSorted(data, 50)).toBe(50);
		expect(percentileSorted(data, 90)).toBe(90);
		expect(percentileSorted(data, 99)).toBe(99);
		expect(percentileSorted(data, 100)).toBe(100);
		expect(percentileSorted(data, 1)).toBe(1);
	});

	it("handles tiny and single-element arrays", () => {
		expect(percentileSorted(sortedArray([7]), 50)).toBe(7);
		expect(percentileSorted(sortedArray([7]), 99)).toBe(7);
		expect(percentileSorted(sortedArray([1, 2]), 50)).toBe(1);
		expect(percentileSorted(sortedArray([1, 2]), 90)).toBe(2);
		expect(percentileSorted(new Float64Array(0), 50)).toBe(0);
	});
});

describe("buildHistogram", () => {
	it("counts sum to n and edges are monotone", () => {
		const data = sortedArray(Array.from({ length: 1000 }, (_, i) => i * 0.01));
		const hist = buildHistogram(data);
		expect(hist.counts.reduce((a, b) => a + b, 0)).toBe(1000);
		expect(hist.binEdges).toHaveLength(hist.counts.length + 1);
		for (let i = 1; i < hist.binEdges.length; i++) {
			expect(hist.binEdges[i]!).toBeGreaterThan(hist.binEdges[i - 1]!);
		}
	});

	it("clamps outliers into the last bin", () => {
		const values = Array.from({ length: 999 }, (_, i) => i * 0.001);
		values.push(1_000_000);
		const hist = buildHistogram(sortedArray(values));
		expect(hist.counts.reduce((a, b) => a + b, 0)).toBe(1000);
		// Domain must stay near the bulk of the data, not stretch to 1e6.
		expect(hist.binEdges[hist.binEdges.length - 1]!).toBeLessThan(2);
	});

	it("handles a degenerate all-equal sample", () => {
		const hist = buildHistogram(sortedArray(Array.from({ length: 50 }, () => 3.5)));
		expect(hist.counts.reduce((a, b) => a + b, 0)).toBe(50);
		expect(hist.binEdges.every((e) => Number.isFinite(e))).toBe(true);
	});
});

describe("buildCdf", () => {
	it("is monotone, ends at 1, and downsamples to ≤ maxPoints + 1", () => {
		const data = sortedArray(Array.from({ length: 5000 }, (_, i) => i));
		const cdf = buildCdf(data, 200);
		expect(cdf.x.length).toBeLessThanOrEqual(201);
		expect(cdf.y[cdf.y.length - 1]).toBe(1);
		for (let i = 1; i < cdf.y.length; i++) {
			expect(cdf.y[i]!).toBeGreaterThanOrEqual(cdf.y[i - 1]!);
			expect(cdf.x[i]!).toBeGreaterThanOrEqual(cdf.x[i - 1]!);
		}
	});
});

describe("exceedanceFromCdf", () => {
	it("interpolates P(X > v) close to the truth on a uniform sample", () => {
		const data = sortedArray(Array.from({ length: 10000 }, (_, i) => i / 10000));
		const cdf = buildCdf(data);
		expect(exceedanceFromCdf(cdf, -1)).toBe(1);
		expect(exceedanceFromCdf(cdf, 2)).toBe(0);
		expect(exceedanceFromCdf(cdf, 0.75)).toBeCloseTo(0.25, 2);
	});
});

describe("Welford", () => {
	it("matches the two-pass sample variance", () => {
		const values = [2, 4, 4, 4, 5, 5, 7, 9];
		const w = new Welford();
		values.forEach((v) => w.push(v));
		const mean = values.reduce((a, b) => a + b, 0) / values.length;
		const twoPass = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1);
		expect(w.mean).toBeCloseTo(mean, 12);
		expect(w.variance).toBeCloseTo(twoPass, 12);
	});

	it("reports zero variance for constants and short series", () => {
		const w = new Welford();
		expect(w.variance).toBe(0);
		w.push(5);
		expect(w.variance).toBe(0);
		w.push(5);
		w.push(5);
		expect(w.variance).toBe(0);
	});
});
