<script setup>
import { ref, onMounted } from "vue";
import api from "@/services/api";
import StaffFormDialog from "@/components/StaffFormDialog.vue";
import ConfirmDialog from "@/components/ConfirmDialog.vue";

const staffList = ref([]);
const loading = ref(true);

// --- State untuk dialog, notifikasi, dan data terpilih ---
const dialog = ref(false);
const deleteDialog = ref(false);
const editingStaff = ref(null);
const staffToDelete = ref(null);
const snackbar = ref({ show: false, text: "", color: "success" }); // [BARU]

const staffHeaders = [
  { title: "Nama Lengkap", key: "name", width: "40%" },
  { title: "Jabatan", key: "position" },
  { title: "Kontak", key: "contact_info" },
  { title: "Aksi", key: "actions", align: "center", sortable: false },
];

// --- Fungsi Helper ---
const showSnackbar = (text, color = "success") => { // [BARU]
  snackbar.value = { show: true, text, color };
};

// --- API Calls ---
async function fetchStaff() {
  loading.value = true;
  try {
    const response = await api.get("/staff");
    staffList.value = response.data;
  } catch (error) {
    console.error("Gagal mengambil data staf:", error);
    showSnackbar("Gagal memuat data staf.", "error");
  } finally {
    loading.value = false;
  }
}

// --- Handler Aksi ---
function openAddDialog() {
  editingStaff.value = null;
  dialog.value = true;
}

function openEditDialog(staff) {
  editingStaff.value = { ...staff }; // Salin objek agar tidak reaktif langsung
  dialog.value = true;
}

function openDeleteDialog(staff) {
  staffToDelete.value = staff;
  deleteDialog.value = true;
}

// [DIUBAH] Menambahkan umpan balik snackbar
async function handleSave(formData) {
  const isEditing = !!formData.id;
  try {
    if (isEditing) {
      await api.put(`/staff/${formData.id}`, formData);
    } else {
      await api.post("/staff", formData);
    }
    dialog.value = false;
    await fetchStaff();
    showSnackbar(`Data staf berhasil ${isEditing ? 'diperbarui' : 'disimpan'}!`);
  } catch (error) {
    const message = error.response?.data?.message || "Terjadi kesalahan";
    showSnackbar(`Gagal menyimpan data: ${message}`, "error");
    console.error("Gagal menyimpan data staf:", error);
  }
}

// [DIUBAH] Menambahkan umpan balik snackbar
async function confirmDelete(staff) {
  if (!staff) return;
  try {
    await api.delete(`/staff/${staff.id}`);
    deleteDialog.value = false;
    await fetchStaff();
    showSnackbar("Data staf berhasil dihapus.");
  } catch (error) {
    const message = error.response?.data?.message || "Terjadi kesalahan";
    showSnackbar(`Gagal menghapus data: ${message}`, "error");
    console.error("Gagal menghapus staf:", error);
  } finally {
    staffToDelete.value = null;
  }
}

onMounted(fetchStaff);
</script>

<template>
  <StaffFormDialog v-model="dialog" :initial-data="editingStaff" @save="handleSave" />
  <ConfirmDialog v-model="deleteDialog" title="Hapus Staf" :message="`Yakin ingin menghapus ${staffToDelete?.name}?`" @confirm="confirmDelete(staffToDelete)" />

  <v-container fluid>
    <v-card rounded="lg" border>
      <v-card-item>
        <div class="d-flex justify-space-between align-center">
          <div>
            <v-card-title class="d-flex align-center">
              <v-icon start icon="mdi-account-tie-outline"></v-icon>
              Manajemen Guru & Staf
            </v-card-title>
            <v-card-subtitle>Kelola data guru dan staf di sekolah.</v-card-subtitle>
          </div>
          <v-btn color="primary" @click="openAddDialog">
            <v-icon start>mdi-plus</v-icon>
            Tambah Staf
          </v-btn>
        </div>
      </v-card-item>
      <v-divider></v-divider>

      <v-data-table :headers="staffHeaders" :items="staffList" :loading="loading">
        <template v-slot:['item.actions']="{ item }">
          <v-tooltip text="Edit Staf">
            <template v-slot:activator="{ props }">
              <v-btn v-bind="props" icon="mdi-pencil" variant="text" color="primary" @click="openEditDialog(item)"></v-btn>
            </template>
          </v-tooltip>
          <v-tooltip text="Hapus Staf">
            <template v-slot:activator="{ props }">
              <v-btn v-bind="props" icon="mdi-delete-outline" variant="text" color="error" @click="openDeleteDialog(item)"></v-btn>
            </template>
          </v-tooltip>
        </template>

        <template v-slot:no-data>
          <div class="text-center text-grey py-8">
            <v-icon size="48" class="mb-2">mdi-account-off-outline</v-icon>
            <p>Belum ada data staf yang ditambahkan.</p>
          </div>
        </template>
      </v-data-table>
    </v-card>
  </v-container>

  <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000" location="top right">
    {{ snackbar.text }}
  </v-snackbar>
</template>
