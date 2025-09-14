<script setup>
import { ref, reactive, onMounted, computed } from "vue";
import api from "@/services/api";
import ClassFormDialog from "@/components/ClassFormDialog.vue";
import ConfirmDialog from "@/components/ConfirmDialog.vue";

// --- State Utama ---
const classes = ref([]);
const staff = ref([]);
const allStudents = ref([]);

// --- [REFAKTOR] UI State Terpusat ---
const uiState = reactive({
  dialogs: {
    form: false,
    delete: false,
  },
  selectedClass: null,
  loading: {
    page: true,
    savingAssignmentsId: null, // ID kelas yang sedang menyimpan penetapan siswa
  },
  snackbar: {
    show: false,
    text: "",
    color: "success",
  },
  classStudentSelection: {}, // v-model untuk setiap autocomplete siswa
});

// --- Computed & Helpers ---
const teachers = computed(() =>
  staff.value.filter((s) => s.position.toLowerCase().includes("guru"))
);

function availableStudentsForClass(classId) {
  return allStudents.value.filter((s) => s.class_group_id === null || s.class_group_id === classId);
}

const showSnackbar = (text, color = "success") => {
  uiState.snackbar = { show: true, text, color };
};

// --- API Calls & Handlers ---
async function fetchData() {
  uiState.loading.page = true;
  try {
    const [classesRes, staffRes, studentsRes] = await Promise.all([
      api.get("/class-groups"),
      api.get("/staff"),
      api.get("/students?all=true"),
    ]);
    classes.value = classesRes.data;
    staff.value = staffRes.data;
    allStudents.value = studentsRes.data.data;

    classes.value.forEach((cg) => {
      uiState.classStudentSelection[cg.id] = allStudents.value
        .filter((s) => s.class_group_id === cg.id)
        .map((s) => s.id);
    });
  } catch (e) {
    showSnackbar("Gagal memuat data.", "error");
  } finally {
    uiState.loading.page = false;
  }
}

// --- Dialog Openers ---
function openAddDialog() {
  uiState.selectedClass = null;
  uiState.dialogs.form = true;
}
function openEditDialog(item) {
  uiState.selectedClass = { ...item };
  uiState.dialogs.form = true;
}
function openDeleteDialog(item) {
  uiState.selectedClass = item;
  uiState.dialogs.delete = true;
}

// [UPGRADE] Menggunakan update lokal
async function handleSaveClass(formData) {
  const isEditing = !!formData.id;
  try {
    if (isEditing) {
      const response = await api.put(`/class-groups/${formData.id}`, formData);
      const index = classes.value.findIndex((c) => c.id === formData.id);
      if (index !== -1) classes.value[index] = response.data;
    } else {
      const response = await api.post("/class-groups", formData);
      classes.value.unshift(response.data);
    }
    uiState.dialogs.form = false;
    showSnackbar(`Kelas berhasil ${isEditing ? "diperbarui" : "disimpan"}!`);
  } catch (error) {
    const message = error.response?.data?.message || "Terjadi kesalahan";
    showSnackbar(`Gagal menyimpan kelas: ${message}`, "error");
  }
}

// [UPGRADE] Menggunakan update lokal
async function confirmDelete() {
  try {
    await api.delete(`/class-groups/${uiState.selectedClass.id}`);
    classes.value = classes.value.filter((c) => c.id !== uiState.selectedClass.id);
    uiState.dialogs.delete = false;
    showSnackbar("Kelas berhasil dihapus.");
  } catch (error) {
    showSnackbar("Gagal menghapus kelas.", "error");
  }
}

// [UPGRADE] Menggunakan update lokal
async function updateWaliKelas(classGroup, staffId) {
  try {
    const response = await api.put(`/class-groups/${classGroup.id}`, { staff_id: staffId });
    // Update data wali kelas di state lokal secara langsung
    const index = classes.value.findIndex((c) => c.id === classGroup.id);
    if (index !== -1) classes.value[index].wali_kelas = response.data.wali_kelas;
    showSnackbar(`Wali kelas untuk ${classGroup.name} berhasil diubah.`);
  } catch (e) {
    showSnackbar("Gagal mengubah wali kelas.", "error");
    fetchData(); // Jika gagal, fetch ulang untuk sinkronisasi
  }
}

// Aksi ini kompleks karena mengubah data siswa dan kelas, jadi refetch tetap pilihan terbaik
async function handleSaveAssignments(classId) {
  uiState.loading.savingAssignmentsId = classId;
  try {
    await api.post(`/class-groups/${classId}/assign-students`, {
      student_ids: uiState.classStudentSelection[classId] || [],
    });
    showSnackbar("Perubahan siswa berhasil disimpan!");
    await fetchData(); // Refetch diperlukan untuk sinkronisasi data siswa & jumlah kelas
  } catch (error) {
    showSnackbar("Gagal menyimpan perubahan siswa.", "error");
  } finally {
    uiState.loading.savingAssignmentsId = null;
  }
}

onMounted(fetchData);
</script>

<template>
  <ClassFormDialog
    v-model="uiState.dialogs.form"
    :initial-data="uiState.selectedClass"
    :teachers="teachers"
    @save="handleSaveClass"
  />
  <ConfirmDialog
    v-model="uiState.dialogs.delete"
    title="Hapus Kelas"
    :message="`Yakin ingin menghapus kelas ${uiState.selectedClass?.name}? Semua siswa di dalamnya akan menjadi 'belum punya kelas'.`"
    @confirm="confirmDelete"
  />

  <v-container fluid>
    <v-card rounded="lg" border>
      <v-card-item class="py-4">
        <div class="d-flex flex-wrap justify-space-between align-center" style="gap: 16px">
          <div>
            <v-card-title class="d-flex align-center text-h5">
              <v-icon start icon="mdi-google-classroom"></v-icon>
              Manajemen Kelas
            </v-card-title>
            <v-card-subtitle
              >Atur wali kelas dan masukkan siswa ke dalam kelas yang sesuai.</v-card-subtitle
            >
          </div>
          <v-btn color="primary" @click="openAddDialog">
            <v-icon start>mdi-plus</v-icon>
            Tambah Kelas Baru
          </v-btn>
        </div>
      </v-card-item>
      <v-divider />

      <v-skeleton-loader
        v-if="uiState.loading.page"
        type="list-item-three-line@4"
      ></v-skeleton-loader>

      <div v-else-if="classes.length === 0" class="text-center text-medium-emphasis py-12">
        <v-icon size="64" class="mb-4">mdi-school-outline</v-icon>
        <h3 class="text-h6">Belum Ada Kelas</h3>
        <p>Mulai dengan menambahkan kelas baru untuk mengelola siswa.</p>
      </div>

      <v-expansion-panels v-else variant="accordion">
        <v-expansion-panel v-for="cg in classes" :key="cg.id">
          <v-expansion-panel-title>
            <v-row no-gutters class="align-center">
              <v-col cols="12" md="4">
                <strong>{{ cg.name }}</strong> ({{ cg.enrollment_year }})
                <v-chip size="small" class="ml-2" label>{{ cg.students_count }} Siswa</v-chip>
              </v-col>
              <v-col cols="10" md="6" class="pr-md-2 mt-2 mt-md-0">
                <v-select
                  :items="teachers"
                  item-title="name"
                  item-value="id"
                  :model-value="cg.wali_kelas?.id"
                  @update:model-value="(staffId) => updateWaliKelas(cg, staffId)"
                  label="Wali Kelas"
                  clearable
                  hide-details
                  density="compact"
                  variant="outlined"
                  @click.stop
                ></v-select>
              </v-col>
              <v-col cols="2" md="2" class="text-right">
                <v-menu location="bottom end">
                  <template #activator="{ props }">
                    <v-btn
                      v-bind="props"
                      icon="mdi-dots-vertical"
                      variant="text"
                      @click.stop
                    ></v-btn>
                  </template>
                  <v-list density="compact">
                    <v-list-item @click="openEditDialog(cg)">
                      <template #prepend><v-icon size="small">mdi-pencil</v-icon></template>
                      <v-list-item-title>Edit Kelas</v-list-item-title>
                    </v-list-item>
                    <v-list-item @click="openDeleteDialog(cg)" class="text-error">
                      <template #prepend
                        ><v-icon size="small" color="error">mdi-delete-outline</v-icon></template
                      >
                      <v-list-item-title>Hapus Kelas</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </v-col>
            </v-row>
          </v-expansion-panel-title>
          <v-expansion-panel-text class="pt-4">
            <v-autocomplete
              v-model="uiState.classStudentSelection[cg.id]"
              :items="availableStudentsForClass(cg.id)"
              item-title="name"
              item-value="id"
              multiple
              chips
              closable-chips
              label="Cari dan tambahkan siswa..."
              variant="outlined"
            >
              <template #item="{ props, item }">
                <v-list-item
                  v-bind="props"
                  :title="item.raw.name"
                  :subtitle="`NIS: ${item.raw.nis}`"
                ></v-list-item>
              </template>
            </v-autocomplete>

            <v-divider class="my-4"></v-divider>
            <v-btn
              color="primary"
              :loading="uiState.loading.savingAssignmentsId === cg.id"
              @click="handleSaveAssignments(cg.id)"
            >
              Simpan Perubahan Siswa
            </v-btn>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
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
