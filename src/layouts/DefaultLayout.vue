<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { RouterView, useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import { useDisplay } from "vuetify";

// --- Stores & Router ---
const authStore = useAuthStore();
const route = useRoute();

// --- State ---
const logoutDialog = ref(false);
const drawer = ref(true);
const openedGroups = ref([]); // State untuk grup menu yang terbuka
const currentTime = ref("");

// --- Responsive Breakpoints ---
const { mdAndUp, smAndDown } = useDisplay();

// --- Real-time Clock ---
let clockInterval;
onMounted(() => {
  updateTime();
  clockInterval = setInterval(updateTime, 1000);
});
onUnmounted(() => {
  if (clockInterval) clearInterval(clockInterval);
});
function updateTime() {
  const now = new Date();
  const jakartaTime = new Date(now.getTime() + 7 * 60 * 60 * 1000); // UTC+7
  currentTime.value = jakartaTime.toLocaleTimeString("id-ID", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// --- Computed Properties for Drawer Logic ---
const isAnyGroupOpen = computed(() => openedGroups.value.length > 0);
const useRail = computed(() => mdAndUp.value && !isAnyGroupOpen.value);
const expandOnHover = computed(() => mdAndUp.value && !isAnyGroupOpen.value);

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

// --- Data-Driven Navigation Items ---
// Menu didefinisikan di sini agar template tetap bersih.
// Mudah untuk ditambah, dikurangi, atau diatur ulang.
const navItems = ref([
  { title: "Dashboard", icon: "mdi-view-dashboard-outline", to: "/" },
  {
    title: "Manajemen Data",
    icon: "mdi-file-document-edit-outline",
    value: "manajemen",
    children: [
      { title: "Siswa", icon: "mdi-account-group-outline", to: "/students" },
      { title: "Staf & Akun", icon: "mdi-account-details-outline", to: "/staff-management" },
      { title: "Kelas", icon: "mdi-google-classroom", to: "/classes" },
      { title: "Inventaris", icon: "mdi-archive-outline", to: "/inventory" },
    ],
  },
  {
    title: "Keuangan",
    icon: "mdi-finance",
    value: "keuangan",
    children: [
      { title: "Pengaturan Biaya", icon: "mdi-cash-multiple", to: "/costs" },
      { title: "Pembayaran", icon: "mdi-credit-card-check-outline", to: "/payments" },
      { title: "Tabungan", icon: "mdi-piggy-bank-outline", to: "/savings" },
    ],
  },
  {
    title: "Sistem & Publikasi",
    icon: "mdi-cogs",
    value: "sistem",
    children: [
      { title: "Pengumuman", icon: "mdi-bullhorn-outline", to: "/announcements" },
      { title: "Pusat Unduhan", icon: "mdi-download-box-outline", to: "/downloads" },
    ],
  },
  {
    title: "Laporan",
    icon: "mdi-file-chart-outline",
    value: "laporan",
    children: [
      { title: "Laporan Setoran", icon: "mdi-swap-horizontal-bold", to: "/reports/handover" },
      { title: "Riwayat Transaksi", icon: "mdi-history", to: "/history/transactions" },
      // BATAS PENAMBAHAN KODE

      { title: "Laporan Absensi", icon: "mdi-calendar-check", to: "/reports/attendance" },
      {
        title: "Laporan Absensi Bulanan",
        icon: "mdi-chart-bar",
        to: "/reports/attendance/monthly",
      },
      {
        title: "Laporan Absensi Staf",
        icon: "mdi-account-group-outline",
        to: "/reports/staff-attendance",
      },
    ],
  },
  { title: "Atur Hari Libur", icon: "mdi-calendar-star", to: "/holidays" },
  { title: "Generate QR Absen", icon: "mdi-qrcode", to: "/admin/qr-attendance" },
]);
</script>

<template>
  <v-layout class="h-100">
    <v-navigation-drawer
      v-model="drawer"
      :rail="useRail"
      :expand-on-hover="expandOnHover"
      :permanent="mdAndUp"
      :temporary="smAndDown"
      mobile-breakpoint="md"
    >
      <v-list>
        <v-list-item :subtitle="authStore.user?.email" class="px-2">
          <template #prepend>
            <v-avatar color="primary">
              <v-img
                v-if="authStore.user?.staff?.photo_url"
                :src="authStore.user.staff.photo_url"
                alt="Foto Profil"
              />
              <span v-else class="text-overline font-weight-bold">{{ userInitials }}</span>
            </v-avatar>
          </template>
          <v-list-item-title class="font-weight-medium">{{
            authStore.user?.name || "User"
          }}</v-list-item-title>
        </v-list-item>
      </v-list>

      <v-divider />

      <v-list density="compact" nav v-model:opened="openedGroups">
        <template v-for="item in navItems" :key="item.title">
          <v-list-group v-if="item.children" :value="item.value">
            <template #activator="{ props }">
              <v-list-item v-bind="props" :prepend-icon="item.icon" :title="item.title" />
            </template>
            <v-list-item
              v-for="child in item.children"
              :key="child.title"
              :prepend-icon="child.icon"
              :title="child.title"
              :to="child.to"
              link
            />
          </v-list-group>
          <v-list-item v-else :prepend-icon="item.icon" :title="item.title" :to="item.to" link />
        </template>
      </v-list>

      <template #append>
        <v-divider />
        <v-list density="compact" nav>
          <v-list-item prepend-icon="mdi-logout" title="Logout" @click="logoutDialog = true" />
        </v-list>
      </template>
    </v-navigation-drawer>

    <v-app-bar
      :title="route.meta.title || 'Sistem Manajemen Sekolah'"
      elevation="1"
      density="compact"
    >
      <template #prepend>
        <v-app-bar-nav-icon class="d-md-none" @click="drawer = !drawer" />
      </template>
      <v-spacer />
      <div class="text-h6 font-weight-medium">{{ currentTime }}</div>
      <v-spacer />
      <v-chip color="primary" label class="mr-4" size="small">
        Peran: <strong class="ml-1">{{ authStore.user?.role }}</strong>
      </v-chip>
    </v-app-bar>

    <v-main class="bg-grey-lighten-4">
      <v-container fluid>
        <RouterView />
      </v-container>
    </v-main>

    <ConfirmDialog
      v-model="logoutDialog"
      title="Konfirmasi Logout"
      message="Apakah Anda yakin ingin keluar dari sesi ini?"
      confirm-text="Ya, Logout"
      confirm-color="error"
      @confirm="authStore.logout()"
    />
  </v-layout>
</template>

<style scoped>
/* Scoped styles ensure they don't leak to other components */
.v-main {
  /* Enables smooth scrolling on touch devices */
  -webkit-overflow-scrolling: touch;
  /* Make v-main the primary scrollable area */
  overflow-y: auto;
  height: 100vh;
}
</style>
