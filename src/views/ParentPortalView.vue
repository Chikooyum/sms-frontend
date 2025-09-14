<script setup>
import { ref, onMounted, computed } from "vue";
import { useParentAuthStore } from "@/stores/parentAuth";
import api from "@/services/api";

// --- State Management ---
const authStore = useParentAuthStore();
const loading = ref(true);
const error = ref(null);
const activeTab = ref("bills");

// --- Data ---
const portalData = ref({
  unpaidBills: [],
  paymentHistory: [],
  announcements: [],
  downloadableFiles: [],
  attendanceSummary: null,
  attendanceDetails: null,
});

// --- Dialog State ---
const dialog = ref({
  visible: false,
  title: "",
  dates: [],
});

// --- Constants & Configurations ---
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

const billHeaders = [
  { title: "Deskripsi Tagihan", key: "cost_item.name" },
  { title: "Jatuh Tempo", key: "due_date", align: "start" },
  { title: "Jumlah", key: "remaining_amount", align: "end" },
];

const historyHeaders = [
  { title: "Deskripsi Tagihan", key: "student_bill.cost_item.name" },
  { title: "Tanggal Bayar", key: "payment_date", align: "start" },
  { title: "Jumlah Dibayar", key: "amount_paid", align: "end" },
  { title: "Kwitansi", key: "receipt", align: "center", sortable: false },
];

// Computed property untuk data kartu absensi, membuatnya lebih dinamis
const attendanceStats = computed(() => {
  if (!portalData.value.attendanceSummary) return [];
  const summary = portalData.value.attendanceSummary;
  return [
    { status: "Hadir", value: summary.hadir, color: "success", icon: "mdi-check-circle" },
    { status: "Sakit", value: summary.sakit, color: "warning", icon: "mdi-emoticon-sad" },
    { status: "Izin", value: summary.izin, color: "info", icon: "mdi-information" },
    { status: "Alpa", value: summary.alpa, color: "error", icon: "mdi-close-circle" },
  ];
});

// --- Lifecycle Hooks ---
onMounted(async () => {
  loading.value = true;
  error.value = null;
  try {
    const [billsRes, historyRes, announcementsRes, filesRes, attendanceSumRes, attendanceDetRes] =
      await Promise.all([
        api.get("/parent/bills"),
        api.get("/parent/history"),
        api.get("/announcements"),
        api.get("/downloads"),
        api.get("/parent/attendance-summary"),
        api.get("/parent/attendance-details"),
      ]);

    portalData.value.unpaidBills = billsRes.data;
    portalData.value.paymentHistory = historyRes.data;
    portalData.value.announcements = announcementsRes.data.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
    portalData.value.downloadableFiles = filesRes.data;
    portalData.value.attendanceSummary = attendanceSumRes.data;
    portalData.value.attendanceDetails = attendanceDetRes.data;
  } catch (err) {
    console.error("Gagal mengambil data portal:", err);
    error.value = "Terjadi kesalahan saat memuat data. Silakan coba lagi nanti.";
  } finally {
    loading.value = false;
  }
});

// --- Methods ---
const openDetailsDialog = (status) => {
  const details = portalData.value.attendanceDetails;
  if (details && details[status]) {
    dialog.value.title = `Daftar Tanggal ${status}`;
    dialog.value.dates = details[status];
    dialog.value.visible = true;
  }
};

const downloadFile = (file) => {
  const fullUrl = file.url.startsWith("http")
    ? file.url
    : `${API_BASE_URL.replace("/api", "")}${file.url}`;
  window.open(fullUrl, "_blank");
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

const formatDate = (value) =>
  new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
</script>

<template>
  <v-container fluid>
    <v-dialog v-model="dialog.visible" max-width="450px">
      <v-card rounded="lg">
        <v-card-title class="d-flex align-center text-h6">
          <v-icon start icon="mdi-calendar-month"></v-icon>
          {{ dialog.title }}
        </v-card-title>
        <v-divider></v-divider>
        <v-list v-if="dialog.dates.length > 0" density="compact">
          <v-list-item v-for="date in dialog.dates" :key="date">
            <template #prepend>
              <v-icon icon="mdi-calendar" size="small" class="mr-4"></v-icon>
            </template>
            <v-list-item-title>{{ formatDate(date) }}</v-list-item-title>
          </v-list-item>
        </v-list>
        <v-card-text v-else class="text-center text-medium-emphasis py-8">
          <v-icon size="48" class="mb-2">mdi-calendar-remove</v-icon>
          <p>Tidak ada data untuk status ini.</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" variant="text" @click="dialog.visible = false">Tutup</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-sheet rounded="lg" border class="pa-4 mb-6">
      <div class="d-flex flex-column flex-sm-row justify-space-between align-center">
        <div class="mb-4 mb-sm-0">
          <h1 class="text-h5 font-weight-medium">Portal Orang Tua</h1>
          <p class="text-body-1 mt-1">
            Selamat datang, <strong>{{ authStore.parent?.name }}</strong
            >. Menampilkan data <strong>{{ authStore.student?.name }}</strong
            >.
          </p>
          <div v-if="authStore.student?.class_group" class="mt-2 text-body-2 text-medium-emphasis">
            <span class="mr-4">
              <v-icon start size="small">mdi-google-classroom</v-icon>
              Kelas: <strong>{{ authStore.student.class_group.name }}</strong>
            </span>
            <span v-if="authStore.student.class_group.wali_kelas">
              <v-icon start size="small">mdi-account-tie</v-icon>
              Wali Kelas: <strong>{{ authStore.student.class_group.wali_kelas.name }}</strong>
            </span>
          </div>
        </div>
        <v-btn variant="outlined" color="grey-darken-1" @click="authStore.logout()">
          <v-icon start>mdi-logout</v-icon>
          Logout
        </v-btn>
      </div>
    </v-sheet>

    <v-progress-linear v-if="loading" indeterminate class="mb-6"></v-progress-linear>
    <v-alert v-if="error" type="error" variant="tonal" border="start" class="mb-6">
      {{ error }}
    </v-alert>

    <div v-if="!loading && !error">
      <v-card rounded="lg" border class="mb-6">
        <v-card-item>
          <v-card-title class="d-flex align-center">
            <v-icon start icon="mdi-calendar-check" color="primary"></v-icon>
            Ringkasan Absensi Bulan Ini
          </v-card-title>
          <v-card-subtitle class="text-caption">
            Klik pada setiap kartu untuk melihat detail tanggal.
          </v-card-subtitle>
        </v-card-item>
        <v-divider></v-divider>
        <v-card-text>
          <v-row dense>
            <v-col v-for="stat in attendanceStats" :key="stat.status" cols="6" sm="3">
              <v-card
                :color="stat.color"
                variant="tonal"
                class="text-center pa-3"
                hover
                @click="openDetailsDialog(stat.status)"
              >
                <v-icon size="32" class="mb-2">{{ stat.icon }}</v-icon>
                <div class="text-h6 font-weight-bold">{{ stat.value }}</div>
                <div class="text-caption">{{ stat.status }}</div>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <v-row>
        <v-col cols="12" md="8">
          <v-card rounded="lg" border>
            <v-tabs v-model="activeTab" bg-color="primary" grow>
              <v-tab value="bills">
                <v-icon start>mdi-cash-multiple</v-icon> Tagihan
                <v-badge
                  v-if="portalData.unpaidBills.length > 0"
                  color="error"
                  :content="portalData.unpaidBills.length"
                  inline
                  class="ml-2"
                ></v-badge>
              </v-tab>
              <v-tab value="history"> <v-icon start>mdi-history</v-icon> Riwayat </v-tab>
            </v-tabs>
            <v-window v-model="activeTab">
              <v-window-item value="bills">
                <v-data-table
                  :headers="billHeaders"
                  :items="portalData.unpaidBills"
                  item-value="id"
                >
                  <template #item.due_date="{ item }">{{ formatDate(item.due_date) }}</template>
                  <template #item.remaining_amount="{ item }">
                    <v-chip color="warning" variant="elevated" size="small">{{
                      formatCurrency(item.remaining_amount)
                    }}</v-chip>
                  </template>
                  <template #no-data>
                    <div class="text-center text-medium-emphasis py-8">
                      <v-icon size="48" class="mb-2">mdi-check-circle-outline</v-icon>
                      <p>Tidak ada tagihan aktif. Semua lunas!</p>
                    </div>
                  </template>
                </v-data-table>
              </v-window-item>
              <v-window-item value="history">
                <v-data-table
                  :headers="historyHeaders"
                  :items="portalData.paymentHistory"
                  item-value="id"
                >
                  <template #item.payment_date="{ item }">{{
                    formatDate(item.payment_date)
                  }}</template>
                  <template #item.amount_paid="{ item }">
                    <strong class="text-success">{{ formatCurrency(item.amount_paid) }}</strong>
                  </template>
                  <template #item.receipt="{ item }">
                    <v-btn
                      icon="mdi-receipt-text-outline"
                      variant="text"
                      color="primary"
                      :href="`${API_BASE_URL}/payments/${item.id}/receipt`"
                      target="_blank"
                    ></v-btn>
                  </template>
                  <template #no-data>
                    <div class="text-center text-medium-emphasis py-8">
                      <v-icon size="48" class="mb-2">mdi-history</v-icon>
                      <p>Belum ada riwayat pembayaran.</p>
                    </div>
                  </template>
                </v-data-table>
              </v-window-item>
            </v-window>
          </v-card>
        </v-col>

        <v-col cols="12" md="4" class="d-flex flex-column" style="gap: 24px">
          <v-card rounded="lg" border>
            <v-card-item>
              <v-card-title class="d-flex align-center">
                <v-icon start icon="mdi-bullhorn-outline"></v-icon> Papan Pengumuman
              </v-card-title>
            </v-card-item>
            <v-divider></v-divider>
            <v-card-text
              v-if="portalData.announcements.length === 0"
              class="text-center text-medium-emphasis py-8"
            >
              <v-icon size="48" class="mb-2">mdi-information-off-outline</v-icon>
              <p>Tidak ada pengumuman.</p>
            </v-card-text>
            <v-expansion-panels v-else variant="accordion">
              <v-expansion-panel v-for="item in portalData.announcements" :key="item.id">
                <v-expansion-panel-title>
                  <div>
                    <strong>{{ item.title }}</strong>
                    <div class="text-caption text-grey">{{ formatDate(item.created_at) }}</div>
                  </div>
                </v-expansion-panel-title>
                <v-expansion-panel-text class="text-pre-wrap">{{
                  item.content
                }}</v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </v-card>

          <v-card rounded="lg" border>
            <v-card-item>
              <v-card-title class="d-flex align-center">
                <v-icon start icon="mdi-download-box-outline"></v-icon> Pusat Unduhan
              </v-card-title>
            </v-card-item>
            <v-divider></v-divider>
            <v-card-text
              v-if="portalData.downloadableFiles.length === 0"
              class="text-center text-medium-emphasis py-8"
            >
              <v-icon size="48" class="mb-2">mdi-file-remove-outline</v-icon>
              <p>Tidak ada file tersedia.</p>
            </v-card-text>
            <v-list v-else lines="two">
              <v-list-item
                v-for="file in portalData.downloadableFiles"
                :key="file.id"
                @click="downloadFile(file)"
                prepend-icon="mdi-file-document-outline"
                :title="file.title"
                :subtitle="file.filename"
              >
                <template #append>
                  <v-icon>mdi-download</v-icon>
                </template>
              </v-list-item>
            </v-list>
          </v-card>
        </v-col>
      </v-row>
    </div>
  </v-container>
</template>

<style scoped>
.text-pre-wrap {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
