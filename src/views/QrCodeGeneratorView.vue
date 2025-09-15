<script setup>
import { ref, onMounted } from "vue";
import api from "@/services/api";
import QrcodeVue from "qrcode.vue";

const qrToken = ref("");
const loading = ref(true);
onMounted(async () => {
  try {
    qrToken.value = (await api.get("/admin/attendance/qr-token")).data.token;
  } finally {
    loading.value = false;
  }
});
const printQr = () => window.print();
</script>
<template>
  <v-card class="text-center pa-4 mx-auto" max-width="400">
    <v-card-title>QR Code Absensi Hari Ini</v-card-title>
    <v-card-text>
      <p class="mb-4">
        Perlihatkan QR Code ini kepada guru untuk melakukan absensi. Kode ini akan berganti setiap
        hari.
      </p>
      <div v-if="qrToken" class="d-inline-block border pa-2">
        <QrcodeVue :value="qrToken" :size="300" />
      </div>
      <v-progress-circular v-else indeterminate></v-progress-circular>
    </v-card-text>
    <v-card-actions><v-btn block color="primary" @click="printQr">Print</v-btn></v-card-actions>
  </v-card>
</template>
