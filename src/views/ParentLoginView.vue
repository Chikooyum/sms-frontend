<script setup>
import { ref, reactive } from "vue";
import { useParentAuthStore } from "@/stores/parentAuth";

const authStore = useParentAuthStore();

// --- State untuk Form ---
const form = ref({
  name: "",
  date_of_birth: null, // [DIUBAH] Gunakan null sebagai nilai awal untuk date picker
  mother_date_of_birth: null,
});
const valid = ref(false);

// --- State untuk UI ---
const loading = ref(false);
const error = ref(null);
const menuDob = ref(false); // [BARU] State untuk menu date picker anak
const menuMotherDob = ref(false); // [BARU] State untuk menu date picker ibu

// [BARU] Aturan validasi
const rules = reactive({
  required: (v) => !!v || "Wajib diisi.",
});

// [BARU] Tambahkan fungsi yang hilang ini
const formatDate = (value) => {
  if (!value) return null;
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

async function handleLogin() {
  if (!valid.value) return;

  loading.value = true;
  error.value = null;

  console.log("=== FORM DATA DEBUG ===");
  console.log("Raw form data:", form.value);

  try {
    // PERBAIKAN: Gunakan format local date tanpa timezone conversion
    const payload = {
      name: form.value.name,
      date_of_birth: form.value.date_of_birth ? formatDateToYYYYMMDD(form.value.date_of_birth) : "",
      mother_date_of_birth: form.value.mother_date_of_birth
        ? formatDateToYYYYMMDD(form.value.mother_date_of_birth)
        : "",
    };

    console.log("Final payload:", payload);

    await authStore.login(payload);
  } catch (err) {
    console.error("Login error:", err);
    error.value = err.message || "Data yang Anda masukkan tidak cocok. Silakan periksa kembali.";
  } finally {
    loading.value = false;
  }
}

// FUNGSI BARU: Format tanggal tanpa timezone conversion
function formatDateToYYYYMMDD(date) {
  if (!date) return "";

  // Gunakan getFullYear(), getMonth(), getDate() untuk avoid timezone issues
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // +1 karena getMonth() mulai dari 0
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
</script>

<template>
  <v-container class="fill-height bg-grey-lighten-4" fluid>
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="6" lg="4">
        <v-card class="pa-4 pa-md-8" rounded="lg" elevation="4">
          <div class="d-flex justify-center mb-6">
            <v-avatar color="primary" size="64">
              <v-icon size="40">mdi-account-heart-outline</v-icon>
            </v-avatar>
          </div>

          <v-card-title class="text-center text-h5 font-weight-bold">
            Portal Orang Tua
          </v-card-title>
          <v-card-subtitle class="text-center mb-6">
            Masukkan data siswa untuk melihat informasi keuangan.
          </v-card-subtitle>

          <v-card-text>
            <v-form v-model="valid" @submit.prevent="handleLogin">
              <v-text-field
                v-model="form.name"
                label="Nama Lengkap Anak"
                required
                variant="outlined"
                prepend-inner-icon="mdi-account-child-outline"
                :rules="[rules.required]"
              ></v-text-field>

              <v-menu v-model="menuDob" :close-on-content-click="false" location="bottom">
                <template v-slot:activator="{ props }">
                  <v-text-field
                    v-bind="props"
                    :model-value="form.date_of_birth ? formatDate(form.date_of_birth) : ''"
                    label="Tanggal Lahir Anak"
                    required
                    readonly
                    variant="outlined"
                    class="mt-2"
                    prepend-inner-icon="mdi-calendar"
                    :rules="[rules.required]"
                  ></v-text-field>
                </template>
                <v-date-picker
                  v-model="form.date_of_birth"
                  @update:model-value="menuDob = false"
                  title="Pilih Tanggal Lahir Anak"
                  hide-actions
                ></v-date-picker>
              </v-menu>

              <v-menu v-model="menuMotherDob" :close-on-content-click="false" location="bottom">
                <template v-slot:activator="{ props }">
                  <v-text-field
                    v-bind="props"
                    :model-value="
                      form.mother_date_of_birth ? formatDate(form.mother_date_of_birth) : ''
                    "
                    label="Tanggal Lahir Ibu Kandung"
                    required
                    readonly
                    variant="outlined"
                    class="mt-2"
                    prepend-inner-icon="mdi-calendar-heart"
                    :rules="[rules.required]"
                  ></v-text-field>
                </template>
                <v-date-picker
                  v-model="form.mother_date_of_birth"
                  @update:model-value="menuMotherDob = false"
                  title="Pilih Tanggal Lahir Ibu"
                  hide-actions
                ></v-date-picker>
              </v-menu>

              <v-alert v-if="error" type="error" class="my-4" density="compact" variant="tonal">
                {{ error }}
              </v-alert>

              <v-btn
                type="submit"
                color="primary"
                block
                size="large"
                class="mt-4"
                :loading="loading"
                :disabled="!valid || loading"
              >
                Lihat Data
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
