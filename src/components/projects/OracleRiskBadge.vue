<script setup lang="ts">
import Tag from "primevue/tag";
import type { RiskLevel } from "@/lib/dry-run-oracle";

const props = defineProps<{ risk: RiskLevel }>();

const META: Record<
	RiskLevel,
	{ severity: "success" | "warn" | "danger"; icon: string; text: string }
> = {
	clear: { severity: "success", icon: "fa-solid fa-sun", text: "Clear" },
	caution: { severity: "warn", icon: "fa-solid fa-cloud", text: "Caution" },
	storm: { severity: "danger", icon: "fa-solid fa-bolt", text: "Storm" },
};
</script>

<template>
	<Tag
		:severity="META[props.risk].severity"
		:icon="META[props.risk].icon"
		:value="META[props.risk].text"
	/>
</template>
