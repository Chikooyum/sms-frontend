<script setup>
import { ref, reactive, computed, watch, onMounted } from "vue";
import { useDisplay } from "vuetify";
import api from "@/services/api";

// --- STATE MANAGEMENT ---
const loading = ref(true);
const loadingSheet = ref(false);
const saving = ref(false);
const errorMsg = ref("");
const statuses = ["Hadir", "Sakit", "Izin", "Alpa"];
const teacherClasses = ref([]);
const selectedClassId = ref(null);
const attendanceSheet = reactive({
  classGroup: {},
  students: [],
});

// State untuk tanggal dan hari libur
const today = new Date().toISOString().substr(0, 10);
const selectedDate = ref(today);
const holidays = ref([]); // Menyimpan daftar tanggal libur (string YYYY-MM-DD)
const isHoliday = ref(false);
const holidayDescription = ref("");
const dateMenu = ref(false);
const isEditing = ref(false);

// --- COMPUTED PROPERTIES ---
const { mdAndUp: isDesktop } = useDisplay();
const formattedDate = computed(() =>
  new Date(selectedDate.value).toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
);
const actionLabel = computed(() => (isEditing.value ? "Perbarui Absensi" : "Simpan Absensi"));

// --- HELPER FUNCTIONS ---
/**
 * Fungsi dari kode 1 - mengecek apakah tanggal dinonaktifkan (weekend atau hari libur)
 * DIPERBAIKI: Tidak menggunakan timezone adjustment yang bermasalah
 * @param {Date|string} date - Tanggal yang akan dicek
 */
function isDateDisabled(date) {
  const d = new Date(date);
  const day = d.getDay();

  if (day === 0 || day === 6) return true; // Nonaktifkan Minggu (0) & Sabtu (6)

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(d.getDate()).padStart(2, "0");
  const localDateString = `${year}-${month}-${dayOfMonth}`;

  return holidays.value.includes(localDateString);
}

/**
 * Mengubah objek Date atau string menjadi format YYYY-MM-DD.
 * @param {Date|string} date - Tanggal yang akan diformat.
 * @returns {string|null} Tanggal dalam format YYYY-MM-DD atau null jika tidak valid.
 */
function formatDateToString(date) {
  try {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch (e) {
    console.error("Invalid date for formatting:", date);
    return null;
  }
}

// --- CORE FUNCTIONS ---

/**
 * Mengambil data awal yang dibutuhkan: daftar kelas guru dan daftar hari libur.
 */
async function initialFetch() {
  loading.value = true;
  errorMsg.value = "";
  try {
    const [classesRes, holidaysRes] = await Promise.all([
      api.get("/teacher/classes"),
      api.get("/holidays"), // Endpoint yang mengembalikan semua hari libur
    ]);

    teacherClasses.value = classesRes.data;
    // Simpan tanggal dalam format yang konsisten dengan isDateDisabled
    console.log("=== INITIAL HOLIDAYS DEBUG ===");
    console.log("Raw holidays response:", holidaysRes.data);
    holidays.value = holidaysRes.data.map((h) => {
      // Ambil hanya bagian tanggal dari timestamp
      return h.holiday_date.split("T")[0];
    });
    console.log("Processed holidays array:", holidays.value);
    console.log("=== END DEBUG ===");

    // --- PERBAIKAN LOGIKA UTAMA DI SINI ---
    // Setelah semua data siap, kita cek tanggal hari ini
    if (isDateDisabled(new Date(selectedDate.value))) {
      isHoliday.value = true;
      holidayDescription.value = "Akhir Pekan atau Hari Libur Nasional";
    } else {
      // Jika tidak libur, baru kita coba auto-select kelas
      if (teacherClasses.value && teacherClasses.value.length === 1) {
        selectedClassId.value = teacherClasses.value[0].id;
      }
    }
  } catch (e) {
    console.error("Initial fetch error:", e);
    errorMsg.value = "Gagal memuat data awal. Coba muat ulang halaman.";
  } finally {
    loading.value = false;
  }
}

/**
 * Mengambil data absensi. Pertama, cek apakah tanggal yang dipilih adalah hari libur.
 */
async function fetchAttendanceSheet() {
  // Pindahkan pengecekan libur ke watcher tanggal agar lebih reaktif
  if (isHoliday.value || !selectedClassId.value) {
    attendanceSheet.students = [];
    return;
  }

  loadingSheet.value = true;
  errorMsg.value = "";
  const dateString = formatDateToString(selectedDate.value);

  try {
    // Langkah 1: Ambil data absensi (skip holiday check via API karena sudah dicek di atas)
    const resp = await api.get(`/teacher/attendance-sheet/${selectedClassId.value}`, {
      params: { date: dateString },
    });

    isEditing.value = resp.data.is_existing_data;
    attendanceSheet.classGroup = resp.data.class_group;
    attendanceSheet.students = resp.data.students.map((s) => ({
      id: s.id,
      name: s.name,
      status: s.status || statuses[0], // Default ke "Hadir"
      notes: s.notes || "",
    }));
  } catch (e) {
    console.error("Fetch attendance sheet error:", e);
    errorMsg.value = e.response?.data?.message || "Gagal memuat data absensi.";
    attendanceSheet.students = [];
  } finally {
    loadingSheet.value = false;
  }
}

/**
 * Menyimpan atau memperbarui data absensi ke server.
 */
async function saveAttendance() {
  saving.value = true;
  try {
    const payload = {
      class_group_id: selectedClassId.value,
      attendance_date: formatDateToString(selectedDate.value),
      attendances: attendanceSheet.students.map((s) => ({
        student_id: s.id,
        status: s.status,
        notes: s.notes,
      })),
    };

    await api.post("/attendance", payload);
    isEditing.value = true; // Tandai bahwa data sudah ada setelah disimpan
    // Sebaiknya gunakan komponen snackbar/notifikasi yang lebih baik dari alert
    alert("Absensi berhasil disimpan!");
  } catch (e) {
    console.error("Save attendance error:", e);
    alert("Gagal menyimpan absensi: " + (e.response?.data?.message || e.message));
  } finally {
    saving.value = false;
  }
}

async function refreshHolidays() {
  try {
    const holidaysRes = await api.get("/holidays");
    console.log("=== REFRESH HOLIDAYS DEBUG ===");
    console.log("Raw holidays response:", holidaysRes.data);
    holidays.value = holidaysRes.data.map((h) => {
      // Ambil hanya bagian tanggal dari timestamp
      return h.holiday_date.split("T")[0];
    });
    console.log("Processed holidays array:", holidays.value);
    console.log("=== END DEBUG ===");

    // Setelah refresh, cek ulang tanggal yang sedang dipilih
    if (isDateDisabled(new Date(selectedDate.value))) {
      isHoliday.value = true;
      holidayDescription.value = "Akhir Pekan atau Hari Libur Nasional";
      attendanceSheet.students = [];
    } else {
      isHoliday.value = false;
      if (selectedClassId.value) {
        fetchAttendanceSheet();
      }
    }
  } catch (e) {
    console.error("Failed to refresh holidays:", e);
  }
}

// --- WATCHERS & LIFECYCLE HOOKS ---
// Watcher ini sekarang hanya fokus memeriksa tanggal
watch(selectedDate, (newDate) => {
  if (isDateDisabled(new Date(newDate))) {
    isHoliday.value = true;
    holidayDescription.value = "Akhir Pekan atau Hari Libur Nasional";
    attendanceSheet.students = [];
  } else {
    isHoliday.value = false;
    fetchAttendanceSheet(); // Panggil fetch jika tidak libur
  }
});
watch(selectedClassId, fetchAttendanceSheet);

onMounted(initialFetch);
</script>

<template>
  <v-card :loading="loading">
    <v-card-title class="d-flex justify-space-between align-center flex-wrap">
      <div>
        Absensi Harian
        <v-card-subtitle>{{ formattedDate }}</v-card-subtitle>
      </div>
      <div class="d-flex align-center mt-2 mt-md-0">
        <v-select
          v-if="teacherClasses.length > 1"
          v-model="selectedClassId"
          :items="teacherClasses"
          item-title="name"
          item-value="id"
          label="Pilih Kelas"
          density="compact"
          hide-details
          style="max-width: 250px"
          class="mr-4"
          :disabled="loading"
        ></v-select>

        <v-menu v-model="dateMenu" :close-on-content-click="false" location="bottom">
          <template v-slot:activator="{ props }">
            <v-text-field
              :model-value="formattedDate"
              label="Pilih Tanggal"
              readonly
              v-bind="props"
              density="compact"
              hide-details
              style="max-width: 220px"
              class="mr-4"
              prepend-inner-icon="mdi-calendar"
            ></v-text-field>
          </template>
          <v-date-picker
            v-model="selectedDate"
            @update:modelValue="dateMenu = false"
            :allowed-dates="(date) => !isDateDisabled(date)"
            :max="today"
            title=""
            hide-header
          ></v-date-picker>
        </v-menu>

        <v-btn
          color="primary"
          :loading="saving"
          @click="saveAttendance"
          :disabled="!selectedClassId || isHoliday || attendanceSheet.students.length === 0"
        >
          {{ actionLabel }}
        </v-btn>

        <v-btn color="secondary" variant="outlined" @click="refreshHolidays" class="ml-2">
          Refresh Kalender
        </v-btn>
      </div>
    </v-card-title>

    <v-divider />

    <v-alert
      v-if="errorMsg"
      type="error"
      variant="tonal"
      class="ma-4"
      closable
      @click:close="errorMsg = ''"
    >
      {{ errorMsg }}
    </v-alert>

    <v-card-text v-if="isHoliday" class="text-center pa-10">
      <v-icon size="64" color="blue-grey-lighten-2">mdi-beach</v-icon>
      <h3 class="text-h6 mt-4">Hari Libur: {{ holidayDescription }}</h3>
      <p class="text-grey">Tidak ada absensi pada tanggal ini.</p>
    </v-card-text>

    <template v-else-if="selectedClassId">
      <div v-if="isDesktop && !errorMsg">
        <v-data-table
          :headers="[
            { title: 'Nama Siswa', key: 'name', width: '40%' },
            { title: 'Status', key: 'status', sortable: false },
            { title: 'Catatan', key: 'notes', sortable: false },
          ]"
          :items="attendanceSheet.students"
          :loading="loadingSheet"
          density="compact"
          fixed-header
          height="60vh"
        >
          <template #item.status="{ item }">
            <v-btn-toggle
              v-model="item.status"
              color="primary"
              variant="outlined"
              mandatory
              divided
            >
              <v-btn v-for="st in statuses" :key="st" :value="st" size="small">{{ st }}</v-btn>
            </v-btn-toggle>
          </template>
          <template #item.notes="{ item }">
            <v-text-field
              v-model="item.notes"
              hide-details
              density="compact"
              placeholder="Catatan..."
            />
          </template>
          <template #no-data>
            <div class="text-center py-8">
              <v-icon color="grey" size="36">mdi-account-off</v-icon>
              <div class="mt-2 text-medium-emphasis">Tidak ada siswa untuk ditampilkan.</div>
            </div>
          </template>
        </v-data-table>
      </div>

      <div v-else-if="!isDesktop && !errorMsg" class="pa-4">
        <v-skeleton-loader v-if="loadingSheet" type="list-item-avatar-two-line@6" />
        <template v-else>
          <v-alert v-if="!attendanceSheet.students.length" type="info" variant="tonal" class="mb-4">
            Tidak ada siswa untuk ditampilkan di kelas ini.
          </v-alert>
          <v-expansion-panels v-else variant="accordion">
            <v-expansion-panel v-for="s in attendanceSheet.students" :key="s.id">
              <v-expansion-panel-title>
                {{ s.name }}
                <v-spacer></v-spacer>
                <v-chip size="small" :color="s.status === 'Hadir' ? 'primary' : 'default'">
                  {{ s.status }}
                </v-chip>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <div class="mb-3">
                  <v-btn-toggle
                    v-model="s.status"
                    color="primary"
                    variant="outlined"
                    mandatory
                    divided
                    class="w-100"
                  >
                    <v-btn v-for="st in statuses" :key="st" :value="st" size="small">{{
                      st
                    }}</v-btn>
                  </v-btn-toggle>
                </div>
                <v-text-field
                  v-model="s.notes"
                  hide-details
                  density="compact"
                  placeholder="Catatan singkat..."
                />
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </template>
      </div>
    </template>

    <v-card-text v-else-if="!loading" class="text-center text-grey pa-16">
      <v-icon size="48" class="mb-2">mdi-school</v-icon>
      <p>Silakan pilih kelas untuk memulai absensi.</p>
    </v-card-text>
  </v-card>
</template>

<style scoped>
/* Style untuk responsivitas header */
@media (max-width: 768px) {
  .v-card-title {
    flex-direction: column;
    align-items: flex-start;
  }
  .v-card-title > div:last-child {
    width: 100%;
    margin-top: 16px;
    flex-wrap: wrap;
    gap: 8px;
  }
}
</style>
