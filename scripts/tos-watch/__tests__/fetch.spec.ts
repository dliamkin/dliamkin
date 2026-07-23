import { describe, expect, it } from "vitest";
import { isPathAllowed, parseRobots, TOS_WATCH_USER_AGENT } from "../fetch";

describe("parseRobots", () => {
	it("uses the * group when no group names our agent", () => {
		const rules = parseRobots(
			["User-agent: *", "Disallow: /private/", "", "User-agent: SomeBot", "Disallow: /"].join("\n"),
			TOS_WATCH_USER_AGENT,
		);
		expect(rules.disallow).toEqual(["/private/"]);
	});

	it("prefers a group that names our agent token", () => {
		const rules = parseRobots(
			["User-agent: dliamkin-tos-watch", "Disallow: /blocked/", "", "User-agent: *", "Disallow: /"].join(
				"\n",
			),
			TOS_WATCH_USER_AGENT,
		);
		expect(rules.disallow).toEqual(["/blocked/"]);
	});

	it("applies rules to every agent in a stacked group and ignores comments", () => {
		const rules = parseRobots(
			["User-agent: a", "User-agent: *", "Disallow: /x/ # keep out", "Allow: /x/public/"].join("\n"),
			TOS_WATCH_USER_AGENT,
		);
		expect(rules.disallow).toEqual(["/x/"]);
		expect(rules.allow).toEqual(["/x/public/"]);
	});

	it("treats an empty Disallow as allow-everything", () => {
		const rules = parseRobots(["User-agent: *", "Disallow:"].join("\n"), TOS_WATCH_USER_AGENT);
		expect(rules.disallow).toEqual([]);
	});
});

describe("isPathAllowed", () => {
	it("allows paths with no matching rule", () => {
		expect(isPathAllowed({ disallow: ["/private/"], allow: [] }, "/policy/aup/")).toBe(true);
	});

	it("disallows matching path prefixes", () => {
		expect(isPathAllowed({ disallow: ["/policy/"], allow: [] }, "/policy/aup/")).toBe(false);
	});

	it("lets the longer Allow rule beat a shorter Disallow", () => {
		const rules = { disallow: ["/policy/"], allow: ["/policy/public/"] };
		expect(isPathAllowed(rules, "/policy/public/aup/")).toBe(true);
		expect(isPathAllowed(rules, "/policy/internal/")).toBe(false);
	});

	it("supports * wildcards and $ anchors", () => {
		expect(isPathAllowed({ disallow: ["/*.pdf$"], allow: [] }, "/docs/policy.pdf")).toBe(false);
		expect(isPathAllowed({ disallow: ["/*.pdf$"], allow: [] }, "/docs/policy.pdf.html")).toBe(true);
	});
});
