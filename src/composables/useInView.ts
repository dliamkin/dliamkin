import { onMounted, onUnmounted, ref } from "vue";

/**
 * Fires once when the target element scrolls into the viewport.
 * Attach `target` to an element and read `inView` to drive reveal animations.
 */
export function useInView(options: IntersectionObserverInit = { threshold: 0.2 }) {
	const target = ref<HTMLElement | null>(null);
	const inView = ref(false);
	let observer: IntersectionObserver | undefined;

	onMounted(() => {
		if (!target.value) return;
		observer = new IntersectionObserver((entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					inView.value = true;
					observer?.disconnect();
				}
			}
		}, options);
		observer.observe(target.value);
	});

	onUnmounted(() => observer?.disconnect());

	return { target, inView };
}
