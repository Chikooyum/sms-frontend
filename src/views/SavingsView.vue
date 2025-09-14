<script setup>
import { ref, reactive, computed, watch, onMounted } from "vue";
import { useDisplay } from "vuetify";
import api from "@/services/api";
import SavingTransactionDialog from "@/components/SavingTransactionDialog.vue";
// -----------------------------
// State Siswa & Tabungan
// -----------------------------
const students = ref([]);
const selectedStudentId = ref(null);
const selectedStudent = computed(
  () => students.value.find((s) => s.id === selectedStudentId.value) || {}
);

const savingsData = ref(null);

// -----------------------------
// Loading & UI State
// -----------------------------
const loadingStudents = ref(false);
const loadingSavings = ref(false);
const savingDialog = ref(false);
const studentForSaving = ref(null);
const savingType = ref("Setoran");

const snackbar = reactive({ show: false, text: "", color: "success" });

// -----------------------------
// Breakpoint Responsif
// -----------------------------
const { mdAndUp } = useDisplay();
const isDesktop = computed(() => mdAndUp.value);

// -----------------------------
// Headers DataTable
// -----------------------------
const headers = [
  { title: "Tanggal", key: "transaction_date", sortable: false },
  { title: "Keterangan", key: "description", sortable: false },
  { title: "Debit", key: "debit", align: "end", sortable: false },
  { title: "Kredit", key: "credit", align: "end", sortable: false },
];

// -----------------------------
// Computed: Transaksi + Saldo
// -----------------------------
const transactionsWithBalance = computed(() => {
  if (!savingsData.value?.transactions?.length) return [];
  let balance = savingsData.value.balance;
  return [...savingsData.value.transactions]
    .sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date))
    .map((trx) => {
      const running = balance;
      balance += trx.type === "Setoran" ? -trx.amount : trx.amount;
      return { ...trx, running_balance: running };
    });
});

// -----------------------------
// Helpers: Format
// -----------------------------
const formatCurrency = (val) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(val || 0);

const formatDate = (val) =>
  new Date(val).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

function showSnackbar(text, color = "success") {
  snackbar.text = text;
  snackbar.color = color;
  snackbar.show = true;
}

// -----------------------------
// API Calls
// -----------------------------
async function fetchStudents() {
  loadingStudents.value = true;
  try {
    const { data } = await api.get("/students?all=true");
    students.value = data.data;
  } catch (e) {
    showSnackbar("Gagal memuat daftar siswa.", "error");
    console.error(e);
  } finally {
    loadingStudents.value = false;
  }
}

async function fetchSavings() {
  if (!selectedStudentId.value) {
    savingsData.value = null;
    return;
  }
  loadingSavings.value = true;
  try {
    const { data } = await api.get(`/students/${selectedStudentId.value}/savings`);
    savingsData.value = data;
  } catch (e) {
    showSnackbar("Gagal memuat data tabungan.", "error");
    console.error(e);
  } finally {
    loadingSavings.value = false;
  }
}

async function handleSaveTransaction(formData) {
  try {
    await api.post(`/students/${selectedStudentId.value}/savings`, {
      type: savingType.value,
      ...formData,
    });
    savingDialog.value = false;
    await fetchSavings();
    showSnackbar(`Transaksi ${savingType.value} berhasil!`);
  } catch (error) {
    const message = error.response?.data?.message || "Server Error";
    showSnackbar(`Transaksi Gagal: ${message}`, "error");
    console.error("Gagal menyimpan transaksi tabungan:", error);
  }
}

async function handleWithdrawAndPay(paymentData) {
  try {
    const response = await api.post(
      `/students/${selectedStudentId.value}/savings/withdraw-and-pay`,
      paymentData
    );
    savingDialog.value = false;
    showSnackbar(response.data.message);
    await fetchSavings(); // Refresh data tabungan
  } catch (error) {
    const message = error.response?.data?.message || "Server Error";
    showSnackbar(`Transaksi Gagal: ${message}`, "error");
    console.error("Gagal melakukan withdraw and pay:", error);
  }
}

// -----------------------------
// Watchers & Lifecycle
// -----------------------------
watch(selectedStudentId, fetchSavings);
onMounted(fetchStudents);
</script>

<template>
  <v-container fluid>
    <!-- Pilih Siswa -->
    <v-card class="mb-6" rounded border>
      <v-card-title>
        <v-icon start>mdi-account-search-outline</v-icon>
        Pilih Siswa
      </v-card-title>
      <v-divider />
      <v-card-text>
        <v-autocomplete
          v-model="selectedStudentId"
          :items="students"
          item-title="name"
          item-value="id"
          label="Cari nama siswa..."
          :loading="loadingStudents"
          clearable
          density="compact"
          hide-details
        />
      </v-card-text>
    </v-card>

    <!-- Prompt memilih -->
    <div v-if="!selectedStudentId" class="text-center text-grey py-16">
      <v-icon size="64">mdi-piggy-bank-outline</v-icon>
      <div class="mt-4">Silakan pilih siswa untuk melihat tabungan.</div>
    </div>

    <!-- Detail & Transaksi -->
    <v-card v-else rounded border>
      <v-card-title class="d-flex justify-space-between align-center">
        <div>
          <span class="text-h6"> Tabungan: {{ selectedStudent.name }} </span>
          <div v-if="savingsData" class="mt-2">
            Saldo saat ini:
            <strong>{{ formatCurrency(savingsData.balance) }}</strong>
          </div>
        </div>
        <div>
          <v-btn
            color="primary"
            class="mr-2"
            @click="
              () => {
                studentForSaving = selectedStudent;
                savingType = 'Setoran';
                savingDialog = true;
              }
            "
          >
            <v-icon start>mdi-plus-circle</v-icon>Setoran
          </v-btn>
          <v-btn
            color="error"
            @click="
              () => {
                studentForSaving = selectedStudent;
                savingType = 'Penarikan';
                savingDialog = true;
              }
            "
          >
            <v-icon start>mdi-minus-circle</v-icon>Penarikan
          </v-btn>
        </div>
      </v-card-title>
      <v-divider />

      <!-- Desktop: Data Table -->
      <div v-if="isDesktop">
        <v-data-table
          :headers="headers"
          :items="transactionsWithBalance"
          :loading="loadingSavings"
          density="compact"
          fixed-header
          height="60vh"
        >
          <template #item.transaction_date="{ item }">
            {{ formatDate(item.transaction_date) }}
          </template>
          <template #item.description="{ item }">
            {{ item.description || item.type }}
          </template>
          <template #item.debit="{ item }">
            <span v-if="item.type === 'Penarikan'" class="text-error">
              {{ formatCurrency(item.amount) }}
            </span>
          </template>
          <template #item.credit="{ item }">
            <span v-if="item.type === 'Setoran'" class="text-success">
              {{ formatCurrency(item.amount) }}
            </span>
          </template>
          <template #item.running_balance="{ item }">
            {{ formatCurrency(item.running_balance) }}
          </template>
          <template #no-data>
            <div class="text-center py-8 text-grey">Belum ada riwayat transaksi.</div>
          </template>
        </v-data-table>
      </div>

      <!-- Mobile: List + Expansion -->
      <div v-else class="pa-4">
        <v-skeleton-loader v-if="loadingSavings" type="list-item-avatar-two-line@5" />
        <template v-else>
          <v-list v-if="transactionsWithBalance.length">
            <v-expansion-panels>
              <v-expansion-panel v-for="trx in transactionsWithBalance" :key="trx.id">
                <v-expansion-panel-title>
                  {{ formatDate(trx.transaction_date) }}
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <div>{{ trx.description || trx.type }}</div>
                  <div class="mt-2 d-flex justify-space-between">
                    <span :class="trx.type === 'Setoran' ? 'text-success' : 'text-error'">
                      {{ formatCurrency(trx.amount) }}
                    </span>
                    <strong>{{ formatCurrency(trx.running_balance) }}</strong>
                  </div>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </v-list>
          <div v-else class="text-center py-8 text-grey">Belum ada riwayat transaksi.</div>
        </template>
      </div>
    </v-card>

    <SavingTransactionDialog
      v-model="savingDialog"
      :transaction-type="savingType"
      :student-id="selectedStudentId"
      @save="handleSaveTransaction"
      @save-payment="handleWithdrawAndPay"
    />

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000" location="top right">
      {{ snackbar.text }}
    </v-snackbar>
  </v-container>
</template>

<style scoped>
@media (max-width: 960px) {
  .v-card-title {
    flex-wrap: wrap;
  }
}
</style>
