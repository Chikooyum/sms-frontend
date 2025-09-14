<script setup>
import { ref, onMounted } from "vue";
import api from "@/services/api";
import InventoryFormDialog from "@/components/InventoryFormDialog.vue";

const inventory = ref([]);
const loading = ref(true);
const addDialog = ref(false);

const headers = [
  { title: "Foto", key: "photo_url", sortable: false },
  { title: "Kode Barang", key: "item_code" },
  { title: "Nama Barang", key: "name" },
  { title: "Kategori", key: "category" },
  { title: "Lokasi", key: "location" },
  { title: "Status", key: "status" },
];

async function fetchInventory() {
  loading.value = true;
  try {
    const response = await api.get("/inventory");
    console.log("Inventory data:", response.data); // Debug log
    inventory.value = response.data;
  } catch (error) {
    console.error("Gagal mengambil data inventaris:", error);
  } finally {
    loading.value = false;
  }
}

async function handleSave(formData) {
  console.log("handleSave called with:", formData);

  if (formData instanceof FormData) {
    console.log("FormData entries in handleSave:");
    for (let [key, value] of formData.entries()) {
      console.log(`${key}:`, value);
    }
  }

  try {
    const response = await api.post("/inventory", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    console.log("Save success:", response.data);
    addDialog.value = false;
    await fetchInventory();
    alert("Data inventaris berhasil disimpan!");
  } catch (error) {
    console.error("Gagal menyimpan data inventaris:", error);
    console.error("Error response:", error.response?.data);

    if (error.response && error.response.status === 422) {
      const errors = error.response.data.errors || {};
      const errorMessages = Object.values(errors).flat().join("\n");
      alert("Gagal menyimpan:\n" + errorMessages);
    } else {
      alert("Gagal menyimpan: " + (error.response?.data?.message || "Server Error"));
    }
  }
}

onMounted(fetchInventory);
</script>

<template>
  <InventoryFormDialog v-model="addDialog" @save="handleSave" />

  <v-card>
    <v-card-title class="d-flex justify-space-between align-center">
      <span>Manajemen Inventaris</span>
      <v-btn color="primary" @click="addDialog = true">Tambah Barang</v-btn>
    </v-card-title>
    <v-card-text>
      <v-data-table :headers="headers" :items="inventory" :loading="loading" class="elevation-1">
        <template #item.photo_url="{ item }">
          <v-avatar size="60" class="my-2">
            <v-img v-if="item.photo_url" :src="item.photo_url" alt="Foto Barang" cover></v-img>
            <v-icon v-else size="30" color="grey-lighten-1">mdi-image-off</v-icon>
          </v-avatar>
          <!-- Debug info -->
          <div class="text-caption mt-1" style="font-size: 10px">
            {{ item.photo_url ? "Has photo" : "No photo" }}
          </div>
        </template>
        <template #item.status="{ item }">
          <v-chip
            :color="
              item.status === 'Baik' ? 'success' : item.status === 'Rusak' ? 'error' : 'warning'
            "
          >
            {{ item.status }}
          </v-chip>
        </template>
      </v-data-table>
    </v-card-text>
  </v-card>
</template>
