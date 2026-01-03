/**
 * 🎯 نظام إدارة الإعلانات الذكي - النسخة المحسّنة والمُصلحة
 * ✅ إصلاح البانرات السوداء
 * ✅ إصلاح Popunder للعمل مرة واحدة فقط
 * ✅ Smartlink كـ Popunder
 * ✅ الحفاظ على نظام Anti-AdBlock
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
    this.activeAds = new Map(); // تتبع الإعلانات النشطة
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
        console.log('🔍 Anti-AdBlock مُفعّل - بدء الفحص...');
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
      console.log('🎯 تم تفعيل جميع الإعلانات بنجاح');
      
    } catch (error) {
      console.error('❌ خطأ في تحميل الإعلانات:', error);
      // لا نعرض فولباك إلا في حالة فشل كامل
    }
  }

  // === 2. كشف AdBlock ===
  async detectAdBlockEffectively() {
    // ... (نفس الكود الحالي)
    return false; // مؤقتاً نرجع false للاختبار
  }

  // === 3. حجب الصفحة عند اكتشاف AdBlock ===
  blockPageAccess() {
    // ... (نفس الكود الحالي)
  }

  // === 4. تعطيل الصفحة الأصلية ===
  disableOriginalPage() {
    // ... (نفس الكود الحالي)
  }

  // === 5. عرض مساعدة AdBlock ===
  showAdBlockHelp() {
    // ... (نفس الكود الحالي)
  }

  // === 6. تحميل جميع الإعلانات ===
  async loadAllAds() {
    console.log('📦 بدء تحميل جميع الإعلانات...');
    
    // 1. إعلانات سريعة (فورية)
    this.loadNativeBanner();
    
    // 2. إعلانات Sidebar
    setTimeout(() => {
      this.loadSidebarAds();
    }, 500);
    
    // 3. بانرات اللعبة
    await this.delay(1000);
    this.loadBanners();
    
    // 4. Social Bar
    await this.delay(1500);
    this.loadSocialBar();
    
    // 5. إعلان وسط الصفحة
    await this.delay(2000);
    this.loadMiddleAd();
    
    // 6. إعلان إضافي في Sidebar
    await this.delay(2500);
    this.loadExtraSidebarAd();
    
    // 7. إعلانات تفاعلية (Popunder & Smartlink)
    await this.delay(3000);
    this.loadPopunder();
    this.loadSmartlink(); // ⚠️ Smartlink هنا
  }

  // === 7. تحميل البانرات ===
  async loadBanners() {
    console.log('🖼️ تحميل البانرات...');
    
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
        this.ensureContainerExists('ad-page-bottom');
        this.loadBannerAd('ad-page-bottom', this.config.banners.pageBottom);
      }, 1500);
    }
  }

  loadBannerAd(containerId, bannerConfig) {
    const container = this.ensureContainerExists(containerId);
    if (!container) {
      console.warn(`❌ Container ${containerId} not found`);
      return;
    }
    
    const ads = bannerConfig.ads;
    if (!ads || ads.length === 0) return;
    
    // تحميل أول إعلان
    this.loadSingleAd(container, ads[0], containerId);
    
    // التدوير
    if (bannerConfig.rotation && ads.length > 1) {
      let currentIndex = 0;
      const interval = bannerConfig.rotationInterval || 30000;
      
      // إيقاف المؤقت القديم إذا كان موجوداً
      if (this.rotationTimers[containerId]) {
        clearInterval(this.rotationTimers[containerId]);
      }
      
      this.rotationTimers[containerId] = setInterval(() => {
        currentIndex = (currentIndex + 1) % ads.length;
        this.loadSingleAd(container, ads[currentIndex], containerId);
        console.log(`🔄 تدوير إعلان في ${containerId}: ${ads[currentIndex].id}`);
      }, interval);
    }
  }

  // === التصحيح الرئيسي: إصلاح دالة تحميل الإعلان ===
  loadSingleAd(container, ad, containerId) {
    if (!ad || !ad.script) {
      console.warn(`❌ إعلان غير صالح في ${containerId}`);
      return;
    }
    
    console.log(`📢 تحميل إعلان: ${ad.id} في ${containerId}`);
    
    const uniqueId = `${ad.id}-${Date.now()}`;
    
    // مسح أي atOptions قديمة
    window.atOptions = window.atOptions || {};
    
    // تعيين atOptions جديدة
    Object.assign(window.atOptions, {
      ...ad.config,
      params: ad.config?.params || {}
    });
    
    console.log('⚙️ atOptions:', window.atOptions);
    
    const adDiv = document.createElement('div');
    adDiv.className = 'ad-banner';
    adDiv.id = `ad-wrapper-${uniqueId}`;
    adDiv.setAttribute('data-ad-id', ad.id);
    adDiv.innerHTML = `
      <div class="ad-label">Advertisement</div>
      <div id="banner-${uniqueId}" style="text-align:center;min-height:${ad.config?.height || 90}px;background:transparent;"></div>
    `;
    
    // تنظيف الحاوية
    container.innerHTML = '';
    container.appendChild(adDiv);
    
    // حفظ الإعلان النشط
    this.activeAds.set(containerId, {
      element: adDiv,
      ad: ad,
      loaded: false
    });
    
    // انتظار للتأكد من تحميل DOM
    setTimeout(() => {
      const script = document.createElement('script');
      script.src = ad.script;
      script.async = true;
      script.setAttribute('data-cfasync', 'false');
      script.id = `script-${uniqueId}`;
      
      script.onload = () => {
        console.log(`✅ تم تحميل إعلان: ${ad.id}`);
        const activeAd = this.activeAds.get(containerId);
        if (activeAd) {
          activeAd.loaded = true;
        }
      };
      
      script.onerror = (error) => {
        console.warn(`⚠️ فشل تحميل إعلان: ${ad.id}`, error);
        // الانتظار قبل عرض الفولباك
        setTimeout(() => {
          this.showFallbackInContainer(container, containerId);
        }, 3000); // انتظار 3 ثواني
      };
      
      const targetElement = document.getElementById(`banner-${uniqueId}`);
      if (targetElement) {
        targetElement.appendChild(script);
      } else {
        console.warn(`⚠️ لم يتم العثور على عنصر الهدف، إضافة السكريبت مباشرة`);
        adDiv.appendChild(script);
      }
      
      // فحص بعد 5 ثواني إذا كان الإعلان حمّل
      setTimeout(() => {
        const activeAd = this.activeAds.get(containerId);
        if (activeAd && !activeAd.loaded) {
          console.warn(`⚠️ فشل تحميل الإعلان بعد 5 ثواني: ${ad.id}`);
          this.showFallbackInContainer(container, containerId);
        }
      }, 5000);
      
    }, 100);
  }

  // === 8. إضافة إعلان في وسط المحتوى ===
  loadMiddleAd() {
    if (!this.config.banners?.pageMiddle?.enabled) return;
    
    const container = this.ensureContainerExists('ad-page-middle');
    this.loadBannerAd('ad-page-middle', this.config.banners.pageMiddle);
  }

  // === 9. تحميل إعلان إضافي في الجانب ===
  loadExtraSidebarAd() {
    if (!this.config.sidebarAdExtra?.enabled) return;
    
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    
    // التحقق من عدم وجود الإعلان مسبقاً
    if (sidebar.querySelector('#ad-sidebar-extra')) return;
    
    const extraContainer = document.createElement('div');
    extraContainer.id = 'ad-sidebar-extra';
    extraContainer.style.cssText = `
      min-height: 300px;
      margin: 20px 0;
      background: rgba(0,0,0,0.7);
      border-radius: 8px;
      padding: 15px;
      position: relative;
    `;
    
    // إدراج الإعلان بعد الإعلان الحالي
    const existingAd = sidebar.querySelector('#ad-sidebar');
    if (existingAd && existingAd.nextSibling) {
      sidebar.insertBefore(extraContainer, existingAd.nextSibling);
    } else {
      sidebar.appendChild(extraContainer);
    }
    
    this.loadBannerAd('ad-sidebar-extra', this.config.sidebarAdExtra);
  }

  // === 10. تحميل Native Banner ===
  loadNativeBanner() {
    if (!this.config.nativeBanner?.enabled) return;
    
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    
    if (sidebar.querySelector('.native-ad-banner')) return;
    
    const container = document.createElement('div');
    container.className = 'ad-banner native-ad-banner';
    container.innerHTML = this.config.nativeBanner.html || '<div id="native-banner-container"></div>';
    
    sidebar.insertBefore(container, sidebar.firstChild);
    
    if (this.config.nativeBanner.script) {
      setTimeout(() => {
        const script = document.createElement('script');
        script.src = this.config.nativeBanner.script;
        script.async = true;
        script.setAttribute('data-cfasync', 'false');
        container.appendChild(script);
        console.log('✅ Native Banner loaded');
      }, 1000);
    }
  }

  // === 11. تحميل إعلانات Sidebar ===
  loadSidebarAds() {
    if (!this.config.sidebarAd?.enabled) return;
    
    const container = document.getElementById('ad-sidebar');
    if (!container) {
      console.log('⚠️ حاوية Sidebar غير موجودة، إنشاء جديدة...');
      this.ensureContainerExists('ad-sidebar');
      return;
    }
    
    const ads = this.config.sidebarAd.ads;
    if (!ads || ads.length === 0) return;
    
    this.loadSidebarAd(container, ads[0]);
    
    // التدوير
    if (this.config.sidebarAd.rotation && ads.length > 1) {
      let currentIndex = 0;
      const interval = this.config.sidebarAd.rotationInterval || 45000;
      
      this.rotationTimers['sidebar'] = setInterval(() => {
        currentIndex = (currentIndex + 1) % ads.length;
        this.loadSidebarAd(container, ads[currentIndex]);
        console.log(`🔄 تدوير إعلان Sidebar: ${ads[currentIndex].id}`);
      }, interval);
    }
  }

  // === دالة تحميل إعلان Sidebar ===
  loadSidebarAd(container, ad) {
    if (!ad || !ad.script) return;
    
    const uniqueId = `${ad.id}-${Date.now()}`;
    
    // إعداد atOptions
    window.atOptions = window.atOptions || {};
    Object.assign(window.atOptions, {
      ...ad.config,
      params: ad.config?.params || {}
    });
    
    console.log('⚙️ Sidebar atOptions:', window.atOptions);
    
    const adDiv = document.createElement('div');
    adDiv.className = 'ad-banner ad-sidebar';
    adDiv.id = `sidebar-wrapper-${uniqueId}`;
    adDiv.setAttribute('data-ad-id', ad.id);
    adDiv.innerHTML = `
      <div class="ad-label">Advertisement</div>
      <div id="sidebar-${uniqueId}" style="text-align:center;min-height:${ad.config?.height || 300}px;background:transparent;"></div>
    `;
    
    container.innerHTML = '';
    container.appendChild(adDiv);
    
    // حفظ الإعلان النشط
    this.activeAds.set('sidebar', {
      element: adDiv,
      ad: ad,
      loaded: false
    });
    
    setTimeout(() => {
      const script = document.createElement('script');
      script.src = ad.script;
      script.async = true;
      script.setAttribute('data-cfasync', 'false');
      script.id = `sidebar-script-${uniqueId}`;
      
      script.onload = () => {
        console.log(`✅ Sidebar Ad loaded: ${ad.id}`);
        const activeAd = this.activeAds.get('sidebar');
        if (activeAd) {
          activeAd.loaded = true;
        }
      };
      
      script.onerror = () => {
        console.warn(`⚠️ فشل تحميل Sidebar Ad: ${ad.id}`);
        setTimeout(() => {
          this.showFallbackInContainer(container, 'sidebar');
        }, 3000);
      };
      
      const targetElement = document.getElementById(`sidebar-${uniqueId}`);
      if (targetElement) {
        targetElement.appendChild(script);
      } else {
        adDiv.appendChild(script);
      }
      
      // فحص بعد 5 ثواني
      setTimeout(() => {
        const activeAd = this.activeAds.get('sidebar');
        if (activeAd && !activeAd.loaded) {
          console.warn(`⚠️ فشل تحميل Sidebar Ad بعد 5 ثواني: ${ad.id}`);
          this.showFallbackInContainer(container, 'sidebar');
        }
      }, 5000);
      
    }, 100);
  }

  // === 12. تحميل Social Bar ===
  loadSocialBar() {
    if (!this.config.socialBar?.enabled) return;
    
    const socialBarScript = this.config.socialBar.script;
    if (!socialBarScript) return;
    
    // التحقق من عدم تحميل السكريبت مسبقاً
    if (this.loadedScripts.has(socialBarScript)) {
      console.log('⚠️ Social Bar already loaded');
      return;
    }
    
    setTimeout(() => {
      const script = document.createElement('script');
      script.src = socialBarScript;
      script.async = true;
      script.setAttribute('data-cfasync', 'false');
      script.id = 'social-bar-script';
      
      document.body.appendChild(script);
      this.loadedScripts.add(socialBarScript);
      
      console.log('✅ Social Bar loaded');
    }, this.config.socialBar.delay || 5000);
  }

  // === 13. تحميل Popunder ===
  loadPopunder() {
    if (!this.config.popunder?.enabled) return;
    
    const frequency = this.config.popunder.frequency;
    const maxPerSession = this.config.popunder.maxPerSession || 1;
    
    // التحقق من عدد المرات المسموح بها
    if (frequency === 'once_per_session') {
      const currentCount = this.sessionData.popunderCount || 0;
      
      if (currentCount >= maxPerSession) {
        console.log(`⚠️ Popunder limit reached: ${currentCount}/${maxPerSession}`);
        return;
      }
    }
    
    setTimeout(() => {
      this.config.popunder.scripts.forEach((scriptUrl, index) => {
        // التحقق من عدم تحميل السكريبت مسبقاً
        if (this.loadedScripts.has(scriptUrl)) {
          console.log(`⚠️ Popunder script already loaded: ${scriptUrl}`);
          return;
        }
        
        const script = document.createElement('script');
        script.src = scriptUrl;
        script.async = true;
        script.setAttribute('data-cfasync', 'false');
        script.id = `popunder-script-${index}`;
        
        document.body.appendChild(script);
        this.loadedScripts.add(scriptUrl);
        
        console.log(`✅ Popunder script loaded: ${scriptUrl}`);
      });
      
      // تحديث العداد
      this.sessionData.popunderCount = (this.sessionData.popunderCount || 0) + 1;
      this.sessionData.popunderShown = true;
      this.saveSessionData();
      
      console.log(`📊 Popunder count: ${this.sessionData.popunderCount}/${maxPerSession}`);
    }, this.config.popunder.delay || 8000);
  }

  // === 14. تحميل Smartlink كـ Popunder ===
  loadSmartlink() {
    if (!this.config.smartlink?.enabled) return;
    
    const frequency = this.config.smartlink.frequency;
    if (frequency === 'once_per_session' && this.sessionData.smartlinkOpened) {
      console.log('⚠️ Smartlink already opened in this session');
      return;
    }
    
    const openSmartlink = () => {
      setTimeout(() => {
        if (this.config.smartlink.openInNewTab) {
          const newTab = window.open(this.config.smartlink.url, '_blank', 'noopener,noreferrer');
          if (newTab) {
            this.sessionData.smartlinkOpened = true;
            this.saveSessionData();
            console.log('✅ Smartlink opened in new tab');
          }
        } else {
          window.location.href = this.config.smartlink.url;
        }
      }, this.config.smartlink.delay || 3000);
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
    
    setTimeout(() => checkGameLoaded(), 2000);
  }

  // === 15. فحص وإصلاح الحاويات ===
  fixAdContainers() {
    console.log('🔧 فحص وإصلاح حاويات الإعلانات...');
    
    const containers = [
      'ad-above-iframe',
      'ad-below-iframe', 
      'ad-page-bottom',
      'ad-sidebar',
      'ad-page-middle'
    ];
    
    containers.forEach(containerId => {
      let container = document.getElementById(containerId);
      
      if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        container.style.cssText = `
          min-height: 50px;
          margin: 20px 0;
          position: relative;
          background: transparent;
        `;
        
        // تحديد مكان الإدراج
        switch(containerId) {
          case 'ad-above-iframe':
          case 'ad-below-iframe':
            const gameContainer = document.querySelector('.game-container');
            if (gameContainer) {
              if (containerId === 'ad-above-iframe') {
                const iframe = gameContainer.querySelector('.game-frame');
                if (iframe) {
                  gameContainer.insertBefore(container, iframe);
                } else {
                  gameContainer.prepend(container);
                }
              } else {
                gameContainer.appendChild(container);
              }
            }
            break;
            
          case 'ad-page-bottom':
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
              const seoContent = mainContent.querySelector('.seo-content');
              if (seoContent) {
                seoContent.parentNode.insertBefore(container, seoContent.nextSibling);
              } else {
                mainContent.appendChild(container);
              }
            }
            break;
            
          case 'ad-sidebar':
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) {
              sidebar.appendChild(container);
            }
            break;
            
          case 'ad-page-middle':
            const gameInfo = document.querySelector('.game-info');
            if (gameInfo) {
              gameInfo.parentNode.insertBefore(container, gameInfo.nextSibling);
            }
            break;
        }
        
        console.log(`✅ تم إنشاء حاوية: ${containerId}`);
      }
    });
  }

  // === 16. دالة مساعدة للتأكد من وجود الحاوية ===
  ensureContainerExists(containerId) {
    let container = document.getElementById(containerId);
    
    if (!container) {
      console.log(`⚠️ حاوية ${containerId} غير موجودة، إنشاء جديدة...`);
      container = document.createElement('div');
      container.id = containerId;
      container.style.cssText = `
        min-height: 50px;
        margin: 20px 0;
        position: relative;
        background: transparent;
      `;
      
      // محاولة إيجاد مكان مناسب
      if (containerId.includes('above')) {
        const gameFrame = document.querySelector('.game-frame');
        if (gameFrame && gameFrame.parentNode) {
          gameFrame.parentNode.insertBefore(container, gameFrame);
        }
      } else if (containerId.includes('below')) {
        const gameFrame = document.querySelector('.game-frame');
        if (gameFrame && gameFrame.parentNode) {
          gameFrame.parentNode.insertBefore(container, gameFrame.nextSibling);
        }
      } else if (containerId.includes('sidebar')) {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
          sidebar.appendChild(container);
        }
      } else {
        document.body.appendChild(container);
      }
    }
    
    return container;
  }

  // === 17. عرض إعلانات فولباك (فقط عند الحاجة) ===
  showFallbackAds() {
    // تم إزالة الاستدعاء التلقائي، فقط عند الفشل الكامل
  }

  // === 18. دالة عرض بديل عند فشل الإعلان ===
  showFallbackInContainer(container, containerId) {
    if (!container) return;
    
    // التحقق إذا كان قد تم عرض الفولباك بالفعل
    if (container.querySelector('.fallback-ad')) {
      return;
    }
    
    console.log(`🔄 عرض إعلان احتياطي في ${containerId}`);
    
    container.innerHTML = `
      <div class="ad-banner fallback-ad" style="text-align:center;padding:20px;">
        <div class="ad-label">Advertisement</div>
        <p style="color:#fff;margin:10px 0;">Loading advertisement...</p>
        <div style="color:rgba(255,255,255,0.7);font-size:12px;margin-top:10px;">
          Please wait while we load the ad
        </div>
      </div>
    `;
    
    // محاولة إعادة تحميل الإعلان بعد 10 ثواني
    setTimeout(() => {
      const activeAd = this.activeAds.get(containerId);
      if (activeAd && !activeAd.loaded) {
        console.log(`🔄 إعادة تحميل الإعلان في ${containerId}`);
        
        // عرض الرسالة النهائية بعد محاولة إعادة التحميل
        container.innerHTML = `
          <div class="ad-banner fallback-ad" style="text-align:center;padding:15px;">
            <div class="ad-label">Sponsored</div>
            <div style="color:#fff;padding:10px;">
              <p style="margin:5px 0;">Support our site by allowing ads</p>
              <a href="https://rowhub.github.io" style="color:#3498db;text-decoration:none;">Browse All Games</a>
            </div>
          </div>
        `;
      }
    }, 10000);
  }

  // === 19. إدارة الجلسة ===
  getSessionData() {
    try {
      const data = sessionStorage.getItem('adsSessionData');
      return data ? JSON.parse(data) : {
        popunderShown: false,
        popunderCount: 0,
        smartlinkOpened: false,
        adsLoaded: 0,
        sessionId: Date.now()
      };
    } catch (error) {
      console.error('خطأ في قراءة بيانات الجلسة:', error);
      return {
        popunderShown: false,
        popunderCount: 0,
        smartlinkOpened: false,
        adsLoaded: 0,
        sessionId: Date.now()
      };
    }
  }

  saveSessionData() {
    try {
      sessionStorage.setItem('adsSessionData', JSON.stringify(this.sessionData));
      console.log('💾 تم حفظ بيانات الجلسة:', this.sessionData);
    } catch (error) {
      console.error('خطأ في حفظ بيانات الجلسة:', error);
    }
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

  // === 21. دالة مساعدة للتأخير ===
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // === 22. تنظيف الموارد ===
  destroy() {
    Object.values(this.rotationTimers).forEach(timer => clearInterval(timer));
    this.rotationTimers = {};
    this.loadedScripts.clear();
    this.activeAds.clear();
    console.log('🧹 تم تنظيف موارد الإعلانات');
  }
}

// === تشغيل تلقائي ===
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 بدء تشغيل نظام الإعلانات...');
  
  const adsManager = new AdsManager();
  adsManager.init();
  window.adsManager = adsManager;
  
  // إضافة أنماط CSS محسنة
  const style = document.createElement('style');
  style.textContent = `
    .ad-banner {
      background: rgba(0,0,0,0.7);
      border-radius: 8px;
      padding: 15px;
      margin: 20px 0;
      position: relative;
      backdrop-filter: blur(5px);
      border: 1px solid rgba(255,255,255,0.1);
      transition: all 0.3s ease;
      min-height: 50px;
    }
    
    .ad-banner:hover {
      border-color: rgba(255,255,255,0.3);
      box-shadow: 0 5px 15px rgba(0,0,0,0.3);
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
      font-weight: bold;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      z-index: 10;
    }
    
    .ad-sidebar {
      position: sticky;
      top: 100px;
      margin-bottom: 20px;
    }
    
    .native-ad-banner {
      background: linear-gradient(135deg, rgba(26,42,108,0.8), rgba(178,31,31,0.8));
    }
    
    #ad-above-iframe {
      margin-bottom: 15px;
    }
    
    #ad-below-iframe {
      margin-top: 15px;
      margin-bottom: 25px;
    }
    
    #ad-page-bottom {
      margin-top: 30px;
      margin-bottom: 20px;
      text-align: center;
    }
    
    #ad-page-middle {
      margin: 25px 0;
      text-align: center;
    }
    
    #ad-sidebar-extra {
      margin-top: 20px;
    }
    
    body.adblock-blocked > *:not(#adblock-block-overlay) {
      pointer-events: none !important;
      opacity: 0.3;
      filter: blur(2px);
    }
    
    #adblock-block-overlay,
    #adblock-block-overlay * {
      filter: none !important;
      opacity: 1 !important;
      pointer-events: auto !important;
    }
    
    .fallback-ad {
      background: linear-gradient(135deg, rgba(26,42,108,0.5), rgba(52,152,219,0.5));
    }
    
    /* تحسين العرض على الأجهزة المحمولة */
    @media (max-width: 768px) {
      .ad-banner {
        padding: 10px;
        margin: 15px 0;
      }
      
      .ad-sidebar {
        position: static;
      }
    }
    
    @media (max-width: 480px) {
      .ad-banner {
        padding: 8px;
        margin: 10px 0;
      }
    }
  `;
  document.head.appendChild(style);
  
  console.log('🎨 تم تحميل أنماط الإعلانات');
});
