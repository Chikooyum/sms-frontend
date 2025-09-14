<script setup>
defineProps({
  modelValue: Boolean,
  title: String,
  headers: Array,
  items: Array,
  loading: Boolean,
});
const emit = defineEmits(["update:modelValue"]);

function close() {
  emit("update:modelValue", false);
}
</script>
<template>
  <v-dialog :model-value="modelValue" @update:model-value="close" max-width="800px">
    <v-card>
      <v-card-title>{{ title }}</v-card-title>
      <v-card-text>
        <v-data-table
          :headers="headers"
          :items="items"
          :loading="loading"
          density="compact"
        ></v-data-table>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="close">Tutup</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
