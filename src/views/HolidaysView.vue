<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import { useDisplay } from "vuetify";
import api from "@/services/api";

// -----------------------------
// State & Breakpoints
// -----------------------------
const holidays = ref([]);
const loading = ref(true);
const saving = ref(false);
const deleting = ref(null); // holds id of holiday being deleted
const errorMsg = ref("");

const form = reactive({
  title: "",
  holiday_date: "",
  description: "",
});

const { mdAndUp } = useDisplay();
const isDesktop = computed(() => mdAndUp.value);

// -----------------------------
// Computed: form validation
// -----------------------------
const isFormValid = computed(() => form.title.trim() !== "" && form.holiday_date.trim() !== "");

// -----------------------------
// Helpers: formatting dates
// -----------------------------
function formatDateToString(date) {
  if (!date) return "";
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function displayDate(value) {
  return new Date(value).toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// -----------------------------
// API Calls
// -----------------------------
async function fetchHolidays() {
  loading.value = true;
  errorMsg.value = "";
  try {
    const { data } = await api.get("/holidays");
    holidays.value = data;
  } catch (e) {
    console.error(e);
    errorMsg.value = "Gagal memuat daftar hari libur.";
  } finally {
    loading.value = false;
  }
}

async function addHoliday() {
  if (!isFormValid.value) return;

  saving.value = true;
  try {
    const payload = {
      title: form.title.trim(),
      holiday_date: formatDateToString(form.holiday_date),
      description: form.description.trim() || null,
    };
    await api.post("/holidays", payload);
    // reset form
    form.title = "";
    form.holiday_date = "";
    form.description = "";
    await fetchHolidays();
    alert("Hari libur berhasil ditambahkan!");
  } catch (e) {
    console.error(e);
    alert("Gagal menambah hari libur.");
  } finally {
    saving.value = false;
  }
}

async function deleteHoliday(id) {
  if (!confirm("Yakin ingin menghapus hari libur ini?")) return;

  deleting.value = id;
  try {
    await api.delete(`/holidays/${id}`);
    await fetchHolidays();
    alert("Hari libur berhasil dihapus!");
  } catch (e) {
    console.error(e);
    alert("Gagal menghapus hari libur.");
  } finally {
    deleting.value = null;
  }
}

// -----------------------------
// Lifecycle
// -----------------------------
onMounted(fetchHolidays);
</script>

<template>
  <v-row>
    <!-- Form Tambah Hari Libur -->
    <v-col cols="12" md="4">
      <v-card>
        <v-card-title>Tambah Hari Libur</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="addHoliday">
            <v-text-field
              v-model="form.title"
              label="Nama Hari Libur*"
              placeholder="Contoh: Hari Kemerdekaan"
              required
            />
            <v-text-field v-model="form.holiday_date" type="date" label="Tanggal Libur*" required />
            <v-text-field
              v-model="form.description"
              label="Keterangan Tambahan"
              placeholder="Opsional..."
            />
            <v-btn type="submit" color="primary" block :loading="saving" :disabled="!isFormValid">
              Tambah
            </v-btn>
          </v-form>
        </v-card-text>
      </v-card>
      <v-alert v-if="errorMsg" type="error" variant="tonal" class="mt-4">
        {{ errorMsg }}
      </v-alert>
    </v-col>

    <!-- Daftar Hari Libur -->
    <v-col cols="12" md="8">
      <v-card>
        <v-card-title>Daftar Hari Libur</v-card-title>
        <!-- Desktop: Data Table -->
        <div v-if="isDesktop">
          <v-data-table
            :headers="[
              { title: 'Judul', key: 'title', width: '30%' },
              { title: 'Tanggal', key: 'holiday_date', width: '30%' },
              { title: 'Keterangan', key: 'description', sortable: false },
              { title: 'Aksi', key: 'actions', sortable: false, align: 'end' },
            ]"
            :items="holidays"
            :loading="loading"
            density="compact"
            fixed-header
            height="55vh"
          >
            <template #item.holiday_date="{ item }">
              {{ displayDate(item.holiday_date) }}
            </template>
            <template #item.description="{ item }">
              <span class="text--secondary">
                {{ item.description || "-" }}
              </span>
            </template>
            <template #item.actions="{ item }">
              <v-btn
                icon="mdi-delete"
                size="small"
                variant="text"
                :loading="deleting === item.id"
                @click="deleteHoliday(item.id)"
              />
            </template>
            <template #no-data>
              <div class="text-center py-8 text-grey">Belum ada hari libur yang terdaftar.</div>
            </template>
          </v-data-table>
        </div>

        <!-- Mobile/Tablet: List + Expansion Panel -->
        <div v-else>
          <v-skeleton-loader v-if="loading" type="list-item-avatar-two-line@6" />
          <template v-else>
            <v-list v-if="holidays.length">
              <v-list-item v-for="h in holidays" :key="h.id">
                <v-list-item-content>
                  <v-list-item-title>{{ h.title }}</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ displayDate(h.holiday_date) }}
                  </v-list-item-subtitle>
                  <div v-if="h.description" class="text-caption text-grey">
                    {{ h.description }}
                  </div>
                </v-list-item-content>
                <v-list-item-action>
                  <v-btn
                    icon="mdi-delete"
                    size="small"
                    variant="text"
                    :loading="deleting === h.id"
                    @click="deleteHoliday(h.id)"
                  />
                </v-list-item-action>
              </v-list-item>
            </v-list>

            <div v-else class="text-center py-8 text-grey">
              Belum ada hari libur yang terdaftar.
            </div>
          </template>
        </div>
      </v-card>
    </v-col>
  </v-row>
</template>

<style scoped>
@media (max-width: 960px) {
  .v-card-title {
    padding: 12px 16px;
  }
}
</style>
