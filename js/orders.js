import { collection, updateDoc, doc, getDocs, getDoc, query, orderBy, where } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js';
import { db } from './firebase-config.js';

// ================================
// صفحة: الطلبات
// تعرض قائمة الطلبات + فلتر الحالة + تحديث حالة الطلب + نافذة تفاصيل + طباعة فاتورة
// ================================

// نقطة الدخول لتحميل صفحة الطلبات داخل عنصر pageContent
export async function loadOrders() {
    const pageContent = document.getElementById('pageContent');
    
    try {
        // جلب الطلبات (بدون فلتر افتراضيًا)
        const orders = await getOrders();
        
        // بناء واجهة الصفحة
        pageContent.innerHTML = `
            <div class="card mb-6">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-2xl font-bold">الطلبات</h2>
                    <div class="flex space-x-2 space-x-reverse">
                        <select id="statusFilter" onchange="filterOrders()" 
                                class="px-4 py-2 border border-gray-300 rounded-lg">
                            <option value="">جميع الحالات</option>
                            <option value="new">جديد</option>
                            <option value="preparing">جاري التحضير</option>
                            <option value="shipped">تم الشحن</option>
                            <option value="completed">مكتمل</option>
                            <option value="cancelled">ملغي</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="card">
                ${orders.length === 0 ? `
                    <div class="mb-4" style="border:1px solid #fed7d7;background:#fff5f5;padding:12px;border-radius:8px;">
                        <p class="font-semibold" style="color:#742a2a;">لا توجد طلبات محفوظة.</p>
                        <p class="text-sm" style="color:#742a2a;">لو يوجد طلبات في المتجر، فالغالب أن المتجر لا يحفظ داخل Collection (orders) في نفس Firebase Project أو هناك قواعد Firestore تمنع القراءة.</p>
                    </div>
                ` : ''}
                <div class="overflow-x-auto">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>رقم الطلب</th>
                                <th>العميل</th>
                                <th>رقم الهاتف</th>
                                <th>التاريخ</th>
                                <th>المبلغ</th>
                                <th>الحالة</th>
                                <th>الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody id="ordersTable">
                            ${orders.map(order => `
                                <tr>
                                    <td>#${order.id.substring(0, 8)}</td>
                                    <td>${order.customerName || 'غير محدد'}</td>
                                    <td>${order.customerPhone || '-'}</td>
                                    <td>${order.date}</td>
                                    <td>${order.total?.toFixed(2) || 0} ج.م</td>
                                    <td>
                                        <select onchange="updateOrderStatus('${order.id}', this.value)" 
                                                class="px-3 py-1 border rounded-lg">
                                            <option value="new" ${order.status === 'new' ? 'selected' : ''}>جديد</option>
                                            <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>جاري التحضير</option>
                                            <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>تم الشحن</option>
                                            <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>مكتمل</option>
                                            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>ملغي</option>
                                        </select>
                                    </td>
                                    <td>
                                        <button onclick="viewOrderDetails('${order.id}')" 
                                                class="btn-primary text-sm py-1 px-3 ml-2">
                                            <i class="fas fa-eye"></i> تفاصيل
                                        </button>
                                        <button onclick="printInvoice('${order.id}')" 
                                                class="btn-success text-sm py-1 px-3">
                                            <i class="fas fa-print"></i> طباعة
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Order Details Modal -->
            <div id="orderDetailsModal" class="modal">
                <div class="modal-content">
                    <span class="close" onclick="closeOrderDetailsModal()">&times;</span>
                    <h2 class="text-2xl font-bold mb-6">تفاصيل الطلب</h2>
                    <div id="orderDetailsContent"></div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading orders:', error);
        // رسالة خطأ واضحة داخل الواجهة
        const msg = (error && (error.message || error.code)) ? `${error.code ? error.code + ': ' : ''}${error.message || ''}` : 'خطأ غير معروف';
        pageContent.innerHTML = `<div class="card"><p class="text-red-600">حدث خطأ أثناء تحميل الطلبات</p><pre style="white-space:pre-wrap;direction:ltr;text-align:left;" class="mt-2 text-xs">${msg}</pre></div>`;
    }
}

// جلب الطلبات من Firestore (مع إمكانية فلترة الحالة)
async function getOrders(filterStatus = '') {
    let snapshot;
    try {
        // نحاول ترتيب الطلبات حسب createdAt (الأحدث أولاً)
        let q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
        if (filterStatus) {
            q = query(collection(db, 'orders'), where('status', '==', filterStatus), orderBy('createdAt', 'desc'));
        }
        snapshot = await getDocs(q);
    } catch (e) {
        // fallback: في حال لم يوجد index أو الحقل createdAt غير موجود في بعض الوثائق
        console.warn('Orders query with orderBy(createdAt) failed, falling back to unordered query:', e);
        snapshot = await getDocs(collection(db, 'orders'));
    }

    return snapshot.docs.map(doc => {
        const data = doc.data();
        const createdAt = data.createdAt || data.orderDate;
        let dateStr = 'غير محدد';
        try {
            if (createdAt && createdAt.toDate) dateStr = createdAt.toDate().toLocaleDateString('ar-EG');
            else if (createdAt) dateStr = new Date(createdAt).toLocaleDateString('ar-EG');
        } catch (e) {}

        const customerPhone = (data.customer && data.customer.phone) || data.customerPhone || data.phone || (data.shipping && data.shipping.phone) || null;

        return {
            id: doc.id,
            ...data,
            date: dateStr,
            customerName: data.customerName || (data.customer && ((data.customer.firstName || '') + ' ' + (data.customer.lastName || '')).trim()) || data.userName || 'غير محدد',
            customerPhone: customerPhone
        };
    });
}

// دالة عامة تُستدعى من select الخاص بالفلتر داخل HTML
window.filterOrders = async function() {
    const status = document.getElementById('statusFilter').value;
    const orders = await getOrders(status);
    
    const tbody = document.getElementById('ordersTable');
    tbody.innerHTML = orders.map(order => `
        <tr>
            <td>#${order.id.substring(0, 8)}</td>
            <td>${order.customerName || 'غير محدد'}</td>
            <td>${order.customerPhone || '-'}</td>
            <td>${order.date}</td>
            <td>${order.total?.toFixed(2) || 0} ج.م</td>
            <td>
                <select onchange="updateOrderStatus('${order.id}', this.value)" 
                        class="px-3 py-1 border rounded-lg">
                    <option value="new" ${order.status === 'new' ? 'selected' : ''}>جديد</option>
                    <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>جاري التحضير</option>
                    <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>تم الشحن</option>
                    <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>مكتمل</option>
                    <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>ملغي</option>
                </select>
            </td>
            <td>
                <button onclick="viewOrderDetails('${order.id}')" 
                        class="btn-primary text-sm py-1 px-3 ml-2">
                    <i class="fas fa-eye"></i> تفاصيل
                </button>
                <button onclick="printInvoice('${order.id}')" 
                        class="btn-success text-sm py-1 px-3">
                    <i class="fas fa-print"></i> طباعة
                </button>
            </td>
        </tr>
    `).join('');
}

// تحديث حالة الطلب في Firestore
window.updateOrderStatus = async function(orderId, newStatus) {
    try {
        await updateDoc(doc(db, 'orders', orderId), {
            status: newStatus,
            updatedAt: new Date()
        });
        // تم تحديث الحالة بنجاح
    } catch (error) {
        console.error('Error updating order status:', error);
        alert('حدث خطأ أثناء تحديث حالة الطلب');
    }
}

// عرض تفاصيل الطلب داخل نافذة Modal
window.viewOrderDetails = async function(orderId) {
    try {
        const orderDoc = await getDoc(doc(db, 'orders', orderId));
        if (orderDoc.exists()) {
            const order = { id: orderDoc.id, ...orderDoc.data() };
            
            const statusText = {
                'new': 'جديد',
                'preparing': 'جاري التحضير',
                'shipped': 'تم الشحن',
                'completed': 'مكتمل',
                'cancelled': 'ملغي'
            };
            
            document.getElementById('orderDetailsContent').innerHTML = `
                <div class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <p class="text-gray-600">رقم الطلب:</p>
                            <p class="font-bold">#${order.id.substring(0, 8)}</p>
                        </div>
                        <div>
                            <p class="text-gray-600">التاريخ:</p>
                            <p class="font-bold">${order.createdAt?.toDate().toLocaleDateString('ar-SA') || 'غير محدد'}</p>
                        </div>
                        <div>
                            <p class="text-gray-600">العميل:</p>
                            <p class="font-bold">${order.customerName || order.userName || 'غير محدد'}</p>
                        </div>
                        <div>
                            <p class="text-gray-600">رقم الهاتف:</p>
                            <p class="font-bold">${(order.customer && order.customer.phone) || order.customerPhone || order.phone || 'غير محدد'}</p>
                        </div>
                        <div>
                            <p class="text-gray-600">الحالة:</p>
                            <p class="font-bold">${statusText[order.status] || order.status}</p>
                        </div>
                    </div>
                    
                    <div class="border-t pt-4">
                        <h3 class="font-bold mb-3">المنتجات:</h3>
                        <div class="space-y-2">
                            ${(order.items || []).map(item => `
                                <div class="flex justify-between p-2 bg-gray-50 rounded">
                                    <span>${item.name} x ${item.quantity}</span>
                                    <span>${(item.price * item.quantity).toFixed(2)} ج.م</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="border-t pt-4">
                        <div class="flex justify-between text-lg font-bold">
                            <span>المجموع:</span>
                            <span>${order.total?.toFixed(2) || 0} ج.م</span>
                        </div>
                    </div>
                    
                    ${order.shippingAddress ? `
                        <div class="border-t pt-4">
                            <h3 class="font-bold mb-2">عنوان الشحن:</h3>
                            <p>${order.shippingAddress}</p>
                        </div>
                    ` : ''}
                </div>
            `;
            
            document.getElementById('orderDetailsModal').style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading order details:', error);
        alert('حدث خطأ أثناء تحميل تفاصيل الطلب');
    }
}

// إغلاق نافذة تفاصيل الطلب
window.closeOrderDetailsModal = function() {
    document.getElementById('orderDetailsModal').style.display = 'none';
}

// طباعة فاتورة مبسطة في نافذة جديدة
window.printInvoice = async function(orderId) {
    try {
        const orderDoc = await getDoc(doc(db, 'orders', orderId));
        if (orderDoc.exists()) {
            const order = { id: orderDoc.id, ...orderDoc.data() };
            const phone = (order.customer && order.customer.phone) || order.customerPhone || order.phone || '';
            
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html dir="rtl" lang="ar">
                <head>
                    <meta charset="UTF-8">
                    <title>فاتورة #${order.id.substring(0, 8)}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; direction: rtl; }
                        .header { text-align: center; margin-bottom: 30px; }
                        .info { margin-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
                        th { background-color: #f2f2f2; }
                        .total { text-align: left; font-size: 18px; font-weight: bold; margin-top: 20px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>فاتورة</h1>
                        <p>رقم الطلب: #${order.id.substring(0, 8)}</p>
                        <p>التاريخ: ${order.createdAt?.toDate().toLocaleDateString('ar-SA') || 'غير محدد'}</p>
                    </div>
                    <div class="info">
                        <p><strong>العميل:</strong> ${order.customerName || order.userName || 'غير محدد'}</p>
                        <p><strong>رقم الهاتف:</strong> ${phone || 'غير محدد'}</p>
                        ${order.shippingAddress ? `<p><strong>عنوان الشحن:</strong> ${order.shippingAddress}</p>` : ''}
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>المنتج</th>
                                <th>الكمية</th>
                                <th>السعر</th>
                                <th>المجموع</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(order.items || []).map(item => `
                                <tr>
                                    <td>${item.name}</td>
                                    <td>${item.quantity}</td>
                                    <td>${item.price.toFixed(2)} ج.م</td>
                                    <td>${(item.price * item.quantity).toFixed(2)} ج.م</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div class="total">
                        <p>المجموع الكلي: ${order.total?.toFixed(2) || 0} ج.م</p>
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.print();
        }
    } catch (error) {
        console.error('Error printing invoice:', error);
        alert('حدث خطأ أثناء طباعة الفاتورة');
    }
}
