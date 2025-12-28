/**
 * 🎯 نظام إدارة الإعلانات - إعادة كتابة كاملة
 * الحل الصحيح لمشكلة البانرات السوداء
 */

class AdsManager {
  constructor() {
    this.config = null;
    this.rotationTimers = {};
    this.sessionData = this.getSessionData();
    this.loadedScripts = new Set();
    this.adCounter = 0;
  }

  async init() {
    try {
      this.filterUnityErrors();
      
      const response = await fetch('ads.json');
      if (!response.ok) throw new Error('Failed to load ads.json');
      
      this.config = await response.json();
      console.log('✅ تم تحميل الإعدادات');
      
      // فحص AdBlock
      const antiAdblockEnabled = this.config.antiAdblock?.enabled ?? true;
      if (antiAdblockEnabled) {
        const adBlockDetected = await this.detectAdBlock();
        if (adBlockDetected) {
          this.blockPageAccess();
          return;
        }
      }
      
      // تحميل الإعلانات
      await this.loadAllAds();
      
    } catch (error) {
      console.error('❌ خطأ:', error);
    }
  }

  // === فحص AdBlock ===
  async detectAdBlock() {
    return new Promise(resolve => {
      const testAd = document.createElement('div');
      testAd.innerHTML = '&nbsp;';
      testAd.className = 'adsbox ad adunit';
      testAd.style.cssText = 'position:absolute;top:-999px;left:-999px;width:1px;height:1px;';
      document.body.appendChild(testAd);
      
      setTimeout(() => {
        const isBlocked = testAd.offsetHeight === 0;
        testAd.remove();
        resolve(isBlocked);
      }, 100);
    });
  }

  blockPageAccess() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed;inset:0;background:linear-gradient(135deg,#0f0c29,#302b63,#24243e);
      z-index:2147483647;display:flex;align-items:center;justify-content:center;
      color:white;font-family:system-ui;
    `;
    overlay.innerHTML = `
      <div style="text-align:center;padding:40px;max-width:600px;background:rgba(255,255,255,0.1);border-radius:20px;">
        <div style="font-size:80px;margin-bottom:20px;">🚫</div>
        <h1 style="color:#ffd700;margin-bottom:20px;">Ad Blocker Detected</h1>
        <p style="margin-bottom:30px;">Please disable your ad blocker to continue.</p>
        <button onclick="location.reload()" style="
          background:#2ecc71;color:white;border:none;padding:15px 30px;
          border-radius:8px;cursor:pointer;font-size:16px;font-weight:bold;
        ">Refresh Page</button>
      </div>
    `;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
  }

  // === تحميل جميع الإعلانات ===
  async loadAllAds() {
    console.log('📦 بدء تحميل الإعلانات...');
    
    // 1. Native Banner (فوري)
    this.loadNativeBanner();
    
    await this.delay(500);
    
    // 2. البانرات الرئيسية
    if (this.config.banners?.aboveIframe?.enabled) {
      this.loadSimpleBanner('ad-above-iframe', this.config.banners.aboveIframe.ads[0]);
    }
    
    await this.delay(800);
    
    if (this.config.banners?.belowIframe?.enabled) {
      this.loadSimpleBanner('ad-below-iframe', this.config.banners.belowIframe.ads[0]);
    }
    
    await this.delay(1000);
    
    // 3. Sidebar
    if (this.config.sidebarAd?.enabled) {
      this.loadSimpleBanner('ad-sidebar', this.config.sidebarAd.ads[0]);
    }
    
    await this.delay(1200);
    
    // 4. Page Bottom
    if (this.config.banners?.pageBottom?.enabled) {
      this.loadSimpleBanner('ad-page-bottom', this.config.banners.pageBottom.ads[0]);
    }
    
    await this.delay(1500);
    
    // 5. Social Bar
    this.loadSocialBar();
    
    await this.delay(2000);
    
    // 6. Popunder
    this.loadPopunder();
    
    await this.delay(2500);
    
    // 7. Smartlink
    this.loadSmartlink();
  }

  // === الطريقة الصحيحة لتحميل البانر ===
  loadSimpleBanner(containerId, adConfig) {
    if (!adConfig) return;
    
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`⚠️ Container ${containerId} not found`);
      return;
    }
    
    console.log(`📢 تحميل إعلان في ${containerId}`);
    
    // إنشاء معرف فريد
    this.adCounter++;
    const zoneId = `invoke_${this.adCounter}_${Date.now()}`;
    
    // تنظيف الحاوية
    container.innerHTML = '';
    container.style.cssText = `
      min-height: ${adConfig.config?.height || 90}px;
      margin: 20px auto;
      text-align: center;
      position: relative;
      background: rgba(0,0,0,0.3);
      border-radius: 8px;
      padding: 10px;
    `;
    
    // إضافة Label
    const label = document.createElement('div');
    label.textContent = 'Advertisement';
    label.style.cssText = `
      position: absolute;
      top: 5px;
      right: 5px;
      font-size: 9px;
      color: rgba(255,255,255,0.4);
      background: rgba(255,255,255,0.05);
      padding: 2px 6px;
      border-radius: 3px;
      z-index: 10;
    `;
    container.appendChild(label);
    
    // إنشاء Div للإعلان
    const adZone = document.createElement('div');
    adZone.id = zoneId;
    adZone.style.cssText = `
      min-height: ${adConfig.config?.height || 90}px;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    container.appendChild(adZone);
    
    // تعيين atOptions قبل السكريبت
    const atOptionsName = `atOptions_${zoneId.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
    window[atOptionsName] = {
      key: adConfig.config?.key || '',
      format: adConfig.config?.format || 'iframe',
      height: adConfig.config?.height || 90,
      width: adConfig.config?.width || 728,
      params: {}
    };
    
    console.log(`✅ تم إنشاء ${atOptionsName}`, window[atOptionsName]);
    
    // تحميل السكريبت
    setTimeout(() => {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = adConfig.script;
      script.async = true;
      script.setAttribute('data-cfasync', 'false');
      
      script.onload = () => {
        console.log(`✅ نجح تحميل ${containerId}`);
      };
      
      script.onerror = () => {
        console.error(`❌ فشل تحميل ${containerId}`);
        adZone.innerHTML = `
          <div style="color:rgba(255,255,255,0.3);padding:20px;font-size:12px;">
            <div style="margin-bottom:10px;">⚠️</div>
            <div>Advertisement loading...</div>
            <div style="margin-top:5px;font-size:10px;">
              If ad doesn't appear, please refresh the page
            </div>
          </div>
        `;
      };
      
      // إضافة السكريبت للـ document head بدلاً من الـ div
      document.head.appendChild(script);
      
    }, 200);
  }

  // === Native Banner ===
  loadNativeBanner() {
    if (!this.config.nativeBanner?.enabled) return;
    
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    
    // التحقق من عدم التكرار
    if (sidebar.querySelector('.native-ad-banner')) {
      console.log('⚠️ Native banner already exists');
      return;
    }
    
    const container = document.createElement('div');
    container.className = 'native-ad-banner';
    container.style.cssText = `
      margin: 15px 0;
      padding: 10px;
      background: rgba(0,0,0,0.3);
      border-radius: 8px;
      position: relative;
    `;
    
    // إضافة HTML
    container.innerHTML = this.config.nativeBanner.html || '<div id="native-banner-container"></div>';
    
    // إدراج في أول Sidebar
    sidebar.insertBefore(container, sidebar.firstChild);
    
    // تحميل السكريبت
    if (this.config.nativeBanner.script) {
      setTimeout(() => {
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = this.config.nativeBanner.script;
        script.async = true;
        script.setAttribute('data-cfasync', 'false');
        
        script.onload = () => console.log('✅ Native Banner loaded');
        script.onerror = () => console.warn('⚠️ Native Banner failed');
        
        document.head.appendChild(script);
      }, 500);
    }
  }

  // === Social Bar ===
  loadSocialBar() {
    if (!this.config.socialBar?.enabled) return;
    
    const scriptUrl = this.config.socialBar.script;
    if (!scriptUrl || this.loadedScripts.has(scriptUrl)) return;
    
    setTimeout(() => {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = scriptUrl;
      script.async = true;
      script.setAttribute('data-cfasync', 'false');
      
      script.onload = () => {
        console.log('✅ Social Bar loaded');
        this.loadedScripts.add(scriptUrl);
      };
      
      script.onerror = () => {
        console.warn('⚠️ Social Bar failed');
      };
      
      document.body.appendChild(script);
      
    }, this.config.socialBar.delay || 5000);
  }

  // === Popunder ===
  loadPopunder() {
    if (!this.config.popunder?.enabled) return;
    
    const maxPerSession = this.config.popunder.maxPerSession || 1;
    const currentCount = this.sessionData.popunderCount || 0;
    
    if (currentCount >= maxPerSession) {
      console.log('⚠️ Popunder limit reached');
      return;
    }
    
    setTimeout(() => {
      this.config.popunder.scripts.forEach((scriptUrl, index) => {
        if (this.loadedScripts.has(scriptUrl)) return;
        
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = scriptUrl;
        script.async = true;
        script.setAttribute('data-cfasync', 'false');
        
        script.onload = () => {
          console.log(`✅ Popunder ${index + 1} loaded`);
          this.loadedScripts.add(scriptUrl);
        };
        
        document.body.appendChild(script);
      });
      
      this.sessionData.popunderCount = currentCount + 1;
      this.saveSessionData();
      
    }, this.config.popunder.delay || 8000);
  }

  // === Smartlink ===
  loadSmartlink() {
    if (!this.config.smartlink?.enabled) return;
    
    if (this.config.smartlink.frequency === 'once_per_session' && this.sessionData.smartlinkOpened) {
      console.log('⚠️ Smartlink already opened');
      return;
    }
    
    setTimeout(() => {
      if (this.config.smartlink.openInNewTab) {
        const newWindow = window.open(
          this.config.smartlink.url,
          '_blank',
          'noopener,noreferrer'
        );
        
        if (newWindow) {
          this.sessionData.smartlinkOpened = true;
          this.saveSessionData();
          console.log('✅ Smartlink opened');
        }
      }
    }, this.config.smartlink.delay || 3000);
  }

  // === Helper Functions ===
  getSessionData() {
    try {
      const data = sessionStorage.getItem('adsSessionData');
      return data ? JSON.parse(data) : {
        popunderCount: 0,
        smartlinkOpened: false,
        sessionId: Date.now()
      };
    } catch {
      return { popunderCount: 0, smartlinkOpened: false, sessionId: Date.now() };
    }
  }

  saveSessionData() {
    try {
      sessionStorage.setItem('adsSessionData', JSON.stringify(this.sessionData));
    } catch (error) {
      console.error('خطأ في حفظ البيانات:', error);
    }
  }

  filterUnityErrors() {
    const originalError = console.error;
    console.error = function(...args) {
      const msg = args[0]?.toString() || '';
      if (!msg.includes('referenced script') && !msg.includes('is missing')) {
        originalError.apply(console, args);
      }
    };
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  destroy() {
    Object.values(this.rotationTimers).forEach(timer => clearInterval(timer));
    this.rotationTimers = {};
    this.loadedScripts.clear();
  }
}

// === تهيئة تلقائية ===
(function() {
  function initAdsManager() {
    console.log('🚀 بدء نظام الإعلانات...');
    const manager = new AdsManager();
    manager.init();
    window.adsManager = manager;
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdsManager);
  } else {
    initAdsManager();
  }
})();
