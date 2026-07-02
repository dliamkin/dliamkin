<script setup lang="ts">
const checklist = [
	"PayPal and Major Credit Cards",
	"Easy/Secure Payments",
	"Google Analytics",
	"Custom Design",
	"Customer Support",
];
</script>

<template>
	<section class="ecommerce">
		<h2>Ecommerce, Your Way</h2>
		<p class="subtitle">We will set you up with everything your business needs to get going!</p>
		<div class="ecommerce-grid">
			<div class="flowchart">
				<img src="/images/ecommerce-flowchart.jpg" alt="Ecommerce flow" />
			</div>
			<ul class="checklist">
				<li v-for="item in checklist" :key="item">
					<i class="fa-solid fa-check"></i> {{ item }}
				</li>
			</ul>
		</div>
	</section>
</template>

<style scoped>
.ecommerce {
	padding: 5rem 2rem;
	text-align: center;
}

.ecommerce h2 {
	font-family: "Cormorant Garamond", serif;
	font-weight: 500;
	font-size: clamp(1.75rem, 3vw, 2.5rem);
	color: #414042;
	margin: 0 0 0.75rem;
}

.subtitle {
	font-family: "Raleway", sans-serif;
	font-size: 1.1rem;
	font-weight: 700;
	color: #414042;
	margin: 0 0 2.5rem;
}

.ecommerce-grid {
	max-width: 1100px;
	margin: 0 auto;
	display: grid;
	grid-template-columns: 1.4fr 1fr;
	gap: 2rem;
	align-items: center;
	text-align: left;
}

.flowchart img {
	max-width: 100%;
	display: block;
}

.checklist {
	list-style: none;
	margin: 0;
	padding: 0;
	font-family: "Raleway", sans-serif;
	font-size: 1.3rem;
	font-weight: 700;
	color: #414042;
}

.checklist li {
	padding: 0.4rem 0;
}

.checklist i {
	color: rgba(113, 191, 68, 1);
	margin-right: 0.5rem;
}

@media (max-width: 767px) {
	.ecommerce-grid {
		grid-template-columns: 1fr;
		text-align: center;
	}

	.checklist {
		text-align: left;
		display: inline-block;
	}
}
</style>
