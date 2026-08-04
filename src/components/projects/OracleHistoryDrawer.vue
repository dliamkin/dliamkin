<script setup lang="ts">
import Button from "primevue/button";
import Drawer from "primevue/drawer";
import { formatUsd, type RiskLevel } from "@/lib/dry-run-oracle";
import { HISTORY_MAX_ENTRIES, type OracleHistoryEntry } from "@/lib/oracle-cache";

const visible = defineModel<boolean>("visible", { required: true });

const props = defineProps<{ entries: OracleHistoryEntry[] }>();
const emit = defineEmits<{ restore: [entry: OracleHistoryEntry]; clear: [] }>();

const RISK_ICON: Record<RiskLevel, { icon: string; className: string }> = {
	clear: { icon: "fa-solid fa-sun", className: "risk-clear" },
	caution: { icon: "fa-solid fa-cloud", className: "risk-caution" },
	storm: { icon: "fa-solid fa-bolt", className: "risk-storm" },
};

function formatDate(iso: string): string {
	const date = new Date(iso);
	return Number.isNaN(date.getTime())
		? iso
		: date.toLocaleString(undefined, {
				month: "short",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			});
}
</script>

<template>
	<Drawer v-model:visible="visible" header="Past forecasts" position="right">
		<p v-if="props.entries.length === 0" class="history__empty">
			No forecasts yet. Run a dry-run and it will be remembered here (last
			{{ HISTORY_MAX_ENTRIES }}, stored only in your browser).
		</p>

		<ul v-else class="history__list">
			<li v-for="entry in props.entries" :key="entry.id">
				<button type="button" class="history__item" @click="emit('restore', entry)">
					<i
						:class="[
							RISK_ICON[entry.overallRisk].icon,
							RISK_ICON[entry.overallRisk].className,
						]"
						aria-hidden="true"
					></i>
					<span class="history__body">
						<span class="history__title">{{ entry.title }}</span>
						<span class="history__meta">
							{{ formatDate(entry.createdAt) }} &middot;
							{{ formatUsd(entry.totalCostUsd[0]) }}&ndash;{{
								formatUsd(entry.totalCostUsd[1])
							}}
						</span>
					</span>
					<i class="fa-solid fa-angle-right history__chevron" aria-hidden="true"></i>
				</button>
			</li>
		</ul>

		<template #footer>
			<Button
				v-if="props.entries.length"
				label="Clear history"
				icon="fa-solid fa-trash-can"
				severity="danger"
				text
				@click="emit('clear')"
			/>
		</template>
	</Drawer>
</template>

<style scoped>
.history__empty {
	color: #6b6a6d;
	font-size: 0.9rem;
}

.history__list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 0.4rem;
}

.history__item {
	width: 100%;
	display: flex;
	align-items: center;
	gap: 0.7rem;
	padding: 0.65rem 0.7rem;
	background: #f7f8f9;
	border: 1px solid rgba(0, 0, 0, 0.1);
	border-radius: 10px;
	cursor: pointer;
	text-align: left;
	color: inherit;
	font: inherit;
	transition: border-color 0.15s ease;
}

.history__item:hover {
	border-color: #27a9e0;
}

.risk-clear {
	color: #4caf50;
}

.risk-caution {
	color: #f0a020;
}

.risk-storm {
	color: #e04b3a;
}

.history__body {
	display: flex;
	flex-direction: column;
	gap: 0.15rem;
	min-width: 0;
	flex: 1;
}

.history__title {
	font-size: 0.9rem;
	font-weight: 600;
	color: #414042;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.history__meta {
	font-size: 0.75rem;
	color: #6b6a6d;
}

.history__chevron {
	color: #9b9aa0;
}

html.dark .history__empty,
html.dark .history__meta {
	color: var(--dm-text-2);
}

html.dark .history__item {
	background: var(--dm-bg-mute);
	border-color: var(--dm-border);
}

html.dark .history__item:hover {
	border-color: var(--dm-blue-soft);
}

html.dark .history__title {
	color: var(--dm-text-1);
}

html.dark .risk-clear {
	color: #5cb85c;
}

html.dark .risk-caution {
	color: #f2b13d;
}

html.dark .risk-storm {
	color: #ff6b6b;
}
</style>
