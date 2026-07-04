import { describe, expect, it } from "vitest";
import {
	computeChangedBlocks,
	formatChangedBlocks,
	splitIntoBlocks,
} from "../lease-mechanical-diff";

describe("splitIntoBlocks", () => {
	it("splits on blank lines", () => {
		expect(splitIntoBlocks("First clause.\n\nSecond clause.")).toEqual([
			"First clause.",
			"Second clause.",
		]);
	});

	it("splits on numbered clause boundaries", () => {
		expect(splitIntoBlocks("1. RENT. Rent is $1,450.\n2. TERM. Twelve months.")).toEqual([
			"1. RENT. Rent is $1,450.",
			"2. TERM. Twelve months.",
		]);
	});

	it("normalizes internal whitespace so reflowed text is not a change", () => {
		const reflowed = splitIntoBlocks("Rent is\n$1,450 per month.");
		const flat = splitIntoBlocks("Rent is $1,450 per month.");
		expect(reflowed).toEqual(flat);
	});

	it("drops empty blocks", () => {
		expect(splitIntoBlocks("\n\n  \n\nOnly clause.\n\n")).toEqual(["Only clause."]);
	});
});

describe("computeChangedBlocks", () => {
	const original = "1. RENT. Rent is $1,450.\n\n2. TERM. Twelve months.\n\n3. PETS. No pets.";

	it("returns nothing for identical documents", () => {
		expect(computeChangedBlocks(original, original)).toEqual([]);
	});

	it("pairs a replaced block as a modification", () => {
		const revised = original.replace("$1,450", "$1,595");
		expect(computeChangedBlocks(original, revised)).toEqual([
			{
				kind: "modified",
				original: "1. RENT. Rent is $1,450.",
				revised: "1. RENT. Rent is $1,595.",
			},
		]);
	});

	it("reports pure additions and removals", () => {
		const revised =
			"1. RENT. Rent is $1,450.\n\n2. TERM. Twelve months.\n\n4. LAWN. Tenant mows.";
		expect(computeChangedBlocks(original, revised)).toEqual([
			{ kind: "modified", original: "3. PETS. No pets.", revised: "4. LAWN. Tenant mows." },
		]);

		const added = `${original}\n\n4. LAWN. Tenant mows.`;
		expect(computeChangedBlocks(original, added)).toEqual([
			{ kind: "added", original: null, revised: "4. LAWN. Tenant mows." },
		]);

		const removed = "1. RENT. Rent is $1,450.\n\n2. TERM. Twelve months.";
		expect(computeChangedBlocks(original, removed)).toEqual([
			{ kind: "removed", original: "3. PETS. No pets.", revised: null },
		]);
	});

	it("pairs uneven modified runs without dropping blocks", () => {
		const revised =
			"1. RENT. Rent is $1,595.\n\n1a. PET FEE. $35 per month.\n\n2. TERM. Twelve months.\n\n3. PETS. No pets.";
		const blocks = computeChangedBlocks(original, revised);
		expect(blocks).toHaveLength(2);
		expect(blocks[0]).toEqual({
			kind: "modified",
			original: "1. RENT. Rent is $1,450.",
			revised: "1. RENT. Rent is $1,595.",
		});
		expect(blocks[1]).toEqual({
			kind: "modified",
			original: null,
			revised: "1a. PET FEE. $35 per month.",
		});
	});
});

describe("formatChangedBlocks", () => {
	it("renders a readable numbered list", () => {
		const text = formatChangedBlocks([
			{ kind: "modified", original: "Rent is $1,450.", revised: "Rent is $1,595." },
			{ kind: "added", original: null, revised: "Pet fee: $35/month." },
		]);
		expect(text).toBe(
			"[1] MODIFIED\n  original: Rent is $1,450.\n  revised: Rent is $1,595.\n" +
				"[2] ADDED\n  revised: Pet fee: $35/month.",
		);
	});

	it("says so when nothing changed", () => {
		expect(formatChangedBlocks([])).toMatch(/no changed blocks/i);
	});
});
