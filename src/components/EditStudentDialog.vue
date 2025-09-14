<script setup>
import { ref, watch, nextTick, onMounted, computed } from "vue";
import api from "@/services/api";

const props = defineProps({
  modelValue: Boolean,
  studentData: {
    type: Object,
    default: () => ({}),
  },
});
const emit = defineEmits(["update:modelValue", "save"]);

const valid = ref(false);
const classes = ref([]); // State untuk daftar kelas

// Mengambil data kelas saat komponen dimuat
onMounted(async () => {
  try {
    const response = await api.get("/class-groups");
    classes.value = response.data;
  } catch (error) {
    console.error("Gagal mengambil data kelas:", error);
  }
});

const form = ref({
  id: null,
  name: "",
  enrollment_year: "",
  class_group_id: null,
  date_of_birth: "",
  mother_name: "",
  mother_date_of_birth: "",
  phone_number: "",
  address: "",
  registration_wave: 1,
  is_alumni_sibling: false,
});

const waveOptions = [1, 2, 3];

// Computed property untuk mengecek apakah alumni sibling diaktifkan
const isAlumniSiblingEnabled = computed(() => {
  return form.value.registration_wave === 1;
});

// Watch untuk mereset alumni sibling ketika gelombang bukan 1
watch(
  () => form.value.registration_wave,
  (newWave) => {
    if (newWave !== 1) {
      form.value.is_alumni_sibling = false;
    }
  }
);

// Watcher untuk mengisi form setiap kali data siswa berubah
watch(
  () => props.studentData,
  async (newData) => {
    if (newData && Object.keys(newData).length > 0) {
      await nextTick(); // Tunggu DOM update
      form.value = {
        id: newData.id || null,
        name: newData.name || "",
        enrollment_year: newData.enrollment_year || "",
        class_group_id: newData.class_group_id || null,
        date_of_birth: newData.date_of_birth || "",
        mother_name: newData.mother_name || "",
        mother_date_of_birth: newData.mother_date_of_birth || "",
        phone_number: newData.phone_number || "",
        address: newData.address || "",
        registration_wave: newData.registration_wave || 1,
        is_alumni_sibling: newData.is_alumni_sibling || false,
      };
      console.log("Data loaded in edit form:", form.value); // Debug log
    }
  },
  {
    immediate: true,
    deep: true,
  }
);

// Watcher untuk dialog visibility
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal && props.studentData) {
      // Pastikan form terisi saat dialog dibuka
      form.value = {
        id: props.studentData.id || null,
        name: props.studentData.name || "",
        enrollment_year: props.studentData.enrollment_year || "",
        class_group_id: props.studentData.class_group_id || null,
        date_of_birth: props.studentData.date_of_birth || "",
        mother_name: props.studentData.mother_name || "",
        mother_date_of_birth: props.studentData.mother_date_of_birth || "",
        phone_number: props.studentData.phone_number || "",
        address: props.studentData.address || "",
        registration_wave: props.studentData.registration_wave || 1,
        is_alumni_sibling: props.studentData.is_alumni_sibling || false,
      };
    }
  }
);

const rules = {
  required: (value) => !!value || "Field ini harus diisi.",
};

function submit() {
  if (!form.value.id) {
    console.error("ID siswa tidak ditemukan!");
    return;
  }
  console.log("Submitting edit data:", form.value); // Debug log
  emit("save", form.value);
}

function close() {
  emit("update:modelValue", false);
  // Jangan reset form di sini, biarkan data tetap ada
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="close"
    max-width="700px"
    persistent
    class="edit-student-dialog"
  >
    <v-card class="rounded-xl elevation-12">
      <!-- Enhanced header with gradient background and better typography -->
      <v-card-title
        class="pa-6 text-white"
        style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
      >
        <div class="d-flex align-center">
          <v-icon class="me-3" size="28">mdi-account-edit</v-icon>
          <div>
            <div class="text-h5 font-weight-bold">Edit Data Siswa</div>
            <div class="text-subtitle-1 opacity-90">{{ form.name || "Memuat..." }}</div>
          </div>
        </div>
      </v-card-title>

      <v-card-text class="pa-6">
        <v-form v-model="valid">
          <v-container fluid class="pa-0">
            <!-- Added section headers for better organization -->
            <div class="mb-6">
              <h3 class="text-h6 text-primary mb-4 d-flex align-center">
                <v-icon class="me-2" color="primary">mdi-account</v-icon>
                Informasi Pribadi
              </h3>
              <v-row>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="form.name"
                    label="Nama Lengkap"
                    :rules="[rules.required]"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-account"
                    class="mb-2"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="form.enrollment_year"
                    label="Tahun Angkatan"
                    type="number"
                    :rules="[rules.required]"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-calendar"
                    class="mb-2"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="form.date_of_birth"
                    label="Tanggal Lahir Anak"
                    placeholder="YYYY-MM-DD"
                    :rules="[rules.required]"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-cake"
                    class="mb-2"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-select
                    v-model="form.class_group_id"
                    :items="classes"
                    item-title="name"
                    item-value="id"
                    label="Pilih Kelas"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-school"
                    class="mb-2"
                  ></v-select>
                </v-col>
              </v-row>
            </div>

            <!-- Added mother information section -->
            <div class="mb-6">
              <h3 class="text-h6 text-primary mb-4 d-flex align-center">
                <v-icon class="me-2" color="primary">mdi-account-heart</v-icon>
                Informasi Ibu Kandung
              </h3>
              <v-row>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="form.mother_name"
                    label="Nama Ibu Kandung"
                    :rules="[rules.required]"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-account-heart"
                    class="mb-2"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="form.mother_date_of_birth"
                    label="Tanggal Lahir Ibu"
                    placeholder="YYYY-MM-DD"
                    :rules="[rules.required]"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-cake"
                    class="mb-2"
                  ></v-text-field>
                </v-col>
              </v-row>
            </div>

            <!-- Added contact and registration section -->
            <div class="mb-6">
              <h3 class="text-h6 text-primary mb-4 d-flex align-center">
                <v-icon class="me-2" color="primary">mdi-phone</v-icon>
                Kontak & Pendaftaran
              </h3>
              <v-row>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="form.phone_number"
                    label="Nomor Telepon"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-phone"
                    class="mb-2"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-select
                    v-model="form.registration_wave"
                    :items="waveOptions"
                    label="Gelombang Pendaftaran"
                    :rules="[rules.required]"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-waves"
                    class="mb-2"
                  ></v-select>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-card
                    :class="[
                      'pa-4 rounded-lg',
                      isAlumniSiblingEnabled ? 'bg-blue-lighten-5' : 'bg-grey-lighten-4',
                    ]"
                    :elevation="isAlumniSiblingEnabled ? 2 : 0"
                  >
                    <v-checkbox
                      v-model="form.is_alumni_sibling"
                      label="Kakak/Adik Alumni?"
                      :disabled="!isAlumniSiblingEnabled"
                      color="primary"
                      density="comfortable"
                    ></v-checkbox>
                    <div class="text-caption text-grey-darken-1 mt-1">
                      {{
                        isAlumniSiblingEnabled
                          ? "Tersedia untuk gelombang 1"
                          : "Hanya tersedia untuk gelombang 1"
                      }}
                    </div>
                  </v-card>
                </v-col>
                <v-col cols="12">
                  <v-textarea
                    v-model="form.address"
                    label="Alamat Lengkap"
                    rows="3"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-map-marker"
                    class="mb-2"
                  ></v-textarea>
                </v-col>
              </v-row>
            </div>
          </v-container>
        </v-form>
      </v-card-text>

      <!-- Enhanced action buttons with better styling and spacing -->
      <v-card-actions class="pa-6 pt-0">
        <v-spacer></v-spacer>
        <v-btn
          color="grey-darken-1"
          variant="outlined"
          size="large"
          @click="close"
          class="me-3"
          prepend-icon="mdi-close"
        >
          Batal
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          size="large"
          @click="submit"
          :disabled="!valid || !form.id"
          prepend-icon="mdi-content-save"
          class="px-6"
        >
          Simpan Perubahan
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.edit-student-dialog .v-card {
  overflow: visible;
}

.edit-student-dialog .v-text-field,
.edit-student-dialog .v-select,
.edit-student-dialog .v-textarea {
  transition: all 0.3s ease;
}

.edit-student-dialog .v-text-field:hover,
.edit-student-dialog .v-select:hover,
.edit-student-dialog .v-textarea:hover {
  transform: translateY(-1px);
}

@media (max-width: 600px) {
  .edit-student-dialog .v-card-title {
    padding: 1rem !important;
  }

  .edit-student-dialog .v-card-text {
    padding: 1rem !important;
  }

  .edit-student-dialog .v-card-actions {
    padding: 1rem !important;
    flex-direction: column;
    gap: 0.5rem;
  }

  .edit-student-dialog .v-btn {
    width: 100%;
  }
}
</style>
