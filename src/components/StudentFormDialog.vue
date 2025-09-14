<script setup>
import { ref, onMounted, computed, watch } from "vue"; // DITAMBAHKAN: computed, watch
import api from "@/services/api"; // DITAMBAHKAN: import api

defineProps({ modelValue: Boolean });
const emit = defineEmits(["update:modelValue", "save"]);

const valid = ref(false);
const classes = ref([]); // DITAMBAHKAN: state untuk daftar kelas

// DITAMBAHKAN: Mengambil data kelas saat komponen dimuat
onMounted(async () => {
  try {
    const response = await api.get("/class-groups");
    classes.value = response.data;
  } catch (error) {
    console.error("Gagal mengambil data kelas:", error);
  }
});

// DIUBAH: Menambahkan class_group_id ke state form
const getInitialFormState = () => ({
  name: "",
  enrollment_year: new Date().getFullYear(),
  class_group_id: null, // <-- Field baru
  date_of_birth: "",
  mother_name: "",
  mother_date_of_birth: "",
  phone_number: "",
  address: "",
  registration_wave: 1,
  is_alumni_sibling: false,
});
const form = ref(getInitialFormState());
const waveOptions = [1, 2, 3];

// DITAMBAHKAN: Computed property untuk mengecek apakah alumni sibling diaktifkan
const isAlumniSiblingEnabled = computed(() => {
  return form.value.registration_wave === 1;
});

// DITAMBAHKAN: Watch untuk mereset alumni sibling ketika gelombang bukan 1
watch(
  () => form.value.registration_wave,
  (newWave) => {
    if (newWave !== 1) {
      form.value.is_alumni_sibling = false;
    }
  }
);

const rules = {
  required: (value) => !!value || "Field ini harus diisi.",
};

function submit() {
  emit("save", form.value);
}

function close() {
  emit("update:modelValue", false);
  form.value = getInitialFormState();
}
</script>
<template>
  <!-- Enhanced dialog with better styling and mobile optimization -->
  <v-dialog
    :model-value="modelValue"
    @update:model-value="close"
    max-width="700px"
    persistent
    class="student-form-dialog"
  >
    <v-card class="rounded-xl elevation-8">
      <!-- Modern gradient header with better typography -->
      <v-card-title class="bg-gradient-to-r from-blue-600 to-indigo-600 text-white pa-6">
        <div class="d-flex align-center justify-space-between">
          <div>
            <h2 class="text-h5 font-weight-bold mb-1">Tambah Siswa Baru</h2>
            <p class="text-blue-100 text-body-2 mb-0">Lengkapi informasi siswa dengan benar</p>
          </div>
          <v-btn icon="mdi-close" variant="text" color="white" @click="close" class="ml-4"></v-btn>
        </div>
      </v-card-title>

      <v-card-text class="pa-6">
        <v-form v-model="valid">
          <v-container fluid class="pa-0">
            <!-- Personal Information Section -->
            <div class="mb-6">
              <h3 class="text-h6 font-weight-medium text-grey-darken-2 mb-4 d-flex align-center">
                <v-icon class="mr-2" color="blue">mdi-account</v-icon>
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
                    prepend-inner-icon="mdi-account-outline"
                    class="rounded-lg"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="form.date_of_birth"
                    label="Tanggal Lahir (YYYY-MM-DD)"
                    :rules="[rules.required]"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-calendar"
                    placeholder="2010-01-15"
                    class="rounded-lg"
                  ></v-text-field>
                </v-col>
              </v-row>
            </div>

            <!-- Academic Information Section -->
            <div class="mb-6">
              <h3 class="text-h6 font-weight-medium text-grey-darken-2 mb-4 d-flex align-center">
                <v-icon class="mr-2" color="green">mdi-school</v-icon>
                Informasi Akademik
              </h3>
              <v-row>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="form.enrollment_year"
                    label="Tahun Angkatan"
                    type="number"
                    :rules="[rules.required]"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-calendar-clock"
                    class="rounded-lg"
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
                    prepend-inner-icon="mdi-google-classroom"
                    class="rounded-lg"
                  ></v-select>
                </v-col>
              </v-row>
            </div>

            <!-- Parent Information Section -->
            <div class="mb-6">
              <h3 class="text-h6 font-weight-medium text-grey-darken-2 mb-4 d-flex align-center">
                <v-icon class="mr-2" color="purple">mdi-account-heart</v-icon>
                Informasi Orang Tua
              </h3>
              <v-row>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="form.mother_name"
                    label="Nama Ibu Kandung"
                    :rules="[rules.required]"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-account-heart-outline"
                    class="rounded-lg"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="form.mother_date_of_birth"
                    label="Tanggal Lahir Ibu (YYYY-MM-DD)"
                    :rules="[rules.required]"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-calendar"
                    placeholder="1985-05-20"
                    class="rounded-lg"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="form.phone_number"
                    label="Nomor Telepon"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-phone"
                    placeholder="08123456789"
                    class="rounded-lg"
                  ></v-text-field>
                </v-col>
              </v-row>
            </div>

            <!-- Registration Information Section -->
            <div class="mb-6">
              <h3 class="text-h6 font-weight-medium text-grey-darken-2 mb-4 d-flex align-center">
                <v-icon class="mr-2" color="orange">mdi-clipboard-text</v-icon>
                Informasi Pendaftaran
              </h3>
              <v-row>
                <v-col cols="12" sm="6">
                  <v-select
                    v-model="form.registration_wave"
                    :items="waveOptions"
                    label="Gelombang Pendaftaran"
                    :rules="[rules.required]"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-waves"
                    class="rounded-lg"
                  ></v-select>
                </v-col>
                <v-col cols="12" sm="6" class="d-flex align-center">
                  <v-card
                    :class="[
                      'pa-4 w-100 rounded-lg',
                      isAlumniSiblingEnabled ? 'bg-blue-50' : 'bg-grey-50',
                    ]"
                    variant="outlined"
                  >
                    <v-checkbox
                      v-model="form.is_alumni_sibling"
                      label="Kakak/Adik Alumni"
                      :disabled="!isAlumniSiblingEnabled"
                      color="blue"
                      density="comfortable"
                    ></v-checkbox>
                    <p class="text-caption text-grey-darken-1 mt-1 mb-0">
                      {{
                        isAlumniSiblingEnabled
                          ? "Tersedia untuk gelombang 1"
                          : "Hanya tersedia untuk gelombang 1"
                      }}
                    </p>
                  </v-card>
                </v-col>
              </v-row>
            </div>

            <!-- Address Section -->
            <div>
              <h3 class="text-h6 font-weight-medium text-grey-darken-2 mb-4 d-flex align-center">
                <v-icon class="mr-2" color="red">mdi-map-marker</v-icon>
                Alamat
              </h3>
              <v-textarea
                v-model="form.address"
                label="Alamat Lengkap"
                variant="outlined"
                rows="3"
                prepend-inner-icon="mdi-home-outline"
                placeholder="Masukkan alamat lengkap..."
                class="rounded-lg"
              ></v-textarea>
            </div>
          </v-container>
        </v-form>
      </v-card-text>

      <!-- Enhanced action buttons with better styling -->
      <v-card-actions class="pa-6 pt-0">
        <v-spacer></v-spacer>
        <v-btn
          color="grey-darken-1"
          variant="outlined"
          @click="close"
          class="mr-3 rounded-lg px-6"
          size="large"
        >
          <v-icon class="mr-2">mdi-close</v-icon>
          Batal
        </v-btn>
        <v-btn
          color="blue"
          variant="flat"
          @click="submit"
          :disabled="!valid"
          class="rounded-lg px-8 elevation-2"
          size="large"
        >
          <v-icon class="mr-2">mdi-content-save</v-icon>
          Simpan Data
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.student-form-dialog :deep(.v-dialog) {
  margin: 16px;
}

.bg-gradient-to-r {
  background: linear-gradient(to right, rgb(37, 99, 235), rgb(79, 70, 229));
}

.rounded-lg :deep(.v-field__outline) {
  border-radius: 12px;
}

@media (max-width: 600px) {
  .student-form-dialog :deep(.v-dialog) {
    margin: 8px;
  }

  .student-form-dialog :deep(.v-card-title) {
    padding: 16px !important;
  }

  .student-form-dialog :deep(.v-card-text) {
    padding: 16px !important;
  }

  .student-form-dialog :deep(.v-card-actions) {
    padding: 16px !important;
    padding-top: 0 !important;
  }
}
</style>
