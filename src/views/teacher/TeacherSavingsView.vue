<script setup>
import { ref, onMounted } from "vue";
import api from "@/services/api";
import SavingTransactionDialog from "@/components/SavingTransactionDialog.vue";

/* --- State Utama & UI --- */
const students = ref([]);
const loading = ref(true);
const search = ref("");
const expanded = ref([]);
const savingsDetails = ref({});
const loadingDetails = ref(false);
const savingDialog = ref(false);
const studentForSaving = ref(null);
const savingType = ref("Setoran");
const snackbar = ref({ show: false, text: "", color: "success" });

/* --- Headers tabel utama & transaksi (responsif) --- */
const headers = [
  { title: "Nama Lengkap", key: "name" },
  // Kolom Kelas disembunyikan di layar kecil
  { title: "Kelas", key: "class_group.name", class: "d-none d-sm-table-cell" },
  { title: "Saldo Saat Ini", key: "savings_balance", align: "end" },
  { title: "", key: "data-table-expand", align: "end" },
];

const transactionHeaders = [
  { title: "Tanggal", key: "transaction_date" },
  { title: "Keterangan", key: "description" },
  // Di mobile, kita tunjukkan jumlah via badge/warna; kolom debit/credit tetap ada tapi rapat
  { title: "Debit", key: "debit", align: "end" },
  { title: "Kredit", key: "credit", align: "end" },
];

/* --- Helper UI --- */
const showSnackbar = (text, color = "success") => {
  snackbar.value = { show: true, text, color };
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

const formatDate = (date) =>
  new Date(date).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

/* --- Data fetching --- */
async function fetchStudents() {
  if (students.value.length === 0) loading.value = true;
  try {
    const response = await api.get("/students");
    students.value = response.data.data;
  } catch (error) {
    console.error("Gagal mengambil data siswa:", error);
    showSnackbar("Gagal memuat data siswa.", "error");
  } finally {
    loading.value = false;
  }
}

onMounted(fetchStudents);

async function loadSavingsDetails(studentIds) {
  const idsToLoad = studentIds.filter((id) => id && !savingsDetails.value[id]);
  if (idsToLoad.length === 0) return;

  loadingDetails.value = true;

  const promises = idsToLoad.map((studentId) =>
    api
      .get(`/students/${studentId}/savings`)
      .then((response) => {
        let runningBalance = 0;
        const transactionsWithBalance = response.data.transactions.map((trx) => {
          runningBalance =
            trx.type === "Setoran" ? runningBalance + trx.amount : runningBalance - trx.amount;
          return { ...trx, running_balance: runningBalance };
        });
        savingsDetails.value[studentId] = {
          balance: response.data.balance,
          transactions: transactionsWithBalance,
        };
      })
      .catch((error) => {
        console.error(`Gagal mengambil detail tabungan untuk siswa ${studentId}:`, error);
        savingsDetails.value[studentId] = { balance: 0, transactions: [] };
      })
  );

  await Promise.all(promises);
  loadingDetails.value = false;
}

/* --- Dialog transaksi --- */
function openSavingDialog(student, type) {
  studentForSaving.value = student;
  savingType.value = type;
  savingDialog.value = true;
}

async function handleSaveTransaction(formData) {
  const studentId = studentForSaving.value.id;
  try {
    await api.post(`/students/${studentId}/savings`, {
      type: savingType.value,
      ...formData,
    });
    savingDialog.value = false;
    showSnackbar("Transaksi berhasil disimpan!");
    delete savingsDetails.value[studentId];
    await loadSavingsDetails([studentId]);
    await fetchStudents();
  } catch (error) {
    const message = error.response?.data?.message || "Server Error";
    showSnackbar(`Transaksi Gagal: ${message}`, "error");
    console.error("Gagal menyimpan transaksi tabungan:", error);
  }
}
// TAMBAHKAN FUNGSI BARU INI
async function handleWithdrawAndPay(paymentData) {
  if (!studentForSaving.value) return; // Pengaman

  try {
    const response = await api.post(
      `/students/${studentForSaving.value.id}/savings/withdraw-and-pay`,
      paymentData
    );
    savingDialog.value = false;
    showSnackbar(response.data.message);

    // Refresh data tabungan
    const studentId = studentForSaving.value.id;
    delete savingsDetails.value[studentId]; // Hapus cache
    await loadSavingsDetails([studentId]); // Panggil ulang
    await fetchStudents();
  } catch (error) {
    const message = error.response?.data?.message || "Server Error";
    showSnackbar(`Transaksi Gagal: ${message}`, "error");
    console.error("Gagal melakukan withdraw and pay:", error);
  }
}

/* --- Expanded rows --- */
function onUpdateExpanded(newExpanded) {
  expanded.value = newExpanded;
  loadSavingsDetails(newExpanded);
}
</script>

<template>
  <SavingTransactionDialog
    v-if="studentForSaving"
    v-model="savingDialog"
    :transaction-type="savingType"
    :student-id="studentForSaving.id"
    @save="handleSaveTransaction"
    @save-payment="handleWithdrawAndPay"
  />

  <v-container fluid>
    <v-card rounded="lg" border>
      <v-card-item>
        <v-card-title class="d-flex align-center flex-wrap">
          <v-icon start icon="mdi-piggy-bank-outline" class="mr-2"></v-icon>
          <span class="text-h6">Manajemen Tabungan Siswa</span>
        </v-card-title>
        <v-card-subtitle class="text-wrap">
          Lihat saldo dan catat transaksi tabungan untuk siswa Anda.
        </v-card-subtitle>
      </v-card-item>

      <v-card-text class="pt-4 pb-0">
        <v-row class="align-center">
          <v-col cols="12" sm="8" md="6">
            <v-text-field
              v-model="search"
              label="Cari siswa..."
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col class="d-none d-sm-flex justify-end" sm="4" md="6">
            <div class="text-grey text-caption">
              Total siswa: <strong>{{ students.length }}</strong>
            </div>
          </v-col>
        </v-row>
      </v-card-text>

      <v-data-table
        v-model:expanded="expanded"
        :headers="headers"
        :items="students"
        :loading="loading"
        :search="search"
        item-value="id"
        show-expand
        density="compact"
        mobile-breakpoint="md"
        class="elevation-0"
        @update:expanded="onUpdateExpanded"
      >
        <!-- Saldo Saat Ini -->
        <template #[`item.savings_balance`]="{ item }">
          <strong class="text-blue-darken-2">{{ formatCurrency(item.savings_balance) }}</strong>
        </template>

        <!-- Baris expanded: riwayat transaksi -->
        <template #expanded-row="{ columns, item }">
          <tr>
            <td :colspan="columns.length">
              <div class="pa-4 bg-blue-grey-lighten-5">
                <div v-if="loadingDetails && !savingsDetails[item.id]" class="text-center pa-6">
                  <v-progress-circular indeterminate color="primary" />
                </div>

                <div v-else-if="savingsDetails[item.id]">
                  <v-row align="center" class="mb-3">
                    <v-col cols="12" sm="auto">
                      <h4 class="text-h6 font-weight-regular text-center text-sm-left">
                        Riwayat Transaksi: {{ item.name }}
                      </h4>
                    </v-col>
                    <v-spacer class="d-none d-sm-block" />
                    <v-col cols="12" sm="auto" class="text-center text-sm-right mt-2 mt-sm-0">
                      <v-btn
                        size="small"
                        color="primary"
                        class="mr-2"
                        @click="openSavingDialog(item, 'Setoran')"
                      >
                        <v-icon start>mdi-plus</v-icon>Setor
                      </v-btn>
                      <v-btn
                        size="small"
                        color="deep-orange-darken-1"
                        @click="openSavingDialog(item, 'Penarikan')"
                      >
                        <v-icon start>mdi-minus</v-icon>Tarik
                      </v-btn>
                    </v-col>
                  </v-row>

                  <div
                    v-if="savingsDetails[item.id].transactions.length === 0"
                    class="text-center text-grey pa-4 border rounded"
                  >
                    Belum ada riwayat transaksi.
                  </div>

                  <v-data-table
                    v-else
                    :headers="transactionHeaders"
                    :items="savingsDetails[item.id].transactions"
                    density="compact"
                    mobile-breakpoint="md"
                    class="transaction-table elevation-0"
                  >
                    <!-- Tanggal -->
                    <template #[`item.transaction_date`]="{ item }">
                      {{ formatDate(item.transaction_date) }}
                    </template>

                    <!-- Keterangan -->
                    <template #[`item.description`]="{ item }">
                      <div class="d-flex align-center">
                        <v-chip
                          size="x-small"
                          :color="item.type === 'Setoran' ? 'green' : 'red'"
                          class="mr-2 d-inline-flex d-sm-none"
                          text-color="white"
                        >
                          {{ item.type }}
                        </v-chip>
                        <span>{{ item.description || item.type }}</span>
                      </div>
                    </template>

                    <!-- Debit -->
                    <template #[`item.debit`]="{ item }">
                      <span v-if="item.type === 'Penarikan'" class="text-error">
                        {{ formatCurrency(item.amount) }}
                      </span>
                    </template>

                    <!-- Kredit -->
                    <template #[`item.credit`]="{ item }">
                      <span v-if="item.type === 'Setoran'" class="text-success">
                        {{ formatCurrency(item.amount) }}
                      </span>
                    </template>

                    <!-- Saldo berjalan -->
                    <template #[`item.running_balance`]="{ item }">
                      <strong>{{ formatCurrency(item.running_balance) }}</strong>
                    </template>
                  </v-data-table>
                </div>
              </div>
            </td>
          </tr>
        </template>

        <!-- Empty & Loading states -->
        <template #no-data>
          <div class="text-center pa-6">Tidak ada data siswa yang cocok.</div>
        </template>
        <template #loading>
          <div class="text-center pa-6 d-flex align-center justify-center">
            <v-progress-circular indeterminate color="primary" class="mr-3" />
            Memuat data siswa...
          </div>
        </template>
      </v-data-table>
    </v-card>
  </v-container>

  <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000" location="top right">
    {{ snackbar.text }}
  </v-snackbar>
</template>

<style>
/* Tabel transaksi: atur wrapping agar muat di layar sempit */
.transaction-table .v-data-table__td,
.transaction-table .v-data-table__th {
  white-space: nowrap;
}

/* Scroll horizontal untuk tabel transaksi di layar sangat sempit */
@media (max-width: 480px) {
  .transaction-table .v-table__wrapper {
    overflow-x: auto;
  }
}

/* Rapikan tipografi & padding di mobile */
@media (max-width: 600px) {
  .v-card-subtitle {
    white-space: normal;
  }
  .v-card-title .text-h6 {
    font-size: 1rem;
  }
  .v-data-table {
    font-size: 0.9rem;
  }
  .v-btn.v-btn--size-small {
    min-width: 40px;
    padding: 0 8px;
  }
}

/* Make search field breathe less on mobile */
@media (max-width: 960px) {
  .v-card-text {
    padding-top: 12px !important;
    padding-bottom: 8px !important;
  }
}
</style>
