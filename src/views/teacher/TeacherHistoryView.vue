<script setup>
import { ref, watch } from "vue";
import api from "@/services/api";

const payments = ref([]);
const loading = ref(true);

const range = ref("1_month");
const rangeOptions = [
  { title: "1 Bulan Terakhir", value: "1_month" },
  { title: "3 Bulan Terakhir", value: "3_months" },
  { title: "Semua", value: "all" },
];

// --- TAMBAHKAN KOLOM 'DIPROSES OLEH' ---
const headers = [
  { title: "Tanggal", key: "payment_date" },
  { title: "No. Kwitansi", key: "receipt_number" },
  { title: "Nama Siswa", key: "student_bill.student.name" },
  { title: "Diproses Oleh", key: "processor.name" }, // <-- Kolom baru
  { title: "Jumlah", key: "amount_paid", align: "end" },
  { title: "Aksi", key: "actions", sortable: false, align: "center" },
];

async function fetchPayments() {
  loading.value = true;
  try {
    const response = await api.get("/reports/all-payments", {
      params: {
        range: range.value,
        all: true, // Fetch all records without pagination
      },
    });

    payments.value = response.data.data || response.data;
  } catch (error) {
    console.error("Gagal mengambil riwayat transaksi:", error);
  } finally {
    loading.value = false;
  }
}

watch(range, fetchPayments, { immediate: true });

function setRowClass({ item }) {
  return { class: item.is_multi_bill ? "bg-deep-purple-lighten-5" : "" };
}

// Tambah fungsi download receipt dengan auth
async function downloadReceipt(receiptNumber) {
  try {
    const response = await api.get(`/receipts/${receiptNumber}`, {
      responseType: "blob",
    });

    const blob = new Blob([response.data], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);
    window.open(url, "_blank");
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Gagal mengunduh kwitansi:", error);
  }
}

const formatDate = (value) =>
  new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
const formatCurrency = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
</script>

<template>
  <v-card rounded="lg" border>
    <v-card-item class="pb-4">
      <div
        class="d-flex flex-column flex-sm-row align-start align-sm-center justify-space-between w-100 gap-3"
      >
        <div class="flex-grow-1">
          <v-card-title class="d-flex align-center pa-0 mb-1">
            <v-icon start icon="mdi-history" class="mr-2"></v-icon>
            <span class="text-h6 text-md-h5">Riwayat Transaksi Anda</span>
          </v-card-title>
          <v-card-subtitle class="text-wrap pa-0 text-grey-darken-1">
            Lihat semua transaksi pembayaran yang telah diproses.
          </v-card-subtitle>
        </div>

        <div class="d-flex align-center gap-2 w-100 w-sm-auto">
          <div class="text-caption text-grey-darken-1 d-none d-md-block">
            Total: <strong>{{ payments.length }}</strong> transaksi
          </div>
          <v-chip color="primary" variant="outlined" size="small" class="d-md-none">
            <v-icon start size="small">mdi-receipt-text</v-icon>
            {{ payments.length }}
          </v-chip>
        </div>
      </div>
    </v-card-item>

    <v-card-text class="pt-0 pb-4">
      <v-btn-toggle
        v-model="range"
        mandatory
        divided
        density="comfortable"
        class="w-100 w-sm-auto"
        variant="outlined"
      >
        <v-btn
          v-for="opt in rangeOptions"
          :key="opt.value"
          :value="opt.value"
          class="flex-grow-1 flex-sm-grow-0"
          size="small"
        >
          {{ opt.title }}
        </v-btn>
      </v-btn-toggle>
    </v-card-text>
    <v-data-table
      :headers="headers"
      :items="payments"
      :loading="loading"
      item-value="id"
      :row-props="setRowClass"
      hide-default-footer
      :items-per-page="-1"
      density="comfortable"
      mobile-breakpoint="md"
      class="elevation-0"
    >
      <!-- Mobile-optimized date display -->
      <template #item.payment_date="{ item }">
        <span class="text-no-wrap">{{ formatDate(item.payment_date) }}</span>
      </template>

      <!-- Student name with better mobile display -->
      <template #item.student_bill.student.name="{ item }">
        <div class="d-flex align-center">
          <v-icon size="small" color="primary" class="mr-2 d-none d-sm-inline">mdi-account</v-icon>
          <span>{{ item.student_bill?.student?.name || "N/A" }}</span>
        </div>
      </template>

      <!-- Processor name with better mobile display -->
      <template #item.processor.name="{ item }">
        <div class="d-flex align-center">
          <v-icon size="small" color="secondary" class="mr-2 d-none d-sm-inline"
            >mdi-account-check</v-icon
          >
          <span>{{ item.processor?.name || item.user?.name || "N/A" }}</span>
        </div>
      </template>

      <!-- Amount with better styling -->
      <template #item.amount_paid="{ item }">
        <span class="font-weight-medium text-primary">{{ formatCurrency(item.amount_paid) }}</span>
      </template>

      <!-- Actions with better mobile layout -->
      <template #item.actions="{ item }">
        <v-btn
          size="small"
          variant="flat"
          color="secondary"
          @click="downloadReceipt(item.receipt_number)"
          class="text-none"
        >
          <v-icon start size="small">mdi-receipt-text-outline</v-icon>
          <span class="d-none d-sm-inline">Lihat</span>
          <span class="d-sm-none">📄</span>
        </v-btn>
      </template>

      <!-- Enhanced empty and loading states -->
      <template #no-data>
        <div class="text-center py-12">
          <v-icon color="grey" size="48">mdi-receipt-text-off</v-icon>
          <div class="mt-3 text-h6 text-grey-darken-1">Tidak ada transaksi</div>
          <div class="text-grey-darken-2">
            Belum ada riwayat transaksi untuk periode yang dipilih.
          </div>
        </div>
      </template>

      <template #loading>
        <div class="text-center py-12">
          <v-progress-circular indeterminate color="primary" size="32" />
          <div class="mt-3 text-body-1 text-grey-darken-1">Memuat riwayat transaksi...</div>
        </div>
      </template>
    </v-data-table>
  </v-card>
</template>

<style scoped>
/* Enhanced mobile-first responsive design */
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

  .v-card-text {
    padding: 16px !important;
  }

  .v-btn-toggle {
    flex-direction: column;
    height: auto !important;
  }

  .v-btn-toggle .v-btn {
    width: 100% !important;
    margin-bottom: 4px;
    border-radius: 8px !important;
  }

  .v-data-table .v-data-table__td,
  .v-data-table .v-data-table__th {
    padding: 8px 12px;
    font-size: 0.875rem;
  }

  .v-chip {
    font-size: 0.75rem;
  }
}

@media (max-width: 960px) {
  .v-card-item {
    padding: 20px !important;
  }

  .v-btn-toggle {
    width: 100%;
  }

  .v-btn-toggle .v-btn {
    flex: 1;
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

.v-btn-toggle {
  border-radius: 8px;
  overflow: hidden;
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

/* Row styling for multi-bill payments */
.v-data-table .v-data-table__tr {
  transition: background-color 0.2s ease;
}

.v-data-table .v-data-table__tr:hover {
  background-color: rgb(var(--v-theme-surface-variant)) !important;
}

/* Custom styling for multi-bill rows */
.bg-deep-purple-lighten-5 {
  background-color: rgb(243, 229, 245) !important;
}

/* Responsive text improvements */
.text-no-wrap {
  white-space: nowrap;
}

@media (max-width: 600px) {
  .text-no-wrap {
    white-space: normal;
    word-break: break-word;
  }
}
</style>
