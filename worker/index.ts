import Anthropic from "@anthropic-ai/sdk";
import { MAX_LEASE_CHARS, type LeaseComparison } from "../src/lib/lease-diff";
import { MAX_NOTE_CHARS, type StructuredNote } from "../src/lib/structured-note";
import {
	ALLOWED_MEDIA_TYPES,
	MAX_IMAGE_BYTES,
	type AllowedMediaType,
	type UiAnalysis,
} from "../src/lib/ui-analysis";
import { analyzeScreenshot } from "../src/lib/pipelines/analyze-screenshot";
import { compareLeases } from "../src/lib/pipelines/compare-leases";
import { PipelineOutputError } from "../src/lib/pipelines/shared";
import { structureNote } from "../src/lib/pipelines/structure-note";

// Each handler here is a thin wrapper: rate limiting, input validation, and
// error mapping. The actual model pipelines (prompt assembly, API call,
// schema-validated parse) live in src/lib/pipelines/ and are shared with the
// sample-generation scripts and the eval runner (scripts/evals/), so the
// published eval results exercise exactly this production code path.

interface Env {
	// Set via `wrangler secret put ANTHROPIC_API_KEY` (or the Cloudflare
	// dashboard). Never lives in the repo or the client bundle.
	ANTHROPIC_API_KEY: string;
	// Optional model override for the lease comparison endpoint only.
	LEASE_DIFF_MODEL?: string;
}

// Simple in-memory limiters. Workers isolates are ephemeral and per-PoP, so
// these are best-effort rather than global guarantees — fine for a demo whose
// real cost ceilings are the input caps and the small model.
function createRateLimiter(max: number, windowMs: number) {
	const log = new Map<string, number[]>();
	return (ip: string): boolean => {
		const now = Date.now();
		const recent = (log.get(ip) ?? []).filter((t) => now - t < windowMs);
		if (recent.length >= max) {
			log.set(ip, recent);
			return true;
		}
		recent.push(now);
		log.set(ip, recent);
		return false;
	};
}

const noteLimiter = createRateLimiter(10, 60_000); // 10/min/IP
// Vision calls cost more — stricter per-minute limit plus a modest daily cap.
const screenshotLimiter = createRateLimiter(5, 60_000); // 5/min/IP
const screenshotDailyLimiter = createRateLimiter(40, 86_400_000); // 40/day/IP
// Two full-length documents on Sonnet make this by far the most token-heavy
// endpoint — tighter caps than the other demos bound the worst-case spend.
const leaseLimiter = createRateLimiter(6, 60_000); // 6/min/IP
const leaseDailyLimiter = createRateLimiter(20, 86_400_000); // 20/day/IP

function json(body: unknown, status: number): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"content-type": "application/json",
			"cache-control": "no-store",
		},
	});
}

function friendlyApiError(error: unknown, malformedMessage: string): Response {
	if (error instanceof PipelineOutputError) {
		return json({ error: malformedMessage }, 502);
	}
	if (error instanceof Anthropic.RateLimitError) {
		return json(
			{ error: "The AI service is busy right now. Please try again in a moment." },
			429,
		);
	}
	if (error instanceof Anthropic.APIConnectionError) {
		return json({ error: "Couldn't reach the AI service. Please try again." }, 502);
	}
	if (error instanceof Anthropic.APIError) {
		console.error("Anthropic API error", error.status, error.message);
		return json(
			{ error: "Something went wrong analyzing the request. Please try again." },
			502,
		);
	}
	console.error("Unexpected error", error);
	return json({ error: "Unexpected server error. Please try again." }, 500);
}

async function handleStructureNote(request: Request, env: Env): Promise<Response> {
	const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
	if (noteLimiter(ip)) {
		return json(
			{ error: "Whoa — that's a lot of notes! Please wait a minute and try again." },
			429,
		);
	}

	let noteText: unknown;
	try {
		const body = (await request.json()) as Record<string, unknown>;
		noteText = body.noteText;
	} catch {
		return json({ error: "Request body must be JSON." }, 400);
	}

	if (typeof noteText !== "string" || noteText.trim().length === 0) {
		return json({ error: "noteText must be a non-empty string." }, 400);
	}
	if (noteText.length > MAX_NOTE_CHARS) {
		return json(
			{ error: `noteText must be at most ${MAX_NOTE_CHARS} characters.` },
			400,
		);
	}

	const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

	try {
		const result: StructuredNote = await structureNote(anthropic, noteText);
		return json(result, 200);
	} catch (error) {
		return friendlyApiError(
			error,
			"The model did not return a structured result. Please try again.",
		);
	}
}

async function handleAnalyzeScreenshot(request: Request, env: Env): Promise<Response> {
	const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
	if (screenshotLimiter(ip)) {
		return json(
			{ error: "Please wait a minute between batches of screenshots and try again." },
			429,
		);
	}
	if (screenshotDailyLimiter(ip)) {
		return json(
			{ error: "You've hit today's analysis limit for this demo. Come back tomorrow!" },
			429,
		);
	}

	let imageData: unknown;
	let mediaType: unknown;
	try {
		const body = (await request.json()) as Record<string, unknown>;
		imageData = body.imageData;
		mediaType = body.mediaType;
	} catch {
		return json({ error: "Request body must be JSON." }, 400);
	}

	if (typeof imageData !== "string" || imageData.length === 0) {
		return json({ error: "imageData must be a non-empty base64 string." }, 400);
	}
	if (
		typeof mediaType !== "string" ||
		!ALLOWED_MEDIA_TYPES.includes(mediaType as AllowedMediaType)
	) {
		return json(
			{ error: `mediaType must be one of: ${ALLOWED_MEDIA_TYPES.join(", ")}.` },
			400,
		);
	}
	if (!/^[A-Za-z0-9+/]+=*$/.test(imageData)) {
		return json({ error: "imageData is not valid base64." }, 400);
	}
	const decodedBytes = Math.floor((imageData.length * 3) / 4);
	if (decodedBytes > MAX_IMAGE_BYTES) {
		return json(
			{ error: "Image is too large. Please upload a smaller screenshot." },
			400,
		);
	}

	// Privacy: the image is held in memory for this request only — never
	// written to storage and never logged (metadata only, below).
	const startedAt = Date.now();
	const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

	try {
		const result: UiAnalysis = await analyzeScreenshot(
			anthropic,
			imageData,
			mediaType as AllowedMediaType,
		);
		console.log(
			`analyze-screenshot outcome=ok bytes=${decodedBytes} duration_ms=${Date.now() - startedAt}`,
		);
		return json(result, 200);
	} catch (error) {
		const outcome = error instanceof PipelineOutputError ? "malformed" : "error";
		console.log(
			`analyze-screenshot outcome=${outcome} bytes=${decodedBytes} duration_ms=${Date.now() - startedAt}`,
		);
		return friendlyApiError(
			error,
			"The model did not return a complete analysis. Please try again.",
		);
	}
}

async function handleCompareLeases(request: Request, env: Env): Promise<Response> {
	const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
	if (leaseLimiter(ip)) {
		return json(
			{ error: "Please wait a minute between comparisons and try again." },
			429,
		);
	}
	if (leaseDailyLimiter(ip)) {
		return json(
			{ error: "You've hit today's comparison limit for this demo. Come back tomorrow!" },
			429,
		);
	}

	let originalText: unknown;
	let revisedText: unknown;
	try {
		const body = (await request.json()) as Record<string, unknown>;
		originalText = body.originalText;
		revisedText = body.revisedText;
	} catch {
		return json({ error: "Request body must be JSON." }, 400);
	}

	if (typeof originalText !== "string" || originalText.trim().length === 0) {
		return json({ error: "originalText must be a non-empty string." }, 400);
	}
	if (typeof revisedText !== "string" || revisedText.trim().length === 0) {
		return json({ error: "revisedText must be a non-empty string." }, 400);
	}
	if (originalText.length > MAX_LEASE_CHARS || revisedText.length > MAX_LEASE_CHARS) {
		return json(
			{ error: `Each document must be at most ${MAX_LEASE_CHARS} characters.` },
			400,
		);
	}
	// Defense in depth behind the client-side short-circuit.
	if (originalText.trim() === revisedText.trim()) {
		return json(
			{ error: "The two documents are identical — there's nothing to compare." },
			400,
		);
	}

	// Privacy: both documents are held in memory for this request only —
	// never written to storage and never logged (metadata only, below).
	const startedAt = Date.now();
	const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

	try {
		const result: LeaseComparison = await compareLeases(
			anthropic,
			originalText,
			revisedText,
			env.LEASE_DIFF_MODEL,
		);
		console.log(
			`compare-leases outcome=ok original_chars=${originalText.length} revised_chars=${revisedText.length} duration_ms=${Date.now() - startedAt}`,
		);
		return json(result, 200);
	} catch (error) {
		const outcome = error instanceof PipelineOutputError ? "malformed" : "error";
		console.log(
			`compare-leases outcome=${outcome} original_chars=${originalText.length} revised_chars=${revisedText.length} duration_ms=${Date.now() - startedAt}`,
		);
		return friendlyApiError(
			error,
			"The model did not return a complete comparison. Please try again.",
		);
	}
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		// Static assets handle everything else (see wrangler.jsonc
		// run_worker_first) — the Worker only ever sees /api/* requests.
		if (url.pathname === "/api/structure-note") {
			if (request.method !== "POST") {
				return json({ error: "Method not allowed." }, 405);
			}
			return handleStructureNote(request, env);
		}
		if (url.pathname === "/api/analyze-screenshot") {
			if (request.method !== "POST") {
				return json({ error: "Method not allowed." }, 405);
			}
			return handleAnalyzeScreenshot(request, env);
		}
		if (url.pathname === "/api/compare-leases") {
			if (request.method !== "POST") {
				return json({ error: "Method not allowed." }, 405);
			}
			return handleCompareLeases(request, env);
		}
		return json({ error: "Not found." }, 404);
	},
};
