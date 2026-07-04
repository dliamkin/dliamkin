<script setup lang="ts">
import Card from "primevue/card";
import Skeleton from "primevue/skeleton";
</script>

<template>
	<div class="skeletons" aria-label="Comparing leases…" aria-busy="true">
		<Card>
			<template #title>
				<Skeleton width="8rem" height="1.25rem" />
			</template>
			<template #content>
				<div class="lines">
					<Skeleton width="100%" height="1rem" />
					<Skeleton width="90%" height="1rem" />
					<div class="chips">
						<Skeleton v-for="n in 3" :key="n" width="7rem" height="1.5rem" />
					</div>
				</div>
			</template>
		</Card>
		<Card>
			<template #title>
				<Skeleton width="8rem" height="1.25rem" />
			</template>
			<template #content>
				<div class="lines">
					<Skeleton v-for="n in 6" :key="n" width="100%" height="2rem" />
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

.chips {
	display: flex;
	gap: 0.5rem;
	margin-top: 0.4rem;
}
</style>
