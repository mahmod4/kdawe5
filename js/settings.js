import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js';
import { uploadImageToCloudinary, deleteImageFromCloudinary } from './cloudinary-config.js';
import { db } from './firebase-config.js';

export async function loadSettings() {
    const pageContent = document.getElementById('pageContent');
    
    try {
        const settings = await getSettings();
        
        pageContent.innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- General Settings -->
                <div class="card">
                    <h2 class="text-2xl font-bold mb-4">الإعدادات العامة</h2>
                    <form id="generalSettingsForm" onsubmit="saveGeneralSettings(event)">
                        <div class="form-group">
                            <label>اسم المتجر *</label>
                            <input type="text" id="storeName" value="${settings.storeName || ''}" required>
                        </div>

                        <div class="form-group">
                            <label>البريد الإلكتروني</label>
                            <input type="email" id="storeEmail" value="${settings.storeEmail || ''}">
                        </div>

                        <div class="form-group">
                            <label>رقم الهاتف</label>
                            <input type="tel" id="storePhone" value="${settings.storePhone || ''}">
                        </div>

                        <div class="form-group">
                            <label>العنوان</label>
                            <textarea id="storeAddress" rows="3">${settings.storeAddress || ''}</textarea>
                        </div>

                        <div class="form-group">
                            <label>شعار المتجر</label>
                            <input type="file" id="storeLogo" accept="image/*" onchange="previewLogo(event)">
                            <img id="logoPreview" src="${settings.storeLogo || ''}" 
                                 class="mt-3 max-w-xs rounded ${settings.storeLogo ? '' : 'hidden'}">
                        </div>

                        <div class="form-group">
                            <label>وصف المتجر</label>
                            <textarea id="storeDescription" rows="3">${settings.storeDescription || ''}</textarea>
                            <small class="text-gray-500">يظهر في محركات البحث ووسائل التواصل الاجتماعي</small>
                        </div>

                        <div class="form-group">
                            <label>كلمات مفتاحية</label>
                            <input type="text" id="storeKeywords" value="${settings.storeKeywords || ''}" 
                                   placeholder="خضراوات, فواكه, سوق, تسوق">
                            <small class="text-gray-500">كلمات مفتاحية لمحركات البحث (مفصولة بفاصلة)</small>
                        </div>

                        <div class="form-group">
                            <label>معرف Google Analytics</label>
                            <input type="text" id="googleAnalyticsId" value="${settings.googleAnalyticsId || ''}" 
                                   placeholder="G-D9262X6WVK">
                            <small class="text-gray-500">معرف تتبع Google Analytics</small>
                        </div>

                        <button type="submit" class="btn-primary w-full">
                            <i class="fas fa-save ml-2"></i>حفظ الإعدادات
                        </button>
                    </form>
                </div>

                <!-- Shipping Settings -->
                <div class="card">
                    <h2 class="text-2xl font-bold mb-4">إعدادات الشحن</h2>
                    <form id="shippingSettingsForm" onsubmit="saveShippingSettings(event)">
                        <div class="form-group">
                            <label>تكلفة الشحن الأساسية (ج.م)</label>
                            <input type="number" id="shippingBaseCost" step="0.01" 
                                   value="${settings.shippingBaseCost || 0}" min="0">
                        </div>

                        <div class="form-group">
                            <label>الشحن المجاني عند الشراء بقيمة (ج.م)</label>
                            <input type="number" id="shippingFreeThreshold" step="0.01" 
                                   value="${settings.shippingFreeThreshold || 0}" min="0">
                            <small class="text-gray-500">اتركه 0 لإلغاء الشحن المجاني</small>
                        </div>

                        <div class="form-group">
                            <label>مدة التوصيل المتوقعة (أيام)</label>
                            <input type="number" id="shippingDays" 
                                   value="${settings.shippingDays || 3}" min="1">
                        </div>

                        <div class="form-group">
                            <label>الحد الأدنى للوزن (كجم)</label>
                            <input type="number" id="weightMin" step="0.125" 
                                   value="${settings.weightMin || 0.125}" min="0.125">
                            <small class="text-gray-500">الحد الأدنى للوزن (1/8 كجم = 0.125)</small>
                        </div>

                        <div class="form-group">
                            <label>الحد الأقصى للوزن (كجم)</label>
                            <input type="number" id="weightMax" step="0.125" 
                                   value="${settings.weightMax || 1}" min="0.125">
                            <small class="text-gray-500">الحد الأقصى للوزن (1 كجم)</small>
                        </div>

                        <div class="form-group">
                            <label>الزيادة التلقائية للوزن (كجم)</label>
                            <input type="number" id="weightIncrement" step="0.125" 
                                   value="${settings.weightIncrement || 0.125}" min="0.125">
                            <small class="text-gray-500">مقدار الزيادة (1/8 كجم = 0.125)</small>
                        </div>

                        <div class="form-group">
                            <label>خيارات الوزن المتاحة</label>
                            <div class="weight-options">
                                <label class="flex items-center">
                                    <input type="checkbox" id="weightOption125" value="0.125" 
                                           ${settings.weightOptions && settings.weightOptions.includes('0.125') ? 'checked' : ''}>
                                    <span class="mr-2">1/8 كجم (125 جرام)</span>
                                </label>
                                <label class="flex items-center">
                                    <input type="checkbox" id="weightOption250" value="0.25" 
                                           ${settings.weightOptions && settings.weightOptions.includes('0.25') ? 'checked' : ''}>
                                    <span class="mr-2">1/4 كجم (250 جرام)</span>
                                </label>
                                <label class="flex items-center">
                                    <input type="checkbox" id="weightOption375" value="0.375" 
                                           ${settings.weightOptions && settings.weightOptions.includes('0.375') ? 'checked' : ''}>
                                    <span class="mr-2">3/8 كجم (375 جرام)</span>
                                </label>
                                <label class="flex items-center">
                                    <input type="checkbox" id="weightOption500" value="0.5" 
                                           ${settings.weightOptions && settings.weightOptions.includes('0.5') ? 'checked' : ''}>
                                    <span class="mr-2">1/2 كجم (500 جرام)</span>
                                </label>
                                <label class="flex items-center">
                                    <input type="checkbox" id="weightOption625" value="0.625" 
                                           ${settings.weightOptions && settings.weightOptions.includes('0.625') ? 'checked' : ''}>
                                    <span class="mr-2">5/8 كجم (625 جرام)</span>
                                </label>
                                <label class="flex items-center">
                                    <input type="checkbox" id="weightOption750" value="0.75" 
                                           ${settings.weightOptions && settings.weightOptions.includes('0.75') ? 'checked' : ''}>
                                    <span class="mr-2">3/4 كجم (750 جرام)</span>
                                </label>
                                <label class="flex items-center">
                                    <input type="checkbox" id="weightOption875" value="0.875" 
                                           ${settings.weightOptions && settings.weightOptions.includes('0.875') ? 'checked' : ''}>
                                    <span class="mr-2">7/8 كجم (875 جرام)</span>
                                </label>
                                <label class="flex items-center">
                                    <input type="checkbox" id="weightOption1000" value="1" 
                                           ${settings.weightOptions && settings.weightOptions.includes('1') ? 'checked' : ''}>
                                    <span class="mr-2">1 كجم (1000 جرام)</span>
                                </label>
                            </div>
                            <small class="text-gray-500">اختر خيارات الوزن التي تظهر للعملاء</small>
                        </div>

                        <button type="submit" class="btn-primary w-full">
                            <i class="fas fa-save ml-2"></i>حفظ الإعدادات
                        </button>
                    </form>
                </div>

                <!-- Payment Settings -->
                <div class="card">
                    <h2 class="text-2xl font-bold mb-4">إعدادات الدفع</h2>
                    <form id="paymentSettingsForm" onsubmit="savePaymentSettings(event)">
                        <div class="form-group">
                            <label>تفعيل الدفع بالبطاقة</label>
                            <select id="paymentCardEnabled">
                                <option value="true" ${settings.paymentCardEnabled ? 'selected' : ''}>مفعل</option>
                                <option value="false" ${!settings.paymentCardEnabled ? 'selected' : ''}>معطل</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label>مفتاح API للدفع الإلكتروني</label>
                            <input type="text" id="paymentApiKey" value="${settings.paymentApiKey || ''}" 
                                   placeholder="أدخل مفتاح API">
                            <small class="text-gray-500">احتفظ بهذا المفتاح سرياً</small>
                        </div>

                        <div class="form-group">
                            <label>تفعيل الدفع عند الاستلام</label>
                            <select id="paymentCashOnDeliveryEnabled">
                                <option value="true" ${settings.paymentCashOnDeliveryEnabled ? 'selected' : ''}>مفعل</option>
                                <option value="false" ${!settings.paymentCashOnDeliveryEnabled ? 'selected' : ''}>معطل</option>
                            </select>
                        </div>

                        <button type="submit" class="btn-primary w-full">
                            <i class="fas fa-save ml-2"></i>حفظ الإعدادات
                        </button>
                    </form>
                </div>

                <!-- Social Media -->
                <div class="card">
                    <h2 class="text-2xl font-bold mb-4">وسائل التواصل</h2>
                    <form id="socialSettingsForm" onsubmit="saveSocialSettings(event)">
                        <div class="form-group">
                            <label>فيسبوك</label>
                            <input type="url" id="socialFacebook" value="${settings.socialFacebook || ''}" 
                                   placeholder="https://facebook.com/...">
                        </div>

                        <div class="form-group">
                            <label>تويتر</label>
                            <input type="url" id="socialTwitter" value="${settings.socialTwitter || ''}" 
                                   placeholder="https://twitter.com/...">
                        </div>

                        <div class="form-group">
                            <label>إنستغرام</label>
                            <input type="url" id="socialInstagram" value="${settings.socialInstagram || ''}" 
                                   placeholder="https://instagram.com/...">
                        </div>

                        <div class="form-group">
                            <label>واتساب</label>
                            <input type="text" id="socialWhatsapp" value="${settings.socialWhatsapp || ''}" 
                                   placeholder="رقم الواتساب">
                        </div>

                        <button type="submit" class="btn-primary w-full">
                            <i class="fas fa-save ml-2"></i>حفظ الإعدادات
                        </button>
                    </form>
                </div>

                <!-- Store Layout Settings -->
                <div class="card">
                    <h2 class="text-2xl font-bold mb-4">إعدادات عرض المتجر</h2>
                    <form id="layoutSettingsForm" onsubmit="saveLayoutSettings(event)">
                        <div class="form-group">
                            <label>عدد المنتجات في الصف (موبايل)</label>
                            <input type="number" id="gridColumnsMobile" min="1" value="${settings.gridColumnsMobile || 2}">
                        </div>

                        <div class="form-group">
                            <label>عدد المنتجات في الصف (تابلت)</label>
                            <input type="number" id="gridColumnsTablet" min="1" value="${settings.gridColumnsTablet || 3}">
                        </div>

                        <div class="form-group">
                            <label>عدد المنتجات في الصف (كمبيوتر)</label>
                            <input type="number" id="gridColumnsDesktop" min="1" value="${settings.gridColumnsDesktop || 4}">
                        </div>

                        <button type="submit" class="btn-primary w-full">
                            <i class="fas fa-save ml-2"></i>حفظ الإعدادات
                        </button>
                    </form>
                </div>

                <div class="card">
                    <h2 class="text-2xl font-bold mb-4">صور الشريط (Horizontal Scroll Menu)</h2>
                    <div class="mb-4">
                        <input type="file" id="heroScrollImages" accept="image/*" multiple>
                        <button class="btn-primary w-full mt-3" onclick="saveHeroScrollImages(event)">
                            <i class="fas fa-upload ml-2"></i>رفع الصور
                        </button>
                    </div>
                    <div id="heroScrollImagesList" class="grid grid-cols-2 md:grid-cols-3 gap-3">
                        ${(Array.isArray(settings.heroScrollImages) ? settings.heroScrollImages : []).map((url, idx) => `
                            <div class="border rounded-lg p-2">
                                <img src="${url}" class="w-full h-28 object-cover rounded" />
                                <button class="btn-danger w-full mt-2" onclick="removeHeroScrollImage(${idx})">
                                    حذف
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading settings:', error);
        pageContent.innerHTML = '<div class="card"><p class="text-red-600">حدث خطأ أثناء تحميل الإعدادات</p></div>';
    }
}

async function getSettings() {
    try {
        const docRef = doc(db, 'settings', 'general');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data();
        }
    } catch (error) {
        console.error('Error getting settings:', error);
    }
    return {
        storeName: '',
        storeEmail: '',
        storePhone: '',
        storeAddress: '',
        storeDescription: '',
        storeKeywords: '',
        googleAnalyticsId: '',
        storeLogo: '',
        logoPublicId: '',
        storageProvider: 'cloudinary', // تحديد مزود التخزين الافتراضي
        shippingBaseCost: 0,
        shippingFreeThreshold: 0,
        shippingDays: 3,
        weightMin: 0.125,
        weightMax: 1,
        weightIncrement: 0.125,
        weightOptions: ['0.125', '0.25', '0.5', '0.75', '1'],
        paymentCardEnabled: false,
        paymentApiKey: '',
        paymentCashOnDeliveryEnabled: true,
        socialFacebook: '',
        socialTwitter: '',
        socialInstagram: '',
        socialWhatsapp: '',
        gridColumnsMobile: 2,
        gridColumnsTablet: 3,
        gridColumnsDesktop: 4,
        heroScrollImages: []
    };
}

window.saveGeneralSettings = async function(event) {
    event.preventDefault();
    
    const storeName = document.getElementById('storeName').value;
    const storeEmail = document.getElementById('storeEmail').value;
    const storePhone = document.getElementById('storePhone').value;
    const storeAddress = document.getElementById('storeAddress').value;
    const storeDescription = document.getElementById('storeDescription').value;
    const storeKeywords = document.getElementById('storeKeywords').value;
    const googleAnalyticsId = document.getElementById('googleAnalyticsId').value;
    const logoFile = document.getElementById('storeLogo').files[0];
    
    try {
        let storeLogo = '';
        let logoPublicId = '';
        const currentSettings = await getSettings();
        storeLogo = currentSettings.storeLogo || '';
        logoPublicId = currentSettings.logoPublicId || '';
        
        if (logoFile) {
            // Delete old logo from Cloudinary if exists
            if (logoPublicId) {
                try {
                    await deleteImageFromCloudinary(logoPublicId);
                    console.log('تم حذف الشعار القديم من Cloudinary');
                } catch (error) {
                    console.warn('خطأ في حذف الشعار القديم:', error);
                }
            }
            
            // Upload new logo to Cloudinary
            const uploadResult = await uploadImageToCloudinary(logoFile, 'logos');
            storeLogo = uploadResult.url;
            logoPublicId = uploadResult.publicId;
            
            console.log('تم رفع الشعار الجديد إلى Cloudinary بنجاح');
        }
        
        const settingsData = {
            storeName,
            storeEmail,
            storePhone,
            storeAddress,
            storeDescription,
            storeKeywords,
            googleAnalyticsId,
            storeLogo,
            logoPublicId,
            storageProvider: 'cloudinary', // تحديد مزود التخزين
            updatedAt: new Date()
        };
        
        await setDoc(doc(db, 'settings', 'general'), settingsData, { merge: true });
        alert('تم حفظ الإعدادات العامة بنجاح (تم الرفع إلى Cloudinary باستخدام signed upload)');
        loadSettings();
    } catch (error) {
        console.error('Error saving general settings:', error);
        alert('حدث خطأ أثناء حفظ الإعدادات');
    }
}

window.saveHeroScrollImages = async function(event) {
    event.preventDefault();

    const input = document.getElementById('heroScrollImages');
    const files = Array.from((input && input.files) ? input.files : []);
    if (!files.length) {
        alert('اختر صور أولاً');
        return;
    }

    try {
        const currentSettings = await getSettings();
        const existing = Array.isArray(currentSettings.heroScrollImages) ? currentSettings.heroScrollImages : [];

        const uploadedUrls = [];
        for (const file of files) {
            const uploadResult = await uploadImageToCloudinary(file, 'hero');
            uploadedUrls.push(uploadResult.url);
        }

        const next = [...existing, ...uploadedUrls];
        await setDoc(doc(db, 'settings', 'general'), {
            heroScrollImages: next,
            updatedAt: new Date()
        }, { merge: true });

        alert('تم رفع الصور بنجاح');
        loadSettings();
    } catch (error) {
        console.error('Error saving hero scroll images:', error);
        alert('حدث خطأ أثناء رفع الصور');
    }
}

window.removeHeroScrollImage = async function(index) {
    try {
        const currentSettings = await getSettings();
        const existing = Array.isArray(currentSettings.heroScrollImages) ? currentSettings.heroScrollImages : [];
        if (index < 0 || index >= existing.length) return;

        const next = existing.filter((_, i) => i !== index);
        await setDoc(doc(db, 'settings', 'general'), {
            heroScrollImages: next,
            updatedAt: new Date()
        }, { merge: true });

        loadSettings();
    } catch (error) {
        console.error('Error removing hero scroll image:', error);
        alert('حدث خطأ أثناء الحذف');
    }
}

window.saveLayoutSettings = async function(event) {
    event.preventDefault();

    const gridColumnsMobile = parseInt(document.getElementById('gridColumnsMobile').value) || 2;
    const gridColumnsTablet = parseInt(document.getElementById('gridColumnsTablet').value) || 3;
    const gridColumnsDesktop = parseInt(document.getElementById('gridColumnsDesktop').value) || 4;

    try {
        const settingsData = {
            gridColumnsMobile: Math.max(1, gridColumnsMobile),
            gridColumnsTablet: Math.max(1, gridColumnsTablet),
            gridColumnsDesktop: Math.max(1, gridColumnsDesktop),
            updatedAt: new Date()
        };

        await setDoc(doc(db, 'settings', 'general'), settingsData, { merge: true });
        alert('تم حفظ إعدادات عرض المتجر بنجاح');
        loadSettings();
    } catch (error) {
        console.error('Error saving layout settings:', error);
        alert('حدث خطأ أثناء حفظ الإعدادات');
    }
}

window.saveShippingSettings = async function(event) {
    event.preventDefault();
    
    const shippingBaseCost = parseFloat(document.getElementById('shippingBaseCost').value) || 0;
    const shippingFreeThreshold = parseFloat(document.getElementById('shippingFreeThreshold').value) || 0;
    const shippingDays = parseInt(document.getElementById('shippingDays').value) || 3;
    const weightMin = parseFloat(document.getElementById('weightMin').value) || 0.125;
    const weightMax = parseFloat(document.getElementById('weightMax').value) || 1;
    const weightIncrement = parseFloat(document.getElementById('weightIncrement').value) || 0.125;
    
    // جمع خيارات الوزن المحددة
    const weightOptions = [];
    const weightCheckboxes = document.querySelectorAll('.weight-options input[type="checkbox"]:checked');
    weightCheckboxes.forEach(checkbox => {
        weightOptions.push(checkbox.value);
    });
    
    try {
        const settingsData = {
            shippingBaseCost,
            shippingFreeThreshold,
            shippingDays,
            weightMin,
            weightMax,
            weightIncrement,
            weightOptions,
            updatedAt: new Date()
        };
        
        await setDoc(doc(db, 'settings', 'general'), settingsData, { merge: true });
        alert('تم حفظ إعدادات الشحن بنجاح');
        
        // تحديث إعدادات الوزن في المتجر
        updateWeightSettingsInStore(settingsData);
        
        loadSettings();
    } catch (error) {
        console.error('Error saving shipping settings:', error);
        alert('حدث خطأ أثناء حفظ الإعدادات');
    }
}

// دالة لتحديث إعدادات الوزن في المتجر
async function updateWeightSettingsInStore(settingsData) {
    try {
        console.log('تحديث إعدادات الوزن في المتجر:', settingsData);
        
        // إرسال إعدادات الوزن إلى المتجر عبر API أو localStorage
        const weightSettings = {
            min: settingsData.weightMin,
            max: settingsData.weightMax,
            increment: settingsData.weightIncrement,
            options: settingsData.weightOptions,
            unit: 'كجم' // وحدة ثابتة
        };
        
        // حفظ في localStorage ليتمكن الوصول إليها من المتجر
        localStorage.setItem('weightSettings', JSON.stringify(weightSettings));
        
        // إرسال حدث مخصص للإشعار المتجر
        const event = new CustomEvent('weightSettingsUpdated', {
            detail: weightSettings
        });
        document.dispatchEvent(event);
        
        console.log('تم تحديث إعدادات الوزن في المتجر بنجاح');
        
    } catch (error) {
        console.error('Error updating weight settings in store:', error);
    }
}

window.savePaymentSettings = async function(event) {
    event.preventDefault();
    
    const paymentCardEnabled = document.getElementById('paymentCardEnabled').value === 'true';
    const paymentApiKey = document.getElementById('paymentApiKey').value;
    const paymentCashOnDeliveryEnabled = document.getElementById('paymentCashOnDeliveryEnabled').value === 'true';
    
    try {
        const settingsData = {
            paymentCardEnabled,
            paymentApiKey: paymentApiKey || null,
            paymentCashOnDeliveryEnabled,
            updatedAt: new Date()
        };
        
        await setDoc(doc(db, 'settings', 'general'), settingsData, { merge: true });
        alert('تم حفظ إعدادات الدفع بنجاح');
    } catch (error) {
        console.error('Error saving payment settings:', error);
        alert('حدث خطأ أثناء حفظ الإعدادات');
    }
}

window.saveSocialSettings = async function(event) {
    event.preventDefault();
    
    const socialFacebook = document.getElementById('socialFacebook').value;
    const socialTwitter = document.getElementById('socialTwitter').value;
    const socialInstagram = document.getElementById('socialInstagram').value;
    const socialWhatsapp = document.getElementById('socialWhatsapp').value;
    
    try {
        const settingsData = {
            socialFacebook: socialFacebook || null,
            socialTwitter: socialTwitter || null,
            socialInstagram: socialInstagram || null,
            socialWhatsapp: socialWhatsapp || null,
            updatedAt: new Date()
        };
        
        await setDoc(doc(db, 'settings', 'general'), settingsData, { merge: true });
        alert('تم حفظ إعدادات وسائل التواصل بنجاح');
    } catch (error) {
        console.error('Error saving social settings:', error);
        alert('حدث خطأ أثناء حفظ الإعدادات');
    }
}

