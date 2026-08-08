<script setup lang="ts">
import AppNavbar from "@/components/sections/AppNavbar.vue";
import HeroBanner from "@/components/sections/HeroBanner.vue";
import ResponsiveShowcase from "@/components/sections/ResponsiveShowcase.vue";
import AboutSection from "@/components/sections/AboutSection.vue";
import ExpertisePillars from "@/components/sections/ExpertisePillars.vue";
import CaseStudies from "@/components/sections/CaseStudies.vue";
import EngineeringValues from "@/components/sections/EngineeringValues.vue";
import SkillsGrid from "@/components/sections/SkillsGrid.vue";
import SupportBanner from "@/components/sections/SupportBanner.vue";
import SiteFooter from "@/components/sections/SiteFooter.vue";
</script>

<template>
	<div class="home-page">
		<AppNavbar />
		<HeroBanner />
		<ResponsiveShowcase />
		<AboutSection />
		<ExpertisePillars />
		<CaseStudies />
		<EngineeringValues />
		<SkillsGrid />
		<SupportBanner
			variant="band"
			eyebrow="// Support"
			heading="Enjoying the site?"
			blurb="I build all of this in my own time — the site, the experiments running behind it, and the write-ups that go with them. If something here gave you an idea, taught you something, or was just fun to click through, you're welcome to chip in toward the next one. Everything stays free either way."
			cta-label="Buy me some tokens"
		/>
		<SiteFooter />
	</div>
</template>

<style scoped>
.home-page {
	font-family: "Raleway", sans-serif;
	color: #414042;
}

html.dark .home-page {
	color: var(--dm-text-2);
}
</style>
