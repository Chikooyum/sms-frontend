<script setup>
import { ref, watch } from "vue";
import api from "@/services/api";

const props = defineProps({
  modelValue: Boolean,
  transactionType: { type: String, default: "Setoran" },
  studentId: { type: Number, required: true }, // [BARU] Tambahkan studentId
});
const emit = defineEmits(["update:modelValue", "save", "savePayment"]); // [BARU] Tambahkan savePayment

const valid = ref(false);
const form = ref({ amount: null, description: "", receipt_number: "" }); // [BARU] Tambahkan receipt_number

// [BARU] State untuk fitur withdraw and pay
const unpaidBills = ref([]);
const selectedBill = ref(null);

const formatCurrency = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value || 0);

// [BARU] Watch untuk memuat tagihan saat dialog dibuka untuk penarikan
watch(
  () => props.modelValue,
  async (isOpen) => {
    if (isOpen) {
      // Reset form
      form.value = { amount: null, description: "", receipt_number: "" };
      selectedBill.value = null;

      unpaidBills.value = []; // [TAMBAHKAN INI]

      // Muat tagihan yang belum lunas jika mode penarikan
      if (props.transactionType === "Penarikan" && props.studentId) {
        try {
          const response = await api.get(`/students/${props.studentId}/bills`);
          unpaidBills.value = response.data.filter((b) => b.status !== "Lunas");
        } catch (e) {
          console.error("Gagal memuat tagihan:", e);
        }
      }
    }
  }
);

// [BARU] Watch untuk auto-fill amount dan receipt number saat tagihan dipilih
watch(selectedBill, (bill) => {
  if (bill && typeof bill === "object") {
    form.value.amount = bill.remaining_amount;
    // Panggil auto-fill nomor kwitansi
    fetchLatestReceipt();
  }
});

// [BARU] Fungsi untuk auto-generate nomor kwitansi
async function fetchLatestReceipt() {
  try {
    const response = await api.get("/payments/latest-receipt-number");
    const last = response.data.latest_receipt_number;
    if (last && !isNaN(last)) {
      form.value.receipt_number = String(parseInt(last, 10) + 1);
    } else {
      form.value.receipt_number = "10001";
    }
  } catch (e) {
    console.error("Gagal memuat nomor kwitansi:", e);
    form.value.receipt_number = "10001";
  }
}

// [DIUBAH] Submit function untuk handle kedua jenis transaksi
function submit() {
  if (selectedBill.value && typeof selectedBill.value === "object") {
    // Jika tagihan dipilih, emit savePayment untuk withdraw and pay
    emit("savePayment", {
      student_bill_id: selectedBill.value.id,
      receipt_number: form.value.receipt_number,
    });
  } else {
    // Jika tidak ada tagihan dipilih, emit save untuk transaksi tabungan biasa
    emit("save", form.value);
  }
}

function close() {
  emit("update:modelValue", false);
  form.value = { amount: null, description: "", receipt_number: "" };
  selectedBill.value = null; // [BARU] Reset selected bill
}

function getButtonText() {
  if (props.transactionType === "Setoran") {
    return "Setor";
  } else if (props.transactionType === "Penarikan") {
    if (
      selectedBill.value &&
      typeof selectedBill.value === "object" &&
      selectedBill.value !== null
    ) {
      return "Tarik & Bayar";
    } else {
      return "Tarik";
    }
  }
  return "Simpan";
}
</script>

<template>
  <v-dialog :model-value="modelValue" @update:model-value="close" max-width="500px">
    <v-card>
      <v-card-title>Form {{ transactionType }}</v-card-title>
      <v-card-text>
        <v-form v-model="valid">
          <!-- [BARU] Combobox untuk memilih tagihan saat penarikan -->
          <v-combobox
            v-if="transactionType === 'Penarikan'"
            v-model="selectedBill"
            :items="unpaidBills"
            label="Pilih Tagihan (Opsional)"
            clearable
            hint="Pilih tagihan untuk dibayar langsung dari tabungan"
            persistent-hint
            return-object
            item-value="id"
            :item-title="
              (bill) =>
                bill && bill.cost_item
                  ? `${bill.cost_item.name} - Sisa: ${formatCurrency(bill.remaining_amount)}`
                  : ''
            "
            variant="outlined"
            class="mb-4"
          ></v-combobox>

          <v-text-field
            v-model.number="form.amount"
            label="Jumlah (Rp)*"
            type="number"
            :rules="[(v) => v > 0 || 'Jumlah harus lebih dari 0']"
            :readonly="typeof selectedBill === 'object' && selectedBill !== null"
            required
            variant="outlined"
            @keydown.enter="if (valid) submit();"
          ></v-text-field>

          <!-- [BARU] Field nomor kwitansi jika tagihan dipilih -->
          <v-text-field
            v-if="typeof selectedBill === 'object' && selectedBill !== null"
            v-model="form.receipt_number"
            label="Nomor Kwitansi*"
            :rules="[(v) => !!v || 'Nomor kwitansi harus diisi']"
            required
            variant="outlined"
            hint="Nomor kwitansi untuk pembayaran tagihan"
            persistent-hint
          ></v-text-field>

          <!-- Field description hanya muncul jika bukan pembayaran tagihan -->
          <v-text-field
            v-else
            v-model="form.description"
            label="Keterangan (Opsional)"
            variant="outlined"
          ></v-text-field>

          <!-- [BARU] Info card jika tagihan dipilih -->
          <v-card
            v-if="typeof selectedBill === 'object' && selectedBill !== null"
            variant="tonal"
            color="info"
            class="mt-4"
          >
            <v-card-text class="text-body-2">
              <v-icon start icon="mdi-information"></v-icon>
              Transaksi ini akan mencatat penarikan tabungan sekaligus pembayaran tagihan
              <strong>{{ selectedBill.cost_item.name }}</strong> secara otomatis.
            </v-card-text>
          </v-card>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="close">Batal</v-btn>
        <v-btn color="primary" @click="submit" :disabled="!valid">
          {{ getButtonText() }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
