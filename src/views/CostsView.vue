<script setup>
import { ref, reactive, onMounted } from "vue";
import api from "@/services/api";
import CostItemFormDialog from "@/components/CostItemFormDialog.vue";
import AssignBillDialog from "@/components/AssignBillDialog.vue";
import ConfirmDialog from "@/components/ConfirmDialog.vue";

// --- State Utama ---
const costItems = ref([]);
const search = ref("");

// --- [REFAKTOR] UI State yang Terpusat ---
// Mengelompokkan semua state UI (dialog, item terpilih, loading)
// agar lebih rapi dan mudah dikelola.
const uiState = reactive({
  dialogs: {
    add: false,
    assign: false,
    delete: false,
  },
  selectedItem: null, // Satu tempat untuk item yang akan di-assign atau di-delete
  loadingStates: {
    table: true, // Untuk skeleton loader
    togglingId: null, // Untuk menonaktifkan switch saat API call
  },
  snackbar: {
    show: false,
    text: "",
    color: "success",
  },
});

// --- Data Bantu ---
const headers = [
  { title: "Nama Biaya", key: "name", width: "35%" },
  { title: "Jenis", key: "type", align: "center" },
  { title: "Jumlah", key: "amount", align: "end" },
  { title: "Status (Dinamis)", key: "is_active", align: "center", sortable: false },
  { title: "Aksi", key: "actions", align: "center", sortable: false, width: "220px" },
];
const typeColors = { Statis: "blue-grey", Dinamis: "teal" };

// --- Fungsi Helper ---
const showSnackbar = (text, color = "success") => {
  uiState.snackbar = { show: true, text, color };
};
const formatCurrency = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

// --- API Calls & Handlers ---
async function fetchCostItems() {
  uiState.loadingStates.table = true;
  try {
    const response = await api.get("/cost-items");
    costItems.value = response.data;
  } catch (error) {
    console.error("Gagal mengambil data biaya:", error);
    showSnackbar("Gagal memuat data biaya.", "error");
  } finally {
    uiState.loadingStates.table = false;
  }
}

async function handleAdd(formData) {
  try {
    await api.post("/cost-items", formData);
    uiState.dialogs.add = false;
    await fetchCostItems();
    showSnackbar("Item biaya baru berhasil ditambahkan!");
  } catch (error) {
    const message = error.response?.data?.message || "Terjadi kesalahan";
    showSnackbar(`Gagal menambah item: ${message}`, "error");
  }
}

async function toggleStatus(item) {
  uiState.loadingStates.togglingId = item.id; // Nonaktifkan switch
  try {
    await api.post(`/cost-items/${item.id}/toggle`);
    // API mengembalikan item yang diupdate, kita bisa update state lokal
    // tanpa perlu fetch ulang semua data untuk performa lebih baik.
    const index = costItems.value.findIndex((i) => i.id === item.id);
    if (index !== -1) {
      costItems.value[index].is_active = !costItems.value[index].is_active;
    }
    showSnackbar(`Status untuk "${item.name}" berhasil diubah.`);
  } catch (error) {
    console.error("Gagal mengubah status:", error);
    showSnackbar("Gagal mengubah status.", "error");
  } finally {
    uiState.loadingStates.togglingId = null; // Aktifkan kembali switch
  }
}

async function handleAssignBill(studentIds) {
  try {
    await api.post("/bills/assign", {
      cost_item_id: uiState.selectedItem.id,
      student_ids: studentIds,
    });
    uiState.dialogs.assign = false;
    showSnackbar("Tagihan berhasil ditetapkan!");
  } catch (error) {
    const message = error.response?.data?.message || "Terjadi kesalahan";
    showSnackbar(`Gagal menetapkan tagihan: ${message}`, "error");
  }
}

async function confirmDelete() {
  try {
    await api.delete(`/cost-items/${uiState.selectedItem.id}`);
    // Hapus dari state lokal tanpa perlu fetch ulang
    costItems.value = costItems.value.filter((i) => i.id !== uiState.selectedItem.id);
    showSnackbar(`"${uiState.selectedItem.name}" berhasil dihapus.`);
    uiState.dialogs.delete = false;
  } catch (error) {
    const message = error.response?.data?.message || "Gagal menghapus item biaya.";
    showSnackbar(message, "error");
  }
}

// --- Pembuka Dialog ---
// Menggunakan satu fungsi untuk memilih item dan satu lagi untuk membuka dialog
// agar lebih terstruktur
function selectItem(item) {
  uiState.selectedItem = item;
}

function openAssignDialog(item) {
  selectItem(item);
  uiState.dialogs.assign = true;
}

function openDeleteDialog(item) {
  selectItem(item);
  uiState.dialogs.delete = true;
}

onMounted(fetchCostItems);
</script>

<template>
  <CostItemFormDialog v-model="uiState.dialogs.add" @save="handleAdd" />
  <AssignBillDialog
    v-model="uiState.dialogs.assign"
    :cost-item="uiState.selectedItem"
    @save="handleAssignBill"
  />

  <ConfirmDialog
    v-model="uiState.dialogs.delete"
    title="Hapus Item Biaya"
    :message="`Yakin ingin menghapus '${uiState.selectedItem?.name}'? Tindakan ini tidak bisa dibatalkan.`"
    confirm-color="error"
    @confirm="confirmDelete"
  />

  <v-container fluid>
    <v-card rounded="lg" border>
      <v-card-item>
        <div class="d-flex flex-column flex-sm-row justify-space-between align-center">
          <div>
            <v-card-title class="d-flex align-center text-h5">
              <v-icon start icon="mdi-cash-multiple"></v-icon>
              Pengaturan Item Biaya
            </v-card-title>
            <v-card-subtitle>Kelola jenis-jenis biaya yang berlaku di sekolah.</v-card-subtitle>
          </div>
          <v-btn color="primary" @click="uiState.dialogs.add = true" class="mt-4 mt-sm-0">
            <v-icon start>mdi-plus</v-icon>
            Tambah Biaya
          </v-btn>
        </div>
      </v-card-item>

      <v-card-text class="pt-4">
        <v-text-field
          v-model="search"
          label="Cari item biaya..."
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          hide-details
          clearable
        ></v-text-field>
      </v-card-text>

      <v-skeleton-loader v-if="uiState.loadingStates.table" type="table-row@5"></v-skeleton-loader>

      <v-data-table v-else :headers="headers" :items="costItems" :search="search">
        <template #item.amount="{ item }">
          {{ formatCurrency(item.amount) }}
        </template>

        <template #item.type="{ item }">
          <v-chip :color="typeColors[item.type] || 'grey'" size="small" label>{{
            item.type
          }}</v-chip>
        </template>

        <template #item.is_active="{ item }">
          <v-switch
            v-if="item.type === 'Dinamis'"
            :model-value="item.is_active"
            :loading="uiState.loadingStates.togglingId === item.id"
            :disabled="uiState.loadingStates.togglingId === item.id"
            color="success"
            hide-details
            @update:modelValue="toggleStatus(item)"
          ></v-switch>
          <span v-else class="text-medium-emphasis">--</span>
        </template>

        <template #item.actions="{ item }">
          <div class="d-flex justify-center ga-2">
            <v-btn color="primary" variant="tonal" size="small" @click="openAssignDialog(item)">
              <v-icon start>mdi-send-check-outline</v-icon>
              Tagihkan
            </v-btn>
            <v-tooltip location="top" text="Hapus item biaya">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  color="error"
                  icon="mdi-delete-outline"
                  variant="text"
                  size="small"
                  @click="openDeleteDialog(item)"
                ></v-btn>
              </template>
            </v-tooltip>
          </div>
        </template>

        <template #no-data>
          <div class="text-center text-medium-emphasis py-8">
            <v-icon size="48" class="mb-2">mdi-cash-off</v-icon>
            <p>Belum ada item biaya yang ditambahkan.</p>
          </div>
        </template>
      </v-data-table>
    </v-card>
  </v-container>

  <v-snackbar
    v-model="uiState.snackbar.show"
    :color="uiState.snackbar.color"
    :timeout="3000"
    location="top right"
  >
    {{ uiState.snackbar.text }}
  </v-snackbar>
</template>
