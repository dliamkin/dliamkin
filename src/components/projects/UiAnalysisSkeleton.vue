<script setup lang="ts">
import Card from "primevue/card";
import Skeleton from "primevue/skeleton";
</script>

<template>
	<div class="skeletons" aria-label="Analyzing screenshot…" aria-busy="true">
		<div class="grid">
			<Card>
				<template #title><Skeleton width="11rem" height="1.25rem" /></template>
				<template #content><Skeleton width="100%" height="16rem" /></template>
			</Card>
			<Card>
				<template #title><Skeleton width="11rem" height="1.25rem" /></template>
				<template #content>
					<div class="lines">
						<Skeleton v-for="n in 6" :key="n" width="100%" height="1.4rem" />
					</div>
				</template>
			</Card>
		</div>
		<Card>
			<template #title><Skeleton width="9rem" height="1.25rem" /></template>
			<template #content><Skeleton width="100%" height="10rem" /></template>
		</Card>
	</div>
</template>

<style scoped>
.skeletons {
	display: flex;
	flex-direction: column;
	gap: 1.25rem;
}

.grid {
	display: grid;
	grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
	gap: 1.25rem;
}

.lines {
	display: flex;
	flex-direction: column;
	gap: 0.7rem;
}

@media (max-width: 900px) {
	.grid {
		grid-template-columns: minmax(0, 1fr);
	}
}
</style>
