<script setup>
import { ref } from "vue";

defineProps({ modelValue: Boolean });
const emit = defineEmits(["update:modelValue", "save"]);

const valid = ref(false);
const form = ref({
  name: "",
  item_code: "",
  category: "Mebel",
  location: "",
  purchase_date: null,
  price: 0,
  status: "Baik",
});
const photo = ref(null);

const categories = ["Elektronik", "Mebel", "Mainan Edukatif", "Lainnya"];
const statuses = ["Baik", "Rusak", "Perlu Perbaikan"];

const rules = {
  required: (value) => !!value || "Field ini harus diisi.",
};

function submit() {
  console.log("=== SUBMIT DEBUG START ===");
  console.log("Form data:", form.value);
  console.log("Photo data:", photo.value);
  console.log("Photo type:", typeof photo.value);
  console.log("Is photo array:", Array.isArray(photo.value));

  // Gabungkan data form dan file foto
  const formData = new FormData();

  // Append form fields
  formData.append("name", form.value.name || "");
  formData.append("item_code", form.value.item_code || "");
  formData.append("category", form.value.category || "");
  formData.append("location", form.value.location || "");
  formData.append("status", form.value.status || "");

  if (form.value.purchase_date) {
    formData.append("purchase_date", form.value.purchase_date);
  }
  if (form.value.price && form.value.price > 0) {
    formData.append("price", form.value.price.toString());
  }

  // Handle photo file - Perbaikan logika
  let actualFile = null;

  if (photo.value) {
    if (Array.isArray(photo.value) && photo.value.length > 0) {
      // Kalau array, ambil file pertama
      actualFile = photo.value[0];
      console.log("Photo from array:", actualFile);
    } else if (photo.value instanceof File) {
      // Kalau single File object
      actualFile = photo.value;
      console.log("Photo as single file:", actualFile);
    } else if (photo.value && typeof photo.value === "object" && photo.value.constructor === File) {
      // Alternative check untuk File object
      actualFile = photo.value;
      console.log("Photo as File object (alt check):", actualFile);
    }
  }

  if (actualFile && actualFile instanceof File) {
    console.log("Appending file to FormData:", actualFile);
    console.log("File name:", actualFile.name);
    console.log("File size:", actualFile.size);
    console.log("File type:", actualFile.type);

    // Validasi file
    if (actualFile.size > 2048 * 1024) {
      // 2MB
      alert(
        `File terlalu besar. Maksimal 2MB. Ukuran: ${(actualFile.size / 1024 / 1024).toFixed(2)}MB`
      );
      return;
    }

    formData.append("photo", actualFile, actualFile.name);
  } else {
    console.log("No valid photo file to upload");
  }

  // Debug: Lihat isi FormData
  console.log("=== FORMDATA ENTRIES ===");
  for (let [key, value] of formData.entries()) {
    console.log(`${key}:`, value);
    if (value instanceof File) {
      console.log(`  File details - Name: ${value.name}, Size: ${value.size}, Type: ${value.type}`);
    }
  }
  console.log("=== SUBMIT DEBUG END ===");

  emit("save", formData);
}

function close() {
  emit("update:modelValue", false);
  // Reset form
  form.value = {
    name: "",
    item_code: "",
    category: "Mebel",
    location: "",
    purchase_date: null,
    price: 0,
    status: "Baik",
  };
  photo.value = null;
}
</script>

<template>
  <v-dialog :model-value="modelValue" @update:model-value="close" max-width="600px" persistent>
    <v-card>
      <v-card-title><span class="text-h5">Tambah Barang Inventaris</span></v-card-title>
      <v-card-text>
        <v-form v-model="valid">
          <v-container>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.name"
                  label="Nama Barang*"
                  :rules="[rules.required]"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.item_code"
                  label="Kode Unik Barang*"
                  :rules="[rules.required]"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="form.category"
                  :items="categories"
                  label="Kategori*"
                  :rules="[rules.required]"
                ></v-select>
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="form.status"
                  :items="statuses"
                  label="Status*"
                  :rules="[rules.required]"
                ></v-select>
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="form.location"
                  label="Lokasi Penyimpanan*"
                  :rules="[rules.required]"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.purchase_date"
                  label="Tanggal Beli"
                  type="date"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="form.price"
                  label="Harga Beli (Rp)"
                  type="number"
                  min="0"
                ></v-text-field>
              </v-col>
              <v-col cols="12">
                <v-file-input
                  v-model="photo"
                  label="Foto Barang (Opsional)"
                  accept="image/*"
                  hint="Maksimal 2MB, format: JPG, PNG"
                  persistent-hint
                ></v-file-input>
              </v-col>

              <!-- Debug info -->
              <v-col cols="12" v-if="photo" class="text-caption">
                <strong>Debug Info:</strong><br />
                Type: {{ typeof photo }}<br />
                Is Array: {{ Array.isArray(photo) }}<br />
                Is File: {{ photo instanceof File }}<br />
                Constructor: {{ photo.constructor.name }}<br />
                <span v-if="photo instanceof File">
                  Name: {{ photo.name }}<br />
                  Size: {{ (photo.size / 1024 / 1024).toFixed(2) }}MB
                </span>
                <span v-else-if="Array.isArray(photo) && photo.length > 0">
                  Array Length: {{ photo.length }}<br />
                  First File: {{ photo[0]?.name }}
                </span>
              </v-col>
            </v-row>
          </v-container>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="close">Batal</v-btn>
        <v-btn color="primary" variant="flat" @click="submit" :disabled="!valid"> Simpan </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
