// src/services/api.js
import axios from "axios";
import { pinia } from "@/stores";
import { useAuthStore } from "@/stores/auth";
import { useParentAuthStore } from "@/stores/parentAuth";

const apiClient = axios.create({
  baseURL: "http://127.0.0.1:8000/api/",
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  (config) => {
    console.log("API Interceptor berjalan untuk URL:", config.url);

    const authStore = useAuthStore(pinia);
    const parentAuthStore = useParentAuthStore(pinia);

    // --- PERBAIKAN DI SINI: Tambahkan '/' di awal string ---
    if (config.url.startsWith("/parent/")) {
      if (parentAuthStore.token) {
        config.headers["Authorization"] = `Bearer ${parentAuthStore.token}`;
      }
    } else {
      if (authStore.token) {
        config.headers["Authorization"] = `Bearer ${authStore.token}`;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;
