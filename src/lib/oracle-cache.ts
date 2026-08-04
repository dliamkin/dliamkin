import {
	isSimulationResult,
	planCacheKeyInput,
	sha256Hex,
	type AgentPlan,
	type RiskLevel,
	type SimulateRequest,
	type SimulationResult,
} from "./dry-run-oracle";

// Client-side frugality plumbing for the Dry-Run Oracle, all localStorage:
//
// - Forecast cache keyed by SHA-256(compact plan + target model). Submitting
//   an unchanged plan renders instantly and spends exactly zero tokens.
// - Forecast history (newest first, capped) so past simulations can be
//   restored without re-running anything.
//
// Both are best-effort: private browsing or full storage just means no
// caching, never an error.

const CACHE_KEY = "oracle:forecasts:v1";
const HISTORY_KEY = "oracle:history:v1";
const CACHE_MAX_ENTRIES = 40;
export const HISTORY_MAX_ENTRIES = 20;

export async function forecastCacheHash(request: SimulateRequest): Promise<string> {
	return sha256Hex(planCacheKeyInput(request));
}

function readCache(): Record<string, SimulationResult> {
	try {
		const raw = localStorage.getItem(CACHE_KEY);
		if (!raw) return {};
		const parsed: unknown = JSON.parse(raw);
		if (parsed === null || typeof parsed !== "object") return {};
		const out: Record<string, SimulationResult> = {};
		for (const [key, value] of Object.entries(parsed)) {
			if (isSimulationResult(value)) out[key] = value;
		}
		return out;
	} catch {
		return {};
	}
}

function writeCache(cache: Record<string, SimulationResult>): void {
	try {
		localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
	} catch {
		// best-effort
	}
}

export function getCachedForecast(hash: string): SimulationResult | undefined {
	return readCache()[hash];
}

export function cacheForecast(hash: string, result: SimulationResult): void {
	const cache = readCache();
	cache[hash] = result;
	const keys = Object.keys(cache);
	if (keys.length > CACHE_MAX_ENTRIES) {
		keys.sort((a, b) => (cache[a]?.createdAt ?? "").localeCompare(cache[b]?.createdAt ?? ""))
			.slice(0, keys.length - CACHE_MAX_ENTRIES)
			.forEach((key) => delete cache[key]);
	}
	writeCache(cache);
}

export interface OracleHistoryEntry {
	id: string;
	title: string;
	createdAt: string;
	overallRisk: RiskLevel;
	totalCostUsd: [number, number];
	plan: AgentPlan;
	result: SimulationResult;
}

function isHistoryEntry(value: unknown): value is OracleHistoryEntry {
	if (value === null || typeof value !== "object") return false;
	const entry = value as Record<string, unknown>;
	return (
		typeof entry.id === "string" &&
		typeof entry.title === "string" &&
		typeof entry.createdAt === "string" &&
		entry.plan !== null &&
		typeof entry.plan === "object" &&
		isSimulationResult(entry.result)
	);
}

export function readHistory(): OracleHistoryEntry[] {
	try {
		const raw = localStorage.getItem(HISTORY_KEY);
		if (!raw) return [];
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(isHistoryEntry);
	} catch {
		return [];
	}
}

function writeHistory(entries: OracleHistoryEntry[]): void {
	try {
		localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, HISTORY_MAX_ENTRIES)));
	} catch {
		// best-effort
	}
}

export function addHistoryEntry(plan: AgentPlan, result: SimulationResult): OracleHistoryEntry[] {
	const entry: OracleHistoryEntry = {
		id: `${result.planHash}-${result.createdAt}`,
		title: plan.title,
		createdAt: result.createdAt,
		overallRisk: result.overallRisk,
		totalCostUsd: result.totalCostUsd,
		plan,
		result,
	};
	const next = [entry, ...readHistory().filter((e) => e.id !== entry.id)].slice(
		0,
		HISTORY_MAX_ENTRIES,
	);
	writeHistory(next);
	return next;
}

export function clearHistory(): void {
	writeHistory([]);
}
