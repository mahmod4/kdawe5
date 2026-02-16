// Firebase Configuration - ملف مثال
// انسخ هذا الملف إلى firebase-config.js وأضف إعدادات Firebase الخاصة بك

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-storage.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-analytics.js';

// TODO: استبدل هذه القيم بإعدادات Firebase الخاصة بك
// احصل على الإعدادات من: Firebase Console > Project Settings > General > Your apps
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID",
    measurementId: "YOUR_MEASUREMENT_ID" // اختياري
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize Analytics (optional - only in browser environment)
let analytics = null;
if (typeof window !== 'undefined') {
    try {
        analytics = getAnalytics(app);
    } catch (error) {
        console.log('Analytics initialization skipped:', error);
    }
}
export { analytics };

