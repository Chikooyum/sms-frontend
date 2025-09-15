<script setup>
import { ref, onMounted, watch, computed } from "vue";
import api from "@/services/api";
import VueApexCharts from "vue3-apexcharts";

const reportData = ref(null);
const loading = ref(true);
const selectedDate = ref(new Date()); // Gunakan objek Date agar picker berfungsi baik

const holidays = ref([]);
const dateMenu = ref(false);
const today = new Date().toISOString().substr(0, 10);

function isDateAllowed(date) {
  const day = date.getDay();
  if (day === 0 || day === 6) return false;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(date.getDate()).padStart(2, "0");
  const localDateString = `${year}-${month}-${dayOfMonth}`;
  return !holidays.value.includes(localDateString);
}

onMounted(async () => {
  try {
    const response = await api.get("/holidays");
    holidays.value = response.data.map((h) => h.holiday_date.split("T")[0]);
  } catch (error) {
    console.error("Gagal mengambil daftar hari libur:", error);
  }
  fetchReport();
});

async function fetchReport() {
  if (!selectedDate.value) return;
  loading.value = true;
  reportData.value = null;
  try {
    // --- PERBAIKAN UTAMA: Format tanggal secara manual untuk menghindari masalah timezone ---
    const dateObj = new Date(selectedDate.value);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    const dateToSend = `${year}-${month}-${day}`;

    const response = await api.get("/reports/staff-attendance", {
      params: { date: dateToSend },
    });
    reportData.value = response.data;
  } catch (error) {
    console.error("Gagal mengambil laporan absensi staf:", error);
  } finally {
    loading.value = false;
  }
}

watch(selectedDate, fetchReport);

const formatDateForDisplay = (date) => {
  return new Date(date).toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// --- PERBAIKAN UTAMA ADA DI DALAM COMPUTED PROPERTIES INI ---
const pieChartSeries = computed(() => {
  // Pastikan reportData dan summary ada sebelum diakses
  if (!reportData.value?.summary) return [];
  const { hadir, sakit, izin, alpa } = reportData.value.summary;
  return [hadir, sakit, izin, alpa];
});
const pieChartOptions = {
  labels: ["Hadir", "Sakit", "Izin", "Alpa"],
  legend: { position: "bottom" },
  colors: ["#4CAF50", "#FF9800", "#2196F3", "#F44336"],
};

const lineChartSeries = computed(() => {
  // Pastikan reportData dan daily_trend ada sebelum diakses
  if (!reportData.value?.daily_trend) return [{ data: [] }];
  return [{ name: "Jumlah Hadir", data: Object.values(reportData.value.daily_trend) }];
});
const lineChartOptions = computed(() => ({
  // Pastikan reportData dan daily_trend ada sebelum diakses
  xaxis: { categories: Object.keys(reportData.value?.daily_trend || {}) },
  chart: { zoom: { enabled: false } },
  stroke: { curve: "smooth" },
  colors: ["#4CAF50"],
}));
</script>

<template>
  <v-card>
    <v-card-title class="d-flex justify-space-between align-center">
      <span>Laporan Absensi Staf</span>
      <v-menu v-model="dateMenu" :close-on-content-click="false" location="bottom end">
        <template v-slot:activator="{ props }">
          <v-text-field
            :model-value="formatDateForDisplay(selectedDate)"
            label="Pilih Tanggal Laporan"
            readonly
            v-bind="props"
            density="compact"
            hide-details
            style="max-width: 250px"
            prepend-inner-icon="mdi-calendar"
          ></v-text-field>
        </template>
        <v-date-picker
          v-model="selectedDate"
          @update:modelValue="dateMenu = false"
          :allowed-dates="isDateAllowed"
          :max="today"
          title=""
          hide-header
        ></v-date-picker>
      </v-menu>
    </v-card-title>

    <v-progress-linear v-if="loading" indeterminate></v-progress-linear>

    <div v-if="reportData" class="pa-4">
      <v-card-text class="pt-0">
        <v-row>
          <v-col cols="6" md="3">
            <v-chip color="success" label size="large" class="w-100 justify-center">
              <v-icon start icon="mdi-check-circle"></v-icon>Hadir:
              {{ reportData.summary.hadir }}
            </v-chip>
          </v-col>
          <v-col cols="6" md="3">
            <v-chip color="warning" label size="large" class="w-100 justify-center">
              <v-icon start icon="mdi-emoticon-sad"></v-icon>Sakit:
              {{ reportData.summary.sakit }}
            </v-chip>
          </v-col>
          <v-col cols="6" md="3">
            <v-chip color="info" label size="large" class="w-100 justify-center">
              <v-icon start icon="mdi-information"></v-icon>Izin:
              {{ reportData.summary.izin }}
            </v-chip>
          </v-col>
          <v-col cols="6" md="3">
            <v-chip color="error" label size="large" class="w-100 justify-center">
              <v-icon start icon="mdi-close-circle"></v-icon>Alpa:
              {{ reportData.summary.alpa }}
            </v-chip>
          </v-col>
        </v-row>
      </v-card-text>
      <v-divider></v-divider>

      <v-row class="mt-4">
        <v-col cols="12" md="6">
          <v-card variant="tonal">
            <v-card-title class="text-subtitle-1">Ringkasan Hari Ini</v-card-title>
            <v-card-text>
              <VueApexCharts
                type="donut"
                :options="pieChartOptions"
                :series="pieChartSeries"
              ></VueApexCharts>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="6" v-if="reportData.daily_trend">
          <v-card variant="tonal">
            <v-card-title class="text-subtitle-1">Tren Kehadiran Harian</v-card-title>
            <v-card-text>
              <VueApexCharts
                type="area"
                height="315"
                :options="lineChartOptions"
                :series="lineChartSeries"
              ></VueApexCharts>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Bagian baru: Daftar staf yang tidak hadir -->
      <v-divider class="my-4"></v-divider>

      <v-row>
        <v-col cols="12" md="4">
          <v-card variant="outlined" class="h-100">
            <v-card-title class="text-h6 text-warning">
              <v-icon icon="mdi-emoticon-sad" class="mr-2"></v-icon>
              Staf Sakit ({{ reportData.sakit_list?.length || 0 }})
            </v-card-title>
            <v-list v-if="reportData.sakit_list?.length > 0" density="compact">
              <v-list-item
                v-for="item in reportData.sakit_list"
                :key="item.staff_name"
                :title="item.staff_name"
                :subtitle="item.role"
              >
                <template #append>
                  <small class="text-grey" v-if="item.notes">{{ item.notes }}</small>
                </template>
              </v-list-item>
            </v-list>
            <v-card-text v-else class="text-center text-grey py-8">
              <v-icon size="48" class="mb-2">mdi-check-circle</v-icon>
              <div>Tidak ada staf yang sakit</div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="4">
          <v-card variant="outlined" class="h-100">
            <v-card-title class="text-h6 text-info">
              <v-icon icon="mdi-information" class="mr-2"></v-icon>
              Staf Izin ({{ reportData.izin_list?.length || 0 }})
            </v-card-title>
            <v-list v-if="reportData.izin_list?.length > 0" density="compact">
              <v-list-item
                v-for="item in reportData.izin_list"
                :key="item.staff_name"
                :title="item.staff_name"
                :subtitle="item.role"
              >
                <template #append>
                  <small class="text-grey" v-if="item.notes">{{ item.notes }}</small>
                </template>
              </v-list-item>
            </v-list>
            <v-card-text v-else class="text-center text-grey py-8">
              <v-icon size="48" class="mb-2">mdi-check-circle</v-icon>
              <div>Tidak ada staf yang izin</div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="4">
          <v-card variant="outlined" class="h-100">
            <v-card-title class="text-h6 text-error">
              <v-icon icon="mdi-close-circle" class="mr-2"></v-icon>
              Staf Alpa ({{ reportData.alpa_list?.length || 0 }})
            </v-card-title>
            <v-list v-if="reportData.alpa_list?.length > 0" density="compact">
              <v-list-item
                v-for="item in reportData.alpa_list"
                :key="item.staff_name"
                :title="item.staff_name"
                :subtitle="item.role"
              >
                <template #append>
                  <small class="text-grey" v-if="item.notes">{{ item.notes }}</small>
                </template>
              </v-list-item>
            </v-list>
            <v-card-text v-else class="text-center text-grey py-8">
              <v-icon size="48" class="mb-2">mdi-check-circle</v-icon>
              <div>Tidak ada staf yang alpa</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Detail per role (existing functionality) -->
      <div class="mt-4" v-if="reportData.details_by_role?.length > 0">
        <v-card variant="tonal">
          <v-card-title class="text-h6">Detail per Role</v-card-title>
          <v-card-text>
            <v-expansion-panels variant="accordion">
              <v-expansion-panel
                v-for="roleDetail in reportData.details_by_role"
                :key="roleDetail.role"
              >
                <v-expansion-panel-title>{{ roleDetail.role }}</v-expansion-panel-title>
                <v-expansion-panel-text>
                  <v-table density="compact">
                    <thead>
                      <tr>
                        <th>Nama Staf</th>
                        <th>Status</th>
                        <th>Catatan</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="record in roleDetail.attendance_records" :key="record.staff_name">
                        <td>{{ record.staff_name }}</td>
                        <td>{{ record.status }}</td>
                        <td>{{ record.notes }}</td>
                      </tr>
                    </tbody>
                  </v-table>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </v-card-text>
        </v-card>
      </div>
    </div>

    <v-card-text v-else-if="!loading" class="text-center text-grey pa-8">
      <v-icon size="64" class="mb-4">mdi-calendar-remove</v-icon>
      <h3>Tidak ada data absensi</h3>
      <p>Tidak ada data absensi staf untuk tanggal yang dipilih.</p>
    </v-card-text>
  </v-card>
</template>
