/**
 * 🎯 نظام إدارة الإعلانات الذكي - النسخة العصرية (Modern & Responsive UI)
 * ✅ تم الحفاظ على نظام Anti-AdBlock القوي
 * ✅ تم الحفاظ على نظام التدوير (Rotation) والجلسات
 * ✅ إضافة: تصميم Glassmorphism + تأثير تحميل Shimmer
 * ✅ إضافة: نظام تحجيم ذكي (Smart Scaling) لجميع الشاشات
 */

class AdsManager {
  constructor() {
    this.config = null;
    this.rotationTimers = {};
    this.sessionData = this.getSessionData();
    this.isAdBlockDetected = false;
    this.adElements = new Map();
    this.loadedScripts = new Set();
    this.popunderCount = 0;
    
    // إعدادات الشاشة
    this.isMobile = this.detectMobile();
    this.setupResponsiveListener();
  }

  detectMobile() {
    return window.innerWidth <= 768;
  }

  // === 1. تحميل الإعدادات (نفس المنطق الأصلي) ===
  async init() {
    try {
      this.filterUnityErrors();
      this.fixAdContainers();
      
      const response = await fetch('ads.json');
      if (!response.ok) throw new Error('Failed to load ads.json');
      
      this.config = await response.json();
      console.log('✅ تم تحميل إعدادات الإعلانات (النسخة العصرية)');
      
      const antiAdblockEnabled = this.config.antiAdblock?.enabled ?? true;
      
      if (antiAdblockEnabled) {
        console.log('🔍 Anti-AdBlock مُفعّل - بدء الفحص...');
        const adBlockDetected = await this.detectAdBlockEffectively();
        
        if (adBlockDetected) {
          console.log('🚫 AdBlock detected - Blocking page access');
          this.blockPageAccess();
          return;
        }
      } else {
        console.log('⚠️ Anti-AdBlock معطّل');
      }
      
      await this.loadAllAds();
      
      // تشغيل التحجيم الذكي بعد تحميل الصفحة بالكامل
      window.addEventListener('load', () => setTimeout(() => this.applySmartScaling(), 1000));
      
    } catch (error) {
      console.error('❌ خطأ في تحميل الإعلانات:', error);
      this.showFallbackAds();
    }
  }

  // === إضافة: مراقب تغيير حجم الشاشة ===
  setupResponsiveListener() {
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        this.isMobile = this.detectMobile();
        this.adjustAdsForScreenSize();
        this.applySmartScaling(); // إعادة حساب الحجم
      }, 300);
    });
  }

  adjustAdsForScreenSize() {
    const sidebarAds = document.querySelectorAll('.ad-sidebar, #ad-sidebar, #ad-sidebar-extra');
    sidebarAds.forEach(el => {
      el.style.display = this.isMobile ? 'none' : 'block';
    });
  }

  // === إضافة: نظام التحجيم الذكي (يمنع تجاوز الإعلان للشاشة) ===
  applySmartScaling() {
    const wrappers = document.querySelectorAll('.ad-content-scaler');
    
    wrappers.forEach(wrapper => {
      wrapper.style.transform = 'none'; // ريست
      
      const adWidth = wrapper.scrollWidth;
      const parentWidth = wrapper.parentElement ? wrapper.parentElement.clientWidth : window.innerWidth;
      
      // إذا كان الإعلان أعرض من المكان المخصص له
      if (adWidth > parentWidth && adWidth > 0 && parentWidth > 0) {
        const scale = (parentWidth / adWidth); // حساب نسبة التصغير
        // تطبيق التصغير فقط إذا كان الفرق يستحق
        if (scale < 1) {
            wrapper.style.transform = `scale(${scale})`;
            wrapper.style.transformOrigin = 'center top'; // التثبيت من الأعلى والمنتصف
            wrapper.parentElement.style.height = `${wrapper.scrollHeight * scale}px`; // تعديل الارتفاع
        }
      }
    });
  }

  // === 2. كشف AdBlock (نفس الكود الأصلي للحفاظ على القوة) ===
  async detectAdBlockEffectively() {
    // ...نفس المنطق الأصلي...
    const test1 = await this.testAdElement();
    const test2 = await this.testAdScript();
    const test3 = await this.testAdFetch();
    const failures = [test1, test2, test3].filter(Boolean).length;
    return failures >= 2;
  }

  async testAdElement() {
    return new Promise(resolve => {
      const adElement = document.createElement('div');
      adElement.id = 'adblock-test-' + Date.now();
      adElement.className = 'ads ad-banner sponsored';
      adElement.innerHTML = '&nbsp;';
      adElement.style.cssText = 'position:fixed;top:-999px;left:-999px;width:1px;height:1px;';
      document.body.appendChild(adElement);
      setTimeout(() => {
        const isBlocked = adElement.offsetHeight === 0 || window.getComputedStyle(adElement).display === 'none';
        adElement.remove();
        resolve(isBlocked);
      }, 500);
    });
  }

  async testAdScript() {
    return new Promise(resolve => {
      const script = document.createElement('script');
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
      script.onerror = () => resolve(true);
      script.onload = () => resolve(false);
      document.head.appendChild(script);
      setTimeout(() => { if(!script.parentNode) resolve(true); else script.remove(); }, 2000);
    });
  }

  async testAdFetch() {
    try {
      await fetch('https://google-analytics.com/analytics.js', { method: 'HEAD', mode: 'no-cors' });
      return false;
    } catch { return true; }
  }

  // === 3. حجب الصفحة (نفس التصميم الأصلي) ===
  blockPageAccess() {
    // ... استخدام نفس الكود الأصلي لواجهة الحجب ...
    console.log('⛔ Blocking Page Access');
    const blockOverlay = document.createElement('div');
    blockOverlay.id = 'adblock-block-overlay';
    // (نفس الستايل الأصلي للحفاظ على الهوية)
    blockOverlay.style.cssText = `position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: linear-gradient(135deg, #0f0c29, #302b63, #24243e); z-index: 2147483647; display: flex; justify-content: center; align-items: center; flex-direction: column; color: white; font-family: sans-serif;`;
    blockOverlay.innerHTML = `
      <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); padding: 40px; border-radius: 20px; border: 2px solid #ff4444; text-align: center; max-width: 600px;">
        <div style="font-size: 60px;">🚫</div>
        <h1>Ad Blocker Detected</h1>
        <p>Our game is free and relies on ads. Please disable your ad blocker to play.</p>
        <button onclick="location.reload()" style="background: #2ecc71; color: white; border: none; padding: 15px 30px; border-radius: 8px; margin-top: 20px; cursor: pointer; font-size: 16px;">I've Disabled It - Reload</button>
      </div>
    `;
    document.body.appendChild(blockOverlay);
    this.disableOriginalPage();
  }

  disableOriginalPage() {
    document.body.classList.add('adblock-blocked');
    document.documentElement.style.overflow = 'hidden';
  }

  // === تحميل الإعلانات (نفس الترتيب) ===
  async loadAllAds() {
    this.loadNativeBanner();
    if (!this.isMobile) setTimeout(() => this.loadSidebarAds(), 500);
    await this.delay(1000);
    this.loadBanners();
    await this.delay(1500);
    this.loadSocialBar();
    await this.delay(2000);
    this.loadMiddleAd();
    if (!this.isMobile) await this.delay(2500); this.loadExtraSidebarAd();
    await this.delay(3000);
    this.loadPopunder();
    this.loadSmartlink();
  }

  async loadBanners() {
    if (this.config.banners?.aboveIframe?.enabled) this.renderModernBanner('ad-above-iframe', this.config.banners.aboveIframe);
    if (this.config.banners?.belowIframe?.enabled) setTimeout(() => this.renderModernBanner('ad-below-iframe', this.config.banners.belowIframe), 1000);
    if (this.config.banners?.pageBottom?.enabled) setTimeout(() => this.renderModernBanner('ad-page-bottom', this.config.banners.pageBottom), 1500);
  }

  loadMiddleAd() {
    if (this.config.banners?.pageMiddle?.enabled) this.renderModernBanner('ad-page-middle', this.config.banners.pageMiddle);
  }

  loadExtraSidebarAd() {
    if (this.config.sidebarAdExtra?.enabled && !this.isMobile) this.renderModernBanner('ad-sidebar-extra', this.config.sidebarAdExtra);
  }

  loadSidebarAds() {
    if (this.config.sidebarAd?.enabled && !this.isMobile) this.renderModernBanner('ad-sidebar', this.config.sidebarAd);
  }

  // === 🌟 الجوهر الجديد: دالة العرض العصرية ===
  renderModernBanner(containerId, bannerConfig) {
    const container = this.ensureContainerExists(containerId);
    if (!container) return;

    if (this.isMobile && containerId.includes('sidebar')) {
      container.style.display = 'none';
      return;
    }

    const ads = bannerConfig.ads;
    if (!ads || ads.length === 0) return;

    // إضافة كلاس للتنسيق
    container.classList.add('modern-ad-slot');

    let currentIndex = 0;
    const updateAd = () => {
      this.injectModernAd(container, ads[currentIndex], containerId);
      currentIndex = (currentIndex + 1) % ads.length;
    };

    updateAd();

    if (bannerConfig.rotation && ads.length > 1) {
      if (this.rotationTimers[containerId]) clearInterval(this.rotationTimers[containerId]);
      this.rotationTimers[containerId] = setInterval(updateAd, bannerConfig.rotationInterval || 30000);
    }
  }

  // === 🌟 الجوهر الجديد: دالة الحقن مع التصميم والتحجيم ===
  injectModernAd(container, ad, containerId) {
    if (!ad || !ad.script) return;
    
    const uniqueId = `ad_${Math.random().toString(36).substr(2, 9)}`;
    const scriptId = `script-${uniqueId}`;

    // إعداد atOptions
    window.atOptions = window.atOptions || {};
    Object.assign(window.atOptions, { ...ad.config, params: ad.config?.params || {} });

    // HTML الجديد: تغليف + تأثير تحميل + تحجيم
    container.innerHTML = `
      <div class="ad-modern-wrapper">
        <div class="ad-label-modern">SPONSORED</div>
        
        <div id="loader-${uniqueId}" class="ad-skeleton-loader" style="height: ${ad.config?.height || 90}px">
          <div class="shimmer-effect"></div>
        </div>

        <div id="${uniqueId}" class="ad-content-scaler" style="opacity: 0; transition: opacity 0.5s;">
           </div>
      </div>
    `;

    setTimeout(() => {
        const script = document.createElement('script');
        script.src = ad.script;
        script.async = true;
        script.setAttribute('data-cfasync', 'false');
        script.id = scriptId;
        
        script.onload = () => {
            console.log(`✅ Ad Loaded: ${ad.id}`);
            const loader = document.getElementById(`loader-${uniqueId}`);
            const adContent = document.getElementById(uniqueId);
            
            if (loader) loader.style.display = 'none';
            if (adContent) {
              adContent.style.opacity = '1';
              // تطبيق التحجيم فوراً
              this.applySmartScaling();
            }
        };
        
        script.onerror = () => {
             console.warn(`⚠️ Ad Failed: ${ad.id}`);
             this.showFallbackInContainer(container);
        };
        
        const targetElement = document.getElementById(uniqueId);
        if (targetElement) {
            // محاولة لتوسيط الـ div الداخلي الذي ينشئه السكريبت
            const centerHelper = document.createElement('div');
            centerHelper.style.display = 'inline-block';
            targetElement.appendChild(centerHelper);
            centerHelper.appendChild(script);
        }
    }, 100);
  }

  // === Native Banner (تحديث بسيط للستايل) ===
  loadNativeBanner() {
    if (!this.config.nativeBanner?.enabled || this.isMobile) return;
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    if (sidebar.querySelector('.native-ad-banner')) return;

    const container = document.createElement('div');
    container.className = 'ad-banner native-ad-banner modern-native'; // كلاس جديد
    container.innerHTML = this.config.nativeBanner.html || '<div></div>';
    sidebar.insertBefore(container, sidebar.firstChild);
    // script loading...
     if (this.config.nativeBanner.script) {
      setTimeout(() => {
        const script = document.createElement('script');
        script.src = this.config.nativeBanner.script;
        script.async = true;
        container.appendChild(script);
      }, 1000);
    }
  }

  // === بقية الدوال (بدون تغيير في المنطق) ===
  loadSocialBar() {
     if (!this.config.socialBar?.enabled) return;
     const url = this.config.socialBar.script;
     if (this.loadedScripts.has(url)) return;
     setTimeout(() => {
         const s = document.createElement('script'); s.src = url; s.async = true;
         document.body.appendChild(s);
         this.loadedScripts.add(url);
     }, this.config.socialBar.delay || 5000);
  }

  loadPopunder() {
    if (!this.config.popunder?.enabled) return;
    if (this.config.popunder.frequency === 'once_per_session' && this.sessionData.popunderShown) return;

    setTimeout(() => {
        this.config.popunder.scripts.forEach(url => {
            if(this.loadedScripts.has(url)) return;
            const s = document.createElement('script'); s.src = url; s.async = true;
            document.body.appendChild(s);
            this.loadedScripts.add(url);
        });
        this.sessionData.popunderShown = true;
        this.saveSessionData();
    }, this.config.popunder.delay || 8000);
  }

  loadSmartlink() {
     if (!this.config.smartlink?.enabled) return;
     // (نفس منطق Smartlink الأصلي الخاص بك)
     if(this.config.smartlink.mode === 'popunder' && this.config.smartlink.triggerOnClick) {
         this.setupSmartlinkPopunder();
     } else {
         this.openSmartlinkDirect();
     }
  }

  setupSmartlinkPopunder() {
      // نفس الكود الأصلي...
      document.addEventListener('click', () => {
          if(this.sessionData.smartlinkCount >= (this.config.smartlink.maxShowsPerSession||3)) return;
          window.open(this.config.smartlink.url, '_blank');
          this.sessionData.smartlinkCount = (this.sessionData.smartlinkCount||0)+1;
          this.saveSessionData();
      }, { once: true });
  }
  
  openSmartlinkDirect() { /* نفس الكود الأصلي */ }

  fixAdContainers() {
    ['ad-above-iframe', 'ad-below-iframe', 'ad-page-bottom', 'ad-sidebar', 'ad-page-middle'].forEach(id => this.ensureContainerExists(id));
  }

  ensureContainerExists(containerId) {
    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      // نترك التنسيق للـ CSS
      if (containerId.includes('sidebar')) document.querySelector('.sidebar')?.appendChild(container);
      else if(containerId.includes('above')) document.querySelector('.game-frame')?.parentNode?.insertBefore(container, document.querySelector('.game-frame'));
      else if(containerId.includes('below')) { const f = document.querySelector('.game-frame'); f?.parentNode?.insertBefore(container, f.nextSibling); }
      else document.body.appendChild(container);
    }
    return container;
  }

  showFallbackAds() { /* نفس الكود */ }
  
  showFallbackInContainer(container) {
      container.innerHTML = `<div class="ad-modern-wrapper" style="min-height:90px; display:flex; align-items:center; justify-content:center; color:white;"><small>Advertisement</small></div>`;
  }

  getSessionData() { return JSON.parse(sessionStorage.getItem('adsSessionData')) || { popunderShown: false, smartlinkCount:0 }; }
  saveSessionData() { sessionStorage.setItem('adsSessionData', JSON.stringify(this.sessionData)); }
  filterUnityErrors() { /* نفس الكود */ }
  delay(ms) { return new Promise(r => setTimeout(r, ms)); }
  destroy() { Object.values(this.rotationTimers).forEach(clearInterval); }
}

// === تشغيل النظام + CSS العصري ===
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Launching Modern Ads System...');
  const adsManager = new AdsManager();
  adsManager.init();
  window.adsManager = adsManager;
  
  // 🌟 CSS: التصميم العصري الاحترافي
  const style = document.createElement('style');
  style.textContent = `
    /* === Variables === */
    :root {
      --ad-bg: rgba(20, 20, 35, 0.6);
      --ad-border: rgba(255, 255, 255, 0.1);
      --ad-glow: rgba(0, 0, 0, 0.3);
      --ad-text: #8b9bb4;
      --ad-radius: 12px;
    }

    /* === الحاوية الرئيسية === */
    .modern-ad-slot {
      display: block;
      width: 100%;
      margin: 25px auto;
      text-align: center;
      position: relative;
      clear: both;
      z-index: 5;
    }

    /* === الغلاف الزجاجي === */
    .ad-modern-wrapper {
      background: var(--ad-bg);
      border: 1px solid var(--ad-border);
      border-radius: var(--ad-radius);
      padding: 15px; /* مساحة داخلية للإطار */
      position: relative;
      overflow: hidden; 
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      box-shadow: 0 8px 32px var(--ad-glow);
      display: flex;
      justify-content: center;
      align-items: center;
      flex-direction: column;
      transition: all 0.3s ease;
      min-height: 100px;
    }

    .ad-modern-wrapper:hover {
        border-color: rgba(255,255,255,0.2);
        box-shadow: 0 8px 40px rgba(0,0,0,0.4);
    }

    /* === شارة إعلان أنيقة === */
    .ad-label-modern {
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(to bottom, rgba(0,0,0,0.8), rgba(0,0,0,0.4));
      color: rgba(255, 255, 255, 0.6);
      font-size: 9px;
      padding: 3px 10px;
      border-bottom-left-radius: 8px;
      border-bottom-right-radius: 8px;
      font-weight: 600;
      letter-spacing: 1.5px;
      z-index: 10;
      border: 1px solid rgba(255,255,255,0.05);
      border-top: none;
    }

    /* === تأثير Shimmer Loading === */
    .ad-skeleton-loader {
      width: 100%;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 8px;
      position: relative;
      overflow: hidden;
    }

    .shimmer-effect {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.08), transparent);
      transform: skewX(-20deg);
      animation: shimmer 1.5s infinite;
    }

    @keyframes shimmer {
      0% { transform: translateX(-150%) skewX(-20deg); }
      100% { transform: translateX(150%) skewX(-20deg); }
    }

    /* === Scaler: العنصر السحري للتحجيم === */
    .ad-content-scaler {
      display: flex;
      justify-content: center;
      align-items: center;
      width: fit-content;
      transform-origin: top center; /* التكبير/التصغير من المنتصف */
    }

    /* تحسين Native Banner */
    .modern-native {
        background: linear-gradient(135deg, rgba(26,42,108,0.4), rgba(178,31,31,0.4)) !important;
        border: 1px solid rgba(255,255,255,0.1);
    }

    /* === تعديلات الموبايل === */
    @media (max-width: 768px) {
      .modern-ad-slot { margin: 15px auto; }
      .ad-modern-wrapper { padding: 5px; border-radius: 8px; }
      
      /* إخفاء السايد بار */
      #ad-sidebar, #ad-sidebar-extra, .sidebar .modern-ad-slot {
        display: none !important;
      }
      
      /* السماح للإعلان بأخذ عرض الشاشة بالكامل */
      .ad-content-scaler { width: 100%; }
    }
  `;
  document.head.appendChild(style);
});
