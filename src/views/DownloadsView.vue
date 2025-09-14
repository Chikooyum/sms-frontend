<script setup>
import { ref, onMounted, reactive } from "vue";
import api from "@/services/api";

// --- State untuk data & UI ---
const files = ref([]);
const loading = ref(true);
const uploading = ref(false);

// --- State untuk Form ---
const valid = ref(false);
const form = ref(null);
const title = ref("");
const fileToUpload = ref(null); // [FIX] Diubah dari array [] menjadi null

// --- State untuk Notifikasi & Dialog ---
const snackbar = ref({ show: false, text: "", color: "success" });
const dialogDelete = ref(false);
const itemToDelete = ref(null);

// [FIX] Aturan validasi disesuaikan untuk menangani satu file (objek), bukan array
const rules = reactive({
  required: (v) => !!v || "Wajib diisi",
  fileRequired: (v) => !!v || "File wajib dipilih", // Cek sederhana: apakah v truthy (bukan null)?
  maxSize: (v) => {
    if (!v) return true; // Jangan validasi jika file kosong
    const maxSize = 2 * 1024 * 1024; // 2MB
    return v.size < maxSize || `File terlalu besar! Maksimal 2 MB.`;
  },
  fileType: (v) => {
    if (!v) return true; // Jangan validasi jika file kosong
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    return (
      allowedTypes.includes(v.type) || "Tipe file tidak diizinkan (hanya PDF, JPG, PNG, DOC, DOCX)."
    );
  },
});

// --- Fungsi Helper ---
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};
const formatDate = (value) =>
  new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
const showSnackbar = (text, color = "success") => {
  snackbar.value = { show: true, text, color };
};

// --- Headers untuk Data Table ---
const headers = [
  { title: "Judul File", key: "title", width: "35%" },
  { title: "Nama File", key: "filename" },
  { title: "Ukuran", key: "size", align: "end" },
  { title: "Tanggal Unggah", key: "created_at", align: "end" },
  { title: "Aksi", key: "actions", align: "center", sortable: false },
];

// --- Logika Inti (API Calls) ---
async function fetchFiles() {
  loading.value = true;
  try {
    const response = await api.get("/downloads");
    files.value = response.data;
  } catch (error) {
    console.error("Gagal mengambil file:", error);
    showSnackbar("Gagal memuat daftar file.", "error");
  } finally {
    loading.value = false;
  }
}

async function handleUpload() {
  if (!valid.value) return;

  uploading.value = true;
  const formData = new FormData();
  formData.append("title", title.value);
  formData.append("file", fileToUpload.value); // [FIX] Kirim objek filenya langsung, bukan fileToUpload.value[0]

  try {
    await api.post("/downloads", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    await fetchFiles();
    showSnackbar("File berhasil diunggah!");
    form.value.reset();
  } catch (error) {
    const message = error.response?.data?.message || "Terjadi kesalahan server.";
    showSnackbar(`Gagal mengunggah: ${message}`, "error");
    console.error("Gagal mengunggah file:", error);
  } finally {
    uploading.value = false;
  }
}

function confirmDelete(item) {
  itemToDelete.value = item;
  dialogDelete.value = true;
}

async function deleteFile() {
  if (!itemToDelete.value) return;
  try {
    await api.delete(`/downloads/${itemToDelete.value.id}`);
    await fetchFiles();
    showSnackbar("File berhasil dihapus.");
  } catch (error) {
    showSnackbar("Gagal menghapus file.", "error");
    console.error("Gagal menghapus file:", error);
  } finally {
    dialogDelete.value = false;
    itemToDelete.value = null;
  }
}

function downloadFile(file) {
  const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
  const fullUrl = file.url.startsWith("http")
    ? file.url
    : `${baseUrl.replace("/api", "")}${file.url}`;
  window.open(fullUrl, "_blank");
}

onMounted(fetchFiles);
</script>

<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12" md="4">
        <v-card rounded="lg" border>
          <v-card-title class="d-flex align-center">
            <v-icon start icon="mdi-upload-outline"></v-icon>
            Unggah File Baru
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <v-form ref="form" v-model="valid" @submit.prevent="handleUpload">
              <v-text-field
                v-model="title"
                label="Judul File"
                variant="outlined"
                density="compact"
                :rules="[rules.required]"
              ></v-text-field>

              <v-file-input
                v-model="fileToUpload"
                label="Pilih File"
                variant="outlined"
                density="compact"
                class="mt-4"
                show-size
                hint="Maks 2MB (PDF, JPG, PNG, DOC, DOCX)"
                persistent-hint
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                :rules="[rules.fileRequired, rules.maxSize, rules.fileType]"
              ></v-file-input>

              <v-btn
                type="submit"
                color="primary"
                block
                class="mt-4"
                :loading="uploading"
                :disabled="!valid"
              >
                Unggah
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="8">
        <v-card rounded="lg" border>
          <v-card-title class="d-flex align-center">
            <v-icon start icon="mdi-file-document-multiple-outline"></v-icon>
            Daftar File Tersedia
          </v-card-title>
          <v-divider></v-divider>
          <v-data-table :headers="headers" :items="files" :loading="loading" item-value="id">
            <template v-slot:item.size="{ item }">{{ formatBytes(item.size) }}</template>
            <template v-slot:item.created_at="{ item }">{{ formatDate(item.created_at) }}</template>
            <template v-slot:item.actions="{ item }">
              <v-btn
                icon="mdi-download"
                variant="text"
                color="primary"
                @click="downloadFile(item)"
              ></v-btn>
              <v-btn
                icon="mdi-delete-outline"
                variant="text"
                color="error"
                @click="confirmDelete(item)"
              ></v-btn>
            </template>
            <template v-slot:no-data>
              <div class="text-center text-grey py-8">
                <v-icon size="48" class="mb-2">mdi-file-remove-outline</v-icon>
                <p>Belum ada file yang diunggah.</p>
              </div>
            </template>
            <template v-slot:loading
              ><v-skeleton-loader type="table-row@5"></v-skeleton-loader
            ></template>
          </v-data-table>
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

    <v-dialog v-model="dialogDelete" max-width="400">
      <v-card>
        <v-card-title class="headline">Konfirmasi Hapus</v-card-title>
        <v-card-text>
          Apakah Anda yakin ingin menghapus file "<strong>{{ itemToDelete?.title }}</strong
          >"?
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="dialogDelete = false">Batal</v-btn>
          <v-btn color="error" @click="deleteFile">Hapus</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
