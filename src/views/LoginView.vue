<script setup>
import { ref, reactive } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "vue-router";

const authStore = useAuthStore();
const router = useRouter();

// --- State untuk Form ---
const form = ref({ email: "", password: "" });
const valid = ref(false); // [BARU] Untuk status validasi form
const showPassword = ref(false); // [BARU] Untuk toggle lihat password

// --- State untuk UI ---
const loading = ref(false);
const error = ref(null);

// [BARU] Aturan validasi
const rules = reactive({
  required: (v) => !!v || "Wajib diisi.",
  email: (v) => /.+@.+\..+/.test(v) || "Format E-mail tidak valid.",
});

async function handleLogin() {
  if (!valid.value) return; // Jangan kirim jika form tidak valid

  loading.value = true;
  error.value = null;
  try {
    await authStore.login(form.value);

    // Logika pengalihan sudah bagus, tidak perlu diubah
    if (authStore.user?.role === "guru") {
      // Jika guru, arahkan ke dasbor guru
      router.push("/teacher/students");
    } else {
      // Jika bukan (sysadmin/admin), arahkan ke dasbor utama
      router.push("/");
    }
  } catch (err) {
    error.value = "Email atau password salah. Silakan coba lagi.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <v-container class="fill-height bg-grey-lighten-4" fluid>
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="6" lg="4">
        <v-card class="pa-4 pa-md-8" rounded="lg" elevation="4">
          <div class="d-flex justify-center mb-6">
            <v-avatar color="primary" size="64">
              <v-icon size="40">mdi-school</v-icon>
            </v-avatar>
          </div>

          <v-card-title class="text-center text-h5 font-weight-bold">
            Sistem Informasi Sekolah
          </v-card-title>
          <v-card-subtitle class="text-center mb-6">
            Silakan login untuk melanjutkan
          </v-card-subtitle>

          <v-card-text>
            <v-form v-model="valid" @submit.prevent="handleLogin">
              <v-text-field
                v-model="form.email"
                label="Email"
                type="email"
                required
                variant="outlined"
                prepend-inner-icon="mdi-email-outline"
                :rules="[rules.required, rules.email]"
              ></v-text-field>

              <v-text-field
                v-model="form.password"
                label="Password"
                :type="showPassword ? 'text' : 'password'"
                required
                variant="outlined"
                class="mt-2"
                prepend-inner-icon="mdi-lock-outline"
                :append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
                @click:append-inner="showPassword = !showPassword"
                :rules="[rules.required]"
              ></v-text-field>

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
                >Login</v-btn
              >
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
