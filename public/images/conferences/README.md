Conference photos for the home-page carousel (src/components/sections/ConferencesSection.vue).

Keep the .jpg as the editable master. `npm run optimize:images` emits `<name>.webp` (760×570)
and `<name>-380.webp` (380×285), cover-cropped to 4:3; the component references only the .webp.
