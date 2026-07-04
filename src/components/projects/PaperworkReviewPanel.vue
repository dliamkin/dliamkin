<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import DatePicker from "primevue/datepicker";
import Message from "primevue/message";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Tag from "primevue/tag";
import ToggleSwitch from "primevue/toggleswitch";
import { useToast } from "primevue/usetoast";
import { buildIcs, buildRrule, googleCalendarUrl, type IcsEvent } from "@/lib/ics";
import { describeResolution, isPast, resolveDate } from "@/lib/paperwork-dates";
import type { ObligationEvent, ObligationExtraction } from "@/lib/paperwork";

// The review-and-edit step: nothing goes on a calendar un-reviewed. The
// visitor resolves unresolved dates (deterministic arithmetic in
// paperwork-dates.ts — the model only identified what math was needed),
// toggles events, edits titles and reminder lead times, then exports a
// client-side .ics. The export never round-trips through a server.

const props = defineProps<{
	extraction: ObligationExtraction;
	todayIso: string; // the "today" the extraction was produced against
}>();

const toast = useToast();

const NOT_ADVICE_LINE =
	"Automated extraction for demonstration — verify every date against your document. Not legal or financial advice.";

type ReviewBasis = "stated" | "computed" | "unresolved" | "computed_from_input";

interface ReviewEvent {
	source: ObligationEvent;
	included: boolean;
	title: string;
	date: string | null;
	basis: ReviewBasis;
	computation: string | null;
	reminderDays: number;
	recurring: boolean; // export as RRULE vs single next occurrence
	expanded: boolean;
	anchorInput: Date | null; // resolve-panel date picker model
}

const REMINDER_OPTIONS = [1, 3, 7, 14, 30].map((days) => ({
	label: `${days} day${days === 1 ? "" : "s"} before`,
	value: days,
}));

function toReviewEvent(event: ObligationEvent): ReviewEvent {
	return {
		source: event,
		// Already-passed and informational dates default off — they'd pollute
		// the calendar; re-check them to include.
		included: !event.in_past && event.category !== "informational",
		title: event.title,
		date: event.date,
		basis: event.date_basis,
		computation: event.computation,
		reminderDays: normalizeReminder(event.suggested_reminder_days),
		recurring: event.recurrence !== null,
		expanded: false,
		anchorInput: null,
	};
}

function normalizeReminder(days: number): number {
	// Snap the model's suggestion onto the editable options.
	return REMINDER_OPTIONS.reduce(
		(best, option) =>
			Math.abs(option.value - days) < Math.abs(best - days) ? option.value : best,
		REMINDER_OPTIONS[0]!.value,
	);
}

const events = reactive<ReviewEvent[]>(props.extraction.events.map(toReviewEvent));
watch(
	() => props.extraction,
	(extraction) => {
		events.splice(0, events.length, ...extraction.events.map(toReviewEvent));
		showPast.value = false;
	},
);

const showPast = ref(false);

const upcoming = computed(() => events.filter((e) => !e.source.in_past));
const past = computed(() => events.filter((e) => e.source.in_past));
const unresolved = computed(() => events.filter((e) => e.basis === "unresolved"));

const selected = computed(() =>
	events.filter((e) => e.included && e.date !== null && e.basis !== "unresolved"),
);

const nextUp = computed(() => {
	const future = selected.value
		.filter((e) => e.date !== null && !isPast(e.date, props.todayIso))
		.sort((a, b) => (a.date! < b.date! ? -1 : 1));
	return future[0] ?? null;
});

// --- Resolve-flow -----------------------------------------------------------

// DatePicker yields a local-time Date; format via local parts (not
// toISOString, which can shift the day across the UTC boundary).
function pickedToIso(picked: Date): string {
	const y = picked.getFullYear();
	const m = String(picked.getMonth() + 1).padStart(2, "0");
	const d = String(picked.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

function applyAnchor(event: ReviewEvent) {
	if (!event.anchorInput) return;
	const anchorIso = pickedToIso(event.anchorInput);
	if (event.source.resolution) {
		// The model identified the offset; the arithmetic runs here, in code.
		event.date = resolveDate(anchorIso, event.source.resolution);
		event.computation = describeResolution(anchorIso, event.source.resolution);
	} else {
		// No structured offset — the picked date IS the event date.
		event.date = anchorIso;
		event.computation = "date supplied directly by you";
	}
	event.basis = "computed_from_input";
	if (!event.source.in_past && event.source.category !== "informational") {
		event.included = true;
	}
}

function basisTag(event: ReviewEvent): { label: string; severity: string; tooltip: string } {
	switch (event.basis) {
		case "stated":
			return {
				label: "stated",
				severity: "success",
				tooltip: "This date is written in the document.",
			};
		case "computed":
			return {
				label: "computed",
				severity: "info",
				tooltip: event.computation ?? "Computed from an anchor date in the document.",
			};
		case "computed_from_input":
			return {
				label: "computed (from your input)",
				severity: "info",
				tooltip: event.computation ?? "Computed from the anchor date you supplied.",
			};
		case "unresolved":
			return {
				label: "needs your input",
				severity: "warn",
				tooltip:
					event.computation ??
					"The document doesn't contain the anchor date needed to compute this.",
			};
	}
}

const CATEGORY_LABELS: Record<ObligationEvent["category"], string> = {
	deadline: "deadline",
	notice_window_opens: "notice window opens",
	notice_window_closes: "notice window closes",
	payment: "payment",
	renewal_or_expiration: "renewal / expiration",
	required_action: "required action",
	informational: "informational",
};

const STAKES_SEVERITY: Record<ObligationEvent["stakes"], string> = {
	high: "danger",
	medium: "warn",
	low: "secondary",
};

// --- Export -----------------------------------------------------------------

function toIcsEvent(event: ReviewEvent): IcsEvent {
	const reminderLine = `Reminder set for ${event.reminderDays} day${event.reminderDays === 1 ? "" : "s"} before.`;
	return {
		id: event.source.id,
		uidSeed: event.source.source_excerpt,
		summary: event.title,
		description: [
			event.source.details,
			`Source: "${event.source.source_excerpt}"`,
			reminderLine,
			NOT_ADVICE_LINE,
		].join("\n"),
		date: event.date!,
		rrule:
			event.recurring && event.source.recurrence
				? buildRrule(event.source.recurrence)
				: null,
		reminderDaysBefore: event.reminderDays,
	};
}

const calendarName = computed(() => props.extraction.document_label ?? "Paperwork deadlines");

function downloadIcs() {
	const ics = buildIcs(selected.value.map(toIcsEvent), {
		calendarName: calendarName.value,
	});
	const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = `${(props.extraction.document_label ?? "paperwork").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-events.ics`;
	link.click();
	URL.revokeObjectURL(url);
}

async function copyAsText() {
	const lines = selected.value
		.slice()
		.sort((a, b) => (a.date! < b.date! ? -1 : 1))
		.map((e) => {
			const recurring =
				e.recurring && e.source.recurrence ? ` (${e.source.recurrence.description})` : "";
			return `${e.date} — ${e.title}${recurring} — reminder ${e.reminderDays} day${e.reminderDays === 1 ? "" : "s"} before`;
		});
	try {
		await navigator.clipboard.writeText(lines.join("\n"));
		toast.add({
			severity: "success",
			summary: "Copied",
			detail: `${lines.length} event${lines.length === 1 ? "" : "s"} copied as text.`,
			life: 3000,
		});
	} catch {
		toast.add({
			severity: "error",
			summary: "Couldn't copy",
			detail: "Your browser blocked clipboard access.",
			life: 4000,
		});
	}
}

function googleLink(event: ReviewEvent): string {
	return googleCalendarUrl(toIcsEvent(event));
}
</script>

<template>
	<div class="review-panel">
		<p class="not-advice">
			<i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
			Automated extraction for demonstration — verify every date against your document.
			Not legal or financial advice.
		</p>

		<div class="doc-line">
			<span v-if="extraction.document_label" class="doc-label">
				{{ extraction.document_label }}
			</span>
			<span
				v-for="anchor in extraction.anchor_dates"
				:key="anchor.label"
				class="anchor-chip"
			>
				{{ anchor.label }}: <strong>{{ anchor.date }}</strong>
			</span>
		</div>

		<Message
			v-if="unresolved.length > 0"
			severity="warn"
			:closable="false"
			class="resolve-panel"
		>
			<div class="resolve-content">
				<p class="resolve-title">
					{{ unresolved.length }} date{{ unresolved.length === 1 ? "" : "s" }} need{{
						unresolved.length === 1 ? "s" : ""
					}}
					your input
				</p>
				<p class="resolve-sub">
					The document doesn't contain the anchor date{{
						unresolved.length === 1 ? "" : "s"
					}}
					needed — supply {{ unresolved.length === 1 ? "it" : "them" }} and the date is
					computed in your browser, not guessed by the model.
				</p>
				<div v-for="event in unresolved" :key="event.source.id" class="resolve-row">
					<div class="resolve-info">
						<strong>{{ event.title }}</strong>
						<span class="resolve-need">{{
							event.computation ?? "needs a date from you"
						}}</span>
					</div>
					<div class="resolve-input">
						<DatePicker
							v-model="event.anchorInput"
							:placeholder="event.source.resolution?.anchor_label ?? 'Pick the date'"
							date-format="yy-mm-dd"
							show-icon
							icon-display="input"
						/>
						<Button
							label="Resolve"
							size="small"
							:disabled="!event.anchorInput"
							@click="applyAnchor(event)"
						/>
					</div>
				</div>
			</div>
		</Message>

		<ul class="event-list" aria-label="Extracted events">
			<li
				v-for="event in upcoming"
				:key="event.source.id"
				class="event-row"
				:class="{ excluded: !event.included }"
			>
				<div class="row-main">
					<Checkbox
						v-model="event.included"
						binary
						:disabled="event.date === null"
						:aria-label="`Include ${event.title}`"
					/>
					<div class="row-fields">
						<div class="row-top">
							<InputText
								v-model="event.title"
								class="title-input"
								:aria-label="`Title for ${event.source.title}`"
							/>
							<button
								type="button"
								class="expand-toggle"
								:aria-expanded="event.expanded"
								@click="event.expanded = !event.expanded"
							>
								<i
									:class="
										event.expanded
											? 'fa-solid fa-chevron-up'
											: 'fa-solid fa-chevron-down'
									"
									aria-hidden="true"
								></i>
								<span class="visually-hidden">Toggle details</span>
							</button>
						</div>
						<div class="row-meta">
							<span class="event-date" :class="{ missing: event.date === null }">
								{{ event.date ?? "—" }}
							</span>
							<Tag
								v-tooltip.top="basisTag(event).tooltip"
								:value="basisTag(event).label"
								:severity="basisTag(event).severity"
								class="basis-tag"
							/>
							<Tag
								:value="CATEGORY_LABELS[event.source.category]"
								severity="secondary"
							/>
							<Tag
								:value="`${event.source.stakes} stakes`"
								:severity="STAKES_SEVERITY[event.source.stakes]"
							/>
							<Tag
								v-if="event.source.recurrence"
								:value="event.source.recurrence.description"
								severity="contrast"
							/>
							<Select
								v-model="event.reminderDays"
								:options="REMINDER_OPTIONS"
								option-label="label"
								option-value="value"
								class="reminder-select"
								:aria-label="`Reminder lead time for ${event.title}`"
							/>
						</div>
					</div>
				</div>
				<div v-if="event.expanded" class="row-expansion">
					<blockquote class="source-excerpt">
						“{{ event.source.source_excerpt }}”
					</blockquote>
					<p class="event-details">{{ event.source.details }}</p>
					<p v-if="event.computation" class="event-computation">
						<i class="fa-solid fa-calculator" aria-hidden="true"></i>
						{{ event.computation }}
					</p>
					<div class="expansion-actions">
						<label v-if="event.source.recurrence" class="recurring-toggle">
							<ToggleSwitch v-model="event.recurring" />
							<span>{{
								event.recurring
									? "Recurring event (repeats in your calendar)"
									: "Single event (next occurrence only)"
							}}</span>
						</label>
						<a
							v-if="event.date"
							:href="googleLink(event)"
							target="_blank"
							rel="noopener noreferrer"
							class="google-link"
						>
							<i class="fa-brands fa-google" aria-hidden="true"></i>
							Add to Google Calendar
						</a>
					</div>
				</div>
			</li>
		</ul>

		<details v-if="past.length > 0" class="past-section" :open="showPast">
			<summary @click.prevent="showPast = !showPast">
				<i class="fa-solid fa-clock-rotate-left" aria-hidden="true"></i>
				Already passed ({{ past.length }}) — excluded from the export by default
			</summary>
			<ul class="event-list">
				<li
					v-for="event in past"
					:key="event.source.id"
					class="event-row past"
					:class="{ excluded: !event.included }"
				>
					<div class="row-main">
						<Checkbox
							v-model="event.included"
							binary
							:aria-label="`Include ${event.title}`"
						/>
						<div class="row-fields">
							<div class="row-top">
								<span class="past-title">{{ event.title }}</span>
							</div>
							<div class="row-meta">
								<span class="event-date overdue">
									<i
										class="fa-solid fa-triangle-exclamation"
										aria-hidden="true"
									></i>
									{{ event.date }}
								</span>
								<Tag
									:value="CATEGORY_LABELS[event.source.category]"
									severity="secondary"
								/>
								<span class="past-note">already passed</span>
							</div>
						</div>
					</div>
				</li>
			</ul>
		</details>

		<div v-if="extraction.ambiguities.length > 0" class="ambiguities">
			<p class="ambiguities-title">
				<i class="fa-solid fa-circle-question" aria-hidden="true"></i>
				The model declined to guess:
			</p>
			<ul>
				<li v-for="(item, index) in extraction.ambiguities" :key="index">{{ item }}</li>
			</ul>
		</div>

		<div class="summary-bar">
			<div class="summary-info">
				<strong>{{ selected.length }}</strong>
				event{{ selected.length === 1 ? "" : "s" }} selected
				<span v-if="nextUp" class="next-up">
					· next up: {{ nextUp.title }} on {{ nextUp.date }}
				</span>
			</div>
			<div class="summary-actions">
				<Button
					label="Download .ics"
					icon="fa-solid fa-calendar-plus"
					:disabled="selected.length === 0"
					@click="downloadIcs"
				/>
				<Button
					label="Copy as text"
					icon="fa-regular fa-copy"
					severity="secondary"
					outlined
					:disabled="selected.length === 0"
					@click="copyAsText"
				/>
			</div>
		</div>
		<p class="export-note">
			The .ics file is generated entirely in your browser from the reviewed events above —
			it never touches a server. Import it into Google Calendar, Apple Calendar, or
			Outlook; re-importing an updated file updates events instead of duplicating them.
		</p>
	</div>
</template>

<style scoped>
.review-panel {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

.not-advice {
	font-size: 0.85rem;
	font-weight: 700;
	color: #8a5a00;
	background: #fdf0d7;
	border: 1px solid #ecd7a3;
	border-radius: 6px;
	padding: 0.5rem 0.75rem;
}

.not-advice i {
	margin-right: 0.4rem;
}

.doc-line {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 0.5rem;
}

.doc-label {
	font-weight: 700;
	font-size: 1.05rem;
}

.anchor-chip {
	font-size: 0.8rem;
	color: #6b6a6d;
	background: #f2f4f6;
	border-radius: 999px;
	padding: 0.2rem 0.65rem;
}

.resolve-content {
	display: flex;
	flex-direction: column;
	gap: 0.6rem;
}

.resolve-title {
	font-weight: 700;
	font-size: 1rem;
}

.resolve-sub {
	font-size: 0.85rem;
}

.resolve-row {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 0.75rem;
	padding: 0.6rem 0;
	border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.resolve-info {
	display: flex;
	flex-direction: column;
	gap: 0.2rem;
	min-width: 220px;
}

.resolve-need {
	font-size: 0.82rem;
	font-style: italic;
}

.resolve-input {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.event-list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 0.6rem;
}

.event-row {
	border: 1px solid rgba(0, 0, 0, 0.12);
	border-radius: 8px;
	padding: 0.75rem 0.9rem;
	background: #fff;
	transition: opacity 0.15s ease;
}

.event-row.excluded {
	opacity: 0.55;
}

.event-row.past {
	background: #fbf7f7;
}

.row-main {
	display: flex;
	align-items: flex-start;
	gap: 0.75rem;
}

.row-fields {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 0.45rem;
}

.row-top {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.title-input {
	flex: 1;
	font-weight: 600;
	font-size: 0.92rem;
}

.past-title {
	font-weight: 600;
	font-size: 0.92rem;
}

.expand-toggle {
	border: none;
	background: none;
	cursor: pointer;
	color: #6b6a6d;
	padding: 0.35rem;
	border-radius: 4px;
}

.expand-toggle:hover {
	background: #f2f4f6;
}

.visually-hidden {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip: rect(0 0 0 0);
}

.row-meta {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 0.4rem;
}

.event-date {
	font-variant-numeric: tabular-nums;
	font-weight: 700;
	font-size: 0.9rem;
	margin-right: 0.2rem;
}

.event-date.missing {
	color: #9b9aa0;
}

.event-date.overdue {
	color: #c0392b;
}

.event-date.overdue i {
	margin-right: 0.3rem;
}

.basis-tag {
	text-transform: none;
}

.reminder-select {
	margin-left: auto;
	font-size: 0.82rem;
}

.row-expansion {
	margin-top: 0.7rem;
	padding-top: 0.7rem;
	border-top: 1px dashed rgba(0, 0, 0, 0.12);
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.source-excerpt {
	margin: 0;
	padding: 0.5rem 0.85rem;
	border-left: 3px solid #27a9e0;
	background: #f4fafd;
	font-style: italic;
	font-size: 0.88rem;
	color: #414042;
}

.event-details {
	font-size: 0.88rem;
	color: #6b6a6d;
}

.event-computation {
	font-size: 0.85rem;
	color: #1a6d94;
	font-variant-numeric: tabular-nums;
}

.event-computation i {
	margin-right: 0.35rem;
}

.expansion-actions {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 0.75rem;
}

.recurring-toggle {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	font-size: 0.85rem;
	cursor: pointer;
}

.google-link {
	font-size: 0.85rem;
	font-weight: 600;
	color: #27a9e0;
	text-decoration: none;
}

.google-link:hover {
	text-decoration: underline;
}

.google-link i {
	margin-right: 0.3rem;
}

.past-section summary {
	cursor: pointer;
	font-size: 0.9rem;
	font-weight: 600;
	color: #8a5a00;
	padding: 0.5rem 0;
}

.past-section summary i {
	margin-right: 0.4rem;
}

.past-section .event-list {
	margin-top: 0.6rem;
}

.past-note {
	font-size: 0.8rem;
	color: #c0392b;
	font-weight: 600;
}

.ambiguities {
	font-size: 0.88rem;
	color: #6b6a6d;
	background: #f8f9fa;
	border-radius: 8px;
	padding: 0.75rem 1rem;
}

.ambiguities-title {
	font-weight: 700;
	margin-bottom: 0.35rem;
}

.ambiguities ul {
	margin: 0;
	padding-left: 1.2rem;
}

.summary-bar {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 0.75rem;
	border: 1px solid rgba(39, 169, 224, 0.35);
	/* Solid fill — the bar is sticky and floats over event rows while
	   scrolling, so any transparency lets row content bleed through. */
	background: #eef8fd;
	border-radius: 8px;
	padding: 0.85rem 1rem;
	position: sticky;
	bottom: 0.75rem;
	box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
}

.summary-info {
	font-size: 0.92rem;
}

.next-up {
	color: #6b6a6d;
	font-size: 0.85rem;
}

.summary-actions {
	display: flex;
	gap: 0.6rem;
}

.export-note {
	font-size: 0.82rem;
	color: #9b9aa0;
}

@media (max-width: 700px) {
	.reminder-select {
		margin-left: 0;
	}

	.summary-bar {
		position: static;
	}
}
</style>
