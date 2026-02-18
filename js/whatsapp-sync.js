// WhatsApp Sync - تحديث رقم الواتساب من الإعدادات
import { getShippingSettings } from './settings-sync.js';

// Get WhatsApp number from settings
export function getWhatsAppNumber() {
    const settings = getShippingSettings();
    return settings.socialWhatsapp || '201234567890'; // رقم افتراضي
}

// Update WhatsApp checkout function to use settings
export function updateWhatsAppCheckout() {
    // Override the checkout function to use dynamic WhatsApp number
    const originalCheckout = window.checkout;
    
    window.checkout = async function() {
        // Get the current WhatsApp number from settings
        const phoneNumber = getWhatsAppNumber();
        
        // Rest of the original checkout logic...
        const cartItems = JSON.parse(localStorage.getItem('cart')) || [];
        const totalPrice = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        if (cartItems.length === 0) {
            if (typeof window.showToast === 'function') {
                window.showToast('السلة فارغة!', 'error');
            }
            return;
        }
        
        const user = window.firebaseAuth?.auth?.currentUser;
        if (!user) {
            if (typeof window.showToast === 'function') {
                window.showToast('يرجى تسجيل الدخول أولاً', 'error');
            }
            return;
        }
        
        const checkoutBtn = document.getElementById('checkout-btn');
        const originalText = checkoutBtn.innerHTML;
        checkoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري حفظ الطلب...';
        checkoutBtn.style.pointerEvents = 'none';
        
        try {
            // حفظ الطلب في Firebase
            const orderId = await window.saveOrderToFirebase(cartItems, totalPrice);
            
            // إعداد رسالة واتساب
            const storeName = document.querySelector('[data-store-name]')?.textContent || 'المتجر';
            let whatsappMessage = `مرحباً، أريد طلب من ${storeName}:\n\n`;
            whatsappMessage += `رقم الطلب: ${orderId}\n`;
            whatsappMessage += `اسم العميل: ${user.displayName || user.email}\n\n`;
            whatsappMessage += `تفاصيل الطلب:\n`;
            
            cartItems.forEach(item => {
                whatsappMessage += `- ${item.name}: ${item.quantity} × ${item.price} ج.م = ${item.quantity * item.price} ج.م\n`;
            });
            
            whatsappMessage += `\nالمجموع الكلي: ${totalPrice} ج.م\n`;
            whatsappMessage += `تاريخ الطلب: ${new Date().toLocaleString('ar-EG')}`;
            
            // إرسال رسالة واتساب باستخدام الرقم من الإعدادات
            const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(whatsappMessage)}`;
            
            // فتح واتساب
            window.open(whatsappUrl, '_blank');
            
            // إظهار رسالة نجاح
            if (typeof window.showToast === 'function') {
                window.showToast('تم حفظ طلبك بنجاح! سيتم التواصل معك قريباً.', 'success');
            }
            
            // مسح السلة
            localStorage.removeItem('cart');
            updateCartCount();
            
            // إغلاق نافذة السلة
            document.getElementById('cart-modal').style.display = 'none';
            
        } catch (error) {
            console.error('Error during checkout:', error);
            if (typeof window.showToast === 'function') {
                window.showToast('حدث خطأ أثناء حفظ الطلب. يرجى المحاولة مرة أخرى.', 'error');
            }
        } finally {
            checkoutBtn.innerHTML = originalText;
            checkoutBtn.style.pointerEvents = 'auto';
        }
    };
}

// Initialize WhatsApp sync
document.addEventListener('DOMContentLoaded', function() {
    // Wait for settings to load, then update checkout
    setTimeout(updateWhatsAppCheckout, 2000);
});

