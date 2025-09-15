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

const formatCurrency = (value) => {
  // Handle null, undefined, or invalid values
  const numValue = Number(value);
  if (isNaN(numValue) || value === null || value === undefined) {
    return "Rp 0";
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(numValue);
};

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
          const amount = Number(trx.amount) || 0;
          runningBalance =
            trx.type === "Setoran" ? runningBalance + amount : runningBalance - amount;
          return {
            ...trx,
            amount: amount,
            running_balance: runningBalance,
          };
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
      <v-card-item class="pb-4">
        <div
          class="d-flex flex-column flex-sm-row align-start align-sm-center justify-space-between w-100 gap-3"
        >
          <div class="flex-grow-1">
            <v-card-title class="d-flex align-center pa-0 mb-1">
              <v-icon start icon="mdi-piggy-bank-outline" class="mr-2"></v-icon>
              <span class="text-h6 text-md-h5">Manajemen Tabungan Siswa</span>
            </v-card-title>
            <v-card-subtitle class="text-wrap pa-0 text-grey-darken-1">
              Lihat saldo dan catat transaksi tabungan untuk siswa Anda.
            </v-card-subtitle>
          </div>

          <div class="d-flex align-center gap-2 w-100 w-sm-auto">
            <div class="text-caption text-grey-darken-1 d-none d-md-block">
              Total: <strong>{{ students.length }}</strong> siswa
            </div>
            <v-chip color="primary" variant="outlined" size="small" class="d-md-none">
              <v-icon start size="small">mdi-account-group</v-icon>
              {{ students.length }}
            </v-chip>
          </div>
        </div>
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
        hide-default-footer
        :items-per-page="-1"
        @update:expanded="onUpdateExpanded"
      >
        <!-- Saldo Saat Ini -->
        <template #[`item.savings_balance`]="{ item }">
          <strong class="text-blue-darken-2">{{ formatCurrency(item.savings_balance) }}</strong>
        </template>

        <!-- Expanded rows: riwayat transaksi (optimized for mobile) -->
        <template #expanded-row="{ columns, item }">
          <tr>
            <td :colspan="columns.length" class="pa-0">
              <div class="savings-details-container">
                <div v-if="loadingDetails && !savingsDetails[item.id]" class="text-center py-6">
                  <v-progress-circular indeterminate color="primary" size="24" />
                  <div class="text-caption text-grey-darken-1 mt-2">Memuat riwayat tabungan...</div>
                </div>

                <div v-else-if="savingsDetails[item.id]" class="savings-details-content">
                  <div class="savings-header">
                    <div
                      class="d-flex flex-column flex-sm-row align-start align-sm-center justify-space-between gap-3"
                    >
                      <div>
                        <h4 class="text-subtitle-1 font-weight-medium mb-1">
                          <v-icon start size="small" color="primary">mdi-bank</v-icon>
                          Tabungan {{ item.name }}
                        </h4>
                        <div class="text-caption text-grey-darken-1">
                          Saldo saat ini:
                          <strong class="text-primary">{{
                            formatCurrency(item.savings_balance)
                          }}</strong>
                        </div>
                      </div>

                      <div class="d-flex gap-2 w-100 w-sm-auto">
                        <v-btn
                          size="small"
                          color="success"
                          variant="flat"
                          class="flex-grow-1 flex-sm-grow-0"
                          @click="openSavingDialog(item, 'Setoran')"
                        >
                          <v-icon size="small">mdi-plus</v-icon>
                          <span class="d-none d-sm-inline ml-1">Setor</span>
                        </v-btn>
                        <v-btn
                          size="small"
                          color="error"
                          variant="flat"
                          class="flex-grow-1 flex-sm-grow-0"
                          @click="openSavingDialog(item, 'Penarikan')"
                        >
                          <v-icon size="small">mdi-minus</v-icon>
                          <span class="d-none d-sm-inline ml-1">Tarik</span>
                        </v-btn>
                      </div>
                    </div>
                  </div>

                  <div
                    v-if="savingsDetails[item.id].transactions.length === 0"
                    class="text-center py-8"
                  >
                    <v-icon color="grey" size="48">mdi-bank-off</v-icon>
                    <div class="text-h6 text-grey-darken-1 mt-2">Belum ada transaksi</div>
                    <div class="text-body-2 text-grey-darken-2">
                      Riwayat transaksi tabungan akan muncul di sini
                    </div>
                  </div>

                  <!-- Desktop Table View -->
                  <div v-else class="d-none d-md-block">
                    <v-data-table
                      :headers="transactionHeaders"
                      :items="savingsDetails[item.id].transactions"
                      density="comfortable"
                      hide-default-footer
                      :items-per-page="-1"
                      class="transaction-table elevation-0"
                    >
                      <template #[`item.transaction_date`]="{ item }">
                        <span class="text-no-wrap">{{ formatDate(item.transaction_date) }}</span>
                      </template>

                      <template #[`item.description`]="{ item }">
                        <div class="d-flex align-center">
                          <v-chip
                            size="small"
                            :color="item.type === 'Setoran' ? 'success' : 'error'"
                            variant="flat"
                            class="mr-2"
                          >
                            {{ item.type }}
                          </v-chip>
                          <span>{{ item.description || item.type }}</span>
                        </div>
                      </template>

                      <template #[`item.debit`]="{ item }">
                        <span
                          v-if="item.type === 'Penarikan'"
                          class="text-error font-weight-medium"
                        >
                          {{ formatCurrency(item.amount) }}
                        </span>
                      </template>

                      <template #[`item.credit`]="{ item }">
                        <span
                          v-if="item.type === 'Setoran'"
                          class="text-success font-weight-medium"
                        >
                          {{ formatCurrency(item.amount) }}
                        </span>
                      </template>

                      <template #[`item.running_balance`]="{ item }">
                        <strong class="text-primary">{{
                          formatCurrency(item.running_balance)
                        }}</strong>
                      </template>
                    </v-data-table>
                  </div>

                  <!-- Mobile Card View -->
                  <div
                    v-if="savingsDetails[item.id].transactions.length > 0"
                    class="d-md-none mobile-transactions-container"
                  >
                    <v-card
                      v-for="transaction in savingsDetails[item.id].transactions"
                      :key="transaction.id"
                      class="mb-3"
                      variant="outlined"
                      rounded="lg"
                    >
                      <v-card-item class="pa-4">
                        <div class="d-flex justify-space-between align-start w-100 mb-3">
                          <div class="flex-grow-1">
                            <div class="d-flex align-center mb-2">
                              <v-chip
                                size="small"
                                :color="transaction.type === 'Setoran' ? 'success' : 'error'"
                                variant="flat"
                                class="mr-2"
                              >
                                <v-icon
                                  size="small"
                                  :icon="transaction.type === 'Setoran' ? 'mdi-plus' : 'mdi-minus'"
                                />
                                <span class="ml-1">{{ transaction.type }}</span>
                              </v-chip>
                              <span class="text-caption text-grey-darken-1">
                                {{ formatDate(transaction.transaction_date) }}
                              </span>
                            </div>

                            <div class="text-body-2 text-grey-darken-2 mb-3">
                              {{ transaction.description || transaction.type }}
                            </div>
                          </div>
                        </div>

                        <v-divider class="my-3"></v-divider>

                        <div class="transaction-details">
                          <div class="d-flex justify-space-between align-center mb-2">
                            <span class="text-caption text-grey-darken-1">Jumlah Transaksi:</span>
                            <span
                              :class="
                                transaction.type === 'Setoran' ? 'text-success' : 'text-error'
                              "
                              class="font-weight-medium"
                            >
                              {{ transaction.type === "Setoran" ? "+" : "-" }}
                              {{ formatCurrency(transaction.amount || 0) }}
                            </span>
                          </div>

                          <div class="d-flex justify-space-between align-center">
                            <span class="text-caption text-grey-darken-1"
                              >Saldo Setelah Transaksi:</span
                            >
                            <strong class="text-primary">
                              {{ formatCurrency(transaction.running_balance || 0) }}
                            </strong>
                          </div>
                        </div>
                      </v-card-item>
                    </v-card>
                  </div>
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

<style scoped>
/* Enhanced mobile-first responsive design */
.savings-details-container {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgb(var(--v-theme-outline-variant));
  border-radius: 12px;
  margin: 8px 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.savings-details-content {
  padding: 16px;
}

.savings-header {
  border-bottom: 1px solid rgb(var(--v-theme-outline-variant));
  margin-bottom: 16px;
  padding-bottom: 12px;
}

.mobile-transactions-container {
  padding: 4px 0;
  max-height: 60vh;
  overflow-y: auto;
}

/* Enhanced mobile responsiveness */
@media (max-width: 600px) {
  .v-card-item {
    padding: 16px !important;
  }

  .v-card-title {
    font-size: 1.25rem !important;
    line-height: 1.4;
  }

  .v-card-subtitle {
    font-size: 0.875rem !important;
    line-height: 1.4;
  }

  .savings-details-container {
    margin: 8px 12px;
  }

  .savings-details-content {
    padding: 12px;
  }

  .mobile-transactions-container .v-card {
    margin-bottom: 12px;
    border-radius: 12px !important;
  }

  .mobile-transactions-container .v-card-item {
    padding: 16px !important;
  }

  .v-chip {
    font-size: 0.75rem;
  }

  .v-btn.v-btn--size-small {
    min-height: 36px;
    font-size: 0.875rem;
  }
}

@media (max-width: 960px) {
  .v-card-item {
    padding: 20px !important;
  }

  .savings-details-container {
    margin: 8px 16px;
  }

  .v-card-text {
    padding-top: 16px !important;
    padding-bottom: 12px !important;
  }
}

/* Desktop enhancements */
@media (min-width: 961px) {
  .v-data-table {
    border-radius: 8px;
  }

  .v-data-table .v-data-table__td,
  .v-data-table .v-data-table__th {
    padding: 12px 16px;
  }

  .transaction-table {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
}

/* Button and interaction improvements */
.v-btn {
  border-radius: 8px;
  font-weight: 500;
  text-transform: none;
  letter-spacing: 0;
  transition: all 0.2s ease;
}

.v-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.v-chip {
  border-radius: 16px;
}

.v-card {
  border-radius: 12px;
  transition: all 0.2s ease;
}

.v-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Loading states */
.v-skeleton-loader {
  border-radius: 8px;
}

/* Table improvements */
.transaction-table .v-data-table__td,
.transaction-table .v-data-table__th {
  white-space: nowrap;
}

/* Custom scrollbar for mobile */
@media (max-width: 960px) {
  .mobile-transactions-container::-webkit-scrollbar {
    width: 4px;
  }

  .mobile-transactions-container::-webkit-scrollbar-track {
    background: rgb(var(--v-theme-surface-variant));
    border-radius: 2px;
  }

  .mobile-transactions-container::-webkit-scrollbar-thumb {
    background: rgb(var(--v-theme-outline));
    border-radius: 2px;
  }

  .mobile-transactions-container::-webkit-scrollbar-thumb:hover {
    background: rgb(var(--v-theme-outline-variant));
  }
}
</style>
