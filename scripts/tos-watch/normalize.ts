import { createHash } from "node:crypto";
import { JSDOM, VirtualConsole } from "jsdom";

// Extraction + normalization for the ToS watchdog. This module is the
// false-positive defense: every rule here exists so that a page can be
// re-rendered, reflowed, or date-bumped without the hash changing. A change
// entry should only ever mean the policy text itself differs. Keep every
// rule covered in __tests__/normalize.spec.ts.

export interface NormalizedDocument {
	text: string; // normalized main-content text, blocks joined by \n\n
	hash: string; // sha256 hex of `text`
	// The page's own "Last updated ..." style line, captured as display
	// metadata. Deliberately NOT part of `text`: a date bump alone must not
	// register as a change.
	selfReportedUpdated: string | null;
}

// Elements that are never policy content.
const STRIP_SELECTORS = [
	"script",
	"style",
	"noscript",
	"template",
	"iframe",
	"svg",
	"form",
	"nav",
	"header",
	"footer",
	"aside",
	"button",
	"[role=navigation]",
	"[role=banner]",
	"[role=contentinfo]",
	"[aria-hidden=true]",
	".breadcrumb",
	".breadcrumbs",
	".skip-link",
	".sr-only",
].join(",");

// Fallback main-content candidates, most specific first, when no selector is
// configured for the document.
const MAIN_CANDIDATES = ["main article", "article", "main", "[role=main]", "#content", "#main"];

// Block-level elements that become one normalized text block each.
const BLOCK_TAGS = ["p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "blockquote", "pre", "dt", "dd", "td", "th", "caption", "figcaption"];

// Lines that restate the document's own revision date. Captured separately
// (shown on the page as the provider's own claim), never hashed.
const SELF_DATE_PATTERN =
	/^(last\s+(updated|modified|revised|reviewed|changed)|effective(\s+date)?|date\s+of\s+last\s+revision|updated|revised)\s*[:\-–—]?\s+.{0,80}\d{4}.{0,20}$/i;

// Volatile boilerplate that changes without any policy meaning.
const VOLATILE_PATTERNS = [
	/^(©|\(c\)|copyright)\s.{0,120}$/i, // copyright lines (year bumps annually)
	/^page \d+( of \d+)?$/i,
];

function collapse(text: string): string {
	return text.replace(/\s+/g, " ").trim();
}

// jsdom logs "Could not parse CSS stylesheet" for modern CSS it doesn't
// understand; we never use styles, so route jsdom errors to a muted console.
const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", () => {});

export function extractBlocks(html: string, selector: string | null): string[] {
	const dom = new JSDOM(html, { virtualConsole });
	const { document } = dom.window;

	for (const el of document.querySelectorAll(STRIP_SELECTORS)) el.remove();

	let root: Element | null = null;
	if (selector) root = document.querySelector(selector);
	if (!root) {
		for (const candidate of MAIN_CANDIDATES) {
			root = document.querySelector(candidate);
			if (root) break;
		}
	}
	root ??= document.body;

	const blocks: string[] = [];
	const blockEls = root.querySelectorAll(BLOCK_TAGS.join(","));
	if (blockEls.length === 0) {
		// Structureless page (e.g. text in bare divs): fall back to the root's
		// whole text as one block so we still monitor something.
		const text = collapse(root.textContent ?? "");
		return text ? [text] : [];
	}
	for (const el of blockEls) {
		// Skip containers whose text is fully covered by a nested block element
		// (e.g. an <li> wrapping <p>s) so text isn't double-counted.
		if (el.querySelector(BLOCK_TAGS.join(","))) continue;
		const text = collapse(el.textContent ?? "");
		if (text) blocks.push(text);
	}
	return blocks;
}

export function normalizeDocument(html: string, selector: string | null): NormalizedDocument {
	const rawBlocks = extractBlocks(html, selector);

	let selfReportedUpdated: string | null = null;
	const kept: string[] = [];
	for (const block of rawBlocks) {
		if (SELF_DATE_PATTERN.test(block)) {
			// Keep the first sighting; pages sometimes repeat it in a footer.
			selfReportedUpdated ??= block;
			continue;
		}
		if (VOLATILE_PATTERNS.some((pattern) => pattern.test(block))) continue;
		kept.push(block);
	}

	const text = kept.join("\n\n");
	return {
		text,
		hash: createHash("sha256").update(text).digest("hex"),
		selfReportedUpdated,
	};
}
