// Regenerates src/data/sample-note-results.json by running each bundled
// sample note through the same pipeline worker/index.ts uses
// (src/lib/pipelines/structure-note.ts), so the committed results always
// match what a live request would return.
//
// Usage: ANTHROPIC_API_KEY=sk-ant-... npm run generate:samples
//
// Runs via tsx (see package.json): the pipeline modules use extensionless
// TS imports, which Node's native type stripping can't resolve.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { structureNote } from "../src/lib/pipelines/structure-note.ts";
import { SAMPLE_NOTES } from "../src/data/sample-notes.ts";

const anthropic = new Anthropic();
const results = {};

for (const sample of SAMPLE_NOTES) {
	console.log(`Structuring "${sample.label}"...`);
	results[sample.id] = await structureNote(anthropic, sample.text);
}

const outPath = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	"../src/data/sample-note-results.json",
);
fs.writeFileSync(outPath, `${JSON.stringify(results, null, "\t")}\n`);
console.log(`Wrote ${outPath}`);
