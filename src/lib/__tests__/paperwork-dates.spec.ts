import { describe, expect, it } from "vitest";
import {
	addDays,
	addMonths,
	describeResolution,
	isIsoDate,
	isPast,
	resolveDate,
	todayUtcIso,
} from "../paperwork-dates";
import type { DateResolution } from "../paperwork";

// The resolve-flow's arithmetic runs here, not in the model — so these tests
// are the actual guarantee behind "computed (from your input)" dates. Month
// boundaries, year boundaries, and leap years are the cases that bite.

describe("isIsoDate", () => {
	it("accepts real dates", () => {
		expect(isIsoDate("2026-07-04")).toBe(true);
		expect(isIsoDate("2028-02-29")).toBe(true); // leap year
	});

	it("rejects impossible dates instead of rolling them over", () => {
		expect(isIsoDate("2026-02-30")).toBe(false);
		expect(isIsoDate("2027-02-29")).toBe(false); // not a leap year
		expect(isIsoDate("2026-13-01")).toBe(false);
	});

	it("rejects non-ISO shapes", () => {
		expect(isIsoDate("07/04/2026")).toBe(false);
		expect(isIsoDate("2026-7-4")).toBe(false);
		expect(isIsoDate("")).toBe(false);
	});
});

describe("addDays", () => {
	it("crosses month boundaries", () => {
		// The lease sample's headline computation: 60-day notice before Aug 31.
		expect(addDays("2027-08-31", -60)).toBe("2027-07-02");
		expect(addDays("2026-06-28", 5)).toBe("2026-07-03");
	});

	it("crosses year boundaries", () => {
		expect(addDays("2027-01-14", -30)).toBe("2026-12-15");
		expect(addDays("2026-12-20", 15)).toBe("2027-01-04");
	});

	it("handles leap years", () => {
		expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
		expect(addDays("2027-03-01", -1)).toBe("2027-02-28");
		expect(addDays("2028-01-31", 30)).toBe("2028-03-01"); // leap February
		expect(addDays("2026-01-31", 30)).toBe("2026-03-02"); // non-leap
	});

	it("throws on invalid input rather than guessing", () => {
		expect(() => addDays("2026-02-30", 1)).toThrow("Not a valid ISO date");
	});
});

describe("addMonths", () => {
	it("adds plain months", () => {
		expect(addMonths("2026-03-15", 6)).toBe("2026-09-15");
		expect(addMonths("2026-10-01", 4)).toBe("2027-02-01");
	});

	it("clamps to the target month's last day", () => {
		expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
		expect(addMonths("2028-01-31", 1)).toBe("2028-02-29"); // leap year
		expect(addMonths("2026-08-31", 6)).toBe("2027-02-28");
		expect(addMonths("2026-05-31", 1)).toBe("2026-06-30");
	});

	it("subtracts months with the same clamping", () => {
		expect(addMonths("2026-03-31", -1)).toBe("2026-02-28");
		expect(addMonths("2027-01-15", -2)).toBe("2026-11-15");
	});
});

describe("resolveDate", () => {
	const need = (partial: Partial<DateResolution>): DateResolution => ({
		anchor_label: "anchor",
		offset_days: 0,
		offset_months: 0,
		direction: "after",
		...partial,
	});

	it("applies day offsets in both directions", () => {
		expect(resolveDate("2026-08-31", need({ offset_days: 60, direction: "before" }))).toBe(
			"2026-07-02",
		);
		expect(resolveDate("2026-07-01", need({ offset_days: 30, direction: "after" }))).toBe(
			"2026-07-31",
		);
	});

	it("applies month offsets", () => {
		// The lease sample's unresolvable item: 30 days after an anniversary.
		expect(resolveDate("2026-03-01", need({ offset_months: 6 }))).toBe("2026-09-01");
		expect(
			resolveDate("2026-08-31", need({ offset_months: 6, direction: "before" })),
		).toBe("2026-02-28");
	});

	it("applies months before days", () => {
		// 1 month + 15 days after Jan 31: clamp to Feb 28, then +15 = Mar 15.
		expect(
			resolveDate("2026-01-31", need({ offset_months: 1, offset_days: 15 })),
		).toBe("2026-03-15");
	});
});

describe("isPast", () => {
	it("compares against the reference day", () => {
		expect(isPast("2026-06-30", "2026-07-01")).toBe(true);
		expect(isPast("2026-07-01", "2026-07-01")).toBe(false); // today is not past
		expect(isPast("2026-07-02", "2026-07-01")).toBe(false);
	});

	it("is false for invalid input", () => {
		expect(isPast("not-a-date", "2026-07-01")).toBe(false);
	});
});

describe("todayUtcIso", () => {
	it("formats the UTC date", () => {
		expect(todayUtcIso(new Date("2026-07-04T23:59:00Z"))).toBe("2026-07-04");
	});
});

describe("describeResolution", () => {
	it("shows the arithmetic it performed", () => {
		expect(
			describeResolution("2026-08-31", {
				anchor_label: "lease end date",
				offset_days: 60,
				offset_months: 0,
				direction: "before",
			}),
		).toBe("2026-08-31 minus 60 days = 2026-07-02");
		expect(
			describeResolution("2026-03-01", {
				anchor_label: "policy start date",
				offset_days: 0,
				offset_months: 6,
				direction: "after",
			}),
		).toBe("2026-03-01 plus 6 months = 2026-09-01");
	});
});
