<script setup>
import { ref, watch } from "vue";
import api from "@/services/api";

const payments = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const options = ref({
  page: 1,
  itemsPerPage: 10,
  sortBy: [],
});
const baseApiUrl = api.defaults.baseURL.replace("/api/", "");

const range = ref("1_month");
const rangeOptions = [
  { title: "1 Bulan Terakhir", value: "1_month" },
  { title: "3 Bulan Terakhir", value: "3_months" },
  { title: "Semua", value: "all" },
];

const headers = [
  { title: "Tanggal", key: "payment_date", sortable: true },
  { title: "No. Kwitansi", key: "receipt_number", sortable: false },
  { title: "Nama Siswa", key: "student_bill.student.name", sortable: false },
  { title: "Diproses Oleh", key: "user.name", sortable: false },
  { title: "Jumlah", key: "amount_paid", align: "end", sortable: false },
  { title: "Aksi", key: "actions", sortable: false, align: "center" },
];

// 🔧 Function definitions
function setRowClass({ item }) {
  return { class: item.is_multi_bill ? "bg-blue-lighten-5" : "" };
}

const formatDate = (value) =>
  new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatCurrency = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

async function fetchPayments() {
  loading.value = true;
  try {
    const { page, itemsPerPage, sortBy } = options.value;

    let sortKey = "payment_date";
    let sortOrder = "desc";
    if (sortBy && sortBy.length > 0) {
      sortKey = sortBy[0].key;
      sortOrder = sortBy[0].order;
    }

    console.log("📤 Request params:", {
      range: range.value,
      page,
      perPage: itemsPerPage,
      sortBy: sortKey,
      sortOrder,
    });

    const response = await api.get("/reports/all-payments", {
      params: {
        range: range.value,
        page,
        perPage: itemsPerPage,
        sortBy: sortKey,
        sortOrder,
      },
    });

    console.log("📥 API Response:", response.data);

    // 🔧 Sesuaikan dengan struktur response Laravel pagination
    if (response.data && Array.isArray(response.data.data)) {
      payments.value = response.data.data;
      totalItems.value = response.data.total || 0;
    } else {
      console.error("❌ Unexpected API response structure:", response.data);
      payments.value = [];
      totalItems.value = 0;
    }
  } catch (error) {
    console.error("❌ Gagal mengambil riwayat transaksi:", error);
    payments.value = [];
    totalItems.value = 0;
  } finally {
    loading.value = false;
  }
}

// 🔧 Watch dengan handling yang lebih baik
watch(
  range,
  () => {
    fetchPayments();
  },
  { immediate: true }
);

watch(
  options,
  () => {
    if (options.value.page && options.value.itemsPerPage) {
      fetchPayments();
    }
  },
  { deep: true }
);
</script>

<template>
  <v-card>
    <v-card-title class="d-flex justify-space-between align-center">
      <span>Riwayat Transaksi</span>
      <v-btn-toggle v-model="range" mandatory divided density="compact">
        <v-btn v-for="opt in rangeOptions" :key="opt.value" :value="opt.value">
          {{ opt.title }}
        </v-btn>
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
      <template #item.amount_paid="{ item }">
        {{ formatCurrency(item.amount_paid) }}
      </template>
      <template #item.actions="{ item }">
        <v-btn
          size="small"
          prepend-icon="mdi-receipt-text-outline"
          :href="`${baseApiUrl}/api/receipts/${item.receipt_number}`"
          target="_blank"
          color="secondary"
          variant="tonal"
        >
          Lihat
        </v-btn>
      </template>
    </v-data-table-server>
  </v-card>
</template>
