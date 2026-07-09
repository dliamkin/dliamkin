<script setup lang="ts">
import Skeleton from "primevue/skeleton";
</script>

<template>
	<div class="upgrade-plan-skeleton" aria-hidden="true">
		<Skeleton width="55%" height="1.2rem" />
		<div v-for="i in 3" :key="i" class="wave">
			<Skeleton shape="circle" size="1.6rem" />
			<div class="fields">
				<Skeleton width="35%" height="1.1rem" />
				<Skeleton width="80%" height="0.9rem" />
				<Skeleton width="60%" height="2rem" />
			</div>
		</div>
	</div>
</template>

<style scoped>
.upgrade-plan-skeleton {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

.wave {
	display: flex;
	align-items: flex-start;
	gap: 0.75rem;
	border: 1px solid rgba(0, 0, 0, 0.08);
	border-radius: 8px;
	padding: 0.9rem 1rem;
}

.fields {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 0.6rem;
}
</style>
