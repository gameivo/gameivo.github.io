/**
 * 🎯 نظام إدارة الإعلانات الذكي - النسخة المحسّنة والمُصلحة
 * ✅ إصلاح البانرات السوداء
 * ✅ إصلاح Popunder للعمل مرة واحدة فقط
 * ✅ إضافة جميع الإعلانات الجديدة
 * ✅ الحفاظ على نظام Anti-AdBlock
 * ✅ إضافة نظام تحجيم ذكي للإعلانات (Zero Clipping Solution)
 * 🆕 تحسينات جديدة: اكتشاف نوع الإعلان (عرضي/مربع) وتكييف الحاوية تلقائياً
 * 🆕 تحسين التحجيم لتجنب القص مع الحفاظ على aspect ratio
 * 🆕 توافق كامل مع الأجهزة المحمولة عبر ResizeObserver وmedia queries
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
    this.adScalingObservers = new Map();
  }

  // === نظام تحجيم الإعلانات الذكي المحسّن ===
  scaleAdElement(adElement) {
    if (!adElement || !adElement.parentElement) return;
    
    const container = adElement.closest('[id^="ad-"]') || adElement.parentElement;
    if (!container) return;
    
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const adWidth = adElement.offsetWidth || adElement.scrollWidth;
    const adHeight = adElement.offsetHeight || adElement.scrollHeight;
    
    // 🆕 اكتشاف نوع الإعلان: عرضي (horizontal) إذا كان العرض > الارتفاع * 2، مربع خلاف ذلك
    const isHorizontal = adWidth > (adHeight * 2);
    console.log(`📐 نوع الإعلان: ${isHorizontal ? 'عرضي' : 'مربع'}`);
    
    // 🆕 تكييف أبعاد الحاوية بناءً على نوع الإعلان لتجنب عدم التطابق
    if (isHorizontal) {
      container.style.minHeight = `${Math.min(adHeight, 100)}px`; // حد أدنى للعرضي
      container.style.width = '100%';
    } else {
      container.style.minWidth = `${Math.min(adWidth, 300)}px`; // حد أدنى للمربع
      container.style.height = 'auto';
    }
    
    // 🆕 حساب التحجيم مع الحفاظ على aspect ratio لتجنب القص
    if (adWidth > containerWidth || adHeight > containerHeight) {
      const scaleX = containerWidth / adWidth;
      const scaleY = containerHeight / adHeight;
      const scaleValue = Math.min(scaleX, scaleY, 0.95); // اختيار أصغر نسبة للحفاظ على الشكل
      
      adElement.style.transform = `scale(${scaleValue})`;
      adElement.style.transformOrigin = 'top center';
      adElement.style.maxWidth = '100%';
      adElement.style.maxHeight = '100%';
      adElement.style.overflow = 'hidden';
      adElement.style.objectFit = 'contain'; // 🆕 للصور والعناصر الداخلية: يحافظ على الشكل دون قص
      
      console.log(`📐 تحجيم الإعلان: ${adWidth}x${adHeight} -> ${containerWidth}x${containerHeight}`);
    }
  }

  scaleAllAds() {
    document.querySelectorAll('.ad-banner iframe, .ad-banner ins, div[id^="banner-"], div[id^="sidebar-"]')
      .forEach(ad => this.scaleAdElement(ad));
  }

  startAdScalingSystem() {
    console.log('📏 بدء نظام تحجيم الإعلانات...');
    
    // 🆕 استخدام ResizeObserver لمراقبة تغييرات الحجم في الوقت الفعلي (أفضل للأجهزة المحمولة)
    const resizeObserver = new ResizeObserver(() => {
      this.scaleAllAds();
    });
    resizeObserver.observe(document.body);
    
    // الحفاظ على MutationObserver للتغييرات في الهيكل
    const mutationObserver = new MutationObserver(() => {
      setTimeout(() => this.scaleAllAds(), 100);
    });
    
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    setInterval(() => this.scaleAllAds(), 2000);
    window.addEventListener('resize', () => this.scaleAllAds());
  }

  // ... (الباقي من الكود الأصلي دون تغيير، باستثناء تحميل الإعلانات حيث أضفت استدعاء scaleAdElement بعد التحميل)

  // في loadSingleAd: إضافة استدعاء التحجيم بعد التحميل
  loadSingleAd(container, ad, containerId) {
    if (!ad || !ad.script) return;
    
    console.log(`📢 تحميل إعلان: ${ad.id} في ${containerId}`);
    
    const uniqueId = `${ad.id}-${Date.now()}`;
    
    window.atOptions = window.atOptions || {};
    Object.assign(window.atOptions, {
        ...ad.config,
        params: ad.config?.params || {}
    });
    
    const adDiv = document.createElement('div');
    adDiv.className = 'ad-banner ad-modern-wrapper';
    adDiv.id = `ad-wrapper-${uniqueId}`;
    adDiv.setAttribute('data-ad-id', ad.id);
    adDiv.setAttribute('data-container', containerId);
    adDiv.innerHTML = `
      <div class="ad-label">Advertisement</div>
      <div class="ad-content-scaler" id="banner-${uniqueId}" style="text-align:center;min-height:${ad.config?.height || 90}px;background:transparent;"></div>
    `;
    
    container.innerHTML = '';
    container.appendChild(adDiv);
    
    setTimeout(() => {
        const script = document.createElement('script');
        script.src = ad.script;
        script.async = true;
        script.setAttribute('data-cfasync', 'false');
        script.id = `script-${uniqueId}`;
        
        script.onload = () => {
            console.log(`✅ تم تحميل إعلان: ${ad.id}`);
            setTimeout(() => {
              const adElement = document.getElementById(`banner-${uniqueId}`);
              if (adElement) this.scaleAdElement(adElement); // 🆕 استدعاء التحجيم بعد التحميل
            }, 1000);
        };
        
        script.onerror = () => {
            console.warn(`⚠️ فشل تحميل إعلان: ${ad.id}`);
            this.showFallbackInContainer(container);
        };
        
        const targetElement = document.getElementById(`banner-${uniqueId}`);
        if (targetElement) {
            targetElement.appendChild(script);
        }
    }, 300);
  }

  // في loadSidebarAd: إضافة مشابهة
  loadSidebarAd(container, ad) {
    const uniqueId = `${ad.id}-${Date.now()}`;
    
    window.atOptions = window.atOptions || {};
    Object.assign(window.atOptions, {
        ...ad.config,
        params: ad.config?.params || {}
    });
    
    const adDiv = document.createElement('div');
    adDiv.className = 'ad-banner ad-sidebar ad-modern-wrapper';
    adDiv.setAttribute('data-ad-id', ad.id);
    adDiv.setAttribute('data-container', 'sidebar');
    adDiv.innerHTML = `
      <div class="ad-label">Advertisement</div>
      <div class="ad-content-scaler" id="sidebar-${uniqueId}" style="text-align:center;min-height:${ad.config?.height || 300}px;background:transparent;"></div>
    `;
    
    container.innerHTML = '';
    container.appendChild(adDiv);
    
    setTimeout(() => {
        const script = document.createElement('script');
        script.src = ad.script;
        script.async = true;
        script.setAttribute('data-cfasync', 'false');
        script.id = `sidebar-script-${uniqueId}`;
        
        script.onload = () => {
            console.log(`✅ Sidebar Ad loaded: ${ad.id}`);
            setTimeout(() => {
              const adElement = document.getElementById(`sidebar-${uniqueId}`);
              if (adElement) this.scaleAdElement(adElement); // 🆕 استدعاء التحجيم
            }, 1000);
        };
        
        script.onerror = () => {
            console.warn(`⚠️ فشل تحميل Sidebar Ad: ${ad.id}`);
            this.showFallbackInContainer(container);
        };
        
        const targetElement = document.getElementById(`sidebar-${uniqueId}`);
        if (targetElement) {
            targetElement.appendChild(script);
        }
    }, 300);
  }

  // ... (الباقي من الكود الأصلي)

  // === تشغيل تلقائي ===
  document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 بدء تشغيل نظام الإعلانات...');
    
    const adsManager = new AdsManager();
    adsManager.init();
    window.adsManager = adsManager;
    
    // إضافة أنماط CSS محسنة (مع إضافات جديدة للتوافق)
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
        overflow: hidden !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        text-align: center !important;
      }
      
      .ad-modern-wrapper {
        width: 100% !important;
        height: auto !important;
      }
      
      .ad-content-scaler {
        display: inline-block !important;
        transition: all 0.3s ease !important;
        max-width: 100% !important;
        max-height: 100% !important; /* 🆕 لتجنب تجاوز الارتفاع */
        transform-origin: top center !important;
        overflow: hidden !important;
        position: relative !important;
        object-fit: contain !important; /* 🆕 للحفاظ على الشكل دون قص */
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
      
      /* إصلاحات Zero Clipping */
      .ad-container-responsive {
        max-width: 100vw !important;
        overflow-x: hidden !important;
      }

      /* === حل نهائي للإعلانات الكبيرة على الموبايل === */
      .ad-banner iframe,
      .ad-banner ins,
      .ad-modern-wrapper iframe,
      .ad-modern-wrapper ins,
      div[id^="banner-"] iframe,
      div[id^="sidebar-"] iframe {
        max-width: 100% !important;
        max-height: 100% !important;
        transform-origin: top center !important;
        display: block !important;
        margin: 0 auto !important;
        transform: scale(0.95) !important;
        object-fit: contain !important; /* 🆕 لتجنب القص في iframes */
      }

      @media (max-width: 768px) {
        .ad-banner iframe,
        .ad-banner ins {
          transform: scale(0.9) !important;
          transform-origin: center center !important;
        }
        
        html, body {
          overflow-x: hidden !important;
          position: relative;
          width: 100%;
        }
      }

      ins.adsbygoogle[data-ad-status="unfilled"],
      ins.adsbygoogle iframe {
        max-width: 100% !important;
        width: 100% !important;
      }
      
      /* منع التمرير الأفقي على جميع الأجهزة */
      html, body {
        overflow-x: hidden !important;
        max-width: 100% !important;
      }
      
      /* تحسين العرض على الأجهزة المحمولة */
      @media (max-width: 768px) {
        .ad-banner {
          padding: 10px !important;
          margin: 10px 0 !important;
          border-radius: 6px !important;
        }
        
        .ad-sidebar {
          position: static !important;
        }
        
        .ad-content-scaler {
          transform-origin: center center !important;
        }
        
        /* تحجيم تلقائي للبانرات العريضة على الموبايل */
        #ad-above-iframe,
        #ad-below-iframe,
        #ad-page-bottom {
          padding: 8px !important;
          margin: 8px 0 !important;
        }
        
        /* ضبط أقصى عرض للإعلانات على الموبايل */
        .ad-banner > *,
        .ad-modern-wrapper > * {
          max-width: calc(100vw - 20px) !important;
        }
        
        /* 🆕 تكييف للإعلانات العرضية على الموبايل: تقليص إضافي */
        .ad-banner[data-ad-type="horizontal"] {
          transform: scale(0.85) !important;
        }
      }
      
      @media (max-width: 480px) {
        .ad-banner {
          padding: 6px !important;
          margin: 6px 0 !important;
          border-radius: 4px !important;
        }
        
        .ad-label {
          font-size: 8px;
          padding: 1px 4px;
        }
        
        /* ضبط أقصر لأحجام الإعلانات على الشاشات الصغيرة */
        #ad-sidebar,
        #ad-sidebar-extra {
          min-height: 250px !important;
        }
      }
      
      /* أنماط التحجيم الذكي */
      .ad-scaled {
        transition: transform 0.3s ease !important;
      }
      
      /* منع التمرير الأفقي داخل الإعلانات */
      .ad-banner * {
        max-width: 100% !important;
        box-sizing: border-box !important;
      }
      
      /* إصلاح خاص لشركات الإعلانات الشائعة */
      ins.adsbygoogle,
      iframe[src*="ads"],
      div[id*="ad"],
      div[class*="ad"] {
        max-width: 100% !important;
        overflow: hidden !important;
      }
    `;
    document.head.appendChild(style);
    
    console.log('🎨 تم تحميل أنماط الإعلانات');
  });
