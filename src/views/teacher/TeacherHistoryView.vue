<script setup>
import { ref, watch } from "vue";
import api from "@/services/api";

const payments = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const options = ref({});

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
    const { page, itemsPerPage, sortBy } = options.value;
    const sortKey = sortBy?.[0]?.key || "payment_date";
    const sortOrder = sortBy?.[0]?.order || "desc";

    const response = await api.get("/reports/all-payments", {
      params: {
        range: range.value,
        page,
        perPage: itemsPerPage,
        sortBy: sortKey,
        sortOrder,
      },
    });
    payments.value = response.data.data;
    totalItems.value = response.data.total;
  } catch (error) {
    console.error("Gagal mengambil riwayat transaksi:", error);
  } finally {
    loading.value = false;
  }
}

watch([range, options], fetchPayments, { deep: true, immediate: true });

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
  <v-card>
    <v-card-title class="d-flex justify-space-between align-center">
      <span>Riwayat Transaksi Anda</span>
      <v-btn-toggle v-model="range" mandatory divided density="compact">
        <v-btn v-for="opt in rangeOptions" :key="opt.value" :value="opt.value">{{
          opt.title
        }}</v-btn>
      </v-btn-toggle>
    </v-card-title>
    <v-data-table-server
      :headers="headers"
      :items="payments"
      :items-length="totalItems"
      :loading="loading"
      @update:options="options = $event"
      item-value="id"
      :row-props="setRowClass"
    >
      <template #item.payment_date="{ item }">
        {{ formatDate(item.payment_date) }}
      </template>
      <template #item.student_bill.student.name="{ item }">
        {{ item.student_bill?.student?.name || "N/A" }}
      </template>
      <!-- TAMBAH TEMPLATE UNTUK KOLOM DIPROSES OLEH -->
      <template #item.processor.name="{ item }">
        {{ item.processor?.name || item.user?.name || "N/A" }}
      </template>
      <template #item.amount_paid="{ item }">
        {{ formatCurrency(item.amount_paid) }}
      </template>
      <template #item.actions="{ item }">
        <v-btn
          size="small"
          prepend-icon="mdi-receipt-text-outline"
          @click="downloadReceipt(item.receipt_number)"
          color="secondary"
          variant="tonal"
        >
          Lihat
        </v-btn>
      </template>
    </v-data-table-server>
  </v-card>
</template>
