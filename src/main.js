// src/main.js
import { createApp } from "vue";
import { pinia } from "@/stores"; // Pastikan Pinia di-import
import App from "./App.vue";
import router from "./router";

// Vuetify
import "vuetify/styles";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import "@mdi/font/css/materialdesignicons.css";

const app = createApp(App);

const vuetify = createVuetify({
  components,
  directives,
});

app.use(pinia); // <-- 1. Pasang "Otak" (Pinia) DULU
app.use(router); // <-- 2. Baru pasang "Peta" (Router)
app.use(vuetify); // <-- 3. Pasang komponen UI

app.mount("#app");
