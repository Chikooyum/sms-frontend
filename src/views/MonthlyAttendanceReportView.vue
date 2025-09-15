<script setup>
import { ref, onMounted, watch, computed } from "vue";
import api from "@/services/api";
import VueApexCharts from "vue3-apexcharts";
import * as XLSX from "xlsx";

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

// Function to calculate holidays and weekends in the selected month
async function calculateHolidaysAndWeekends(month, year) {
  const weekends = { saturday: 0, sunday: 0 };
  let holidayCount = 0;

  try {
    // Fetch holidays from API
    const holidaysResponse = await api.get("/holidays");
    const holidays = holidaysResponse.data || [];

    // Get first and last day of the month
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);

    // Loop through all days in the month
    for (let date = new Date(firstDay); date <= lastDay; date.setDate(date.getDate() + 1)) {
      const dayOfWeek = date.getDay();
      const dateString = date.toISOString().split("T")[0]; // YYYY-MM-DD format

      // Count Saturdays and Sundays
      if (dayOfWeek === 0) {
        // Sunday
        weekends.sunday++;
      } else if (dayOfWeek === 6) {
        // Saturday
        weekends.saturday++;
      }

      // Count holidays that fall on this date
      const isHoliday = holidays.some((holiday) => holiday.holiday_date.startsWith(dateString));
      if (isHoliday) {
        holidayCount++;
      }
    }
  } catch (error) {
    console.error("Error fetching holidays:", error);
    // Fallback: just count weekends if holiday API fails
  }

  return { holidays: holidayCount, weekends };
}

// Function to export data to Excel
async function exportToExcel() {
  if (!reportData.value) {
    alert("Data laporan belum tersedia");
    return;
  }

  try {
    // Calculate holidays and weekends
    const { holidays, weekends } = await calculateHolidaysAndWeekends(
      selectedMonth.value,
      selectedYear.value
    );

    // Prepare data for Excel
    const excelData = [];

    // Add header information
    excelData.push(["Laporan Absensi Bulanan"]);
    excelData.push([
      `Bulan: ${months.find((m) => m.value === selectedMonth.value)?.title} ${selectedYear.value}`,
    ]);
    excelData.push([`Jumlah Hari Libur: ${holidays}`]);
    excelData.push([`Jumlah Hari Sabtu: ${weekends.saturday}`]);
    excelData.push([`Jumlah Hari Minggu: ${weekends.sunday}`]);
    excelData.push([]); // Empty row

    // Add summary
    excelData.push(["Ringkasan"]);
    excelData.push(["Hadir", "Sakit", "Izin", "Alpa"]);
    excelData.push([
      reportData.value.summary.hadir,
      reportData.value.summary.sakit,
      reportData.value.summary.izin,
      reportData.value.summary.alpa,
    ]);
    excelData.push([]); // Empty row

    // Add student details header
    excelData.push(["Rincian per Siswa"]);
    excelData.push(["Nama Siswa", "Hadir", "Sakit", "Izin", "Alpa"]);

    // Add student data
    reportData.value.student_details.forEach((student) => {
      excelData.push([
        student.student_name,
        student.hadir,
        student.sakit,
        student.izin,
        student.alpa,
      ]);
    });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelData);

    // Set column widths
    ws["!cols"] = [
      { width: 30 }, // Nama Siswa
      { width: 10 }, // Hadir
      { width: 10 }, // Sakit
      { width: 10 }, // Izin
      { width: 10 }, // Alpa
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Absensi");

    // Generate filename
    const monthName =
      months.find((m) => m.value === selectedMonth.value)?.title || selectedMonth.value;
    const filename = `Laporan_Absensi_${monthName}_${selectedYear.value}.xlsx`;

    // Save file
    XLSX.writeFile(wb, filename);

    alert(`File Excel berhasil diekspor: ${filename}`);
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    alert("Gagal mengekspor file Excel");
  }
}
</script>
<template>
  <v-card>
    <v-card-title class="d-flex justify-space-between align-center flex-wrap">
      <span>Laporan Absensi Bulanan</span>
      <div class="d-flex align-center ga-2 flex-wrap">
        <v-btn
          color="success"
          variant="flat"
          size="small"
          prepend-icon="mdi-file-excel"
          @click="exportToExcel"
          :disabled="!reportData || loading"
          class="mr-2"
        >
          Export Excel
        </v-btn>
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
