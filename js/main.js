import { onAuthStateChange, logout } from './auth.js';
import { loadDashboard } from './dashboard.js';
import { loadProducts } from './products.js';
import { loadCategories } from './categories.js';
import { loadOrders } from './orders.js';
import { loadUsers } from './users.js';
import { loadOffers } from './offers.js';
import { loadLoyalty } from './loyalty.js';
import { loadPayments } from './payments.js';
import { loadReports } from './reports.js';
import { loadNotifications } from './notifications.js';
import { loadContent } from './content.js';
import { loadSettings } from './settings.js';

// ================================
// ملف التحكم الرئيسي للوحة الإدارة
// المسؤول عن:
// - التحقق من حالة تسجيل الدخول وصلاحية الأدمن
// - إظهار صفحة الدخول/اللوحة
// - التنقل بين الصفحات داخل اللوحة (SPA)
// ================================

// عناصر الواجهة الرئيسية (Login/Dashboard)
const loginPage = document.getElementById('loginPage');
const dashboardPage = document.getElementById('dashboardPage');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const pageTitle = document.getElementById('pageTitle');
const pageContent = document.getElementById('pageContent');
const userName = document.getElementById('userName');

// الصفحة الحالية داخل اللوحة (تُستخدم أيضًا مع زر Reset)
let currentPage = 'dashboard';

// عناوين الصفحات المعروضة في الـ Header
const pageTitles = {
    dashboard: 'الصفحة الرئيسية',
    products: 'إدارة المنتجات',
    categories: 'إدارة الأقسام',
    orders: 'إدارة الطلبات',
    users: 'إدارة المستخدمين',
    offers: 'العروض والخصومات',
    loyalty: 'نقاط الولاء',
    payments: 'الدفع الإلكتروني',
    reports: 'التقارير',
    notifications: 'الإشعارات',
    content: 'إدارة المحتوى',
    settings: 'الإعدادات'
};

// دوال تحميل كل صفحة (ترسم الـ UI وتستدعي Firestore عند الحاجة)
const pageLoaders = {
    dashboard: loadDashboard,
    products: loadProducts,
    categories: loadCategories,
    orders: loadOrders,
    users: loadUsers,
    offers: loadOffers,
    loyalty: loadLoyalty,
    payments: loadPayments,
    reports: loadReports,
    notifications: loadNotifications,
    content: loadContent,
    settings: loadSettings
};

// ================================
// تهيئة التطبيق بعد تحميل DOM
// ================================
document.addEventListener('DOMContentLoaded', () => {
    // مراقبة حالة تسجيل الدخول:
    // - إذا المستخدم مسجل + أدمن => إظهار اللوحة
    // - غير ذلك => إظهار صفحة تسجيل الدخول
    onAuthStateChange((user, isAdmin) => {
        if (user && isAdmin) {
            showDashboard();
            userName.textContent = user.email;
        } else {
            showLogin();
        }
    });

    // نموذج تسجيل الدخول (Email/Password)
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('loginEmail');
        const passwordInput = document.getElementById('loginPassword');
        const email = emailInput.value;
        const password = passwordInput.value;
        
        // حالة تحميل للزر + إخفاء رسالة الخطأ
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin ml-2"></i>جاري تسجيل الدخول...';
        loginError.classList.add('hidden');
        
        try {
            const { login } = await import('./auth.js');
            await login(email, password);
            // Success - form will be reset by showDashboard
            loginError.classList.add('hidden');
        } catch (error) {
            // Don't reset form on error - keep email and password
            let errorMessage = 'حدث خطأ أثناء تسجيل الدخول';
            
            if (error.code === 'auth/user-not-found') {
                errorMessage = 'البريد الإلكتروني غير مسجل';
            } else if (error.code === 'auth/wrong-password') {
                errorMessage = 'كلمة المرور غير صحيحة';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'البريد الإلكتروني غير صحيح';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'تم تجاوز عدد المحاولات. حاول مرة أخرى لاحقاً';
            } else if (error.message) {
                errorMessage = error.message;
            } else if (error.code) {
                errorMessage = `خطأ: ${error.code}`;
            }
            
            loginError.textContent = errorMessage;
            loginError.classList.remove('hidden');
            
            // Restore button
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    });

    // زر تسجيل الخروج
    logoutBtn.addEventListener('click', async () => {
        await logout();
        showLogin();
    });

    // التنقل: عند الضغط على عنصر من القائمة الجانبية يتم تحميل الصفحة المطلوبة
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.getAttribute('data-page');
            navigateToPage(page);
        });
    });
});

// إظهار صفحة تسجيل الدخول
function showLogin() {
    loginPage.classList.remove('hidden');
    dashboardPage.classList.add('hidden');
    // Don't reset form automatically - only reset on successful login
}

// إظهار صفحة اللوحة (بعد التأكد أن المستخدم أدمن)
function showDashboard() {
    loginPage.classList.add('hidden');
    dashboardPage.classList.remove('hidden');
    loginForm.reset(); // Reset form only on successful login
    loginError.classList.add('hidden');
    navigateToPage('dashboard');
}

// الانتقال إلى صفحة داخل اللوحة (وتغيير حالة Active + تحميل المحتوى)
export function navigateToPage(page) {
    currentPage = page;
    
    // تحديث العنصر النشط في القائمة الجانبية
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-page') === page) {
            item.classList.add('active');
        }
    });

    // تحديث عنوان الصفحة في الـ Header
    pageTitle.textContent = pageTitles[page] || page;

    // عرض Loader ثم تحميل الصفحة المطلوبة
    try {
        if (typeof window.destroyChart === 'function') {
            window.destroyChart();
        }
    } catch (e) {
        console.warn('Failed to destroy chart before navigation:', e);
    }

    pageContent.innerHTML = '<div class="loading"><div class="spinner"></div><p>جاري التحميل...</p></div>';
    
    if (pageLoaders[page]) {
        pageLoaders[page]();
    } else {
        pageContent.innerHTML = '<div class="card"><p>الصفحة غير متوفرة</p></div>';
    }
}

// إتاحة بعض الدوال عالميًا (لاستخدامها من سكربتات غير Modules مثل زر Reset في index.html)
try {
    window.navigateToPage = navigateToPage;
    window.getDashboardCurrentPage = () => currentPage;
} catch (e) {}

