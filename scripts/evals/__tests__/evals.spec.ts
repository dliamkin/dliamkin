import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CaseResult, EvalReport, SuiteResult } from "../../../src/lib/evals";
import { countAtMost, normalized, promptHash, setContains } from "../harness";
import { commentOnRecoveries, fileRegressionIssues, regressionFingerprint } from "../issues";
import { detectRegressions } from "../persist";

// Verifies the eval plumbing with fixtures: regression detection picks out
// exactly the newly-failing cases, issue filing dedupes on the fingerprint
// (same rules as scripts/site-health/__tests__/issues.spec.ts), and recovery
// comments fire only when every fingerprinted case passes again.

function makeCase(id: string, passed: boolean): CaseResult {
	return {
		case_id: id,
		description: `case ${id}`,
		passed,
		checks: passed
			? [{ name: "check", passed: true, expected: "x", actual: "x" }]
			: [{ name: "check", passed: false, expected: "x", actual: "y" }],
		duration_ms: 100,
		error: null,
	};
}

function makeSuite(passedById: Record<string, boolean>): SuiteResult {
	const cases = Object.entries(passedById).map(([id, passed]) => makeCase(id, passed));
	return {
		project_id: "lease-diff",
		project_label: "Lease Diff Explainer",
		model: "claude-sonnet-5",
		prompt_hash: "abcdef123456",
		cases,
		pass_count: cases.filter((c) => c.passed).length,
		total: cases.length,
	};
}

function makeReport(suites: SuiteResult[]): EvalReport {
	return {
		run_at: "2026-07-04T09:45:00.000Z",
		trigger: "schedule",
		suites,
		overall_pass_rate: 0.5,
		regression_from_previous: false,
		regression_detail: null,
	};
}

describe("grading helpers", () => {
	it("normalizes case and whitespace", () => {
		expect(normalized("  Twice\n Daily ")).toBe("twice daily");
	});

	it("setContains reports the non-matching items on failure", () => {
		const result = setContains(
			["a", "b"],
			"an item equal to c",
			(item) => item === "c",
			(item) => item,
		);
		expect(result.passed).toBe(false);
		expect(result.actual).toContain("a | b");
	});

	it("countAtMost passes at the boundary", () => {
		expect(countAtMost(9, 9, "changes").passed).toBe(true);
		expect(countAtMost(10, 9, "changes").passed).toBe(false);
	});

	it("promptHash is stable and 12 chars", () => {
		expect(promptHash("prompt")).toBe(promptHash("prompt"));
		expect(promptHash("prompt")).toHaveLength(12);
		expect(promptHash("prompt")).not.toBe(promptHash("prompt!"));
	});
});

describe("detectRegressions", () => {
	it("returns nothing on the first-ever run", () => {
		expect(detectRegressions(null, [makeSuite({ a: false })])).toEqual([]);
	});

	it("identifies exactly the newly-failing cases", () => {
		const previous = makeReport([makeSuite({ a: true, b: true, c: false })]);
		const current = [makeSuite({ a: true, b: false, c: false })];
		const regressions = detectRegressions(previous, current);
		expect(regressions).toHaveLength(1);
		expect(regressions[0]?.newly_failing_case_ids).toEqual(["b"]);
		expect(regressions[0]?.previous_pass_count).toBe(2);
		expect(regressions[0]?.pass_count).toBe(1);
	});

	it("ignores suites that held steady or improved", () => {
		const previous = makeReport([makeSuite({ a: false, b: true })]);
		expect(detectRegressions(previous, [makeSuite({ a: true, b: true })])).toEqual([]);
	});
});

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
						: { number: 7, html_url: "https://github.com/x/y/issues/7" };
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

describe("fileRegressionIssues", () => {
	const regression = {
		project_id: "lease-diff" as const,
		project_label: "Lease Diff Explainer",
		previous_pass_count: 3,
		pass_count: 1,
		total: 3,
		newly_failing_case_ids: ["lease-month-to-month", "lease-residential-renewal"],
	};
	const report = makeReport([
		makeSuite({ "lease-month-to-month": false, "lease-residential-renewal": false, x: true }),
	]);
	const marker = `<!-- evals-fingerprint: ${regressionFingerprint(regression)} -->`;

	it("files a new labeled issue with the fingerprint and failure detail", async () => {
		const calls = stubGithub([]);
		await fileRegressionIssues(report, [regression]);
		const post = calls.find((c) => c.method === "POST");
		expect(post?.url).toContain("/issues");
		const body = post?.body as { title: string; body: string; labels: string[] };
		expect(body.labels).toEqual(["evals"]);
		expect(body.body).toContain(marker);
		expect(body.body).toContain("expected: x");
		expect(body.title).toContain("3/3 → 1/3");
	});

	it("comments instead of refiling when an open issue matches the fingerprint", async () => {
		const calls = stubGithub(
			[{ number: 7, html_url: "", body: `${marker}\nold body` }],
			[{ created_at: "2026-06-01T00:00:00.000Z", body: "old comment" }],
		);
		await fileRegressionIssues(report, [regression]);
		const posts = calls.filter((c) => c.method === "POST");
		expect(posts).toHaveLength(1);
		expect(posts[0]?.url).toContain("/issues/7/comments");
	});

	it("stays silent when the open issue already has a recent comment", async () => {
		const calls = stubGithub(
			[{ number: 7, html_url: "", body: `${marker}\nold body` }],
			[{ created_at: new Date().toISOString(), body: "recent comment" }],
		);
		await fileRegressionIssues(report, [regression]);
		expect(calls.filter((c) => c.method === "POST")).toHaveLength(0);
	});
});

describe("commentOnRecoveries", () => {
	const openIssue = (body: string) => ({ number: 9, html_url: "", body });
	const marker = "<!-- evals-fingerprint: lease-diff:lease-month-to-month -->";

	it("comments when every fingerprinted case passes again", async () => {
		const report = makeReport([makeSuite({ "lease-month-to-month": true })]);
		const calls = stubGithub([openIssue(`${marker}\nbody`)], []);
		await commentOnRecoveries(report);
		const post = calls.find((c) => c.method === "POST");
		expect(post?.url).toContain("/issues/9/comments");
		const body = (post?.body as { body: string } | null)?.body ?? "";
		expect(body).toContain("Recovered");
		expect(body).toContain("Consider closing");
	});

	it("does not comment while any fingerprinted case still fails", async () => {
		const report = makeReport([makeSuite({ "lease-month-to-month": false })]);
		const calls = stubGithub([openIssue(`${marker}\nbody`)], []);
		await commentOnRecoveries(report);
		expect(calls.filter((c) => c.method === "POST")).toHaveLength(0);
	});

	it("does not repeat a recovery comment", async () => {
		const report = makeReport([makeSuite({ "lease-month-to-month": true })]);
		const calls = stubGithub(
			[openIssue(`${marker}\nbody`)],
			[{ created_at: "2026-07-01T00:00:00.000Z", body: "Recovered in the 2026-07-01 eval run..." }],
		);
		await commentOnRecoveries(report);
		expect(calls.filter((c) => c.method === "POST")).toHaveLength(0);
	});
});
