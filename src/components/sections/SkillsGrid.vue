<script setup lang="ts">
import { useInView } from "@/composables/useInView";

interface SkillCategory {
	icon: string;
	accent: string;
	title: string;
	skills: string[];
}

const categories: SkillCategory[] = [
	{
		icon: "fa-solid fa-code",
		accent: "#27a9e0",
		title: "Frontend",
		skills: ["Vue", "PrimeVue", "Angular", "TypeScript", "JavaScript", "HTML / CSS", "RxJS"],
	},
	{
		icon: "fa-solid fa-server",
		accent: "#5cb85c",
		title: "Backend",
		skills: ["C# / .NET", "Node.js", "PHP / WordPress", "SQL / MySQL", "PostgreSQL"],
	},
	{
		icon: "fa-solid fa-cloud",
		accent: "#c08552",
		title: "Cloud & Infrastructure",
		skills: [
			"AWS Lambda",
			"DynamoDB",
			"QuickSight",
			"Azure Functions",
			"Blob Storage",
			"SSMS / SSAS / IIS",
			"Apache",
		],
	},
	{
		icon: "fa-solid fa-infinity",
		accent: "#9b59b6",
		title: "DevOps & Tooling",
		skills: [
			"CI/CD",
			"Git / GitHub / BitBucket",
			"DataDog",
			"Vitest / ESLint",
			"MonoRepo",
			"Jira",
		],
	},
	{
		icon: "fa-solid fa-palette",
		accent: "#e0413a",
		title: "Design & AI",
		skills: [
			"Adobe Creative Cloud",
			"AI Fluency (Gemini, Claude, CoPilot)",
			"UI/UX Prototyping",
		],
	},
];

const { target, inView } = useInView({ threshold: 0.1 });
</script>

<template>
	<section id="skills" ref="target" class="skills" :class="{ 'in-view': inView }">
		<div class="skills-head">
			<p class="eyebrow">// Toolbox</p>
			<h2>Skills &amp; Technologies</h2>
			<p class="sub">A full-stack toolkit sharpened over 12+ years across two industries.</p>
		</div>

		<div class="skills-grid">
			<div
				v-for="(cat, cIdx) in categories"
				:key="cat.title"
				class="skill-card"
				:style="{ '--accent': cat.accent, '--delay': `${cIdx * 0.08}s` }"
			>
				<div class="card-head">
					<span class="card-icon"><i :class="cat.icon"></i></span>
					<h3>{{ cat.title }}</h3>
				</div>
				<ul class="chips">
					<li
						v-for="(skill, sIdx) in cat.skills"
						:key="skill"
						class="chip"
						:style="{ '--chip-delay': `${cIdx * 0.08 + sIdx * 0.04}s` }"
					>
						{{ skill }}
					</li>
				</ul>
			</div>
		</div>
	</section>
</template>

<style scoped>
.skills {
	background: #fff;
	padding: 6rem 2rem 7rem;
}

.skills-head {
	max-width: 720px;
	margin: 0 auto 3.5rem;
	text-align: center;
}

.eyebrow {
	font-family: "JetBrains Mono", monospace;
	text-transform: uppercase;
	letter-spacing: 0.18em;
	font-size: 0.85rem;
	font-weight: 500;
	color: #c08552;
	margin: 0 0 1rem;
}

.skills-head h2 {
	font-family: "Quicksand", sans-serif;
	font-weight: 500;
	font-size: clamp(1.9rem, 3.5vw, 2.75rem);
	color: #414042;
	margin: 0 0 1rem;
}

.sub {
	font-family: "Raleway", sans-serif;
	font-size: 1.1rem;
	color: #6b6b6e;
	margin: 0;
}

.skills-grid {
	max-width: 1150px;
	margin: 0 auto;
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 1.5rem;
}

/* first card spans a bit wider visually via ordering on large screens is fine as-is */
.skill-card {
	border: 1px solid rgba(0, 0, 0, 0.08);
	border-radius: 14px;
	padding: 1.75rem 1.6rem;
	background: #fff;
	opacity: 0;
	transform: translateY(26px);
	transition:
		opacity 0.55s ease var(--delay),
		transform 0.55s cubic-bezier(0.22, 0.61, 0.36, 1) var(--delay),
		box-shadow 0.3s ease,
		border-color 0.3s ease;
}

.in-view .skill-card {
	opacity: 1;
	transform: translateY(0);
}

.skill-card:hover {
	border-color: var(--accent);
	box-shadow: 0 18px 40px rgba(0, 0, 0, 0.08);
}

.card-head {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	margin-bottom: 1.25rem;
}

.card-icon {
	width: 2.5rem;
	height: 2.5rem;
	border-radius: 10px;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--accent);
	background: color-mix(in srgb, var(--accent) 12%, transparent);
	font-size: 1.05rem;
}

.card-head h3 {
	font-family: "Raleway", sans-serif;
	font-weight: 700;
	font-size: 1.1rem;
	color: #414042;
	margin: 0;
}

.chips {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-wrap: wrap;
	gap: 0.55rem;
}

.chip {
	font-family: "JetBrains Mono", monospace;
	font-size: 0.75rem;
	padding: 0.4rem 0.7rem;
	border-radius: 7px;
	background: #f4f5f7;
	color: #414042;
	border: 1px solid rgba(0, 0, 0, 0.06);
	opacity: 0;
	transform: translateY(8px) scale(0.96);
	transition:
		opacity 0.4s ease var(--chip-delay),
		transform 0.4s ease var(--chip-delay),
		background 0.25s ease,
		color 0.25s ease,
		border-color 0.25s ease;
}

.in-view .chip {
	opacity: 1;
	transform: translateY(0) scale(1);
}

.chip:hover {
	background: var(--accent);
	color: #fff;
	border-color: var(--accent);
}

@media (max-width: 900px) {
	.skills-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}

@media (max-width: 560px) {
	.skills-grid {
		grid-template-columns: 1fr;
	}
}

@media (max-width: 600px) {
	.skills {
		padding: 6rem 1rem 7rem;
	}
}

@media (prefers-reduced-motion: reduce) {
	.skill-card,
	.chip {
		opacity: 1;
		transform: none;
	}
}
</style>
