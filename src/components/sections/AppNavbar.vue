<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";

interface NavItem {
	id: string;
	label: string;
}

const navItems: NavItem[] = [
	{ id: "about", label: "About" },
	{ id: "work", label: "Work" },
	{ id: "skills", label: "Skills" },
];

const isScrolled = ref(false);
const isMobileMenuOpen = ref(false);
const activeId = ref("");
const navbarEl = ref<HTMLElement | null>(null);
let spy: IntersectionObserver | undefined;

const updateScrolled = () => {
	const threshold = (navbarEl.value?.offsetHeight ?? 70) * 2;
	isScrolled.value = window.scrollY > threshold;
};

const scrollTo = (id: string) => {
	isMobileMenuOpen.value = false;
	const el = document.getElementById(id);
	if (!el) return;
	const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	el.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
};

onMounted(() => {
	updateScrolled();
	window.addEventListener("scroll", updateScrolled);
	window.addEventListener("resize", updateScrolled);

	const ids = [...navItems.map((item) => item.id), "contact"];
	spy = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) activeId.value = entry.target.id;
			}
		},
		{ rootMargin: "-30% 0px -60% 0px", threshold: 0 },
	);
	ids.forEach((id) => {
		const el = document.getElementById(id);
		if (el) spy!.observe(el);
	});
});

onUnmounted(() => {
	window.removeEventListener("scroll", updateScrolled);
	window.removeEventListener("resize", updateScrolled);
	spy?.disconnect();
});
</script>

<template>
	<header ref="navbarEl" class="navbar" :class="{ scrolled: isScrolled }">
		<div class="navbar-inner">
			<a href="/" class="brand" aria-label="Denis Liamkin — home">
				<img src="/images/DenisLiamkinLogo.png" alt="Denis Liamkin" class="brand-logo" />
			</a>

			<button
				type="button"
				class="menu-toggle"
				:aria-expanded="isMobileMenuOpen"
				@click="isMobileMenuOpen = !isMobileMenuOpen"
			>
				MENU
			</button>

			<nav class="nav-links" :class="{ open: isMobileMenuOpen }">
				<a
					v-for="item in navItems"
					:key="item.id"
					:href="`#${item.id}`"
					class="nav-link"
					:class="{ active: activeId === item.id }"
					:aria-current="activeId === item.id ? 'true' : undefined"
					@click.prevent="scrollTo(item.id)"
					>{{ item.label }}</a
				>
				<a
					href="#contact"
					class="nav-cta"
					:class="{ active: activeId === 'contact' }"
					@click.prevent="scrollTo('contact')"
					>Contact</a
				>
			</nav>
		</div>
	</header>
</template>

<style scoped>
.navbar {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	z-index: 50;
	transition:
		background-color 0.6s ease,
		border-color 0.6s ease;
	border-bottom: 1px solid transparent;
}

.navbar.scrolled {
	background-color: rgba(255, 255, 255, 0.92);
	border-bottom-color: rgba(0, 0, 0, 0.08);
}

.navbar-inner {
	max-width: 1280px;
	margin: 0 auto;
	padding: 0.75rem 0.75rem;
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.brand-logo {
	max-width: 220px;
	display: block;
}

.menu-toggle {
	display: none;
	font-weight: 700;
	border: 2px solid #27a9e0;
	color: #27a9e0;
	background: #fff;
	padding: 0.5rem 0.75rem;
	border-radius: 2px;
	cursor: pointer;
}

.nav-links {
	display: flex;
	align-items: center;
	gap: 2rem;
}

.nav-link {
	position: relative;
	font-family: "Raleway", sans-serif;
	font-size: 1.05rem;
	font-weight: 700;
	letter-spacing: 0.03em;
	text-transform: uppercase;
	color: #414042;
	text-decoration: none;
	background: none;
	border: none;
	padding: 0;
	cursor: pointer;
	transition: color 0.25s ease;
}

.nav-link:hover,
.nav-link.active {
	color: #27a9e0;
}

.nav-link::after {
	content: "";
	position: absolute;
	left: 0;
	right: 0;
	bottom: -6px;
	height: 2px;
	background: #27a9e0;
	transform: scaleX(0);
	transform-origin: center;
	transition: transform 0.25s ease;
}

.nav-link:hover::after,
.nav-link.active::after {
	transform: scaleX(1);
}

.nav-cta {
	font-family: "Raleway", sans-serif;
	font-size: 1.05rem;
	font-weight: 700;
	letter-spacing: 0.03em;
	text-transform: uppercase;
	color: #fff;
	background: #5cb85c;
	text-decoration: none;
	padding: 0.55rem 1.3rem;
	border-radius: 6px;
	transition:
		background 0.25s ease,
		transform 0.15s ease,
		box-shadow 0.25s ease;
}

.nav-cta:hover {
	background: #4a9d4a;
}

.nav-cta:active {
	transform: translateY(1px);
}

.nav-cta.active {
	box-shadow: 0 0 0 3px rgba(92, 184, 92, 0.3);
}

@media (max-width: 767px) {
	.menu-toggle {
		display: block;
	}

	.nav-links {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		flex-direction: column;
		align-items: stretch;
		gap: 0;
		background: rgba(255, 255, 255, 0.97);
		max-height: 0;
		overflow: hidden;
		transition: max-height 0.3s ease;
	}

	.nav-links.open {
		max-height: 600px;
	}

	.nav-link {
		padding: 1rem 2rem;
		border-bottom: 1px solid rgba(0, 0, 0, 0.06);
	}

	.nav-link::after {
		display: none;
	}

	.nav-cta {
		margin: 0.75rem 2rem 1rem;
		text-align: center;
	}
}

@media (prefers-reduced-motion: reduce) {
	.nav-link::after {
		transition: none;
	}
}
</style>
