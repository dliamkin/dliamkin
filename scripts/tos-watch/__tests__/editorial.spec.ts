import { describe, expect, it } from "vitest";
import { countWords, truncateExcerpt, type TosChangeReport } from "../../../src/lib/tos-watch";
import { applyEditorialGate } from "../editorial";

const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i + 1}`).join(" ");

const reportWith = (overrides: Partial<TosChangeReport["changes"][number]>): TosChangeReport => ({
	substantive: true,
	cosmetic_note: null,
	summary: "The dispute resolution section changed.",
	changes: [
		{
			title: "Arbitration clause added",
			category: "arbitration_and_disputes",
			new_excerpt: "all disputes shall be resolved by binding arbitration",
			old_excerpt: null,
			explanation: "The revised terms require arbitration for disputes.",
			practical_effect: "Users can no longer bring disputes in court.",
			impact: "favors_provider",
			severity: "high",
			...overrides,
		},
	],
});

describe("truncateExcerpt", () => {
	it("leaves excerpts at or under the cap untouched", () => {
		expect(truncateExcerpt(words(25))).toBe(words(25));
	});

	it("hard-truncates over-cap excerpts to 25 words with an ellipsis", () => {
		const truncated = truncateExcerpt(words(40));
		expect(truncated).toBe(words(25) + "…");
		expect(countWords(truncated.replace("…", ""))).toBe(25);
	});
});

describe("applyEditorialGate", () => {
	// The adversarial case from the spec: a 40-word excerpt containing
	// "sneakily" must trip BOTH guards.
	it("truncates the excerpt and flags loaded language on adversarial output", () => {
		const adversarial = reportWith({
			new_excerpt: words(40),
			explanation: "The provider sneakily added an arbitration requirement.",
		});
		const { report, violations } = applyEditorialGate(adversarial);
		expect(report.changes[0]!.new_excerpt).toBe(words(25) + "…");
		expect(violations).toHaveLength(1);
		expect(violations[0]).toMatchObject({ field: "changes[0].explanation", term: "sneakily" });
	});

	it("passes clean neutral output with no violations", () => {
		const { report, violations } = applyEditorialGate(reportWith({}));
		expect(violations).toEqual([]);
		expect(report.changes[0]!.new_excerpt).toBe(
			"all disputes shall be resolved by binding arbitration",
		);
	});

	it("truncates old_excerpt too and preserves null", () => {
		const { report } = applyEditorialGate(reportWith({ old_excerpt: words(30) }));
		expect(report.changes[0]!.old_excerpt).toBe(words(25) + "…");
		expect(applyEditorialGate(reportWith({})).report.changes[0]!.old_excerpt).toBeNull();
	});

	it("does not flag loaded words inside excerpts (verbatim document quotes)", () => {
		const { violations } = applyEditorialGate(
			reportWith({ new_excerpt: "content buried in archived folders may be deleted" }),
		);
		expect(violations).toEqual([]);
	});

	it("catches multi-word phrases and the scheme/trick word-boundary cases", () => {
		const flagged = applyEditorialGate(
			reportWith({ explanation: "This term was slipped in between unrelated clauses." }),
		);
		expect(flagged.violations.map((v) => v.term)).toContain("slipped in");

		const clean = applyEditorialGate(
			reportWith({ explanation: "Access to restricted areas now requires approval." }),
		);
		expect(clean.violations).toEqual([]);
	});
});
