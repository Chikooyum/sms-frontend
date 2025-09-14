<script setup>
import { ref, onMounted } from "vue";
import api from "@/services/api";

const kpiData = ref(null);
const pendingClasses = ref([]); // <-- DITAMBAHKAN: State untuk absensi tertunda
const loading = ref(true);
const error = ref(null);

// Fungsi untuk format mata uang
const formatCurrency = (value) => {
  if (typeof value !== "number") return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
};

// DIUBAH: onMounted sekarang mengambil data KPI dan absensi tertunda
onMounted(async () => {
  try {
    const [kpiRes, pendingRes] = await Promise.all([
      api.get("/dashboard/kpi"),
      api.get("/admin/pending-attendances"),
    ]);
    kpiData.value = kpiRes.data;
    pendingClasses.value = pendingRes.data;
  } catch (err) {
    error.value = "Gagal mengambil data dari server.";
    console.error(err);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div>
    <h1 class="mb-4">Dashboard</h1>

    <div v-if="loading" class="text-center">
      <v-progress-circular indeterminate color="primary"></v-progress-circular>
    </div>

    <v-alert v-else-if="error" type="error" dense>{{ error }}</v-alert>

    <div v-else-if="kpiData">
      <v-row>
        <v-col cols="12" md="4">
          <v-card class="pa-2" elevation="2">
            <div class="d-flex align-center">
              <v-icon color="primary" size="x-large" class="mr-4">mdi-account-group</v-icon>
              <div>
                <v-card-subtitle>Jumlah Siswa Aktif</v-card-subtitle>
                <v-card-title class="text-h4 font-weight-bold">{{
                  kpiData.active_students
                }}</v-card-title>
              </div>
            </div>
          </v-card>
        </v-col>
        <v-col cols="12" md="4">
          <v-card class="pa-2" elevation="2">
            <div class="d-flex align-center">
              <v-icon color="error" size="x-large" class="mr-4">mdi-cash-remove</v-icon>
              <div>
                <v-card-subtitle>Total Tunggakan</v-card-subtitle>
                <v-card-title class="text-h4 font-weight-bold">{{
                  formatCurrency(kpiData.total_arrears)
                }}</v-card-title>
              </div>
            </div>
          </v-card>
        </v-col>
        <v-col cols="12" md="4">
          <v-card class="pa-2" elevation="2">
            <div class="d-flex align-center">
              <v-icon color="success" size="x-large" class="mr-4">mdi-cash-check</v-icon>
              <div>
                <v-card-subtitle>Pemasukan Bulan Ini</v-card-subtitle>
                <v-card-title class="text-h4 font-weight-bold">{{
                  formatCurrency(kpiData.monthly_income)
                }}</v-card-title>
              </div>
            </div>
          </v-card>
        </v-col>
      </v-row>

      <v-row class="mt-4">
        <v-col cols="12">
          <v-card>
            <v-card-title>Kelas Belum Mengisi Absensi Hari Ini</v-card-title>
            <v-list v-if="pendingClasses.length > 0">
              <v-list-item
                v-for="cls in pendingClasses"
                :key="cls.id"
                :title="cls.name"
                :subtitle="`Wali Kelas: ${cls.wali_kelas?.name || 'Belum diatur'}`"
                :to="`/admin/attendance/${cls.id}`"
              >
                <template #append>
                  <v-btn size="small" color="primary">Isi Absensi</v-btn>
                </template>
              </v-list-item>
            </v-list>
            <v-card-text v-else class="text-grey text-center pa-4">
              <v-icon size="32" class="mb-2">mdi-check-all</v-icon>
              <p>Semua kelas sudah mengisi absensi hari ini. Kerja bagus!</p>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>
  </div>
</template>
