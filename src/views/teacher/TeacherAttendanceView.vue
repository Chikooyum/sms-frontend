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
const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta" }).format(new Date());
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
 * Get color for attendance status
 * @param {string} status - Attendance status
 * @returns {string} Color name
 */
function getStatusColor(status) {
  const colors = {
    Hadir: "success",
    Sakit: "warning",
    Izin: "info",
    Alpa: "error",
  };
  return colors[status] || "grey";
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
    // Auto-select kelas jika hanya satu, terlepas dari status libur
    if (teacherClasses.value && teacherClasses.value.length === 1) {
      selectedClassId.value = teacherClasses.value[0].id;
    }

    // Kemudian cek tanggal hari ini
    if (isDateDisabled(new Date(selectedDate.value))) {
      isHoliday.value = true;
      holidayDescription.value = "Akhir Pekan atau Hari Libur Nasional";
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

  console.log("=== ATTENDANCE FETCH DEBUG ===");
  console.log("Selected class ID:", selectedClassId.value);
  console.log("Selected date:", dateString);
  console.log("Is holiday:", isHoliday.value);

  try {
    // Langkah 1: Ambil data absensi (skip holiday check via API karena sudah dicek di atas)
    const resp = await api.get(`/teacher/attendance-sheet/${selectedClassId.value}`, {
      params: { date: dateString },
    });

    console.log("API Response:", resp.data);
    console.log("Students count:", resp.data.students?.length || 0);
    console.log("Class group:", resp.data.class_group);

    isEditing.value = resp.data.is_existing_data;
    attendanceSheet.classGroup = resp.data.class_group;
    attendanceSheet.students = resp.data.students.map((s) => ({
      id: s.id,
      name: s.name,
      status: s.status || statuses[0], // Default ke "Hadir"
      notes: s.notes || "",
    }));

    console.log("Processed students:", attendanceSheet.students.length);
    console.log("=== END ATTENDANCE DEBUG ===");
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
  } catch (e) {
    console.error("Save attendance error:", e);
    alert("Gagal menyimpan absensi: " + (e.response?.data?.message || e.message));
    return;
  } finally {
    saving.value = false;
  }
  snackbar.value = { show: true, text: "Absensi berhasil disimpan!", color: "success" };
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
    <v-card-title
      class="d-flex flex-column flex-md-row justify-space-between align-start align-md-center gap-3"
    >
      <div class="flex-grow-1">
        <div class="text-h6 text-md-h5 mb-1">Absensi Harian</div>
        <div class="text-subtitle-1 text-md-subtitle-1 text-grey-darken-1">{{ formattedDate }}</div>
      </div>
      <div
        class="d-flex flex-column flex-sm-row align-stretch align-sm-center gap-2 w-100 w-md-auto"
      >
        <v-select
          v-if="teacherClasses.length > 1"
          v-model="selectedClassId"
          :items="teacherClasses"
          item-title="name"
          item-value="id"
          label="Pilih Kelas"
          density="compact"
          hide-details
          variant="outlined"
          class="flex-grow-1 flex-md-grow-0"
          style="min-width: 200px; max-width: 250px"
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
              variant="outlined"
              prepend-inner-icon="mdi-calendar"
              class="flex-grow-1 flex-md-grow-0"
              style="min-width: 180px; max-width: 220px"
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

        <div class="d-flex gap-2 w-100 w-md-auto">
          <v-btn
            color="primary"
            :loading="saving"
            @click="saveAttendance"
            :disabled="!selectedClassId || isHoliday || attendanceSheet.students.length === 0"
            class="flex-grow-1 flex-md-grow-0"
            size="default"
          >
            <v-icon start class="d-none d-sm-inline">mdi-content-save</v-icon>
            {{ actionLabel }}
          </v-btn>

          <v-btn
            color="secondary"
            variant="outlined"
            @click="refreshHolidays"
            size="default"
            class="flex-grow-1 flex-md-grow-0"
          >
            <v-icon start class="d-none d-sm-inline">mdi-refresh</v-icon>
            Refresh
          </v-btn>
        </div>
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
      <!-- Desktop Table View -->
      <div v-if="isDesktop && !errorMsg" class="px-4">
        <v-data-table
          :headers="[
            { title: 'Nama Siswa', key: 'name', width: '40%' },
            { title: 'Status', key: 'status', sortable: false },
            { title: 'Catatan', key: 'notes', sortable: false },
          ]"
          :items="attendanceSheet.students"
          :loading="loadingSheet"
          density="comfortable"
          hide-default-footer
          :items-per-page="-1"
          class="elevation-1"
        >
          <template #item.status="{ item }">
            <v-btn-toggle
              v-model="item.status"
              color="primary"
              variant="outlined"
              mandatory
              divided
              density="compact"
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
              variant="outlined"
            />
          </template>
          <template #no-data>
            <div class="text-center py-12">
              <v-icon color="grey" size="48">mdi-account-off</v-icon>
              <div class="mt-3 text-h6 text-grey-darken-1">Tidak ada siswa</div>
              <div class="text-grey-darken-2">Tidak ada siswa untuk ditampilkan di kelas ini.</div>
            </div>
          </template>
        </v-data-table>
      </div>

      <!-- Mobile/Tablet Card View -->
      <div v-else-if="!isDesktop && !errorMsg" class="px-2 px-sm-4">
        <v-skeleton-loader v-if="loadingSheet" type="card@6" class="mb-4" />

        <template v-else>
          <v-alert v-if="!attendanceSheet.students.length" type="info" variant="tonal" class="mb-4">
            <v-icon start>mdi-information</v-icon>
            Tidak ada siswa untuk ditampilkan di kelas ini.
          </v-alert>

          <div v-else class="attendance-cards">
            <v-card
              v-for="student in attendanceSheet.students"
              :key="student.id"
              class="mb-3"
              variant="outlined"
              rounded="lg"
            >
              <v-card-item>
                <div class="d-flex align-center justify-space-between w-100">
                  <div class="flex-grow-1">
                    <div class="text-subtitle-1 font-weight-medium mb-1">{{ student.name }}</div>
                    <v-chip
                      size="small"
                      :color="getStatusColor(student.status)"
                      variant="flat"
                      class="text-capitalize"
                    >
                      {{ student.status }}
                    </v-chip>
                  </div>
                  <v-btn icon="mdi-chevron-down" variant="text" size="small" class="ml-2"></v-btn>
                </div>
              </v-card-item>

              <v-divider></v-divider>

              <v-card-text class="pt-4">
                <div class="mb-4">
                  <label class="text-caption text-grey-darken-1 mb-2 d-block"
                    >Status Kehadiran</label
                  >
                  <v-btn-toggle
                    v-model="student.status"
                    color="primary"
                    variant="outlined"
                    mandatory
                    divided
                    density="comfortable"
                    class="w-100"
                  >
                    <v-btn v-for="st in statuses" :key="st" :value="st" class="flex-grow-1">
                      {{ st }}
                    </v-btn>
                  </v-btn-toggle>
                </div>

                <div>
                  <label class="text-caption text-grey-darken-1 mb-2 d-block">Catatan</label>
                  <v-text-field
                    v-model="student.notes"
                    hide-details
                    density="comfortable"
                    placeholder="Tambahkan catatan..."
                    variant="outlined"
                    rows="2"
                    class="mb-2"
                  />
                </div>
              </v-card-text>
            </v-card>
          </div>
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
/* Mobile-first responsive design */
.attendance-cards {
  max-height: 70vh;
  overflow-y: auto;
  padding: 4px 0;
}

/* Enhanced mobile responsiveness */
@media (max-width: 600px) {
  .v-card-title {
    padding: 16px !important;
  }

  .v-card-title .text-h6 {
    font-size: 1.25rem !important;
    line-height: 1.4;
  }

  .attendance-cards .v-card {
    margin-bottom: 12px;
    border-radius: 12px !important;
  }

  .attendance-cards .v-card-item {
    padding: 16px !important;
  }

  .attendance-cards .v-card-text {
    padding: 16px !important;
  }

  .v-btn-toggle .v-btn {
    font-size: 0.875rem;
    padding: 8px 12px;
  }
}

@media (max-width: 960px) {
  .v-card-title {
    padding: 20px !important;
  }

  .v-card-title > div:first-child {
    margin-bottom: 16px;
  }

  .attendance-cards {
    max-height: 60vh;
  }
}

/* Desktop enhancements */
@media (min-width: 961px) {
  .v-data-table {
    border-radius: 8px;
  }

  .v-data-table .v-data-table__td,
  .v-data-table .v-data-table__th {
    padding: 12px 16px;
  }
}

/* Status color improvements */
.v-chip--variant-flat {
  font-weight: 500;
}

/* Button improvements */
.v-btn-toggle {
  border-radius: 8px;
  overflow: hidden;
}

.v-btn-toggle .v-btn {
  border-radius: 0;
  transition: all 0.2s ease;
}

.v-btn-toggle .v-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
</style>
