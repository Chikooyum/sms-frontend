<script setup>
defineProps({
  modelValue: Boolean,
  title: {
    type: String,
    default: "Konfirmasi Tindakan",
  },
  message: {
    type: String,
    required: true,
  },
  confirmText: {
    type: String,
    default: "Ya, Konfirmasi",
  },
  confirmColor: {
    type: String,
    default: "primary",
  },
});
const emit = defineEmits(["update:modelValue", "confirm"]);

const close = () => emit("update:modelValue", false);

const confirmAction = () => {
  emit("confirm");
  close();
};
</script>

<template>
  <v-dialog :model-value="modelValue" @update:model-value="close" max-width="450px" persistent>
    <v-card>
      <v-card-title class="text-h5">{{ title }}</v-card-title>
      <v-card-text>{{ message }}</v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="close">Batal</v-btn>
        <v-btn :color="confirmColor" variant="flat" @click="confirmAction">{{ confirmText }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
