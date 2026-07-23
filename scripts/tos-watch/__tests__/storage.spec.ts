import { mkdtemp, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { ChangelogEntry } from "../../../src/lib/tos-watch";
import { docSlug, HISTORY_KEEP, readLatestSnapshot, writeSnapshot } from "../snapshots";
import { splitAtCap } from "../state";

const entry = (id: string): ChangelogEntry => ({
	id,
	service_id: "acmecloud",
	service_name: "Acmecloud",
	document_label: "Terms of Service",
	document_url: "https://example.com/terms",
	detected_at: "2026-07-18",
	report: { substantive: true, cosmetic_note: null, changes: [], summary: "s" },
	model: "m",
	pipeline_version: "1",
});

describe("splitAtCap", () => {
	it("prepends new entries newest-first with no overflow under the cap", () => {
		const { kept, overflow } = splitAtCap([entry("new")], [entry("old")], 500);
		expect(kept.map((e) => e.id)).toEqual(["new", "old"]);
		expect(overflow).toEqual([]);
	});

	it("overflows the oldest entries past the cap", () => {
		const current = [entry("a"), entry("b"), entry("c")];
		const { kept, overflow } = splitAtCap([entry("new")], current, 3);
		expect(kept.map((e) => e.id)).toEqual(["new", "a", "b"]);
		expect(overflow.map((e) => e.id)).toEqual(["c"]);
	});
});

describe("snapshots", () => {
	it("slugifies document labels", () => {
		expect(docSlug("Privacy, Terms & Cookies Policies")).toBe("privacy-terms-cookies-policies");
	});

	it("round-trips latest.txt and returns null before first write", async () => {
		const dir = await mkdtemp(path.join(tmpdir(), "tos-snap-"));
		expect(await readLatestSnapshot(dir, "svc", "Terms of Service")).toBeNull();
		await writeSnapshot(dir, "svc", "Terms of Service", "normalized text", "2026-07-18");
		expect(await readLatestSnapshot(dir, "svc", "Terms of Service")).toBe("normalized text");
	});

	it("keeps a rolling history of at most HISTORY_KEEP dated snapshots", async () => {
		const dir = await mkdtemp(path.join(tmpdir(), "tos-snap-"));
		for (let day = 1; day <= HISTORY_KEEP + 3; day++) {
			const date = `2026-07-${String(day).padStart(2, "0")}`;
			await writeSnapshot(dir, "svc", "Terms", `text v${day}`, date);
		}
		const history = (await readdir(path.join(dir, "svc", "terms", "history"))).sort();
		expect(history).toHaveLength(HISTORY_KEEP);
		expect(history[0]).toBe("2026-07-04.txt"); // oldest three pruned
		expect(await readFile(path.join(dir, "svc", "terms", "latest.txt"), "utf8")).toBe(
			`text v${HISTORY_KEEP + 3}`,
		);
	});
});
