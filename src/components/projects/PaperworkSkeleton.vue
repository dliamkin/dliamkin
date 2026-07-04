<script setup lang="ts">
import Skeleton from "primevue/skeleton";
</script>

<template>
	<div class="paperwork-skeleton" aria-hidden="true">
		<Skeleton width="40%" height="1.4rem" class="mb" />
		<div v-for="i in 4" :key="i" class="row">
			<Skeleton shape="circle" size="1.4rem" />
			<div class="fields">
				<Skeleton width="70%" height="1.1rem" />
				<Skeleton width="45%" height="0.9rem" />
			</div>
		</div>
		<Skeleton width="100%" height="3rem" class="mt" />
	</div>
</template>

<style scoped>
.paperwork-skeleton {
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

.row {
	display: flex;
	align-items: flex-start;
	gap: 0.75rem;
	border: 1px solid rgba(0, 0, 0, 0.08);
	border-radius: 8px;
	padding: 0.75rem 0.9rem;
}

.fields {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}
</style>
