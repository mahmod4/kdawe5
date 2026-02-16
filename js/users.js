import { collection, addDoc, updateDoc, doc, getDocs, getDoc, query, orderBy, where } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js';
import { db } from './firebase-config.js';

// ================================
// صفحة: المستخدمين
// تعرض:
// - قائمة المستخدمين من Collection (users)
// - عدد الطلبات لكل مستخدم (من Collection orders)
// - نافذة تفاصيل المستخدم + سجل طلباته
// - تفعيل/حظر المستخدم
// - نظام نقاط الولاء (قراءة/إضافة)
// ================================

// نقطة الدخول لتحميل صفحة المستخدمين داخل عنصر pageContent
export async function loadUsers() {
    const pageContent = document.getElementById('pageContent');
    
    try {
        // جلب المستخدمين (وقد نشتقهم من الطلبات لو لم توجد وثائق users)
        const users = await getUsers();
        
        // بناء واجهة الصفحة
        pageContent.innerHTML = `
            <div class="card mb-6">
                <h2 class="text-2xl font-bold">المستخدمين</h2>
            </div>

            <div class="card">
                ${users.length === 0 ? `
                    <div class="mb-4" style="border:1px solid #fed7d7;background:#fff5f5;padding:12px;border-radius:8px;">
                        <p class="font-semibold" style="color:#742a2a;">لا توجد بيانات مستخدمين.</p>
                        <p class="text-sm" style="color:#742a2a;">لو المتجر شغال ويوجد طلبات/مستخدمين، فالغالب أن المتجر لا يكتب على نفس Firebase Project أو لا يكتب داخل Collections (users / orders) في Firestore.</p>
                    </div>
                ` : ''}
                <div class="overflow-x-auto">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>الاسم</th>
                                <th>البريد الإلكتروني</th>
                                <th>رقم الهاتف</th>
                                <th>عدد الطلبات</th>
                                <th>الحالة</th>
                                <th>الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody id="usersTable">
                            ${users.map(user => `
                                <tr>
                                    <td>${user.name || 'غير محدد'}</td>
                                    <td>${user.email || 'غير محدد'}</td>
                                    <td>${user.phone || '-'}</td>
                                    <td>${user.ordersCount || 0}</td>
                                    <td>
                                        <span class="badge badge-${user.active ? 'success' : 'danger'}">
                                            ${user.active ? 'نشط' : 'محظور'}
                                        </span>
                                    </td>
                                    <td>
                                        <button onclick="viewUserDetails('${user.id}')" 
                                                class="btn-primary text-sm py-1 px-3 ml-2">
                                            <i class="fas fa-eye"></i> تفاصيل
                                        </button>
                                        <button onclick="toggleUserStatus('${user.id}', ${!user.active})" 
                                                class="btn-${user.active ? 'danger' : 'success'} text-sm py-1 px-3">
                                            <i class="fas fa-${user.active ? 'ban' : 'check'}"></i> 
                                            ${user.active ? 'حظر' : 'تفعيل'}
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- User Details Modal -->
            <div id="userDetailsModal" class="modal">
                <div class="modal-content">
                    <span class="close" onclick="closeUserDetailsModal()">&times;</span>
                    <h2 class="text-2xl font-bold mb-6">تفاصيل المستخدم</h2>
                    <div id="userDetailsContent"></div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading users:', error);
        // رسالة خطأ واضحة داخل الواجهة
        const msg = (error && (error.message || error.code)) ? `${error.code ? error.code + ': ' : ''}${error.message || ''}` : 'خطأ غير معروف';
        pageContent.innerHTML = `<div class="card"><p class="text-red-600">حدث خطأ أثناء تحميل المستخدمين</p><pre style="white-space:pre-wrap;direction:ltr;text-align:left;" class="mt-2 text-xs">${msg}</pre></div>`;
    }
}

// جلب المستخدمين + حساب عدد الطلبات لكل مستخدم
async function getUsers() {
    let usersSnapshot;
    try {
        // نحاول ترتيب المستخدمين حسب createdAt
        usersSnapshot = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')));
    } catch (e) {
        // fallback: في حال عدم وجود index أو اختلاف الحقول
        console.warn('Users query with orderBy(createdAt) failed, falling back to unordered query:', e);
        usersSnapshot = await getDocs(collection(db, 'users'));
    }

    const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // جلب الطلبات لحساب عدد الطلبات لكل مستخدم
    let orders = [];
    try {
        const ordersSnapshot = await getDocs(collection(db, 'orders'));
        orders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.warn('Orders read failed while calculating orders count:', e);
    }

    // لو المتجر لا ينشئ وثائق users، نبني قائمة مستخدمين من الطلبات الموجودة
    if (users.length === 0 && orders.length > 0) {
        const byUserId = new Map();
        for (const o of orders) {
            const uid = o && o.userId ? String(o.userId) : null;
            if (!uid) continue;
            if (!byUserId.has(uid)) {
                const c = o.customer || {};
                const name = (c.firstName || c.lastName) ? `${c.firstName || ''} ${c.lastName || ''}`.trim() : (o.customerName || o.userName || null);
                byUserId.set(uid, {
                    id: uid,
                    name: name,
                    email: null,
                    phone: c.phone || null,
                    active: true,
                    createdAt: o.createdAt || o.orderDate || null
                });
            }
        }
        const derivedUsers = Array.from(byUserId.values());
        return derivedUsers.map(user => ({
            ...user,
            ordersCount: orders.filter(o => String(o.userId) === String(user.id)).length
        }));
    }
    
    // حساب عدد الطلبات بناءً على userId داخل orders
    return users.map(user => ({
        ...user,
        ordersCount: orders.filter(o => o.userId === user.id).length
    }));
}

// عرض نافذة تفاصيل المستخدم
window.viewUserDetails = async function(userId) {
    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
            const user = { id: userDoc.id, ...userDoc.data() };
            
            // حساب نقاط الولاء
            const loyaltyPoints = await getUserLoyaltyPoints(userId);
            
            // تحديد مستوى الولاء بناءً على النقاط
            const loyaltyLevel = calculateLoyaltyLevel(loyaltyPoints.points);
            
            // جلب طلبات المستخدم لعرضها في التفاصيل
            const ordersSnapshot = await getDocs(query(
                collection(db, 'orders'),
                orderBy('createdAt', 'desc')
            ));
            const userOrders = ordersSnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(order => order.userId === userId);
            
            document.getElementById('userDetailsContent').innerHTML = `
                <div class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <p class="text-gray-600">الاسم:</p>
                            <p class="font-bold">${user.name || 'غير محدد'}</p>
                        </div>
                        <div>
                            <p class="text-gray-600">البريد الإلكتروني:</p>
                            <p class="font-bold">${user.email || 'غير محدد'}</p>
                        </div>
                        <div>
                            <p class="text-gray-600">رقم الهاتف:</p>
                            <p class="font-bold">${user.phone || '-'}</p>
                        </div>
                        <div>
                            <p class="text-gray-600">تاريخ التسجيل:</p>
                            <p class="font-bold">${user.createdAt?.toDate().toLocaleDateString('ar-EG') || 'غير محدد'}</p>
                        </div>
                        <div>
                            <p class="text-gray-600">نقاط الولاء:</p>
                            <p class="font-bold">${loyaltyPoints.points || 0}</p>
                        </div>
                        <div>
                            <p class="text-gray-600">مستوى الولاء:</p>
                            <p class="font-bold">${loyaltyLevel.name}</p>
                        </div>
                        <div>
                            <p class="text-gray-600">قيمة النقاط:</p>
                            <p class="font-bold">${loyaltyPoints.value || 0} ج.م</p>
                        </div>
                        <div>
                            <p class="text-gray-600">النقاط التالية للمستوى ${loyaltyLevel.nextLevel}:</p>
                            <p class="font-bold">${loyaltyLevel.nextLevel - loyaltyPoints.points}</p>
                        </div>
                    </div>
                    
                    <div class="border-t pt-4">
                        <h3 class="font-bold mb-3">سجل الطلبات (${userOrders.length}):</h3>
                        <div class="space-y-2 max-h-64 overflow-y-auto">
                            ${userOrders.length > 0 ? userOrders.map(order => `
                                <div class="flex justify-between p-2 bg-gray-50 rounded">
                                    <div>
                                        <p class="font-semibold">طلب #${order.id.substring(0, 8)}</p>
                                        <p class="text-sm text-gray-500">${order.createdAt?.toDate().toLocaleDateString('ar-EG') || ''}</p>
                                    </div>
                                    <div class="text-left">
                                        <p class="font-bold">${order.total?.toFixed(2) || 0} ج.م</p>
                                        <span class="badge badge-${getOrderStatusColor(order.status)}">${getOrderStatusText(order.status)}</span>
                                    </div>
                                </div>
                            `).join('') : '<p class="text-gray-500">لا توجد طلبات</p>'}
                        </div>
                    </div>
                    
                    <div class="flex justify-end space-x-3 space-x-reverse mt-6">
                        <button onclick="toggleUserStatus('${user.id}', ${!user.active})" 
                                class="btn-${user.active ? 'danger' : 'success'}">
                            <i class="fas fa-${user.active ? 'ban' : 'check'} ml-2"></i>
                            ${user.active ? 'حظر المستخدم' : 'تفعيل المستخدم'}
                        </button>
                        <button onclick="openAddPointsModal('${user.id}')" class="btn-primary">
                            <i class="fas fa-plus ml-2"></i>إضافة نقاط
                        </button>
                    </div>
                </div>
            `;
            
            document.getElementById('userDetailsModal').style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading user details:', error);
        alert('حدث خطأ أثناء تحميل تفاصيل المستخدم');
    }
}

// إغلاق نافذة تفاصيل المستخدم
window.closeUserDetailsModal = function() {
    document.getElementById('userDetailsModal').style.display = 'none';
}

// قراءة نقاط الولاء من Collection (loyaltyPoints)
async function getUserLoyaltyPoints(userId) {
    try {
        const pointsSnapshot = await getDocs(query(
            collection(db, 'loyaltyPoints'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
        ));
        
        const points = pointsSnapshot.docs.map(doc => doc.data());
        const totalPoints = points.reduce((sum, point) => sum + (point.points || 0), 0);
        const totalValue = points.reduce((sum, point) => sum + ((point.points || 0) * (point.value || 0)), 0);
        
        return {
            points: totalPoints,
            value: totalValue
        };
    } catch (error) {
        console.error('Error getting user loyalty points:', error);
        return { points: 0, value: 0 };
    }
}

// فتح نافذة إضافة نقاط للمستخدم
window.openAddPointsModal = function(userId) {
    // Create modal HTML
    const modalHtml = `
        <div id="addPointsModal" class="modal">
            <div class="modal-content">
                <span class="close" onclick="closeAddPointsModal()">&times;</span>
                <h2 class="text-2xl font-bold mb-6">إضافة نقاط للمستخدم</h2>
                <form id="addPointsForm" onsubmit="addLoyaltyPoints(event, '${userId}')">
                    <div class="form-group">
                        <label>عدد النقاط</label>
                        <input type="number" id="pointsAmount" step="1" min="1" required>
                        <small class="text-gray-500">أدخل عدد النقاط التي تريد إضافتها</small>
                    </div>
                    <div class="form-group">
                        <label>السبب</label>
                        <textarea id="pointsReason" rows="3" required placeholder="سبب إضافة النقاط"></textarea>
                    </div>
                    <button type="submit" class="btn-primary w-full">
                        <i class="fas fa-plus ml-2"></i>إضافة النقاط
                    </button>
                </form>
            </div>
        </div>
    `;
    
    // Add modal to page
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
    
    // Show modal
    document.getElementById('addPointsModal').style.display = 'block';
}

// إغلاق نافذة إضافة النقاط
window.closeAddPointsModal = function() {
    const modal = document.getElementById('addPointsModal');
    if (modal) {
        modal.remove();
    }
}

// إضافة نقاط ولاء (تسجيل عملية في loyaltyPoints)
window.addLoyaltyPoints = async function(event, userId) {
    event.preventDefault();
    
    const pointsAmount = parseInt(document.getElementById('pointsAmount').value);
    const reason = document.getElementById('pointsReason').value;
    
    if (!pointsAmount || pointsAmount <= 0) {
        alert('يرجى إدخال عدد نقاط صحيح');
        return;
    }
    
    if (!reason.trim()) {
        alert('يرجى إدخال سبب إضافة النقاط');
        return;
    }
    
    try {
        // Get current user points
        const currentPoints = await getUserLoyaltyPoints(userId);
        const newTotalPoints = currentPoints.points + pointsAmount;
        
        // Add points transaction
        await addDoc(collection(db, 'loyaltyPoints'), {
            userId: userId,
            points: pointsAmount,
            reason: reason,
            type: 'add',
            createdAt: new Date(),
            totalPoints: newTotalPoints
        });
        
        alert(`تم إضافة ${pointsAmount} نقاط للمستخدم بنجاح`);
        closeAddPointsModal();
        
        // Refresh user details
        viewUserDetails(userId);
    } catch (error) {
        console.error('Error adding loyalty points:', error);
        alert('حدث خطأ أثناء إضافة النقاط');
    }
}

// تفعيل/حظر المستخدم عبر تحديث حقل active
window.toggleUserStatus = async function(userId, newStatus) {
    try {
        await updateDoc(doc(db, 'users', userId), {
            active: newStatus,
            updatedAt: new Date()
        });
        alert(newStatus ? 'تم تفعيل المستخدم بنجاح' : 'تم حظر المستخدم بنجاح');
        loadUsers();
        closeUserDetailsModal();
    } catch (error) {
        console.error('Error updating user status:', error);
        alert('حدث خطأ أثناء تحديث حالة المستخدم');
    }
}

function getOrderStatusColor(status) {
    const colors = {
        'new': 'info',
        'preparing': 'warning',
        'shipped': 'info',
        'completed': 'success',
        'cancelled': 'danger'
    };
    return colors[status] || 'info';
}

function getOrderStatusText(status) {
    const texts = {
        'new': 'جديد',
        'preparing': 'جاري التحضير',
        'shipped': 'تم الشحن',
        'completed': 'مكتمل',
        'cancelled': 'ملغي'
    };
    return texts[status] || status;
}

// تحديد مستوى الولاء حسب عدد النقاط
function calculateLoyaltyLevel(points) {
    if (points >= 1000) {
        return {
            name: 'ذهبي',
            level: 5,
            nextLevel: 1500
        };
    } else if (points >= 500) {
        return {
            name: 'فضي',
            level: 4,
            nextLevel: 1000
        };
    } else if (points >= 250) {
        return {
            name: 'أزرق',
            level: 3,
            nextLevel: 500
        };
    } else if (points >= 100) {
        return {
            name: 'برونزي',
            level: 2,
            nextLevel: 250
        };
    } else if (points >= 50) {
        return {
            name: 'أخضر',
            level: 1,
            nextLevel: 100
        };
    } else {
        return {
            name: 'مبتدئ',
            level: 0,
            nextLevel: 50
        };
    }
}

