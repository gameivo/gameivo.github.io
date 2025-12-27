class FastAdsManager {
  constructor() {
    this.config = null;
    this.rotationTimers = {};
    this.sessionData = this.getSessionData();
    this.isAdBlockDetected = false;
    this.adContainers = new Map();
  }

  async init() {
    try {
      // تحميل الإعدادات
      const response = await fetch('ads.json');
      this.config = await response.json();
      console.log('✅ تم تحميل إعدادات الإعلانات');
      
      // استراتيجية التحميل المتوازي السريع
      await this.loadAdsInParallel();
      
    } catch (error) {
      console.error('❌ خطأ في تحميل الإعلانات:', error);
      this.loadFallbackAds();
    }
  }

  async loadAdsInParallel() {
    // 1. أولاً: تحميل العناصر المرئية فوراً
    this.loadVisibleAdsImmediately();
    
    // 2. ثانياً: تحميل العناصر غير المرئية مع تأخير طفيف
    this.loadHiddenAdsWithDelay();
    
    // 3. ثالثاً: التحقق من أدبلوك (لا يؤثر على سرعة الإعلانات)
    this.detectAdBlockAsync();
  }

  loadVisibleAdsImmediately() {
    // قائمة العناصر التي تظهر فوراً بدون تأخير
    const immediateLoads = [
      this.loadBanners.bind(this),
      this.loadNativeBanner.bind(this),
      this.loadSidebarAds.bind(this)
    ];
    
    // تشغيل جميعها معاً
    immediateLoads.forEach(fn => {
      try {
        fn();
      } catch (e) {
        console.warn('⚠️ خطأ في تحميل فوري:', e);
      }
    });
  }

  loadHiddenAdsWithDelay() {
    // العناصر التي يمكن تأخيرها قليلاً
    setTimeout(() => this.loadPopunder(), 500);
    setTimeout(() => this.loadSmartlink(), 1000);
    setTimeout(() => this.loadInterstitial(), 15000); // تأخير طويل للإنترستيشيال
    setTimeout(() => this.loadSocialBar(), 2000);
  }

  detectAdBlockAsync() {
    if (!this.config.config?.antiAdblock?.enabled) return;
    
    // تحقق غير متزامن لا يؤثر على سرعة التحميل
    setTimeout(() => {
      const testAd = document.createElement('div');
      testAd.className = 'adsbox';
      testAd.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;';
      testAd.innerHTML = '&nbsp;';
      document.body.appendChild(testAd);
      
      setTimeout(() => {
        if (testAd.offsetHeight === 0) {
          this.isAdBlockDetected = true;
          this.showAdBlockMessage();
        }
        document.body.removeChild(testAd);
      }, 100);
    }, 3000); // تأخير التحقق
  }

  // === تحسين تحميل البانرات ===
  loadBanners() {
    const containers = [
      { id: 'ad-above-iframe', config: this.config.banners?.aboveIframe },
      { id: 'ad-below-iframe', config: this.config.banners?.belowIframe },
      { id: 'ad-page-bottom', config: this.config.banners?.pageBottom }
    ];
    
    containers.forEach(({ id, config }) => {
      if (!config?.enabled) return;
      
      const container = document.getElementById(id);
      if (!container) return;
      
      // إنشاء هيكل الإعلان مسبقاً
      this.prepareAdContainer(container, config.ads[0]);
      
      // تحميل الإعلان الأول فوراً
      this.loadAdScript(config.ads[0], container);
      
      // إعداد التدوير لاحقاً
      if (config.rotation && config.ads.length > 1) {
        this.setupBannerRotation(id, config);
      }
    });
  }

  prepareAdContainer(container, firstAd) {
    container.innerHTML = `
      <div class="ad-banner" id="${container.id}-wrapper">
        <div class="ad-label">Advertisement</div>
        <div id="ad-content-${firstAd.id}" 
             style="min-height:${firstAd.config.height}px;text-align:center;">
          <!-- سيتم تحميل الإعلان هنا -->
        </div>
      </div>
    `;
  }

  async loadAdScript(ad, container) {
    // استخدام promise للتحميل المتزامن
    return new Promise((resolve) => {
      const adElement = document.getElementById(`ad-content-${ad.id}`) || 
                       container.querySelector(`[id^="ad-content-"]`);
      
      if (!adElement) return resolve();
      
      // تعيين الإعدادات قبل تحميل السكريبت
      window.atOptions = ad.config;
      
      // إنشاء السكريبت
      const script = document.createElement('script');
      script.src = ad.script;
      script.async = true;
      script.defer = true;
      
      // عند اكتمال التحميل
      script.onload = () => {
        console.log(`✅ تم تحميل إعلان: ${ad.id}`);
        resolve();
      };
      
      script.onerror = () => {
        console.warn(`⚠️ فشل تحميل إعلان: ${ad.id}`);
        this.showFallbackAd(adElement, ad);
        resolve();
      };
      
      adElement.appendChild(script);
    });
  }

  showFallbackAd(container, ad) {
    // إعلان احتياطي سريع
    container.innerHTML = `
      <a href="${ad.fallbackUrl || '#'}" target="_blank" 
         style="display:block;padding:10px;background:#f0f0f0;">
        <img src="${ad.fallbackImage || 'placeholder.jpg'}" 
             alt="Ad" style="max-width:100%;height:auto;">
      </a>
    `;
  }

  setupBannerRotation(containerId, config) {
    const interval = config.rotationInterval || 30000;
    
    // بدء التدوير بعد فترة من تحميل الصفحة
    setTimeout(() => {
      let currentIndex = 0;
      const container = document.getElementById(containerId);
      
      this.rotationTimers[containerId] = setInterval(() => {
        currentIndex = (currentIndex + 1) % config.ads.length;
        this.rotateAd(container, config.ads[currentIndex]);
      }, interval);
    }, interval); // بدء التدوير بعد أول فاصل
  }

  rotateAd(container, ad) {
    const wrapper = container.querySelector('.ad-banner');
    if (!wrapper) return;
    
    wrapper.style.opacity = '0.7';
    
    setTimeout(() => {
      wrapper.innerHTML = `
        <div class="ad-label">Advertisement</div>
        <div id="ad-content-${ad.id}" 
             style="min-height:${ad.config.height}px;text-align:center;"></div>
      `;
      
      this.loadAdScript(ad, wrapper);
      
      setTimeout(() => {
        wrapper.style.opacity = '1';
      }, 300);
    }, 300);
  }

  // === تحميل سريع للـ Native Banner ===
  loadNativeBanner() {
    if (!this.config.nativeBanner?.enabled) return;
    
    // البحث عن مكان الإدراج
    const insertionPoints = [
      '.sidebar',
      '#ad-sidebar',
      '.right-column',
      '.widget-area',
      'aside'
    ];
    
    let sidebar = null;
    for (const selector of insertionPoints) {
      sidebar = document.querySelector(selector);
      if (sidebar) break;
    }
    
    if (!sidebar) {
      sidebar = document.createElement('div');
      sidebar.id = 'ad-native-fallback';
      sidebar.style.cssText = 'position:fixed;right:20px;top:100px;width:300px;z-index:1000;';
      document.body.appendChild(sidebar);
    }
    
    // تحميل المحتوى فوراً
    const container = document.createElement('div');
    container.className = 'native-ad-container';
    container.innerHTML = this.config.nativeBanner.html;
    
    sidebar.insertBefore(container, sidebar.firstChild);
    
    // تحميل السكريبت غير المتزامن
    const script = document.createElement('script');
    script.src = this.config.nativeBanner.script;
    script.async = true;
    script.defer = true;
    container.appendChild(script);
    
    console.log('✅ Native Banner loaded instantly');
  }

  // === تحسين Popunder ===
  loadPopunder() {
    if (!this.config.popunder?.enabled) return;
    
    if (this.config.popunder.frequency === 'once_per_session' && 
        this.sessionData.popunderShown) {
      return;
    }
    
    // أقل تأخير ممكن
    const delay = Math.min(this.config.popunder.delay || 1000, 2000);
    
    setTimeout(() => {
      this.config.popunder.scripts.forEach(scriptUrl => {
        const script = document.createElement('script');
        script.src = scriptUrl;
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
      });
      
      this.sessionData.popunderShown = true;
      this.saveSessionData();
    }, delay);
  }

  // === تحميل فوري للـ Sidebar Ads ===
  loadSidebarAds() {
    if (!this.config.sidebarAd?.enabled) return;
    
    const container = document.getElementById('ad-sidebar');
    if (!container) {
      // إنشاء كونتينر تلقائي إذا لم يوجد
      this.createSidebarContainer();
      return;
    }
    
    // تحميل أول إعلان فوراً
    const firstAd = this.config.sidebarAd.ads[0];
    this.loadSidebarAd(container, firstAd);
    
    // إعداد التدوير
    if (this.config.sidebarAd.rotation && this.config.sidebarAd.ads.length > 1) {
      this.setupSidebarRotation(container);
    }
  }

  loadSidebarAd(container, ad) {
    container.innerHTML = `
      <div class="sidebar-ad-wrapper">
        <div class="ad-label">Advertisement</div>
        <div id="sidebar-ad-${ad.id}" 
             style="min-height:${ad.config.height}px;text-align:center;">
          <!-- سيتم تحميل الإعلان -->
        </div>
      </div>
    `;
    
    window.atOptions = ad.config;
    const script = document.createElement('script');
    script.src = ad.script;
    script.async = true;
    document.getElementById(`sidebar-ad-${ad.id}`).appendChild(script);
  }

  // === وظائف إضافية ===
  loadFallbackAds() {
    // تحميل إعلانات احتياطية إذا فشل التحميل الرئيسي
    console.log('🔄 تحميل إعلانات احتياطية...');
    
    const fallbackBanners = [
      { id: 'ad-above-iframe', height: 90 },
      { id: 'ad-below-iframe', height: 250 },
      { id: 'ad-page-bottom', height: 90 }
    ];
    
    fallbackBanners.forEach(banner => {
      const container = document.getElementById(banner.id);
      if (container) {
        container.innerHTML = `
          <div class="fallback-ad" style="padding:10px;background:#f8f9fa;text-align:center;">
            <p style="margin:0;color:#666;">Advertisement</p>
            <a href="#" style="color:#0066cc;text-decoration:none;">Visit our sponsors</a>
          </div>
        `;
      }
    });
  }

  saveSessionData() {
    try {
      this.sessionData.pageViews = (this.sessionData.pageViews || 0) + 1;
      sessionStorage.setItem('adsSessionData', JSON.stringify(this.sessionData));
    } catch (e) {
      // إذا كان sessionStorage غير متاح
      console.warn('⚠️ لا يمكن حفظ بيانات الجلسة');
    }
  }

  // === تشغيل النظام ===
  static async run() {
    const manager = new FastAdsManager();
    
    // بدء التحميل قبل اكتمال DOM إذا أمكن
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => manager.init());
    } else {
      await manager.init();
    }
    
    // حفظ المدير للوصول العالمي
    window.fastAdsManager = manager;
    return manager;
  }
}

// === التحميل السريع ===
// بدء التحميل بأسرع وقت ممكن
(function() {
  // تحميل في الخلفية أثناء تحميل الصفحة
  const initAds = async () => {
    try {
      await FastAdsManager.run();
      console.log('🚀 نظام الإعلانات السريع جاهز');
    } catch (error) {
      console.error('❌ فشل تحميل الإعلانات:', error);
    }
  };
  
  // بدء فوري
  if (window.requestIdleCallback) {
    window.requestIdleCallback(initAds, { timeout: 1000 });
  } else {
    // بدء بعد تحميل المحتوى الأساسي
    window.addEventListener('load', initAds);
  }
})();
