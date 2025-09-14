<script setup>
import { ref, onMounted, watch, computed } from "vue";
import { useRoute } from "vue-router";
import api from "@/services/api";

const route = useRoute();
const classId = route.params.classId;

const attendanceSheet = ref({ students: [], classGroup: {} });
const loading = ref(true);
const saving = ref(false);
const statuses = ["Hadir", "Sakit", "Izin", "Alpa"];
const selectedDate = ref(new Date().toISOString().substr(0, 10));
const isEditing = ref(false);

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

async function fetchAttendanceSheet() {
  loading.value = true;
  try {
    const resp = await api.get(`/admin/attendance-sheet/${classId}`, {
      params: { date: selectedDate.value },
    });
    isEditing.value = resp.data.is_existing_data;
    attendanceSheet.value.classGroup = resp.data.class_group;
    attendanceSheet.value.students = resp.data.students.map((s) => ({
      ...s,
      status: s.status,
      notes: s.notes,
    }));
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

watch(selectedDate, fetchAttendanceSheet, { immediate: true });

async function saveAttendance() {
  saving.value = true;
  try {
    const payload = {
      class_group_id: classId,
      attendance_date: selectedDate.value,
      attendances: attendanceSheet.value.students.map((s) => ({
        student_id: s.id,
        status: s.status,
        notes: s.notes,
      })),
    };
    await api.post("/attendance", payload);
    isEditing.value = true;
    alert("Absensi berhasil disimpan!");
  } catch (e) {
    console.error(e);
    alert("Gagal menyimpan absensi.");
  } finally {
    saving.value = false;
  }
}
</script>
<template>
  <v-card :loading="loading">
    <v-card-title class="d-flex justify-space-between align-center">
      <div>
        <span>Isi Absensi (Sysadmin) – Kelas {{ attendanceSheet.classGroup.name }}</span>
        <v-card-subtitle>{{ formattedDate }}</v-card-subtitle>
      </div>
      <div>
        <v-text-field
          v-model="selectedDate"
          type="date"
          density="compact"
          hide-details
          class="d-inline-block mr-4"
          style="max-width: 200px"
        />
        <v-btn color="primary" :loading="saving" @click="saveAttendance">{{ actionLabel }}</v-btn>
      </div>
    </v-card-title>
    <v-data-table
      :headers="[
        { title: 'Nama Siswa', key: 'name' },
        { title: 'Status', key: 'status', sortable: false },
        { title: 'Catatan', key: 'notes', sortable: false },
      ]"
      :items="attendanceSheet.students"
      density="compact"
    >
      <template #item.status="{ item }">
        <v-btn-toggle
          v-model="item.raw.status"
          color="primary"
          variant="outlined"
          mandatory
          group
          divided
        >
          <v-btn v-for="st in statuses" :key="st" :value="st" size="x-small">{{ st }}</v-btn>
        </v-btn-toggle>
      </template>
      <template #item.notes="{ item }">
        <v-text-field
          v-model="item.raw.notes"
          density="compact"
          hide-details
          placeholder="Catatan..."
        />
      </template>
    </v-data-table>
  </v-card>
</template>
