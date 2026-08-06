<script setup lang="ts">
defineProps<{
	kind: string;
}>();
</script>

<template>
	<div class="vignette" aria-hidden="true">
		<!-- Clinical Note Structurer: scribbles flow into structured fields -->
		<svg
			v-if="kind === 'note-structurer'"
			viewBox="0 0 320 200"
			preserveAspectRatio="xMidYMid slice"
		>
			<rect x="18" y="32" width="118" height="136" rx="8" class="surface" />
			<path class="scribble s1" d="M32 58 q8 -7 16 0 t16 0 t16 0 t16 0 t16 -3" />
			<path class="scribble s2" d="M32 78 q8 6 16 0 t16 0 t16 2 t16 -2 t10 0" />
			<path class="scribble s3" d="M32 98 q8 -5 16 0 t16 0 t16 0 t14 2" />
			<path class="scribble s4" d="M32 118 q8 6 16 0 t16 -2 t16 2 t16 0 t12 0" />
			<path class="scribble s5" d="M32 138 q8 -6 16 0 t16 0 t12 0" />
			<path class="flow" d="M146 100 h24" />
			<path class="flow" d="M164 93 l10 7 -10 7" fill="none" />
			<g class="field f1">
				<rect x="184" y="46" width="116" height="30" rx="6" class="field-box" />
				<rect x="192" y="56" width="34" height="10" rx="3" class="field-label" />
				<circle cx="288" cy="61" r="5" class="field-dot" />
			</g>
			<g class="field f2">
				<rect x="184" y="88" width="116" height="30" rx="6" class="field-box" />
				<rect x="192" y="98" width="26" height="10" rx="3" class="field-label" />
				<circle cx="288" cy="103" r="5" class="field-dot" />
			</g>
			<g class="field f3">
				<rect x="184" y="130" width="116" height="30" rx="6" class="field-box" />
				<rect x="192" y="140" width="42" height="10" rx="3" class="field-label" />
				<circle cx="288" cy="145" r="5" class="field-dot" />
			</g>
		</svg>

		<!-- Screenshot → PrimeVue: scan beam over a screenshot, components pop in -->
		<svg
			v-else-if="kind === 'screenshot-to-primevue'"
			viewBox="0 0 320 200"
			preserveAspectRatio="xMidYMid slice"
		>
			<rect x="20" y="32" width="126" height="136" rx="8" class="shot" />
			<rect x="32" y="48" width="70" height="10" rx="3" class="ghost" />
			<rect x="32" y="70" width="100" height="8" rx="3" class="ghost" />
			<rect x="32" y="86" width="88" height="8" rx="3" class="ghost" />
			<rect x="32" y="112" width="56" height="18" rx="9" class="ghost" />
			<line x1="26" y1="44" x2="140" y2="44" class="beam" />
			<g class="comp c1">
				<rect x="184" y="46" width="86" height="26" rx="13" class="btn" />
			</g>
			<g class="comp c2">
				<rect x="184" y="86" width="116" height="26" rx="6" class="input" />
				<rect x="192" y="94" width="40" height="9" rx="3" class="ghost" />
			</g>
			<g class="comp c3">
				<rect x="184" y="126" width="116" height="42" rx="6" class="panel" />
				<path d="M184 138 v-6 a6 6 0 0 1 6 -6 h104 a6 6 0 0 1 6 6 v6 z" class="panel-top" />
			</g>
		</svg>

		<!-- Lease Diff: two documents, removed/added lines pulsing -->
		<svg
			v-else-if="kind === 'lease-diff'"
			viewBox="0 0 320 200"
			preserveAspectRatio="xMidYMid slice"
		>
			<rect x="26" y="30" width="120" height="140" rx="8" class="surface" />
			<rect x="174" y="30" width="120" height="140" rx="8" class="surface" />
			<g>
				<rect x="42" y="48" width="88" height="6" rx="3" class="ghost" />
				<rect x="42" y="66" width="74" height="6" rx="3" class="ghost" />
				<rect x="42" y="84" width="88" height="8" rx="4" class="diff-del" />
				<rect x="42" y="104" width="82" height="6" rx="3" class="ghost" />
				<rect x="42" y="122" width="88" height="6" rx="3" class="ghost" />
				<rect x="42" y="140" width="60" height="6" rx="3" class="ghost" />
			</g>
			<g>
				<rect x="190" y="48" width="88" height="6" rx="3" class="ghost" />
				<rect x="190" y="66" width="74" height="6" rx="3" class="ghost" />
				<rect x="190" y="84" width="88" height="8" rx="4" class="diff-add" />
				<rect x="190" y="104" width="70" height="8" rx="4" class="diff-add d2" />
				<rect x="190" y="122" width="88" height="6" rx="3" class="ghost" />
				<rect x="190" y="140" width="60" height="6" rx="3" class="ghost" />
			</g>
			<path class="flow" d="M150 96 l8 6 -8 6" fill="none" />
		</svg>

		<!-- Paperwork → Calendar: chips fly from a document into calendar cells -->
		<svg
			v-else-if="kind === 'paperwork-to-calendar'"
			viewBox="0 0 320 200"
			preserveAspectRatio="xMidYMid slice"
		>
			<rect x="24" y="34" width="100" height="132" rx="8" class="surface" />
			<rect x="38" y="52" width="60" height="7" rx="3" class="ghost" />
			<rect x="38" y="70" width="72" height="7" rx="3" class="ghost" />
			<rect x="38" y="88" width="66" height="7" rx="3" class="ghost" />
			<rect x="38" y="106" width="72" height="7" rx="3" class="ghost" />
			<rect x="38" y="124" width="50" height="7" rx="3" class="ghost" />
			<rect x="168" y="40" width="128" height="124" rx="8" class="surface" />
			<path d="M168 62 v-14 a8 8 0 0 1 8 -8 h112 a8 8 0 0 1 8 8 v14 z" class="cal-head" />
			<g class="cal-grid">
				<template v-for="row in 4" :key="row">
					<rect
						v-for="col in 5"
						:key="col"
						:x="176 + (col - 1) * 24"
						:y="70 + (row - 1) * 23"
						width="18"
						height="16"
						rx="3"
						class="cal-cell"
					/>
				</template>
			</g>
			<rect x="200" y="93" width="18" height="16" rx="3" class="cal-cell cal-hot h1" />
			<rect x="248" y="116" width="18" height="16" rx="3" class="cal-cell cal-hot h2" />
			<rect x="176" y="139" width="18" height="16" rx="3" class="cal-cell cal-hot h3" />
			<rect x="40" y="68" width="18" height="10" rx="3" class="chip ch1" />
			<rect x="40" y="104" width="18" height="10" rx="3" class="chip ch2" />
		</svg>

		<!-- Dependency Upgrade Planner: staircase with a drawn upgrade path -->
		<svg
			v-else-if="kind === 'upgrade-planner'"
			viewBox="0 0 320 200"
			preserveAspectRatio="xMidYMid slice"
		>
			<line x1="26" y1="170" x2="294" y2="170" class="axis" />
			<rect x="40" y="140" width="36" height="30" rx="4" class="step" />
			<rect x="90" y="115" width="36" height="55" rx="4" class="step" />
			<rect x="140" y="90" width="36" height="80" rx="4" class="step" />
			<rect x="190" y="65" width="36" height="105" rx="4" class="step" />
			<rect x="240" y="40" width="36" height="130" rx="4" class="step" />
			<path class="up-path" d="M58 134 L108 109 L158 84 L208 59 L258 34" />
			<path class="up-head" d="M249 34 l9 0 0 9" fill="none" />
			<circle cx="58" cy="134" r="5" class="up-dot u1" />
			<circle cx="108" cy="109" r="5" class="up-dot u2" />
			<circle cx="158" cy="84" r="5" class="up-dot u3" />
			<circle cx="208" cy="59" r="5" class="up-dot u4" />
			<circle cx="258" cy="34" r="5" class="up-dot u5" />
		</svg>

		<!-- Dry-Run Oracle: storm cloud, flashing bolt, falling token drops -->
		<svg
			v-else-if="kind === 'dry-run-oracle'"
			viewBox="0 0 320 200"
			preserveAspectRatio="xMidYMid slice"
		>
			<g class="cloud">
				<circle cx="122" cy="70" r="26" />
				<circle cx="158" cy="58" r="32" />
				<circle cx="196" cy="70" r="24" />
				<rect x="100" y="66" width="120" height="30" rx="15" />
			</g>
			<polygon class="bolt" points="158,98 143,130 156,130 146,162 174,122 160,122 170,98" />
			<circle cx="112" cy="106" r="4" class="drop dr1" />
			<circle cx="196" cy="102" r="4" class="drop dr2" />
			<circle cx="222" cy="98" r="4" class="drop dr3" />
			<circle cx="90" cy="100" r="4" class="drop dr4" />
			<rect x="60" y="176" width="200" height="8" rx="4" class="meter-track" />
			<rect x="60" y="176" width="200" height="8" rx="4" class="meter-fill" />
		</svg>

		<!-- Tail Risk Lab: right-skewed histogram with a hot tail and P95 line -->
		<svg
			v-else-if="kind === 'tail-risk-lab'"
			viewBox="0 0 320 200"
			preserveAspectRatio="xMidYMid slice"
		>
			<line x1="24" y1="166" x2="296" y2="166" class="axis" />
			<g class="hist">
				<rect x="30" y="126" width="12" height="40" rx="2" />
				<rect x="46" y="78" width="12" height="88" rx="2" />
				<rect x="62" y="48" width="12" height="118" rx="2" />
				<rect x="78" y="66" width="12" height="100" rx="2" />
				<rect x="94" y="88" width="12" height="78" rx="2" />
				<rect x="110" y="104" width="12" height="62" rx="2" />
				<rect x="126" y="116" width="12" height="50" rx="2" />
				<rect x="142" y="126" width="12" height="40" rx="2" />
				<rect x="158" y="133" width="12" height="33" rx="2" />
				<rect x="174" y="139" width="12" height="27" rx="2" />
				<rect x="190" y="144" width="12" height="22" rx="2" />
				<rect x="206" y="148" width="12" height="18" rx="2" />
				<rect x="222" y="151" width="12" height="15" rx="2" class="tail" />
				<rect x="238" y="154" width="12" height="12" rx="2" class="tail" />
				<rect x="254" y="156" width="12" height="10" rx="2" class="tail" />
				<rect x="270" y="158" width="12" height="8" rx="2" class="tail" />
			</g>
			<line x1="230" y1="54" x2="230" y2="166" class="p95" />
		</svg>

		<!-- Noise Translator: live equalizer bars -->
		<svg
			v-else-if="kind === 'noise-translator'"
			viewBox="0 0 320 200"
			preserveAspectRatio="xMidYMid slice"
		>
			<line x1="20" y1="100" x2="300" y2="100" class="eq-base" />
			<g class="eq">
				<rect x="28" y="84" width="8" height="32" rx="4" />
				<rect x="42" y="72" width="8" height="56" rx="4" />
				<rect x="56" y="60" width="8" height="80" rx="4" />
				<rect x="70" y="78" width="8" height="44" rx="4" />
				<rect x="84" y="55" width="8" height="90" rx="4" />
				<rect x="98" y="68" width="8" height="64" rx="4" />
				<rect x="112" y="50" width="8" height="100" rx="4" />
				<rect x="126" y="74" width="8" height="52" rx="4" />
				<rect x="140" y="60" width="8" height="80" rx="4" />
				<rect x="154" y="45" width="8" height="110" rx="4" />
				<rect x="168" y="66" width="8" height="68" rx="4" />
				<rect x="182" y="55" width="8" height="90" rx="4" />
				<rect x="196" y="76" width="8" height="48" rx="4" />
				<rect x="210" y="62" width="8" height="76" rx="4" />
				<rect x="224" y="52" width="8" height="96" rx="4" />
				<rect x="238" y="72" width="8" height="56" rx="4" />
				<rect x="252" y="80" width="8" height="40" rx="4" />
				<rect x="266" y="70" width="8" height="60" rx="4" />
				<rect x="280" y="86" width="8" height="28" rx="4" />
			</g>
		</svg>

		<!-- ToS Watchdog: document under a rotating radar sweep -->
		<svg
			v-else-if="kind === 'tos-watch'"
			viewBox="0 0 320 200"
			preserveAspectRatio="xMidYMid slice"
		>
			<rect x="30" y="36" width="110" height="130" rx="8" class="surface" />
			<rect x="44" y="54" width="70" height="7" rx="3" class="ghost" />
			<rect x="44" y="72" width="82" height="7" rx="3" class="ghost" />
			<rect x="44" y="90" width="82" height="8" rx="4" class="changed" />
			<rect x="44" y="110" width="76" height="7" rx="3" class="ghost" />
			<rect x="44" y="128" width="82" height="7" rx="3" class="ghost" />
			<rect x="44" y="146" width="56" height="7" rx="3" class="ghost" />
			<circle cx="234" cy="96" r="52" class="radar-ring" />
			<circle cx="234" cy="96" r="34" class="radar-ring faint" />
			<circle cx="234" cy="96" r="16" class="radar-ring faint" />
			<g class="sweep">
				<path d="M234 96 L234 44 A52 52 0 0 1 260 51 Z" class="sweep-wedge" />
				<line x1="234" y1="96" x2="234" y2="44" class="sweep-line" />
			</g>
			<circle cx="256" cy="74" r="4" class="blip" />
		</svg>

		<!-- Token Field: a particle swarm condensing into ordered rows -->
		<svg
			v-else-if="kind === 'particle-engine'"
			viewBox="0 0 320 200"
			preserveAspectRatio="xMidYMid slice"
		>
			<g class="tf-swarm">
				<circle cx="38" cy="58" r="3" class="tf-dot" />
				<circle cx="62" cy="112" r="2.4" class="tf-dot t2" />
				<circle cx="50" cy="152" r="2.8" class="tf-dot t3" />
				<circle cx="84" cy="44" r="2.2" class="tf-dot t4" />
				<circle cx="96" cy="90" r="3.2" class="tf-dot t5" />
				<circle cx="78" cy="132" r="2.4" class="tf-dot t2" />
				<circle cx="112" cy="60" r="2.6" class="tf-dot t3" />
				<circle cx="120" cy="150" r="2.2" class="tf-dot t4" />
				<circle cx="134" cy="104" r="2.8" class="tf-dot t5" />
				<circle cx="104" cy="170" r="2.2" class="tf-dot" />
				<circle cx="130" cy="34" r="2.4" class="tf-dot t2" />
				<circle cx="46" cy="86" r="2.2" class="tf-dot t4" />
			</g>
			<path class="flow" d="M148 100 h24" />
			<path class="flow" d="M166 93 l10 7 -10 7" fill="none" />
			<g class="tf-formed">
				<g v-for="row in 4" :key="row">
					<circle
						v-for="col in 8"
						:key="col"
						:cx="192 + (col - 1) * 14"
						:cy="70 + (row - 1) * 20"
						r="2.6"
						class="tf-grid-dot"
						:style="{ animationDelay: `${((row - 1) * 8 + col) * 0.09}s` }"
					/>
				</g>
			</g>
		</svg>

		<!-- Fallback: gentle pulsing dots -->
		<svg v-else viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice">
			<circle cx="130" cy="100" r="8" class="fb-dot" />
			<circle cx="160" cy="100" r="8" class="fb-dot d2" />
			<circle cx="190" cy="100" r="8" class="fb-dot d3" />
		</svg>
	</div>
</template>

<style scoped>
.vignette {
	--vg-panel-a: #eef6fb;
	--vg-panel-b: #e0eef8;
	--vg-surface: #ffffff;
	--vg-ink: #9aa4ad;
	--vg-ink-soft: #c9d2d9;
	--vg-accent: #27a9e0;
	--vg-accent-soft: #8fd4f2;
	--vg-warn: #e8963c;
	--vg-danger: #e05c5c;
	--vg-ok: #46b380;
	width: 100%;
	height: 100%;
	background: linear-gradient(135deg, var(--vg-panel-a), var(--vg-panel-b));
}

html.dark .vignette {
	--vg-panel-a: #1a2027;
	--vg-panel-b: #16222e;
	--vg-surface: #232b35;
	--vg-ink: #6b7887;
	--vg-ink-soft: #3d4854;
	--vg-accent: #3db5e8;
	--vg-accent-soft: #2a7ba6;
	--vg-warn: #d99a4e;
	--vg-danger: #d96a6a;
	--vg-ok: #4fae82;
}

.vignette svg {
	width: 100%;
	height: 100%;
	display: block;
}

/* Shared parts */
.surface {
	fill: var(--vg-surface);
	stroke: var(--vg-ink-soft);
	stroke-width: 1.5;
}

.ghost {
	fill: var(--vg-ink-soft);
}

.flow {
	stroke: var(--vg-accent);
	stroke-width: 2.5;
	stroke-linecap: round;
	stroke-linejoin: round;
	fill: none;
}

.axis {
	stroke: var(--vg-ink-soft);
	stroke-width: 2;
	stroke-linecap: round;
}

/* Note structurer */
.scribble {
	fill: none;
	stroke: var(--vg-ink);
	stroke-width: 2;
	stroke-linecap: round;
	animation: wobble 2.4s ease-in-out infinite alternate;
}

.s2 {
	animation-delay: 0.3s;
}
.s3 {
	animation-delay: 0.6s;
}
.s4 {
	animation-delay: 0.9s;
}
.s5 {
	animation-delay: 1.2s;
}

@keyframes wobble {
	from {
		opacity: 0.45;
	}
	to {
		opacity: 0.95;
	}
}

.field-box {
	fill: var(--vg-surface);
	stroke: var(--vg-ink-soft);
	stroke-width: 1.5;
}

.field-label {
	fill: var(--vg-ink-soft);
}
.field-dot {
	fill: var(--vg-accent);
}

.field {
	animation: fieldPulse 4.2s ease-in-out infinite;
}
.f2 {
	animation-delay: 1.4s;
}
.f3 {
	animation-delay: 2.8s;
}

@keyframes fieldPulse {
	0%,
	100% {
		opacity: 0.55;
	}
	12%,
	30% {
		opacity: 1;
	}
	50% {
		opacity: 0.55;
	}
}

/* Screenshot → PrimeVue */
.shot {
	fill: var(--vg-surface);
	stroke: var(--vg-ink);
	stroke-width: 1.5;
	stroke-dasharray: 6 5;
}

.beam {
	stroke: var(--vg-accent);
	stroke-width: 2.5;
	stroke-linecap: round;
	animation: scan 3.6s ease-in-out infinite;
}

@keyframes scan {
	0%,
	100% {
		transform: translateY(0);
		opacity: 0.9;
	}
	45%,
	55% {
		transform: translateY(112px);
		opacity: 0.9;
	}
	50% {
		opacity: 0.4;
	}
}

.btn {
	fill: var(--vg-accent);
}
.input {
	fill: var(--vg-surface);
	stroke: var(--vg-ink-soft);
	stroke-width: 1.5;
}
.panel {
	fill: var(--vg-surface);
	stroke: var(--vg-ink-soft);
	stroke-width: 1.5;
}
.panel-top {
	fill: var(--vg-accent-soft);
}

.comp {
	transform-box: fill-box;
	transform-origin: center;
	animation: popIn 5.4s ease-in-out infinite;
	opacity: 0;
}
.c1 {
	animation-delay: 0.4s;
}
.c2 {
	animation-delay: 1.3s;
}
.c3 {
	animation-delay: 2.2s;
}

@keyframes popIn {
	0% {
		opacity: 0;
		transform: scale(0.85);
	}
	8%,
	72% {
		opacity: 1;
		transform: scale(1);
	}
	82%,
	100% {
		opacity: 0;
		transform: scale(0.95);
	}
}

/* Lease diff */
.diff-del {
	fill: var(--vg-danger);
	animation: diffPulse 3s ease-in-out infinite;
}
.diff-add {
	fill: var(--vg-ok);
	animation: diffPulse 3s ease-in-out infinite;
	animation-delay: 1.5s;
}
.d2 {
	animation-delay: 1.9s;
}

@keyframes diffPulse {
	0%,
	100% {
		opacity: 0.4;
	}
	20%,
	45% {
		opacity: 1;
	}
	70% {
		opacity: 0.4;
	}
}

/* Paperwork → Calendar */
.cal-head {
	fill: var(--vg-accent);
}
.cal-cell {
	fill: var(--vg-ink-soft);
	opacity: 0.55;
}

.cal-hot {
	fill: var(--vg-accent);
	animation: cellGlow 4.5s ease-in-out infinite;
	opacity: 0;
}
.h1 {
	animation-delay: 1.2s;
}
.h2 {
	animation-delay: 2.4s;
}
.h3 {
	animation-delay: 3.4s;
}

@keyframes cellGlow {
	0%,
	100% {
		opacity: 0;
	}
	12%,
	60% {
		opacity: 1;
	}
	80% {
		opacity: 0;
	}
}

.chip {
	fill: var(--vg-accent);
	animation: chipFly 4.5s ease-in-out infinite;
	opacity: 0;
}
.ch1 {
	animation-delay: 0.2s;
}
.ch2 {
	--chip-dx: 208px;
	--chip-dy: 14px;
	animation-delay: 1.4s;
}

@keyframes chipFly {
	0% {
		opacity: 0;
		transform: translate(0, 0);
	}
	8% {
		opacity: 1;
	}
	38% {
		opacity: 1;
		transform: translate(var(--chip-dx, 160px), var(--chip-dy, 27px));
	}
	48%,
	100% {
		opacity: 0;
		transform: translate(var(--chip-dx, 160px), var(--chip-dy, 27px));
	}
}

/* Upgrade planner */
.step {
	fill: var(--vg-ink-soft);
	opacity: 0.45;
}

.up-path {
	fill: none;
	stroke: var(--vg-accent);
	stroke-width: 3;
	stroke-linecap: round;
	stroke-dasharray: 230;
	animation: drawPath 4.8s ease-in-out infinite;
}

.up-head {
	stroke: var(--vg-accent);
	stroke-width: 3;
	stroke-linecap: round;
	animation: headBlink 4.8s ease-in-out infinite;
	opacity: 0;
}

@keyframes drawPath {
	0% {
		stroke-dashoffset: 230;
	}
	45%,
	85% {
		stroke-dashoffset: 0;
	}
	100% {
		stroke-dashoffset: 230;
	}
}

@keyframes headBlink {
	0%,
	40% {
		opacity: 0;
	}
	48%,
	82% {
		opacity: 1;
	}
	90%,
	100% {
		opacity: 0;
	}
}

.up-dot {
	fill: var(--vg-accent);
	animation: dotBlink 4.8s ease-in-out infinite;
	opacity: 0.25;
}
.u1 {
	animation-delay: 0s;
}
.u2 {
	animation-delay: 0.45s;
}
.u3 {
	animation-delay: 0.9s;
}
.u4 {
	animation-delay: 1.35s;
}
.u5 {
	animation-delay: 1.8s;
}

@keyframes dotBlink {
	0%,
	100% {
		opacity: 0.25;
	}
	12%,
	70% {
		opacity: 1;
	}
	85% {
		opacity: 0.25;
	}
}

/* Dry-run oracle */
.cloud circle,
.cloud rect {
	fill: var(--vg-surface);
}

.bolt {
	fill: var(--vg-warn);
	animation: flash 3.2s ease-in-out infinite;
}

@keyframes flash {
	0%,
	100% {
		opacity: 0.25;
	}
	8%,
	12% {
		opacity: 1;
	}
	10% {
		opacity: 0.4;
	}
	20%,
	60% {
		opacity: 0.9;
	}
	80% {
		opacity: 0.25;
	}
}

.drop {
	fill: var(--vg-accent);
	animation: fall 2.6s ease-in infinite;
	opacity: 0;
}
.dr1 {
	animation-delay: 0.2s;
}
.dr2 {
	animation-delay: 1s;
}
.dr3 {
	animation-delay: 1.7s;
}
.dr4 {
	animation-delay: 0.7s;
}

@keyframes fall {
	0% {
		opacity: 0;
		transform: translateY(0);
	}
	15% {
		opacity: 0.9;
	}
	70% {
		opacity: 0.9;
	}
	100% {
		opacity: 0;
		transform: translateY(54px);
	}
}

.meter-track {
	fill: var(--vg-ink-soft);
	opacity: 0.5;
}

.meter-fill {
	fill: var(--vg-accent);
	transform-box: fill-box;
	transform-origin: left center;
	animation: fillUp 5s ease-in-out infinite;
}

@keyframes fillUp {
	0% {
		transform: scaleX(0.05);
	}
	55%,
	85% {
		transform: scaleX(0.72);
	}
	100% {
		transform: scaleX(0.05);
	}
}

/* Tail risk lab */
.hist rect {
	fill: var(--vg-accent);
	opacity: 0.85;
	transform-box: fill-box;
	transform-origin: 50% 100%;
	animation: barGrow 5.2s ease-out infinite;
}

.hist rect.tail {
	fill: var(--vg-warn);
}

.hist rect:nth-child(1) {
	animation-delay: 0s;
}
.hist rect:nth-child(2) {
	animation-delay: 0.07s;
}
.hist rect:nth-child(3) {
	animation-delay: 0.14s;
}
.hist rect:nth-child(4) {
	animation-delay: 0.21s;
}
.hist rect:nth-child(5) {
	animation-delay: 0.28s;
}
.hist rect:nth-child(6) {
	animation-delay: 0.35s;
}
.hist rect:nth-child(7) {
	animation-delay: 0.42s;
}
.hist rect:nth-child(8) {
	animation-delay: 0.49s;
}
.hist rect:nth-child(9) {
	animation-delay: 0.56s;
}
.hist rect:nth-child(10) {
	animation-delay: 0.63s;
}
.hist rect:nth-child(11) {
	animation-delay: 0.7s;
}
.hist rect:nth-child(12) {
	animation-delay: 0.77s;
}
.hist rect:nth-child(13) {
	animation-delay: 0.84s;
}
.hist rect:nth-child(14) {
	animation-delay: 0.91s;
}
.hist rect:nth-child(15) {
	animation-delay: 0.98s;
}
.hist rect:nth-child(16) {
	animation-delay: 1.05s;
}

@keyframes barGrow {
	0% {
		transform: scaleY(0.05);
	}
	14% {
		transform: scaleY(1.06);
	}
	18%,
	88% {
		transform: scaleY(1);
	}
	97%,
	100% {
		transform: scaleY(0.05);
	}
}

.p95 {
	stroke: var(--vg-danger);
	stroke-width: 2;
	stroke-dasharray: 5 5;
	animation: p95Pulse 5.2s ease-in-out infinite;
}

@keyframes p95Pulse {
	0%,
	20% {
		opacity: 0;
	}
	35%,
	85% {
		opacity: 0.9;
	}
	100% {
		opacity: 0;
	}
}

/* Noise translator */
.eq-base {
	stroke: var(--vg-ink-soft);
	stroke-width: 1.5;
	opacity: 0.6;
}

.eq rect {
	fill: var(--vg-accent);
	transform-box: fill-box;
	transform-origin: center;
	animation: eqPulse 1.1s ease-in-out infinite alternate;
}

.eq rect:nth-child(even) {
	fill: var(--vg-accent-soft);
}
.eq rect:nth-child(3n) {
	animation-duration: 0.8s;
}
.eq rect:nth-child(3n + 1) {
	animation-duration: 1.3s;
}
.eq rect:nth-child(4n) {
	animation-delay: 0.25s;
}
.eq rect:nth-child(5n) {
	animation-delay: 0.5s;
	animation-duration: 0.95s;
}
.eq rect:nth-child(7n) {
	animation-delay: 0.12s;
}

@keyframes eqPulse {
	from {
		transform: scaleY(0.3);
	}
	to {
		transform: scaleY(1);
	}
}

/* ToS watchdog */
.changed {
	fill: var(--vg-accent);
	animation: changedFlash 4s ease-in-out infinite;
}

@keyframes changedFlash {
	0%,
	35%,
	100% {
		opacity: 0.35;
	}
	45%,
	75% {
		opacity: 1;
	}
}

.radar-ring {
	fill: none;
	stroke: var(--vg-ink);
	stroke-width: 1.5;
	opacity: 0.7;
}

.radar-ring.faint {
	opacity: 0.3;
}

.sweep {
	transform-box: view-box;
	transform-origin: 234px 96px;
	animation: sweepSpin 4s linear infinite;
}

.sweep-wedge {
	fill: var(--vg-accent);
	opacity: 0.25;
}

.sweep-line {
	stroke: var(--vg-accent);
	stroke-width: 2;
	stroke-linecap: round;
}

@keyframes sweepSpin {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
}

.blip {
	fill: var(--vg-accent);
	animation: blipBlink 4s ease-in-out infinite;
}

@keyframes blipBlink {
	0%,
	8%,
	60%,
	100% {
		opacity: 0;
	}
	14%,
	40% {
		opacity: 1;
	}
}

/* Fallback */
.fb-dot {
	fill: var(--vg-accent);
	animation: fbPulse 1.6s ease-in-out infinite;
}
.fb-dot.d2 {
	animation-delay: 0.25s;
}
.fb-dot.d3 {
	animation-delay: 0.5s;
}

@keyframes fbPulse {
	0%,
	100% {
		opacity: 0.3;
	}
	50% {
		opacity: 1;
	}
}

/* Token Field */
.tf-dot {
	fill: var(--vg-accent);
	opacity: 0.75;
	animation: tfDrift 3.2s ease-in-out infinite alternate;
}

.tf-dot.t2 {
	fill: var(--vg-accent-soft);
	animation-delay: 0.4s;
}
.tf-dot.t3 {
	animation-delay: 0.9s;
	animation-duration: 2.6s;
}
.tf-dot.t4 {
	fill: var(--vg-ink);
	animation-delay: 1.3s;
}
.tf-dot.t5 {
	fill: var(--vg-accent-soft);
	animation-delay: 1.8s;
	animation-duration: 3.8s;
}

@keyframes tfDrift {
	0% {
		transform: translate(0, 0);
	}
	100% {
		transform: translate(6px, -8px);
	}
}

.tf-grid-dot {
	fill: var(--vg-accent);
	animation: tfSettle 2.4s ease-in-out infinite;
}

@keyframes tfSettle {
	0%,
	100% {
		opacity: 0.35;
	}
	50% {
		opacity: 1;
	}
}

@media (prefers-reduced-motion: reduce) {
	.vignette * {
		animation: none !important;
	}

	.comp,
	.cal-hot,
	.chip,
	.up-head {
		opacity: 1;
	}
}
</style>
