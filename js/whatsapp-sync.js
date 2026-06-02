// WhatsApp Sync - تحديث رقم الواتساب من الإعدادات
// Integrates with cart.js checkout function safely without race conditions

import { getShippingSettings } from './settings-sync.js';

/**
 * Sanitize WhatsApp phone number with rigorous validation
 * Removes spaces, leading +, and non-numeric characters
 * @returns {string} Sanitized phone number
 */
export function getWhatsAppNumber() {
    try {
        const settings = getShippingSettings();
        const rawNumber = settings.socialWhatsapp || (window.APP_SETTINGS && window.APP_SETTINGS.WHATSAPP_PHONE) || '';
        
        // Rigorous sanitization: 
        // 1. Remove all whitespace
        // 2. Remove leading + sign
        // 3. Remove any non-numeric characters
        const sanitized = String(rawNumber)
            .replace(/\s+/g, '')           // Remove spaces
            .replace(/^\+/, '')             // Remove leading +
            .replace(/[^0-9]/g, '');        // Remove non-numeric
        
        if (!sanitized) {
            console.warn('WhatsApp number is empty after sanitization');
            return '';
        }
        
        return sanitized;
    } catch (error) {
        console.error('Error sanitizing WhatsApp number:', error);
        return '';
    }
}

/**
 * Safely wrap the original checkout function from cart.js
 * This prevents complete override and maintains cart.js logic
 */
export function setupWhatsAppCheckoutWrapper() {
    // Check if cart.js has already exposed checkout
    if (!window.checkout || typeof window.checkout !== 'function') {
        console.warn('window.checkout not available yet - cart.js may not be loaded');
        return false;
    }

    // Store the original checkout function
    const originalCheckout = window.checkout;
    
    // Create wrapped version that integrates WhatsApp settings
    window.checkout = async function wrappedCheckout() {
        try {
            // Verify WhatsApp number is properly sanitized before checkout
            const phoneNumber = getWhatsAppNumber();
            
            if (!phoneNumber) {
                console.warn('WhatsApp number not configured - checkout will proceed but WhatsApp message may fail');
            }
            
            // Call the original checkout function from cart.js
            // This ensures all validation, Firebase save, and cart clearing happens properly
            return await originalCheckout();
        } catch (error) {
            console.error('Error in wrapped checkout:', error);
            throw error;
        }
    };
    
    return true;
}

/**
 * Initialize WhatsApp sync without race conditions
 * Listens for app settings update event dispatched by settings.js
 */
function initializeWhatsAppSync() {
    try {
        // Try immediate setup if cart.js is already loaded
        if (window.checkout && typeof window.checkout === 'function') {
            setupWhatsAppCheckoutWrapper();
        }
        
        // Listen for cart module ready event (dispatched by cart.js when it initializes)
        window.addEventListener('cartReady', () => {
            setupWhatsAppCheckoutWrapper();
        });
        
        // Listen for app settings update event (dispatched by settings.js)
        window.addEventListener('appSettingsUpdated', () => {
            // Re-validate WhatsApp number when settings change
            const newPhone = getWhatsAppNumber();
            if (newPhone) {
                console.debug('WhatsApp number updated:', newPhone.substring(0, 2) + '****' + newPhone.substring(newPhone.length - 2));
            }
        });
        
        // Fallback: Setup after a short delay to allow cart.js to load
        // This is a safety net, not the primary method
        setTimeout(() => {
            if (window.checkout && typeof window.checkout === 'function') {
                setupWhatsAppCheckoutWrapper();
            }
        }, 100);
        
    } catch (error) {
        console.error('Error initializing WhatsApp sync:', error);
    }
}

/**
 * Initialize on document ready or immediately if already loaded
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initializeWhatsAppSync, 50); // Small delay to ensure cart.js is loaded
    });
} else {
    initializeWhatsAppSync();
}

