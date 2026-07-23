import { describe, expect, it } from "vitest";
import { extractBlocks, normalizeDocument } from "../normalize";

const page = (body: string) => `<!doctype html><html><head><title>t</title></head><body>${body}</body></html>`;

const policyBody = (updatedLine: string, extra = "") => `
	<nav><a href="/">Home</a> · <a href="/policies">Policies</a></nav>
	<header><h1 class="site-title">Example University</h1></header>
	<main>
		<article>
			<h1>Acceptable Use Policy</h1>
			<p>${updatedLine}</p>
			<p>Users must not share account credentials with any other person.</p>
			<ul><li>Access is limited to authorized users.</li><li>Monitoring may occur for security purposes.</li></ul>
			${extra}
		</article>
	</main>
	<footer><p>© 2026 Example University. All rights reserved.</p></footer>
`;

describe("extractBlocks", () => {
	it("extracts main content and drops nav/header/footer boilerplate", () => {
		const blocks = extractBlocks(page(policyBody("Last updated: January 5, 2026")), null);
		const joined = blocks.join("\n");
		expect(joined).toContain("Acceptable Use Policy");
		expect(joined).toContain("share account credentials");
		expect(joined).not.toContain("Home");
		expect(joined).not.toContain("All rights reserved");
	});

	it("honors a configured selector over the fallback", () => {
		const html = page(
			`<article><p>Wrong article.</p></article><div id="policy"><p>Right content.</p></div>`,
		);
		expect(extractBlocks(html, "#policy").join(" ")).toBe("Right content.");
	});

	it("does not double-count text of nested block containers", () => {
		const html = page(`<main><li><p>Only once.</p></li></main>`);
		const blocks = extractBlocks(html, null);
		expect(blocks).toEqual(["Only once."]);
	});

	it("falls back to whole-root text on structureless pages", () => {
		const html = page(`<div>Bare text with no block markup.</div>`);
		expect(extractBlocks(html, null)).toEqual(["Bare text with no block markup."]);
	});

	it("collapses whitespace so reflowed markup does not change blocks", () => {
		const a = extractBlocks(page(`<main><p>One  two\n three.</p></main>`), null);
		const b = extractBlocks(page(`<main><p>One two three.</p></main>`), null);
		expect(a).toEqual(b);
	});
});

describe("normalizeDocument", () => {
	// The core false-positive defense: a date bump must not read as a change.
	it("hashes identically when only the 'last updated' line differs", () => {
		const before = normalizeDocument(page(policyBody("Last updated: January 5, 2026")), null);
		const after = normalizeDocument(page(policyBody("Last updated: July 18, 2026")), null);
		expect(after.hash).toBe(before.hash);
	});

	it("captures the self-reported updated line as metadata, not content", () => {
		const doc = normalizeDocument(page(policyBody("Last updated: July 18, 2026")), null);
		expect(doc.selfReportedUpdated).toBe("Last updated: July 18, 2026");
		expect(doc.text).not.toContain("Last updated");
	});

	it("recognizes 'Effective date' style revision lines", () => {
		const doc = normalizeDocument(page(policyBody("Effective date: March 1, 2026")), null);
		expect(doc.selfReportedUpdated).toBe("Effective date: March 1, 2026");
	});

	it("strips copyright-year lines from the hashed text", () => {
		const withCopyright = normalizeDocument(
			page(policyBody("Last updated: January 5, 2026", "<p>© 2025 Example University</p>")),
			null,
		);
		const withBumpedYear = normalizeDocument(
			page(policyBody("Last updated: January 5, 2026", "<p>© 2026 Example University</p>")),
			null,
		);
		expect(withCopyright.hash).toBe(withBumpedYear.hash);
	});

	it("changes hash when actual policy text changes", () => {
		const before = normalizeDocument(page(policyBody("Last updated: January 5, 2026")), null);
		const after = normalizeDocument(
			page(
				policyBody(
					"Last updated: January 5, 2026",
					"<p>All disputes shall be resolved through binding arbitration.</p>",
				),
			),
			null,
		);
		expect(after.hash).not.toBe(before.hash);
		expect(after.text).toContain("binding arbitration");
	});

	it("does not treat an ordinary sentence mentioning a year as volatile", () => {
		const doc = normalizeDocument(
			page(policyBody("Last updated: January 5, 2026", "<p>Records are retained until 2030 under state law.</p>")),
			null,
		);
		expect(doc.text).toContain("retained until 2030");
	});
});
