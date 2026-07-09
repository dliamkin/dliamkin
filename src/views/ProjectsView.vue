<script setup lang="ts">
import Card from "primevue/card";
import Tag from "primevue/tag";
import AppNavbar from "@/components/sections/AppNavbar.vue";
import SiteFooter from "@/components/sections/SiteFooter.vue";

interface ProjectEntry {
	to: string;
	icon: string;
	title: string;
	tags: string[];
	description: string;
}

const projects: ProjectEntry[] = [
	{
		to: "/projects/note-structurer",
		icon: "fa-solid fa-notes-medical",
		title: "Clinical Note Structurer",
		tags: ["Structured output", "Healthcare", "Serverless"],
		description:
			"Turns a messy free-text visit note into typed, structured fields — medications, vitals, follow-ups — with a HIPAA-safe architecture write-up. Synthetic data only.",
	},
	{
		to: "/projects/screenshot-to-primevue",
		icon: "fa-solid fa-wand-magic-sparkles",
		title: "Screenshot → PrimeVue",
		tags: ["Vision", "PrimeVue", "Codegen"],
		description:
			"Upload a screenshot of any UI and a vision model maps it to the PrimeVue components that would rebuild it, plus a scaffold Vue component you can copy.",
	},
	{
		to: "/projects/lease-diff",
		icon: "fa-solid fa-code-compare",
		title: "Lease Diff Explainer",
		tags: ["Hybrid diff + AI", "Real estate", "Structured output"],
		description:
			"Compare two versions of a lease and get a plain-English breakdown of every change — who it favors, how much it matters, and what to ask before signing. Synthetic documents only.",
	},
	{
		to: "/projects/paperwork-to-calendar",
		icon: "fa-solid fa-calendar-check",
		title: "Paperwork → Calendar",
		tags: ["Vision", "Date integrity", ".ics export"],
		description:
			"Paste, upload, or photograph any document with deadlines buried in it and get back a downloadable .ics — every deadline, notice window, and renewal as calendar events with reminders set before the date, not on it.",
	},
	{
		to: "/projects/upgrade-planner",
		icon: "fa-solid fa-arrow-up-right-dots",
		title: "Dependency Upgrade Planner",
		tags: ["npm registry", "Semver math", "Structured output"],
		description:
			"Paste a package.json and get computed facts — versions behind, deprecations, peer conflicts, straight from the npm registry in your browser — then an AI-synthesized upgrade plan: risk tiers, ordered waves, and the commands to run.",
	},
];
</script>

<template>
	<div class="projects-page">
		<AppNavbar />

		<main class="projects-main">
			<header class="projects-header">
				<p class="eyebrow">Interactive</p>
				<h1>My Projects</h1>
				<p class="intro">
					Working projects built into this site — each one calls a real AI model through a
					serverless proxy, with the same cost, privacy, and reliability engineering I'd
					apply in production.
				</p>
				<p class="evals-link">
					<i class="fa-solid fa-vial-circle-check" aria-hidden="true"></i>
					Every project here is continuously tested —
					<RouterLink to="/evals">see the live eval dashboard</RouterLink>.
				</p>
			</header>

			<div class="project-cards">
				<RouterLink
					v-for="project in projects"
					:key="project.to"
					:to="project.to"
					class="project-link"
				>
					<Card class="project-card">
						<template #title>
							<div class="card-title">
								<i :class="project.icon" aria-hidden="true"></i>
								<span>{{ project.title }}</span>
							</div>
						</template>
						<template #content>
							<p class="card-desc">{{ project.description }}</p>
							<div class="card-tags">
								<Tag
									v-for="tag in project.tags"
									:key="tag"
									:value="tag"
									severity="secondary"
								/>
							</div>
						</template>
					</Card>
				</RouterLink>
			</div>
		</main>

		<SiteFooter />
	</div>
</template>

<style scoped>
.projects-page {
	font-family: "Raleway", sans-serif;
	color: #414042;
	background: #fff;
	min-height: 100vh;
	display: flex;
	flex-direction: column;
}

.projects-main {
	flex: 1;
	width: 100%;
	max-width: 1280px;
	margin: 0 auto;
	padding: 7.5rem 1rem 4rem;
}

.projects-header {
	max-width: 720px;
	margin-bottom: 2rem;
}

.eyebrow {
	font-size: 0.85rem;
	font-weight: 700;
	letter-spacing: 0.12em;
	text-transform: uppercase;
	color: #27a9e0;
	margin-bottom: 0.5rem;
}

h1 {
	font-size: 2.25rem;
	font-weight: 700;
	margin-bottom: 0.75rem;
}

.intro {
	line-height: 1.7;
	color: #6b6a6d;
}

.evals-link {
	margin-top: 0.75rem;
	font-size: 0.9rem;
	color: #6b6a6d;
}

.evals-link i {
	color: #27a9e0;
	margin-right: 0.35rem;
}

.evals-link a {
	color: #1f8fc0;
	font-weight: 600;
}

.project-cards {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
	gap: 1.5rem;
	max-width: 900px;
}

.project-link {
	text-decoration: none;
	color: inherit;
	display: block;
}

.project-card {
	height: 100%;
	transition:
		box-shadow 0.2s ease,
		transform 0.2s ease;
}

.project-link:hover .project-card {
	box-shadow: 0 8px 24px rgba(39, 169, 224, 0.18);
	transform: translateY(-2px);
}

.card-title {
	display: flex;
	align-items: center;
	gap: 0.6rem;
}

.card-title i {
	color: #27a9e0;
}

.card-desc {
	color: #6b6a6d;
	line-height: 1.6;
	margin-bottom: 1rem;
}

.card-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 0.4rem;
}

@media (max-width: 900px) {
	.projects-main {
		padding-top: 6.5rem;
	}

	h1 {
		font-size: 1.75rem;
	}
}

html.dark .projects-page {
	color: var(--dm-text-2);
	background: var(--dm-bg);
}

html.dark h1 {
	color: var(--dm-text-1);
}

html.dark .intro,
html.dark .evals-link {
	color: var(--dm-text-2);
}

html.dark .evals-link a {
	color: var(--dm-blue-soft);
}

html.dark .card-desc {
	color: var(--dm-text-2);
}

html.dark .project-link:hover .project-card {
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
}
</style>
