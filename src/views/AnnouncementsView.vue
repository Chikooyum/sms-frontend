<script setup>
import { ref, onMounted } from "vue";
import api from "@/services/api";

// --- State untuk data dan loading ---
const announcements = ref([]);
const loading = ref(true);
const creating = ref(false);

// --- State untuk form ---
const form = ref({ title: "", content: "" });
const valid = ref(false);

// --- State BARU untuk UX yang lebih baik ---
const snackbar = ref({
  show: false,
  text: "",
  color: "success",
});
const dialogDelete = ref(false);
const itemToDelete = ref(null);

// --- Fungsi untuk memformat tanggal (BARU) ---
function formatDate(dateString) {
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  return new Date(dateString).toLocaleDateString("id-ID", options);
}

// --- Fungsi untuk menampilkan notifikasi (BARU) ---
function showSnackbar(text, color = "success") {
  snackbar.value.text = text;
  snackbar.value.color = color;
  snackbar.value.show = true;
}

async function fetchAnnouncements() {
  loading.value = true;
  try {
    const response = await api.get("/announcements");
    // Mengurutkan dari yang terbaru
    announcements.value = response.data.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  } catch (error) {
    console.error("Gagal mengambil pengumuman:", error);
    showSnackbar("Gagal memuat data pengumuman.", "error");
  } finally {
    loading.value = false;
  }
}

async function createAnnouncement() {
  if (!valid.value) return;

  creating.value = true;
  try {
    await api.post("/announcements", form.value);
    form.value = { title: "", content: "" };
    await fetchAnnouncements();
    showSnackbar("Pengumuman berhasil dipublikasikan!");
  } catch (error) {
    console.error("Gagal membuat pengumuman:", error.response?.data || error.message);
    const errorMessages = error.response?.data?.errors
      ? Object.values(error.response.data.errors).flat().join("\n")
      : "Terjadi kesalahan pada server.";
    showSnackbar(`Gagal: ${errorMessages}`, "error");
  } finally {
    creating.value = false;
  }
}

// --- Fungsi delete yang dimodifikasi untuk dialog ---
function confirmDelete(item) {
  itemToDelete.value = item;
  dialogDelete.value = true;
}

async function deleteAnnouncement() {
  if (!itemToDelete.value) return;

  try {
    await api.delete(`/announcements/${itemToDelete.value.id}`);
    await fetchAnnouncements();
    showSnackbar("Pengumuman berhasil dihapus.");
  } catch (error) {
    console.error("Gagal menghapus pengumuman:", error);
    showSnackbar("Gagal menghapus pengumuman.", "error");
  } finally {
    dialogDelete.value = false;
    itemToDelete.value = null;
  }
}

onMounted(fetchAnnouncements);
</script>

<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12" md="4">
        <v-card class="pa-2" elevation="2">
          <v-card-title class="d-flex align-center">
            <v-icon start icon="mdi-bullhorn-plus-outline"></v-icon>
            Buat Pengumuman
          </v-card-title>
          <v-card-text>
            <v-form v-model="valid" @submit.prevent="createAnnouncement">
              <v-text-field
                v-model="form.title"
                label="Judul"
                variant="outlined"
                density="compact"
                :rules="[(v) => !!v || 'Judul harus diisi']"
                required
              ></v-text-field>
              <v-textarea
                v-model="form.content"
                label="Isi Pengumuman"
                variant="outlined"
                rows="5"
                class="mt-4"
                :rules="[(v) => !!v || 'Isi harus diisi']"
                required
              ></v-textarea>
              <v-btn
                type="submit"
                color="primary"
                block
                class="mt-2"
                :loading="creating"
                :disabled="!valid"
                >Publikasikan</v-btn
              >
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="8">
        <v-card class="pa-2" elevation="2">
          <v-card-title class="d-flex align-center">
            <v-icon start icon="mdi-format-list-bulleted"></v-icon>
            Daftar Pengumuman
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <v-progress-linear v-if="loading" indeterminate class="mb-4"></v-progress-linear>

            <div v-if="!loading && announcements.length === 0" class="text-center text-grey py-8">
              <v-icon size="48">mdi-information-off-outline</v-icon>
              <p class="mt-4">Belum ada pengumuman yang dibuat.</p>
            </div>

            <v-expansion-panels v-else variant="accordion">
              <v-expansion-panel v-for="item in announcements" :key="item.id">
                <v-expansion-panel-title>
                  <div>
                    <strong>{{ item.title }}</strong>
                    <div class="text-caption text-grey">{{ formatDate(item.created_at) }}</div>
                  </div>
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <p style="white-space: pre-wrap" class="mb-4">{{ item.content }}</p>
                  <v-divider></v-divider>
                  <div class="d-flex justify-end pt-2">
                    <v-btn
                      icon="mdi-delete-outline"
                      variant="text"
                      color="error"
                      size="small"
                      @click="confirmDelete(item)"
                    ></v-btn>
                  </div>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
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
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar.show = false">Tutup</v-btn>
      </template>
    </v-snackbar>

    <v-dialog v-model="dialogDelete" max-width="400">
      <v-card>
        <v-card-title class="headline">Konfirmasi Hapus</v-card-title>
        <v-card-text>
          Apakah Anda yakin ingin menghapus pengumuman berjudul "<strong>{{
            itemToDelete?.title
          }}</strong
          >"? Tindakan ini tidak dapat dibatalkan.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="dialogDelete = false">Batal</v-btn>
          <v-btn color="error" @click="deleteAnnouncement">Hapus</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
