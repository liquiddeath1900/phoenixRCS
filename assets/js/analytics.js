/* PhoenixRCS - Analytics & Tracking */

(function() {
    'use strict';

    // Configuration
    const ANALYTICS_CONFIG = {
        gtag_id: 'GA_MEASUREMENT_ID', // Replace with actual Google Analytics ID
        debug_mode: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
        events: {
            phone_call: 'phone_call',
            button_click: 'click',
            form_submit: 'form_submit',
            scroll_depth: 'scroll',
            page_view: 'page_view',
            error: 'exception'
        }
    };

    // Initialize Analytics
    function initAnalytics() {
        // Only load analytics in production
        if (!ANALYTICS_CONFIG.debug_mode) {
            loadGoogleAnalytics();
        }
        
        setupEventTracking();
        trackPageLoad();
        
        console.log('Analytics initialized', ANALYTICS_CONFIG.debug_mode ? '(Debug Mode)' : '(Production Mode)');
    }

    // Load Google Analytics
    function loadGoogleAnalytics() {
        // gtag is loaded via the script tag in HTML
        if (typeof gtag !== 'undefined') {
            gtag('config', ANALYTICS_CONFIG.gtag_id, {
                page_title: document.title,
                page_location: window.location.href
            });
            
            console.log('Google Analytics loaded');
        }
    }

    // Main event tracking function
    window.trackEvent = function(action, category, label, value) {
        const eventData = {
            event_category: category || 'general',
            event_label: label || '',
            value: value || undefined
        };

        // Log to console in debug mode
        if (ANALYTICS_CONFIG.debug_mode) {
            console.log('Event tracked:', action, eventData);
        }

        // Send to Google Analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', action, eventData);
        }

        // Send to other analytics platforms (Facebook Pixel, etc.)
        trackToOtherPlatforms(action, category, label, value);
    };

    // Setup specific event tracking
    function setupEventTracking() {
        // Track phone calls
        trackPhoneCalls();
        
        // Track form interactions
        trackFormInteractions();
        
        // Track button clicks
        trackButtonClicks();
        
        // Track scroll behavior
        trackScrollBehavior();
        
        // Track time on page
        trackTimeOnPage();
        
        // Track exit intent (mouse leaving viewport)
        trackExitIntent();
    }

    // Phone Call Tracking
    function trackPhoneCalls() {
        const phoneLinks = document.querySelectorAll('a[href^="tel:"]');
        
        phoneLinks.forEach((link, index) => {
            link.addEventListener('click', function(e) {
                const phoneNumber = this.href.replace('tel:', '');
                const section = getElementSection(this);
                
                trackEvent('phone_call', 'conversion', section, 1);
                
                // Additional tracking for call attribution
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'conversion', {
                        'send_to': 'AW-CONVERSION_ID', // Replace with actual conversion ID
                        'phone_conversion_number': phoneNumber
                    });
                }
                
                console.log('Phone call tracked:', phoneNumber, 'from', section);
            });
        });
    }

    // Form Interaction Tracking
    function trackFormInteractions() {
        const forms = document.querySelectorAll('form');
        
        forms.forEach(form => {
            // Track form starts
            const formInputs = form.querySelectorAll('input, textarea, select');
            let formStarted = false;
            
            formInputs.forEach(input => {
                input.addEventListener('focus', function() {
                    if (!formStarted) {
                        trackEvent('form_start', 'engagement', form.id || 'contact_form');
                        formStarted = true;
                    }
                });
            });
            
            // Track form submissions
            form.addEventListener('submit', function(e) {
                const formId = this.id || 'contact_form';
                trackEvent('form_submit', 'conversion', formId, 1);
                
                // Track conversion
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'conversion', {
                        'send_to': 'AW-CONVERSION_ID' // Replace with actual conversion ID
                    });
                }
            });
            
            // Track form field completion
            formInputs.forEach(input => {
                input.addEventListener('blur', function() {
                    if (this.value.trim() !== '') {
                        trackEvent('form_field_complete', 'engagement', this.name || this.type);
                    }
                });
            });
        });
    }

    // Button Click Tracking
    function trackButtonClicks() {
        const buttons = document.querySelectorAll('.btn-primary, .btn-secondary, .btn-service, .header-cta');
        
        buttons.forEach(button => {
            button.addEventListener('click', function() {
                const buttonText = this.textContent.trim();
                const section = getElementSection(this);
                const buttonType = this.classList.contains('btn-primary') ? 'primary' : 
                                 this.classList.contains('btn-secondary') ? 'secondary' : 'service';
                
                trackEvent('button_click', 'engagement', `${buttonType}_${section}`, 1);
            });
        });
    }

    // Scroll Behavior Tracking
    function trackScrollBehavior() {
        let maxScrollDepth = 0;
        let scrollDepthMarkers = [25, 50, 75, 90, 100];
        let trackedDepths = new Set();
        
        function trackScrollDepth() {
            const scrollPercent = Math.round(
                (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
            );
            
            maxScrollDepth = Math.max(maxScrollDepth, scrollPercent);
            
            scrollDepthMarkers.forEach(depth => {
                if (scrollPercent >= depth && !trackedDepths.has(depth)) {
                    trackedDepths.add(depth);
                    trackEvent('scroll_depth', 'engagement', `${depth}%`);
                }
            });
        }
        
        // Track scroll with throttling
        let scrollTimeout;
        window.addEventListener('scroll', function() {
            if (scrollTimeout) {
                clearTimeout(scrollTimeout);
            }
            scrollTimeout = setTimeout(trackScrollDepth, 100);
        }, { passive: true });
        
        // Track final scroll depth on page unload
        window.addEventListener('beforeunload', function() {
            trackEvent('max_scroll_depth', 'engagement', `${maxScrollDepth}%`);
        });
    }

    // Time on Page Tracking
    function trackTimeOnPage() {
        const startTime = Date.now();
        let timeOnPageSent = false;
        
        // Track time milestones
        const timeMilestones = [30, 60, 120, 300]; // seconds
        
        timeMilestones.forEach(seconds => {
            setTimeout(() => {
                trackEvent('time_on_page', 'engagement', `${seconds}s`);
            }, seconds * 1000);
        });
        
        // Track final time on page
        window.addEventListener('beforeunload', function() {
            if (!timeOnPageSent) {
                const timeOnPage = Math.round((Date.now() - startTime) / 1000);
                trackEvent('session_duration', 'engagement', `${timeOnPage}s`, timeOnPage);
                timeOnPageSent = true;
            }
        });
        
        // For SPAs, also track when page becomes hidden
        document.addEventListener('visibilitychange', function() {
            if (document.hidden && !timeOnPageSent) {
                const timeOnPage = Math.round((Date.now() - startTime) / 1000);
                trackEvent('session_duration', 'engagement', `${timeOnPage}s`, timeOnPage);
                timeOnPageSent = true;
            }
        });
    }

    // Exit Intent Tracking
    function trackExitIntent() {
        let exitIntentTracked = false;
        
        document.addEventListener('mouseleave', function(e) {
            if (e.clientY <= 0 && !exitIntentTracked) {
                trackEvent('exit_intent', 'engagement', 'mouse_leave');
                exitIntentTracked = true;
            }
        });
    }

    // Track Page Load Performance
    function trackPageLoad() {
        window.addEventListener('load', function() {
            // Get performance timing
            const timing = performance.timing;
            const loadTime = timing.loadEventEnd - timing.navigationStart;
            const domTime = timing.domContentLoadedEventEnd - timing.navigationStart;
            
            // Track load times
            trackEvent('page_load_time', 'performance', 'total', Math.round(loadTime));
            trackEvent('dom_load_time', 'performance', 'dom', Math.round(domTime));
            
            // Track connection type if available
            if (navigator.connection) {
                trackEvent('connection_type', 'technical', navigator.connection.effectiveType);
            }
            
            // Track device information
            trackDeviceInfo();
        });
    }

    // Track Device Information
    function trackDeviceInfo() {
        // Screen resolution
        const screenRes = `${screen.width}x${screen.height}`;
        trackEvent('screen_resolution', 'technical', screenRes);
        
        // Viewport size
        const viewportSize = `${window.innerWidth}x${window.innerHeight}`;
        trackEvent('viewport_size', 'technical', viewportSize);
        
        // Device type estimation
        const isMobile = window.innerWidth <= 768;
        const isTablet = window.innerWidth > 768 && window.innerWidth <= 1024;
        const deviceType = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';
        trackEvent('device_type', 'technical', deviceType);
        
        // OS detection (basic)
        const userAgent = navigator.userAgent;
        let os = 'unknown';
        if (userAgent.includes('Windows')) os = 'windows';
        else if (userAgent.includes('Mac')) os = 'mac';
        else if (userAgent.includes('Linux')) os = 'linux';
        else if (userAgent.includes('Android')) os = 'android';
        else if (userAgent.includes('iOS')) os = 'ios';
        
        trackEvent('operating_system', 'technical', os);
    }

    // Send data to other analytics platforms
    function trackToOtherPlatforms(action, category, label, value) {
        // Facebook Pixel (if implemented)
        if (typeof fbq !== 'undefined') {
            if (action === 'phone_call' || action === 'form_submit') {
                fbq('track', 'Lead');
            } else if (category === 'engagement') {
                fbq('track', 'ViewContent');
            }
        }
        
        // Additional platforms can be added here
        // LinkedIn Insight Tag, Twitter Pixel, etc.
    }

    // Utility function to get section name from element
    function getElementSection(element) {
        const section = element.closest('section');
        if (section) {
            return section.id || section.className.split(' ')[0] || 'unknown';
        }
        
        const header = element.closest('header');
        if (header) return 'header';
        
        const footer = element.closest('footer');
        if (footer) return 'footer';
        
        return 'unknown';
    }

    // Enhanced error tracking
    window.addEventListener('error', function(e) {
        trackEvent('js_error', 'error', e.message + ' (' + e.filename + ':' + e.lineno + ')');
    });
    
    window.addEventListener('unhandledrejection', function(e) {
        trackEvent('promise_rejection', 'error', e.reason);
    });

    // Track 404 errors and broken links
    document.addEventListener('click', function(e) {
        if (e.target.tagName === 'A') {
            const href = e.target.href;
            if (href && href.startsWith(window.location.origin)) {
                // Track internal link clicks
                fetch(href, { method: 'HEAD' }).catch(() => {
                    trackEvent('broken_link', 'error', href);
                });
            }
        }
    });

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAnalytics);
    } else {
        initAnalytics();
    }

    // Debug function for testing
    window.debugAnalytics = function() {
        console.log('Analytics Debug Info:');
        console.log('Config:', ANALYTICS_CONFIG);
        console.log('Google Analytics loaded:', typeof gtag !== 'undefined');
        console.log('Page URL:', window.location.href);
        console.log('Page Title:', document.title);
        
        // Test event
        trackEvent('debug_test', 'debug', 'manual_trigger');
    };

})();

// CSS for analytics-related UI elements
const analyticsCSS = `
/* Hide analytics elements */
.analytics-pixel {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    width: 1px !important;
    height: 1px !important;
    position: absolute !important;
    top: -9999px !important;
}

/* Loading indicators for forms */
.form-loading {
    position: relative;
    pointer-events: none;
    opacity: 0.6;
}

.form-loading::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 20px;
    height: 20px;
    border: 2px solid #dc2626;
    border-top: 2px solid transparent;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    transform: translate(-50%, -50%);
}

@keyframes spin {
    0% { transform: translate(-50%, -50%) rotate(0deg); }
    100% { transform: translate(-50%, -50%) rotate(360deg); }
}
`;

// Inject analytics CSS
const analyticsStyle = document.createElement('style');
analyticsStyle.textContent = analyticsCSS;
document.head.appendChild(analyticsStyle);