import { describe, expect, it } from "vitest";
import {
	ANALYSIS_SAMPLE_RATE,
	preprocessAudio,
	resampleLinear,
	toMono,
	trimSilence,
} from "../preprocess";
import { measureFeatures } from "../features";
import { magnitudeSpectrum } from "../fft";
import { colormap, computeSpectrogram, SPECTROGRAM_MAX_HZ } from "../spectrogram";
import {
	amplitudeWobble,
	clickTrain,
	lowNoise,
	mix,
	poissonClicks,
	sine,
	whiteNoise,
} from "../synth";

const SR = ANALYSIS_SAMPLE_RATE;

/** Run the real production chain: preprocess → measure. */
function analyze(signal: Float32Array, sampleRate = SR) {
	const pre = preprocessAudio([signal], sampleRate);
	return measureFeatures(pre.pcm, pre.sampleRate, pre.clippingRatio, pre.peakDb);
}

describe("fft/magnitudeSpectrum", () => {
	it("peaks at the bin of a pure tone", () => {
		// Bin-aligned frequency: bin 100 of a 1024-point FFT at 22.05 kHz.
		const freq = (100 * SR) / 1024;
		const tone = sine(freq, 0.1, SR, 0.8);
		const mags = magnitudeSpectrum(tone.subarray(0, 1024), 1024);
		let bestBin = 0;
		for (let b = 1; b < mags.length; b++) {
			if ((mags[b] ?? 0) > (mags[bestBin] ?? 0)) bestBin = b;
		}
		expect(bestBin).toBe(100);
	});
});

describe("preprocess", () => {
	it("averages channels to mono", () => {
		const left = new Float32Array([1, 1, 1]);
		const right = new Float32Array([0, 0, 0]);
		expect(Array.from(toMono([left, right]))).toEqual([0.5, 0.5, 0.5]);
	});

	it("resamples to the expected length", () => {
		const input = sine(440, 1, 44100, 0.5);
		const out = resampleLinear(input, 44100, SR);
		expect(Math.abs(out.length - SR)).toBeLessThanOrEqual(1);
	});

	it("trims leading and trailing silence but keeps the sound", () => {
		const pad = new Float32Array(SR); // 1 s of silence
		const tone = sine(1000, 1, SR, 0.8);
		const padded = new Float32Array(pad.length * 2 + tone.length);
		padded.set(tone, pad.length);
		const trimmed = trimSilence(padded, SR);
		// Kept the tone plus at most the 100 ms margins.
		expect(trimmed.length).toBeGreaterThanOrEqual(tone.length);
		expect(trimmed.length).toBeLessThanOrEqual(tone.length + Math.round(SR * 0.25));
	});
});

describe("measureFeatures: click trains (the crown-jewel rate measurement)", () => {
	it("detects a 3.0/sec click train within ±10%", () => {
		const { features } = analyze(clickTrain(3.0, 6, SR));
		expect(features.pattern).toBe("intermittent");
		expect(features.event_rate_hz).not.toBeNull();
		expect(features.event_rate_hz ?? 0).toBeGreaterThanOrEqual(2.7);
		expect(features.event_rate_hz ?? 0).toBeLessThanOrEqual(3.3);
		expect(features.regularity).toBe("highly_regular");
	});

	it("detects a 2.0/sec click train over a low noise bed (dryer-like)", () => {
		const signal = mix(clickTrain(2.0, 8, SR, { amplitude: 0.8 }), lowNoise(8, SR, 150, 0.15));
		const { features } = analyze(signal);
		expect(features.pattern).toBe("intermittent");
		expect(features.event_rate_hz ?? 0).toBeGreaterThanOrEqual(1.8);
		expect(features.event_rate_hz ?? 0).toBeLessThanOrEqual(2.2);
		expect(features.regularity).toBe("highly_regular");
	});

	it("classifies Poisson-timed clicks as erratic", () => {
		const { features } = analyze(poissonClicks(2.5, 8, SR, 42));
		expect(features.pattern).toBe("intermittent");
		expect(features.regularity).not.toBe("highly_regular");
	});
});

describe("measureFeatures: tonal and noise sounds", () => {
	it("classifies a 4 kHz sine as continuous, high, with the right dominant band", () => {
		const { features } = analyze(sine(4000, 5, SR, 0.6));
		expect(features.pattern).toBe("continuous");
		expect(features.event_rate_hz).toBeNull();
		expect(features.spectral_character).toBe("high");
		const top = features.dominant_bands_hz[0] ?? 0;
		expect(Math.abs(top - 4000)).toBeLessThanOrEqual(4000 * 0.05);
		expect(features.pitch_trend).toBe("steady");
	});

	it("classifies a wobbling 3.8 kHz whine over faint rumble as continuous and high", () => {
		const whine = amplitudeWobble(sine(3800, 6, SR, 0.6), 1.5, 0.25, SR);
		const { features } = analyze(mix(whine, lowNoise(6, SR, 120, 0.08)));
		expect(features.pattern).toBe("continuous");
		expect(features.spectral_character).toBe("high");
		expect(Math.abs((features.dominant_bands_hz[0] ?? 0) - 3800)).toBeLessThanOrEqual(
			3800 * 0.05,
		);
	});

	it("classifies white noise as continuous broadband", () => {
		const { features } = analyze(whiteNoise(5, SR, 0.5, 7));
		expect(features.pattern).toBe("continuous");
		expect(features.event_rate_hz).toBeNull();
		expect(features.spectral_character).toBe("broadband");
	});

	it("detects a rising pitch trend on a sweep", () => {
		// Linear chirp 500 Hz → 4 kHz over 5 s, phase-continuous.
		const n = SR * 5;
		const chirp = new Float32Array(n);
		let phase = 0;
		for (let i = 0; i < n; i++) {
			const freq = 500 + (3500 * i) / n;
			phase += (2 * Math.PI * freq) / SR;
			chirp[i] = 0.6 * Math.sin(phase);
		}
		const { features } = analyze(chirp);
		expect(features.pitch_trend).toBe("rising");
	});
});

describe("quality gates", () => {
	it("flags a clipped recording", () => {
		const loud = sine(800, 3, SR, 1.6);
		for (let i = 0; i < loud.length; i++) {
			loud[i] = Math.max(-1, Math.min(1, loud[i] ?? 0));
		}
		const { quality } = analyze(loud);
		expect(quality.clipping_ratio).toBeGreaterThan(0.01);
		expect(quality.issues).toContain("clipped");
	});

	it("flags a near-silent recording", () => {
		const { quality } = analyze(sine(500, 3, SR, 0.005));
		expect(quality.issues).toContain("near_silent");
	});

	it("flags a too-short recording", () => {
		const { quality } = analyze(sine(500, 0.4, SR, 0.6));
		expect(quality.issues).toContain("too_short");
	});

	it("passes a clean recording with no issues", () => {
		const { quality } = analyze(clickTrain(2, 5, SR, { amplitude: 0.7 }));
		expect(quality.issues).toEqual([]);
	});
});

describe("spectrogram", () => {
	it("computes a spectrogram sized to the clip", () => {
		const spec = computeSpectrogram(sine(1000, 3, SR, 0.6), SR);
		expect(spec.frames).toBeGreaterThan(100);
		expect(spec.bins).toBe(513);
		expect(spec.durationS).toBeCloseTo(3, 1);
		expect(spec.binHz * (spec.bins - 1)).toBeGreaterThanOrEqual(SPECTROGRAM_MAX_HZ);
	});

	it("puts the energy of a tone in the right bin", () => {
		const freq = 2000;
		const spec = computeSpectrogram(sine(freq, 3, SR, 0.6), SR);
		const midFrame = Math.floor(spec.frames / 2);
		let bestBin = 0;
		for (let b = 0; b < spec.bins; b++) {
			if (
				(spec.db[midFrame * spec.bins + b] ?? -160) >
				(spec.db[midFrame * spec.bins + bestBin] ?? -160)
			) {
				bestBin = b;
			}
		}
		expect(Math.abs(bestBin * spec.binHz - freq)).toBeLessThanOrEqual(spec.binHz * 2);
	});

	it("colormap endpoints are dark-to-light", () => {
		const [r0, g0, b0] = colormap(0);
		const [r1, g1, b1] = colormap(1);
		expect(r0 + g0 + b0).toBeLessThan(30);
		expect(r1 + g1 + b1).toBeGreaterThan(500);
	});
});

describe("preprocessAudio clipping measurement", () => {
	it("measures clipping before normalization", () => {
		// Quiet signal: normalization must not create fake clipping.
		const quiet = sine(700, 2, SR, 0.2);
		const pre = preprocessAudio([quiet], SR);
		expect(pre.clippingRatio).toBe(0);
		expect(Math.max(...Array.from(pre.pcm).map(Math.abs))).toBeGreaterThan(0.9);
	});
});
