<script setup lang="ts">
import Card from "primevue/card";
import Skeleton from "primevue/skeleton";
</script>

<template>
	<div class="skeletons" aria-label="Structuring note…" aria-busy="true">
		<Card v-for="n in 4" :key="n">
			<template #title>
				<Skeleton width="10rem" height="1.25rem" />
			</template>
			<template #content>
				<div class="lines">
					<Skeleton width="100%" height="1rem" />
					<Skeleton width="85%" height="1rem" />
					<Skeleton width="60%" height="1rem" />
				</div>
			</template>
		</Card>
	</div>
</template>

<style scoped>
.skeletons {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

.lines {
	display: flex;
	flex-direction: column;
	gap: 0.6rem;
}
</style>
