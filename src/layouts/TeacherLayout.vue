<script setup>
import { ref, computed } from "vue";
import { RouterView, useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import ConfirmDialog from "@/components/ConfirmDialog.vue";

const authStore = useAuthStore();
const route = useRoute();

const logoutDialog = ref(false);
const drawer = ref(true); // untuk toggle drawer di mobile

const userInitials = computed(() => {
  const name = authStore.user?.name || "";
  const names = name.trim().split(/\s+/);
  if (names.length > 1) {
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  } else if (name) {
    return name.substring(0, 2).toUpperCase();
  }
  return "??";
});
</script>

<template>
  <v-layout class="h-100">
    <!-- Responsive Drawer -->
    <v-navigation-drawer
      v-model="drawer"
      expand-on-hover
      rail
      :permanent="$vuetify.display.mdAndUp"
      :temporary="$vuetify.display.smAndDown"
      mobile-breakpoint="md"
    >
      <v-list>
        <v-list-item
          prepend-icon="mdi-school"
          title="TK Bintang Pertiwi"
          subtitle="Sistem Informasi Guru"
        />
      </v-list>

      <v-divider />

      <v-list>
        <v-list-item :subtitle="authStore.user?.email">
          <template #prepend>
            <v-avatar color="primary" size="small">
              <span class="text-caption font-weight-bold">{{ userInitials }}</span>
            </v-avatar>
          </template>
          <v-list-item-title class="font-weight-medium">
            {{ authStore.user?.name }}
          </v-list-item-title>
        </v-list-item>
      </v-list>

      <v-divider />

      <v-list density="compact" nav>
        <v-list-item
          prepend-icon="mdi-account-circle-outline"
          title="Akun Saya"
          to="/teacher/my-account"
        />
        <v-list-item
          prepend-icon="mdi-account-group-outline"
          title="Siswa Saya"
          to="/teacher/students"
        />
        <v-list-item
          prepend-icon="mdi-piggy-bank-outline"
          title="Tabungan Siswa"
          to="/teacher/savings"
        />
        <v-list-item
          prepend-icon="mdi-checkbook"
          title="Absensi Harian"
          to="/teacher/attendance"
        ></v-list-item>
      </v-list>
    </v-navigation-drawer>

    <!-- Sticky App Bar -->
    <v-app-bar
      :title="route.meta.title || 'Portal Guru'"
      elevation="1"
      position="sticky"
      class="top-0"
    >
      <!-- Tombol toggle drawer di mobile -->
      <v-btn icon class="d-md-none" @click="drawer = !drawer">
        <v-icon>mdi-menu</v-icon>
      </v-btn>

      <v-spacer />

      <v-btn variant="outlined" @click="logoutDialog = true">
        <v-icon start>mdi-logout</v-icon>
        Logout
      </v-btn>
    </v-app-bar>

    <!-- Konten scrollable -->
    <v-main class="bg-grey-lighten-4 overflow-auto">
      <v-container fluid>
        <RouterView />
      </v-container>
    </v-main>

    <ConfirmDialog
      v-model="logoutDialog"
      title="Konfirmasi Logout"
      message="Apakah Anda yakin ingin keluar dari sesi ini?"
      @confirm="authStore.logout()"
    />
  </v-layout>
</template>

<style>
html,
body,
#app {
  height: 100%;
  margin: 0;
  padding: 0;
}

/* Layout penuh viewport */
.v-layout.h-100 {
  height: 100vh;
}

/* Scroll halus di mobile */
.v-main.overflow-auto {
  -webkit-overflow-scrolling: touch;
}

/* Responsive tweaks */
@media (max-width: 600px) {
  .v-list-item-title {
    font-size: 0.875rem;
  }

  .v-avatar span {
    font-size: 0.7rem;
  }

  .v-app-bar {
    padding-left: 8px;
    padding-right: 8px;
  }
}
</style>
