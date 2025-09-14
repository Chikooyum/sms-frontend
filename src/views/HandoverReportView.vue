<script setup>
import { ref, onMounted, watch } from "vue";
import api from "@/services/api";
import ConfirmDialog from "@/components/ConfirmDialog.vue";

// --- State Utama ---
const reportData = ref({ pending: [], reconciled: [] });
const loading = ref(true);
const selectedDate = ref(new Date()); // [DIUBAH] Gunakan objek Date untuk v-date-picker

// --- State Dialog & Notifikasi ---
const confirmDialog = ref(false);
const reportToReconcile = ref(null);
const historyDateMenu = ref(false); // [BARU]
const snackbar = ref({ show: false, text: "", color: "success" }); // [BARU]

// --- Fungsi Helper ---
const showSnackbar = (text, color = "success") => {
  // [BARU]
  snackbar.value = { show: true, text, color };
};
const formatDate = (value) =>
  new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
const isToday = (dateString) => new Date(dateString).toDateString() === new Date().toDateString();
const formatCurrency = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value || 0);
const formatTime = (value) =>
  new Date(value).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

// --- API Calls & Handlers ---
async function fetchReport() {
  loading.value = true;
  try {
    // Konversi objek Date ke format YYYY-MM-DD untuk parameter API
    const dateParam = new Date(selectedDate.value).toISOString().split("T")[0];
    const response = await api.get("/reports/handover", { params: { date: dateParam } });
    reportData.value.pending = response.data.pending_reports || [];
    reportData.value.reconciled = response.data.reconciled_reports || [];
  } catch (error) {
    console.error("Gagal mengambil laporan:", error);
    showSnackbar("Gagal memuat data laporan.", "error");
  } finally {
    loading.value = false;
  }
}

watch(selectedDate, fetchReport);

function openConfirmDialog(report) {
  reportToReconcile.value = report;
  confirmDialog.value = true;
}

// [DIUBAH] Menambahkan feedback
async function handleReconcile() {
  if (!reportToReconcile.value) return;
  confirmDialog.value = false;
  try {
    await api.post("/reports/reconcile", {
      user_id: reportToReconcile.value.user_id,
      report_date: reportToReconcile.value.report_date,
    });
    await fetchReport();
    showSnackbar("Laporan berhasil direkonsiliasi!");
  } catch (error) {
    console.error("Gagal melakukan rekonsiliasi:", error);
    showSnackbar("Proses rekonsiliasi gagal!", "error");
  }
}

onMounted(fetchReport);
</script>

<template>
  <ConfirmDialog
    v-model="confirmDialog"
    title="Konfirmasi Serah Terima"
    :message="`Yakin sudah menerima setoran dari ${
      reportToReconcile?.user_name
    } sebesar ${formatCurrency(reportToReconcile?.total_amount)}?`"
    confirm-text="Ya, Terima"
    confirm-color="success"
    @confirm="handleReconcile"
  />

  <v-container fluid>
    <v-card rounded="lg" border>
      <v-card-item>
        <v-card-title class="d-flex align-center">
          <v-icon start icon="mdi-swap-horizontal-bold"></v-icon>
          Laporan Serah Terima Setoran
        </v-card-title>
        <v-card-subtitle>
          Rekonsiliasi setoran harian dari kasir.
          <small class="text-grey">Total yang ditampilkan hanya mencakup uang tunai fisik.</small>
        </v-card-subtitle>
      </v-card-item>

      <v-divider></v-divider>

      <div v-if="loading" class="text-center pa-10">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      </div>

      <div v-else>
        <v-card-text>
          <div class="text-h6 mb-2">Laporan Tertunda</div>
          <div
            v-if="reportData.pending.length === 0"
            class="text-center text-grey border rounded-lg pa-8 my-2"
          >
            <v-icon size="48" class="mb-2">mdi-check-all</v-icon>
            <p>Luar biasa! Semua laporan hari ini sudah diterima.</p>
          </div>
          <v-expansion-panels v-else variant="accordion">
            <v-expansion-panel
              v-for="report in reportData.pending"
              :key="`${report.user_id}-${report.report_date}`"
            >
              <v-expansion-panel-title>
                <v-row no-gutters class="align-center">
                  <v-col cols="6" md="5">
                    <strong>{{ report.user_name }}</strong>
                    <span class="text-grey ml-2"> - {{ formatDate(report.report_date) }}</span>
                    <v-chip
                      v-if="!isToday(report.report_date)"
                      color="orange-darken-2"
                      size="small"
                      class="ml-2"
                      >Tertunda</v-chip
                    >
                  </v-col>
                  <v-col cols="6" md="4">
                    <v-chip
                      color="warning"
                      title="Total uang tunai yang harus disetor (tidak termasuk pembayaran dari tabungan)"
                    >
                      {{ formatCurrency(report.total_amount) }}
                    </v-chip>
                  </v-col>
                  <v-col cols="12" md="3" class="text-md-right mt-2 mt-md-0">
                    <v-btn size="small" color="success" @click.stop="openConfirmDialog(report)"
                      >Laporan Diterima</v-btn
                    >
                  </v-col>
                </v-row>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <v-list density="compact">
                  <v-list-item v-for="(detail, i) in report.details" :key="i">
                    <template v-slot:prepend>
                      <v-chip size="x-small" class="mr-2">{{ detail.type }}</v-chip>
                    </template>

                    <v-list-item-title>
                      {{ detail.description }}
                      <v-chip
                        v-if="detail.type === 'Pembayaran' && detail.method === 'Tabungan'"
                        color="cyan-darken-1"
                        size="x-small"
                        variant="tonal"
                        class="ml-2"
                      >
                        <v-icon start size="x-small">mdi-piggy-bank-outline</v-icon>
                        Dari Tabungan
                      </v-chip>
                    </v-list-item-title>

                    <template v-slot:append>
                      <div class="d-flex flex-column text-right">
                        <span class="font-weight-bold">{{ formatCurrency(detail.amount) }}</span>
                        <small class="text-grey">{{ formatTime(detail.created_at) }}</small>
                      </div>
                    </template>
                  </v-list-item>
                </v-list>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-card-text>

        <v-divider class="my-4"></v-divider>

        <v-card-text>
          <div class="d-flex justify-space-between align-center flex-wrap mb-2">
            <div class="text-h6">Riwayat Laporan Diterima</div>
            <v-menu v-model="historyDateMenu" :close-on-content-click="false" location="bottom end">
              <template v-slot:activator="{ props }">
                <v-text-field
                  v-bind="props"
                  :model-value="formatDate(selectedDate)"
                  label="Pilih Tanggal"
                  readonly
                  variant="outlined"
                  density="compact"
                  hide-details
                  prepend-inner-icon="mdi-calendar"
                  style="max-width: 250px"
                ></v-text-field>
              </template>
              <v-date-picker
                v-model="selectedDate"
                @update:model-value="historyDateMenu = false"
                hide-actions
                title="Pilih Tanggal Riwayat"
              ></v-date-picker>
            </v-menu>
          </div>
          <div
            v-if="reportData.reconciled.length === 0"
            class="text-center text-grey border rounded-lg pa-8 my-2"
          >
            <v-icon size="48" class="mb-2">mdi-file-cancel-outline</v-icon>
            <p>Tidak ada riwayat laporan yang diterima pada tanggal ini.</p>
          </div>
          <v-expansion-panels v-else variant="inset">
            <v-expansion-panel
              v-for="report in reportData.reconciled"
              :key="`${report.user_id}-${report.report_date}`"
            >
              <v-expansion-panel-title>
                <v-row no-gutters>
                  <v-col cols="8"
                    ><strong>{{ report.user_name }}</strong></v-col
                  >
                  <v-col cols="4" class="text-success">
                    <span title="Total uang tunai yang telah disetor">
                      {{ formatCurrency(report.total_amount) }}
                    </span>
                  </v-col>
                </v-row>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <v-list density="compact">
                  <v-list-item v-for="(detail, i) in report.details" :key="i">
                    <template v-slot:prepend>
                      <v-chip size="x-small" class="mr-2">{{ detail.type }}</v-chip>
                    </template>

                    <v-list-item-title>
                      {{ detail.description }}
                      <v-chip
                        v-if="detail.type === 'Pembayaran' && detail.method === 'Tabungan'"
                        color="cyan-darken-1"
                        size="x-small"
                        variant="tonal"
                        class="ml-2"
                      >
                        <v-icon start size="x-small">mdi-piggy-bank-outline</v-icon>
                        Dari Tabungan
                      </v-chip>
                    </v-list-item-title>

                    <template v-slot:append>
                      <div class="d-flex flex-column text-right">
                        <span class="font-weight-bold">{{ formatCurrency(detail.amount) }}</span>
                        <small class="text-grey">{{ formatTime(detail.created_at) }}</small>
                      </div>
                    </template>
                  </v-list-item>
                </v-list>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-card-text>
      </div>
    </v-card>
  </v-container>

  <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000" location="top right">
    {{ snackbar.text }}
  </v-snackbar>
</template>
