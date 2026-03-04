class SplitScreenHeroSlider extends HTMLElement {
  constructor() {
    super();
    /** @type {any|null} */
    this.swiper = null;
    this._initPromise = null;
    /** @type {IntersectionObserver|null} */
    this._animationObserver = null;
  }

  connectedCallback() {
    const root = this;
    const swiperEl = root.querySelector('[data-split-screen-hero-swiper]');
    if (!swiperEl) return;

    if (this._initPromise) return;

    const getSwiperFromGlobal = () => /** @type {any} */ (globalThis).Swiper;

    const prefersReducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const autoplayEnabled = root.dataset.autoplay === 'true' && !prefersReducedMotion;
    const autoplayDelay = Number(root.dataset.autoplayDelay || '6000');
    const loop = root.dataset.loop === 'true';
    const keyboard = root.dataset.keyboard === 'true';

    const ensureSwiperCss = () => {
      if (document.querySelector('link[data-swiper-css]')) return;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css';
      link.dataset.swiperCss = 'true';
      document.head.appendChild(link);
    };

    const loadSwiper = async () => {
      const existingSwiper = getSwiperFromGlobal();
      if (existingSwiper) return existingSwiper;
      ensureSwiperCss();

      const existing = document.querySelector('script[data-swiper-js]');
      if (existing) {
        await new Promise((resolve, reject) => {
          existing.addEventListener('load', resolve, { once: true });
          existing.addEventListener('error', reject, { once: true });
        });
        return getSwiperFromGlobal();
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js';
      script.async = true;
      script.dataset.swiperJs = 'true';
      document.head.appendChild(script);

      await new Promise((resolve, reject) => {
        script.addEventListener('load', resolve, { once: true });
        script.addEventListener('error', reject, { once: true });
      });

      return getSwiperFromGlobal();
    };

    const init = async () => {
      /** @type {any} */
      let SwiperCtor;
      try {
        SwiperCtor = await loadSwiper();
      } catch (e) {
        return;
      }

      if (!SwiperCtor) return;

      const paginationEl = root.querySelector('.sshs-pagination');
      const prevEl = root.querySelector('.sshs-arrow--prev');
      const nextEl = root.querySelector('.sshs-arrow--next');

      if (this.swiper) return;

      this.swiper = new SwiperCtor(swiperEl, {
        loop,
        speed: 850,
        grabCursor: true,
        watchSlidesProgress: true,
        resistanceRatio: 0.75,
        a11y: true,
        observer: true,
        observeParents: true,
        keyboard: keyboard ? { enabled: true } : false,
        autoplay: autoplayEnabled
          ? {
              delay: autoplayDelay,
              disableOnInteraction: false,
              pauseOnMouseEnter: true,
            }
          : false,
        navigation:
          prevEl && nextEl
            ? {
                prevEl,
                nextEl,
              }
            : undefined,
        pagination: paginationEl
          ? {
              el: paginationEl,
              clickable: true,
            }
          : undefined,
        on: {
          slideChangeTransitionStart(/** @type {any} */ swiper) {
            // Trigger any per-slide video hooks if needed later
            const active = swiper.slides[swiper.activeIndex];
            if (!active) return;
            // Re-trigger animations on slide change
            root._triggerSlideAnimations(active);
          },
        },
      });

      // Initialize scroll animations after swiper is ready
      root._initScrollAnimations();
    };

    this._initPromise = init();
  }

  /**
   * Initialize scroll-triggered animations using Intersection Observer
   */
  _initScrollAnimations() {
    const root = this;
    const prefersReducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    if (prefersReducedMotion) {
      // If reduced motion is preferred, show all elements immediately
      root.querySelectorAll('.sshs-animate--fade-up, .sshs-animate--fade-down, .sshs-animate--fade-left, .sshs-animate--fade-right, .sshs-animate--scale-in, .sshs-animate--zoom-in, .sshs-animate--bounce-in, .sshs-animate--slide-bottom, .sshs-animate--slide-top').forEach((el) => {
        el.classList.add('sshs-animated');
      });
      return;
    }

    // Create Intersection Observer for scroll animations
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            // Add animated class to trigger animation
            el.classList.add('sshs-animated');
            // Stop observing this element
            observer.unobserve(el);
          }
        });
      },
      {
        root: null,
        rootMargin: '0px 0px -50px 0px',
        threshold: 0.1,
      }
    );

    this._animationObserver = observer;

    // Observe all animation elements
    root.querySelectorAll('.sshs-animate--fade-up, .sshs-animate--fade-down, .sshs-animate--fade-left, .sshs-animate--fade-right, .sshs-animate--scale-in, .sshs-animate--zoom-in, .sshs-animate--bounce-in, .sshs-animate--slide-bottom, .sshs-animate--slide-top').forEach((el) => {
      observer.observe(el);
    });

    // Also observe stagger containers
    root.querySelectorAll('.sshs-stagger').forEach((container) => {
      container.querySelectorAll(':scope > *').forEach((child) => {
        observer.observe(child);
      });
    });
  }

  /**
   * Trigger animations on a specific slide
   * @param {HTMLElement} slide
   */
  _triggerSlideAnimations(slide) {
    const prefersReducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (prefersReducedMotion) return;

    // Reset and re-trigger animations for the active slide
    const animatedElements = slide.querySelectorAll('.sshs-animate--fade-up, .sshs-animate--fade-down, .sshs-animate--fade-left, .sshs-animate--fade-right, .sshs-animate--scale-in, .sshs-animate--zoom-in, .sshs-animate--bounce-in, .sshs-animate--slide-bottom, .sshs-animate--slide-top');

    animatedElements.forEach((el) => {
      // Remove animated class to reset
      el.classList.remove('sshs-animated');
      // Force reflow
      void /** @type {HTMLElement} */ (el).offsetWidth;
      // Re-add animated class to trigger animation
      el.classList.add('sshs-animated');
    });
  }

  disconnectedCallback() {
    if (this.swiper && typeof this.swiper.destroy === 'function') {
      this.swiper.destroy(true, true);
    }
    if (this._animationObserver) {
      this._animationObserver.disconnect();
    }
    this.swiper = null;
    this._initPromise = null;
    this._animationObserver = null;
  }
}

/**
 * Page Loading Animation Controller
 * Handles the loading overlay and fade-in effects
 */
class SSHSPageLoader {
  constructor() {
    this.overlay = null;
    this.init();
  }

  init() {
    // Check if page load animation is enabled
    const slider = /** @type {HTMLElement} */ (document.querySelector('split-screen-hero-slider'));
    if (!slider) return;

    const enablePageLoad = slider.dataset.pageLoadAnimation === 'true';
    if (!enablePageLoad) return;

    // Create loading overlay
    this._createOverlay();

    // Hide overlay when page is fully loaded
    if (document.readyState === 'complete') {
      this._hideOverlay();
    } else {
      window.addEventListener('load', () => this._hideOverlay());
    }

    // Fallback: hide overlay after 3 seconds max
    setTimeout(() => this._hideOverlay(), 3000);
  }

  _createOverlay() {
    // Check if overlay already exists
    if (document.querySelector('.sshs-page-load-overlay')) return;

    const slider = /** @type {HTMLElement} */ (document.querySelector('split-screen-hero-slider'));
    const bgColor = slider?.dataset.pageLoadBg || '#ffffff';

    this.overlay = document.createElement('div');
    this.overlay.className = 'sshs-page-load-overlay';
    this.overlay.style.setProperty('--sshs-page-load-bg', bgColor);
    this.overlay.innerHTML = `
      <div class="sshs-spinner" style="color: #333;"></div>
    `;

    document.body.appendChild(this.overlay);
  }

  _hideOverlay() {
    if (!this.overlay) {
      this.overlay = /** @type {HTMLDivElement} */ (document.querySelector('.sshs-page-load-overlay'));
    }
    if (this.overlay) {
      this.overlay.classList.add('sshs-loaded');
      // Remove from DOM after transition
      setTimeout(() => {
        this.overlay?.remove();
      }, 600);
    }
  }
}

/**
 * Scroll Animation Observer for elements outside the slider
 * Can be used for any element with animation classes
 */
class SSHSScrollAnimationObserver {
  constructor() {
    this.observer = null;
    this.init();
  }

  init() {
    const prefersReducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (prefersReducedMotion) {
      // Show all animated elements immediately
      document.querySelectorAll('.sshs-animate--fade-up, .sshs-animate--fade-down, .sshs-animate--fade-left, .sshs-animate--fade-right, .sshs-animate--scale-in, .sshs-animate--zoom-in, .sshs-animate--bounce-in, .sshs-animate--slide-bottom, .sshs-animate--slide-top').forEach((el) => {
        el.classList.add('sshs-animated');
      });
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('sshs-animated');
            this.observer?.unobserve(entry.target);
          }
        });
      },
      {
        root: null,
        rootMargin: '0px 0px -50px 0px',
        threshold: 0.1,
      }
    );

    // Observe all animation elements in document
    document.querySelectorAll('.sshs-animate--fade-up, .sshs-animate--fade-down, .sshs-animate--fade-left, .sshs-animate--fade-right, .sshs-animate--scale-in, .sshs-animate--zoom-in, .sshs-animate--bounce-in, .sshs-animate--slide-bottom, .sshs-animate--slide-top').forEach((el) => {
      this.observer?.observe(el);
    });
  }

  destroy() {
    this.observer?.disconnect();
    this.observer = null;
  }
}

// Initialize custom elements
if (!customElements.get('split-screen-hero-slider')) {
  customElements.define('split-screen-hero-slider', SplitScreenHeroSlider);
}

// Initialize page loader and scroll observer when DOM is ready
let pageLoader = null;
let scrollObserver = null;

const initAnimations = () => {
  pageLoader = new SSHSPageLoader();
  scrollObserver = new SSHSScrollAnimationObserver();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAnimations);
} else {
  initAnimations();
}

// Export for external use (classes are already globally available via class definition)
// These exports are just for explicit access if needed
