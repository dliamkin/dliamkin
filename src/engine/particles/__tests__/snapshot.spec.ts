import { describe, expect, it } from "vitest";
import { BENCHMARK_MIN_FPS, meetsFpsFloor } from "../snapshot";

describe("meetsFpsFloor", () => {
	it("passes sustained 60fps frames", () => {
		const frames = Array(60).fill(16.7);
		expect(meetsFpsFloor(frames, BENCHMARK_MIN_FPS)).toBe(true);
	});

	it("fails sustained 30fps frames", () => {
		const frames = Array(60).fill(33.3);
		expect(meetsFpsFloor(frames, BENCHMARK_MIN_FPS)).toBe(false);
	});

	it("sits exactly at the floor without false negatives", () => {
		const frames = Array(60).fill(1000 / BENCHMARK_MIN_FPS);
		expect(meetsFpsFloor(frames, BENCHMARK_MIN_FPS)).toBe(true);
	});

	it("rejects degenerate inputs", () => {
		expect(meetsFpsFloor([], BENCHMARK_MIN_FPS)).toBe(false);
		expect(meetsFpsFloor([0, 0, 0], BENCHMARK_MIN_FPS)).toBe(false);
	});
});
