<script setup>
import { ref } from "vue"; // Tambahan
import { RouterView } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import ConfirmDialog from "@/components/ConfirmDialog.vue"; // Tambahan

const authStore = useAuthStore();
const logoutDialog = ref(false); // Tambahan
</script>

<template>
  <ConfirmDialog
    v-model="logoutDialog"
    title="Konfirmasi Logout"
    message="Apakah Anda yakin ingin keluar dari sesi ini?"
    confirm-text="Ya, Logout"
    confirm-color="error"
    @confirm="authStore.logout()"
  />
  <v-app-bar title="Dashboard Administrator">
    <v-spacer></v-spacer>
    <v-btn to="/" prepend-icon="mdi-arrow-left"> Kembali ke Portal Sysadmin </v-btn>
    <v-btn
      v-if="authStore.isAuthenticated"
      prepend-icon="mdi-logout"
      class="ml-2"
      @click="logoutDialog = true"
    >
      Logout
    </v-btn>
  </v-app-bar>

  <v-main>
    <v-container>
      <RouterView />
    </v-container>
  </v-main>
</template>
