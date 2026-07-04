import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		{
			path: "/",
			name: "home",
			component: HomeView,
		},
		{
			path: "/about",
			name: "about",
			// route level code-splitting
			// this generates a separate chunk (About.[hash].js) for this route
			// which is lazy-loaded when the route is visited.
			component: () => import("../views/AboutView.vue"),
		},
		{
			path: "/projects",
			name: "projects",
			component: () => import("../views/ProjectsView.vue"),
		},
		{
			path: "/projects/note-structurer",
			name: "note-structurer",
			component: () => import("../views/NoteStructurerView.vue"),
		},
		{
			path: "/projects/screenshot-to-primevue",
			name: "screenshot-to-primevue",
			component: () => import("../views/ScreenshotToPrimevueView.vue"),
		},
		{
			path: "/projects/lease-diff",
			name: "lease-diff",
			component: () => import("../views/LeaseDiffView.vue"),
		},
		{
			path: "/projects/paperwork-to-calendar",
			name: "paperwork-to-calendar",
			component: () => import("../views/PaperworkToCalendarView.vue"),
		},
		{
			path: "/evals",
			name: "evals",
			component: () => import("../views/EvalsView.vue"),
		},
	],
	scrollBehavior(to, from, savedPosition) {
		return savedPosition ?? { top: 0 };
	},
});

export default router;
