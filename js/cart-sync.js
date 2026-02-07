// Cart Sync - مزامنة عربة التسوق مع إعدادات المتجر
import { getShippingSettings, getPaymentSettings, getActiveOffers } from './settings-sync.js';

// Calculate shipping cost based on settings
export function calculateShippingCost(subtotal) {
    const settings = getShippingSettings();
    
    // Check if free shipping is available
    if (settings.shippingFreeThreshold && subtotal >= settings.shippingFreeThreshold) {
        return 0;
    }
    
    // Return base shipping cost
    return settings.shippingBaseCost || 0;
}

// Calculate total with offers and discounts
export function calculateTotalWithDiscounts(cartItems, subtotal) {
    const offers = getActiveOffers();
    let totalDiscount = 0;
    
    // Apply percentage discounts first
    const percentageOffers = offers.filter(offer => offer.discountType === 'percentage');
    percentageOffers.forEach(offer => {
        if (offer.products && offer.products.length > 0) {
            // Apply to specific products
            const eligibleItems = cartItems.filter(item => offer.products.includes(item.id));
            const eligibleSubtotal = eligibleItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            totalDiscount += eligibleSubtotal * (offer.discountValue / 100);
        } else {
            // Apply to all items
            totalDiscount += subtotal * (offer.discountValue / 100);
        }
    });
    
    // Apply fixed amount discounts
    const fixedOffers = offers.filter(offer => offer.discountType === 'fixed');
    fixedOffers.forEach(offer => {
        if (offer.products && offer.products.length > 0) {
            // Apply to specific products
            const eligibleItems = cartItems.filter(item => offer.products.includes(item.id));
            const eligibleSubtotal = eligibleItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            totalDiscount += Math.min(offer.discountValue, eligibleSubtotal);
        } else {
            // Apply to total (but don't make it negative)
            totalDiscount += Math.min(offer.discountValue, subtotal);
        }
    });
    
    return {
        subtotal,
        totalDiscount,
        totalAfterDiscount: Math.max(0, subtotal - totalDiscount)
    };
}

// Get available payment methods
export function getAvailablePaymentMethods() {
    const settings = getPaymentSettings();
    const methods = [];
    
    if (settings.paymentCashOnDeliveryEnabled) {
        methods.push({
            id: 'cash_on_delivery',
            name: 'الدفع عند الاستلام',
            description: 'الدفع نقداً عند استلام الطلب',
            icon: 'cash'
        });
    }
    
    if (settings.paymentCardEnabled) {
        methods.push({
            id: 'card',
            name: 'الدفع بالبطاقة',
            description: 'الدفع الآمن بالبطاقة البنكية',
            icon: 'credit-card'
        });
    }
    
    return methods;
}

// Validate coupon code
export function validateCouponCode(code) {
    const offers = getActiveOffers();
    const offer = offers.find(offer => offer.couponCode === code.toUpperCase());
    
    if (!offer) {
        return { valid: false, message: 'كود الخصم غير صالح' };
    }
    
    return { 
        valid: true, 
        offer,
        message: `تم تطبيق خصم ${offer.discountValue}${offer.discountType === 'percentage' ? '%' : ' ج.م'}`
    };
}

// Format currency with store settings
export function formatCurrency(amount) {
    return new Intl.NumberFormat('ar-EG', {
        style: 'currency',
        currency: 'EGP',
        minimumFractionDigits: 2
    }).format(amount);
}

// Get estimated delivery time
export function getEstimatedDeliveryTime() {
    const settings = getShippingSettings();
    const days = settings.shippingDays || 3;
    
    const today = new Date();
    const deliveryDate = new Date(today);
    deliveryDate.setDate(today.getDate() + days);
    
    return {
        minDays: days,
        maxDays: days + 2,
        estimatedDate: deliveryDate.toLocaleDateString('ar-SA')
    };
}

// Export functions for use in cart.html
export {
    calculateShippingCost,
    calculateTotalWithDiscounts,
    getAvailablePaymentMethods,
    validateCouponCode,
    formatCurrency,
    getEstimatedDeliveryTime
};
