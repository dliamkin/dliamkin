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

const WEBP_OPTS = { quality: 68, effort: 6 };
// Logos are flat-color line art with alpha — lossless WebP keeps the edges
// crisp and still beats the PNGs.
const LOGO_OPTS = { lossless: true, effort: 6 };

const kb = (n) => `${(n / 1024).toFixed(1)}KB`;

for (const name of WALL_IMAGES) {
	const src = path.join(imagesDir, name);
	const jpgMaster = src.replace(/\.webp$/, ".jpg");
	// Encode from the JPG master when it exists — one lossy generation
	// instead of two, so the same byte budget keeps more fidelity. (The .jpg
	// files in public/images are the originals the .webp files came from.)
	const source = await fs.readFile(jpgMaster).catch(() => fs.readFile(src));
	const current = await fs.readFile(src);

	const small = await sharp(source).resize(340, 218).webp(WEBP_OPTS).toBuffer();
	const smallPath = src.replace(/\.webp$/, "-340.webp");
	await fs.writeFile(smallPath, small);

	const recompressed = await sharp(source).resize(500, 320).webp(WEBP_OPTS).toBuffer();
	const keepCurrent = recompressed.length >= current.length;
	if (!keepCurrent) await fs.writeFile(src, recompressed);

	console.log(
		`${name}: 500w ${kb(current.length)} -> ${keepCurrent ? "kept" : kb(recompressed.length)}, 340w ${kb(small.length)}`,
	);
}

// The ResponsiveShowcase mockup renders at up to 1099 CSS px on desktop but
// only ~350–600 px on phones — emit a 560w sibling for the srcset in
// ResponsiveShowcase.vue, and rebuild the full-size file from the PNG master.
{
	const master = await fs.readFile(path.join(imagesDir, "mock.png"));
	const full = await sharp(master).webp(WEBP_OPTS).toBuffer();
	const small = await sharp(master).resize(560, 145).webp(WEBP_OPTS).toBuffer();
	await fs.writeFile(path.join(imagesDir, "mock.webp"), full);
	await fs.writeFile(path.join(imagesDir, "mock-560.webp"), small);
	console.log(`mock.png: 1099w ${kb(full.length)}, 560w ${kb(small.length)}`);
}

for (const name of LOGOS) {
	const src = path.join(imagesDir, name);
	const original = await fs.readFile(src);

	const full = await sharp(original).webp(LOGO_OPTS).toBuffer();
	await fs.writeFile(src.replace(/\.png$/, ".webp"), full);

	console.log(`${name}: png ${kb(original.length)} -> webp ${kb(full.length)}`);
}
