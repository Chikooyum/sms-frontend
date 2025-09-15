
<script setup>
import { ref, watch, computed } from "vue";
import api from "@/services/api";
import PaymentDialog from "@/components/PaymentDialog.vue";
import MultiBillPaymentDialog from "@/components/MultiBillPaymentDialog.vue";

// --- State Utama & Tabel ---
const students = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const options = ref({
  sortBy: [{ key: "name", order: "asc" }],
});
// Computed untuk base URL

// Function untuk generate receipt URL

// --- State Interaksi & UI ---
const expanded = ref([]);
const billDetails = ref({});
const loadingDetails = ref(false);
const paymentDialog = ref(false);
const billToPay = ref(null);
const snackbar = ref({ show: false, text: "", color: "success" });
const receiptDialog = ref(false);
const paymentIdForReceipt = ref(null);

// --- State untuk multi-payment ---
const selectedBills = ref([]);
const multiPayDialog = ref(false);

const headers = [
  { title: "Nama Lengkap", key: "name", sortable: true },
  { title: "Kelas", key: "class_group.name", sortable: false, class: "d-none d-sm-table-cell" },
  { title: "Tagihan Tertunda", key: "unpaid_info", align: "center", sortable: false },
  { title: "", key: "data-table-expand", align: "end" },
];

// --- Fungsi Helper ---
const showSnackbar = (text, color = "success") => {
  snackbar.value = { show: true, text, color };
};
const formatCurrency = (value) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);

// --- Computed untuk multi-payment ---
const billsToPayDetails = computed(() => {
  const allBills = [];
  Object.values(billDetails.value).forEach(bills => {
    allBills.push(...bills);
  });
  return allBills.filter(bill => selectedBills.value.includes(bill.id));
});

const multiSelectionSummary = computed(() => {
  const totalAmount = billsToPayDetails.value.reduce((sum, bill) => {
    return sum + parseFloat(bill.remaining_amount || 0);
  }, 0);
  return { count: selectedBills.value.length, totalAmount };
});

// Helper functions for per-student selection
function getSelectedBillsForStudent(studentId) {
  if (!billDetails.value[studentId]) return [];
  return billDetails.value[studentId].filter(bill => selectedBills.value.includes(bill.id));
}

function getSelectedAmountForStudent(studentId) {
  const selectedBills = getSelectedBillsForStudent(studentId);
  return selectedBills.reduce((sum, bill) => {
    return sum + parseFloat(bill.remaining_amount || 0);
  }, 0);
}

function openMultiPaymentForStudent(studentId) {
  const selectedBillsForStudent = getSelectedBillsForStudent(studentId);
  billToPay.value = selectedBillsForStudent;
  multiPayDialog.value = true;
}


// Function untuk generate receipt URL

// --- Logika Utama ---
async function loadStudents() {
  if (students.value.length === 0) {
    loading.value = true;
  }
  try {
    const { sortBy } = options.value;
    const sortKey = sortBy[0]?.key || "name";
    const sortOrder = sortBy[0]?.order || "asc";
    // Fetch all students without pagination
    const response = await api.get("/students", {
      params: { all: true, sortBy: sortKey, sortOrder },
    });
    students.value = response.data.data || response.data;
    totalItems.value = students.value.length;
  } catch (error) {
    console.error("Gagal mengambil data siswa:", error);
    showSnackbar("Gagal memuat data siswa.", "error");
  } finally {
    loading.value = false;
  }
}

watch(options, loadStudents, { deep: true, immediate: true });

// Clear selected bills when bill details change
watch(billDetails, () => {
  selectedBills.value = selectedBills.value.filter(id => {
    return Object.values(billDetails.value).some(bills =>
      bills.some(bill => bill.id === id && bill.status !== 'Lunas')
    );
  });
}, { deep: true });

// Memuat detail untuk banyak siswa sekaligus (responsive-friendly)
async function loadBillDetails(studentIds) {
  const idsToLoad = studentIds.filter((id) => id && !billDetails.value[id]);
  if (idsToLoad.length === 0) return;

  loadingDetails.value = true;

  const promises = idsToLoad.map((studentId) =>
    api
      .get(`/students/${studentId}/bills`)
      .then((response) => {
        billDetails.value[studentId] = response.data;
      })
      .catch((error) => {
        console.error(`Gagal mengambil detail tagihan untuk siswa ${studentId}:`, error);
        billDetails.value[studentId] = [];
      })
  );

  await Promise.all(promises);
  loadingDetails.value = false;
}

function openPaymentDialog(bill) {
  billToPay.value = bill;
  paymentDialog.value = true;
}


async function handlePayment(paymentData) {
  try {
    let response;

    // Check if it's multiple bills payment
    if (paymentData.student_bill_ids) {
      const bills = billsToPayDetails.value;
      const totalRemaining = bills.reduce((sum, bill) => sum + parseFloat(bill.remaining_amount || 0), 0);

      // If payment amount equals total remaining, use multi-bill endpoint for full payment
      if (parseFloat(paymentData.amount_paid) >= totalRemaining) {
        response = await api.post("/payments/multi-bill", {
          student_bill_ids: paymentData.student_bill_ids,
          receipt_number: paymentData.receipt_number,
        });
      } else {
        // For partial payments, create a single combined payment record
        // Use the first bill as the primary bill for the payment record
        const primaryBill = bills[0];
        response = await api.post("/payments", {
          student_bill_id: primaryBill.id,
          amount_paid: paymentData.amount_paid,
          receipt_number: paymentData.receipt_number,
        });

        // Mark other bills as included in this combined payment
        // This is a simplified approach - in a real system, you'd want to
        // create proper relationships between payments and bills
        console.log(`Combined payment created for ${paymentData.amount_paid} across ${bills.length} bills`);
      }
    } else {
      // Single bill - use regular payment endpoint
      response = await api.post("/payments", paymentData);
    }

    paymentDialog.value = false;
    showSnackbar("Pembayaran berhasil diproses!", "success");

    // Handle receipt opening
    if (paymentData.student_bill_ids) {
      const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";
      window.open(`${baseUrl.replace('/api', '')}/api/receipts/${response.data.receipt_number}`, '_blank');
    } else {
      paymentIdForReceipt.value = response.data.id;
      receiptDialog.value = true;
    }

    // Refresh bill details for affected students
    const bills = Array.isArray(billToPay.value) ? billToPay.value : [billToPay.value];
    const affectedStudentIds = [...new Set(bills.map(bill => bill.student_id))];
    affectedStudentIds.forEach(studentId => {
      delete billDetails.value[studentId];
    });
    await loadBillDetails(affectedStudentIds);
    await loadStudents();

    // Clear selections
    selectedBills.value = [];
  } catch (error) {
    const message = error.response?.data?.message || "Server Error";
    showSnackbar(`Pembayaran gagal: ${message}`, "error");
    console.error("Gagal memproses pembayaran:", error);
  }
}

// Handle multi-bill payment from MultiBillPaymentDialog
async function handleMultiBillPayment(receiptNumber, billsToPay = null) {
  try {
    const bills = billsToPay || billsToPayDetails.value;
    const response = await api.post('/payments/multi-bill', {
      student_bill_ids: bills.map(bill => bill.id),
      receipt_number: receiptNumber,
    });
    multiPayDialog.value = false;
    showSnackbar("Pembayaran berhasil diproses!", "success");

    // Refresh bill details for affected students
    const affectedStudentIds = [...new Set(bills.map(bill => bill.student_id))];
    affectedStudentIds.forEach(studentId => {
      delete billDetails.value[studentId];
    });
    await loadBillDetails(affectedStudentIds);
    await loadStudents();

    // Open receipt
    const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";
    window.open(`${baseUrl.replace('/api', '')}/api/receipts/${response.data.receipt_number}`, '_blank');

    // Clear selections for the bills that were paid
    selectedBills.value = selectedBills.value.filter(id =>
      !bills.some(bill => bill.id === id)
    );
  } catch (error) {
    console.error("Error response data:", error.response?.data);
    console.error("Full error:", error);
    showSnackbar(`Gagal: ${error.response?.data?.message || 'Error tidak dikenal'}`, 'error');
  }
}


async function printReceipt() {
  if (paymentIdForReceipt.value) {
    await downloadReceipt(paymentIdForReceipt.value);
  }
  receiptDialog.value = false;
  paymentIdForReceipt.value = null;
}
async function downloadReceipt(paymentId) {
  try {
    console.log('Downloading receipt for payment:', paymentId);

    const response = await api.get(`/payments/${paymentId}/receipt`, {
      responseType: 'blob'
    });

    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading receipt:', error);
    showSnackbar('Gagal mengunduh kwitansi', 'error');
  }
}
</script>

<template>
  <PaymentDialog v-model="paymentDialog" :bill="billToPay" @save="handlePayment" />
  <MultiBillPaymentDialog
    v-model="multiPayDialog"
    :bills-to-pay="billsToPayDetails"
    :total-amount="multiSelectionSummary.totalAmount"
    @save="(receiptNumber) => handleMultiBillPayment(receiptNumber, billsToPayDetails)"
  />

  <v-container fluid>
    <v-card rounded="lg" border>
      <v-card-item class="pb-4">
        <div class="d-flex flex-column flex-sm-row align-start align-sm-center justify-space-between w-100 gap-3">
          <div class="flex-grow-1">
            <v-card-title class="d-flex align-center pa-0 mb-1">
              <v-icon start icon="mdi-account-group-outline" class="mr-2"></v-icon>
              <span class="text-h6 text-md-h5">Siswa Saya</span>
            </v-card-title>
            <v-card-subtitle class="text-wrap pa-0 text-grey-darken-1">
              Lihat daftar siswa dan kelola tagihan mereka.
            </v-card-subtitle>
          </div>

          <div class="d-flex align-center gap-2 w-100 w-sm-auto">
            <div class="text-caption text-grey-darken-1 d-none d-md-block">
              Total: <strong>{{ students.length }}</strong> siswa
            </div>
            <v-chip
              color="primary"
              variant="outlined"
              size="small"
              class="d-md-none"
            >
              <v-icon start size="small">mdi-account-group</v-icon>
              {{ students.length }}
            </v-chip>
          </div>
        </div>
      </v-card-item>

      <v-divider></v-divider>

      <v-data-table
        v-model:expanded="expanded"
        :headers="headers"
        :items="students"
        :loading="loading"
        item-value="id"
        show-expand
        density="comfortable"
        mobile-breakpoint="md"
        class="elevation-0"
        hide-default-footer
        :items-per-page="-1"
        @update:expanded="loadBillDetails(expanded)"
      >
        <!-- Mobile-optimized unpaid info display -->
        <template #["item.unpaid_info"]="{ item }">
          <div class="d-flex justify-center">
            <v-chip
              v-if="item.unpaid_bills_count > 0"
              color="warning"
              size="small"
              label
              class="text-no-wrap"
              variant="flat"
            >
              <v-icon start size="small" class="d-none d-sm-inline">mdi-cash-multiple</v-icon>
              {{ item.unpaid_bills_count }}
            </v-chip>
            <v-chip
              v-else
              color="success"
              size="small"
              label
              variant="flat"
              class="text-no-wrap"
            >
              <v-icon start size="small" class="d-none d-sm-inline">mdi-check-circle</v-icon>
              <span class="d-none d-sm-inline">Lunas</span>
              <span class="d-sm-none">✓</span>
            </v-chip>
          </div>
        </template>
        <!-- Kolom: Tagihan Tertunda (ringkas di mobile) -->
        <template #["item.unpaid_info"]="{ item }">
          <div class="d-flex justify-center">
            <v-chip
              v-if="item.unpaid_bills_count > 0"
              color="warning"
              size="small"
              label
              class="text-no-wrap"
              variant="flat"
            >
              <v-icon start size="small" class="d-none d-sm-inline">mdi-cash-multiple</v-icon>
              {{ item.unpaid_bills_count }}
            </v-chip>
            <v-chip
              v-else
              color="success"
              size="small"
              label
              variant="flat"
              class="text-no-wrap"
            >
              <v-icon start size="small" class="d-none d-sm-inline">mdi-check-circle</v-icon>
              <span class="d-none d-sm-inline">Lunas</span>
              <span class="d-sm-none">✓</span>
            </v-chip>
          </div>
        </template>

        <!-- Expanded detail tagihan (optimized for mobile) -->
        <template #expanded-row="{ columns, item }">
          <tr>
            <td :colspan="columns.length" class="pa-0">
              <div class="bill-details-container">
                <div v-if="loadingDetails && !billDetails[item.id]" class="text-center py-6">
                  <v-progress-circular indeterminate color="primary" size="24" />
                  <div class="text-caption text-grey-darken-1 mt-2">Memuat detail tagihan...</div>
                </div>

                <div v-else-if="billDetails[item.id]" class="bill-details-content">
                  <div class="bill-header">
                    <h4 class="text-subtitle-1 font-weight-medium mb-3">
                      <v-icon start size="small" color="primary">mdi-receipt</v-icon>
                      Tagihan {{ item.name }}
                    </h4>
                  </div>

                  <div v-if="billDetails[item.id].length === 0" class="text-center py-6">
                    <v-icon color="grey" size="32">mdi-receipt-text-off</v-icon>
                    <div class="text-body-2 text-grey-darken-1 mt-2">Tidak ada data tagihan</div>
                  </div>

                  <div v-else>
                    <!-- Desktop Table View -->
                    <div class="d-none d-md-block bill-table-wrapper">
                      <v-table density="compact" class="elevation-0">
                        <thead>
                          <tr>
                            <th class="text-center min-col-2">Pilih</th>
                            <th class="min-col-1">Deskripsi</th>
                            <th class="text-right min-col-2">Sisa Tagihan</th>
                            <th class="text-center min-col-2">Status</th>
                            <th class="text-right min-col-2">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="bill in billDetails[item.id]" :key="bill.id">
                            <td class="text-center">
                              <v-checkbox
                                v-model="selectedBills"
                                :value="bill.id"
                                :disabled="bill.status === 'Lunas'"
                                hide-details
                                density="compact"
                              />
                            </td>
                            <td class="text-no-wrap">{{ bill.cost_item.name }}</td>
                            <td class="text-right font-weight-medium">{{ formatCurrency(bill.remaining_amount) }}</td>
                            <td class="text-center">
                              <v-chip :color="bill.status === 'Lunas' ? 'success' : 'warning'" size="small" label variant="flat">
                                {{ bill.status }}
                              </v-chip>
                            </td>
                            <td class="text-right">
                              <v-btn
                                v-if="bill.status !== 'Lunas'"
                                color="primary"
                                size="small"
                                variant="flat"
                                @click="openPaymentDialog(bill)"
                              >
                                <v-icon start size="small">mdi-cash</v-icon>
                                Bayar
                              </v-btn>
                              <v-btn
                                v-else-if="bill.payments && bill.payments.length > 0"
                                color="secondary"
                                size="small"
                                variant="flat"
                                @click="downloadReceipt(bill.payments[0].id)"
                              >
                                <v-icon start size="small">mdi-receipt-text</v-icon>
                                Kwitansi
                              </v-btn>
                            </td>
                          </tr>
                        </tbody>
                      </v-table>
                    </div>

                    <!-- Mobile Card View -->
                    <div class="d-md-none mobile-bills-container">
                      <v-card
                        v-for="bill in billDetails[item.id]"
                        :key="bill.id"
                        class="mb-3"
                        variant="outlined"
                        rounded="lg"
                      >
                        <v-card-item class="pb-2">
                          <div class="d-flex align-start w-100">
                            <v-checkbox
                              v-model="selectedBills"
                              :value="bill.id"
                              :disabled="bill.status === 'Lunas'"
                              hide-details
                              density="compact"
                              class="mt-1 mr-3 flex-shrink-0"
                            />
                            <div class="flex-grow-1">
                              <div class="text-subtitle-2 font-weight-medium mb-1">{{ bill.cost_item.name }}</div>
                              <div class="d-flex justify-space-between align-center">
                                <span class="text-caption text-grey-darken-1">Sisa Tagihan:</span>
                                <span class="text-body-2 font-weight-medium">{{ formatCurrency(bill.remaining_amount) }}</span>
                              </div>
                              <div class="d-flex justify-space-between align-center mt-1">
                                <span class="text-caption text-grey-darken-1">Status:</span>
                                <v-chip :color="bill.status === 'Lunas' ? 'success' : 'warning'" size="small" label variant="flat">
                                  {{ bill.status }}
                                </v-chip>
                              </div>
                            </div>
                          </div>
                        </v-card-item>

                        <v-card-actions class="pt-0">
                          <v-spacer />
                          <v-btn
                            v-if="bill.status !== 'Lunas'"
                            color="primary"
                            size="small"
                            variant="flat"
                            @click="openPaymentDialog(bill)"
                          >
                            <v-icon start size="small">mdi-cash</v-icon>
                            Bayar
                          </v-btn>
                          <v-btn
                            v-else-if="bill.payments && bill.payments.length > 0"
                            color="secondary"
                            size="small"
                            variant="flat"
                            @click="downloadReceipt(bill.payments[0].id)"
                          >
                            <v-icon start size="small">mdi-receipt-text</v-icon>
                            Kwitansi
                          </v-btn>
                        </v-card-actions>
                      </v-card>
                    </div>

                    <!-- Payment summary for selected bills -->
                    <div v-if="getSelectedBillsForStudent(item.id).length > 0" class="payment-summary">
                      <v-card variant="tonal" color="blue-lighten-5" class="pa-3">
                        <div class="d-flex flex-column flex-sm-row align-start align-sm-center justify-space-between gap-3">
                          <div class="d-flex flex-column flex-sm-row align-start align-sm-center gap-2">
                            <v-chip color="info" variant="flat" size="small">
                              <v-icon start size="small">mdi-check-circle</v-icon>
                              {{ getSelectedBillsForStudent(item.id).length }} tagihan terpilih
                            </v-chip>
                            <v-chip color="success" variant="flat" size="small">
                              <v-icon start size="small">mdi-cash</v-icon>
                              {{ formatCurrency(getSelectedAmountForStudent(item.id)) }}
                            </v-chip>
                          </div>
                          <v-btn
                            color="primary"
                            variant="flat"
                            size="small"
                            @click="openMultiPaymentForStudent(item.id)"
                            class="align-self-stretch align-self-sm-auto"
                          >
                            <v-icon start size="small">mdi-cash-multiple</v-icon>
                            Bayar Semua
                          </v-btn>
                        </div>
                      </v-card>
                    </div>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </template>

<!-- Empty & Loading states -->
        <template #no-data>
          <div class="text-center pa-6">Tidak ada data siswa.</div>
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

  <v-dialog v-model="receiptDialog" max-width="450" persistent>
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon icon="mdi-check-circle" color="success" class="mr-2"></v-icon>
        Pembayaran Berhasil
      </v-card-title>
      <v-card-text>
        Pembayaran telah berhasil diproses. Apakah Anda ingin mencetak kwitansi sekarang?
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="receiptDialog = false">Lain Kali</v-btn>
        <v-btn color="primary" @click="printReceipt">Ya, Cetak Sekarang</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* Enhanced mobile-first responsive design */
.bill-details-container {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgb(var(--v-theme-outline-variant));
  border-radius: 12px;
  margin: 8px 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.bill-details-content {
  padding: 16px;
}

.bill-header {
  border-bottom: 1px solid rgb(var(--v-theme-outline-variant));
  margin-bottom: 16px;
  padding-bottom: 12px;
}

.payment-summary {
  margin-top: 16px;
}

/* Desktop table wrapper */
.bill-table-wrapper {
  width: 100%;
  overflow-x: auto;
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
}

/* Minimum column widths */
.min-col-1 {
  min-width: 160px;
}

.min-col-2 {
  min-width: 120px;
}

/* Mobile bills container */
.mobile-bills-container {
  padding: 4px 0;
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

  .bill-details-container {
    margin: 8px 12px;
  }

  .bill-details-content {
    padding: 12px;
  }

  .mobile-bills-container .v-card {
    margin-bottom: 12px;
    border-radius: 12px !important;
  }

  .mobile-bills-container .v-card-item {
    padding: 16px !important;
  }

  .mobile-bills-container .v-card-actions {
    padding: 8px 16px 16px !important;
  }

  .v-chip {
    font-size: 0.75rem;
  }

  .v-btn.v-btn--size-small {
    min-height: 36px;
    font-size: 0.875rem;
  }

  .text-no-wrap {
    white-space: nowrap;
  }
}

@media (max-width: 960px) {
  .v-card-item {
    padding: 20px !important;
  }

  .bill-details-container {
    margin: 8px 16px;
  }

  .mobile-bills-container {
    max-height: 60vh;
    overflow-y: auto;
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

  .bill-table-wrapper {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
}

/* Button and interaction improvements */
.v-btn {
  border-radius: 8px;
  font-weight: 500;
  text-transform: none;
  letter-spacing: 0;
}

.v-btn-toggle .v-btn {
  border-radius: 6px;
  margin: 2px;
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
.v-table {
  border-radius: 8px;
}

.v-table .v-table__th,
.v-table .v-table__td {
  border-bottom: 1px solid rgb(var(--v-theme-outline-variant));
}

/* Custom scrollbar for mobile */
@media (max-width: 960px) {
  .mobile-bills-container::-webkit-scrollbar {
    width: 4px;
  }

  .mobile-bills-container::-webkit-scrollbar-track {
    background: rgb(var(--v-theme-surface-variant));
    border-radius: 2px;
  }

  .mobile-bills-container::-webkit-scrollbar-thumb {
    background: rgb(var(--v-theme-outline));
    border-radius: 2px;
  }

  .mobile-bills-container::-webkit-scrollbar-thumb:hover {
    background: rgb(var(--v-theme-outline-variant));
  }
}
</style>

