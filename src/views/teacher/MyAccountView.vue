<script setup>
// Ganti seluruh isi <script setup> Anda dengan ini

import { ref, reactive, watch } from "vue";
import { useAuthStore } from "@/stores/auth";
import api from "@/services/api";
import { QrcodeStream } from "vue-qrcode-reader";

const authStore = useAuthStore();

// --- State untuk Form & UI ---
const profileForm = ref({ name: "", contact_info: "" });
const passwordForm = ref({ current_password: "", password: "", password_confirmation: "" });
const profileFormValid = ref(false);
const passwordFormValid = ref(false);
const profileLoading = ref(false);
const passwordLoading = ref(false);
const snackbar = ref({ show: false, text: "", color: "success" });
const scanDialog = ref(false);
const cameraError = ref(null);
const currentLocation = ref(null);

// --- [BARU] State untuk upload foto ---
const photoPreview = ref(null);
const selectedFile = ref(null);
const fileInput = ref(null); // Ref untuk input file tersembunyi
const photoLoading = ref(false);

// State untuk fitur lihat password
const showCurrentPassword = ref(false);
const showNewPassword = ref(false);
const showConfirmPassword = ref(false);

const rules = reactive({
  required: (v) => !!v || "Wajib diisi.",
  minLength: (v) => (v && v.length >= 8) || "Password minimal 8 karakter.",
  match: (v) => v === passwordForm.value.password || "Password tidak cocok.",
});

watch(
  () => authStore.user,
  (newUser) => {
    if (newUser) {
      profileForm.value.name = newUser.name || "";
      profileForm.value.contact_info = newUser.staff?.contact_info || "";
      photoPreview.value = newUser.staff?.photo_url || null; // Tampilkan foto dari server
    }
  },
  { immediate: true, deep: true }
);

const showSnackbar = (text, color = "success") => {
  snackbar.value = { show: true, text, color };
};

// --- [BARU] Fungsi-fungsi untuk foto profil ---
function triggerFileInput() {
  fileInput.value.click();
}

function onFileChange(event) {
  const file = event.target.files[0];
  if (file) {
    selectedFile.value = file;
    photoPreview.value = URL.createObjectURL(file); // Buat preview lokal
  }
}

async function handlePhotoUpload() {
  if (!selectedFile.value) {
    showSnackbar("Silakan pilih file foto terlebih dahulu.", "warning");
    return;
  }
  photoLoading.value = true;
  const formData = new FormData();
  formData.append("photo", selectedFile.value);

  try {
    const response = await api.post("/teacher/profile/photo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    // DEBUG: Lihat response dari backend
    console.log("Upload response:", response.data);
    console.log("User data:", response.data.user);
    console.log("Staff data:", response.data.user?.staff);
    console.log("Photo URL:", response.data.user?.staff?.photo_url);

    authStore.updateUser(response.data.user);
    showSnackbar(response.data.message || "Foto berhasil diunggah!");
    selectedFile.value = null;
  } catch (error) {
    console.error("Upload error:", error); // DEBUG
    const message = error.response?.data?.message || "Terjadi kesalahan";
    showSnackbar(`Gagal mengunggah foto: ${message}`, "error");
  } finally {
    photoLoading.value = false;
  }
}

// --- Fungsi yang sudah ada (diperbarui) ---
async function handleProfileUpdate() {
  if (!profileFormValid.value) return;
  profileLoading.value = true;
  try {
    const response = await api.post("/teacher/profile", profileForm.value);
    authStore.updateUser(response.data.user);
    showSnackbar(response.data.message || "Profil berhasil diperbarui!");
  } catch (error) {
    const message = error.response?.data?.message || "Terjadi kesalahan";
    showSnackbar(`Gagal update profil: ${message}`, "error");
  } finally {
    profileLoading.value = false;
  }
}

async function handlePasswordChange() {
  if (!passwordFormValid.value) return;
  passwordLoading.value = true;
  try {
    const response = await api.post("/teacher/change-password", passwordForm.value);
    showSnackbar(response.data.message || "Password berhasil diubah!");
    passwordForm.value = { current_password: "", password: "", password_confirmation: "" };
  } catch (error) {
    const errorMessages = error.response?.data?.errors
      ? Object.values(error.response.data.errors).flat().join("\n")
      : "Terjadi kesalahan";
    showSnackbar(`Gagal ubah password: ${errorMessages}`, "error");
  } finally {
    passwordLoading.value = false;
  }
}

const onDetect = async (detectedCodes) => {
  const token = detectedCodes[0].rawValue;
  scanDialog.value = false;
  cameraError.value = null;

  try {
    // Use the location that was already obtained when dialog opened
    if (!currentLocation.value) {
      showSnackbar("Lokasi tidak tersedia. Silakan coba lagi.", "error");
      return;
    }

    const { latitude, longitude } = currentLocation.value;

    const response = await api.post("/teacher/attendance/check-in", {
      token,
      latitude,
      longitude,
    });
    showSnackbar(response.data.message, "success");
  } catch (error) {
    if (error.code === "LOCATION_ERROR") {
      showSnackbar(error.message, "error");
    } else {
      showSnackbar(error.response?.data?.message || "Absen Gagal!", "error");
    }
  }
};

// Get user's current geolocation
const getCurrentPosition = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({ code: "LOCATION_ERROR", message: "Geolokasi tidak didukung oleh browser ini." });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      (error) => {
        let message = "Gagal mendapatkan lokasi.";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = "Akses lokasi ditolak. Silakan izinkan akses lokasi untuk melakukan absensi.";
            break;
          case error.POSITION_UNAVAILABLE:
            message = "Informasi lokasi tidak tersedia.";
            break;
          case error.TIMEOUT:
            message = "Waktu permintaan lokasi habis.";
            break;
        }
        reject({ code: "LOCATION_ERROR", message });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  });
};

const onCameraError = (error) => {
  console.error("Camera error:", error);
  cameraError.value = error.message || "Gagal mengakses kamera";
  showSnackbar("Gagal mengakses kamera. Pastikan Anda memberikan izin akses kamera.", "error");
};

const requestCameraPermission = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach((track) => track.stop()); // Stop the stream immediately
    return true;
  } catch (error) {
    console.error("Camera permission denied:", error);
    showSnackbar(
      "Izin akses kamera ditolak. Silakan izinkan akses kamera di browser Anda.",
      "error"
    );
    return false;
  }
};

const openScanDialog = async () => {
  cameraError.value = null;
  currentLocation.value = null;

  // Request location permission first
  try {
    const position = await getCurrentPosition();
    currentLocation.value = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
    showSnackbar("Izin lokasi berhasil didapatkan", "success");
  } catch (error) {
    if (error.code === "LOCATION_ERROR") {
      showSnackbar(error.message, "error");
      return; // Don't open dialog if location permission denied
    }
  }

  // Then request camera permission
  const hasCameraPermission = await requestCameraPermission();
  if (hasCameraPermission) {
    scanDialog.value = true;
  }
};
</script>

<template>
  <div>
    <input
      type="file"
      ref="fileInput"
      @change="onFileChange"
      accept="image/*"
      style="display: none"
    />

    <v-dialog v-model="scanDialog" max-width="500">
      <v-card title="Pindai QR Code Absensi">
        <div v-if="cameraError" class="pa-4 text-center">
          <v-icon size="48" color="error" class="mb-2">mdi-camera-off</v-icon>
          <div class="text-h6 mb-2">Kamera Tidak Tersedia</div>
          <div class="text-body-2 mb-4">{{ cameraError }}</div>
          <v-btn
            color="primary"
            @click="
              cameraError = null;
              requestCameraPermission();
            "
          >
            Coba Lagi
          </v-btn>
        </div>
        <QrcodeStream
          v-else
          @detect="onDetect"
          @error="onCameraError"
          :constraints="{ video: { facingMode: 'environment' } }"
        ></QrcodeStream>
        <v-card-actions><v-btn block @click="scanDialog = false">Batal</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <v-row>
      <v-col cols="12">
        <v-btn
          block
          color="primary"
          size="large"
          @click="openScanDialog"
          prepend-icon="mdi-qrcode-scan"
        >
          Lakukan Absensi Sekarang
        </v-btn>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="6">
        <v-card rounded="lg" border>
          <v-card-item>
            <v-card-title class="d-flex align-center">
              <v-icon start icon="mdi-account-edit-outline"></v-icon>
              Ubah Profil
            </v-card-title>
          </v-card-item>
          <v-divider></v-divider>
          <v-card-text>
            <div class="d-flex flex-column align-center my-4">
              <v-hover v-slot="{ isHovering, props }">
                <div v-bind="props" class="position-relative">
                  <v-avatar size="120" class="border">
                    <v-img :src="photoPreview || '/default-avatar.png'" cover></v-img>
                  </v-avatar>
                  <v-overlay
                    :model-value="isHovering"
                    contained
                    scrim="#036358"
                    class="align-center justify-center"
                    @click="triggerFileInput"
                  >
                    <v-icon>mdi-pencil</v-icon>
                    <div class="text-caption">Ubah Foto</div>
                  </v-overlay>
                </div>
              </v-hover>
              <v-btn
                v-if="selectedFile"
                color="primary"
                class="mt-4"
                @click="handlePhotoUpload"
                :loading="photoLoading"
                size="small"
              >
                <v-icon start>mdi-upload</v-icon>
                Unggah Foto
              </v-btn>
            </div>
            <v-divider class="mb-6"></v-divider>

            <v-form v-model="profileFormValid" @submit.prevent="handleProfileUpdate">
              <v-text-field
                label="Email (tidak bisa diubah)"
                :model-value="authStore.user?.email"
                disabled
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-email-outline"
              ></v-text-field>
              <v-text-field
                v-model="profileForm.name"
                label="Nama Lengkap"
                variant="outlined"
                density="compact"
                class="mt-4"
                prepend-inner-icon="mdi-account-outline"
                :rules="[rules.required]"
              ></v-text-field>
              <v-text-field
                v-model="profileForm.contact_info"
                label="Info Kontak (No. Telepon)"
                variant="outlined"
                density="compact"
                class="mt-4"
                prepend-inner-icon="mdi-phone-outline"
              ></v-text-field>
              <v-btn
                type="submit"
                color="primary"
                block
                class="mt-4"
                :loading="profileLoading"
                :disabled="!profileFormValid"
                >Simpan Perubahan Profil</v-btn
              >
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card rounded="lg" border>
          <v-card-item>
            <v-card-title class="d-flex align-center">
              <v-icon start icon="mdi-lock-reset"></v-icon>
              Ubah Password
            </v-card-title>
          </v-card-item>
          <v-divider></v-divider>
          <v-card-text>
            <v-form v-model="passwordFormValid" @submit.prevent="handlePasswordChange">
              <v-text-field
                v-model="passwordForm.current_password"
                label="Password Saat Ini"
                :type="showCurrentPassword ? 'text' : 'password'"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-lock-outline"
                :append-inner-icon="showCurrentPassword ? 'mdi-eye' : 'mdi-eye-off'"
                @click:append-inner="showCurrentPassword = !showCurrentPassword"
                :rules="[rules.required]"
              ></v-text-field>
              <v-text-field
                v-model="passwordForm.password"
                label="Password Baru"
                :type="showNewPassword ? 'text' : 'password'"
                variant="outlined"
                density="compact"
                class="mt-4"
                prepend-inner-icon="mdi-lock-plus-outline"
                :append-inner-icon="showNewPassword ? 'mdi-eye' : 'mdi-eye-off'"
                @click:append-inner="showNewPassword = !showNewPassword"
                :rules="[rules.required, rules.minLength]"
              ></v-text-field>
              <v-text-field
                v-model="passwordForm.password_confirmation"
                label="Konfirmasi Password Baru"
                :type="showConfirmPassword ? 'text' : 'password'"
                variant="outlined"
                density="compact"
                class="mt-4"
                prepend-inner-icon="mdi-lock-check-outline"
                :append-inner-icon="showConfirmPassword ? 'mdi-eye' : 'mdi-eye-off'"
                @click:append-inner="showConfirmPassword = !showConfirmPassword"
                :rules="[rules.required, rules.match]"
              ></v-text-field>
              <v-btn
                type="submit"
                color="primary"
                block
                class="mt-4"
                :loading="passwordLoading"
                :disabled="!passwordFormValid"
                >Simpan Password</v-btn
              >
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="3000"
      location="top right"
    >
      {{ snackbar.text }}
    </v-snackbar>
  </div>
</template>
