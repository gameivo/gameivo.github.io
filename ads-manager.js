/**
 * 🎯 نظام إدارة الإعلانات الذكي - النسخة الصارمة
 * مع نظام Anti-AdBlock يحجب المحتوى
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
      
      // 🔍 أولاً: كشف AdBlock
      await this.detectAdBlockStrict();
      
      // إذا تم اكتشاف AdBlock، توقف هنا
      if (this.isAdBlockDetected && this.config.antiAdblock?.strictMode) {
        this.showStrictAdBlockWarning();
        return; // توقف عن تحميل الإعلانات
      }
      
      // إذا لم يكن هناك AdBlock، تابع تحميل الإعلانات
      await this.loadAdsSequentially();
      
      console.log('🎯 تم تفعيل جميع الإعلانات بنجاح');
      
    } catch (error) {
      console.error('❌ خطأ في تحميل الإعلانات:', error);
      this.showFallbackAds();
    }
  }

  // === 2. كشف AdBlock الصارم ===
  async detectAdBlockStrict() {
    console.log('🔍 فحص AdBlock...');
    
    // اختبار 1: فحص عنصر الإعلان
    const testAd = document.createElement('div');
    testAd.className = 'ad adsbox ads ad-banner';
    testAd.style.cssText = 'height:1px;width:1px;position:absolute;left:-9999px;visibility:hidden;';
    testAd.innerHTML = '&nbsp;';
    document.body.appendChild(testAd);
    
    // اختبار 2: فحص سكريبت الإعلان
    const testScript = document.createElement('script');
    testScript.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
    testScript.async = true;
    testScript.onerror = () => {
      this.isAdBlockDetected = true;
    };
    document.body.appendChild(testScript);
    
    // الانتظار للنتائج
    await this.delay(1500);
    
    if (testAd.offsetHeight === 0 || 
        testAd.offsetWidth === 0 || 
        testAd.style.display === 'none' ||
        testAd.style.visibility === 'hidden') {
      this.isAdBlockDetected = true;
    }
    
    // تنظيف العناصر الاختبارية
    document.body.removeChild(testAd);
    document.body.removeChild(testScript);
    
    console.log(this.isAdBlockDetected ? '🚫 تم اكتشاف AdBlock!' : '✅ لا يوجد AdBlock');
  }

  // === 3. عرض تحذير صارم يحجب المحتوى ===
  showStrictAdBlockWarning() {
    console.log('⛔ عرض تحذير AdBlock الصارم...');
    
    // 1. إنشاء طبقة تغطية كاملة
    const overlay = document.createElement('div');
    overlay.id = 'adblock-strict-overlay';
    overlay.style.cssText = `
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
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: white;
      text-align: center;
      overflow: hidden;
      backdrop-filter: blur(20px);
    `;
    
    // 2. منع التفاعل مع الصفحة
    overlay.addEventListener('contextmenu', e => e.preventDefault());
    overlay.addEventListener('keydown', e => {
      if (e.key === 'F12' || e.key === 'F5' || 
          (e.ctrlKey && e.shiftKey && e.key === 'I') ||
          e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    });
    
    // 3. محتوى التحذير
    overlay.innerHTML = `
      <div style="
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        border-radius: 20px;
        padding: 40px;
        max-width: 800px;
        width: 90%;
        border: 2px solid rgba(255, 68, 68, 0.3);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        position: relative;
      ">
        <!-- أيقونة التحذير -->
        <div style="
          font-size: 80px;
          margin-bottom: 20px;
          animation: pulse 2s infinite;
          color: #ff4444;
        ">
          ⚠️
        </div>
        
        <!-- العنوان -->
        <h1 style="
          font-size: 2.5rem;
          margin-bottom: 20px;
          color: #ffd700;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        ">
          🚫 Ad Blocker Detected
        </h1>
        
        <!-- الرسالة الرئيسية -->
        <div style="
          background: rgba(0, 0, 0, 0.4);
          border-radius: 15px;
          padding: 25px;
          margin-bottom: 25px;
          text-align: left;
          line-height: 1.7;
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
            <p style="margin: 0; font-weight: bold;">
              ⛔ <strong>Access Restricted:</strong> You cannot access the game until you disable your ad blocker.
            </p>
          </div>
        </div>
        
        <!-- خطوات الحل -->
        <div style="
          background: rgba(52, 152, 219, 0.2);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 25px;
          text-align: left;
        ">
          <h3 style="color: #3498db; margin-bottom: 15px; font-size: 1.3rem;">
            📋 To Access This Game:
          </h3>
          <ol style="margin-left: 20px; font-size: 16px;">
            <li style="margin-bottom: 8px;">Disable your ad blocker for this website</li>
            <li style="margin-bottom: 8px;">Refresh this page</li>
            <li style="margin-bottom: 8px;">Or add our site to your whitelist</li>
          </ol>
        </div>
        
        <!-- أزرار الإجراء -->
        <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
          <button onclick="location.reload()" style="
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
            box-shadow: 0 6px 20px rgba(46, 204, 113, 0.4);
          " onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 10px 25px rgba(46, 204, 113, 0.6)'"
          onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 6px 20px rgba(46, 204, 113, 0.4)'">
            🔄 I've Disabled Ad Blocker - Refresh Page
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
            box-shadow: 0 6px 20px rgba(52, 152, 219, 0.4);
          " onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 10px 25px rgba(52, 152, 219, 0.6)'"
          onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 6px 20px rgba(52, 152, 219, 0.4)'">
            📖 Need Help? Show Instructions
          </button>
        </div>
        
        <!-- ملاحظة -->
        <div style="
          margin-top: 25px;
          padding: 15px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.8);
        ">
          <p style="margin: 0;">
            ⚠️ <strong>Important:</strong> This message will not disappear until ad blocker is disabled. 
            The game is completely blocked.
          </p>
        </div>
      </div>
    `;
    
    // 4. إضافة الطبقة للصفحة
    document.body.appendChild(overlay);
    
    // 5. حجب الصفحة الأصلية
    this.blockPageContent();
    
    // 6. إضافة أنيميشن
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.05); opacity: 0.8; }
        100% { transform: scale(1); opacity: 1; }
      }
      
      body.blocked {
        overflow: hidden !important;
        pointer-events: none !important;
      }
      
      #adblock-strict-overlay * {
        pointer-events: auto !important;
      }
    `;
    document.head.appendChild(style);
    
    // 7. جعل الدوال متاحة عالمياً
    window.showAdBlockHelp = () => this.showAdBlockHelp();
  }

  // === 4. حجب محتوى الصفحة ===
  blockPageContent() {
    // إضافة كلاس للـ body
    document.body.classList.add('blocked');
    
    // تعطيل جميع العناصر التفاعلية
    const elementsToDisable = [
      'iframe', 'a', 'button', 'input', 'select', 
      'textarea', '[onclick]', '.game-frame', '.game-container'
    ];
    
    elementsToDisable.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        el.style.pointerEvents = 'none';
        el.style.opacity = '0.3';
        el.style.filter = 'blur(3px)';
        el.style.userSelect = 'none';
      });
    });
    
    // تعطيل الـ iframe المحدد
    const gameIframe = document.getElementById('game-iframe');
    if (gameIframe) {
      gameIframe.style.pointerEvents = 'none';
      gameIframe.style.opacity = '0.2';
      gameIframe.style.filter = 'blur(5px) grayscale(1)';
      gameIframe.style.border = '3px solid #ff4444';
    }
    
    // إضافة طبقة فوق الـ iframe لمنع النقر
    const gameFrame = document.querySelector('.game-frame');
    if (gameFrame && !gameFrame.querySelector('.blocker-overlay')) {
      const blocker = document.createElement('div');
      blocker.className = 'blocker-overlay';
      blocker.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 68, 68, 0.7);
        z-index: 999999;
        display: flex;
        justify-content: center;
        align-items: center;
        color: white;
        font-size: 20px;
        font-weight: bold;
        text-align: center;
        padding: 20px;
        backdrop-filter: blur(10px);
      `;
      blocker.innerHTML = '🚫 GAME BLOCKED<br><small>Disable Ad Blocker to play</small>';
      gameFrame.appendChild(blocker);
    }
    
    // إلغاء فعالية أزرار التكبير
    const zoomBtn = document.getElementById('zoom-btn');
    if (zoomBtn) {
      zoomBtn.style.display = 'none';
    }
  }

  // === 5. عرض تعليمات إزالة AdBlock ===
  showAdBlockHelp() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #1a2a6c, #302b63);
      padding: 40px;
      border-radius: 20px;
      max-width: 900px;
      width: 90%;
      max-height: 85vh;
      overflow-y: auto;
      z-index: 2147483648;
      color: white;
      box-shadow: 0 30px 80px rgba(0,0,0,0.6);
      border: 2px solid #3498db;
    `;
    
    overlay.innerHTML = `
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
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
        ">✕</button>
        
        <h2 style="text-align: center; margin-bottom: 30px; color: #ffd700; font-size: 2rem;">
          📋 How to Disable Ad Blocker - Step by Step
        </h2>
        
        <!-- المتصفحات -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 25px; margin-bottom: 30px;">
          <div style="background: rgba(255,255,255,0.1); padding: 25px; border-radius: 15px;">
            <h3 style="color: #2ecc71; margin-bottom: 15px; font-size: 1.4rem;">
              <span style="font-size: 24px;">🔹</span> AdBlock / AdBlock Plus
            </h3>
            <ol style="margin-left: 20px; line-height: 1.8;">
              <li>Click the AdBlock icon in your browser toolbar</li>
              <li>Click "Don't run on pages on this domain"</li>
              <li>Refresh the page (F5 or click refresh button)</li>
            </ol>
          </div>
          
          <div style="background: rgba(255,255,255,0.1); padding: 25px; border-radius: 15px;">
            <h3 style="color: #3498db; margin-bottom: 15px; font-size: 1.4rem;">
              <span style="font-size: 24px;">🔹</span> uBlock Origin
            </h3>
            <ol style="margin-left: 20px; line-height: 1.8;">
              <li>Click the uBlock Origin icon (red shield)</li>
              <li>Click the big blue power button to turn it off</li>
              <li>Refresh the page</li>
            </ol>
          </div>
        </div>
        
        <!-- المتصفحات الأخرى -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 25px; margin-bottom: 30px;">
          <div style="background: rgba(255,255,255,0.1); padding: 25px; border-radius: 15px;">
            <h3 style="color: #9b59b6; margin-bottom: 15px; font-size: 1.4rem;">
              <span style="font-size: 24px;">🔹</span> AdGuard
            </h3>
            <ol style="margin-left: 20px; line-height: 1.8;">
              <li>Click the AdGuard icon</li>
              <li>Find this website in the list</li>
              <li>Click "Disable on this site"</li>
              <li>Refresh the page</li>
            </ol>
          </div>
          
          <div style="background: rgba(255,255,255,0.1); padding: 25px; border-radius: 15px;">
            <h3 style="color: #e74c3c; margin-bottom: 15px; font-size: 1.4rem;">
              <span style="font-size: 24px;">🔹</span> Brave Browser
            </h3>
            <ol style="margin-left: 20px; line-height: 1.8;">
              <li>Click the Brave icon in address bar</li>
              <li>Set "Shields" to "Down" for this site</li>
              <li>Refresh the page</li>
            </ol>
          </div>
        </div>
        
        <!-- أسباب الإعلانات -->
        <div style="background: rgba(52, 152, 219, 0.3); padding: 25px; border-radius: 15px; margin-bottom: 30px;">
          <h3 style="color: #3498db; margin-bottom: 15px; font-size: 1.4rem;">
            ℹ️ Why We Need Ads?
          </h3>
          <ul style="margin-left: 20px; line-height: 1.8;">
            <li><strong>100% Free Games</strong> - No registration or payment required</li>
            <li><strong>No Subscription Fees</strong> - We never ask for money</li>
            <li><strong>No In-Game Purchases</strong> - All games are completely free</li>
            <li><strong>Ads Keep Us Running</strong> - Server costs, maintenance, updates</li>
            <li><strong>Support Developers</strong> - Game creators earn from ads</li>
          </ul>
        </div>
        
        <!-- زر التحديث -->
        <div style="text-align: center; margin-top: 20px;">
          <button onclick="location.reload()" style="
            background: linear-gradient(135deg, #2ecc71, #27ae60);
            color: white;
            border: none;
            padding: 18px 40px;
            border-radius: 10px;
            cursor: pointer;
            font-size: 18px;
            font-weight: bold;
            transition: all 0.3s;
            min-width: 300px;
            margin-top: 10px;
          " onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 10px 25px rgba(46, 204, 113, 0.6)'"
          onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
            🔄 Refresh After Disabling Ad Blocker
          </button>
          
          <p style="margin-top: 15px; color: rgba(255,255,255,0.7); font-size: 14px;">
            After disabling ad blocker, refresh the page to access the game.
          </p>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
  }

  // === 6. تحميل البانرات ===
  async loadBanners() {
    if (!this.isAdBlockDetected) {
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
  }

  loadBannerAd(containerId, bannerConfig) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    const ads = bannerConfig.ads;
    if (!ads || ads.length === 0) return;
    
    // تحميل أول إعلان
    this.loadSingleAd(container, ads[0], containerId);
    
    // التدوير
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
      document.getElementById(`banner-${ad.id}`).appendChild(script);
    }, 300);
  }

  // === 7. تحميل Native Banner ===
  loadNativeBanner() {
    if (this.isAdBlockDetected) return;
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

  // === 8. تحميل إعلانات Sidebar ===
  loadSidebarAds() {
    if (this.isAdBlockDetected) return;
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

  // === 9. تحميل Popunder ===
  loadPopunder() {
    if (this.isAdBlockDetected) return;
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

  // === 10. تحميل Smartlink ===
  loadSmartlink() {
    if (this.isAdBlockDetected) return;
    if (!this.config.smartlink?.enabled) return;
    
    const frequency = this.config.smartlink.frequency;
    if (frequency === 'once_per_session' && this.sessionData.smartlinkOpened) {
      return;
    }
    
    const openSmartlink = () => {
      setTimeout(() => {
        if (this.config.smartlink.openInNewTab) {
          window.open(this.config.smartlink.url, '_blank', 'noopener,noreferrer');
        } else {
          window.location.href = this.config.smartlink.url;
        }
        
        this.sessionData.smartlinkOpened = true;
        this.saveSessionData();
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

  // === 11. تحميل الإعلانات بالتسلسل ===
  async loadAdsSequentially() {
    // إذا تم اكتشاف AdBlock، لا تحمل أي إعلانات
    if (this.isAdBlockDetected) return;
    
    // إعلانات سريعة
    this.loadNativeBanner();
    this.loadSidebarAds();
    
    // بانرات اللعبة
    await this.delay(1000);
    this.loadBanners();
    
    // إعلانات تفاعلية
    await this.delay(2000);
    this.loadPopunder();
    this.loadSmartlink();
  }

  // === 12. فحص وإصلاح الحاويات ===
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

  // === 13. إدارة الجلسة ===
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

  // === 14. تصفية أخطاء Unity ===
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

  // === 15. دالة مساعدة للتأخير ===
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // === 16. تنظيف الموارد ===
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
