import { describe, expect, it } from "vitest";
import type { MeasuredFeatures } from "../audio-analysis/types";
import {
	applyDescriptionGate,
	evaluateSafetyGate,
	findDiagnosisLanguage,
	findFabricatedNumbers,
	scanForDanger,
	stripDiagnosisSentences,
	validateDescribeNoiseRequest,
	type NoiseContext,
	type NoiseDescription,
} from "../noise-translator";

function makeContext(overrides: Partial<NoiseContext> = {}): NoiseContext {
	return {
		machine_type: "clothes_dryer",
		machine_type_other: "",
		when_it_happens: "constant",
		changes_with_speed: "unsure",
		how_long: "about a week",
		recent_changes: "",
		safety_screen: "no",
		safety_screen_detail: "",
		...overrides,
	};
}

function makeFeatures(overrides: Partial<MeasuredFeatures> = {}): MeasuredFeatures {
	return {
		duration_s: 8.0,
		effective_duration_s: 7.5,
		pattern: "intermittent",
		event_rate_hz: 2.1,
		regularity: "highly_regular",
		spectral_character: "high",
		dominant_bands_hz: [3100, 180],
		pitch_trend: "steady",
		...overrides,
	};
}

function makeDescription(overrides: Partial<NoiseDescription> = {}): NoiseDescription {
	return {
		characterizations: [
			{
				descriptor: "metallic clicking",
				evidence: "sharp transients at 3.1 kHz",
				confidence: "high",
			},
		],
		conditions_summary: "The sound is constant and has been present for about a week.",
		professional_summary:
			"My dryer is making a metallic clicking at 2.1 times per second, highly regular, centered near 3100 Hz.",
		likely_questions: [
			{
				question: "Does it happen with an empty drum?",
				how_to_find_out: "Run a short empty cycle.",
			},
		],
		recording_notes: null,
		...overrides,
	};
}

describe("scanForDanger", () => {
	const dangerPhrases: [string, string][] = [
		["there is a burning smell from the dryer", "burning smell"],
		["it smells like burning plastic", "burning smell"],
		["I saw smoke coming out", "smoke"],
		["it was sparking near the outlet", "sparks"],
		["I can smell gas near the furnace", "gas odor"],
		["smells like rotten eggs in the basement", "gas odor"],
		["the brakes are grinding badly", "brake problem"],
		["brake pedal sinks to the floor", "brake problem"],
		["fuel leak under the car", "fuel leak"],
		["smells like gasoline inside", "fuel leak"],
		["the carbon monoxide alarm went off", "carbon monoxide"],
		["the wiring feels hot to the touch", "electrical heat"],
		["buzzing sound and the plug is melting", "electrical heat"],
	];

	it.each(dangerPhrases)("fires on %j", (text, label) => {
		const hits = scanForDanger(text);
		expect(hits.map((h) => h.label)).toContain(label);
	});

	const benignPhrases = [
		"the drum makes a clicking sound when it spins",
		"I replaced the gasket last month",
		"it whines when the engine is cold",
		"started after I moved the machine to the garage",
		"a rhythmic thumping about twice a second",
		"the noise gets faster when I accelerate",
		"nothing has changed recently",
	];

	it.each(benignPhrases)("stays silent on benign text %j", (text) => {
		expect(scanForDanger(text)).toEqual([]);
	});
});

describe("evaluateSafetyGate", () => {
	it("blocks on an explicit yes to the safety screen", () => {
		const result = evaluateSafetyGate(makeContext({ safety_screen: "yes" }));
		expect(result.blocked).toBe(true);
		expect(result.reasons.length).toBeGreaterThan(0);
	});

	it("blocks on a danger phrase in a free-text answer", () => {
		const result = evaluateSafetyGate(
			makeContext({ recent_changes: "started right after I noticed a burning smell" }),
		);
		expect(result.blocked).toBe(true);
		expect(result.reasons.some((r) => r.includes("burning smell"))).toBe(true);
	});

	it("passes a fully benign context", () => {
		expect(evaluateSafetyGate(makeContext()).blocked).toBe(false);
	});
});

describe("findDiagnosisLanguage / stripDiagnosisSentences", () => {
	const diagnosisSentences = [
		"The cause is a worn drum bearing.",
		"You need to replace the belt.",
		"It's probably the bearings.",
		"This means your compressor is failing.",
		"It sounds like a loose pulley.",
		"The idler pulley is worn.",
	];

	it.each(diagnosisSentences)("flags %j", (sentence) => {
		expect(findDiagnosisLanguage(sentence)).toBe(true);
	});

	const descriptiveSentences = [
		"The clicking repeats 2.1 times per second and is highly regular.",
		"The sound is brightest near 3 kHz with a metallic character.",
		"It only happens when the drum is turning under load.",
		"A professional will want to know whether it changes with speed.",
	];

	it.each(descriptiveSentences)("passes descriptive text %j", (sentence) => {
		expect(findDiagnosisLanguage(sentence)).toBe(false);
	});

	it("questions may name parts but not make causal claims", () => {
		expect(findDiagnosisLanguage("When were the brake pads last replaced?", false)).toBe(false);
		expect(findDiagnosisLanguage("The cause is the brake pads.", false)).toBe(true);
	});

	it("strips only the offending sentence", () => {
		const { text, removed } = stripDiagnosisSentences(
			"The clicking is highly regular. It's probably the bearings. It is present only under load.",
			"professional_summary",
		);
		expect(text).toBe("The clicking is highly regular. It is present only under load.");
		expect(removed).toHaveLength(1);
		expect(removed[0]?.sentence).toContain("bearings");
	});
});

describe("findFabricatedNumbers", () => {
	const features = makeFeatures();

	it("accepts numbers that match the measurements within rounding", () => {
		expect(
			findFabricatedNumbers(
				"It clicks about 2.1 times per second, near 3100 Hz (about 3.1 kHz), over the 8 second clip.",
				features,
			),
		).toEqual([]);
	});

	it("flags a fabricated rate", () => {
		const offending = findFabricatedNumbers("It clicks about 5 times per second.", features);
		expect(offending).toHaveLength(1);
	});

	it("flags a fabricated frequency", () => {
		const offending = findFabricatedNumbers("The whine sits at 7.5 kHz.", features);
		expect(offending).toHaveLength(1);
	});

	it("ignores unitless numbers", () => {
		expect(findFabricatedNumbers("I noticed it 3 days ago in bay 12.", features)).toEqual([]);
	});
});

describe("applyDescriptionGate", () => {
	it("passes a clean description through unchanged", () => {
		const description = makeDescription();
		const result = applyDescriptionGate(description, makeFeatures());
		expect(result.stripped).toEqual([]);
		expect(result.description).toEqual(description);
	});

	it("strips a planted diagnosis sentence and reports it", () => {
		const result = applyDescriptionGate(
			makeDescription({
				professional_summary:
					"My dryer clicks 2.1 times per second. It's probably the drum bearing. The clicking is highly regular.",
			}),
			makeFeatures(),
		);
		expect(result.description.professional_summary).not.toContain("bearing");
		expect(result.description.professional_summary).toContain("highly regular");
		expect(result.stripped).toHaveLength(1);
	});

	it("strips a summary sentence with a fabricated measured number", () => {
		const result = applyDescriptionGate(
			makeDescription({
				professional_summary:
					"My dryer clicks about 6 times per second. The sound is brightest near 3100 Hz.",
			}),
			makeFeatures(),
		);
		expect(result.description.professional_summary).not.toContain("6 times per second");
		expect(result.stripped.some((s) => s.includes("measured-number"))).toBe(true);
	});

	it("drops a characterization that names a culprit part", () => {
		const result = applyDescriptionGate(
			makeDescription({
				characterizations: [
					{
						descriptor: "worn bearing noise",
						evidence: "high-frequency transients",
						confidence: "medium",
					},
					{
						descriptor: "metallic clicking",
						evidence: "sharp transients",
						confidence: "high",
					},
				],
			}),
			makeFeatures(),
		);
		expect(result.description.characterizations).toHaveLength(1);
		expect(result.description.characterizations[0]?.descriptor).toBe("metallic clicking");
	});

	it("keeps questions that name parts but drops causal-claim questions", () => {
		const result = applyDescriptionGate(
			makeDescription({
				likely_questions: [
					{
						question: "When were the brake pads last replaced?",
						how_to_find_out: "Check service records.",
					},
					{ question: "Did you know the cause is a worn belt?", how_to_find_out: "n/a" },
				],
			}),
			makeFeatures(),
		);
		expect(result.description.likely_questions).toHaveLength(1);
		expect(result.description.likely_questions[0]?.question).toContain("brake pads");
	});
});

describe("validateDescribeNoiseRequest", () => {
	const validBody = () => ({
		spectrogramPngBase64: "aGVsbG8=",
		features: makeFeatures(),
		context: makeContext(),
	});

	it("accepts a valid body", () => {
		const result = validateDescribeNoiseRequest(validBody());
		expect(typeof result).not.toBe("string");
	});

	it("rejects a missing spectrogram", () => {
		const body = { ...validBody(), spectrogramPngBase64: "" };
		expect(typeof validateDescribeNoiseRequest(body)).toBe("string");
	});

	it("rejects invalid base64", () => {
		const body = { ...validBody(), spectrogramPngBase64: "not base64!!" };
		expect(typeof validateDescribeNoiseRequest(body)).toBe("string");
	});

	it("rejects malformed features", () => {
		const body = { ...validBody(), features: { ...makeFeatures(), pattern: "sometimes" } };
		expect(typeof validateDescribeNoiseRequest(body)).toBe("string");
	});

	it("rejects an oversized context field", () => {
		const body = { ...validBody(), context: makeContext({ recent_changes: "x".repeat(600) }) };
		expect(typeof validateDescribeNoiseRequest(body)).toBe("string");
	});
});
