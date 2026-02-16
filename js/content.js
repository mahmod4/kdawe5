import { doc, getDoc, updateDoc, setDoc } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js';
import { uploadImageToCloudinary, deleteImageFromCloudinary, uploadImageWithUI } from './cloudinary-config.js';
import { db } from './firebase-config.js';

export async function loadContent() {
    const pageContent = document.getElementById('pageContent');
    
    try {
        console.log('جاري تحميل صفحة إدارة المحتوى...');
        const content = await getContent();
        
        pageContent.innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Banner Management -->
                <div class="card">
                    <h2 class="text-2xl font-bold mb-4">إدارة البانر</h2>
                    <form id="bannerForm" onsubmit="saveBanner(event)">
                        <div class="form-group">
                            <label>صورة البانر</label>
                            <input type="file" id="bannerImage" accept="image/*" onchange="previewBannerImage(event)">
                            <div id="imagePreviewContainer" class="mt-3">
                                <img id="bannerPreview" src="${content.bannerImage || ''}" 
                                     class="max-w-full rounded ${content.bannerImage ? '' : 'hidden'}" 
                                     style="max-height: 200px; object-fit: cover;">
                                ${!content.bannerImage ? '<p class="text-gray-500 text-sm">لا توجد صورة بانر حالية</p>' : ''}
                            </div>
                            <small class="text-gray-500">الحجم الأقصى: 5 ميجابايت | الصيغ المسموحة: JPG, PNG, GIF</small>
                        </div>
                        <div class="form-group">
                            <label>رابط البانر (اختياري)</label>
                            <input type="url" id="bannerLink" value="${content.bannerLink || ''}" 
                                   placeholder="https://example.com">
                            <small class="text-gray-500">سيتم توجيه المستخدم لهذا الرابط عند النقر على البانر</small>
                        </div>
                        <div class="form-group">
                            <label>النص على البانر (اختياري)</label>
                            <input type="text" id="bannerText" value="${content.bannerText || ''}" 
                                   placeholder="نص يظهر على البانر">
                            <small class="text-gray-500">نص قصير يظهر على البانر</small>
                        </div>
                        <button type="submit" class="btn-primary w-full">
                            <i class="fas fa-save ml-2"></i>حفظ البانر
                        </button>
                    </form>
                </div>

                <!-- Static Pages -->
                <div class="card">
                    <h2 class="text-2xl font-bold mb-4">الصفحات الثابتة</h2>
                    <div class="space-y-3">
                        <button onclick="openPageModal('privacy')" class="btn-primary w-full text-right">
                            <i class="fas fa-shield-alt ml-2"></i>سياسة الخصوصية
                        </button>
                        <button onclick="openPageModal('terms')" class="btn-primary w-full text-right">
                            <i class="fas fa-file-contract ml-2"></i>الشروط والأحكام
                        </button>
                        <button onclick="openPageModal('about')" class="btn-primary w-full text-right">
                            <i class="fas fa-info-circle ml-2"></i>من نحن
                        </button>
                    </div>
                    
                    <div class="mt-6 p-4 bg-blue-50 rounded-lg">
                        <h3 class="font-semibold text-blue-800 mb-2">
                            <i class="fas fa-info-circle ml-2"></i>معلومات هامة
                        </h3>
                        <ul class="text-sm text-blue-700 space-y-1">
                            <li>• يمكنك استخدام HTML في محتوى الصفحات</li>
                            <li>• سيتم حفظ التغييرات تلقائياً</li>
                            <li>• الصور يتم رفعها تلقائياً</li>
                        </ul>
                    </div>
                </div>
            </div>

            <!-- Page Content Modal -->
            <div id="pageModal" class="modal">
                <div class="modal-content">
                    <span class="close" onclick="closePageModal()">&times;</span>
                    <h2 class="text-2xl font-bold mb-6" id="pageModalTitle">تعديل الصفحة</h2>
                    <form id="pageForm" onsubmit="savePageContent(event)">
                        <input type="hidden" id="pageType">
                        <div class="form-group">
                            <label>عنوان الصفحة *</label>
                            <input type="text" id="pageTitle" required>
                        </div>
                        <div class="form-group">
                            <label>محتوى الصفحة *</label>
                            <textarea id="pageContent" rows="15" required class="font-normal"></textarea>
                            <small class="text-gray-500">يمكنك استخدام HTML للتنسيق</small>
                        </div>
                        <div class="flex justify-end space-x-3 space-x-reverse mt-6">
                            <button type="button" onclick="closePageModal()" 
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
        
        console.log('تم تحميل صفحة إدارة المحتوى بنجاح');
        
    } catch (error) {
        console.error('Error loading content:', error);
        
        const errorCode = error.code || 'UNKNOWN';
        const errorMessage = error.message || 'خطأ غير معروف';
        
        pageContent.innerHTML = `
            <div class="card">
                <div class="text-center py-8">
                    <i class="fas fa-exclamation-triangle text-6xl text-red-300 mb-4"></i>
                    <h3 class="text-xl font-semibold text-red-600 mb-2">حدث خطأ أثناء تحميل صفحة المحتوى</h3>
                    <p class="text-gray-600 mb-4">يرجى التحقق من الاتصال بقاعدة البيانات</p>
                    
                    <div class="bg-gray-50 rounded-lg p-4 text-right mb-4">
                        <p class="text-sm font-semibold mb-2">تفاصيل الخطأ:</p>
                        <p class="text-xs text-gray-600">الكود: ${errorCode}</p>
                        <p class="text-xs text-gray-600">الرسالة: ${errorMessage}</p>
                    </div>
                    
                    <div class="flex justify-center space-x-3 space-x-reverse">
                        <button onclick="loadContent()" class="btn-primary">
                            <i class="fas fa-redo ml-2"></i>إعادة المحاولة
                        </button>
                        <button onclick="window.location.reload()" class="btn-secondary">
                            <i class="fas fa-sync ml-2"></i>تحديث الصفحة
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
}

async function getContent() {
    try {
        const docRef = doc(db, 'content', 'main');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            console.log('تم جلب المحتوى بنجاح:', docSnap.data());
            return docSnap.data();
        } else {
            console.log('مستند المحتوى غير موجود، إنشاء محتوى افتراضي');
            // إنشاء محتوى افتراضي إذا لم يوجد
            const defaultContent = {
                bannerImage: '',
                bannerPublicId: '',
                bannerLink: '',
                bannerText: '',
                privacyPolicy: { title: 'سياسة الخصوصية', content: '' },
                termsAndConditions: { title: 'الشروط والأحكام', content: '' },
                aboutUs: { title: 'من نحن', content: '' },
                storageProvider: 'cloudinary', // تحديد مزود التخزين الافتراضي
                createdAt: new Date()
            };
            await setDoc(docRef, defaultContent);
            return defaultContent;
        }
    } catch (error) {
        console.error('Error getting content:', error);
        // إرجاع محتوى افتراضي في حالة الخطأ
        return {
            bannerImage: '',
            bannerPublicId: '',
            bannerLink: '',
            bannerText: '',
            privacyPolicy: { title: 'سياسة الخصوصية', content: '' },
            termsAndConditions: { title: 'الشروط والأحكام', content: '' },
            aboutUs: { title: 'من نحن', content: '' },
            storageProvider: 'cloudinary'
        };
    }
}

window.previewBannerImage = function(event) {
    const file = event.target.files[0];
    const previewContainer = document.getElementById('imagePreviewContainer');
    const preview = document.getElementById('bannerPreview');
    
    if (file) {
        // التحقق من حجم الملف (10MB كحد أقصى للبانر)
        if (file.size > 10 * 1024 * 1024) {
            alert('حجم الصورة كبير جداً. الحد الأقصى هو 10 ميجابايت');
            event.target.value = ''; // مسح الملف
            return;
        }
        
        // التحقق من نوع الملف
        if (!file.type.startsWith('image/')) {
            alert('يرجى اختيار ملف صورة صالح');
            event.target.value = ''; // مسح الملف
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.src = e.target.result;
            preview.classList.remove('hidden');
            console.log('تم عرض الصورة المختارة بنجاح');
        };
        reader.onerror = () => {
            alert('حدث خطأ أثناء قراءة الصورة');
            event.target.value = ''; // مسح الملف
        };
        reader.readAsDataURL(file);
    } else {
        // إذا تم مسح الملف، إعادة الصورة الأصلية
        getContent().then(currentContent => {
            if (currentContent.bannerImage) {
                preview.src = currentContent.bannerImage;
                preview.classList.remove('hidden');
            } else {
                preview.classList.add('hidden');
            }
        });
    }
}

window.saveBanner = async function(event) {
    event.preventDefault();
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    // إظهار مؤشر التحميل
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin ml-2"></i>جاري الحفظ...';
    submitBtn.disabled = true;
    
    try {
        const bannerLink = document.getElementById('bannerLink').value;
        const bannerText = document.getElementById('bannerText').value;
        const imageFile = document.getElementById('bannerImage').files[0];
        
        console.log('بدء حفظ البانر:', { bannerLink, bannerText, hasImage: !!imageFile });
        
        let bannerImage = '';
        let bannerPublicId = '';
        
        // Get current banner data
        const content = await getContent();
        bannerImage = content.bannerImage || '';
        bannerPublicId = content.bannerPublicId || '';
        
        // Upload new image to Cloudinary if selected
        if (imageFile) {
            console.log('رفع صورة جديدة للبانر إلى Cloudinary...');
            
            // Delete old image from Cloudinary if exists
            if (bannerPublicId) {
                try {
                    console.log('حذف الصورة القديمة من Cloudinary:', bannerPublicId);
                    await deleteImageFromCloudinary(bannerPublicId);
                } catch (deleteError) {
                    console.warn('خطأ في حذف الصورة القديمة من Cloudinary:', deleteError);
                    // لا نوقف العملية إذا فشل الحذف
                }
            }
            
            // Upload new image to Cloudinary
            console.log('رفع الصورة الجديدة إلى Cloudinary...');
            const uploadResult = await uploadImageToCloudinary(imageFile, 'banners');
            bannerImage = uploadResult.url;
            bannerPublicId = uploadResult.publicId;
            
            console.log('تم رفع الصورة إلى Cloudinary بنجاح:', { url: bannerImage, publicId: bannerPublicId });
        }
        
        // Save banner data to Firestore
        const bannerData = {
            bannerImage,
            bannerPublicId,
            bannerLink: bannerLink || null,
            bannerText: bannerText || null,
            updatedAt: new Date(),
            storageProvider: 'cloudinary' // تحديد مزود التخزين
        };
        
        console.log('حفظ بيانات البانر في Firestore:', bannerData);
        await setDoc(doc(db, 'content', 'main'), bannerData, { merge: true });
        
        alert('تم حفظ البانر بنجاح (تم الرفع إلى Cloudinary باستخدام signed upload)');
        loadContent();
        
    } catch (error) {
        console.error('Error saving banner:', error);
        
        // رسالة خطأ مفصلة
        let errorMessage = 'حدث خطأ أثناء حفظ البانر';
        if (error.message && error.message.includes('Cloudinary')) {
            errorMessage = 'خطأ في رفع الصورة إلى Cloudinary: ' + error.message;
        } else if (error.message && error.message.includes('Missing required parameter')) {
            errorMessage = 'معاملات مفقودة. يرجى التحقق من إعدادات Cloudinary.';
        } else if (error.message && error.message.includes('Invalid upload preset')) {
            errorMessage = 'إعدادات الرفع غير صالحة. يرجى التحقق من upload preset في Cloudinary.';
        } else if (error.message && error.message.includes('File size too large')) {
            errorMessage = 'حجم الصورة كبير جداً. الحد الأقصى هو 10 ميجابايت.';
        } else if (error.message && error.message.includes('Unauthorized')) {
            errorMessage = 'مفتاح API غير صالح. يرجى التحقق من إعدادات Cloudinary.';
        } else if (error.message && error.message.includes('Not allowed')) {
            errorMessage = 'نوع الملف غير مسموح. يرجى استخدام الصور فقط.';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        alert(errorMessage);
    } finally {
        // استعادة زر الحفظ
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

window.openPageModal = async function(pageType) {
    const pageNames = {
        'privacy': 'سياسة الخصوصية',
        'terms': 'الشروط والأحكام',
        'about': 'من نحن'
    };
    
    document.getElementById('pageModalTitle').textContent = `تعديل ${pageNames[pageType]}`;
    document.getElementById('pageType').value = pageType;
    
    try {
        const content = await getContent();
        const pageData = content[pageType === 'privacy' ? 'privacyPolicy' : 
                            pageType === 'terms' ? 'termsAndConditions' : 'aboutUs'] || 
                        { title: pageNames[pageType], content: '' };
        
        document.getElementById('pageTitle').value = pageData.title || pageNames[pageType];
        document.getElementById('pageContent').value = pageData.content || '';
        
        document.getElementById('pageModal').style.display = 'block';
    } catch (error) {
        console.error('Error loading page content:', error);
        alert('حدث خطأ أثناء تحميل المحتوى');
    }
}

window.closePageModal = function() {
    document.getElementById('pageModal').style.display = 'none';
}

window.savePageContent = async function(event) {
    event.preventDefault();
    
    const pageType = document.getElementById('pageType').value;
    const title = document.getElementById('pageTitle').value;
    const content = document.getElementById('pageContent').value;
    
    try {
        const contentRef = doc(db, 'content', 'main');
        const currentContent = await getContent();
        
        const fieldName = pageType === 'privacy' ? 'privacyPolicy' : 
                         pageType === 'terms' ? 'termsAndConditions' : 'aboutUs';
        
        const updateData = {
            [fieldName]: {
                title,
                content,
                updatedAt: new Date()
            },
            updatedAt: new Date()
        };
        
        await setDoc(contentRef, updateData, { merge: true });
        
        alert('تم حفظ المحتوى بنجاح');
        closePageModal();
    } catch (error) {
        console.error('Error saving page content:', error);
        alert('حدث خطأ أثناء حفظ المحتوى');
    }
}

// تصدير الدوال للاستخدام في onclick
window.loadContent = loadContent;

