import {
	findLoadedLanguage,
	truncateExcerpt,
	type LoadedLanguageViolation,
	type TosChangeReport,
} from "../../src/lib/tos-watch";

// The editorial gate between model output and the public record. Two jobs:
// enforce the 25-word excerpt cap in code (the prompt asks; this guarantees),
// and scan the model's own prose for the forbidden loaded-language list. A
// loaded-language hit means the entry is NOT auto-published — the caller
// logs it and files an ops issue so editorial control stays with the owner.

export interface EditorialResult {
	report: TosChangeReport; // excerpts hard-truncated
	violations: LoadedLanguageViolation[]; // non-empty => do not publish
}

export function applyEditorialGate(raw: TosChangeReport): EditorialResult {
	const report: TosChangeReport = {
		...raw,
		changes: raw.changes.map((change) => ({
			...change,
			new_excerpt: truncateExcerpt(change.new_excerpt),
			old_excerpt: change.old_excerpt === null ? null : truncateExcerpt(change.old_excerpt),
		})),
	};
	return { report, violations: findLoadedLanguage(report) };
}
