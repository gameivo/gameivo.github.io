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
      console.log('🎯 تم تفعيل جميع الإعلانات بنجاح');
      
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

  // اختبار 1: إنشاء عنصر إعلان وتفحصه
  async testAdElement() {
    return new Promise(resolve => {
      const adElement = document.createElement('div');
      adElement.id = 'adblock-test-element-' + Date.now();
      
      const adClasses = [
        'ad', 'ads', 'advertisement', 'advert', 
        'ad-banner', 'ad-container', 'ad-wrapper',
        'pub', 'publicite', 'sponsor', 'sponsored'
      ];
      
      adClasses.forEach(className => {
        adElement.classList.add(className);
      });
      
      adElement.innerHTML = `
        <div style="width: 728px; height: 90px; background: #1a2a6c; color: white; 
                    display: flex; align-items: center; justify-content: center;">
          Advertisement
        </div>
      `;
      
      adElement.style.cssText = `
        position: fixed;
        top: -9999px;
        left: -9999px;
        width: 728px;
        height: 90px;
        z-index: -999999;
        visibility: hidden;
      `;
      
      document.body.appendChild(adElement);
      
      setTimeout(() => {
        const computedStyle = window.getComputedStyle(adElement);
        const isBlocked = 
          adElement.offsetHeight === 0 ||
          adElement.offsetWidth === 0 ||
          computedStyle.display === 'none' ||
          computedStyle.visibility === 'hidden' ||
          computedStyle.opacity === '0' ||
          adElement.style.display === 'none' ||
          !document.body.contains(adElement);
        
        if (adElement.parentNode) {
          adElement.parentNode.removeChild(adElement);
        }
        
        resolve(isBlocked);
      }, 500);
    });
  }

  // اختبار 2: محاولة تحميل سكريبت إعلان
  async testAdScript() {
    return new Promise(resolve => {
      const testScript = document.createElement('script');
      testScript.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
      testScript.id = 'adblock-test-script-' + Date.now();
      testScript.async = true;
      
      let scriptLoaded = false;
      let scriptBlocked = false;
      
      testScript.onload = () => {
        scriptLoaded = true;
        resolve(false);
      };
      
      testScript.onerror = () => {
        scriptBlocked = true;
        resolve(true);
      };
      
      document.head.appendChild(testScript);
      
      setTimeout(() => {
        if (!scriptLoaded && !scriptBlocked) {
          if (testScript.parentNode) {
            testScript.parentNode.removeChild(testScript);
          }
          resolve(true);
        }
      }, 2000);
    });
  }

  // اختبار 3: محاولة fetch لمسار إعلان
  async testAdFetch() {
    try {
      const response = await fetch('https://google-analytics.com/analytics.js', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache'
      });
      
      return false;
    } catch (error) {
      return true;
    }
  }

  // === 3. حجب الصفحة عند اكتشاف AdBlock ===
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
    
    blockOverlay.addEventListener('contextmenu', e => e.preventDefault());
    blockOverlay.addEventListener('keydown', e => {
      if (e.key === 'F12' || e.key === 'F5' || 
          (e.ctrlKey && e.shiftKey && e.key === 'I') ||
          e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    });
    
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
        
        <div style="
          background: rgba(0, 0, 0, 0.4);
          border-radius: 15px;
          padding: 25px;
          margin-bottom: 25px;
          line-height: 1.7;
          text-align: left;
        ">
          <p style="font-size: 18px; margin-bottom: 15px;">
            <strong>We have detected that you are using an ad blocker.</strong>
          </p>
          
          <p style="margin-bottom: 15px; font-size: 16px;">
            Our website is <strong>100% free</strong> and relies exclusively on advertisements to operate. 
            By blocking ads, you are preventing us from providing free content.
          </p>
          
          <div style="
            background: rgba(255, 68, 68, 0.2);
            border-left: 4px solid #ff4444;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
          ">
            <p style="margin: 0; font-weight: bold; color: #ffd700;">
              ⚠️ <strong>Access Denied:</strong> You cannot access the game with ad blocker enabled.
            </p>
          </div>
          
          <h3 style="color: #3498db; margin: 20px 0 15px 0;">
            📋 To Continue:
          </h3>
          <ol style="margin-left: 20px; font-size: 16px;">
            <li style="margin-bottom: 8px;">Disable your ad blocker for this website</li>
            <li style="margin-bottom: 8px;">Refresh this page</li>
            <li style="margin-bottom: 8px;">Add our site to your whitelist</li>
          </ol>
        </div>
        
        <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap; margin-top: 30px;">
          <button onclick="window.location.reload()" style="
            background: linear-gradient(135deg, #2ecc71, #27ae60);
            color: white;
            border: none;
            padding: 16px 35px;
            border-radius: 10px;
            cursor: pointer;
            font-size: 18px;
            font-weight: bold;
            transition: all 0.3s;
            min-width: 250px;
          ">
            🔄 I've Disabled Ad Blocker - Refresh
          </button>
          
          <button onclick="window.showAdBlockHelp()" style="
            background: linear-gradient(135deg, #3498db, #2980b9);
            color: white;
            border: none;
            padding: 16px 35px;
            border-radius: 10px;
            cursor: pointer;
            font-size: 18px;
            font-weight: bold;
            transition: all 0.3s;
            min-width: 250px;
          ">
            📖 How to Disable Ad Block
          </button>
        </div>
        
        <p style="margin-top: 25px; color: rgba(255, 255, 255, 0.7); font-size: 14px;">
          This message will appear until ad blocker is disabled.
        </p>
      </div>
    `;
    
    document.body.appendChild(blockOverlay);
    
    this.disableOriginalPage();
    
    window.showAdBlockHelp = () => this.showAdBlockHelp();
  }

  // === 4. تعطيل الصفحة الأصلية ===
  disableOriginalPage() {
    document.body.classList.add('adblock-blocked');
    
    const elements = document.querySelectorAll('a, button, input, select, textarea, iframe, [onclick]');
    elements.forEach(el => {
      el.style.pointerEvents = 'none';
      el.style.opacity = '0.3';
      el.style.filter = 'blur(2px)';
    });
    
    const gameIframe = document.getElementById('game-iframe');
    if (gameIframe) {
      gameIframe.style.pointerEvents = 'none';
      gameIframe.style.opacity = '0.2';
      gameIframe.style.filter = 'blur(5px) grayscale(1)';
    }
    
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  }

  // === 5. عرض مساعدة AdBlock ===
  showAdBlockHelp() {
    const helpOverlay = document.createElement('div');
    helpOverlay.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #1a2a6c, #302b63);
      padding: 40px;
      border-radius: 20px;
      max-width: 900px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      z-index: 2147483648;
      color: white;
      box-shadow: 0 30px 80px rgba(0,0,0,0.6);
      border: 2px solid #3498db;
    `;
    
    helpOverlay.innerHTML = `
      <div style="position: relative;">
        <button onclick="this.parentElement.parentElement.remove()" style="
          position: absolute;
          top: 15px;
          right: 15px;
          background: #ff4444;
          color: white;
          border: none;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 20px;
        ">✕</button>
        
        <h2 style="text-align: center; margin-bottom: 30px; color: #ffd700;">
          How to Disable Ad Blocker
        </h2>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
          <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px;">
            <h3 style="color: #2ecc71;">AdBlock Plus</h3>
            <ol>
              <li>Click the AdBlock Plus icon</li>
              <li>Click "Don't run on pages on this domain"</li>
              <li>Refresh the page</li>
            </ol>
          </div>
          
          <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px;">
            <h3 style="color: #3498db;">uBlock Origin</h3>
            <ol>
              <li>Click the uBlock Origin icon</li>
              <li>Click the big power button</li>
              <li>Refresh the page</li>
            </ol>
          </div>
          
          <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px;">
            <h3 style="color: #9b59b6;">AdGuard</h3>
            <ol>
              <li>Click the AdGuard icon</li>
              <li>Disable protection for this site</li>
              <li>Refresh the page</li>
            </ol>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <button onclick="location.reload()" style="
            background: #2ecc71;
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
          ">
            Refresh After Disabling
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(helpOverlay);
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
    
    // 5. إعلانات إضافية
    await this.delay(2000);
    this.loadAdditionalAds();
    
    // 6. إعلانات تفاعلية
    await this.delay(2500);
    this.loadPopunder();
    this.loadSmartlink();
  }

  // === 7. تحميل البانرات ===
  async loadBanners() {
    console.log('🖼️ تحميل البانرات...');
    
    // فوق iframe - استخدام جميع الإعلانات بالتناوب
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
    
    // إضافة إعلان في وسط المحتوى
    setTimeout(() => {
      this.loadMiddleAd();
    }, 2000);
  }

  loadBannerAd(containerId, bannerConfig) {
    const container = this.ensureContainerExists(containerId);
    if (!container) {
      console.warn(`❌ Container ${containerId} not found, creating...`);
      return;
    }
    
    container.innerHTML = '';
    
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

  loadSingleAd(container, ad, containerId) {
    if (!ad || !ad.script) return;
    
    console.log(`📢 تحميل إعلان: ${ad.id} في ${containerId}`);
    
    const adDiv = document.createElement('div');
    adDiv.className = 'ad-banner';
    adDiv.id = `ad-${ad.id}-${containerId}`;
    adDiv.innerHTML = `
      <div class="ad-label">Advertisement</div>
      <div id="banner-${ad.id}" style="text-align:center;min-height:${ad.config?.height || 90}px;"></div>
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
      script.className = `atScript${ad.config?.key}`;
      
      const targetElement = document.getElementById(`banner-${ad.id}`);
      if (targetElement) {
        targetElement.appendChild(script);
        console.log(`✅ تم تحميل إعلان: ${ad.id}`);
      }
    }, 300);
  }

  // === 8. إضافة إعلان في وسط المحتوى ===
  loadMiddleAd() {
    const container = this.ensureContainerExists('ad-page-middle');
    
    const adConfig = {
      rotation: true,
      rotationInterval: 35000,
      ads: [
        {
          id: "banner-300x250-middle",
          script: "https://www.highperformanceformat.com/c84b7f14ef2b488fb99e7411123accf1/invoke.js",
          config: {
            key: "c84b7f14ef2b488fb99e7411123accf1",
            format: "iframe",
            height: 250,
            width: 300
          }
        },
        {
          id: "banner-468x60-middle",
          script: "https://www.highperformanceformat.com/b07536416d988628a30c9fd13c94a851/invoke.js",
          config: {
            key: "b07536416d988628a30c9fd13c94a851",
            format: "iframe",
            height: 60,
            width: 468
          }
        }
      ]
    };
    
    this.loadBannerAd('ad-page-middle', adConfig);
  }

  // === 9. تحميل إعلانات إضافية ===
  loadAdditionalAds() {
    console.log('➕ تحميل إعلانات إضافية...');
    
    // 1. إعلان في نهاية الصفحة
    const footerAd = document.createElement('div');
    footerAd.id = 'ad-footer';
    footerAd.style.cssText = `
      min-height: 90px;
      margin: 30px auto;
      max-width: 728px;
      text-align: center;
      background: rgba(0,0,0,0.7);
      border-radius: 8px;
      padding: 15px;
    `;
    
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.appendChild(footerAd);
      
      const footerConfig = {
        rotation: false,
        ads: [
          {
            id: "banner-728x90-footer",
            script: "https://www.highperformanceformat.com/a29bc677676d4759eafbbf48bff57ae3/invoke.js",
            config: {
              key: "a29bc677676d4759eafbbf48bff57ae3",
              format: "iframe",
              height: 90,
              width: 728
            }
          }
        ]
      };
      
      this.loadBannerAd('ad-footer', footerConfig);
    }
    
    // 2. إعلان إضافي في الجانب
    setTimeout(() => {
      this.loadExtraSidebarAd();
    }, 3000);
  }

  // === 10. تحميل إعلان إضافي في الجانب ===
  loadExtraSidebarAd() {
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
    
    // تحميل الإعلان الإضافي
    const extraAdConfig = {
      rotation: true,
      rotationInterval: 40000,
      ads: [
        {
          id: "sidebar-160x300-extra",
          script: "https://www.highperformanceformat.com/77500fee8ec2644cacc4361ea5fac945/invoke.js",
          config: {
            key: "77500fee8ec2644cacc4361ea5fac945",
            format: "iframe",
            height: 300,
            width: 160
          }
        },
        {
          id: "sidebar-300x250-extra",
          script: "https://www.highperformanceformat.com/c84b7f14ef2b488fb99e7411123accf1/invoke.js",
          config: {
            key: "c84b7f14ef2b488fb99e7411123accf1",
            format: "iframe",
            height: 250,
            width: 300
          }
        }
      ]
    };
    
    this.loadBannerAd('ad-sidebar-extra', extraAdConfig);
  }

  // === 11. تحميل Native Banner ===
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
        container.appendChild(script);
        console.log('✅ Native Banner loaded');
      }, 1000);
    }
  }

  // === 12. تحميل إعلانات Sidebar ===
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
      const interval = this.config.sidebarAd.rotationInterval || 40000;
      
      this.rotationTimers['sidebar'] = setInterval(() => {
        currentIndex = (currentIndex + 1) % ads.length;
        this.loadSidebarAd(container, ads[currentIndex]);
        console.log(`🔄 تدوير إعلان Sidebar: ${ads[currentIndex].id}`);
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
      script.className = `atScript${ad.config?.key}`;
      
      const targetElement = document.getElementById(`sidebar-${ad.id}`);
      if (targetElement) {
        targetElement.appendChild(script);
        console.log(`✅ Sidebar Ad loaded: ${ad.id}`);
      }
    }, 300);
  }

  // === 13. تحميل Social Bar ===
  loadSocialBar() {
    if (!this.config.popunder?.scripts || this.config.popunder.scripts.length === 0) return;
    
    // Social Bar هو السكريبت الأول في المصفوفة
    const socialBarScript = this.config.popunder.scripts[0];
    
    setTimeout(() => {
      const script = document.createElement('script');
      script.src = socialBarScript;
      script.async = true;
      script.setAttribute('data-cfasync', 'false');
      script.id = 'social-bar-script';
      
      document.body.appendChild(script);
      
      console.log('✅ Social Bar loaded');
    }, 5000);
  }

  // === 14. تحميل Popunder ===
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
        script.setAttribute('data-cfasync', 'false');
        document.body.appendChild(script);
        console.log('✅ Popunder script loaded:', scriptUrl);
      });
      
      this.sessionData.popunderShown = true;
      this.saveSessionData();
    }, this.config.popunder.delay || 8000);
  }

  // === 15. تحميل Smartlink ===
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
            console.log('✅ Smartlink opened in new tab');
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

  // === 16. فحص وإصلاح الحاويات ===
  fixAdContainers() {
    console.log('🔧 فحص وإصلاح حاويات الإعلانات...');
    
    const containers = [
      'ad-above-iframe',
      'ad-below-iframe', 
      'ad-page-bottom',
      'ad-sidebar',
      'ad-page-middle',
      'ad-sidebar-extra'
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
          case 'ad-sidebar-extra':
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

  // === 17. دالة مساعدة للتأكد من وجود الحاوية ===
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

  // === 18. عرض إعلانات فولباك ===
  showFallbackAds() {
    console.log('🔄 عرض إعلانات احتياطية...');
    
    // إعلانات احتياطية بسيطة
    const fallbackAds = [
      {
        id: 'fallback-1',
        html: `
          <div class="ad-banner" style="text-align:center;padding:20px;">
            <div class="ad-label">Advertisement</div>
            <p style="color:#fff;margin:10px 0;">Support our site by disabling ad blocker</p>
            <a href="#" onclick="window.location.reload()" style="color:#3498db;text-decoration:none;">Refresh after disabling</a>
          </div>
        `
      }
    ];
    
    // وضع إعلانات احتياطية في الحاويات الرئيسية
    ['ad-above-iframe', 'ad-below-iframe', 'ad-sidebar'].forEach(containerId => {
      const container = document.getElementById(containerId);
      if (container && fallbackAds[0]) {
        container.innerHTML = fallbackAds[0].html;
      }
    });
  }

  // === 19. إدارة الجلسة ===
  getSessionData() {
    const data = sessionStorage.getItem('adsSessionData');
    return data ? JSON.parse(data) : {
      popunderShown: false,
      smartlinkOpened: false,
      adsLoaded: 0
    };
  }

  saveSessionData() {
    sessionStorage.setItem('adsSessionData', JSON.stringify(this.sessionData));
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
    
    #ad-footer {
      margin: 30px auto;
      max-width: 728px;
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
    
    /* تحسين العرض على الأجهزة المحمولة */
    @media (max-width: 768px) {
      .ad-banner {
        padding: 10px;
        margin: 15px 0;
      }
      
      .ad-sidebar {
        position: static;
      }
      
      #ad-footer {
        margin: 20px auto;
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
