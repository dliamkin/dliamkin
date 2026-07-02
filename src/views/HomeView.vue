<script setup lang="ts">
import AppNavbar from "@/components/sections/AppNavbar.vue";
import HeroBanner from "@/components/sections/HeroBanner.vue";
import ResponsiveShowcase from "@/components/sections/ResponsiveShowcase.vue";
import AboutSection from "@/components/sections/AboutSection.vue";
import ExpertisePillars from "@/components/sections/ExpertisePillars.vue";
import CaseStudies from "@/components/sections/CaseStudies.vue";
import EngineeringValues from "@/components/sections/EngineeringValues.vue";
import SkillsGrid from "@/components/sections/SkillsGrid.vue";
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
		<SiteFooter />
	</div>
</template>

<style scoped>
.home-page {
	font-family: "Raleway", sans-serif;
	color: #414042;
}
</style>
