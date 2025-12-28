/**
 * 🎯 نظام إدارة الإعلانات الذكي - النسخة المصححة
 * يعمل مع ads.json بشكل كامل
 * جميع الإعلانات من الشركة الإعلانية مدمجة
 */

class AdsManager {
  constructor() {
    this.config = null;
    this.rotationTimers = {};
    this.sessionData = this.getSessionData();
    this.isAdBlockDetected = false;
    this.adElements = new Map(); // تتبع العناصر المنشأة
  }

  // === 1. تحميل الإعدادات ===
  async init() {
    try {
      // تجاهل أخطاء Unity الداخلية
      this.filterUnityErrors();
      
      // فحص وإصلاح الحاويات أولاً
      this.fixAdContainers();
      
      const response = await fetch('ads.json');
      if (!response.ok) throw new Error('Failed to load ads.json');
      
      this.config = await response.json();
      console.log('✅ تم تحميل إعدادات الإعلانات');
      
      // تشغيل جميع الإعلانات بالتسلسل
      await this.loadAdsSequentially();
      
      console.log('🎯 تم تفعيل جميع الإعلانات بنجاح');
      
    } catch (error) {
      console.error('❌ خطأ في تحميل الإعلانات:', error);
      this.showFallbackAds(); // عرض إعلانات فولباك
    }
  }

  // === 2. كشف AdBlock بسيط ===
  detectAdBlock() {
    const adBlockTest = document.createElement('div');
    adBlockTest.innerHTML = '&nbsp;';
    adBlockTest.className = 'adsbox';
    adBlockTest.style.cssText = 'height:1px;width:1px;position:absolute;left:-9999px;';
    document.body.appendChild(adBlockTest);
    
    setTimeout(() => {
      if (adBlockTest.offsetHeight === 0) {
        this.isAdBlockDetected = true;
        console.log('⚠️ تم اكتشاف AdBlock');
      }
      document.body.removeChild(adBlockTest);
    }, 100);
  }

  // === 3. تحميل Popunder ===
  loadPopunder() {
    if (!this.config.popunder?.enabled) return;
    
    const frequency = this.config.popunder.frequency;
    if (frequency === 'once_per_session' && this.sessionData.popunderShown) {
      return;
    }
    
    setTimeout(() => {
      if (this.isAdBlockDetected) return;
      
      this.config.popunder.scripts.forEach(scriptUrl => {
        const script = document.createElement('script');
        script.src = scriptUrl;
        script.async = true;
        document.body.appendChild(script);
      });
      
      this.sessionData.popunderShown = true;
      this.saveSessionData();
    }, this.config.popunder.delay || 5000);
  }

  // === 4. تحميل البانرات ===
  async loadBanners() {
    // فوق iframe
    if (this.config.banners?.aboveIframe?.enabled) {
      this.loadBannerAd('ad-above-iframe', this.config.banners.aboveIframe);
    }
    
    // تحت iframe
    if (this.config.banners?.belowIframe?.enabled) {
      setTimeout(() => {
        this.loadBannerAd('ad-below-iframe', this.config.banners.belowIframe);
      }, 1000);
    }
    
    // أسفل الصفحة
    if (this.config.banners?.pageBottom?.enabled) {
      setTimeout(() => {
        this.loadBannerAd('ad-page-bottom', this.config.banners.pageBottom);
      }, 1500);
    }
  }

  loadBannerAd(containerId, bannerConfig) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`❌ Container ${containerId} not found`);
      return;
    }
    
    container.innerHTML = '';
    
    const ads = bannerConfig.ads;
    if (!ads || ads.length === 0) {
      this.showFallbackBanner(container, bannerConfig);
      return;
    }
    
    // تحميل أول إعلان
    this.loadSingleAd(container, ads[0], containerId);
    
    // التدوير إذا كان مفعل
    if (bannerConfig.rotation && ads.length > 1) {
      let currentIndex = 0;
      const interval = bannerConfig.rotationInterval || 30000;
      
      this.rotationTimers[containerId] = setInterval(() => {
        currentIndex = (currentIndex + 1) % ads.length;
        this.loadSingleAd(container, ads[currentIndex], containerId);
      }, interval);
    }
  }

  loadSingleAd(container, ad, containerId) {
    if (!ad || !ad.script) {
      this.showFallbackBanner(container, {});
      return;
    }
    
    const adDiv = document.createElement('div');
    adDiv.className = 'ad-banner';
    adDiv.id = `ad-${ad.id}-${containerId}`;
    adDiv.innerHTML = `
      <div class="ad-label">Advertisement</div>
      <div id="banner-${ad.id}" style="text-align:center;min-height:${ad.config?.height || 90}px;"></div>
    `;
    
    container.innerHTML = '';
    container.appendChild(adDiv);
    
    // تحميل سكريبت الإعلان
    setTimeout(() => {
      if (ad.config) {
        window.atOptions = ad.config;
      }
      
      const script = document.createElement('script');
      script.src = ad.script;
      script.async = true;
      script.setAttribute('data-cfasync', 'false');
      script.onload = () => console.log(`✅ Ad ${ad.id} loaded`);
      script.onerror = () => {
        console.warn(`⚠️ Ad ${ad.id} failed`);
        this.showFallbackBanner(container, {});
      };
      
      document.getElementById(`banner-${ad.id}`).appendChild(script);
    }, 300);
  }

  showFallbackBanner(container, bannerConfig) {
    if (bannerConfig.fallbackHtml) {
      container.innerHTML = bannerConfig.fallbackHtml;
    } else {
      container.innerHTML = `
        <div class="ad-banner" style="background:linear-gradient(135deg,#1a2a6c,#b21f1f);padding:20px;border-radius:10px;text-align:center;">
          <div class="ad-label">Ad</div>
          <h4 style="color:#ffd700;margin:10px 0;">Support Our Site</h4>
          <p style="color:rgba(255,255,255,0.8);">Please consider disabling AdBlock</p>
          <a href="https://example.com" target="_blank" style="display:inline-block;background:#6c5ce7;color:white;padding:8px 20px;border-radius:5px;text-decoration:none;margin-top:10px;">
            Visit Sponsor
          </a>
        </div>
      `;
    }
  }

  // === 5. تحميل Native Banner ===
  loadNativeBanner() {
    if (!this.config.nativeBanner?.enabled) return;
    
    const sidebar = document.querySelector('.sidebar') || document.getElementById('ad-sidebar');
    if (!sidebar) return;
    
    if (document.querySelector('.native-ad-banner')) return;
    
    const container = document.createElement('div');
    container.className = 'ad-banner native-ad-banner';
    container.innerHTML = this.config.nativeBanner.html || '<div id="native-banner-container"></div>';
    
    sidebar.insertBefore(container, sidebar.firstChild);
    
    if (this.config.nativeBanner.script) {
      setTimeout(() => {
        const script = document.createElement('script');
        script.src = this.config.nativeBanner.script;
        script.async = true;
        container.appendChild(script);
      }, 1000);
    }
  }

  // === 6. تحميل إعلانات Sidebar ===
  loadSidebarAds() {
    if (!this.config.sidebarAd?.enabled) return;
    
    const container = document.getElementById('ad-sidebar');
    if (!container) return;
    
    const ads = this.config.sidebarAd.ads;
    if (!ads || ads.length === 0) {
      this.showFallbackSidebar(container);
      return;
    }
    
    this.loadSidebarAd(container, ads[0]);
    
    // التدوير
    if (this.config.sidebarAd.rotation && ads.length > 1) {
      let currentIndex = 0;
      const interval = this.config.sidebarAd.rotationInterval || 35000;
      
      this.rotationTimers['sidebar'] = setInterval(() => {
        currentIndex = (currentIndex + 1) % ads.length;
        this.loadSidebarAd(container, ads[currentIndex]);
      }, interval);
    }
  }

  loadSidebarAd(container, ad) {
    const adDiv = document.createElement('div');
    adDiv.className = 'ad-banner ad-sidebar';
    adDiv.innerHTML = `
      <div class="ad-label">Advertisement</div>
      <div id="sidebar-${ad.id}" style="text-align:center;min-height:${ad.config?.height || 300}px;"></div>
    `;
    
    container.innerHTML = '';
    container.appendChild(adDiv);
    
    setTimeout(() => {
      window.atOptions = ad.config;
      const script = document.createElement('script');
      script.src = ad.script;
      script.async = true;
      script.setAttribute('data-cfasync', 'false');
      document.getElementById(`sidebar-${ad.id}`).appendChild(script);
    }, 300);
  }

  showFallbackSidebar(container) {
    container.innerHTML = `
      <div class="ad-banner" style="background:rgba(0,0,0,0.7);border-radius:8px;padding:20px;text-align:center;">
        <div class="ad-label">Sponsored</div>
        <h4 style="color:#ffd700;margin:15px 0;">Premium Game Hosting</h4>
        <p style="color:rgba(255,255,255,0.8);">Fast, reliable hosting for HTML5 games</p>
        <a href="https://example.com" target="_blank" style="display:inline-block;background:#6c5ce7;color:white;padding:8px 16px;border-radius:5px;text-decoration:none;">
          Learn More
        </a>
      </div>
    `;
  }

  // === 7. تحميل Smartlink ===
  loadSmartlink() {
    if (!this.config.smartlink?.enabled) return;
    
    const frequency = this.config.smartlink.frequency;
    if (frequency === 'once_per_session' && this.sessionData.smartlinkOpened) {
      return;
    }
    
    const openSmartlink = () => {
      setTimeout(() => {
        if (this.isAdBlockDetected) return;
        
        if (this.config.smartlink.openInNewTab) {
          window.open(this.config.smartlink.url, '_blank', 'noopener,noreferrer');
        } else {
          window.location.href = this.config.smartlink.url;
        }
        
        this.sessionData.smartlinkOpened = true;
        this.saveSessionData();
      }, this.config.smartlink.delay || 2000);
    };
    
    // كشف تحميل اللعبة
    const checkGameLoaded = (attempt = 1) => {
      const iframe = document.getElementById('game-iframe');
      
      if (iframe && iframe.contentWindow) {
        openSmartlink();
      } else if (attempt < 10) {
        setTimeout(() => checkGameLoaded(attempt + 1), 1000);
      } else {
        openSmartlink(); // فتح بعد 10 محاولات
      }
    };
    
    setTimeout(() => checkGameLoaded(), 3000);
  }

  // === 8. تحميل Interstitial ===
  loadInterstitial() {
    if (!this.config.interstitialAd?.enabled) return;
    
    const frequency = this.config.interstitialAd.frequency;
    if (frequency === 'once_per_session' && this.sessionData.interstitialShown) {
      return;
    }
    
    setTimeout(() => {
      if (this.isAdBlockDetected) return;
      
      const overlay = document.createElement('div');
      overlay.id = 'interstitial-overlay';
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);z-index:999999;';
      
      overlay.innerHTML = this.config.interstitialAd.html || `
        <div style="background:white;padding:30px;border-radius:15px;max-width:700px;margin:100px auto;">
          <h2>Advertisement</h2>
          <div id="interstitial-content" style="min-height:300px;background:#f5f5f5;"></div>
        </div>
      `;
      
      document.body.appendChild(overlay);
      
      if (this.config.interstitialAd.script) {
        const script = document.createElement('script');
        script.src = this.config.interstitialAd.script;
        script.async = true;
        document.getElementById('interstitial-content').appendChild(script);
      }
      
      this.sessionData.interstitialShown = true;
      this.saveSessionData();
    }, this.config.interstitialAd.delay || 10000);
  }

  // === 9. إدارة الجلسة ===
  getSessionData() {
    const data = sessionStorage.getItem('adsSessionData');
    return data ? JSON.parse(data) : {
      popunderShown: false,
      smartlinkOpened: false,
      interstitialShown: false
    };
  }

  saveSessionData() {
    sessionStorage.setItem('adsSessionData', JSON.stringify(this.sessionData));
  }

  // === 10. تحميل الإعلانات بالتسلسل ===
  async loadAdsSequentially() {
    // 1. كشف AdBlock
    this.detectAdBlock();
    
    // 2. إعلانات سريعة
    this.loadNativeBanner();
    this.loadSidebarAds();
    
    // 3. بانرات اللعبة
    await this.delay(1000);
    this.loadBanners();
    
    // 4. إعلانات تفاعلية
    await this.delay(2000);
    this.loadPopunder();
    this.loadSmartlink();
    this.loadInterstitial();
  }

  // === 11. فحص وإصلاح الحاويات ===
  fixAdContainers() {
    ['ad-above-iframe', 'ad-below-iframe', 'ad-page-bottom', 'ad-sidebar'].forEach(containerId => {
      let container = document.getElementById(containerId);
      
      if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        container.style.cssText = 'min-height:50px;';
        
        if (containerId === 'ad-sidebar') {
          const sidebar = document.querySelector('.sidebar');
          if (sidebar) sidebar.prepend(container);
        } else {
          const gameContainer = document.querySelector('.game-container');
          if (gameContainer) gameContainer.appendChild(container);
        }
      }
    });
  }

  // === 12. عرض إعلانات فولباك ===
  showFallbackAds() {
    const containers = [
      'ad-above-iframe',
      'ad-below-iframe', 
      'ad-page-bottom',
      'ad-sidebar'
    ];
    
    containers.forEach(containerId => {
      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML = `
          <div class="ad-banner" style="background:linear-gradient(135deg,#1a2a6c,#b21f1f);padding:15px;border-radius:8px;text-align:center;">
            <div class="ad-label">Ad</div>
            <h4 style="color:#ffd700;margin:10px 0;">Advertisement</h4>
            <p style="color:rgba(255,255,255,0.8);">Ad loading failed</p>
          </div>
        `;
      }
    });
  }

  // === 13. تصفية أخطاء Unity ===
  filterUnityErrors() {
    const originalError = console.error;
    console.error = function(...args) {
      if (args[0] && typeof args[0] === 'string') {
        const errorMsg = args[0];
        if (errorMsg.includes('The referenced script') || errorMsg.includes('is missing!')) {
          return;
        }
      }
      originalError.apply(console, args);
    };
  }

  // === 14. دالة مساعدة للتأخير ===
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // === 15. تنظيف الموارد ===
  destroy() {
    Object.values(this.rotationTimers).forEach(timer => clearInterval(timer));
    this.rotationTimers = {};
  }
}

// === تشغيل تلقائي ===
document.addEventListener('DOMContentLoaded', () => {
  const adsManager = new AdsManager();
  adsManager.init();
  window.adsManager = adsManager;
  
  // إضافة أنماط CSS
  const style = document.createElement('style');
  style.textContent = `
    .ad-banner {
      background: rgba(0,0,0,0.7);
      border-radius: 8px;
      padding: 15px;
      margin: 20px 0;
      position: relative;
    }
    .ad-label {
      position: absolute;
      top: 8px;
      right: 8px;
      background: rgba(255,255,255,0.1);
      color: rgba(255,255,255,0.6);
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 3px;
    }
  `;
  document.head.appendChild(style);
});
