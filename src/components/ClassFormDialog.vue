<script setup>
import { ref, watch, nextTick, computed } from "vue";

// --- Props & Emits ---
const props = defineProps({
  modelValue: Boolean,
  initialData: { type: Object, default: null },
  loading: { type: Boolean, default: false },
});
const emit = defineEmits(["update:modelValue", "save"]);

// --- State ---
const formRef = ref(null);
const nameInputRef = ref(null);
const form = ref({});
const valid = ref(false);

// --- Computed Properties ---
const formTitle = computed(() => (props.initialData ? "Edit Kelas" : "Tambah Kelas Baru"));

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

// --- Logic ---
async function setupForm() {
  await nextTick();
  formRef.value?.resetValidation();

  if (props.initialData) {
    form.value = { ...props.initialData };
  } else {
    form.value = { name: "", enrollment_year: new Date().getFullYear() };
  }

  await nextTick();
  nameInputRef.value?.focus();
}

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      setupForm();
    }
  }
);

const rules = {
  required: (v) => !!v || "Field ini harus diisi.",
  year: (v) => (v > 2000 && v < 2100) || "Tahun tidak valid",
};

function submit() {
  formRef.value?.validate().then(({ valid }) => {
    if (valid) {
      emit("save", form.value);
    }
  });
}

function close() {
  dialogVisible.value = false;
}
</script>

<template>
  <v-dialog v-model="dialogVisible" max-width="550px" persistent>
    <v-card rounded="lg">
      <v-card-title
        class="pa-5 text-white"
        style="background: linear-gradient(135deg, #1e88e5 0%, #4527a0 100%)"
      >
        <div class="d-flex align-center">
          <v-icon class="me-3" size="32">mdi-google-classroom</v-icon>
          <div>
            <div class="text-h5 font-weight-bold">{{ formTitle }}</div>
            <div class="text-subtitle-1" style="opacity: 0.9">Detail dasar kelas</div>
          </div>
        </div>
      </v-card-title>

      <v-card-text class="pa-6">
        <v-form ref="formRef" v-model="valid" @submit.prevent="submit">
          <v-container class="pa-0">
            <v-row>
              <v-col cols="12">
                <v-text-field
                  ref="nameInputRef"
                  v-model="form.name"
                  label="Nama Kelas*"
                  :rules="[rules.required]"
                  hint="Contoh: TK A Ceria, Kelompok Bermain Bintang"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-format-text"
                ></v-text-field>
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model.number="form.enrollment_year"
                  label="Untuk Tahun Angkatan*"
                  type="number"
                  :rules="[rules.required, rules.year]"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-calendar-range"
                ></v-text-field>
              </v-col>
            </v-row>
          </v-container>
        </v-form>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="outlined" size="large" @click="close" class="me-2" prepend-icon="mdi-close">
          Batal
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          size="large"
          @click="submit"
          :disabled="!valid"
          :loading="loading"
          prepend-icon="mdi-content-save"
        >
          Simpan
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
