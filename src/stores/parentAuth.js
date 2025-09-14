import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/services/api";
import router from "@/router";

export const useParentAuthStore = defineStore("parentAuth", () => {
  const student = ref(JSON.parse(localStorage.getItem("student")) || null);
  const token = ref(localStorage.getItem("token") || null);

  const inactivityTimer = ref(null);
  const TIMEOUT_DURATION = 15 * 60 * 1000; // 15 menit dalam milidetik

  function startInactivityTimer() {
    clearTimeout(inactivityTimer.value);
    inactivityTimer.value = setTimeout(() => {
      alert("Sesi Anda telah habis karena tidak ada aktivitas. Silakan login kembali.");
      logout();
    }, TIMEOUT_DURATION);
  }

  function resetInactivityTimer() {
    if (token.value) {
      startInactivityTimer();
    }
  }

  // DIHAPUS: Blok 'if (token.value)' yang mengatur header di awal
  // if (token.value) {
  //   api.defaults.headers.common["Authorization"] = `Bearer ${token.value}`;
  // }

  // Mulai timer saat aplikasi dimuat ulang dan pengguna masih login
  if (token.value) {
    startInactivityTimer();
  }

  function setAuth(studentData, tokenData) {
    student.value = studentData;
    token.value = tokenData;
    localStorage.setItem("student", JSON.stringify(studentData));
    localStorage.setItem("token", tokenData);
    // DIHAPUS: Baris yang mengatur header di sini
    // api.defaults.headers.common["Authorization"] = `Bearer ${tokenData}`;

    // Mulai timer setelah login berhasil
    startInactivityTimer();
  }

  function clearAuth() {
    student.value = null;
    token.value = null;
    localStorage.removeItem("student");
    localStorage.removeItem("token");
    // DIHAPUS: Baris yang menghapus header di sini
    // delete api.defaults.headers.common["Authorization"];

    // Hentikan timer saat logout
    clearTimeout(inactivityTimer.value);
  }

  async function login(credentials) {
    clearAuth();
    try {
      const response = await api.post("/parent/login", credentials);
      const { student, token } = response.data;
      setAuth(student, token);
      router.push("/parent/portal");
    } catch (error) {
      console.error("Login Gagal:", error);
      throw new Error("Data yang Anda masukkan tidak sesuai.");
    }
  }

  function logout() {
    clearAuth();
    router.push("/parent/login");
  }

  return { student, token, login, logout, resetInactivityTimer };
});
