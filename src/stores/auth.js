// src/stores/auth.js
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "@/services/api";
import router from "@/router";

export const useAuthStore = defineStore("auth", () => {
  const user = ref(JSON.parse(localStorage.getItem("user")) || null);
  const token = ref(localStorage.getItem("admin_token") || null);
  const inactivityTimer = ref(null);
  const TIMEOUT_DURATION = 15 * 60 * 1000;

  const isAuthenticated = computed(() => !!token.value);

  function updateUser(newUserData) {
    user.value = newUserData;
    localStorage.setItem("user", JSON.stringify(newUserData));
  }
  function setAuth(userData, tokenData) {
    user.value = userData;
    token.value = tokenData;
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("admin_token", tokenData);
    // Baris yang mengatur header di sini dihapus
    startInactivityTimer();
  }

  function clearAuth() {
    user.value = null;
    token.value = null;
    localStorage.removeItem("user");
    localStorage.removeItem("admin_token");
    // Baris yang menghapus header di sini dihapus
    clearTimeout(inactivityTimer.value);
  }

  function startInactivityTimer() {
    /* ... tidak berubah ... */
  }
  function resetInactivityTimer() {
    /* ... tidak berubah ... */
  }

  async function login(credentials) {
    clearAuth();
    const response = await api.post("/login", credentials);
    const { user, token } = response.data;
    setAuth(user, token);
  }

  async function logout() {
    try {
      if (isAuthenticated.value) {
        await api.post("/logout");
      }
    } finally {
      clearAuth();
      router.push("/login");
    }
  }

  async function getUser() {
    if (token.value) {
      // Baris yang mengatur header di sini dihapus
      try {
        const response = await api.get("/user");
        user.value = response.data;
        startInactivityTimer();
      } catch (error) {
        console.error("Gagal mengambil data user, token mungkin tidak valid.", error);
        clearAuth();
      }
    }
  }

  return { user, token, login, logout, getUser, isAuthenticated, resetInactivityTimer, updateUser };
});
