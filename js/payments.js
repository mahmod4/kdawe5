import { collection, updateDoc, doc, getDocs, getDoc, query, orderBy, where } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js';
import { db } from './firebase-config.js';

export async function loadPayments() {
    const pageContent = document.getElementById('pageContent');
    
    try {
        const payments = await getPayments();
        
        pageContent.innerHTML = `
            <div class="card mb-6">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-2xl font-bold">الدفع الإلكتروني</h2>
                    <div class="flex space-x-2 space-x-reverse">
                        <select id="paymentStatusFilter" onchange="filterPayments()" 
                                class="px-4 py-2 border border-gray-300 rounded-lg">
                            <option value="">جميع الحالات</option>
                            <option value="success">ناجح</option>
                            <option value="failed">فشل</option>
                            <option value="pending">معلق</option>
                            <option value="refunded">مسترد</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="overflow-x-auto">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>رقم العملية</th>
                                <th>العميل</th>
                                <th>رقم الطلب</th>
                                <th>المبلغ</th>
                                <th>طريقة الدفع</th>
                                <th>الحالة</th>
                                <th>التاريخ</th>
                                <th>الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody id="paymentsTable">
                            ${payments.map(payment => `
                                <tr>
                                    <td>#${payment.id.substring(0, 8)}</td>
                                    <td>${payment.customerName || 'غير محدد'}</td>
                                    <td>${payment.orderId ? '#' + payment.orderId.substring(0, 8) : '-'}</td>
                                    <td>${payment.amount?.toFixed(2) || 0} ج.م</td>
                                    <td>${getPaymentMethodText(payment.method)}</td>
                                    <td>
                                        <span class="badge badge-${getPaymentStatusColor(payment.status)}">
                                            ${getPaymentStatusText(payment.status)}
                                        </span>
                                    </td>
                                    <td>${payment.date}</td>
                                    <td>
                                        <button onclick="viewPaymentDetails('${payment.id}')" 
                                                class="btn-primary text-sm py-1 px-3 ml-2">
                                            <i class="fas fa-eye"></i> تفاصيل
                                        </button>
                                        ${payment.status === 'success' && payment.status !== 'refunded' ? 
                                            `<button onclick="processRefund('${payment.id}')" 
                                                    class="btn-danger text-sm py-1 px-3">
                                                <i class="fas fa-undo"></i> استرداد
                                            </button>` : ''
                                        }
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Payment Details Modal -->
            <div id="paymentDetailsModal" class="modal">
                <div class="modal-content">
                    <span class="close" onclick="closePaymentDetailsModal()">&times;</span>
                    <h2 class="text-2xl font-bold mb-6">تفاصيل العملية</h2>
                    <div id="paymentDetailsContent"></div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading payments:', error);
        pageContent.innerHTML = '<div class="card"><p class="text-red-600">حدث خطأ أثناء تحميل عمليات الدفع</p></div>';
    }
}

async function getPayments(filterStatus = '') {
    let q = query(collection(db, 'payments'), orderBy('createdAt', 'desc'));
    
    if (filterStatus) {
        q = query(collection(db, 'payments'), where('status', '==', filterStatus), orderBy('createdAt', 'desc'));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            date: data.createdAt?.toDate().toLocaleDateString('ar-SA') || 'غير محدد',
            customerName: data.customerName || data.userName || 'غير محدد'
        };
    });
}

function getPaymentStatusColor(status) {
    const colors = {
        'success': 'success',
        'failed': 'danger',
        'pending': 'warning',
        'refunded': 'info'
    };
    return colors[status] || 'info';
}

function getPaymentStatusText(status) {
    const texts = {
        'success': 'ناجح',
        'failed': 'فشل',
        'pending': 'معلق',
        'refunded': 'مسترد'
    };
    return texts[status] || status;
}

function getPaymentMethodText(method) {
    const methods = {
        'credit_card': 'بطاقة ائتمانية',
        'debit_card': 'بطاقة مدفوعة مسبقاً',
        'bank_transfer': 'تحويل بنكي',
        'wallet': 'محفظة إلكترونية',
        'cash_on_delivery': 'الدفع عند الاستلام'
    };
    return methods[method] || method || 'غير محدد';
}

window.filterPayments = async function() {
    const status = document.getElementById('paymentStatusFilter').value;
    const payments = await getPayments(status);
    
    const tbody = document.getElementById('paymentsTable');
    tbody.innerHTML = payments.map(payment => `
        <tr>
            <td>#${payment.id.substring(0, 8)}</td>
            <td>${payment.customerName || 'غير محدد'}</td>
            <td>${payment.orderId ? '#' + payment.orderId.substring(0, 8) : '-'}</td>
            <td>${payment.amount?.toFixed(2) || 0} ج.م</td>
            <td>${getPaymentMethodText(payment.method)}</td>
            <td>
                <span class="badge badge-${getPaymentStatusColor(payment.status)}">
                    ${getPaymentStatusText(payment.status)}
                </span>
            </td>
            <td>${payment.date}</td>
            <td>
                <button onclick="viewPaymentDetails('${payment.id}')" 
                        class="btn-primary text-sm py-1 px-3 ml-2">
                    <i class="fas fa-eye"></i> تفاصيل
                </button>
                ${payment.status === 'success' && payment.status !== 'refunded' ? 
                    `<button onclick="processRefund('${payment.id}')" 
                            class="btn-danger text-sm py-1 px-3">
                        <i class="fas fa-undo"></i> استرداد
                    </button>` : ''
                }
            </td>
        </tr>
    `).join('');
}

window.viewPaymentDetails = async function(paymentId) {
    try {
        const paymentDoc = await getDoc(doc(db, 'payments', paymentId));
        if (paymentDoc.exists()) {
            const payment = { id: paymentDoc.id, ...paymentDoc.data() };
            
            document.getElementById('paymentDetailsContent').innerHTML = `
                <div class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <p class="text-gray-600">رقم العملية:</p>
                            <p class="font-bold">#${payment.id.substring(0, 8)}</p>
                        </div>
                        <div>
                            <p class="text-gray-600">التاريخ:</p>
                            <p class="font-bold">${payment.createdAt?.toDate().toLocaleString('ar-SA') || 'غير محدد'}</p>
                        </div>
                        <div>
                            <p class="text-gray-600">العميل:</p>
                            <p class="font-bold">${payment.customerName || payment.userName || 'غير محدد'}</p>
                        </div>
                        <div>
                            <p class="text-gray-600">المبلغ:</p>
                            <p class="font-bold text-green-600 text-lg">${payment.amount?.toFixed(2) || 0} ج.م</p>
                        </div>
                        <div>
                            <p class="text-gray-600">طريقة الدفع:</p>
                            <p class="font-bold">${getPaymentMethodText(payment.method)}</p>
                        </div>
                        <div>
                            <p class="text-gray-600">الحالة:</p>
                            <span class="badge badge-${getPaymentStatusColor(payment.status)}">
                                ${getPaymentStatusText(payment.status)}
                            </span>
                        </div>
                        ${payment.orderId ? `
                            <div>
                                <p class="text-gray-600">رقم الطلب:</p>
                                <p class="font-bold">#${payment.orderId.substring(0, 8)}</p>
                            </div>
                        ` : ''}
                        ${payment.transactionId ? `
                            <div>
                                <p class="text-gray-600">رقم المعاملة:</p>
                                <p class="font-bold">${payment.transactionId}</p>
                            </div>
                        ` : ''}
                    </div>
                    ${payment.refundedAt ? `
                        <div class="border-t pt-4">
                            <p class="text-gray-600">تاريخ الاسترداد:</p>
                            <p class="font-bold">${payment.refundedAt.toDate().toLocaleString('ar-SA')}</p>
                        </div>
                    ` : ''}
                </div>
            `;
            
            document.getElementById('paymentDetailsModal').style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading payment details:', error);
        alert('حدث خطأ أثناء تحميل تفاصيل العملية');
    }
}

window.closePaymentDetailsModal = function() {
    document.getElementById('paymentDetailsModal').style.display = 'none';
}

window.processRefund = async function(paymentId) {
    if (!confirm('هل أنت متأكد من استرداد هذا المبلغ؟')) return;
    
    try {
        const paymentDoc = await getDoc(doc(db, 'payments', paymentId));
        if (!paymentDoc.exists()) {
            alert('العملية غير موجودة');
            return;
        }
        
        const payment = paymentDoc.data();
        if (payment.status === 'refunded') {
            alert('تم استرداد هذا المبلغ مسبقاً');
            return;
        }
        
        // Update payment status
        await updateDoc(doc(db, 'payments', paymentId), {
            status: 'refunded',
            refundedAt: new Date(),
            updatedAt: new Date()
        });
        
        // Note: In a real application, you would call a Firebase Function or external API
        // to process the actual refund through the payment gateway
        // For now, we just update the status in Firestore
        
        alert('تم تحديث حالة الاسترداد. ملاحظة: يجب معالجة الاسترداد الفعلي عبر بوابة الدفع.');
        loadPayments();
    } catch (error) {
        console.error('Error processing refund:', error);
        alert('حدث خطأ أثناء معالجة الاسترداد');
    }
}

