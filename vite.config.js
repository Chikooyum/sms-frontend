import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});

/*
import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import laravel from "laravel-vite-plugin"; // <-- 1. Import plugin Laravel
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    laravel({
      // <-- 2. Gunakan plugin Laravel
      input: ["src/main.js"], // Tentukan file JS utama Anda
      refresh: true,
    }),
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      // <-- 3. Pertahankan alias '@' Anda yang sudah benar
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
*/
