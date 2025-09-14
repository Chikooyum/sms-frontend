<script setup>
import { ref, watch } from "vue";

const props = defineProps({
  modelValue: Boolean,
  initialData: { type: Object, default: null },
});
const emit = defineEmits(["update:modelValue", "save"]);

const valid = ref(false);
const form = ref({});

// [DIUBAH TOTAL] Logika watch disederhanakan, hanya untuk mode EDIT
watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen && props.initialData) {
      // Selalu asumsikan mode edit, ambil data dari initialData
      form.value = {
        id: props.initialData.id,
        name: props.initialData.name || "",
        position: props.initialData.position || "",
        contact_info: props.initialData.contact_info || "",
      };
    }
  },
  { immediate: true, deep: true }
);

const rules = {
  required: (value) => !!value || "Field ini harus diisi.",
};

function submit() {
  if (valid.value) emit("save", form.value);
}
function close() {
  emit("update:modelValue", false);
}
</script>

<template>
  <v-dialog :model-value="modelValue" @update:model-value="close" max-width="600px" persistent>
    <v-card rounded="xl" elevation="8" class="overflow-hidden">
      <!-- Added gradient header with icon for better visual hierarchy -->
      <v-card-title class="pa-0">
        <div class="bg-gradient-to-r from-blue-600 to-indigo-600 text-white pa-6">
          <div class="d-flex align-center">
            <v-icon size="28" class="me-3">mdi-account-edit</v-icon>
            <div>
              <h2 class="text-h5 font-weight-bold mb-1">Edit Data Staf</h2>
              <p class="text-blue-100 mb-0 text-body-2">Perbarui informasi staf sekolah</p>
            </div>
          </div>
        </div>
      </v-card-title>

      <!-- Enhanced form layout with better spacing and organization -->
      <v-card-text class="pa-6 pa-sm-8">
        <v-form v-model="valid">
          <!-- Personal Information Section -->
          <div class="mb-6">
            <h3 class="text-h6 font-weight-medium text-grey-darken-2 mb-4 d-flex align-center">
              <v-icon size="20" class="me-2 text-blue-600">mdi-account</v-icon>
              Informasi Personal
            </h3>

            <v-text-field
              v-model="form.name"
              label="Nama Lengkap"
              :rules="[rules.required]"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-account-circle"
              class="mb-4"
              hide-details="auto"
            ></v-text-field>

            <v-text-field
              v-model="form.position"
              label="Jabatan"
              :rules="[rules.required]"
              hint="Contoh: Guru TK A, Kepala Sekolah, Administrasi"
              persistent-hint
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-briefcase"
              class="mb-4"
            ></v-text-field>
          </div>

          <!-- Contact Information Section -->
          <div>
            <h3 class="text-h6 font-weight-medium text-grey-darken-2 mb-4 d-flex align-center">
              <v-icon size="20" class="me-2 text-green-600">mdi-phone</v-icon>
              Informasi Kontak
            </h3>

            <v-text-field
              v-model="form.contact_info"
              label="Info Kontak (Opsional)"
              hint="Contoh: +62 812-3456-7890 atau email@domain.com"
              persistent-hint
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-phone"
            ></v-text-field>
          </div>
        </v-form>
      </v-card-text>

      <!-- Enhanced action buttons with better mobile responsiveness -->
      <v-card-actions class="pa-6 pt-0">
        <v-spacer></v-spacer>
        <div class="d-flex flex-column flex-sm-row ga-3 w-100 w-sm-auto">
          <v-btn
            variant="outlined"
            @click="close"
            size="large"
            class="text-none order-2 order-sm-1"
          >
            <v-icon start>mdi-close</v-icon>
            Batal
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            @click="submit"
            :disabled="!valid"
            size="large"
            class="text-none order-1 order-sm-2"
          >
            <v-icon start>mdi-content-save</v-icon>
            Simpan Perubahan
          </v-btn>
        </div>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.bg-gradient-to-r {
  background: linear-gradient(to right, #1e40af, #3730a3);
}

/* Enhanced mobile responsiveness */
@media (max-width: 600px) {
  .v-card-text {
    padding: 1rem !important;
  }

  .v-card-actions {
    padding: 1rem !important;
    padding-top: 0 !important;
  }
}

/* Smooth hover effects */
.v-btn:hover {
  transform: translateY(-1px);
  transition: transform 0.2s ease;
}
</style>
