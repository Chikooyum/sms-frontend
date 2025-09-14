<script setup>
import { ref, watch } from "vue";
import api from "@/services/api";

const props = defineProps({
  modelValue: Boolean,
  billsToPay: { type: Array, default: () => [] },
  totalAmount: { type: Number, default: 0 },
});
const emit = defineEmits(["update:modelValue", "save"]);

const valid = ref(false);
const receiptNumber = ref("");

watch(
  () => props.modelValue,
  async (isOpen) => {
    if (isOpen) {
      try {
        const response = await api.get("/payments/latest-receipt-number");
        const last = response.data.latest_receipt_number;
        if (last && !isNaN(last)) {
          receiptNumber.value = String(parseInt(last, 10) + 1);
        } else {
          receiptNumber.value = "10001";
        }
      } catch (e) {
        receiptNumber.value = "10001";
      }
    }
  }
);

const submit = () => emit("save", receiptNumber.value);
const close = () => emit("update:modelValue", false);
const formatCurrency = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value || 0);
</script>
<template>
  <v-dialog :model-value="modelValue" @update:model-value="close" max-width="500px" persistent>
    <v-card>
      <v-card-title>Konfirmasi Pembayaran Gabungan</v-card-title>
      <v-card-text>
        <p>Anda akan melunasi {{ billsToPay.length }} tagihan berikut:</p>
        <v-list density="compact">
          <v-list-item v-for="bill in billsToPay" :key="bill.id">
            <v-list-item-title>{{ bill.cost_item.name }}</v-list-item-title>
            <template #append>{{ formatCurrency(bill.remaining_amount) }}</template>
          </v-list-item>
        </v-list>
        <v-divider class="my-3"></v-divider>
        <div class="text-h6">Total Bayar: {{ formatCurrency(totalAmount) }}</div>
        <v-form v-model="valid" class="mt-4">
          <v-text-field
            v-model="receiptNumber"
            label="Nomor Kwitansi*"
            :rules="[(v) => !!v || 'Nomor Kwitansi harus diisi']"
            required
          ></v-text-field>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="close">Batal</v-btn>
        <v-btn color="primary" @click="submit" :disabled="!valid">Konfirmasi & Bayar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
