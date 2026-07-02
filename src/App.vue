<template>
	<router-view />
</template>

<style>
:root {
	color-scheme: light;
	color: #262626;
	background: #ffffff;
}

body {
	margin: 0;
	font-family: "Raleway", sans-serif;
	background: #fff;
}

* {
	box-sizing: border-box;
}

/* Offset anchor jumps so sections aren't hidden under the fixed navbar */
section[id],
footer[id] {
	scroll-margin-top: 5rem;
}
</style>
