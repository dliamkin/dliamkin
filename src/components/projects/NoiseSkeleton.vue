<script setup lang="ts">
import Skeleton from "primevue/skeleton";
</script>

<template>
	<div class="noise-skeleton" aria-hidden="true">
		<Skeleton width="100%" height="10rem" class="mb" />
		<div class="tags-row">
			<Skeleton v-for="i in 3" :key="i" width="8rem" height="1.6rem" border-radius="1rem" />
		</div>
		<Skeleton width="90%" height="1.1rem" />
		<Skeleton width="75%" height="1.1rem" />
		<Skeleton width="100%" height="5rem" class="mt" />
		<div v-for="i in 4" :key="i" class="row">
			<Skeleton shape="circle" size="1.4rem" />
			<Skeleton width="70%" height="1.1rem" />
		</div>
	</div>
</template>

<style scoped>
.noise-skeleton {
	display: flex;
	flex-direction: column;
	gap: 0.9rem;
}

.mb {
	margin-bottom: 0.35rem;
}

.mt {
	margin-top: 0.35rem;
}

.tags-row {
	display: flex;
	gap: 0.6rem;
}

.row {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	border: 1px solid rgba(0, 0, 0, 0.08);
	border-radius: 8px;
	padding: 0.75rem 0.9rem;
}
</style>
