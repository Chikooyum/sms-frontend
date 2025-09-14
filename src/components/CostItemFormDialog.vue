<script setup>
import { ref } from "vue";

defineProps({ modelValue: Boolean });
const emit = defineEmits(["update:modelValue", "save"]);

const valid = ref(false);
const form = ref({
  name: "",
  type: "Tetap",
  amount: 0,
});
const itemTypes = ["Tetap", "Dinamis"];

const rules = {
  required: (value) => !!value || "Field ini harus diisi.",
  number: (value) => value > 0 || "Jumlah harus lebih dari 0.",
};

function submit() {
  emit("save", form.value);
}

function close() {
  emit("update:modelValue", false);
  form.value = { name: "", type: "Tetap", amount: 0 };
}
</script>

<template>
  <v-dialog :model-value="modelValue" @update:model-value="close" max-width="500px">
    <v-card>
      <v-card-title><span class="text-h5">Tambah Item Biaya</span></v-card-title>
      <v-card-text>
        <v-form v-model="valid">
          <v-container>
            <v-text-field
              v-model="form.name"
              label="Nama Biaya*"
              :rules="[rules.required]"
              required
            ></v-text-field>
            <v-select
              v-model="form.type"
              :items="itemTypes"
              label="Jenis Biaya*"
              :rules="[rules.required]"
              required
            ></v-select>
            <v-text-field
              v-model.number="form.amount"
              label="Jumlah (Rp)*"
              type="number"
              :rules="[rules.required, rules.number]"
              required
            ></v-text-field>
          </v-container>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="close">Batal</v-btn>
        <v-btn color="primary" variant="flat" @click="submit" :disabled="!valid">Simpan</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
