<script setup>
import { ref } from "vue";
defineProps({ modelValue: Boolean });
const emit = defineEmits(["update:modelValue", "save"]);
const valid = ref(false);
const form = ref({ password: "", password_confirmation: "" });
const submit = () => emit("save", form.value);
const close = () => {
  emit("update:modelValue", false);
  form.value = { password: "", password_confirmation: "" };
};
</script>
<template>
  <v-dialog :model-value="modelValue" @update:model-value="close" max-width="500px">
    <v-card>
      <v-card-title>Ubah Password</v-card-title>
      <v-card-text>
        <v-form v-model="valid">
          <v-text-field
            v-model="form.password"
            label="Password Baru*"
            type="password"
            required
          ></v-text-field>
          <v-text-field
            v-model="form.password_confirmation"
            label="Konfirmasi Password Baru*"
            type="password"
            required
          ></v-text-field>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn @click="close">Batal</v-btn>
        <v-btn color="primary" @click="submit">Simpan</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
