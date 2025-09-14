// src/router/index.js (Final Corrected Version)
import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";

// --- Semua import View Anda sudah benar ---
import HomeView from "../views/HomeView.vue";
import StudentsView from "../views/StudentsView.vue";
import CostsView from "../views/CostsView.vue";
import PaymentsView from "../views/PaymentsView.vue";
import SavingsView from "../views/SavingsView.vue";
import ParentLoginView from "../views/ParentLoginView.vue";
import ParentPortalView from "../views/ParentPortalView.vue";
import AnnouncementsView from "../views/AnnouncementsView.vue";
import DownloadsView from "../views/DownloadsView.vue";
import InventoryView from "../views/InventoryView.vue";
import StaffView from "../views/StaffView.vue";
import ClassesView from "../views/ClassesView.vue";
import LoginView from "../views/LoginView.vue";
import UsersView from "../views/UsersView.vue";
import TeacherStudentsView from "../views/teacher/TeacherStudentsView.vue";
import TeacherSavingsView from "../views/teacher/TeacherSavingsView.vue";
import HandoverReportView from "../views/HandoverReportView.vue";
import MyAccountView from "../views/teacher/MyAccountView.vue";
import TeacherAttendanceView from "../views/teacher/TeacherAttendanceView.vue";
import AdminAttendanceView from "../views/AdminAttendanceView.vue";
import HolidaysView from "../views/HolidaysView.vue";
import AttendanceReportView from "../views/AttendanceReportView.vue";
import MonthlyAttendanceReportView from "../views/MonthlyAttendanceReportView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  // --- Array 'routes' Anda sudah benar, tidak perlu diubah ---
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView,
      meta: { layout: "DefaultLayout", title: "Dashboard" },
    },
    {
      path: "/staff-management",
      name: "staff-management",
      component: UsersView,
      meta: { title: "Manajemen Staf & Akun" },
    },
    {
      path: "/students",
      name: "students",
      component: StudentsView,
      meta: { layout: "DefaultLayout", title: "Manajemen Siswa" },
    },
    {
      path: "/costs",
      name: "costs",
      component: CostsView,
      meta: { layout: "DefaultLayout", title: "Pengaturan Biaya" },
    },
    {
      path: "/payments",
      name: "payments",
      component: PaymentsView,
      meta: { layout: "DefaultLayout", title: "Pembayaran" },
    },
    {
      path: "/savings",
      name: "savings",
      component: SavingsView,
      meta: { layout: "DefaultLayout", title: "Tabungan Siswa" },
    },
    {
      path: "/announcements",
      name: "announcements",
      component: AnnouncementsView,
      meta: { layout: "DefaultLayout", title: "Pengumuman" },
    },
    {
      path: "/downloads",
      name: "downloads",
      component: DownloadsView,
      meta: { layout: "DefaultLayout", title: "Pusat Unduhan" },
    },
    {
      path: "/inventory",
      name: "inventory",
      component: InventoryView,
      meta: { layout: "DefaultLayout", title: "Inventaris" },
    },
    {
      path: "/classes",
      name: "classes",
      component: ClassesView,
      meta: { layout: "DefaultLayout", title: "Manajemen Kelas" },
    },
    {
      path: "/staff",
      name: "staff",
      component: StaffView,
      meta: { layout: "DefaultLayout", title: "Manajemen Staf" },
    },
    {
      path: "/reports/handover",
      name: "handover-report",
      component: HandoverReportView,
      meta: { layout: "DefaultLayout", title: "Laporan Serah Terima" },
    },
    {
      path: "/reports/attendance",
      name: "attendance-report",
      component: AttendanceReportView,
      meta: { layout: "DefaultLayout" },
    },
    {
      path: "/reports/attendance/monthly",
      name: "monthly-attendance-report",
      component: MonthlyAttendanceReportView,
      meta: { layout: "DefaultLayout" },
    },
    // Rute Guru
    {
      path: "/teacher/my-account",
      name: "teacher-my-account",
      component: MyAccountView,
      meta: { layout: "TeacherLayout", role: "guru", title: "Akun Saya" },
    },
    {
      path: "/teacher/students",
      name: "teacher-students",
      component: TeacherStudentsView,
      meta: { layout: "TeacherLayout", role: "guru", title: "Siswa Saya" },
    },
    {
      path: "/teacher/savings",
      name: "teacher-savings",
      component: TeacherSavingsView,
      meta: { layout: "TeacherLayout", role: "guru", title: "Tabungan Siswa" },
    },
    {
      path: "/teacher/attendance",
      name: "teacher-attendance",
      component: TeacherAttendanceView,
      meta: { layout: "TeacherLayout", role: "guru" },
    },
    {
      path: "/admin/attendance/:classId",
      name: "admin-attendance",
      component: AdminAttendanceView,
      meta: { layout: "DefaultLayout" },
    },
    {
      path: "/holidays",
      name: "holidays",
      component: HolidaysView,
      meta: { layout: "DefaultLayout" },
    },
    // Rute Publik (Login, dll)
    { path: "/login", name: "login", component: LoginView, meta: { layout: "PublicLayout" } },
    {
      path: "/parent/login",
      name: "parent-login",
      component: ParentLoginView,
      meta: { layout: "PublicLayout" },
    },
    {
      path: "/parent/portal",
      name: "parent-portal",
      component: ParentPortalView,
      meta: { layout: "PublicLayout" },
      beforeEnter: (to, from, next) => {
        if (localStorage.getItem("token")) {
          next();
        } else {
          next("/parent/login");
        }
      },
    },
  ],
});

// --- PENJAGA RUTE (ROUTE GUARD) - VERSI YANG DIPERBAIKI ---
router.beforeEach((to, from, next) => {
  // Panggil useAuthStore() DI DALAM guard, bukan di luar.
  // Ini memastikan Pinia (otak) sudah siap sebelum router (peta) mencoba menggunakannya.
  const authStore = useAuthStore();

  const isParentRoute = to.path.startsWith("/parent");
  const publicPages = ["/login", "/parent/login"];
  const authRequired = !publicPages.includes(to.path) && !isParentRoute;

  if (authRequired && !authStore.isAuthenticated) {
    return next("/login");
  }

  if (to.meta.role && authStore.user?.role !== to.meta.role) {
    alert("Anda tidak memiliki hak akses ke halaman ini.");
    return next(from.path || "/");
  }

  if (to.path === "/login" && authStore.isAuthenticated) {
    if (authStore.user.role === "guru") {
      return next("/teacher/students");
    }
    return next("/");
  }

  next();
});

export default router;
