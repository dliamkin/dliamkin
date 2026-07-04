// Regenerates src/data/lease-sample-results.json by running each bundled
// lease sample pair through the same pipeline worker/index.ts uses
// (src/lib/pipelines/compare-leases.ts), so the committed results always
// match what a live request would return.
//
// Usage: ANTHROPIC_API_KEY=sk-ant-... npm run generate:lease-samples
//
// Runs via tsx (see package.json): the pipeline modules use extensionless
// TS imports, which Node's native type stripping can't resolve. The
// lease texts are read from src/data/lease-samples/ by id (lease-samples.ts
// bundles the same files via ?raw imports, which Node can't resolve).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { compareLeases } from "../src/lib/pipelines/compare-leases.ts";

// Keep ids in sync with LEASE_SAMPLE_PAIRS in src/data/lease-samples.ts.
const PAIR_IDS = ["residential-renewal", "month-to-month"];

const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../src/data");

const anthropic = new Anthropic();
const results = {};

for (const id of PAIR_IDS) {
	console.log(`Comparing "${id}"...`);
	const read = (suffix) =>
		fs.readFileSync(path.join(dataDir, "lease-samples", `${id}-${suffix}.txt`), "utf8");
	// Match worker/index.ts: LEASE_DIFF_MODEL overrides the pipeline default.
	results[id] = await compareLeases(
		anthropic,
		read("original"),
		read("revised"),
		process.env.LEASE_DIFF_MODEL,
	);
	console.log(`  ${results[id].changes.length} changes found`);
}

const outPath = path.join(dataDir, "lease-sample-results.json");
fs.writeFileSync(outPath, `${JSON.stringify(results, null, "\t")}\n`);
console.log(`Wrote ${outPath}`);
