<script setup>
import { ref, reactive, watch } from "vue";

const props = defineProps({
  modelValue: Boolean,
  initialData: { type: Object, default: null },
  creatableRoles: { type: Array, default: () => [] },
});
const emit = defineEmits(["update:modelValue", "save"]);

const valid = ref(false);
const formTitle = ref("Tambah Akun Staf Baru");
const form = ref({});
const showPassword = ref(false);
const showConfirmPassword = ref(false);

const rules = reactive({
  required: (v) => !!v || "Wajib diisi.",
  email: (v) => /.+@.+\..+/.test(v) || "Format E-mail tidak valid.",
  match: (v) => v === form.value.password || "Password tidak cocok.",
});

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      if (props.initialData) {
        formTitle.value = "Edit User";
        form.value = { ...props.initialData };
      } else {
        formTitle.value = "Tambah Akun Staf Baru";
        form.value = {
          name: "",
          email: "",
          password: "",
          password_confirmation: "",
          role: props.creatableRoles[0],
        };
      }
    }
  }
);

const submit = () => {
  if (valid.value) emit("save", form.value);
};
const close = () => emit("update:modelValue", false);
</script>

<template>
  <v-dialog :model-value="modelValue" @update:model-value="close" max-width="600px" persistent>
    <v-card rounded="xl" elevation="8" class="user-form-card">
      <!-- Added gradient header with icon and better styling -->
      <v-card-title class="pa-0">
        <div class="gradient-header pa-6 text-white">
          <div class="d-flex align-center">
            <v-icon
              :icon="initialData ? 'mdi-account-edit' : 'mdi-account-plus'"
              size="28"
              class="me-3"
            ></v-icon>
            <div>
              <h2 class="text-h5 font-weight-bold mb-1">{{ formTitle }}</h2>
              <p class="text-body-2 opacity-90 mb-0">
                {{
                  initialData ? "Perbarui informasi pengguna" : "Buat akun staf baru untuk sistem"
                }}
              </p>
            </div>
          </div>
        </div>
      </v-card-title>

      <!-- Enhanced form layout with better spacing and icons -->
      <v-card-text class="pa-6">
        <v-form v-model="valid" class="user-form">
          <!-- Personal Information Section -->
          <div class="form-section mb-6">
            <h3 class="text-h6 font-weight-medium mb-4 text-primary d-flex align-center">
              <v-icon icon="mdi-account" class="me-2" size="20"></v-icon>
              Informasi Personal
            </h3>

            <v-row>
              <v-col cols="12">
                <v-text-field
                  v-model="form.name"
                  label="Nama Lengkap"
                  required
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-account"
                  :rules="[rules.required]"
                  class="mb-2"
                  hide-details="auto"
                ></v-text-field>
              </v-col>

              <v-col cols="12">
                <v-text-field
                  v-model="form.email"
                  label="Alamat Email"
                  type="email"
                  required
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-email"
                  :rules="[rules.required, rules.email]"
                  hide-details="auto"
                ></v-text-field>
              </v-col>
            </v-row>
          </div>

          <!-- Role & Security Section (only for new users) -->
          <template v-if="!initialData">
            <div class="form-section">
              <h3 class="text-h6 font-weight-medium mb-4 text-primary d-flex align-center">
                <v-icon icon="mdi-shield-account" class="me-2" size="20"></v-icon>
                Peran & Keamanan
              </h3>

              <v-row>
                <v-col cols="12">
                  <v-select
                    v-model="form.role"
                    :items="creatableRoles"
                    label="Peran Pengguna"
                    required
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-account-tie"
                    :rules="[rules.required]"
                    class="mb-2"
                    hide-details="auto"
                  ></v-select>
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="form.password"
                    label="Password"
                    :type="showPassword ? 'text' : 'password'"
                    required
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-lock"
                    :append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
                    @click:append-inner="showPassword = !showPassword"
                    :rules="[rules.required]"
                    hide-details="auto"
                  ></v-text-field>
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="form.password_confirmation"
                    label="Konfirmasi Password"
                    :type="showConfirmPassword ? 'text' : 'password'"
                    required
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-lock-check"
                    :append-inner-icon="showConfirmPassword ? 'mdi-eye' : 'mdi-eye-off'"
                    @click:append-inner="showConfirmPassword = !showConfirmPassword"
                    :rules="[rules.required, rules.match]"
                    hide-details="auto"
                  ></v-text-field>
                </v-col>
              </v-row>

              <!-- Added helpful text for password requirements -->
              <v-alert
                type="info"
                variant="tonal"
                density="compact"
                class="mt-4"
                icon="mdi-information"
              >
                <div class="text-body-2">
                  <strong>Tips Keamanan:</strong> Gunakan kombinasi huruf besar, kecil, angka, dan
                  simbol untuk password yang kuat.
                </div>
              </v-alert>
            </div>
          </template>
        </v-form>
      </v-card-text>

      <!-- Enhanced action buttons with better styling -->
      <v-card-actions class="pa-6 pt-0">
        <v-spacer></v-spacer>
        <v-btn variant="outlined" color="grey-darken-1" @click="close" class="me-3" size="large">
          <v-icon icon="mdi-close" class="me-2"></v-icon>
          Batal
        </v-btn>
        <v-btn
          color="primary"
          @click="submit"
          :disabled="!valid"
          variant="elevated"
          size="large"
          class="px-8"
        >
          <v-icon :icon="initialData ? 'mdi-content-save' : 'mdi-plus'" class="me-2"></v-icon>
          {{ initialData ? "Perbarui" : "Simpan" }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.user-form-card {
  overflow: hidden;
}

.gradient-header {
  background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
  position: relative;
}

.gradient-header::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
  pointer-events: none;
}

.form-section {
  border-left: 3px solid #e3f2fd;
  padding-left: 16px;
  margin-left: 8px;
}

.user-form :deep(.v-field) {
  border-radius: 12px;
}

.user-form :deep(.v-field--focused) {
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
}

.user-form :deep(.v-btn) {
  border-radius: 10px;
  text-transform: none;
  font-weight: 500;
}

.user-form :deep(.v-btn:hover) {
  transform: translateY(-1px);
  transition: transform 0.2s ease;
}

@media (max-width: 600px) {
  .gradient-header {
    padding: 1rem !important;
  }

  .form-section {
    border-left: none;
    padding-left: 0;
    margin-left: 0;
  }

  .user-form :deep(.v-col) {
    padding: 4px 8px;
  }
}
</style>
