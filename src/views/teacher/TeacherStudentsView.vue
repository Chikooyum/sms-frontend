
<script setup>
import { ref, watch, computed } from "vue";
import api from "@/services/api";
import PaymentDialog from "@/components/PaymentDialog.vue";

// --- State Utama & Tabel ---
const students = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(15);
const options = ref({
  page: 1,
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


// Function untuk generate receipt URL

// --- Logika Utama ---
async function loadStudents() {
  if (students.value.length === 0) {
    loading.value = true;
  }
  try {
    const { page, sortBy, itemsPerPage: perPage } = options.value;
    const sortKey = sortBy[0]?.key || "name";
    const sortOrder = sortBy[0]?.order || "asc";
    const response = await api.get("/students", {
      params: { page, sortBy: sortKey, sortOrder, perPage },
    });
    students.value = response.data.data;
    totalItems.value = response.data.total;
  } catch (error) {
    console.error("Gagal mengambil data siswa:", error);
    showSnackbar("Gagal memuat data siswa.", "error");
  } finally {
    loading.value = false;
  }
}

watch(options, loadStudents, { deep: true, immediate: true });

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
    const response = await api.post("/payments", paymentData);
    paymentDialog.value = false;
    showSnackbar("Pembayaran berhasil diproses!", "success");
    paymentIdForReceipt.value = response.data.id;
    receiptDialog.value = true;

    const studentId = billToPay.value.student_id;
    delete billDetails.value[studentId];
    await loadBillDetails([studentId]);
    await loadStudents();
  } catch (error) {
    const message = error.response?.data?.message || "Server Error";
    showSnackbar(`Pembayaran gagal: ${message}`, "error");
    console.error("Gagal memproses pembayaran:", error);
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

  <v-container fluid>
    <v-card rounded="lg" border>
      <v-card-item>
        <v-card-title class="d-flex align-center flex-wrap">
          <v-icon start icon="mdi-account-group-outline" class="mr-2"></v-icon>
          <span class="text-h6">Siswa Saya</span>
        </v-card-title>
        <v-card-subtitle class="text-wrap">
          Lihat daftar siswa dan kelola tagihan mereka.
        </v-card-subtitle>
      </v-card-item>

      <v-divider></v-divider>

      <v-data-table-server
        v-model:expanded="expanded"
        v-model:items-per-page="itemsPerPage"
        :headers="headers"
        :items="students"
        :items-length="totalItems"
        :loading="loading"
        item-value="id"
        show-expand
        density="comfortable"
        mobile-breakpoint="md"
        class="elevation-0"
        @update:options="options = $event"
        @update:expanded="loadBillDetails(expanded)"
      >
        <!-- Kolom: Tagihan Tertunda (ringkas di mobile) -->
        <template #["item.unpaid_info"]="{ item }">
          <div class="d-flex justify-center">
            <v-chip
              v-if="item.unpaid_bills_count > 0"
              color="warning"
              size="small"
              label
              class="text-no-wrap"
            >
              {{ item.unpaid_bills_count }} Tagihan
            </v-chip>
            <span v-else class="text-success text-caption d-inline-flex align-center">
              <v-icon size="small" color="success" class="mr-1">mdi-check-circle-outline</v-icon>
              Lunas
            </span>
          </div>
        </template>

        <!-- Expanded detail tagihan (scrollable di layar kecil) -->
        <template #expanded-row="{ columns, item }">
  <tr>
    <td :colspan="columns.length">
      <div class="pa-4 bg-grey-lighten-5 rounded">
        <div v-if="loadingDetails && !billDetails[item.id]" class="text-center pa-4">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
        </div>
        <div v-else-if="billDetails[item.id]">
          <h4 class="mb-3 text-h6 font-weight-regular text-center text-sm-left">
            Detail Tagihan untuk {{ item.name }}
          </h4>
          <div v-if="billDetails[item.id].length === 0" class="text-center text-grey pa-4 border rounded">
            Tidak ada data tagihan.
          </div>
          <div v-else>
            <!-- Tampilan Tabel untuk layar besar -->
            <div class="d-none d-sm-block bill-table-wrapper">
              <v-table density="compact" class="elevation-0">
                <thead>
                  <tr>
                    <th class="min-col-1">Deskripsi</th>
                    <th class="text-right min-col-2">Sisa Tagihan</th>
                    <th class="text-center min-col-2">Status</th>
                    <th class="text-right min-col-2">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="bill in billDetails[item.id]" :key="bill.id">
                    <td class="text-no-wrap">{{ bill.cost_item.name }}</td>
                    <td class="text-right font-weight-medium">{{ formatCurrency(bill.remaining_amount) }}</td>
                    <td class="text-center">
                      <v-chip :color="bill.status === 'Lunas' ? 'success' : 'warning'" size="small" label>
                        {{ bill.status }}
                      </v-chip>
                    </td>
                    <td class="text-right">
  <v-btn
    v-if="bill.status !== 'Lunas'"
    color="primary"
    size="small"
    class="text-none"
    @click="openPaymentDialog(bill)"
  >
    Bayar
  </v-btn>
  <v-btn
  v-else-if="bill.payments && bill.payments.length > 0"
  color="secondary"
  size="small"
  prepend-icon="mdi-receipt-text-outline"
  @click="downloadReceipt(bill.payments[0].id)"
  class="text-none"
>
  Lihat Kwitansi
</v-btn>
</td>
                  </tr>
                </tbody>
              </v-table>
            </div>

            <!-- Tampilan Kartu untuk layar kecil -->
            <div class="d-sm-none mobile-bills-container">
              <v-card
                v-for="bill in billDetails[item.id]"
                :key="bill.id"
                class="mb-3"
                variant="outlined"
              >
                <v-card-item>
                  <v-card-title class="text-subtitle-1">{{ bill.cost_item.name }}</v-card-title>
                  <v-card-subtitle>
                    <div class="d-flex justify-space-between align-center my-2">
                      <span>Sisa Tagihan:</span>
                      <span class="font-weight-medium">{{ formatCurrency(bill.remaining_amount) }}</span>
                    </div>
                    <div class="d-flex justify-space-between align-center">
                      <span>Status:</span>
                      <v-chip :color="bill.status === 'Lunas' ? 'success' : 'warning'" size="small" label>
                        {{ bill.status }}
                      </v-chip>
                    </div>
                  </v-card-subtitle>
                </v-card-item>
                <v-card-actions>
  <v-spacer></v-spacer>
  <v-btn
    v-if="bill.status !== 'Lunas'"
    color="primary"
    size="small"
    class="text-none"
    @click="openPaymentDialog(bill)"
  >
    Bayar
  </v-btn>
  <v-btn
  v-else-if="bill.payments && bill.payments.length > 0"
  color="secondary"
  size="small"
  prepend-icon="mdi-receipt-text-outline"
  @click="downloadReceipt(bill.payments[0].id)"
  class="text-none"
>
  Lihat Kwitansi
</v-btn>
</v-card-actions>
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
      </v-data-table-server>
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

<style>
/* Wrapper agar tabel detail bisa scroll horizontal di layar kecil */
/* Wrapper agar tabel detail bisa scroll horizontal di layar kecil */
.bill-table-wrapper {
  width: 100%;
  overflow-x: auto;
}

/* Lebar minimum kolom agar tidak terlalu sempit */
.min-col-1 {
  min-width: 160px;
}
.min-col-2 {
  min-width: 120px;
}

/* Tampilan mobile untuk tagihan */
.mobile-bills-container {
  padding: 0 4px;
}

/* Rapikan tampilan di mobile */
@media (max-width: 600px) {
  .v-card-subtitle {
    white-space: normal;
  }
  .v-data-table-server {
    font-size: 0.92rem;
  }
  .v-btn.v-btn--size-small {
    min-width: 40px;
    padding: 0 8px;
  }
  .text-no-wrap {
    white-space: nowrap;
  }
  /* Styling khusus untuk kartu tagihan di mobile */
  .mobile-bills-container .v-card {
    margin-bottom: 12px;
  }
  .mobile-bills-container .v-card-item {
    padding: 12px;
  }
  .mobile-bills-container .v-card-title {
    font-size: 1rem;
    margin-bottom: 8px;
    line-height: 1.3;
  }
  .mobile-bills-container .v-card-subtitle {
    font-size: 0.875rem;
  }
  .mobile-bills-container .v-card-actions {
    padding: 8px 12px 12px;
  }
}

/* Kurangi padding container di tablet */
@media (max-width: 960px) {
  .v-card-item,
  .v-card-text {
    padding-left: 12px !important;
    padding-right: 12px !important;
  }
}
</style>

