import { collection, addDoc, getDocs, query, orderBy } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js';
import { db } from './firebase-config.js';

export async function loadNotifications() {
    const pageContent = document.getElementById('pageContent');
    
    try {
        const notifications = await getNotifications();
        const users = await getUsers();
        
        pageContent.innerHTML = `
            <div class="card mb-6">
                <div class="flex justify-between items-center">
                    <h2 class="text-2xl font-bold">الإشعارات</h2>
                    <button onclick="openNotificationModal()" class="btn-primary">
                        <i class="fas fa-plus ml-2"></i>إرسال إشعار جديد
                    </button>
                </div>
            </div>

            <div class="card">
                <h3 class="text-xl font-bold mb-4">الإشعارات المرسلة</h3>
                <div class="space-y-3">
                    ${notifications.map(notif => `
                        <div class="p-4 bg-gray-50 rounded-lg border-r-4 border-blue-500">
                            <div class="flex justify-between items-start">
                                <div class="flex-1">
                                    <h4 class="font-bold text-lg mb-2">${notif.title}</h4>
                                    <p class="text-gray-600 mb-2">${notif.message}</p>
                                    <div class="flex items-center space-x-4 space-x-reverse text-sm text-gray-500">
                                        <span><i class="fas fa-calendar ml-1"></i>${notif.createdAt?.toDate().toLocaleString('ar-SA') || 'غير محدد'}</span>
                                        <span><i class="fas fa-users ml-1"></i>${notif.type === 'all' ? 'جميع المستخدمين' : 'مستخدم محدد'}</span>
                                    </div>
                                </div>
                                <span class="badge badge-${notif.type === 'all' ? 'info' : 'success'}">
                                    ${notif.type === 'all' ? 'جماعي' : 'فردي'}
                                </span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Notification Modal -->
            <div id="notificationModal" class="modal">
                <div class="modal-content">
                    <span class="close" onclick="closeNotificationModal()">&times;</span>
                    <h2 class="text-2xl font-bold mb-6">إرسال إشعار جديد</h2>
                    <form id="notificationForm" onsubmit="sendNotification(event)">
                        <div class="form-group">
                            <label>نوع الإشعار *</label>
                            <select id="notificationType" required onchange="toggleNotificationType()">
                                <option value="all">إشعار جماعي (لجميع المستخدمين)</option>
                                <option value="single">إشعار لعميل محدد</option>
                            </select>
                        </div>

                        <div class="form-group" id="userSelectGroup" style="display: none;">
                            <label>اختر المستخدم</label>
                            <select id="notificationUserId">
                                <option value="">اختر المستخدم</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label>عنوان الإشعار *</label>
                            <input type="text" id="notificationTitle" required>
                        </div>

                        <div class="form-group">
                            <label>نص الإشعار *</label>
                            <textarea id="notificationMessage" rows="5" required></textarea>
                        </div>

                        <div class="form-group">
                            <label>نوع الإشعار</label>
                            <select id="notificationCategory">
                                <option value="info">معلوماتي</option>
                                <option value="offer">عرض جديد</option>
                                <option value="order">حالة الطلب</option>
                                <option value="general">عام</option>
                            </select>
                        </div>

                        <div class="flex justify-end space-x-3 space-x-reverse mt-6">
                            <button type="button" onclick="closeNotificationModal()" 
                                    class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                                إلغاء
                            </button>
                            <button type="submit" class="btn-primary">
                                <i class="fas fa-paper-plane ml-2"></i>إرسال
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        // Load users for select
        await loadUsersForNotificationSelect(users);
    } catch (error) {
        console.error('Error loading notifications:', error);
        pageContent.innerHTML = '<div class="card"><p class="text-red-600">حدث خطأ أثناء تحميل الإشعارات</p></div>';
    }
}

async function getNotifications() {
    const snapshot = await getDocs(query(collection(db, 'notifications'), orderBy('createdAt', 'desc')));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function getUsers() {
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function loadUsersForNotificationSelect(users) {
    const select = document.getElementById('notificationUserId');
    if (select && users) {
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = `${user.name || user.email} (${user.email})`;
            select.appendChild(option);
        });
    }
}

window.openNotificationModal = function() {
    document.getElementById('notificationModal').style.display = 'block';
    document.getElementById('notificationForm').reset();
    toggleNotificationType();
}

window.closeNotificationModal = function() {
    document.getElementById('notificationModal').style.display = 'none';
}

window.toggleNotificationType = function() {
    const type = document.getElementById('notificationType').value;
    const userSelectGroup = document.getElementById('userSelectGroup');
    const userIdSelect = document.getElementById('notificationUserId');
    
    if (type === 'single') {
        userSelectGroup.style.display = 'block';
        userIdSelect.required = true;
    } else {
        userSelectGroup.style.display = 'none';
        userIdSelect.required = false;
        userIdSelect.value = '';
    }
}

window.sendNotification = async function(event) {
    event.preventDefault();
    
    const type = document.getElementById('notificationType').value;
    const userId = document.getElementById('notificationUserId').value;
    const title = document.getElementById('notificationTitle').value;
    const message = document.getElementById('notificationMessage').value;
    const category = document.getElementById('notificationCategory').value;
    
    if (type === 'single' && !userId) {
        alert('يرجى اختيار المستخدم');
        return;
    }
    
    try {
        const notificationData = {
            type: type === 'all' ? 'all' : 'single',
            userId: type === 'single' ? userId : null,
            title,
            message,
            category,
            read: false,
            createdAt: new Date()
        };
        
        await addDoc(collection(db, 'notifications'), notificationData);
        
        // Note: In a real application, you would also:
        // 1. Send push notification via FCM (Firebase Cloud Messaging)
        // 2. Send email notification
        // 3. Update user's notification list
        
        alert('تم إرسال الإشعار بنجاح');
        closeNotificationModal();
        loadNotifications();
    } catch (error) {
        console.error('Error sending notification:', error);
        alert('حدث خطأ أثناء إرسال الإشعار');
    }
}

