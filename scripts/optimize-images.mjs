// Regenerates the optimized/responsive variants of the hero portfolio-wall
// images and the navbar logos in public/images. Rerun after adding or
// replacing any of the source files below:
//
//   node ./scripts/optimize-images.mjs
//
// Wall images: the wall column renders at 340–680 CSS px wide depending on
// viewport (see HeroBanner.vue), so each 500x320 source gets a 340x218
// sibling ("<name>-340.webp") for 1x-DPR viewports, and the 500w original is
// recompressed in place when that saves meaningful bytes. HeroBanner.vue's
// srcset and index.html's preloads reference both files — keep in sync.
//
// Logos: the PNG sources stay in git as the editable originals; this emits a
// lossless WebP twin for AppNavbar.vue. No downscaled variant — resizing
// smooths the flat colors and the 220w lossless file comes out LARGER than
// the full 326w one, so the full size serves every DPR.
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";
import sharp from "sharp";

const imagesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "images");

const WALL_IMAGES = [
	"entomology.webp",
	"resetu.webp",
	"oakwood.webp",
	"ole.webp",
	"firsteyefilm.webp",
	"toolsoffitness.webp",
	"spicegalgourmet.webp",
	"plumbingeasy.webp",
	"aptsintally.webp",
	"grenninglab.webp",
];
const LOGOS = ["DenisLiamkinLogo.png", "DenisLiamkinLogoDarkMode.png"];

const WEBP_OPTS = { quality: 72, effort: 6 };
// Logos are flat-color line art with alpha — lossless WebP keeps the edges
// crisp and still beats the PNGs.
const LOGO_OPTS = { lossless: true, effort: 6 };

const kb = (n) => `${(n / 1024).toFixed(1)}KB`;

for (const name of WALL_IMAGES) {
	const src = path.join(imagesDir, name);
	const original = await fs.readFile(src);

	const small = await sharp(original).resize(340, 218).webp(WEBP_OPTS).toBuffer();
	const smallPath = src.replace(/\.webp$/, "-340.webp");
	await fs.writeFile(smallPath, small);

	// Re-encoding an already-lossy WebP costs a little fidelity, so only
	// replace the 500w original when the size win is substantial.
	const recompressed = await sharp(original).webp(WEBP_OPTS).toBuffer();
	const keepOriginal = recompressed.length > original.length * 0.85;
	if (!keepOriginal) await fs.writeFile(src, recompressed);

	console.log(
		`${name}: 500w ${kb(original.length)} -> ${keepOriginal ? "kept" : kb(recompressed.length)}, 340w ${kb(small.length)}`,
	);
}

for (const name of LOGOS) {
	const src = path.join(imagesDir, name);
	const original = await fs.readFile(src);

	const full = await sharp(original).webp(LOGO_OPTS).toBuffer();
	await fs.writeFile(src.replace(/\.png$/, ".webp"), full);

	console.log(`${name}: png ${kb(original.length)} -> webp ${kb(full.length)}`);
}
