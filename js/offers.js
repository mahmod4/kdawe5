import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc, query, orderBy, where } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js';
import { db } from './firebase-config.js';

export async function loadOffers() {
    const pageContent = document.getElementById('pageContent');
    
    try {
        const offers = await getOffers();
        const products = await getProducts();
        
        pageContent.innerHTML = `
            <div class="card mb-6">
                <div class="flex justify-between items-center">
                    <h2 class="text-2xl font-bold">العروض والخصومات</h2>
                    <button onclick="openOfferModal()" class="btn-primary">
                        <i class="fas fa-plus ml-2"></i>إنشاء عرض جديد
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${offers.map(offer => `
                    <div class="card ${offer.active ? '' : 'opacity-60'}">
                        <div class="flex justify-between items-start mb-4">
                            <h3 class="text-xl font-bold">${offer.name}</h3>
                            <span class="badge badge-${offer.active ? 'success' : 'danger'}">
                                ${offer.active ? 'نشط' : 'منتهي'}
                            </span>
                        </div>
                        <p class="text-gray-600 mb-4">${offer.description || ''}</p>
                        <div class="space-y-2 mb-4">
                            <p><strong>نوع الخصم:</strong> ${offer.discountType === 'percentage' ? 'نسبة مئوية' : 'مبلغ ثابت'}</p>
                            <p><strong>قيمة الخصم:</strong> ${offer.discountValue}${offer.discountType === 'percentage' ? '%' : ' ج.م'}</p>
                            <p><strong>من:</strong> ${offer.startDate?.toDate().toLocaleDateString('ar-SA') || 'غير محدد'}</p>
                            <p><strong>إلى:</strong> ${offer.endDate?.toDate().toLocaleDateString('ar-SA') || 'غير محدد'}</p>
                            ${offer.products && offer.products.length > 0 ? 
                                `<p><strong>المنتجات:</strong> ${offer.products.length} منتج</p>` : 
                                '<p><strong>المنتجات:</strong> جميع المنتجات</p>'
                            }
                            ${offer.couponCode ? `<p><strong>كود الكوبون:</strong> <code class="bg-gray-100 px-2 py-1 rounded">${offer.couponCode}</code></p>` : ''}
                        </div>
                        <div class="flex space-x-2 space-x-reverse mt-4">
                            <button onclick="editOffer('${offer.id}')" class="btn-primary text-sm py-1 px-3 flex-1">
                                <i class="fas fa-edit"></i> تعديل
                            </button>
                            <button onclick="deleteOffer('${offer.id}')" class="btn-danger text-sm py-1 px-3 flex-1">
                                <i class="fas fa-trash"></i> حذف
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>

            <!-- Offer Modal -->
            <div id="offerModal" class="modal">
                <div class="modal-content">
                    <span class="close" onclick="closeOfferModal()">&times;</span>
                    <h2 class="text-2xl font-bold mb-6" id="offerModalTitle">إنشاء عرض جديد</h2>
                    <form id="offerForm" onsubmit="saveOffer(event)">
                        <input type="hidden" id="offerId">
                        
                        <div class="form-group">
                            <label>اسم العرض *</label>
                            <input type="text" id="offerName" required>
                        </div>

                        <div class="form-group">
                            <label>الوصف</label>
                            <textarea id="offerDescription" rows="3"></textarea>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div class="form-group">
                                <label>نوع الخصم *</label>
                                <select id="offerDiscountType" required onchange="toggleDiscountType()">
                                    <option value="percentage">نسبة مئوية (%)</option>
                                    <option value="fixed">مبلغ ثابت (ج.م)</option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label>قيمة الخصم *</label>
                                <input type="number" id="offerDiscountValue" step="0.01" required>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div class="form-group">
                                <label>تاريخ البداية *</label>
                                <input type="datetime-local" id="offerStartDate" required>
                            </div>

                            <div class="form-group">
                                <label>تاريخ النهاية *</label>
                                <input type="datetime-local" id="offerEndDate" required>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>كود الكوبون (اختياري)</label>
                            <input type="text" id="offerCouponCode" placeholder="مثال: SUMMER2024">
                        </div>

                        <div class="form-group">
                            <label>المنتجات</label>
                            <select id="offerProducts" multiple class="h-32">
                                <option value="">جميع المنتجات</option>
                            </select>
                            <small class="text-gray-500">اضغط Ctrl (أو Cmd على Mac) لاختيار عدة منتجات</small>
                        </div>

                        <div class="form-group">
                            <label>الحالة</label>
                            <select id="offerActive">
                                <option value="true">نشط</option>
                                <option value="false">غير نشط</option>
                            </select>
                        </div>

                        <div class="flex justify-end space-x-3 space-x-reverse mt-6">
                            <button type="button" onclick="closeOfferModal()" 
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
        `;

        // Load products for select
        await loadProductsForSelect(products);
    } catch (error) {
        console.error('Error loading offers:', error);
        pageContent.innerHTML = '<div class="card"><p class="text-red-600">حدث خطأ أثناء تحميل العروض</p></div>';
    }
}

async function getOffers() {
    const snapshot = await getDocs(query(collection(db, 'offers'), orderBy('createdAt', 'desc')));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function getProducts() {
    const snapshot = await getDocs(collection(db, 'products'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function loadProductsForSelect(products) {
    const select = document.getElementById('offerProducts');
    if (select && products) {
        products.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = product.name;
            select.appendChild(option);
        });
    }
}

window.openOfferModal = function() {
    document.getElementById('offerModal').style.display = 'block';
    document.getElementById('offerModalTitle').textContent = 'إنشاء عرض جديد';
    document.getElementById('offerForm').reset();
    document.getElementById('offerId').value = '';
}

window.closeOfferModal = function() {
    document.getElementById('offerModal').style.display = 'none';
}

window.toggleDiscountType = function() {
    const type = document.getElementById('offerDiscountType').value;
    const valueInput = document.getElementById('offerDiscountValue');
    if (type === 'percentage') {
        valueInput.max = 100;
        valueInput.placeholder = '0-100';
    } else {
        valueInput.max = null;
        valueInput.placeholder = 'المبلغ بالجنيه';
    }
}

window.editOffer = async function(offerId) {
    try {
        const offerDoc = await getDoc(doc(db, 'offers', offerId));
        if (offerDoc.exists()) {
            const offer = { id: offerDoc.id, ...offerDoc.data() };
            
            document.getElementById('offerId').value = offer.id;
            document.getElementById('offerName').value = offer.name || '';
            document.getElementById('offerDescription').value = offer.description || '';
            document.getElementById('offerDiscountType').value = offer.discountType || 'percentage';
            document.getElementById('offerDiscountValue').value = offer.discountValue || '';
            document.getElementById('offerCouponCode').value = offer.couponCode || '';
            document.getElementById('offerActive').value = offer.active ? 'true' : 'false';
            
            // Set dates
            if (offer.startDate) {
                const startDate = offer.startDate.toDate();
                document.getElementById('offerStartDate').value = formatDateTimeLocal(startDate);
            }
            if (offer.endDate) {
                const endDate = offer.endDate.toDate();
                document.getElementById('offerEndDate').value = formatDateTimeLocal(endDate);
            }
            
            // Set products
            if (offer.products && offer.products.length > 0) {
                const select = document.getElementById('offerProducts');
                offer.products.forEach(productId => {
                    const option = Array.from(select.options).find(opt => opt.value === productId);
                    if (option) option.selected = true;
                });
            }
            
            document.getElementById('offerModalTitle').textContent = 'تعديل العرض';
            document.getElementById('offerModal').style.display = 'block';
            
            toggleDiscountType();
        }
    } catch (error) {
        console.error('Error loading offer:', error);
        alert('حدث خطأ أثناء تحميل العرض');
    }
}

window.deleteOffer = async function(offerId) {
    if (!confirm('هل أنت متأكد من حذف هذا العرض؟')) return;
    
    try {
        await deleteDoc(doc(db, 'offers', offerId));
        alert('تم حذف العرض بنجاح');
        loadOffers();
    } catch (error) {
        console.error('Error deleting offer:', error);
        alert('حدث خطأ أثناء حذف العرض');
    }
}

window.saveOffer = async function(event) {
    event.preventDefault();
    
    const offerId = document.getElementById('offerId').value;
    const name = document.getElementById('offerName').value;
    const description = document.getElementById('offerDescription').value;
    const discountType = document.getElementById('offerDiscountType').value;
    const discountValue = parseFloat(document.getElementById('offerDiscountValue').value);
    const startDate = new Date(document.getElementById('offerStartDate').value);
    const endDate = new Date(document.getElementById('offerEndDate').value);
    const couponCode = document.getElementById('offerCouponCode').value;
    const active = document.getElementById('offerActive').value === 'true';
    
    const productsSelect = document.getElementById('offerProducts');
    const selectedProducts = Array.from(productsSelect.selectedOptions)
        .map(option => option.value)
        .filter(value => value !== '');
    
    try {
        const offerData = {
            name,
            description,
            discountType,
            discountValue,
            startDate,
            endDate,
            couponCode: couponCode || null,
            products: selectedProducts.length > 0 ? selectedProducts : null,
            active,
            updatedAt: new Date()
        };
        
        if (offerId) {
            await updateDoc(doc(db, 'offers', offerId), offerData);
            alert('تم تحديث العرض بنجاح');
        } else {
            offerData.createdAt = new Date();
            await addDoc(collection(db, 'offers'), offerData);
            alert('تم إنشاء العرض بنجاح');
        }
        
        closeOfferModal();
        loadOffers();
    } catch (error) {
        console.error('Error saving offer:', error);
        alert('حدث خطأ أثناء حفظ العرض');
    }
}

function formatDateTimeLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

