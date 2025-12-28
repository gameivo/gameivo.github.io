/**
 * 🎯 نظام إدارة الإعلانات الذكي - النسخة المحسنة
 * رسالة Anti-AdBlock واضحة بدون ضبابية
 */

class AdsManager {
  constructor() {
    this.config = null;
    this.rotationTimers = {};
    this.sessionData = this.getSessionData();
    this.isAdBlockDetected = false;
    this.adElements = new Map();
    this.adBlockChecks = [];
  }

  // === 1. تحميل الإعدادات ===
  async init() {
    try {
      this.filterUnityErrors();
      this.fixAdContainers();
      
      const response = await fetch('ads.json');
      if (!response.ok) throw new Error('Failed to load ads.json');
      
      this.config = await response.json();
      console.log('✅ تم تحميل إعدادات الإعلانات');
      
      // 🔍 أولاً: تحميل الإعلانات الأساسية
      await this.loadAdsSequentially();
      
      console.log('🎯 تم تفعيل جميع الإعلانات بنجاح');
      
      // 🔍 ثانياً: فحص AdBlock بعد تحميل الإعلانات
      setTimeout(() => {
        this.detectAdBlockIntelligent();
      }, 3000);
      
    } catch (error) {
      console.error('❌ خطأ في تحميل الإعلانات:', error);
      this.showFallbackAds();
    }
  }

  // === 2. كشف AdBlock الذكي ===
  detectAdBlockIntelligent() {
    console.log('🔍 بدء فحص AdBlock الذكي...');
    
    // اختبار 1: فحص إذا كانت الإعلانات قد ظهرت بالفعل
    this.checkIfAdsAreActuallyVisible();
    
    // اختبار 2: فحص السكريبتات المحملة
    this.checkLoadedScripts();
    
    // اختبار 3: محاولة تحميل إعلان تجريبي
    this.loadTestAd();
    
    // الانتظار والتحليل النهائي
    setTimeout(() => {
      this.analyzeAdBlockResults();
    }, 2000);
  }

  checkIfAdsAreActuallyVisible() {
    console.log('🔍 فحص ظهور الإعلانات...');
    
    const adContainers = [
      'ad-above-iframe',
      'ad-below-iframe',
      'ad-page-bottom',
      'ad-sidebar'
    ];
    
    adContainers.forEach(containerId => {
      const container = document.getElementById(containerId);
      if (container) {
        const hasIframe = container.querySelector('iframe');
        const hasScript = container.querySelector('script');
        const hasContent = container.innerHTML.trim().length > 50;
        
        console.log(`📊 ${containerId}:`, {
          hasIframe: !!hasIframe,
          hasScript: !!hasScript,
          hasContent: hasContent,
          height: container.offsetHeight
        });
        
        if (container.offsetHeight < 10 && hasContent) {
          this.adBlockChecks.push({
            container: containerId,
            result: 'ADBLOCK_SUSPECTED',
            reason: 'Container has content but zero height'
          });
        }
      }
    });
  }

  checkLoadedScripts() {
    console.log('🔍 فحص السكريبتات المحملة...');
    
    const scripts = document.querySelectorAll('script[src*="highperformanceformat"], script[src*="effectivegatecpm"]');
    console.log(`📊 عدد سكريبتات الإعلانات المحملة: ${scripts.length}`);
    
    if (scripts.length === 0) {
      this.adBlockChecks.push({
        type: 'SCRIPTS',
        result: 'ADBLOCK_SUSPECTED',
        reason: 'No ad scripts loaded'
      });
    }
  }

  loadTestAd() {
    console.log('🔍 تحميل إعلان اختباري...');
    
    const testAd = document.createElement('div');
    testAd.id = 'ad-block-test-ad';
    testAd.style.cssText = `
      width: 728px; 
      height: 90px; 
      background: #f0f0f0; 
      border: 2px dashed #ccc; 
      margin: 10px auto; 
      text-align: center; 
      line-height: 90px; 
      color: #666;
      position: relative;
      z-index: 1;
    `;
    testAd.innerHTML = 'Test Advertisement Area';
    
    testAd.classList.add('ad', 'ads', 'advertisement', 'ad-banner');
    
    const testContainer = document.getElementById('ad-above-iframe') || document.body;
    testContainer.appendChild(testAd);
    
    setTimeout(() => {
      const isHidden = 
        testAd.offsetHeight === 0 || 
        testAd.offsetWidth === 0 ||
        testAd.style.display === 'none' ||
        window.getComputedStyle(testAd).display === 'none';
      
      if (isHidden) {
        this.adBlockChecks.push({
          type: 'TEST_AD',
          result: 'ADBLOCK_SUSPECTED',
          reason: 'Test ad was hidden'
        });
      }
      
      testAd.remove();
    }, 1000);
  }

  analyzeAdBlockResults() {
    console.log('📊 تحليل نتائج فحص AdBlock:', this.adBlockChecks);
    
    const suspectedCount = this.adBlockChecks.filter(check => check.result === 'ADBLOCK_SUSPECTED').length;
    const totalChecks = this.adBlockChecks.length;
    
    if (suspectedCount >= 2 && totalChecks >= 2) {
      this.isAdBlockDetected = true;
      console.log('🚫 تم اكتشاف AdBlock بناءً على تحليل شامل');
      
      if (this.config.antiAdblock?.enabled) {
        this.showClearAdBlockWarning();
      }
    } else {
      console.log('✅ لا يوجد AdBlock مكتشف - النظام يعمل بشكل طبيعي');
    }
  }

  // === 3. عرض تحذير AdBlock واضح ===
  showClearAdBlockWarning() {
    console.log('⚠️ عرض تحذير AdBlock واضح...');
    
    // إنشاء عنصر التحذير (بدون backdrop-filter)
    const warning = document.createElement('div');
    warning.id = 'adblock-warning';
    warning.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: linear-gradient(135deg, #e74c3c, #c0392b);
      color: white;
      padding: 20px 25px;
      border-radius: 12px;
      z-index: 999999;
      max-width: 400px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.4);
      animation: slideInRight 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      border: 2px solid rgba(255,255,255,0.2);
      line-height: 1.5;
    `;
    
    warning.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 15px; margin-bottom: 15px;">
        <div style="
          background: rgba(255,255,255,0.2);
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          flex-shrink: 0;
        ">
          ⚠️
        </div>
        <div style="flex: 1;">
          <h4 style="
            margin: 0 0 8px 0; 
            font-size: 18px; 
            font-weight: 700;
            color: #ffd700;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
          ">
            Ad Blocker Detected
          </h4>
          <p style="
            margin: 0; 
            font-size: 14px; 
            line-height: 1.4;
            opacity: 0.95;
          ">
            We've detected an ad blocker. Some features may not work properly. 
            Please consider disabling it for full experience.
          </p>
        </div>
      </div>
      
      <div style="
        display: flex; 
        gap: 12px; 
        margin-top: 20px;
        justify-content: flex-end;
      ">
        <button onclick="location.reload()" style="
          background: rgba(255,255,255,0.9);
          color: #e74c3c;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s;
          min-width: 120px;
        " onmouseover="
          this.style.transform = 'translateY(-2px)';
          this.style.boxShadow = '0 4px 12px rgba(255,255,255,0.3)';
        " onmouseout="
          this.style.transform = 'translateY(0)';
          this.style.boxShadow = 'none';
        ">
          🔄 Refresh
        </button>
        
        <button onclick="document.getElementById('adblock-warning').style.display='none'" style="
          background: transparent;
          color: white;
          border: 1px solid rgba(255,255,255,0.5);
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
          min-width: 120px;
        " onmouseover="
          this.style.background = 'rgba(255,255,255,0.1)';
          this.style.borderColor = 'white';
        " onmouseout="
          this.style.background = 'transparent';
          this.style.borderColor = 'rgba(255,255,255,0.5)';
        ">
          Dismiss
        </button>
      </div>
      
      <div style="
        margin-top: 15px;
        padding-top: 15px;
        border-top: 1px solid rgba(255,255,255,0.2);
        font-size: 12px;
        opacity: 0.8;
        text-align: center;
      ">
        This message will auto-dismiss in 10 seconds
      </div>
    `;
    
    document.body.appendChild(warning);
    
    // إضافة أنيميشن بدون تأثيرات ضبابية
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInRight {
        from { 
          transform: translateX(100%); 
          opacity: 0; 
        }
        to { 
          transform: translateX(0); 
          opacity: 1; 
        }
      }
      
      @keyframes fadeOutUp {
        from { 
          opacity: 1; 
          transform: translateY(0); 
        }
        to { 
          opacity: 0; 
          transform: translateY(-20px); 
        }
      }
      
      #adblock-warning {
        /* التأكد من عدم وجود تأثيرات ضبابية */
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
      }
      
      /* منع أي تأثيرات ضبابية على النصوص داخل التحذير */
      #adblock-warning * {
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
      }
    `;
    document.head.appendChild(style);
    
    // إخفاء تلقائي بعد 10 ثواني
    setTimeout(() => {
      if (warning.parentNode) {
        warning.style.animation = 'fadeOutUp 0.5s ease forwards';
        setTimeout(() => {
          if (warning.parentNode) {
            warning.remove();
          }
        }, 500);
      }
    }, 10000);
    
    // زر للإغلاق السريع إذا نقر خارج التحذير
    document.addEventListener('click', function closeWarningOnOutsideClick(e) {
      if (warning.parentNode && !warning.contains(e.target)) {
        warning.style.animation = 'fadeOutUp 0.3s ease forwards';
        setTimeout(() => {
          if (warning.parentNode) {
            warning.remove();
          }
          document.removeEventListener('click', closeWarningOnOutsideClick);
        }, 300);
      }
    });
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
    if (!ads || ads.length === 0) return;
    
    this.loadSingleAd(container, ads[0], containerId);
    
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
    if (!ad || !ad.script) return;
    
    const adDiv = document.createElement('div');
    adDiv.className = 'ad-banner';
    adDiv.id = `ad-${ad.id}-${containerId}`;
    adDiv.style.cssText = `
      background: rgba(0,0,0,0.8);
      border-radius: 8px;
      padding: 15px;
      margin: 15px 0;
      position: relative;
      min-height: ${ad.config?.height || 90}px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    adDiv.innerHTML = `
      <div class="ad-label" style="
        position: absolute;
        top: 8px;
        right: 8px;
        background: rgba(255,255,255,0.15);
        color: rgba(255,255,255,0.7);
        font-size: 10px;
        padding: 3px 8px;
        border-radius: 4px;
        font-weight: bold;
      ">Advertisement</div>
      <div id="banner-${ad.id}" style="text-align:center;"></div>
    `;
    
    container.innerHTML = '';
    container.appendChild(adDiv);
    
    setTimeout(() => {
      if (ad.config) {
        window.atOptions = ad.config;
      }
      
      const script = document.createElement('script');
      script.src = ad.script;
      script.async = true;
      script.setAttribute('data-cfasync', 'false');
      script.onload = () => console.log(`✅ Ad ${ad.id} loaded`);
      script.onerror = () => console.warn(`⚠️ Ad ${ad.id} failed`);
      
      const targetElement = document.getElementById(`banner-${ad.id}`);
      if (targetElement) {
        targetElement.appendChild(script);
      }
    }, 300);
  }

  // === 5. تحميل Native Banner ===
  loadNativeBanner() {
    if (!this.config.nativeBanner?.enabled) return;
    
    const sidebar = document.querySelector('.sidebar') || document.getElementById('ad-sidebar');
    if (!sidebar) return;
    
    if (document.querySelector('.native-ad-banner')) return;
    
    const container = document.createElement('div');
    container.className = 'ad-banner native-ad-banner';
    container.style.cssText = `
      background: rgba(0,0,0,0.8);
      border-radius: 10px;
      padding: 20px;
      margin: 20px 0;
      position: relative;
      border: 1px solid rgba(255,255,255,0.1);
    `;
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
    if (!ads || ads.length === 0) return;
    
    this.loadSidebarAd(container, ads[0]);
    
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
    adDiv.style.cssText = `
      background: rgba(0,0,0,0.8);
      border-radius: 10px;
      padding: 20px;
      margin: 20px 0;
      position: relative;
      min-height: ${ad.config?.height || 300}px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(255,255,255,0.1);
    `;
    
    adDiv.innerHTML = `
      <div class="ad-label" style="
        position: absolute;
        top: 10px;
        right: 10px;
        background: rgba(255,255,255,0.15);
        color: rgba(255,255,255,0.7);
        font-size: 10px;
        padding: 3px 8px;
        border-radius: 4px;
        font-weight: bold;
      ">Advertisement</div>
      <div id="sidebar-${ad.id}" style="text-align:center;"></div>
    `;
    
    container.innerHTML = '';
    container.appendChild(adDiv);
    
    setTimeout(() => {
      window.atOptions = ad.config;
      const script = document.createElement('script');
      script.src = ad.script;
      script.async = true;
      script.setAttribute('data-cfasync', 'false');
      const targetElement = document.getElementById(`sidebar-${ad.id}`);
      if (targetElement) {
        targetElement.appendChild(script);
      }
    }, 300);
  }

  // === 7. تحميل Popunder ===
  loadPopunder() {
    if (!this.config.popunder?.enabled) return;
    
    const frequency = this.config.popunder.frequency;
    if (frequency === 'once_per_session' && this.sessionData.popunderShown) {
      return;
    }
    
    setTimeout(() => {
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

  // === 8. تحميل Smartlink ===
  loadSmartlink() {
    if (!this.config.smartlink?.enabled) return;
    
    const frequency = this.config.smartlink.frequency;
    if (frequency === 'once_per_session' && this.sessionData.smartlinkOpened) {
      return;
    }
    
    const openSmartlink = () => {
      setTimeout(() => {
        if (this.config.smartlink.openInNewTab) {
          const newTab = window.open(this.config.smartlink.url, '_blank', 'noopener,noreferrer');
          if (newTab) {
            this.sessionData.smartlinkOpened = true;
            this.saveSessionData();
          }
        } else {
          window.location.href = this.config.smartlink.url;
        }
      }, this.config.smartlink.delay || 2000);
    };
    
    const checkGameLoaded = (attempt = 1) => {
      const iframe = document.getElementById('game-iframe');
      
      if (iframe && iframe.contentWindow) {
        openSmartlink();
      } else if (attempt < 10) {
        setTimeout(() => checkGameLoaded(attempt + 1), 1000);
      } else {
        openSmartlink();
      }
    };
    
    setTimeout(() => checkGameLoaded(), 3000);
  }

  // === 9. تحميل الإعلانات بالتسلسل ===
  async loadAdsSequentially() {
    this.loadNativeBanner();
    this.loadSidebarAds();
    
    await this.delay(1000);
    this.loadBanners();
    
    await this.delay(2000);
    this.loadPopunder();
    this.loadSmartlink();
  }

  // === 10. فحص وإصلاح الحاويات ===
  fixAdContainers() {
    ['ad-above-iframe', 'ad-below-iframe', 'ad-page-bottom', 'ad-sidebar'].forEach(containerId => {
      let container = document.getElementById(containerId);
      
      if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        container.style.cssText = `
          min-height: 50px;
          margin: 10px 0;
          position: relative;
        `;
        
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

  // === 11. إدارة الجلسة ===
  getSessionData() {
    const data = sessionStorage.getItem('adsSessionData');
    return data ? JSON.parse(data) : {
      popunderShown: false,
      smartlinkOpened: false
    };
  }

  saveSessionData() {
    sessionStorage.setItem('adsSessionData', JSON.stringify(this.sessionData));
  }

  // === 12. تصفية أخطاء Unity ===
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

  // === 13. دالة مساعدة للتأخير ===
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // === 14. تنظيف الموارد ===
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
  
  // إضافة أنماط CSS بدون تأثيرات ضبابية
  const style = document.createElement('style');
  style.textContent = `
    .ad-banner {
      background: rgba(0,0,0,0.8);
      border-radius: 8px;
      padding: 15px;
      margin: 20px 0;
      position: relative;
      border: 1px solid rgba(255,255,255,0.1);
    }
    
    .ad-label {
      position: absolute;
      top: 8px;
      right: 8px;
      background: rgba(255,255,255,0.15);
      color: rgba(255,255,255,0.7);
      font-size: 10px;
      padding: 3px 8px;
      border-radius: 4px;
      font-weight: bold;
    }
    
    /* إزالة أي تأثيرات ضبابية */
    * {
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }
  `;
  document.head.appendChild(style);
});
