<script setup>
import { ref, watch } from "vue";
import api from "@/services/api";

const props = defineProps({
  modelValue: Boolean,
  bill: { type: [Object, Array], default: () => ({}) },
});
const emit = defineEmits(["update:modelValue", "save"]);

const valid = ref(false);
const amountPaid = ref(0);
const receiptNumber = ref("");
const latestReceiptNumber = ref(""); // State untuk hint

watch(
  () => props.modelValue,
  async (isOpen) => {
    if (isOpen) {
      // Calculate total amount for single or multiple bills
      const bills = Array.isArray(props.bill) ? props.bill : [props.bill];
      const totalAmount = bills.reduce((sum, b) => sum + parseFloat(b.remaining_amount || 0), 0);
      amountPaid.value = totalAmount;

      receiptNumber.value = "";
      latestReceiptNumber.value = ""; // Reset hint

      try {
        const response = await api.get("/payments/latest-receipt-number");
        const lastNumberStr = response.data.latest_receipt_number;

        latestReceiptNumber.value = lastNumberStr; // Simpan nomor terakhir untuk hint

        if (lastNumberStr) {
          const match = lastNumberStr.match(/^(\D*)(\d+)$/);

          if (match) {
            const prefix = match[1];
            const numberPart = match[2];
            const nextNumber = parseInt(numberPart, 10) + 1;
            const nextNumberStr = String(nextNumber).padStart(numberPart.length, "0");

            // Isi otomatis kolom input
            receiptNumber.value = prefix + nextNumberStr;
          }
        }
      } catch (e) {
        console.error("Gagal mengambil no kwitansi terakhir:", e);
      }
    }
  }
);

const rules = {
  required: (value) => !!value || "Field ini harus diisi.",
  max: (value) => {
    const bills = Array.isArray(props.bill) ? props.bill : [props.bill];
    const totalAmount = bills.reduce((sum, b) => sum + parseFloat(b.remaining_amount || 0), 0);
    return value <= totalAmount || "Pembayaran melebihi sisa tagihan.";
  },
  min: (value) => value > 0 || "Jumlah harus lebih dari 0.",
};

function submit() {
  const bills = Array.isArray(props.bill) ? props.bill : [props.bill];

  if (bills.length === 1) {
    // Single bill payment
    const paymentData = {
      student_bill_id: bills[0].id,
      amount_paid: amountPaid.value,
      receipt_number: receiptNumber.value,
    };
    emit("save", paymentData);
  } else {
    // Multiple bills payment
    const paymentData = {
      student_bill_ids: bills.map((b) => b.id),
      amount_paid: amountPaid.value,
      receipt_number: receiptNumber.value,
    };
    emit("save", paymentData);
  }
}

function close() {
  emit("update:modelValue", false);
}

const calculateTotalAmount = () => {
  const bills = Array.isArray(props.bill) ? props.bill : [props.bill];
  return bills.reduce((sum, b) => sum + parseFloat(b.remaining_amount || 0), 0);
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value || 0);
</script>

<template>
  <v-dialog :model-value="modelValue" @update:model-value="close" max-width="500px">
    <v-card>
      <v-card-title>Proses Pembayaran</v-card-title>
      <v-card-subtitle>
        <span v-if="Array.isArray(bill)"> {{ bill.length }} Tagihan Terpilih </span>
        <span v-else>
          {{ bill.cost_item?.name }}
        </span>
      </v-card-subtitle>
      <v-card-text>
        <div v-if="Array.isArray(bill)" class="mb-4">
          <p><strong>Tagihan yang dipilih:</strong></p>
          <v-list density="compact" class="mb-2">
            <v-list-item v-for="b in bill" :key="b.id" class="pa-1">
              <v-list-item-title class="text-body-2">{{ b.cost_item?.name }}</v-list-item-title>
              <template #append>
                <span class="text-body-2">{{ formatCurrency(b.remaining_amount || 0) }}</span>
              </template>
            </v-list-item>
          </v-list>
        </div>
        <p class="mb-4">
          <span v-if="Array.isArray(bill)">Total Sisa Tagihan:</span>
          <span v-else>Sisa Tagihan:</span>
          <strong>{{ formatCurrency(calculateTotalAmount()) }}</strong>
        </p>
        <v-form v-model="valid">
          <v-text-field
            v-model.number="amountPaid"
            label="Jumlah Bayar (Rp)*"
            type="number"
            :rules="[rules.required, rules.max, rules.min]"
            required
          ></v-text-field>

          <v-text-field
            v-model="receiptNumber"
            label="Nomor Kwitansi*"
            :rules="[rules.required]"
            required
            :hint="`No. kwitansi terakhir: ${latestReceiptNumber || 'Belum ada'}`"
            persistent-hint
          ></v-text-field>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="close">Batal</v-btn>
        <v-btn color="primary" variant="flat" @click="submit" :disabled="!valid">Bayar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
