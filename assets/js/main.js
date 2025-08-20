/* PhoenixRCS - Main JavaScript */

(function() {
    'use strict';

    // DOM Content Loaded
    document.addEventListener('DOMContentLoaded', function() {
        // Initialize all functionality
        initMobileMenu();
        initSmoothScrolling();
        initHeaderScroll();
        initFloatingButton();
        initLazyLoading();
        initFormValidation();
        initClickTracking();
        initScrollAnimations();
        initCounterAnimations();
        initAccessibility();
    });

    // Mobile Menu Functionality
    function initMobileMenu() {
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const navMenu = document.getElementById('navMenu');
        
        if (!mobileMenuBtn || !navMenu) return;

        // Ensure menu starts closed immediately (no flash)
        mobileMenuBtn.classList.remove('active');
        navMenu.classList.remove('active');
        document.body.style.overflow = '';
        
        // Reset hamburger icon to initial state
        mobileMenuBtn.setAttribute('aria-expanded', 'false');

        mobileMenuBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Toggle menu with proper state management
            const isActive = this.classList.contains('active');
            
            if (isActive) {
                // Close menu
                this.classList.remove('active');
                navMenu.classList.remove('active');
                document.body.style.overflow = '';
                this.setAttribute('aria-expanded', 'false');
            } else {
                // Open menu
                this.classList.add('active');
                navMenu.classList.add('active');
                document.body.style.overflow = 'hidden';
                this.setAttribute('aria-expanded', 'true');
            }
            
            // Track menu usage
            if (typeof trackEvent === 'function') {
                trackEvent('mobile_menu', 'navigation', !isActive ? 'open' : 'close');
            }
        });

        // Handle navigation link clicks - close menu after selection
        const navLinks = navMenu.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                // Small delay to allow link action to complete
                setTimeout(() => {
                    mobileMenuBtn.classList.remove('active');
                    navMenu.classList.remove('active');
                    document.body.style.overflow = '';
                    mobileMenuBtn.setAttribute('aria-expanded', 'false');
                }, 300);
            });
        });

        // Close menu on escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && navMenu.classList.contains('active')) {
                mobileMenuBtn.classList.remove('active');
                navMenu.classList.remove('active');
                document.body.style.overflow = '';
                mobileMenuBtn.setAttribute('aria-expanded', 'false');
            }
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (navMenu.classList.contains('active') && 
                !navMenu.contains(e.target) && 
                !mobileMenuBtn.contains(e.target)) {
                mobileMenuBtn.classList.remove('active');
                navMenu.classList.remove('active');
                document.body.style.overflow = '';
                mobileMenuBtn.setAttribute('aria-expanded', 'false');
            }
        });
        
        // Ensure menu is hidden on window resize to desktop
        window.addEventListener('resize', function() {
            if (window.innerWidth > 768) {
                mobileMenuBtn.classList.remove('active');
                navMenu.classList.remove('active');
                document.body.style.overflow = '';
                mobileMenuBtn.setAttribute('aria-expanded', 'false');
            }
        });
    }

    // Smooth Scrolling for Anchor Links
    function initSmoothScrolling() {
        const links = document.querySelectorAll('a[href^="#"]');
        
        links.forEach(link => {
            link.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                
                // Skip if empty hash
                if (href === '#') return;
                
                const targetId = href.substring(1);
                const targetElement = document.getElementById(targetId);
                
                if (targetElement) {
                    e.preventDefault();
                    
                    // Calculate offset for fixed header with precise section positioning
                    const header = document.querySelector('.header');
                    const headerHeight = header ? header.getBoundingClientRect().height : 0;
                    // Increased offset to ensure clean section starts without previous section bleeding
                    const additionalOffset = 20; 
                    
                    // Get accurate position accounting for current scroll
                    const elementPosition = targetElement.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerHeight - additionalOffset;
                    
                    // Smooth scroll to calculated position
                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                    
                    // Close mobile menu if open
                    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
                    const navMenu = document.getElementById('navMenu');
                    if (navMenu && navMenu.classList.contains('active')) {
                        mobileMenuBtn.classList.remove('active');
                        navMenu.classList.remove('active');
                        document.body.style.overflow = '';
                    }
                    
                    // Update URL without jumping
                    history.pushState(null, null, href);
                    
                    // Focus management for accessibility
                    setTimeout(() => {
                        targetElement.setAttribute('tabindex', '-1');
                        targetElement.focus({ preventScroll: true });
                    }, 600);
                }
            });
        });
    }

    // Header Scroll Effects
    function initHeaderScroll() {
        const header = document.querySelector('.header');
        if (!header) return;

        let lastScrollY = window.scrollY;
        let ticking = false;

        function updateHeader() {
            const scrollY = window.scrollY;
            
            // Add shadow when scrolled
            if (scrollY > 10) {
                header.style.boxShadow = '0 2px 20px rgba(0,0,0,0.15)';
            } else {
                header.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
            }
            
            // Hide/show header on scroll (optional enhancement)
            if (scrollY > 100) {
                if (scrollY > lastScrollY && scrollY > 200) {
                    // Scrolling down - hide header
                    header.style.transform = 'translateY(-100%)';
                } else {
                    // Scrolling up - show header
                    header.style.transform = 'translateY(0)';
                }
            }
            
            lastScrollY = scrollY;
            ticking = false;
        }

        function requestTick() {
            if (!ticking) {
                requestAnimationFrame(updateHeader);
                ticking = true;
            }
        }

        window.addEventListener('scroll', requestTick, { passive: true });
    }

    // Floating Call Button Animation
    function initFloatingButton() {
        const floatingBtn = document.querySelector('.float-btn');
        if (!floatingBtn) return;

        // Show/hide based on scroll position
        function toggleFloatingButton() {
            const scrollPosition = window.scrollY;
            const windowHeight = window.innerHeight;
            
            if (scrollPosition > windowHeight * 0.5) {
                floatingBtn.style.opacity = '1';
                floatingBtn.style.visibility = 'visible';
            } else {
                floatingBtn.style.opacity = '0';
                floatingBtn.style.visibility = 'hidden';
            }
        }

        window.addEventListener('scroll', throttle(toggleFloatingButton, 100), { passive: true });
        
        // Initial state
        toggleFloatingButton();
    }

    // Lazy Loading for Images (if any are added later)
    function initLazyLoading() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        imageObserver.unobserve(img);
                    }
                });
            });

            const lazyImages = document.querySelectorAll('img[data-src]');
            lazyImages.forEach(img => imageObserver.observe(img));
        }
    }

    // Form Validation (for future contact form)
    function initFormValidation() {
        const forms = document.querySelectorAll('form');
        
        forms.forEach(form => {
            form.addEventListener('submit', function(e) {
                if (!validateForm(this)) {
                    e.preventDefault();
                    return false;
                }
                
                // Track form submission
                if (typeof trackEvent === 'function') {
                    trackEvent('form_submit', 'engagement', 'contact_form');
                }
            });
        });
    }

    function validateForm(form) {
        let isValid = true;
        const requiredFields = form.querySelectorAll('[required]');
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                showFieldError(field, 'This field is required');
                isValid = false;
            } else {
                clearFieldError(field);
            }
        });
        
        // Email validation
        const emailFields = form.querySelectorAll('input[type="email"]');
        emailFields.forEach(field => {
            if (field.value && !isValidEmail(field.value)) {
                showFieldError(field, 'Please enter a valid email address');
                isValid = false;
            }
        });
        
        // Phone validation
        const phoneFields = form.querySelectorAll('input[type="tel"]');
        phoneFields.forEach(field => {
            if (field.value && !isValidPhone(field.value)) {
                showFieldError(field, 'Please enter a valid phone number');
                isValid = false;
            }
        });
        
        return isValid;
    }

    function showFieldError(field, message) {
        clearFieldError(field);
        
        field.classList.add('error');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.textContent = message;
        errorDiv.setAttribute('role', 'alert');
        
        field.parentNode.appendChild(errorDiv);
    }

    function clearFieldError(field) {
        field.classList.remove('error');
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function isValidPhone(phone) {
        return /^[\d\s\-\+\(\)\.]+$/.test(phone) && phone.replace(/\D/g, '').length >= 10;
    }

    // Click Tracking for Analytics
    function initClickTracking() {
        // Track all CTA button clicks
        const ctaButtons = document.querySelectorAll('.btn-primary, .btn-secondary, .btn-service, .header-cta, .float-btn');
        
        ctaButtons.forEach(button => {
            button.addEventListener('click', function() {
                const buttonText = this.textContent.trim();
                const buttonClass = this.className;
                
                if (typeof trackEvent === 'function') {
                    trackEvent('cta_click', 'engagement', buttonClass);
                }
                
                console.log('CTA Click:', buttonText, buttonClass);
            });
        });
        
        // Track phone number clicks specifically
        const phoneLinks = document.querySelectorAll('a[href^="tel:"]');
        phoneLinks.forEach(link => {
            link.addEventListener('click', function() {
                const section = this.closest('section')?.id || 'unknown';
                
                if (typeof trackEvent === 'function') {
                    trackEvent('phone_click', 'conversion', section);
                }
                
                console.log('Phone Click:', section);
            });
        });
        
        // Track scroll depth
        let scrollDepth = {
            '25': false,
            '50': false,
            '75': false,
            '100': false
        };
        
        function trackScrollDepth() {
            const scrollPercent = Math.round(
                (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
            );
            
            Object.keys(scrollDepth).forEach(depth => {
                if (scrollPercent >= parseInt(depth) && !scrollDepth[depth]) {
                    scrollDepth[depth] = true;
                    
                    if (typeof trackEvent === 'function') {
                        trackEvent('scroll_depth', 'engagement', depth + '%');
                    }
                    
                    console.log('Scroll Depth:', depth + '%');
                }
            });
        }
        
        window.addEventListener('scroll', throttle(trackScrollDepth, 500), { passive: true });
    }

    // Scroll Animations (Intersection Observer)
    function initScrollAnimations() {
        if ('IntersectionObserver' in window) {
            const animationObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('animate-in');
                        animationObserver.unobserve(entry.target);
                    }
                });
            }, {
                rootMargin: '0px 0px 50px 0px',
                threshold: 0.05
            });

            // Animate elements on scroll - faster trigger
            const animateElements = document.querySelectorAll('.trust-item, .service-card, .process-step');
            animateElements.forEach((element, index) => {
                element.style.opacity = '0';
                element.style.transform = 'translateY(20px)';
                element.style.transition = `opacity 0.4s ease ${index * 0.05}s, transform 0.4s ease ${index * 0.05}s`;
                animationObserver.observe(element);
            });
        }
    }

    // Counter Animations for Statistics
    function initCounterAnimations() {
        if ('IntersectionObserver' in window) {
            const counterObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const counter = entry.target;
                        const targetCount = parseInt(counter.getAttribute('data-count'));
                        
                        animateCounter(counter, 0, targetCount, 2000);
                        counterObserver.unobserve(counter);
                    }
                });
            }, {
                threshold: 0.5
            });

            const counters = document.querySelectorAll('.stat-number[data-count]');
            counters.forEach(counter => {
                counterObserver.observe(counter);
            });
        }
    }

    function animateCounter(element, start, end, duration) {
        const range = end - start;
        const startTime = performance.now();
        
        function updateCounter(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease out animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const current = Math.floor(start + (range * easeOutQuart));
            
            element.textContent = current.toLocaleString();
            
            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            } else {
                element.textContent = end.toLocaleString();
            }
        }
        
        requestAnimationFrame(updateCounter);
    }

    // Accessibility Improvements
    function initAccessibility() {
        // Skip to main content link
        const skipLink = document.createElement('a');
        skipLink.href = '#hero';
        skipLink.textContent = 'Skip to main content';
        skipLink.className = 'skip-link';
        skipLink.style.cssText = `
            position: absolute;
            top: -40px;
            left: 6px;
            background: var(--primary-red);
            color: white;
            padding: 8px;
            text-decoration: none;
            border-radius: 4px;
            z-index: 1000;
            transition: top 0.3s;
        `;
        
        skipLink.addEventListener('focus', function() {
            this.style.top = '6px';
        });
        
        skipLink.addEventListener('blur', function() {
            this.style.top = '-40px';
        });
        
        document.body.insertBefore(skipLink, document.body.firstChild);
        
        // Enhance keyboard navigation
        document.addEventListener('keydown', function(e) {
            // ESC key closes any modals or dropdowns (future enhancement)
            if (e.key === 'Escape') {
                // Close any open modals/dropdowns
                console.log('ESC pressed - close modals');
            }
            
            // Tab navigation improvement
            if (e.key === 'Tab') {
                document.body.classList.add('keyboard-nav');
            }
        });
        
        // Remove keyboard navigation class on mouse use
        document.addEventListener('mousedown', function() {
            document.body.classList.remove('keyboard-nav');
        });
        
        // ARIA live region for dynamic content
        const liveRegion = document.createElement('div');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.className = 'sr-only';
        liveRegion.id = 'live-region';
        document.body.appendChild(liveRegion);
    }

    // Utility Functions
    function throttle(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Global click tracking functions (called from HTML)
    window.trackCall = function(source) {
        console.log('Phone call tracked:', source);
        if (typeof trackEvent === 'function') {
            trackEvent('phone_call', 'conversion', source);
        }
    };

    window.trackClick = function(element) {
        console.log('Click tracked:', element);
        if (typeof trackEvent === 'function') {
            trackEvent('button_click', 'engagement', element);
        }
    };

    // Performance monitoring
    window.addEventListener('load', function() {
        // Log load time
        const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
        console.log('Page load time:', loadTime + 'ms');
        
        if (typeof trackEvent === 'function') {
            trackEvent('page_load_time', 'performance', Math.round(loadTime / 1000) + 's');
        }
    });

    // Error handling
    window.addEventListener('error', function(e) {
        console.error('JavaScript error:', e.error);
        
        if (typeof trackEvent === 'function') {
            trackEvent('js_error', 'error', e.message);
        }
    });

})();

// Add CSS for animations
const animationCSS = `
.animate-in {
    opacity: 1 !important;
    transform: translateY(0) !important;
}

.skip-link:focus {
    top: 6px !important;
}

.sr-only {
    position: absolute !important;
    width: 1px !important;
    height: 1px !important;
    padding: 0 !important;
    margin: -1px !important;
    overflow: hidden !important;
    clip: rect(0, 0, 0, 0) !important;
    white-space: nowrap !important;
    border: 0 !important;
}

.keyboard-nav *:focus {
    outline: 3px solid var(--primary-red) !important;
    outline-offset: 2px !important;
}

.field-error {
    color: #dc2626;
    font-size: 0.875rem;
    margin-top: 0.25rem;
}

.error {
    border-color: #dc2626 !important;
    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1) !important;
}

@media (prefers-reduced-motion: reduce) {
    * {
        transition: none !important;
        animation: none !important;
    }
}
`;

// Inject animation CSS
const style = document.createElement('style');
style.textContent = animationCSS;
document.head.appendChild(style);