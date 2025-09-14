<script setup>
import { ref, onMounted, watch, computed } from "vue";
import api from "@/services/api";
import VueApexCharts from "vue3-apexcharts";

const reportData = ref(null);
const loading = ref(true);
const selectedMonth = ref(new Date().getMonth() + 1);
const selectedYear = ref(new Date().getFullYear());

const months = Array.from({ length: 12 }, (_, i) => ({
  title: new Date(0, i).toLocaleString("id-ID", { month: "long" }),
  value: i + 1,
}));
const years = [2024, 2025, 2026]; // Sesuaikan

async function fetchReport() {
  loading.value = true;
  reportData.value = null;
  try {
    const response = await api.get("/reports/attendance/monthly", {
      params: { month: selectedMonth.value, year: selectedYear.value },
    });
    reportData.value = response.data;
  } catch (error) {
    console.error("Gagal mengambil laporan:", error);
  } finally {
    loading.value = false;
  }
}

watch([selectedMonth, selectedYear], fetchReport);
onMounted(fetchReport);

// Computed properties untuk chart
const pieChartSeries = computed(() => {
  if (!reportData.value) return [];
  const { hadir, sakit, izin, alpa } = reportData.value.summary;
  return [hadir, sakit, izin, alpa];
});
const pieChartOptions = {
  labels: ["Hadir", "Sakit", "Izin", "Alpa"],
  legend: { position: "bottom" },
};

const lineChartSeries = computed(() => {
  if (!reportData.value) return [{ data: [] }];
  return [{ name: "Jumlah Hadir", data: Object.values(reportData.value.daily_trend) }];
});
const lineChartOptions = computed(() => ({
  xaxis: { categories: Object.keys(reportData.value?.daily_trend || {}) },
  chart: { zoom: { enabled: false } },
  stroke: { curve: "smooth" },
}));

const tableHeaders = [
  { title: "Nama Siswa", key: "student_name" },
  { title: "Hadir", key: "hadir", align: "end" },
  { title: "Sakit", key: "sakit", align: "end" },
  { title: "Izin", key: "izin", align: "end" },
  { title: "Alpa", key: "alpa", align: "end" },
];
</script>
<template>
  <v-card>
    <v-card-title class="d-flex justify-space-between align-center">
      <span>Laporan Absensi Bulanan</span>
      <div class="d-flex ga-2">
        <v-select
          v-model="selectedMonth"
          :items="months"
          density="compact"
          hide-details
          style="width: 150px"
        ></v-select>
        <v-select
          v-model="selectedYear"
          :items="years"
          density="compact"
          hide-details
          style="width: 120px"
        ></v-select>
      </div>
    </v-card-title>
    <v-progress-linear v-if="loading" indeterminate></v-progress-linear>
    <div v-if="reportData" class="pa-4">
      <v-row>
        <v-col cols="12" md="6">
          <v-card>
            <v-card-title>Ringkasan Bulan Ini</v-card-title>
            <v-card-text
              ><VueApexCharts
                type="donut"
                :options="pieChartOptions"
                :series="pieChartSeries"
              ></VueApexCharts
            ></v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="6">
          <v-card>
            <v-card-title>Tren Kehadiran Harian</v-card-title>
            <v-card-text
              ><VueApexCharts
                type="area"
                height="315"
                :options="lineChartOptions"
                :series="lineChartSeries"
              ></VueApexCharts
            ></v-card-text>
          </v-card>
        </v-col>
      </v-row>
      <v-row>
        <v-col cols="12">
          <v-card>
            <v-card-title>Rincian per Siswa</v-card-title>
            <v-data-table
              :headers="tableHeaders"
              :items="reportData.student_details"
              density="compact"
            ></v-data-table>
          </v-card>
        </v-col>
      </v-row>
    </div>
  </v-card>
</template>
