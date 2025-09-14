<script setup>
import { ref, onMounted, computed, watch } from "vue";
import api from "@/services/api";
import VueApexCharts from "vue3-apexcharts";
import DetailsDialog from "@/components/DetailsDialog.vue";

const kpiData = ref(null);
const incomeChartData = ref([]);
const incomeCompositionData = ref([]);
const topArrears = ref([]);
const inventorySummary = ref([]);
const studentBillDetails = ref({});
const loading = ref(true);
const loadingDetails = ref(null);
const loadingChart = ref(false);
const selectedMonths = ref(12);
const monthFilterOptions = [
  { title: "3 Bulan Terakhir", value: 3 },
  { title: "6 Bulan Terakhir", value: 6 },
  { title: "12 Bulan Terakhir", value: 12 },
  { title: "24 Bulan Terakhir", value: 24 },
];

const dialog = ref({ visible: false, loading: false, title: "", headers: [], items: [] });

const formatCurrency = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value || 0);

async function fetchIncomeChart() {
  loadingChart.value = true;
  try {
    const response = await api.get(`/dashboard/income-chart?months=${selectedMonths.value}`);
    incomeChartData.value = response.data;
  } catch (error) {
    console.error("Gagal mengambil data grafik:", error);
  } finally {
    loadingChart.value = false;
  }
}

onMounted(async () => {
  fetchIncomeChart();
  try {
    const [kpiRes, incomeCompRes, topArrearsRes, inventoryRes] = await Promise.all([
      api.get("/dashboard/kpi"),
      api.get("/dashboard/income-composition"),
      api.get("/dashboard/top-arrears"),
      api.get("/dashboard/inventory-summary"),
    ]);
    kpiData.value = kpiRes.data;
    incomeCompositionData.value = incomeCompRes.data;
    topArrears.value = topArrearsRes.data;
    inventorySummary.value = inventoryRes.data;
  } catch (error) {
    console.error("Gagal mengambil data dasbor:", error);
  } finally {
    loading.value = false;
  }
});

watch(selectedMonths, fetchIncomeChart);

async function fetchBillDetails(studentId) {
  if (studentBillDetails.value[studentId]) return;
  loadingDetails.value = studentId;
  try {
    const response = await api.get(`/students/${studentId}/bills`);
    studentBillDetails.value[studentId] = response.data.filter((bill) => bill.status !== "Lunas");
  } catch (error) {
    console.error(`Gagal mengambil detail tagihan untuk siswa ${studentId}:`, error);
    studentBillDetails.value[studentId] = [];
  } finally {
    loadingDetails.value = null;
  }
}

async function openDetailsDialog(type) {
  dialog.value.visible = true;
  dialog.value.loading = true;
  let url = "";
  if (type === "income") {
    dialog.value.title = "Detail Pemasukan Bulan Ini";
    dialog.value.headers = [
      { title: "Tanggal", key: "payment_date" },
      { title: "Nama Siswa", key: "student_bill.student.name" },
      { title: "Pembayaran", key: "student_bill.cost_item.name" },
      { title: "Jumlah", key: "amount_paid", align: "end" },
    ];
    url = "/reports/details/monthly-income";
  } else if (type === "arrears") {
    dialog.value.title = "Detail Semua Tunggakan";
    dialog.value.headers = [
      { title: "Nama Siswa", key: "student.name" },
      { title: "Tagihan", key: "cost_item.name" },
      { title: "Sisa Tunggakan", key: "remaining_amount", align: "end" },
    ];
    url = "/reports/details/arrears";
  } else if (type === "students") {
    dialog.value.title = "Daftar Siswa Aktif";
    dialog.value.headers = [
      { title: "Nama Lengkap", key: "name" },
      { title: "Angkatan", key: "enrollment_year" },
      { title: "Gelombang", key: "registration_wave" },
    ];
    url = "/reports/details/active-students";
  }
  try {
    const response = await api.get(url);
    dialog.value.items = response.data;
  } catch (error) {
    console.error(`Gagal mengambil data detail untuk ${type}:`, error);
  } finally {
    dialog.value.loading = false;
  }
}

const lineChartOptions = computed(() => ({
  chart: { id: "income-trend" },
  xaxis: { categories: incomeChartData.value.map((d) => d.month) },
  title: { text: "Tren Pendapatan", align: "left" },
}));
const lineChartSeries = computed(() => [
  { name: "Pendapatan", data: incomeChartData.value.map((d) => d.total) },
]);
const pieChartOptions = computed(() => ({
  labels: incomeCompositionData.value.map((d) => d.name),
  title: { text: "Komposisi Pendapatan", align: "left" },
  legend: { position: "bottom" },
}));
const pieChartSeries = computed(() => incomeCompositionData.value.map((d) => parseFloat(d.total)));
</script>

<template>
  <div>
    <DetailsDialog
      v-model="dialog.visible"
      :title="dialog.title"
      :headers="dialog.headers"
      :items="dialog.items"
      :loading="dialog.loading"
    />
    <h1 class="mb-4">Dashboard Administrator</h1>
    <div v-if="loading" class="text-center mt-16">
      <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      <p class="mt-4">Memuat data...</p>
    </div>
    <v-alert v-else-if="!kpiData" type="error" prominent
      >Gagal memuat data dasbor. Silakan coba lagi nanti.</v-alert
    >
    <div v-else>
      <v-row>
        <v-col cols="12" md="4"
          ><v-card
            class="pa-2"
            elevation="2"
            @click="openDetailsDialog('students')"
            style="cursor: pointer"
            ><div class="d-flex align-center">
              <v-icon color="primary" size="x-large" class="mr-4">mdi-account-group</v-icon>
              <div>
                <v-card-subtitle>Siswa Aktif</v-card-subtitle
                ><v-card-title class="text-h4 font-weight-bold">{{
                  kpiData.active_students
                }}</v-card-title>
              </div>
            </div></v-card
          ></v-col
        >
        <v-col cols="12" md="4"
          ><v-card
            class="pa-2"
            elevation="2"
            @click="openDetailsDialog('arrears')"
            style="cursor: pointer"
            ><div class="d-flex align-center">
              <v-icon color="error" size="x-large" class="mr-4">mdi-cash-remove</v-icon>
              <div>
                <v-card-subtitle>Total Tunggakan</v-card-subtitle
                ><v-card-title class="text-h4 font-weight-bold">{{
                  formatCurrency(kpiData.total_arrears)
                }}</v-card-title>
              </div>
            </div></v-card
          ></v-col
        >
        <v-col cols="12" md="4"
          ><v-card
            class="pa-2"
            elevation="2"
            @click="openDetailsDialog('income')"
            style="cursor: pointer"
            ><div class="d-flex align-center">
              <v-icon color="success" size="x-large" class="mr-4">mdi-cash-check</v-icon>
              <div>
                <v-card-subtitle>Pemasukan Bulan Ini</v-card-subtitle
                ><v-card-title class="text-h4 font-weight-bold">{{
                  formatCurrency(kpiData.monthly_income)
                }}</v-card-title>
              </div>
            </div></v-card
          ></v-col
        >
      </v-row>
      <v-row class="mt-4">
        <v-col cols="12" md="8">
          <v-card>
            <v-toolbar flat density="compact">
              <v-toolbar-title class="text-subtitle-1">Tren Pendapatan</v-toolbar-title>
              <v-spacer></v-spacer>
              <v-select
                v-model="selectedMonths"
                :items="monthFilterOptions"
                density="compact"
                hide-details
                style="max-width: 200px"
              ></v-select>
            </v-toolbar>
            <v-divider></v-divider>
            <v-card-text
              ><VueApexCharts
                type="line"
                :options="lineChartOptions"
                :series="lineChartSeries"
                :loading="loadingChart"
              ></VueApexCharts
            ></v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="4"
          ><v-card
            ><v-card-text
              ><VueApexCharts
                type="pie"
                :options="pieChartOptions"
                :series="pieChartSeries"
              ></VueApexCharts></v-card-text></v-card
        ></v-col>
      </v-row>
      <v-row class="mt-4">
        <v-col cols="12">
          <v-card>
            <v-card-title>"Hot List" - 5 Tunggakan Terbesar</v-card-title>
            <v-expansion-panels>
              <v-expansion-panel v-for="item in topArrears" :key="item.student_id">
                <v-expansion-panel-title @click="fetchBillDetails(item.student_id)">
                  <v-row no-gutters
                    ><v-col cols="8" class="d-flex justify-start"
                      ><strong>{{ item.student.name }}</strong></v-col
                    ><v-col cols="4" class="text-grey"
                      ><v-chip color="error">{{
                        formatCurrency(item.total_arrears)
                      }}</v-chip></v-col
                    ></v-row
                  >
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <div v-if="loadingDetails === item.student_id" class="text-center pa-4">
                    <v-progress-circular indeterminate size="24"></v-progress-circular>
                  </div>
                  <div v-else-if="studentBillDetails[item.student_id]">
                    <v-list density="compact">
                      <v-list-item
                        v-for="bill in studentBillDetails[item.student_id]"
                        :key="bill.id"
                        :title="bill.cost_item.name"
                      >
                        <template v-slot:append
                          ><span class="text-error">{{
                            formatCurrency(bill.remaining_amount)
                          }}</span></template
                        >
                      </v-list-item>
                    </v-list>
                  </div>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </v-card>
        </v-col>
      </v-row>
      <v-row class="mt-4">
        <v-col cols="12">
          <v-card>
            <v-card-title>Ringkasan Status Inventaris</v-card-title>
            <v-card-text class="d-flex ga-4">
              <v-chip
                v-for="summary in inventorySummary"
                :key="summary.status"
                :color="
                  summary.status === 'Baik'
                    ? 'success'
                    : summary.status === 'Rusak'
                    ? 'error'
                    : 'warning'
                "
                label
                large
              >
                {{ summary.status }}: {{ summary.total }}
              </v-chip>
              <p v-if="inventorySummary.length === 0" class="text-grey">
                Belum ada data inventaris.
              </p>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>
  </div>
</template>
