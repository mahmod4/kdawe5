import { collection, addDoc, setDoc, updateDoc, doc, getDocs, getDoc, query, orderBy, where } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js';
import { db } from './firebase-config.js';

export async function loadLoyalty() {
    const pageContent = document.getElementById('pageContent');
    
    try {
        const settings = await getLoyaltySettings();
        const users = await getUsersWithPoints();
        
        pageContent.innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div class="card">
                    <h3 class="text-xl font-bold mb-4">إعدادات نقاط الولاء</h3>
                    <form id="loyaltySettingsForm" onsubmit="saveLoyaltySettings(event)">
                        <div class="form-group">
                            <label>نسبة النقاط لكل عملية شراء (%)</label>
                            <input type="number" id="pointsPercentage" step="0.01" min="0" max="100" 
                                   value="${settings.pointsPercentage || 1}" required>
                            <small class="text-gray-500">مثال: 1% يعني 1 نقطة لكل 100 ج.م</small>
                        </div>
                        <div class="form-group">
                            <label>قيمة النقطة (ج.م)</label>
                            <input type="number" id="pointValue" step="0.01" min="0" 
                                   value="${settings.pointValue || 0.1}" required>
                            <small class="text-gray-500">قيمة كل نقطة عند تحويلها لكوبون</small>
                        </div>
                        <button type="submit" class="btn-primary w-full">
                            <i class="fas fa-save ml-2"></i>حفظ الإعدادات
                        </button>
                    </form>
                </div>

                <div class="card lg:col-span-2">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold">رصيد النقاط للمستخدمين</h3>
                        <button onclick="openAddPointsModal()" class="btn-primary">
                            <i class="fas fa-plus ml-2"></i>إضافة/خصم نقاط
                        </button>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>المستخدم</th>
                                    <th>البريد الإلكتروني</th>
                                    <th>رصيد النقاط</th>
                                    <th>قيمة النقاط (ج.م)</th>
                                    <th>الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${users.map(user => `
                                    <tr>
                                        <td>${user.name || 'غير محدد'}</td>
                                        <td>${user.email || 'غير محدد'}</td>
                                        <td><strong class="text-blue-600">${user.points || 0}</strong></td>
                                        <td>${((user.points || 0) * (settings.pointValue || 0.1)).toFixed(2)} ج.م</td>
                                        <td>
                                            <button onclick="viewPointsHistory('${user.id}')" 
                                                    class="btn-primary text-sm py-1 px-3">
                                                <i class="fas fa-history"></i> السجل
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Add Points Modal -->
            <div id="addPointsModal" class="modal">
                <div class="modal-content">
                    <span class="close" onclick="closeAddPointsModal()">&times;</span>
                    <h2 class="text-2xl font-bold mb-6">إضافة/خصم نقاط</h2>
                    <form id="addPointsForm" onsubmit="savePointsTransaction(event)">
                        <div class="form-group">
                            <label>المستخدم *</label>
                            <select id="pointsUserId" required>
                                <option value="">اختر المستخدم</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label>نوع العملية *</label>
                            <select id="pointsType" required>
                                <option value="add">إضافة نقاط</option>
                                <option value="subtract">خصم نقاط</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label>عدد النقاط *</label>
                            <input type="number" id="pointsAmount" min="1" required>
                        </div>

                        <div class="form-group">
                            <label>السبب</label>
                            <textarea id="pointsReason" rows="3" placeholder="مثال: مكافأة أو تعويض"></textarea>
                        </div>

                        <div class="flex justify-end space-x-3 space-x-reverse mt-6">
                            <button type="button" onclick="closeAddPointsModal()" 
                                    class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                                إلغاء
                            </button>
                            <button type="submit" class="btn-primary">
                                <i class="fas fa-save ml-2"></i>حفظ
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Points History Modal -->
            <div id="pointsHistoryModal" class="modal">
                <div class="modal-content">
                    <span class="close" onclick="closePointsHistoryModal()">&times;</span>
                    <h2 class="text-2xl font-bold mb-6">سجل النقاط</h2>
                    <div id="pointsHistoryContent"></div>
                </div>
            </div>
        `;

        // Load users for select
        await loadUsersForPointsSelect();
    } catch (error) {
        console.error('Error loading loyalty:', error);
        pageContent.innerHTML = '<div class="card"><p class="text-red-600">حدث خطأ أثناء تحميل بيانات نقاط الولاء</p></div>';
    }
}

async function getLoyaltySettings() {
    try {
        const docRef = doc(db, 'settings', 'loyalty');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data();
        }
    } catch (error) {
        console.error('Error getting loyalty settings:', error);
    }
    return { pointsPercentage: 1, pointValue: 0.1 };
}

async function getUsersWithPoints() {
    const snapshot = await getDocs(query(collection(db, 'users'), orderBy('points', 'desc')));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function loadUsersForPointsSelect() {
    try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const select = document.getElementById('pointsUserId');
        if (select) {
            users.forEach(user => {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = `${user.name || user.email} (${user.points || 0} نقطة)`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

window.openAddPointsModal = function() {
    document.getElementById('addPointsModal').style.display = 'block';
    document.getElementById('addPointsForm').reset();
}

window.closeAddPointsModal = function() {
    document.getElementById('addPointsModal').style.display = 'none';
}

window.saveLoyaltySettings = async function(event) {
    event.preventDefault();
    
    const pointsPercentage = parseFloat(document.getElementById('pointsPercentage').value);
    const pointValue = parseFloat(document.getElementById('pointValue').value);
    
    try {
        const settingsRef = doc(db, 'settings', 'loyalty');
        await updateDoc(settingsRef, {
            pointsPercentage,
            pointValue,
            updatedAt: new Date()
        });
        alert('تم حفظ الإعدادات بنجاح');
        loadLoyalty();
    } catch (error) {
        // لو المستند غير موجود: ننشئ settings/loyalty مباشرة
        if (error.code === 'not-found') {
            const settingsRef = doc(db, 'settings', 'loyalty');
            await setDoc(settingsRef, {
                pointsPercentage,
                pointValue,
                createdAt: new Date(),
                updatedAt: new Date()
            }, { merge: true });
            alert('تم حفظ الإعدادات بنجاح');
            loadLoyalty();
        } else {
            console.error('Error saving loyalty settings:', error);
            alert('حدث خطأ أثناء حفظ الإعدادات');
        }
    }
}

window.savePointsTransaction = async function(event) {
    event.preventDefault();
    
    const userId = document.getElementById('pointsUserId').value;
    const type = document.getElementById('pointsType').value;
    const amount = parseInt(document.getElementById('pointsAmount').value);
    const reason = document.getElementById('pointsReason').value;
    
    try {
        // Get current user points
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (!userDoc.exists()) {
            alert('المستخدم غير موجود');
            return;
        }
        
        const currentPoints = userDoc.data().points || 0;
        const newPoints = type === 'add' ? currentPoints + amount : Math.max(0, currentPoints - amount);
        
        // Update user points
        await updateDoc(doc(db, 'users', userId), {
            points: newPoints,
            updatedAt: new Date()
        });
        
        // Add transaction record
        await addDoc(collection(db, 'pointsTransactions'), {
            userId,
            type,
            amount,
            reason: reason || null,
            previousPoints: currentPoints,
            newPoints,
            createdAt: new Date()
        });
        
        alert('تم تحديث النقاط بنجاح');
        closeAddPointsModal();
        loadLoyalty();
    } catch (error) {
        console.error('Error saving points transaction:', error);
        alert('حدث خطأ أثناء حفظ العملية');
    }
}

window.viewPointsHistory = async function(userId) {
    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        const user = userDoc.exists() ? { id: userDoc.id, ...userDoc.data() } : null;
        
        const transactionsSnapshot = await getDocs(query(
            collection(db, 'pointsTransactions'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
        ));
        const transactions = transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        document.getElementById('pointsHistoryContent').innerHTML = `
            <div class="mb-4">
                <p class="text-gray-600">المستخدم:</p>
                <p class="font-bold text-lg">${user?.name || user?.email || 'غير محدد'}</p>
                <p class="text-gray-600 mt-2">الرصيد الحالي: <strong class="text-blue-600">${user?.points || 0} نقطة</strong></p>
            </div>
            <div class="border-t pt-4">
                <h3 class="font-bold mb-3">سجل المعاملات:</h3>
                <div class="space-y-2 max-h-96 overflow-y-auto">
                    ${transactions.length > 0 ? transactions.map(trans => `
                        <div class="flex justify-between p-3 bg-gray-50 rounded">
                            <div>
                                <p class="font-semibold">
                                    ${trans.type === 'add' ? '<span class="text-green-600">+</span>' : '<span class="text-red-600">-</span>'} 
                                    ${trans.amount} نقطة
                                </p>
                                <p class="text-sm text-gray-500">${trans.reason || 'لا يوجد سبب'}</p>
                                <p class="text-xs text-gray-400">${trans.createdAt?.toDate().toLocaleString('ar-SA') || ''}</p>
                            </div>
                            <div class="text-left">
                                <p class="text-sm text-gray-600">${trans.previousPoints} → ${trans.newPoints}</p>
                            </div>
                        </div>
                    `).join('') : '<p class="text-gray-500">لا توجد معاملات</p>'}
                </div>
            </div>
        `;
        
        document.getElementById('pointsHistoryModal').style.display = 'block';
    } catch (error) {
        console.error('Error loading points history:', error);
        alert('حدث خطأ أثناء تحميل سجل النقاط');
    }
}

window.closePointsHistoryModal = function() {
    document.getElementById('pointsHistoryModal').style.display = 'none';
}

