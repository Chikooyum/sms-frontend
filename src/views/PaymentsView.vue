<script setup>
import { ref, onMounted, watch, computed } from "vue";
import api from "@/services/api";
import PaymentDialog from "@/components/PaymentDialog.vue";
import ConfirmDialog from "@/components/ConfirmDialog.vue"; // [BARU] Import untuk dialog hapus
import MultiBillPaymentDialog from "@/components/MultiBillPaymentDialog.vue";
// --- STATE & HELPERS BERSAMA ---
const snackbar = ref({ show: false, text: "", color: "success" });
const tab = ref(null); // State untuk tab yang aktif
const baseApiUrl = computed(() => import.meta.env.VITE_API_URL || "http://127.0.0.1:8000");


const showSnackbar = (text, color = "success") => {
  snackbar.value = { show: true, text, color };
};
const formatCurrency = (value) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);

// --- LOGIKA & STATE UNTUK PEMBAYARAN INDIVIDUAL ---
const students = ref([]);
const studentBills = ref([]);
const selectedStudentId = ref(null);
const loadingStudents = ref(false);
const loadingBills = ref(false);
const paymentDialog = ref(false);
const billToPay = ref(null);
const receiptDialog = ref(false);
const paymentIdForReceipt = ref(null);
const studentSearch = ref('');

// --- [BARU] State untuk dialog hapus ---
const deleteDialog = ref(false);
const billToDelete = ref(null);
const multiPayDialog = ref(false); // State untuk dialog multi-payment
// --- State baru untuk multi-pembayaran ---
const selectedBills = ref([]);
const receiptNumber = ref('');

const selectedStudentData = computed(() => {
  return students.value.find((s) => s.id === selectedStudentId.value);
});

const filteredStudents = computed(() => {
  if (!studentSearch.value) {
    return students.value; // Tampilkan semua jika tidak ada pencarian
  }
  return students.value.filter(student =>
    student.name.toLowerCase().includes(studentSearch.value.toLowerCase())
  );
});
const billsToPayDetails = computed(() => {
  return studentBills.value.filter(bill => selectedBills.value.includes(bill.id));
});

const individualSelectionSummary = computed(() => {
  const totalAmount = billsToPayDetails.value.reduce((sum, bill) => {
    const amount = parseFloat(bill.remaining_amount) || 0;
    console.log('Bill:', bill.cost_item.name, 'Amount:', amount); // Debug
    return sum + amount;
  }, 0);
  console.log('Total calculated:', totalAmount); // Debug
  return { count: selectedBills.value.length, totalAmount };
});

const individualPaymentHeaders = [
  { title: "Deskripsi Tagihan", key: "cost_item.name", sortable: false },

  { title: "Sisa Tagihan", key: "remaining_amount", align: "end", sortable: false },
  { title: "Status", key: "status", align: "center", sortable: false },
  { title: "Aksi", key: "actions", align: "center", sortable: false },
];

async function fetchStudentBills() {
  if (!selectedStudentId.value) {
    studentBills.value = [];
    return;
  }
  loadingBills.value = true;
  try {
    const response = await api.get(`/students/${selectedStudentId.value}/bills`);
    studentBills.value = response.data;
  } catch (error) {
    console.error("Gagal mengambil tagihan siswa:", error);
    showSnackbar("Gagal memuat tagihan siswa.", "error");
  } finally {
    loadingBills.value = false;
  }
}
watch(selectedStudentId, () => {
  selectedBills.value = []; // Reset checkbox saat ganti siswa
  fetchStudentBills();
});

function openPaymentDialog(bill) {
  billToPay.value = bill;
  paymentDialog.value = true;
}

async function handlePayment(paymentData) {
  try {
    const response = await api.post("/payments", paymentData);
    paymentDialog.value = false;
    await fetchStudentBills();
    showSnackbar("Pembayaran berhasil diproses!", "success");
    paymentIdForReceipt.value = response.data.id;
    receiptDialog.value = true;
  } catch (error) {
    const message = error.response?.data?.message || "Terjadi kesalahan server.";
    showSnackbar(`Pembayaran gagal: ${message}`, "error");
  }
}

function printReceipt() {
  if (paymentIdForReceipt.value) {
    const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";
    window.open(`${baseUrl}/payments/${paymentIdForReceipt.value}/receipt`, "_blank");
  }
  receiptDialog.value = false;
  paymentIdForReceipt.value = null;
}

// --- [BARU] Fungsi untuk hapus tagihan ---
function openDeleteDialog(bill) {
  billToDelete.value = bill;
  deleteDialog.value = true;
}

async function confirmDeleteBill() {
  try {
    await api.delete(`/student-bills/${billToDelete.value.id}`);
    await fetchStudentBills(); // Refresh daftar tagihan
    showSnackbar(`Tagihan "${billToDelete.value.cost_item.name}" berhasil dihapus.`);
    deleteDialog.value = false;
  } catch (error) {
    const message = error.response?.data?.message || "Gagal menghapus tagihan.";
    showSnackbar(message, "error");
    console.error("Gagal menghapus tagihan:", error);
  }
}
// --- Logika baru untuk pembayaran multi-tagihan ---
async function handleMultiBillPayment(receiptNumber) { // TERIMA parameter receiptNumber
  console.log('Selected bills:', selectedBills.value);
  console.log('Receipt number:', receiptNumber);

  try {
    const response = await api.post('/payments/multi-bill', {
      student_bill_ids: selectedBills.value,
      receipt_number: receiptNumber, // KIRIM receipt_number
    });
    multiPayDialog.value = false;
    await fetchStudentBills();
    const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";
    window.open(`${baseUrl.replace('/api', '')}/api/receipts/${response.data.receipt_number}`, '_blank');
    selectedBills.value = [];
    showSnackbar("Pembayaran berhasil diproses!", "success");
  } catch (e) {
    console.error("Error response data:", e.response?.data);
    console.error("Full error:", e);
    showSnackbar(`Gagal: ${e.response?.data?.message || 'Error tidak dikenal'}`, 'error');
  }
}

async function downloadReceipt(paymentId) {
  try {
    const response = await api.get(`/payments/${paymentId}/receipt`, {
      responseType: 'blob'
    });

    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
    window.URL.revokeObjectURL(url);
  } catch (error) {
    showSnackbar('Gagal mengunduh kwitansi', 'error');
  }
}

// --- LOGIKA & STATE UNTUK PEMBAYARAN MASSAL ---
const costItems = ref([]);
const unpaidBills = ref([]);
const selectedBulk = ref([]);
const selectedCostItem = ref(null);
const loadingCostItems = ref(false);
const loadingBulkTable = ref(false);
const processingBulk = ref(false);
const confirmBulkDialog = ref(false);

const bulkPaymentHeaders = [
  { title: "Nama Siswa", key: "student.name" },
  { title: "Angkatan", key: "student.enrollment_year", align: "center" },
  { title: "Kelas", key: "student.class_group.name" },
  { title: "Sisa Tagihan", key: "remaining_amount", align: "end" },
];

const selectionSummary = computed(() => {
  const count = selectedBulk.value.length;
  const totalAmount = selectedBulk.value.reduce((sum, billId) => {
    const bill = unpaidBills.value.find(b => b.id === billId);
    return sum + (bill ? bill.remaining_amount : 0);
  }, 0);
  return { count, totalAmount };
});

async function fetchUnpaidBills() {
  if (!selectedCostItem.value) {
    unpaidBills.value = [];
    return;
  }
  loadingBulkTable.value = true;
  selectedBulk.value = [];
  try {
    const response = await api.get(`/bills/unpaid?cost_item_id=${selectedCostItem.value}`);
    unpaidBills.value = response.data;
  } catch (error) {
    showSnackbar("Gagal memuat data tagihan.", "error");
  } finally {
    loadingBulkTable.value = false;
  }
}
watch(selectedCostItem, fetchUnpaidBills);

async function handleBulkPayment() {
  if (selectedBulk.value.length === 0) return;
  processingBulk.value = true;
  confirmBulkDialog.value = false;
  try {
    const response = await api.post("/payments/bulk", {
      student_bill_ids: selectedBulk.value,
    });
    showSnackbar(response.data.message || "Pembayaran massal berhasil diproses!");
    await fetchUnpaidBills();
  } catch (error) {
    showSnackbar("Pembayaran Gagal! Silakan coba lagi.", "error");
  } finally {
    processingBulk.value = false;
  }
}

// --- FUNGSI onMounted GABUNGAN ---
onMounted(async () => {
  loadingStudents.value = true;
  loadingCostItems.value = true;
  try {
    const [studentsRes, costItemsRes] = await Promise.all([
      api.get("/students?all=true"),
      api.get("/cost-items?type=dinamis&active=true")
    ]);
    students.value = studentsRes.data.data;
    costItems.value = costItemsRes.data;
  } catch (error) {
    showSnackbar("Gagal memuat data awal untuk halaman pembayaran.", "error");
  } finally {
    loadingStudents.value = false;
    loadingCostItems.value = false;
  }
});
</script>

<template>
  <v-container fluid>
    <PaymentDialog v-model="paymentDialog" :bill="billToPay" @save="handlePayment" />

    <!-- [BARU] Dialog konfirmasi hapus tagihan -->
    <ConfirmDialog
      v-model="deleteDialog"
      title="Hapus Tagihan"
      :message="`Yakin ingin menghapus tagihan '${billToDelete?.cost_item?.name}' untuk siswa ini? Tindakan ini tidak bisa dibatalkan.`"
      confirm-color="error"
      @confirm="confirmDeleteBill"
    />
    <MultiBillPaymentDialog
  v-model="multiPayDialog"
  :bills-to-pay="billsToPayDetails"
  :total-amount="individualSelectionSummary.totalAmount"
  @save="handleMultiBillPayment"
/>

    <v-card rounded="lg" border>
      <v-tabs v-model="tab" bg-color="primary" grow>
        <v-tab value="individual">
          <v-icon start>mdi-account</v-icon>
          Pembayaran Individual
        </v-tab>
        <v-tab value="bulk">
          <v-icon start>mdi-account-group</v-icon>
          Pembayaran Massal
        </v-tab>
      </v-tabs>

      <v-window v-model="tab">
        <v-window-item value="individual">
          <v-row>
            <v-col cols="12" md="4">
              <v-card-text class="pt-6">
                <div class="text-subtitle-1 font-weight-medium mb-2">Pilih Siswa</div>

                <v-text-field
                  v-model="studentSearch"
                  label="Cari nama siswa..."
                  variant="outlined"
                  density="compact"
                  prepend-inner-icon="mdi-magnify"
                  clearable
                  hide-details
                  class="mb-2"
                ></v-text-field>

                <v-list
                  v-if="!loadingStudents"
                  lines="two"
                  select-strategy="single-independent"
                  class="border rounded-lg"
                  style="max-height: 450px; overflow-y: auto;"
                >
                  <div v-if="filteredStudents.length === 0" class="text-center text-grey pa-4">
                    Siswa tidak ditemukan.
                  </div>
                  <v-list-item
                    v-for="student in filteredStudents"
                    :key="student.id"
                    :value="student.id"
                    :active="selectedStudentId === student.id"
                    @click="selectedStudentId = student.id"
                    active-color="primary"
                  >
                    <v-list-item-title>{{ student.name }}</v-list-item-title>
                    <v-list-item-subtitle>Angkatan: {{ student.enrollment_year }}</v-list-item-subtitle>
                  </v-list-item>
                </v-list>

                <v-skeleton-loader v-if="loadingStudents" type="list-item@5"></v-skeleton-loader>

              </v-card-text>
            </v-col>
            <v-col cols="12" md="8">
              <v-card-item>
                <v-card-title class="d-flex align-center">
                  <v-icon start icon="mdi-receipt-text-outline"></v-icon>
                  Detail Tagihan Siswa
                </v-card-title>
                <v-card-subtitle v-if="selectedStudentData">
                  Tagihan untuk: <strong>{{ selectedStudentData.name }}</strong>
                </v-card-subtitle>
              </v-card-item>
              <v-divider></v-divider>
              <v-card-text v-if="!selectedStudentId" class="text-center text-grey py-16">
                <v-icon size="64">mdi-account-search</v-icon>
                <p class="mt-4">Pilih seorang siswa dari daftar di samping untuk melihat tagihannya.</p>
              </v-card-text>
              <v-data-table
  v-model="selectedBills"
  :headers="individualPaymentHeaders"
  :items="studentBills"
  :loading="loadingBills"
  item-value="id"
  show-select
  :show-select="item => item.status !== 'Lunas'"
>
                <template v-slot:['item.status']="{ item }">
                  <v-chip :color="item.status === 'Lunas' ? 'success' : 'warning'" size="small">{{ item.status }}</v-chip>
                </template>
                <template v-slot:['item.actions']="{ item }">
                  <div class="d-flex ga-2 justify-center">
                    <!-- Tombol Bayar untuk tagihan yang belum lunas -->
                    <v-btn v-if="item.status !== 'Lunas'" color="primary" size="small" @click="openPaymentDialog(item)">
                      Bayar
                    </v-btn>

                    <!-- [BARU] Tombol Lihat Kwitansi untuk tagihan yang sudah lunas -->
                    <v-btn
  v-else-if="item.payments && item.payments.length > 0"
  color="secondary"
  size="small"
  prepend-icon="mdi-receipt-text-outline"
  :href="`${baseApiUrl}/api/receipts/${item.payments[0].receipt_number}`"
  target="_blank"
>
  Lihat Kwitansi
</v-btn>

                    <!-- Tombol hapus untuk tagihan yang belum lunas -->
                    <v-btn
                      v-if="item.status === 'Belum Lunas'"
                      icon="mdi-delete"
                      variant="text"
                      color="error"
                      size="small"
                      @click="openDeleteDialog(item)"
                    ></v-btn>
                  </div>
                </template>
                <template v-slot:['item.total_amount']="{ item }">
                  {{ formatCurrency(item.total_amount) }}
                </template>
                <template v-slot:['item.remaining_amount']="{ item }">
                  <span class="font-weight-bold">{{ formatCurrency(item.remaining_amount) }}</span>
                </template>
              </v-data-table>
              <v-card-actions v-if="selectedBills.length > 0" class="pa-4">
  <v-chip color="info" label>
    Terpilih: <strong>{{ individualSelectionSummary.count }} tagihan</strong>
  </v-chip>
  <v-chip color="success" label class="ml-2">
    Total: <strong>{{ formatCurrency(individualSelectionSummary.totalAmount) }}</strong>
  </v-chip>
  <v-spacer></v-spacer>
  <v-btn color="primary" variant="flat" @click="multiPayDialog = true">
    Bayar Tagihan Terpilih
  </v-btn>
</v-card-actions>
            </v-col>
          </v-row>
        </v-window-item>

        <v-window-item value="bulk">
          <v-card-item>
            <v-card-subtitle>Proses pembayaran untuk satu jenis tagihan ke banyak siswa sekaligus.</v-card-subtitle>
          </v-card-item>
          <v-card-text>
            <div class="text-subtitle-1 font-weight-medium mb-2">Langkah 1: Pilih Jenis Biaya</div>
            <v-select
              v-model="selectedCostItem"
              :items="costItems"
              item-title="name"
              item-value="id"
              label="Pilih item biaya yang akan dibayar lunas"
              :loading="loadingCostItems"
              variant="outlined"
              density="compact"
              hide-details
            ></v-select>
            <v-divider class="my-6"></v-divider>
            <div v-if="selectedCostItem">
              <div class="text-subtitle-1 font-weight-medium mb-2">Langkah 2: Pilih Siswa yang Membayar</div>
              <v-data-table
                v-model="selectedBulk"
                :headers="bulkPaymentHeaders"
                :items="unpaidBills"
                item-value="id"
                show-select
                :loading="loadingBulkTable"
              >
                <template v-slot:['item.remaining_amount']="{ item }">
                  {{ formatCurrency(item.remaining_amount) }}
                </template>
              </v-data-table>
            </div>
            <div v-else class="text-center text-grey py-10">
              <v-icon size="48">mdi-arrow-up-bold-box-outline</v-icon>
              <p class="mt-4">Pilih jenis biaya untuk menampilkan daftar siswa.</p>
            </div>
          </v-card-text>
          <v-divider v-if="selectedCostItem"></v-divider>
          <v-card-actions v-if="selectedCostItem" class="pa-4">
            <v-chip color="info" label>Terpilih: <strong>{{ selectionSummary.count }} siswa</strong></v-chip>
            <v-chip color="success" label class="ml-2">Total: <strong>{{ formatCurrency(selectionSummary.totalAmount) }}</strong></v-chip>
            <v-spacer></v-spacer>
            <v-btn color="primary" variant="flat" size="large" :disabled="selectedBulk.length === 0 || processingBulk" :loading="processingBulk" @click="confirmBulkDialog = true">
              Proses Pembayaran
            </v-btn>
          </v-card-actions>

        </v-window-item>
      </v-window>
    </v-card>
  </v-container>

  <v-dialog v-model="receiptDialog" max-width="450" persistent>
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon icon="mdi-check-circle" color="success" class="mr-2"></v-icon> Pembayaran Berhasil
      </v-card-title>
      <v-card-text>Pembayaran telah berhasil diproses. Apakah Anda ingin mencetak kwitansi sekarang?</v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="receiptDialog = false">Lain Kali</v-btn>
        <v-btn color="primary" @click="printReceipt">Ya, Cetak Sekarang</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  <v-dialog v-model="confirmBulkDialog" max-width="500" persistent>
    <v-card>
      <v-card-title class="text-h5">Konfirmasi Pembayaran Massal</v-card-title>
      <v-card-text>
        Anda akan mengkonfirmasi pembayaran lunas untuk
        <strong>{{ selectionSummary.count }} siswa</strong> dengan total sebesar
        <strong>{{ formatCurrency(selectionSummary.totalAmount) }}</strong>.
        <br><br>
        Apakah Anda yakin ingin melanjutkan? Aksi ini tidak dapat dibatalkan.
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="confirmBulkDialog = false">Batal</v-btn>
        <v-btn color="primary" variant="flat" @click="handleBulkPayment">Ya, Konfirmasi & Proses</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="4000" location="top right">
    {{ snackbar.text }}
  </v-snackbar>
</template>
