/**
 * 🎯 نظام تحجيم الإعلانات الذكية للهواتف - الحل النهائي
 */
class MobileAdScaler {
  constructor() {
    this.isMobile = window.innerWidth <= 768;
    this.observer = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    
    console.log('📱 بدء نظام تحجيم الإعلانات للهواتف...');
    
    this.addMobileAdStyles();
    this.setupMutationObserver();
    
    setTimeout(() => this.processExistingAds(), 1000);
    
    window.addEventListener('resize', () => {
      setTimeout(() => this.processAllAds(), 300);
    });
    
    this.initialized = true;
  }

  addMobileAdStyles() {
    const style = document.createElement('style');
    style.id = 'mobile-ad-scaler-styles';
    style.textContent = `
      @media (max-width: 768px) {
        .mobile-ad-wrapper {
          width: 100% !important;
          max-width: 100vw !important;
          overflow: hidden !important;
          position: relative;
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          background: transparent !important;
          margin: 10px 0 !important;
          padding: 0 !important;
          box-sizing: border-box !important;
        }
        
        .mobile-ad-wrapper iframe,
        .mobile-ad-wrapper ins,
        .mobile-ad-wrapper div[id*="ad"],
        .mobile-ad-wrapper div[class*="ad"],
        .mobile-ad-wrapper .adsbygoogle {
          width: 100% !important;
          max-width: 100% !important;
          height: auto !important;
          min-height: 50px !important;
          max-height: 400px !important;
          overflow: hidden !important;
          display: block !important;
          margin: 0 auto !important;
          transform: none !important;
          position: relative !important;
          box-sizing: border-box !important;
        }
        
        ins.adsbygoogle,
        .adsbygoogle iframe {
          width: 100% !important;
          max-width: 100% !important;
          height: auto !important;
          min-height: 90px !important;
          max-height: 300px !important;
        }
        
        html, body {
          overflow-x: hidden !important;
          position: relative;
          width: 100%;
        }
      }
    `;
    document.head.appendChild(style);
  }

  wrapAdElement(adElement) {
    if (!adElement || adElement.closest('.mobile-ad-wrapper')) return;
    
    const wrapper = document.createElement('div');
    wrapper.className = 'mobile-ad-wrapper';
    adElement.parentNode.insertBefore(wrapper, adElement);
    wrapper.appendChild(adElement);
    
    this.applyMobileFixes(adElement);
  }

  applyMobileFixes(adElement) {
    if (!this.isMobile) return;
    
    adElement.style.width = '100%';
    adElement.style.maxWidth = '100%';
    adElement.style.height = 'auto';
    adElement.style.minHeight = '50px';
    adElement.style.overflow = 'hidden';
    adElement.style.display = 'block';
    adElement.style.margin = '0 auto';
  }

  processExistingAds() {
    const adSelectors = [
      'iframe[src*="ads"]',
      'iframe[src*="ad"]',
      'ins.adsbygoogle',
      'div[id*="ad-"]',
      'div[class*="ad-"]',
      'div[id*="banner-"]',
      '.ad-banner',
      '.ad-container'
    ];
    
    adSelectors.forEach(selector => {
      try {
        document.querySelectorAll(selector).forEach(ad => {
          this.wrapAdElement(ad);
        });
      } catch (e) {}
    });
  }

  processAllAds() {
    this.isMobile = window.innerWidth <= 768;
    if (this.isMobile) {
      document.querySelectorAll('.mobile-ad-wrapper').forEach(wrapper => {
        const adElement = wrapper.firstElementChild;
        if (adElement) this.applyMobileFixes(adElement);
      });
    }
  }

  setupMutationObserver() {
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) {
              if (this.isAdElement(node)) {
                setTimeout(() => this.wrapAdElement(node), 100);
              }
              node.querySelectorAll('iframe, ins, div[id*="ad"]').forEach(ad => {
                if (this.isAdElement(ad)) {
                  setTimeout(() => this.wrapAdElement(ad), 100);
                }
              });
            }
          });
        }
      });
    });
    
    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  isAdElement(element) {
    const src = element.src || '';
    const id = element.id || '';
    const className = element.className || '';
    return (
      src.includes('ads') ||
      src.includes('ad') ||
      id.includes('ad') ||
      id.includes('banner') ||
      className.includes('adsbygoogle') ||
      className.includes('ad-')
    );
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const mobileAdScaler = new MobileAdScaler();
    mobileAdScaler.init();
    window.mobileAdScaler = mobileAdScaler;
  }, 2000);
});
