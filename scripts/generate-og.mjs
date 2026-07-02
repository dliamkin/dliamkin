import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const photoPath = resolve(root, "public/images/denis-headshot.jpg");
const templatePath = resolve(__dirname, "og-template.html");
const outputPath = resolve(root, "public/og-image.png");

let photoDataUrl;
try {
	const photoBytes = readFileSync(photoPath);
	const ext = photoPath.endsWith(".png") ? "png" : "jpeg";
	photoDataUrl = `data:image/${ext};base64,${photoBytes.toString("base64")}`;
} catch {
	console.error(
		`\n  Photo not found at: public/images/denis-headshot.jpg\n  Save your headshot there and re-run this script.\n`,
	);
	process.exit(1);
}

const html = readFileSync(templatePath, "utf-8").replace(
	'src=""',
	`src="${photoDataUrl}"`,
);

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(html, { waitUntil: "networkidle" });

// Give fonts a moment to load
await page.waitForTimeout(1200);

const buffer = await page.screenshot({ type: "png" });
await browser.close();

writeFileSync(outputPath, buffer);
console.log(`  OG image written → public/og-image.png (1200×630)`);
