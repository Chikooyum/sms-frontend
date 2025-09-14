<script setup>
import { ref, onMounted } from "vue";
import api from "@/services/api";

defineProps({
  modelValue: Boolean,
  costItem: {
    type: Object,
    default: () => ({}),
  },
});
const emit = defineEmits(["update:modelValue", "save"]);

const students = ref([]);
const selectedStudents = ref([]);
const loading = ref(true);

async function fetchAllStudents() {
  loading.value = true;
  try {
    // Kita ambil semua siswa, API pagination Laravel akan menanganinya
    const response = await api.get("/students?per_page=1000"); // Ambil hingga 1000 siswa
    students.value = response.data.data.filter((s) => s.status === "Aktif");
  } catch (error) {
    console.error("Gagal mengambil data siswa:", error);
  } finally {
    loading.value = false;
  }
}

function toggleSelectAll(value) {
  if (value) {
    selectedStudents.value = students.value.map((s) => s.id);
  } else {
    selectedStudents.value = [];
  }
}

function submit() {
  emit("save", selectedStudents.value);
}

function close() {
  emit("update:modelValue", false);
  selectedStudents.value = []; // Reset pilihan saat ditutup
}

onMounted(fetchAllStudents);
</script>

<template>
  <v-dialog :model-value="modelValue" @update:model-value="close" max-width="500px">
    <v-card :loading="loading">
      <v-card-title>Tetapkan Tagihan</v-card-title>
      <v-card-subtitle>Menetapkan '{{ costItem.name }}' kepada siswa:</v-card-subtitle>
      <v-card-text>
        <v-checkbox
          label="Pilih Semua Siswa Aktif"
          @update:model-value="toggleSelectAll"
        ></v-checkbox>
        <v-divider></v-divider>
        <div style="max-height: 300px; overflow-y: auto" class="mt-4">
          <v-checkbox
            v-for="student in students"
            :key="student.id"
            v-model="selectedStudents"
            :label="`${student.name} (${student.enrollment_year})`"
            :value="student.id"
            hide-details
          ></v-checkbox>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="close">Batal</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          @click="submit"
          :disabled="selectedStudents.length === 0"
        >
          Tetapkan Tagihan
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
