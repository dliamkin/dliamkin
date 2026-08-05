// Display formatting for the Tail Risk Lab. All rounding happens here so no
// component ever renders a raw float.

export function formatUsd(value: number): string {
	if (value === 0) return "$0";
	if (value < 0.01) return `$${value.toFixed(4)}`;
	if (value < 1) return `$${value.toFixed(3)}`;
	if (value < 100) return `$${value.toFixed(2)}`;
	return `$${Math.round(value).toLocaleString("en-US")}`;
}

/** 0–1 fraction → "12.3%". */
export function formatPercent(fraction: number, digits = 1): string {
	return `${(fraction * 100).toFixed(digits)}%`;
}

/** Signed relative change vs a baseline → "▼ 61%" / "▲ 8%" / "±0%". */
export function formatDelta(current: number, baseline: number): string {
	if (baseline === 0) return current === 0 ? "±0%" : "new";
	const change = (current - baseline) / baseline;
	const pct = Math.abs(change * 100);
	const rounded = pct >= 10 ? Math.round(pct).toString() : pct.toFixed(1);
	if (pct < 0.05) return "±0%";
	return `${change < 0 ? "▼" : "▲"} ${rounded}%`;
}

export function formatTrials(trials: number): string {
	return trials >= 1000 ? `${Math.round(trials / 1000)}K` : `${trials}`;
}
