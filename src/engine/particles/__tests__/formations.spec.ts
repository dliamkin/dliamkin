import { describe, expect, it } from "vitest";
import {
	columnCounts,
	computeFormation,
	DEFAULT_COLUMNS,
	sampleTextPoints,
	type CanvasFactory,
	type TextCanvas2D,
} from "../formations";

const WIDTH = 1280;
const HEIGHT = 800;
const N = 500;

/**
 * jsdom has no 2D canvas, so the text sampler gets a synthetic context: any
 * fillText call marks a 60×30 block of pixels "filled" for getImageData.
 * That exercises the sampling logic (grid stride, alpha threshold) without
 * depending on real font rasterization.
 */
function blockCanvasFactory(filled: boolean): CanvasFactory {
	return (width, height): TextCanvas2D => {
		const data = new Uint8ClampedArray(width * height * 4);
		return {
			font: "",
			textAlign: "",
			textBaseline: "",
			fillStyle: "",
			fillText: () => {
				if (!filled) return;
				const x0 = Math.floor(width / 2) - 30;
				const y0 = Math.floor(height / 2) - 15;
				for (let y = y0; y < y0 + 30; y++) {
					for (let x = x0; x < x0 + 60; x++) {
						data[(y * width + x) * 4 + 3] = 255;
					}
				}
			},
			getImageData: () => ({ data }),
		};
	};
}

function expectWithinBounds(targets: Float32Array, n: number): void {
	expect(targets.length).toBe(n * 2);
	for (let i = 0; i < n; i++) {
		const x = targets[i * 2]!;
		const y = targets[i * 2 + 1]!;
		expect(x).toBeGreaterThanOrEqual(-5);
		expect(x).toBeLessThanOrEqual(WIDTH + 5);
		expect(y).toBeGreaterThanOrEqual(-5);
		expect(y).toBeLessThanOrEqual(HEIGHT + 5);
	}
}

describe("computeFormation", () => {
	it("returns null for storm (flow-field physics, no targets)", () => {
		expect(computeFormation("storm", N, WIDTH, HEIGHT)).toBeNull();
	});

	it.each(["distribution", "columns", "converge"] as const)(
		"%s returns N in-bounds targets",
		(name) => {
			const targets = computeFormation(name, N, WIDTH, HEIGHT);
			expect(targets).not.toBeNull();
			expectWithinBounds(targets!, N);
		},
	);

	it("text returns N in-bounds targets clustered on sampled pixels", () => {
		const targets = computeFormation(
			"text",
			N,
			WIDTH,
			HEIGHT,
			{ text: "DLIAMKIN" },
			blockCanvasFactory(true),
		);
		expect(targets).not.toBeNull();
		expectWithinBounds(targets!, N);
		// Every target must sit on/near the synthetic 60×30 filled block.
		for (let i = 0; i < N; i++) {
			expect(Math.abs(targets![i * 2]! - WIDTH / 2)).toBeLessThanOrEqual(34);
			expect(Math.abs(targets![i * 2 + 1]! - HEIGHT / 2)).toBeLessThanOrEqual(19);
		}
	});

	it("text degrades to the converge cluster when nothing rasterizes", () => {
		const targets = computeFormation(
			"text",
			N,
			WIDTH,
			HEIGHT,
			{ text: "DLIAMKIN" },
			blockCanvasFactory(false),
		);
		expect(targets).toEqual(computeFormation("converge", N, WIDTH, HEIGHT));
	});
});

describe("sampleTextPoints", () => {
	it("produces > 0 points for a non-empty string", () => {
		const points = sampleTextPoints("HELLO", WIDTH, HEIGHT, blockCanvasFactory(true));
		expect(points.length).toBeGreaterThan(0);
		expect(points.length % 2).toBe(0);
	});

	it("produces no points for empty or whitespace text", () => {
		expect(sampleTextPoints("", WIDTH, HEIGHT, blockCanvasFactory(true)).length).toBe(0);
		expect(sampleTextPoints("   ", WIDTH, HEIGHT, blockCanvasFactory(true)).length).toBe(0);
	});

	it("clips text to 12 characters", () => {
		let rendered = "";
		const factory: CanvasFactory = (width, height) => {
			const base = blockCanvasFactory(true)(width, height)!;
			return {
				...base,
				fillText: (text: string, x: number, y: number) => {
					rendered = text;
					base.fillText(text, x, y);
				},
			};
		};
		sampleTextPoints("ABCDEFGHIJKLMNOP", WIDTH, HEIGHT, factory);
		expect(rendered).toBe("ABCDEFGHIJKL");
	});
});

describe("columnCounts", () => {
	it("distributes exactly n particles proportionally", () => {
		const counts = columnCounts(3000, DEFAULT_COLUMNS);
		expect(counts).toHaveLength(DEFAULT_COLUMNS.length);
		expect(counts.reduce((sum, c) => sum + c, 0)).toBe(3000);
		// The 0.8-fraction column gets the most particles.
		expect(Math.max(...counts)).toBe(counts[1]);
	});

	it("survives awkward n / fraction combinations", () => {
		expect(columnCounts(7, [{ fraction: 1, paletteIndex: 0 }]).reduce((a, b) => a + b)).toBe(7);
		const counts = columnCounts(
			5,
			[
				{ fraction: 0.3, paletteIndex: 0 },
				{ fraction: 0.3, paletteIndex: 1 },
				{ fraction: 0.3, paletteIndex: 2 },
			],
		);
		expect(counts.reduce((a, b) => a + b)).toBe(5);
	});
});
