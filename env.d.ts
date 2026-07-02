/// <reference types="vite/client" />

interface ImportMetaEnv {
	/** Web3Forms access key — see .env.local. Safe to expose client-side. */
	readonly VITE_WEB3FORMS_ACCESS_KEY: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
