import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fileOrUpdateIssue } from "../issues";
import type { HealthReport } from "../../../src/lib/site-health";

// Verifies the dedupe rules against a stubbed GitHub API: same open
// fingerprint never files a duplicate, and persisting problems get at most
// one comment per 7 days.

function makeReport(): HealthReport {
	return {
		audited_at: "2026-07-03T08:15:00.000Z",
		status: "regression",
		summary: "Mobile layout overflow on the demos index.",
		pages: [],
		score_deltas: ["Demos performance 96 → 71"],
		top_fix: "Fix the overflowing hero grid on /projects.",
		should_file_issue: true,
		issue_title: "Mobile overflow on /projects",
		issue_body: "The demos index overflows horizontally on mobile.",
		issue_fingerprint: "mobile-overflow-demos-index",
		error_reason: null,
	};
}

interface RecordedCall {
	method: string;
	url: string;
	body: unknown;
}

function stubGithub(openIssues: unknown[], comments: unknown[] = []): RecordedCall[] {
	const calls: RecordedCall[] = [];
	vi.stubGlobal(
		"fetch",
		vi.fn(async (url: string, init?: RequestInit) => {
			const method = init?.method ?? "GET";
			calls.push({ method, url, body: init?.body ? JSON.parse(String(init.body)) : null });
			const payload =
				method === "GET" && url.includes("/comments")
					? comments
					: method === "GET"
						? openIssues
						: { number: 42, html_url: "https://github.com/x/y/issues/42" };
			return { ok: true, status: 200, json: async () => payload, text: async () => "" };
		}),
	);
	return calls;
}

beforeEach(() => {
	vi.stubEnv("GITHUB_TOKEN", "test-token");
	vi.stubEnv("GITHUB_REPOSITORY", "dliamkin/dliamkin");
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

describe("fileOrUpdateIssue", () => {
	it("files a new issue when no open issue has the fingerprint", async () => {
		const calls = stubGithub([{ number: 1, body: "unrelated", comments: 0 }]);
		await fileOrUpdateIssue(makeReport());
		const post = calls.find((c) => c.method === "POST");
		expect(post?.url).toMatch(/\/issues$/);
		const body = post?.body as { title: string; body: string; labels: string[] };
		expect(body.title).toBe("Mobile overflow on /projects");
		expect(body.body).toContain("<!-- site-health-fingerprint: mobile-overflow-demos-index -->");
		expect(body.labels).toEqual(["site-health"]);
	});

	it("comments instead of filing when an open issue has the same fingerprint", async () => {
		const calls = stubGithub(
			[
				{
					number: 7,
					body: "…\n<!-- site-health-fingerprint: mobile-overflow-demos-index -->",
					comments: 0,
				},
			],
			[], // no comments yet → commenting is allowed
		);
		await fileOrUpdateIssue(makeReport());
		const post = calls.find((c) => c.method === "POST");
		expect(post?.url).toMatch(/\/issues\/7\/comments$/);
	});

	it("skips commenting when the last comment is under 7 days old", async () => {
		const calls = stubGithub(
			[
				{
					number: 7,
					body: "<!-- site-health-fingerprint: mobile-overflow-demos-index -->",
					comments: 1,
				},
			],
			[{ created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() }],
		);
		await fileOrUpdateIssue(makeReport());
		expect(calls.filter((c) => c.method === "POST")).toHaveLength(0);
	});

	it("does nothing when should_file_issue is false", async () => {
		const calls = stubGithub([]);
		await fileOrUpdateIssue({ ...makeReport(), should_file_issue: false });
		expect(calls).toHaveLength(0);
	});
});
