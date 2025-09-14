<script setup>
import { ref, onMounted } from "vue";
import api from "@/services/api";
import { useAuthStore } from "@/stores/auth";

// Import SEMUA dialog yang dibutuhkan
import UserFormDialog from "@/components/UserFormDialog.vue";
import ChangePasswordDialog from "@/components/ChangePasswordDialog.vue";
import StaffFormDialog from "@/components/StaffFormDialog.vue"; // Ini untuk EDIT profil
import ConfirmDialog from "@/components/ConfirmDialog.vue";

// --- STATE UTAMA ---
const staffList = ref([]); // Sumber data utama sekarang adalah Staf
const loading = ref(true);
const snackbar = ref({ show: false, text: "", color: "success" });

// --- STATE DIALOG ---
const userFormDialog = ref(false); // Untuk Tambah Akun Baru
const staffFormDialog = ref(false); // Untuk Edit Profil Staf
const passwordDialog = ref(false);
const deleteDialog = ref(false);

// --- STATE DATA TERPILIH ---
const userToManage = ref(null); // Untuk ubah password & hapus
const staffToEdit = ref(null); // Untuk edit profil staf

// --- DATA BANTU ---
const creatableRoles = ref([]);
const headers = [
  { title: "Nama Staf & Jabatan", key: "name" },
  { title: "Info Kontak", key: "contact_info" },
  { title: "Email Akun", key: "user.email" },
  { title: "Peran Akun", key: "user.role", align: "center" },
  { title: "Aksi", key: "actions", align: "center", sortable: false },
];
const roleColors = { /* ... sama seperti sebelumnya ... */ };

const showSnackbar = (text, color = "success") => { snackbar.value = { show: true, text, color }; };

const authStore = useAuthStore();

// --- FUNGSI-FUNGSI ---
async function fetchData() {
  loading.value = true;
  try {
    const [staffRes, rolesRes] = await Promise.all([
      api.get("/staff"),
      api.get("/users/creatable-roles") // Tetap ambil ini untuk form tambah user
    ]);
    staffList.value = staffRes.data;
    creatableRoles.value = rolesRes.data;
  } catch (e) {
    showSnackbar("Gagal memuat data staf & akun.", "error");
  } finally {
    loading.value = false;
  }
}
onMounted(fetchData);

// --- Handler untuk Buka Dialog ---
function openAddUserDialog() { userToManage.value = null; userFormDialog.value = true; }
function openEditStaffDialog(staff) { staffToEdit.value = { ...staff }; staffFormDialog.value = true; }
function openPasswordDialog(staff) { userToManage.value = staff.user; passwordDialog.value = true; }
function openDeleteDialog(staff) { userToManage.value = staff.user; deleteDialog.value = true; }

// --- Handler untuk Simpan & Hapus ---
async function handleSaveUser(formData) { // Ini hanya untuk TAMBAH user baru
  try {
    await api.post("/users", formData);
    userFormDialog.value = false;
    await fetchData();
    showSnackbar(`Akun dan profil untuk ${formData.name} berhasil dibuat!`);
  } catch (e) {
    showSnackbar(`Gagal membuat akun: ${e.response?.data?.message || "Error"}`, "error");
  }
}
async function handleSaveStaff(formData) { // Ini hanya untuk EDIT profil staf
  try {
    await api.put(`/staff/${formData.id}`, formData);
    staffFormDialog.value = false;
    await fetchData();
    showSnackbar(`Profil staf berhasil diperbarui!`);
  } catch (e) {
    showSnackbar(`Gagal menyimpan profil: ${e.response?.data?.message || "Error"}`, "error");
  }
}
async function handleChangePassword(formData) {
  if (!userToManage.value) return;
  try {
    await api.post(`/users/${userToManage.value.id}/change-password`, formData);
    passwordDialog.value = false;
    showSnackbar("Password berhasil diubah!");
  } catch (e) {
    showSnackbar(`Gagal mengubah password: ${e.response?.data?.message || "Error"}`, "error");
  }
}
async function confirmDelete() {
  if (!userToManage.value) return;
  try {
    await api.delete(`/users/${userToManage.value.id}`); // Menghapus user akan otomatis menghapus staf (via backend event)
    deleteDialog.value = false;
    await fetchData();
    showSnackbar("Akun dan profil staf berhasil dihapus.");
  } catch (error) {
    showSnackbar(`Gagal menghapus: ${error.response?.data?.message || "Error"}`, "error");
  }
}
</script>

<template>
  <UserFormDialog v-model="userFormDialog" :creatable-roles="creatableRoles" @save="handleSaveUser" />
  <StaffFormDialog v-model="staffFormDialog" :initial-data="staffToEdit" @save="handleSaveStaff" />
  <ChangePasswordDialog v-model="passwordDialog" @save="(formData) => handleChangePassword(formData)" />
  <ConfirmDialog v-model="deleteDialog" title="Hapus Staf & Akun" :message="`Yakin ingin menghapus ${userToManage?.name}? Ini akan menghapus profil staf DAN akun loginnya.`" @confirm="confirmDelete" />

  <v-container fluid class="pa-2 pa-md-6">
    <!-- Enhanced card design with gradient header and better spacing -->
    <v-card rounded="xl" elevation="8" class="overflow-hidden">
      <!-- Enhanced header with gradient background -->
      <div class="bg-gradient-to-r from-blue-600 to-indigo-700 pa-6">
        <div class="d-flex flex-column flex-md-row justify-space-between align-start align-md-center ga-4">
          <div class="text-white">
            <div class="d-flex align-center ga-3 mb-2">
              <v-icon size="32" color="white">mdi-account-details</v-icon>
              <h1 class="text-h4 font-weight-bold">Manajemen Staf & Akun</h1>
            </div>
            <p class="text-blue-100 text-body-1 ma-0">
              Kelola profil staf beserta akun login sistem mereka
            </p>
          </div>
          <!-- Responsive button with better mobile styling -->
          <v-btn
            color="white"
            variant="elevated"
            size="large"
            class="text-blue-700 font-weight-bold"
            @click="openAddUserDialog"
          >
            <v-icon start>mdi-plus</v-icon>
            <span class="d-none d-sm-inline">Tambah Akun Staf</span>
            <span class="d-inline d-sm-none">Tambah</span>
          </v-btn>
        </div>
      </div>

      <!-- Enhanced data table with better mobile responsiveness -->
      <div class="pa-4 pa-md-6">
        <v-data-table
          :headers="headers"
          :items="staffList"
          :loading="loading"
          class="elevation-0"
          :mobile-breakpoint="0"
        >
          <!-- Enhanced loading state -->
          <template v-slot:loading>
            <div class="text-center pa-8">
              <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
              <p class="text-body-1 mt-4 text-grey-600">Memuat data staf...</p>
            </div>
          </template>

          <!-- Enhanced empty state -->
          <template v-slot:no-data>
            <div class="text-center pa-12">
              <v-icon size="64" color="grey-400" class="mb-4">mdi-account-off</v-icon>
              <h3 class="text-h6 text-grey-600 mb-2">Belum Ada Data Staf</h3>
              <p class="text-body-2 text-grey-500">Tambahkan staf pertama untuk memulai</p>
            </div>
          </template>

          <!-- Enhanced name and position display -->
          <template v-slot:['item.name']="{ item }">
            <div class="py-2">
              <div class="font-weight-bold text-body-1 text-grey-900">{{ item.name }}</div>
              <div class="text-caption text-blue-600 font-weight-medium">{{ item.position }}</div>
            </div>
          </template>

          <!-- Enhanced contact info display -->
          <template v-slot:['item.contact_info']="{ item }">
            <div class="py-2">
              <div v-if="item.phone" class="d-flex align-center ga-2 mb-1">
                <v-icon size="16" color="grey-600">mdi-phone</v-icon>
                <span class="text-body-2">{{ item.phone }}</span>
              </div>
              <div v-if="item.address" class="d-flex align-start ga-2">
                <v-icon size="16" color="grey-600">mdi-map-marker</v-icon>
                <span class="text-body-2 text-grey-700">{{ item.address }}</span>
              </div>
            </div>
          </template>

          <!-- Enhanced role display with better styling -->
          <template v-slot:['item.user.role']="{ item }">
            <v-chip
              v-if="item.user"
              :color="roleColors[item.user.role] || 'grey'"
              size="small"
              variant="elevated"
              class="font-weight-medium"
            >
              {{ item.user.role }}
            </v-chip>
            <v-chip v-else color="grey-lighten-2" size="small" variant="outlined">
              <v-icon start size="16">mdi-account-off</v-icon>
              Tanpa Akun
            </v-chip>
          </template>

          <!-- Enhanced action buttons with better mobile layout -->
          <template v-slot:['item.actions']="{ item }">
            <div class="d-flex ga-1">
              <v-tooltip text="Edit Profil Staf" location="top">
                <template v-slot:activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon="mdi-pencil"
                    variant="text"
                    color="primary"
                    size="small"
                    class="hover-lift"
                    @click="openEditStaffDialog(item)"
                  ></v-btn>
                </template>
              </v-tooltip>

              <v-tooltip text="Ubah Password" location="top">
                <template v-slot:activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon="mdi-lock-reset"
                    variant="text"
                    color="orange-darken-2"
                    size="small"
                    class="hover-lift"
                    @click="openPasswordDialog(item)"
                    :disabled="!item.user"
                  ></v-btn>
                </template>
              </v-tooltip>

              <v-tooltip text="Hapus Staf & Akun" location="top">
                <template v-slot:activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon="mdi-delete-outline"
                    variant="text"
                    color="error"
                    size="small"
                    class="hover-lift"
                    @click="openDeleteDialog(item)"
                    :disabled="!item.user"
                  ></v-btn>
                </template>
              </v-tooltip>
            </div>
          </template>
        </v-data-table>
      </div>
    </v-card>
  </v-container>

  <!-- Enhanced snackbar positioning for mobile -->
  <v-snackbar
    v-model="snackbar.show"
    :color="snackbar.color"
    :timeout="4000"
    location="top"
    class="ma-2"
  >
    <div class="d-flex align-center ga-2">
      <v-icon v-if="snackbar.color === 'success'">mdi-check-circle</v-icon>
      <v-icon v-else-if="snackbar.color === 'error'">mdi-alert-circle</v-icon>
      <span>{{ snackbar.text }}</span>
    </div>
  </v-snackbar>
</template>

<!-- Added custom styles for enhanced mobile experience -->
<style scoped>
.bg-gradient-to-r {
  background: linear-gradient(135deg, #1e40af 0%, #3730a3 100%);
}

.hover-lift {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.hover-lift:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12);
}

/* Mobile-specific adjustments */
@media (max-width: 600px) {
  .v-data-table {
    font-size: 0.875rem;
  }

  .v-data-table__td {
    padding: 8px 4px !important;
  }
}

/* Tablet adjustments */
@media (min-width: 601px) and (max-width: 960px) {
  .v-data-table__td {
    padding: 12px 8px !important;
  }
}
</style>
