<script setup>
import { ref, onMounted, watch, computed } from "vue";
import api from "@/services/api";

// --- State Utama ---
const costItems = ref([]);
const unpaidBills = ref([]);
const selected = ref([]); // Menyimpan ID tagihan yg dipilih
const selectedCostItem = ref(null);

// --- State UI & Notifikasi ---
const loading = ref(false);
const loadingTable = ref(false);
const processing = ref(false);
const confirmDialog = ref(false); // [BARU]
const snackbar = ref({ show: false, text: "", color: "success" }); // [BARU]

// --- Data Bantu ---
const headers = [
  { title: "Nama Siswa", key: "student.name" },
  { title: "Angkatan", key: "student.enrollment_year", align: "center" },
  { title: "Kelas", key: "student.class_group.name" },
  { title: "Sisa Tagihan", key: "remaining_amount", align: "end" },
];

// [BARU] Menghitung ringkasan dari item yang dipilih
const selectionSummary = computed(() => {
  const count = selected.value.length;
  const totalAmount = selected.value.reduce((sum, billId) => {
    const bill = unpaidBills.value.find(b => b.id === billId);
    return sum + (bill ? bill.remaining_amount : 0);
  }, 0);
  return { count, totalAmount };
});

// --- Fungsi Helper ---
const showSnackbar = (text, color = "success") => { // [BARU]
  snackbar.value = { show: true, text, color };
};
const formatCurrency = (value) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);

// --- API Calls & Handlers ---
async function fetchCostItems() {
  loading.value = true;
  try {
    const response = await api.get("/cost-items?type=dinamis&active=true"); // Ambil item yg relevan
    costItems.value = response.data;
  } catch (error) {
    console.error("Gagal mengambil data item biaya:", error);
    showSnackbar("Gagal memuat item biaya.", "error");
  } finally {
    loading.value = false;
  }
}

async function fetchUnpaidBills() {
  if (!selectedCostItem.value) {
    unpaidBills.value = [];
    return;
  }
  loadingTable.value = true;
  selected.value = [];
  try {
    const response = await api.get(`/bills/unpaid?cost_item_id=${selectedCostItem.value}`);
    unpaidBills.value = response.data;
  } catch (error) {
    console.error("Gagal mengambil data tagihan:", error);
    showSnackbar("Gagal memuat data tagihan.", "error");
  } finally {
    loadingTable.value = false;
  }
}

watch(selectedCostItem, fetchUnpaidBills);

// [DIUBAH] Fungsi ini sekarang dipanggil dari dialog konfirmasi
async function handleBulkPayment() {
  if (selected.value.length === 0) return;
  processing.value = true;
  confirmDialog.value = false; // Tutup dialog
  try {
    const response = await api.post("/payments/bulk", {
      student_bill_ids: selected.value,
    });
    showSnackbar(response.data.message || "Pembayaran massal berhasil diproses!");
    await fetchUnpaidBills();
  } catch (error) {
    console.error("Gagal memproses pembayaran massal:", error);
    showSnackbar("Pembayaran Gagal! Silakan coba lagi.", "error");
  } finally {
    processing.value = false;
  }
}

onMounted(fetchCostItems);
</script>

<template>
  <v-container fluid>
    <v-card rounded="lg" border>
      <v-card-item>
        <v-card-title class="d-flex align-center">
          <v-icon start icon="mdi-cash-fast"></v-icon>
          Pembayaran Massal
        </v-card-title>
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
          :loading="loading"
          variant="outlined"
          density="compact"
          hide-details
        ></v-select>

        <v-divider class="my-6"></v-divider>

        <div v-if="selectedCostItem">
          <div class="text-subtitle-1 font-weight-medium mb-2">Langkah 2: Pilih Siswa yang Membayar</div>
          <v-data-table
            v-model="selected"
            :headers="headers"
            :items="unpaidBills"
            item-value="id"
            show-select
            :loading="loadingTable"
          >
            <template v-slot:['item.remaining_amount']="{ item }">
              {{ formatCurrency(item.remaining_amount) }}
            </template>
          </v-data-table>
        </div>

        <div v-else class="text-center text-grey py-10">
          <v-icon size="48">mdi-arrow-up-bold-box-outline</v-icon>
          <p class="mt-4">Silakan pilih jenis biaya terlebih dahulu untuk menampilkan daftar siswa.</p>
        </div>

      </v-card-text>

      <v-divider v-if="selectedCostItem"></v-divider>
      <v-card-actions v-if="selectedCostItem" class="pa-4">
        <v-chip color="info" label>
          Terpilih: <strong>{{ selectionSummary.count }} siswa</strong>
        </v-chip>
        <v-chip color="success" label class="ml-2">
          Total: <strong>{{ formatCurrency(selectionSummary.totalAmount) }}</strong>
        </v-chip>
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          variant="flat"
          size="large"
          :disabled="selected.length === 0 || processing"
          :loading="processing"
          @click="confirmDialog = true"
        >
          Proses Pembayaran
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-container>

  <v-dialog v-model="confirmDialog" max-width="500" persistent>
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
        <v-btn variant="text" @click="confirmDialog = false">Batal</v-btn>
        <v-btn color="primary" variant="flat" @click="handleBulkPayment">Ya, Konfirmasi & Proses</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="4000" location="top right">
    {{ snackbar.text }}
  </v-snackbar>
</template>
