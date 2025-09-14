<script setup>
import { computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useAuthStore } from "./stores/auth";
import DefaultLayout from "@/layouts/DefaultLayout.vue";
import PublicLayout from "@/layouts/PublicLayout.vue";
import AdminLayout from "@/layouts/AdminLayout.vue";
import TeacherLayout from "@/layouts/TeacherLayout.vue"; // <-- DITAMBAHKAN

const route = useRoute();
const authStore = useAuthStore();

onMounted(() => {
  if (authStore.token) {
    authStore.getUser();
  }
});

const layoutComponent = computed(() => {
  switch (route.meta.layout) {
    case "PublicLayout":
      return PublicLayout;
    case "AdminLayout":
      return AdminLayout;
    case "TeacherLayout": // <-- DITAMBAHKAN
      return TeacherLayout; // <-- DITAMBAHKAN
    default:
      return DefaultLayout;
  }
});
</script>

<template>
  <v-app>
    <component :is="layoutComponent" />
  </v-app>
</template>
