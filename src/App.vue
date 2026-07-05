<template>
	<router-view />
</template>

<style>
:root {
	color-scheme: light;
	color: #262626;
	background: #ffffff;

	/* Dark-mode palette tokens — every component's `html.dark` override pulls
	   from these so the whole site darkens consistently. The #27a9e0 brand
	   blue stays the accent in both themes. Dark is the site default: an
	   inline script in index.html adds .dark to <html> before first paint
	   unless the visitor has explicitly chosen light (see useTheme). */
	--dm-bg: #121417;
	--dm-bg-soft: #191d23;
	--dm-bg-mute: #242a33;
	--dm-border: rgba(255, 255, 255, 0.12);
	--dm-text-1: #e8eaee;
	--dm-text-2: #c3c8cf;
	--dm-text-3: #98a0aa;
	--dm-blue: #27a9e0;
	--dm-blue-soft: #66c6ef;
}

body {
	margin: 0;
	font-family: "Raleway", sans-serif;
	background: #fff;
}

html.dark {
	color-scheme: dark;
	color: var(--dm-text-2);
	background: var(--dm-bg);
}

html.dark body {
	background: var(--dm-bg);
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
