<template>
	<section class="showcase">
		<div class="showcase-inner">
			<h2>UI/UX Design is my specialty. Being Full Stack is just a plus.</h2>
			<p>I create beautiful, functional websites that provide an excellent user experience across all devices.</p>
			<img src="/images/mock.png" alt="Responsive device mockup" class="mock-img" />
		</div>
	</section>
</template>

<style scoped>
.showcase {
	background-color: #fff;
	padding: 5rem 2rem 0rem 2rem;
}

.showcase-inner {
	max-width: 1100px;
	margin: 0 auto;
	text-align: center;
}

.showcase-inner h2 {
	font-weight: 500;
	font-size: clamp(1.75rem, 3vw, 2.5rem);
	color: #414042;
	margin: 0 0 1rem;
}

.showcase-inner p {
	font-size: 1.1rem;
	font-weight: 700;
	color: #414042;
	margin: 0 0 2rem;
}

.mock-img {
	max-width: 100%;
	height: auto;
	margin-bottom:-10px;
}
</style>
