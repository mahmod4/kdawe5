// Cloudinary Configuration - إعدادات Cloudinary
// إعدادات API للرفع الصور
const cloudinaryConfig = {
    cloudName: 'ddm0j229o', // Cloud name
    apiKey: '915513453848396', // API Key
    apiSecret: 'gwwRDcbDIKPdu1-f6jSyLsCu2yk', // API Secret (مطلوب للـ signed upload)
    uploadPreset: 'my-store', // Upload preset الأحدث (Signed)
    folder: 'products' // مجلد المنتجات
};

// دالة لإنشاء توقيع التحميل
// تعمل في بيئة المتصفح باستخدام Web Crypto API
async function generateSignature(dataToSign) {
    try {
        // في بيئة المتصفح، استخدم Web Crypto API
        if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
            const encoder = new TextEncoder();
            const data = encoder.encode(dataToSign + cloudinaryConfig.apiSecret);
            
            const hashBuffer = await window.crypto.subtle.digest(
                { name: 'SHA-1' },
                data
            );
            
            // تحويل ArrayBuffer إلى hex string
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            
            return hashHex;
        } else {
            console.warn('Web Crypto API not supported');
            return null;
        }
    } catch (error) {
        console.error('Error generating signature:', error);
        return null;
    }
}

// دالة لتحميل الصورة إلى Cloudinary
async function uploadImageToCloudinary(file, productId = null) {
    try {
        console.log('بدء رفع الصورة إلى Cloudinary:', file.name, 'الملف:', file.size, 'bytes');
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', cloudinaryConfig.apiKey);
        formData.append('upload_preset', cloudinaryConfig.uploadPreset);
        
        // إضافة مجلد المنتج إذا كان productId موجود
        if (productId) {
            formData.append('folder', `${cloudinaryConfig.folder}/${productId}`);
        } else {
            formData.append('folder', cloudinaryConfig.folder);
        }

        // إضافة التوقيع للـ signed upload
        const timestamp = Math.floor(Date.now() / 1000);
        const signatureData = `folder=${productId ? cloudinaryConfig.folder + '/' + productId : cloudinaryConfig.folder}&timestamp=${timestamp}&upload_preset=${cloudinaryConfig.uploadPreset}`;
        const signature = await generateSignature(signatureData);
        
        if (signature) {
            formData.append('timestamp', timestamp);
            formData.append('signature', signature);
        }

        console.log('إعدادات الرفع:', {
            cloudName: cloudinaryConfig.cloudName,
            apiKey: cloudinaryConfig.apiKey,
            uploadPreset: cloudinaryConfig.uploadPreset,
            folder: productId ? `${cloudinaryConfig.folder}/${productId}` : cloudinaryConfig.folder,
            timestamp,
            signatureData,
            signature: signature ? 'generated' : 'unsigned'
        });

        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`, {
            method: 'POST',
            body: formData
        });

        console.log('استجابة Cloudinary:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Cloudinary error response:', errorText);
            throw new Error(`فشل الرفع: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        
        if (result.error) {
            console.error('Cloudinary API error:', result.error);
            throw new Error(`خطأ في Cloudinary: ${result.error.message || 'خطأ غير معروف'}`);
        }

        console.log('تم رفع الصورة بنجاح:', {
            publicId: result.public_id,
            url: result.secure_url,
            size: result.bytes,
            format: result.format
        });

        return {
            url: result.secure_url,
            publicId: result.public_id,
            thumbnailUrl: result.secure_url.replace('/upload/', '/upload/w_150,h_150/'),
            mediumUrl: result.secure_url.replace('/upload/', '/upload/w_400,h_400/'),
            originalUrl: result.secure_url
        };

    } catch (error) {
        console.error('Error uploading image to Cloudinary:', error);
        
        // رسائل خطأ مفصلة
        if (error.message.includes('Missing required parameter')) {
            throw new Error('معاملات مفقودة. يرجى التحقق من إعدادات Cloudinary (unsigned upload).');
        } else if (error.message.includes('Invalid upload preset')) {
            throw new Error('إعدادات الرفع غير صالحة. يرجى التحقق من upload preset (my-store).');
        } else if (error.message.includes('File size too large')) {
            throw new Error('حجم الملف كبير جداً. الحد الأقصى هو 10 ميجابايت.');
        } else if (error.message.includes('Unauthorized')) {
            throw new Error('مفتاح API غير صالح. يرجى التحقق من إعدادات Cloudinary.');
        } else if (error.message.includes('Not allowed')) {
            throw new Error('نوع الملف غير مسموح. يرجى استخدام الصور فقط.');
        }
        
        throw error;
    }
}

// دالة لحذف الصورة من Cloudinary
async function deleteImageFromCloudinary(publicId) {
    try {
        console.log('بدء حذف الصورة من Cloudinary:', publicId);
        
        // إضافة التوقيع للـ signed delete
        const timestamp = Math.floor(Date.now() / 1000);
        const signatureData = `public_id=${publicId}&timestamp=${timestamp}`;
        const signature = await generateSignature(signatureData);

        const formData = new FormData();
        formData.append('public_id', publicId);
        formData.append('api_key', cloudinaryConfig.apiKey);
        formData.append('timestamp', timestamp);
        
        if (signature) {
            formData.append('signature', signature);
        }

        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/destroy`, {
            method: 'POST',
            body: formData
        });

        console.log('استجابة حذف Cloudinary:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Cloudinary delete error response:', errorText);
            throw new Error(`فشل الحذف: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        
        if (result.error) {
            console.error('Cloudinary delete API error:', result.error);
            throw new Error(`خطأ في حذف Cloudinary: ${result.error.message || 'خطأ غير معروف'}`);
        }

        console.log('تم حذف الصورة بنجاح:', result.result);
        return result.result === 'ok';

    } catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
        
        // رسائل خطأ مفصلة
        if (error.message.includes('Missing required parameter')) {
            throw new Error('معاملات مفقودة. يرجى التحقق من معرف الصورة.');
        } else if (error.message.includes('Unauthorized')) {
            throw new Error('مفتاح API غير صالح. يرجى التحقق من إعدادات Cloudinary.');
        } else if (error.message.includes('Not found')) {
            throw new Error('الصورة غير موجودة أو تم حذفها بالفعل.');
        }
        
        throw error;
    }
}

// دالة لمعاينة الصورة قبل الرفع
function previewImage(file, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
        callback(e.target.result);
    };
    reader.readAsDataURL(file);
}

// دالة للتحقق من نوع الملف
function validateImageFile(file) {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB (زيادة الحد الأقصى)

    if (!validTypes.includes(file.type)) {
        throw new Error('نوع الملف غير مدعوم. يرجى استخدام JPG, PNG, GIF, أو WebP');
    }

    if (file.size > maxSize) {
        throw new Error('حجم الملف كبير جداً. الحد الأقصى هو 10MB');
    }

    console.log('الملف تم التحقق بنجاح:', {
        name: file.name,
        type: file.type,
        size: (file.size / 1024 / 1024).toFixed(2) + 'MB'
    });

    return true;
}

// دالة لضغط الصورة قبل الرفع
function compressImage(file, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = function() {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            canvas.toBlob(function(blob) {
                resolve(new File([blob], file.name, {
                    type: 'image/jpeg',
                    lastModified: Date.now()
                }));
            }, 'image/jpeg', quality);
        };

        img.onerror = function() {
            reject(new Error('فشل تحميل الصورة'));
        };

        img.src = URL.createObjectURL(file);
    });
}

// دالة لإنشاء معاينة متعددة الأحجام
function generateImageThumbnails(imageUrl) {
    return {
        thumbnail: imageUrl.replace('/upload/', '/upload/w_150,h_150,c_fill/'),
        medium: imageUrl.replace('/upload/', '/upload/w_400,h_400,c_fill/'),
        large: imageUrl.replace('/upload/', '/upload/w_800,h_800,c_fill/'),
        original: imageUrl
    };
}

// دالة لتحميل صور متعددة
async function uploadMultipleImages(files, productId = null) {
    const uploadPromises = [];
    const results = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        try {
            validateImageFile(file);
            
            // ضغط الصورة إذا كانت كبيرة
            let processedFile = file;
            if (file.size > 1024 * 1024) { // أكبر من 1MB
                processedFile = await compressImage(file, 0.7);
            }

            const result = await uploadImageToCloudinary(processedFile, productId);
            results.push({
                file: file.name,
                success: true,
                ...result
            });

        } catch (error) {
            results.push({
                file: file.name,
                success: false,
                error: error.message
            });
        }
    }

    return results;
}

// دالة لعرض شريط التقدم
function showUploadProgress(progress, status) {
    const progressBar = document.getElementById('uploadProgress');
    const progressText = document.getElementById('uploadProgressText');
    
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
        progressBar.setAttribute('aria-valuenow', progress);
    }
    
    if (progressText) {
        progressText.textContent = status;
    }
}

// دالة رئيسية لرفع الصورة مع واجهة مستخدم
async function uploadImageWithUI(fileInput, productId = null, onProgress = null) {
    const file = fileInput.files[0];
    
    if (!file) {
        throw new Error('يرجى اختيار صورة');
    }

    try {
        // التحقق من الصورة
        validateImageFile(file);

        // عرض المعاينة
        previewImage(file, (previewUrl) => {
            const preview = document.getElementById('imagePreview');
            if (preview) {
                preview.src = previewUrl;
                preview.style.display = 'block';
            }
        });

        // بدء التحميل
        if (onProgress) {
            onProgress(0, 'جاري تحميل الصورة إلى Cloudinary (signed)...');
        }

        // تحميل الصورة
        const result = await uploadImageToCloudinary(file, productId);

        if (onProgress) {
            onProgress(100, 'تم تحميل الصورة بنجاح إلى Cloudinary (signed)');
        }

        return result;

    } catch (error) {
        if (onProgress) {
            onProgress(0, `خطأ: ${error.message}`);
        }
        throw error;
    }
}

// تصدير الدوال للاستخدام في ملفات أخرى
export {
    cloudinaryConfig,
    uploadImageToCloudinary,
    deleteImageFromCloudinary,
    previewImage,
    validateImageFile,
    compressImage,
    generateImageThumbnails,
    uploadMultipleImages,
    uploadImageWithUI,
    showUploadProgress
};
