<script setup lang="ts">
// Preset picker + save/load of custom scenarios. Editing any parameter
// upstream flips the active id to "custom"; this bar then offers to name and
// save that custom scenario to localStorage.
import { computed, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { CUSTOM_SCENARIO_ID } from "@/lib/tail-risk/presets";
import type { Scenario } from "@/lib/tail-risk/types";

const props = defineProps<{
	presets: Scenario[];
	saved: Scenario[];
	activeId: string;
}>();

const emit = defineEmits<{
	select: [id: string];
	save: [name: string];
	delete: [id: string];
}>();

interface OptionGroup {
	label: string;
	items: { name: string; id: string }[];
}

const groups = computed<OptionGroup[]>(() => {
	const result: OptionGroup[] = [
		{ label: "Presets", items: props.presets.map(({ name, id }) => ({ name, id })) },
	];
	if (props.saved.length > 0) {
		result.push({
			label: "Saved",
			items: props.saved.map(({ name, id }) => ({ name, id })),
		});
	}
	if (props.activeId === CUSTOM_SCENARIO_ID) {
		result.push({
			label: "Unsaved",
			items: [{ name: "Custom (unsaved)", id: CUSTOM_SCENARIO_ID }],
		});
	}
	return result;
});

const selected = computed({
	get: () => props.activeId,
	set: (id: string | null) => {
		if (id !== null && id !== props.activeId) emit("select", id);
	},
});

const isSavedActive = computed(() => props.saved.some((s) => s.id === props.activeId));

const naming = ref(false);
const draftName = ref("");

function startSave(): void {
	naming.value = true;
	draftName.value = "";
}

function confirmSave(): void {
	if (!draftName.value.trim()) return;
	emit("save", draftName.value);
	naming.value = false;
}
</script>

<template>
	<div class="scenario-bar">
		<label class="bar-label" for="tail-risk-scenario">Scenario</label>
		<Select
			id="tail-risk-scenario"
			v-model="selected"
			:options="groups"
			option-label="name"
			option-value="id"
			option-group-label="label"
			option-group-children="items"
			size="small"
			class="scenario-select"
		/>

		<template v-if="!naming">
			<Button
				label="Save as…"
				icon="fa-solid fa-floppy-disk"
				severity="secondary"
				text
				size="small"
				@click="startSave"
			/>
			<Button
				v-if="isSavedActive"
				icon="fa-solid fa-trash-can"
				severity="secondary"
				text
				size="small"
				aria-label="Delete saved scenario"
				@click="emit('delete', activeId)"
			/>
		</template>
		<template v-else>
			<InputText
				v-model="draftName"
				placeholder="Scenario name"
				size="small"
				maxlength="60"
				class="name-input"
				@keyup.enter="confirmSave"
				@keyup.esc="naming = false"
			/>
			<Button label="Save" size="small" :disabled="!draftName.trim()" @click="confirmSave" />
			<Button label="Cancel" severity="secondary" text size="small" @click="naming = false" />
		</template>
	</div>
</template>

<style scoped>
.scenario-bar {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 0.5rem;
}

.bar-label {
	font-size: 0.72rem;
	font-weight: 700;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: #6b6a6d;
	margin-right: 0.25rem;
}

.scenario-select {
	min-width: 16rem;
}

.name-input {
	width: 14rem;
}

@media (max-width: 480px) {
	.scenario-select,
	.name-input {
		min-width: 0;
		flex: 1 1 100%;
	}
}

html.dark .bar-label {
	color: var(--dm-text-3);
}
</style>
