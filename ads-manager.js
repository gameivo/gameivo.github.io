/**
 * 🎯 نظام إدارة الإعلانات الذكي - النسخة المحسنة
 * نظام Anti-AdBlock فعال مع جميع الإعلانات الـ 10
 */

class AdsManager {
  constructor() {
    this.config = null;
    this.rotationTimers = {};
    this.sessionData = this.getSessionData();
    this.isAdBlockDetected = false;
    this.adElements = new Map();
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
      
      // ✅ التحقق من تفعيل Anti-AdBlock
      const antiAdblockEnabled = this.config.antiAdblock?.enabled ?? true;
      
      if (antiAdblockEnabled) {
        console.log('🔍 Anti-AdBlock مفعّل - بدء الفحص...');
        const adBlockDetected = await this.detectAdBlockEffectively();
        
        if (adBlockDetected) {
          console.log('🚫 AdBlock detected - Blocking page access');
          this.blockPageAccess();
          return;
        }
      } else {
        console.log('⚠️ Anti-AdBlock معطّل - تخطي الفحص');
      }
      
      // تحميل جميع الإعلانات
      await this.loadAllAds();
      console.log('🎯 بدء تحميل جميع الإعلانات');
      
    } catch (error) {
      console.error('❌ خطأ في تحميل الإعلانات:', error);
      this.showFallbackAds();
    }
  }

  // === 2. كشف AdBlock بشكل فعال ===
  async detectAdBlockEffectively() {
    console.log('🔍 بدء كشف AdBlock...');
    
    const test1 = await this.testAdElement();
    console.log('📊 Test 1 - Element Test:', test1 ? 'BLOCKED' : 'PASSED');
    
    const test2 = await this.testAdScript();
    console.log('📊 Test 2 - Script Test:', test2 ? 'BLOCKED' : 'PASSED');
    
    const test3 = await this.testAdFetch();
    console.log('📊 Test 3 - Fetch Test:', test3 ? 'BLOCKED' : 'PASSED');
    
    const failures = [test1, test2, test3].filter(Boolean).length;
    const hasAdBlock = failures >= 2;
    
    console.log('📊 النتيجة النهائية:', hasAdBlock ? '🚫 ADBLOCK DETECTED' : '✅ NO ADBLOCK');
    this.isAdBlockDetected = hasAdBlock;
    
    return hasAdBlock;
  }

  // === 3. تحميل جميع الإعلانات ===
  async loadAllAds() {
    console.log('📦 بدء تحميل جميع الإعلانات...');
    
    // 1. Native Banner (أولاً)
    this.loadNativeBanner();
    
    // 2. Sidebar Ads (ثانياً)
    setTimeout(() => {
      this.loadSidebarAds();
    }, 1000);
    
    // 3. Banner Ads (ثالثاً)
    setTimeout(() => {
      this.loadBanners();
    }, 2000);
    
    // 4. Additional Ads (رابعاً)
    setTimeout(() => {
      this.loadAdditionalAds();
    }, 3000);
    
    // 5. Social Bar (خامساً)
    setTimeout(() => {
      this.loadSocialBar();
    }, 4000);
    
    // 6. Popunder (سادساً)
    setTimeout(() => {
      this.loadPopunder();
    }, 5000);
    
    // 7. Smartlink (سابعاً)
    setTimeout(() => {
      this.loadSmartlink();
    }, 6000);
  }

  // === 4. تحميل البانرات ===
  loadBanners() {
    console.log('🖼️ تحميل البانرات...');
    
    // فوق iframe
    if (this.config.banners?.aboveIframe?.enabled) {
      this.loadBannerAd('ad-above-iframe', this.config.banners.aboveIframe);
    }
    
    // تحت iframe
    if (this.config.banners?.belowIframe?.enabled) {
      setTimeout(() => {
        this.loadBannerAd('ad-below-iframe', this.config.banners.belowIframe);
      }, 1500);
    }
    
    // أسفل الصفحة
    if (this.config.banners?.pageBottom?.enabled) {
      setTimeout(() => {
        this.loadBannerAd('ad-page-bottom', this.config.banners.pageBottom);
      }, 2000);
    }
  }

  // === 5. طريقة جديدة لتحميل الإعلانات - تعمل بشكل صحيح ===
  loadBannerAd(containerId, bannerConfig) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`❌ Container ${containerId} not found`);
      return;
    }
    
    const ads = bannerConfig.ads;
    if (!ads || ads.length === 0) return;
    
    // استخدام أول إعلان في القائمة
    const ad = ads[0];
    this.loadAdWithAtOptions(container, ad, containerId);
    
    // التدوير إذا كان هناك أكثر من إعلان
    if (bannerConfig.rotation && ads.length > 1) {
      let currentIndex = 0;
      const interval = bannerConfig.rotationInterval || 30000;
      
      this.rotationTimers[containerId] = setInterval(() => {
        currentIndex = (currentIndex + 1) % ads.length;
        this.loadAdWithAtOptions(container, ads[currentIndex], containerId);
      }, interval);
    }
  }

  // === 6. طريقة محسنة لتحميل الإعلانات مع atOptions ===
  loadAdWithAtOptions(container, ad, containerId) {
    if (!ad || !ad.script) return;
    
    console.log(`📢 تحميل إعلان: ${ad.id} في ${containerId}`);
    
    // تنظيف الحاوية أولاً
    container.innerHTML = '';
    
    // إنشاء عنصر الإعلان
    const adDiv = document.createElement('div');
    adDiv.className = 'ad-banner';
    adDiv.id = `ad-${ad.id}-${containerId}`;
    
    // إنشاء عنصر div للهدف
    const targetDivId = `target-${ad.id}-${Date.now()}`;
    
    adDiv.innerHTML = `
      <div class="ad-label">Advertisement</div>
      <div id="${targetDivId}" style="text-align:center;min-height:${ad.config?.height || 90}px;"></div>
    `;
    
    container.appendChild(adDiv);
    
    // تأخير لضمان تحميل DOM أولاً
    setTimeout(() => {
      // طريقة 1: استخدام iframe مباشرة (الأكثر موثوقية)
      if (ad.config?.format === 'iframe') {
        this.loadAdViaIframe(targetDivId, ad);
      } 
      // طريقة 2: استخدام atOptions التقليدية
      else if (ad.config) {
        this.loadAdViaAtOptions(targetDivId, ad);
      }
      // طريقة 3: تحميل السكريبت مباشرة
      else {
        this.loadAdViaScript(targetDivId, ad);
      }
    }, 500);
  }

  // === 7. تحميل الإعلان عبر iframe مباشرة ===
  loadAdViaIframe(targetDivId, ad) {
    const targetDiv = document.getElementById(targetDivId);
    if (!targetDiv) return;
    
    const iframe = document.createElement('iframe');
    iframe.width = ad.config.width || 728;
    iframe.height = ad.config.height || 90;
    iframe.frameBorder = '0';
    iframe.scrolling = 'no';
    iframe.marginWidth = '0';
    iframe.marginHeight = '0';
    iframe.style.border = 'none';
    iframe.style.overflow = 'hidden';
    
    // إنشاء URL للإعلان
    const adUrl = this.generateAdUrl(ad);
    if (adUrl) {
      iframe.src = adUrl;
      targetDiv.appendChild(iframe);
      console.log(`✅ إعلان iframe محمل: ${ad.id}`);
    }
  }

  // === 8. توليد URL للإعلان ===
  generateAdUrl(ad) {
    if (!ad.config || !ad.config.key) return null;
    
    const baseUrl = 'https://www.highperformanceformat.com';
    const key = ad.config.key;
    const width = ad.config.width || 728;
    const height = ad.config.height || 90;
    
    // إنشاء URL مع المعلمات
    return `${baseUrl}/${key}/?format=iframe&width=${width}&height=${height}`;
  }

  // === 9. تحميل الإعلان عبر atOptions ===
  loadAdViaAtOptions(targetDivId, ad) {
    // تنظيف atOptions السابقة
    if (window.atOptions) {
      window.atOptions = null;
    }
    
    // تعيين atOptions الجديدة
    setTimeout(() => {
      window.atOptions = ad.config || {};
      
      // تحميل السكريبت بعد تعيين atOptions
      setTimeout(() => {
        const script = document.createElement('script');
        script.src = ad.script;
        script.async = true;
        script.defer = true;
        script.setAttribute('data-cfasync', 'false');
        
        const targetDiv = document.getElementById(targetDivId);
        if (targetDiv) {
          targetDiv.appendChild(script);
          console.log(`✅ إعلان atOptions محمل: ${ad.id}`);
        }
      }, 100);
    }, 50);
  }

  // === 10. تحميل الإعلان عبر السكريبت مباشرة ===
  loadAdViaScript(targetDivId, ad) {
    const targetDiv = document.getElementById(targetDivId);
    if (!targetDiv) return;
    
    const script = document.createElement('script');
    script.src = ad.script;
    script.async = true;
    script.defer = true;
    script.setAttribute('data-cfasync', 'false');
    
    targetDiv.appendChild(script);
    console.log(`✅ إعلان script محمل: ${ad.id}`);
  }

  // === 11. تحميل Native Banner ===
  loadNativeBanner() {
    if (!this.config.nativeBanner?.enabled) return;
    
    // Native Banner يظهر بشكل جيد حالياً، لا نحتاج لتغييره
    console.log('✅ Native Banner محمل');
  }

  // === 12. تحميل إعلانات Sidebar ===
  loadSidebarAds() {
    if (!this.config.sidebarAd?.enabled) return;
    
    const container = document.getElementById('ad-sidebar');
    if (!container) {
      console.warn('❌ حاوية Sidebar غير موجودة');
      return;
    }
    
    const ads = this.config.sidebarAd.ads;
    if (!ads || ads.length === 0) return;
    
    // استخدام أول إعلان
    const ad = ads[0];
    this.loadAdWithAtOptions(container, ad, 'ad-sidebar');
    
    // التدوير
    if (this.config.sidebarAd.rotation && ads.length > 1) {
      let currentIndex = 0;
      const interval = this.config.sidebarAd.rotationInterval || 40000;
      
      this.rotationTimers['sidebar'] = setInterval(() => {
        currentIndex = (currentIndex + 1) % ads.length;
        this.loadAdWithAtOptions(container, ads[currentIndex], 'ad-sidebar');
      }, interval);
    }
  }

  // === 13. تحميل إعلانات إضافية ===
  loadAdditionalAds() {
    console.log('➕ تحميل إعلانات إضافية...');
    
    // 1. إعلان في وسط المحتوى
    setTimeout(() => {
      const middleContainer = document.getElementById('ad-page-middle');
      if (middleContainer) {
        const middleAd = {
          id: "banner-300x250-middle",
          script: "https://www.highperformanceformat.com/c84b7f14ef2b488fb99e7411123accf1/invoke.js",
          config: {
            key: "c84b7f14ef2b488fb99e7411123accf1",
            format: "iframe",
            height: 250,
            width: 300
          }
        };
        
        this.loadAdWithAtOptions(middleContainer, middleAd, 'ad-page-middle');
      }
    }, 1000);
    
    // 2. إعلان في الأسفل
    setTimeout(() => {
      const footerContainer = document.getElementById('ad-footer');
      if (footerContainer) {
        const footerAd = {
          id: "banner-728x90-footer",
          script: "https://www.highperformanceformat.com/a29bc677676d4759eafbbf48bff57ae3/invoke.js",
          config: {
            key: "a29bc677676d4759eafbbf48bff57ae3",
            format: "iframe",
            height: 90,
            width: 728
          }
        };
        
        this.loadAdWithAtOptions(footerContainer, footerAd, 'ad-footer');
      }
    }, 2000);
  }

  // === 14. تحميل Social Bar ===
  loadSocialBar() {
    if (!this.config.popunder?.scripts || this.config.popunder.scripts.length === 0) return;
    
    // استخدام أول سكريبت
    const socialBarScript = this.config.popunder.scripts[0];
    
    const script = document.createElement('script');
    script.src = socialBarScript;
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    
    document.body.appendChild(script);
    console.log('✅ Social Bar محمل');
  }

  // === 15. تحميل Popunder ===
  loadPopunder() {
    if (!this.config.popunder?.enabled) return;
    
    const frequency = this.config.popunder.frequency;
    if (frequency === 'once_per_session' && this.sessionData.popunderShown) {
      return;
    }
    
    // استخدام جميع السكريبتات
    this.config.popunder.scripts.forEach((scriptUrl, index) => {
      setTimeout(() => {
        const script = document.createElement('script');
        script.src = scriptUrl;
        script.async = true;
        script.setAttribute('data-cfasync', 'false');
        document.body.appendChild(script);
        console.log(`✅ Popunder script ${index + 1} محمل`);
      }, index * 1000); // تأخير بين السكريبتات
    });
    
    this.sessionData.popunderShown = true;
    this.saveSessionData();
  }

  // === 16. تحميل Smartlink ===
  loadSmartlink() {
    if (!this.config.smartlink?.enabled) return;
    
    const frequency = this.config.smartlink.frequency;
    if (frequency === 'once_per_session' && this.sessionData.smartlinkOpened) {
      return;
    }
    
    setTimeout(() => {
      if (this.config.smartlink.openInNewTab) {
        window.open(this.config.smartlink.url, '_blank', 'noopener,noreferrer');
        console.log('✅ Smartlink opened in new tab');
      } else {
        window.location.href = this.config.smartlink.url;
      }
      
      this.sessionData.smartlinkOpened = true;
      this.saveSessionData();
    }, this.config.smartlink.delay || 2000);
  }

  // === 17. عرض إعلانات فولباك ===
  showFallbackAds() {
    console.log('🔄 عرض إعلانات احتياطية...');
    
    // إعلانات احتياطية بسيطة
    const fallbackAd = `
      <div class="ad-banner" style="text-align:center;padding:20px;">
        <div class="ad-label">Advertisement</div>
        <div style="background:#1a2a6c;color:white;padding:15px;border-radius:5px;">
          <p style="margin:10px 0;">🎯 Support our site by disabling ad blocker</p>
          <a href="#" onclick="window.location.reload()" 
             style="background:#3498db;color:white;padding:8px 15px;border-radius:5px;text-decoration:none;">
            Refresh after disabling
          </a>
        </div>
      </div>
    `;
    
    // وضع إعلانات احتياطية في الحاويات الرئيسية
    const containers = [
      'ad-above-iframe',
      'ad-below-iframe',
      'ad-sidebar',
      'ad-page-middle',
      'ad-page-bottom',
      'ad-footer'
    ];
    
    containers.forEach(containerId => {
      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML = fallbackAd;
      }
    });
  }

  // === 18. إدارة الجلسة ===
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

  // === 19. فحص وإصلاح الحاويات ===
  fixAdContainers() {
    console.log('🔧 فحص حاويات الإعلانات...');
    
    // تأكد من وجود جميع الحاويات المطلوبة
    const containers = [
      { id: 'ad-above-iframe', height: '90px' },
      { id: 'ad-below-iframe', height: '250px' },
      { id: 'ad-page-bottom', height: '60px' },
      { id: 'ad-page-middle', height: '250px' },
      { id: 'ad-footer', height: '90px' },
      { id: 'ad-sidebar', height: '300px' }
    ];
    
    containers.forEach(({ id, height }) => {
      let container = document.getElementById(id);
      
      if (!container) {
        console.log(`⚠️ إنشاء حاوية: ${id}`);
        container = document.createElement('div');
        container.id = id;
        container.style.cssText = `min-height:${height};margin:20px 0;`;
        
        // تحديد مكان الإدراج
        switch(id) {
          case 'ad-page-middle':
            const gameInfo = document.querySelector('.game-info');
            if (gameInfo) {
              gameInfo.parentNode.insertBefore(container, gameInfo.nextSibling);
            }
            break;
            
          case 'ad-footer':
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
              mainContent.appendChild(container);
            }
            break;
            
          default:
            // الحاويات الأخرى موجودة بالفعل
            break;
        }
      }
    });
  }

  // === 20. تصفية أخطاء Unity ===
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

  // === 21. حجب الصفحة عند اكتشاف AdBlock ===
  blockPageAccess() {
    console.log('⛔ حجب الوصول إلى الصفحة...');
    
    const blockOverlay = document.createElement('div');
    blockOverlay.id = 'adblock-block-overlay';
    blockOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
      z-index: 2147483647;
      display: flex;
      justify-content: center;
      align-items: center;
      flex-direction: column;
      padding: 20px;
      text-align: center;
      color: white;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      overflow: hidden;
    `;
    
    blockOverlay.innerHTML = `
      <div style="
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(20px);
        border-radius: 20px;
        padding: 40px;
        max-width: 800px;
        width: 90%;
        border: 2px solid rgba(255, 68, 68, 0.5);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      ">
        <div style="font-size: 80px; color: #ff4444; margin-bottom: 20px;">
          🚫
        </div>
        
        <h1 style="font-size: 2.5rem; color: #ffd700; margin-bottom: 20px;">
          Ad Blocker Detected
        </h1>
        
        <p style="font-size: 18px; margin-bottom: 20px;">
          Our website relies on ads to provide free content. Please disable your ad blocker.
        </p>
        
        <button onclick="window.location.reload()" style="
          background: linear-gradient(135deg, #2ecc71, #27ae60);
          color: white;
          border: none;
          padding: 16px 35px;
          border-radius: 10px;
          cursor: pointer;
          font-size: 18px;
          font-weight: bold;
          margin-top: 20px;
        ">
          🔄 Refresh After Disabling
        </button>
      </div>
    `;
    
    document.body.appendChild(blockOverlay);
    
    // تعطيل الصفحة
    document.body.classList.add('adblock-blocked');
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  }

  // === 22. اختبارات AdBlock (نفسها) ===
  async testAdElement() { /* نفس الكود السابق */ }
  async testAdScript() { /* نفس الكود السابق */ }
  async testAdFetch() { /* نفس الكود السابق */ }

  // === 23. تنظيف الموارد ===
  destroy() {
    Object.values(this.rotationTimers).forEach(timer => clearInterval(timer));
    this.rotationTimers = {};
    console.log('🧹 تم تنظيف موارد الإعلانات');
  }
}

// === تشغيل تلقائي ===
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 بدء تشغيل نظام الإعلانات...');
  
  // إضافة CSS للإعلانات
  const style = document.createElement('style');
  style.textContent = `
    .ad-banner {
      background: rgba(0,0,0,0.8);
      border-radius: 10px;
      padding: 15px;
      margin: 20px 0;
      position: relative;
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255,255,255,0.15);
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
    
    .ad-banner:hover {
      border-color: rgba(255,255,255,0.3);
      box-shadow: 0 6px 20px rgba(0,0,0,0.3);
      transform: translateY(-2px);
    }
    
    .ad-label {
      position: absolute;
      top: 8px;
      right: 8px;
      background: rgba(255,255,255,0.1);
      color: rgba(255,255,255,0.7);
      font-size: 10px;
      padding: 3px 8px;
      border-radius: 4px;
      font-weight: bold;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    
    .native-ad-banner {
      background: linear-gradient(135deg, rgba(26,42,108,0.9), rgba(178,31,31,0.9));
      border: 2px solid rgba(255,215,0,0.3);
    }
    
    /* إطار iframe داخل الإعلان */
    .ad-banner iframe {
      border-radius: 6px;
      overflow: hidden;
    }
    
    /* تحسين العرض على الجوال */
    @media (max-width: 768px) {
      .ad-banner {
        padding: 12px;
        margin: 15px 0;
      }
      
      .ad-label {
        font-size: 9px;
        padding: 2px 6px;
      }
    }
  `;
  document.head.appendChild(style);
  
  // تشغيل AdsManager
  const adsManager = new AdsManager();
  adsManager.init();
  window.adsManager = adsManager;
});
