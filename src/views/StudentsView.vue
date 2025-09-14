<script setup>
import { ref, onMounted } from "vue";
import api from "@/services/api";
import StudentFormDialog from "@/components/StudentFormDialog.vue";
import EditStudentDialog from "@/components/EditStudentDialog.vue";
import ConfirmDialog from "@/components/ConfirmDialog.vue";

// --- State Utama ---
const students = ref([]);
const loading = ref(true);
const search = ref(''); // [BARU] Untuk v-data-table search
const promoting = ref(false); // [BARU] Loading state untuk tombol promosi

// --- State Dialog & Notifikasi ---
const addDialog = ref(false);
const editDialog = ref(false);
const deleteDialog = ref(false);
const promotionDialog = ref(false);
const studentToEdit = ref(null);
const studentToDelete = ref(null);
const snackbar = ref({ show: false, text: "", color: "success" }); // [BARU]

// --- Data Bantu ---
const headers = [
  { title: "Nama Lengkap", key: "name", width: "40%" },
  { title: "Tahun Angkatan", key: "enrollment_year", align: 'center' },
  { title: "Kelas", key: "class_group.name", align: 'center' },
  { title: "Status", key: "status", align: 'center' },
  { title: "Aksi", key: "actions", align: 'center', sortable: false },
];
// [BARU] Warna untuk chip status
const statusColors = {
  Aktif: 'green-darken-1',
  Alumni: 'blue-grey',
  'Tidak Aktif': 'error'
};

// --- Fungsi Helper ---
const showSnackbar = (text, color = "success") => { // [BARU]
  snackbar.value = { show: true, text, color };
};

// --- Logika Aksi ---
async function fetchStudents() {
  loading.value = true;
  try {
    const response = await api.get("/students");
    students.value = response.data.data;
  } catch (error) {
    console.error("Gagal mengambil data siswa:", error);
    showSnackbar("Gagal memuat data siswa.", "error");
  } finally {
    loading.value = false;
  }
}

function openEditDialog(item) {
  studentToEdit.value = { ...item };
  editDialog.value = true;
}

function openDeleteDialog(item) {
  studentToDelete.value = item;
  deleteDialog.value = true;
}

async function handleAdd(formData) {
  try {
    await api.post("/students", formData);
    addDialog.value = false;
    await fetchStudents();
    showSnackbar("Siswa baru berhasil ditambahkan!");
  } catch (error) {
    const message = error.response?.data?.message || "Terjadi kesalahan";
    showSnackbar(`Gagal menambah siswa: ${message}`, "error");
    console.error("Error details:", error.response?.data);
  }
}

async function handleEdit(formData) {
  if (!formData.id) return;
  try {
    await api.put(`/students/${formData.id}`, formData);
    editDialog.value = false;
    await fetchStudents();
    showSnackbar("Data siswa berhasil diperbarui!");
  } catch (error) {
    const message = error.response?.data?.message || "Terjadi kesalahan";
    showSnackbar(`Gagal mengedit siswa: ${message}`, "error");
    console.error("Error details:", error.response?.data);
  }
}

async function confirmDelete() {
  if (!studentToDelete.value) return;
  try {
    await api.delete(`/students/${studentToDelete.value.id}`);
    deleteDialog.value = false;
    await fetchStudents();
    showSnackbar("Data siswa berhasil dihapus.");
  } catch (error) {
    const message = error.response?.data?.message || "Terjadi kesalahan";
    showSnackbar(`Gagal menghapus siswa: ${message}`, "error");
    console.error("Error details:", error.response?.data);
  } finally {
    studentToDelete.value = null;
  }
}

function openPromotionDialog() {
  promotionDialog.value = true;
}

async function handlePromotion() {
  promoting.value = true;
  promotionDialog.value = false;
  try {
    const response = await api.post("/students/promote");
    showSnackbar(response.data.message || "Proses berhasil dijalankan!");
    await fetchStudents();
  } catch (error) {
    console.error("Gagal memproses kelulusan:", error);
    showSnackbar("Proses Gagal! Silakan coba lagi.", "error");
  } finally {
    promoting.value = false;
  }
}

onMounted(fetchStudents);
</script>

<template>
  <StudentFormDialog v-model="addDialog" @save="handleAdd" />
  <EditStudentDialog v-model="editDialog" :student-data="studentToEdit" @save="handleEdit" />
  <ConfirmDialog v-model="deleteDialog" title="Hapus Siswa" :message="`Yakin ingin menghapus data '${studentToDelete?.name}'?`" @confirm="confirmDelete" />
  <ConfirmDialog v-model="promotionDialog" title="Konfirmasi Kenaikan Kelas & Kelulusan" message="Proses ini akan mengubah status siswa tingkat akhir menjadi 'Alumni' dan menaikkan tingkat kelas lainnya. Aksi ini tidak dapat dibatalkan. Lanjutkan?" @confirm="handlePromotion" />

  <!-- Enhanced container with better responsive padding -->
  <v-container fluid class="pa-2 pa-md-4 pa-lg-6">
    <!-- Modern card design with gradient header and improved styling -->
    <v-card rounded="xl" elevation="3" class="overflow-hidden">
      <!-- Gradient header with better visual hierarchy -->
      <div class="bg-gradient-to-r from-blue-600 to-indigo-700 pa-4 pa-md-6">
        <div class="d-flex justify-space-between align-start flex-wrap ga-3">
          <div class="text-white">
            <div class="d-flex align-center ga-3 mb-2">
              <v-avatar color="white" class="text-blue-600" size="40">
                <v-icon size="24">mdi-account-school-outline</v-icon>
              </v-avatar>
              <div>
                <h1 class="text-h5 text-md-h4 font-weight-bold mb-1">Manajemen Siswa</h1>
                <p class="text-blue-100 text-body-2 mb-0">Kelola semua data siswa aktif maupun alumni</p>
              </div>
            </div>
          </div>

          <!-- Responsive button layout with better mobile design -->
          <div class="d-flex flex-column flex-sm-row ga-2 align-stretch align-sm-center">
            <v-btn
              color="success"
              variant="elevated"
              class="text-none font-weight-medium"
              size="default"
              @click="openPromotionDialog"
              :loading="promoting"
              rounded="lg"
            >
              <v-icon start size="20">mdi-school-outline</v-icon>
              <span class="d-none d-sm-inline">Luluskan / Naik Kelas</span>
              <span class="d-sm-none">Promosi</span>
            </v-btn>
            <v-btn
              color="white"
              variant="elevated"
              class="text-blue-600 text-none font-weight-medium"
              size="default"
              @click="addDialog = true"
              rounded="lg"
            >
              <v-icon start size="20">mdi-plus</v-icon>
              <span class="d-none d-sm-inline">Tambah Siswa</span>
              <span class="d-sm-none">Tambah</span>
            </v-btn>
          </div>
        </div>
      </div>

      <!-- Enhanced search section with better spacing -->
      <v-card-text class="pa-4 pa-md-6 pb-2">
        <v-text-field
          v-model="search"
          label="Cari siswa (nama, tahun angkatan, status...)"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="comfortable"
          rounded="lg"
          hide-details
          class="mb-4"
          color="primary"
        ></v-text-field>
      </v-card-text>

      <!-- Enhanced data table with better mobile responsiveness -->
      <div class="px-2 px-md-6 pb-4 pb-md-6">
        <v-data-table
          :headers="headers"
          :items="students"
          :loading="loading"
          :search="search"
          class="elevation-1 rounded-lg"
          :items-per-page="10"
          :mobile-breakpoint="0"
        >
          <!-- Enhanced status chip with better colors and design -->
          <template v-slot:['item.status']="{ item }">
            <v-chip
              :color="statusColors[item.status] || 'grey'"
              size="small"
              variant="flat"
              rounded="lg"
              class="font-weight-medium"
            >
              {{ item.status }}
            </v-chip>
          </template>

          <!-- Enhanced action buttons with better mobile design -->
          <template v-slot:['item.actions']="{ item }">
            <div class="d-flex ga-1">
              <v-tooltip text="Edit Siswa" location="top">
                <template v-slot:activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon="mdi-pencil"
                    variant="text"
                    color="primary"
                    size="small"
                    class="rounded-lg"
                    @click="openEditDialog(item)"
                  ></v-btn>
                </template>
              </v-tooltip>
              <v-tooltip text="Hapus Siswa" location="top">
                <template v-slot:activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon="mdi-delete-outline"
                    variant="text"
                    color="error"
                    size="small"
                    class="rounded-lg"
                    @click="openDeleteDialog(item)"
                  ></v-btn>
                </template>
              </v-tooltip>
            </div>
          </template>

          <!-- Enhanced empty state with better design -->
          <template v-slot:no-data>
            <div class="text-center py-12">
              <v-avatar color="grey-lighten-3" size="80" class="mb-4">
                <v-icon size="40" color="grey-darken-1">mdi-account-off-outline</v-icon>
              </v-avatar>
              <h3 class="text-h6 text-grey-darken-1 mb-2">Belum ada data siswa</h3>
              <p class="text-body-2 text-grey mb-4">Mulai dengan menambahkan siswa baru ke sistem</p>
              <v-btn
                color="primary"
                variant="elevated"
                @click="addDialog = true"
                rounded="lg"
                class="text-none"
              >
                <v-icon start>mdi-plus</v-icon>
                Tambah Siswa Pertama
              </v-btn>
            </div>
          </template>

          <!-- Enhanced loading state -->
          <template v-slot:loading>
            <div class="text-center py-8">
              <v-progress-circular indeterminate color="primary" size="40"></v-progress-circular>
              <p class="text-body-2 text-grey mt-3">Memuat data siswa...</p>
            </div>
          </template>
        </v-data-table>
      </div>
    </v-card>
  </v-container>

  <!-- Enhanced snackbar with better positioning and design -->
  <v-snackbar
    v-model="snackbar.show"
    :color="snackbar.color"
    :timeout="4000"
    location="top right"
    rounded="lg"
    elevation="6"
    class="ma-2"
  >
    <div class="d-flex align-center ga-2">
      <v-icon
        :icon="snackbar.color === 'error' ? 'mdi-alert-circle' : 'mdi-check-circle'"
        size="20"
      ></v-icon>
      {{ snackbar.text }}
    </div>
  </v-snackbar>
</template>

<style scoped>
/* Added custom gradient background */
.bg-gradient-to-r {
  background: linear-gradient(135deg, #2563eb 0%, #4338ca 100%);
}

/* Enhanced responsive design for mobile */
@media (max-width: 600px) {
  .v-data-table {
    font-size: 0.875rem;
  }

  .v-data-table th,
  .v-data-table td {
    padding: 8px 4px !important;
  }
}

/* Better hover effects for interactive elements */
.v-btn:hover {
  transform: translateY(-1px);
  transition: transform 0.2s ease;
}

.v-card:hover {
  box-shadow: 0 8px 25px rgba(0,0,0,0.15) !important;
  transition: box-shadow 0.3s ease;
}
</style>
