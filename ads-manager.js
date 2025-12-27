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
      
      // تأخير ذكي قبل بدء الإعلانات
      if (this.config.config?.smartDelay?.enabled) {
        await this.delay(this.config.config.smartDelay.delayBeforeFirstAd);
      }
      
      // تشغيل جميع الإعلانات بالتسلسل
      await this.loadAdsSequentially();
      
      console.log('🎯 تم تفعيل جميع الإعلانات بنجاح');
      
    } catch (error) {
      console.error('❌ خطأ في تحميل الإعلانات:', error);
      this.showFallbackAds(); // عرض إعلانات فولباك
    }
  }

  // === 2. كشف AdBlock ===
  detectAdBlock() {
    if (!this.config.config?.antiAdblock?.enabled) return;
    
    const testAd = document.createElement('div');
    testAd.innerHTML = '&nbsp;';
    testAd.className = 'adsbox';
    testAd.style.cssText = 'height:1px;width:1px;position:absolute;left:-9999px;';
    document.body.appendChild(testAd);
    
    setTimeout(() => {
      if (testAd.offsetHeight === 0 || testAd.offsetWidth === 0) {
        this.isAdBlockDetected = true;
        if (this.config.config.antiAdblock.message) {
          this.showAdBlockMessage();
        }
      }
      document.body.removeChild(testAd);
    }, 100);
  }

  showAdBlockMessage() {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:999999;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
      <div style="background:white;padding:40px;border-radius:15px;text-align:center;max-width:500px;">
        <h2 style="color:#e74c3c;margin-bottom:20px;">⚠️ AdBlock Detected</h2>
        <p style="color:#333;margin-bottom:20px;">${this.config.config.antiAdblock.message}</p>
        <button onclick="location.reload()" style="background:#3498db;color:white;border:none;padding:12px 30px;border-radius:5px;cursor:pointer;font-size:16px;">Refresh Page</button>
      </div>
    `;
    document.body.appendChild(overlay);
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
        script.onload = () => console.log('✅ Popunder script loaded');
        script.onerror = () => console.warn('⚠️ Popunder script failed');
        document.body.appendChild(script);
      });
      
      this.sessionData.popunderShown = true;
      this.saveSessionData();
      console.log('✅ Popunder loaded');
    }, this.config.popunder.delay || 5000);
  }

  // === 4. تحميل البانرات مع التدوير ===
  async loadBanners() {
    const promises = [];
    
    // فوق iframe - أولاً
    if (this.config.banners?.aboveIframe?.enabled) {
      promises.push(this.loadBannerWithDelay('ad-above-iframe', this.config.banners.aboveIframe, 500));
    }
    
    // تحت iframe - بعد ذلك
    if (this.config.banners?.belowIframe?.enabled) {
      promises.push(this.loadBannerWithDelay('ad-below-iframe', this.config.banners.belowIframe, 1000));
    }
    
    // أسفل الصفحة - أخيراً مع فولباك
    if (this.config.banners?.pageBottom?.enabled) {
      promises.push(this.loadBannerWithDelay('ad-page-bottom', this.config.banners.pageBottom, 1500));
    }
    
    await Promise.allSettled(promises);
  }

  loadBannerWithDelay(containerId, bannerConfig, delay) {
    return new Promise(resolve => {
      setTimeout(() => {
        this.loadBannerAd(containerId, bannerConfig);
        resolve();
      }, delay);
    });
  }

  loadBannerAd(containerId, bannerConfig) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`❌ Container ${containerId} not found`);
      return;
    }
    
    // تنظيف الحاوية أولاً
    container.innerHTML = '';
    
    // عرض مؤشر تحميل
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'ad-loading';
    loadingDiv.style.cssText = 'text-align:center;padding:15px;background:rgba(0,0,0,0.5);border-radius:8px;margin:10px 0;';
    loadingDiv.innerHTML = '<div style="color:#aaa;font-size:12px;">Loading advertisement...</div>';
    container.appendChild(loadingDiv);
    
    const ads = bannerConfig.ads;
    if (!ads || ads.length === 0) {
      this.showFallbackBanner(container, bannerConfig);
      return;
    }
    
    let currentIndex = 0;
    
    const loadAd = (index) => {
      const ad = ads[index];
      if (!ad || !ad.script) {
        this.showFallbackBanner(container, bannerConfig);
        return;
      }
      
      // إزالة مؤشر التحميل
      if (loadingDiv.parentNode === container) {
        container.removeChild(loadingDiv);
      }
      
      const adContainer = document.createElement('div');
      adContainer.className = 'ad-banner';
      adContainer.id = `ad-container-${ad.id}-${containerId}`;
      adContainer.style.cssText = 'position:relative;';
      adContainer.innerHTML = `
        <div class="ad-label">Advertisement</div>
        <div id="banner-${ad.id}-${containerId}" style="text-align:center;min-height:${ad.config?.height || 90}px;width:100%;"></div>
        <button class="ad-close-btn" onclick="this.closest('.ad-banner').style.display='none'" style="position:absolute;top:5px;left:5px;background:rgba(255,68,68,0.8);color:white;border:none;width:20px;height:20px;border-radius:50%;cursor:pointer;font-size:10px;">✕</button>
      `;
      
      container.innerHTML = '';
      container.appendChild(adContainer);
      
      // تحميل سكريبت الإعلان مع إعادة المحاولة
      this.loadAdScript(ad, `banner-${ad.id}-${containerId}`, container, bannerConfig);
    };
    
    // تحميل أول إعلان
    loadAd(currentIndex);
    
    // التدوير إذا كان مفعل
    if (bannerConfig.rotation && ads.length > 1) {
      const interval = bannerConfig.rotationInterval || 30000;
      this.rotationTimers[containerId] = setInterval(() => {
        currentIndex = (currentIndex + 1) % ads.length;
        loadAd(currentIndex);
        console.log(`🔄 تدوير إعلان ${containerId}`);
      }, interval);
    }
  }

  loadAdScript(ad, elementId, container, bannerConfig) {
    const loadScript = (attempt = 1, maxAttempts = 3) => {
      setTimeout(() => {
        const targetElement = document.getElementById(elementId);
        if (!targetElement) {
          if (attempt < maxAttempts) {
            loadScript(attempt + 1, maxAttempts);
          } else {
            this.showFallbackBanner(container, bannerConfig);
          }
          return;
        }
        
        // تنظيف الإعدادات السابقة
        delete window.atOptions;
        
        // تعيين إعدادات الإعلان الجديدة
        if (ad.config) {
          window.atOptions = ad.config;
        }
        
        const script = document.createElement('script');
        script.src = ad.script;
        script.async = true;
        script.setAttribute('data-cfasync', 'false');
        
        script.onload = () => {
          console.log(`✅ Ad ${ad.id} loaded successfully`);
          // تحقق من أن الإعلان ظهر فعلياً
          setTimeout(() => {
            const adElement = document.getElementById(elementId);
            if (adElement && adElement.offsetHeight < 10) {
              console.warn(`⚠️ Ad ${ad.id} may have failed to display`);
              if (attempt < maxAttempts) {
                loadScript(attempt + 1, maxAttempts);
              }
            }
          }, 2000);
        };
        
        script.onerror = () => {
          console.warn(`⚠️ Failed to load ad script ${ad.id}, attempt ${attempt}`);
          if (attempt < maxAttempts) {
            loadScript(attempt + 1, maxAttempts);
          } else {
            this.showFallbackBanner(container, bannerConfig);
          }
        };
        
        targetElement.appendChild(script);
        
      }, 500 * attempt);
    };
    
    loadScript();
  }

  showFallbackBanner(container, bannerConfig) {
    if (bannerConfig.fallbackHtml) {
      container.innerHTML = bannerConfig.fallbackHtml;
    } else {
      // فولباك افتراضي
      const defaultFallback = `
        <div class="ad-banner" style="background:linear-gradient(135deg,#1a2a6c,#b21f1f);padding:20px;border-radius:10px;text-align:center;margin:15px 0;">
          <div class="ad-label">Advertisement</div>
          <h4 style="color:white;margin:10px 0;">Support Our Site</h4>
          <p style="color:rgba(255,255,255,0.8);font-size:14px;">Please consider disabling AdBlock to support free content</p>
          <a href="https://example.com" target="_blank" style="display:inline-block;background:#ffd700;color:#333;padding:8px 20px;border-radius:5px;text-decoration:none;margin-top:10px;font-weight:bold;">
            Visit Sponsor
          </a>
        </div>
      `;
      container.innerHTML = defaultFallback;
    }
  }

  // === 5. تحميل Native Banner ===
  loadNativeBanner() {
    if (!this.config.nativeBanner?.enabled) return;
    
    const sidebar = document.querySelector('.sidebar') || document.getElementById('ad-sidebar');
    if (!sidebar) {
      console.warn('❌ Sidebar not found for native banner');
      return;
    }
    
    // التحقق من عدم وجود بانر أصلي بالفعل
    if (document.querySelector('.native-ad-banner')) {
      return;
    }
    
    const container = document.createElement('div');
    container.className = 'ad-banner native-ad-banner';
    container.style.cssText = 'margin:20px 0;background:rgba(0,0,0,0.7);border-radius:8px;padding:15px;position:relative;';
    container.innerHTML = `
      <div class="ad-label">Sponsored</div>
      ${this.config.nativeBanner.html || '<div id="native-banner-container"></div>'}
      <button class="ad-close-btn" onclick="this.closest('.ad-banner').style.display='none'">✕</button>
    `;
    
    sidebar.insertBefore(container, sidebar.firstChild);
    
    // تحميل السكريبت إذا كان موجوداً
    if (this.config.nativeBanner.script) {
      setTimeout(() => {
        const script = document.createElement('script');
        script.src = this.config.nativeBanner.script;
        script.async = true;
        script.setAttribute('data-cfasync', 'false');
        script.onload = () => console.log('✅ Native Banner script loaded');
        script.onerror = () => console.warn('⚠️ Native Banner script failed');
        container.appendChild(script);
      }, 1000);
    }
    
    console.log('✅ Native Banner loaded');
  }

  // === 6. تحميل إعلانات Sidebar ===
  loadSidebarAds() {
    if (!this.config.sidebarAd?.enabled) return;
    
    const container = document.getElementById('ad-sidebar');
    if (!container) {
      console.warn('❌ Sidebar ad container not found');
      return;
    }
    
    const ads = this.config.sidebarAd.ads;
    if (!ads || ads.length === 0) {
      this.showFallbackSidebar(container);
      return;
    }
    
    let currentIndex = 0;
    
    const loadAd = (index) => {
      const ad = ads[index];
      const adDiv = document.createElement('div');
      adDiv.className = 'ad-banner ad-sidebar';
      adDiv.style.cssText = 'background:rgba(0,0,0,0.7);border-radius:8px;padding:15px;margin:20px 0;position:sticky;top:100px;';
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
        script.onload = () => console.log(`✅ Sidebar ad ${ad.id} loaded`);
        script.onerror = () => {
          console.warn(`⚠️ Sidebar ad ${ad.id} failed`);
          if (ads.length > 1) {
            setTimeout(() => loadAd((index + 1) % ads.length), 2000);
          }
        };
        document.getElementById(`sidebar-${ad.id}`).appendChild(script);
      }, 300);
    };
    
    loadAd(currentIndex);
    
    // التدوير
    if (this.config.sidebarAd.rotation && ads.length > 1) {
      const interval = this.config.sidebarAd.rotationInterval || 35000;
      this.rotationTimers['sidebar'] = setInterval(() => {
        currentIndex = (currentIndex + 1) % ads.length;
        loadAd(currentIndex);
      }, interval);
    }
  }

  showFallbackSidebar(container) {
    container.innerHTML = `
      <div class="ad-banner" style="background:rgba(0,0,0,0.7);border-radius:8px;padding:20px;margin:20px 0;text-align:center;">
        <div class="ad-label">Sponsored</div>
        <h4 style="color:#ffd700;margin:15px 0;">Premium Game Hosting</h4>
        <p style="color:rgba(255,255,255,0.8);font-size:14px;margin-bottom:15px;">
          Fast, reliable hosting for HTML5 games
        </p>
        <a href="https://example.com" target="_blank" style="display:inline-block;background:#6c5ce7;color:white;padding:8px 16px;border-radius:5px;text-decoration:none;font-weight:bold;">
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
      console.log('ℹ️ Smartlink already opened this session');
      return;
    }
    
    console.log('🔍 Setting up smartlink detection...');
    
    // طريقة محسنة للكشف عن تحميل اللعبة
    const openSmartlink = () => {
      console.log('🎮 Game loaded, opening smartlink...');
      
      setTimeout(() => {
        if (this.isAdBlockDetected) {
          console.warn('⚠️ AdBlock detected, skipping smartlink');
          return;
        }
        
        if (this.config.smartlink.openInNewTab) {
          try {
            const newTab = window.open(this.config.smartlink.url, '_blank', 'noopener,noreferrer');
            if (newTab) {
              console.log('✅ Smartlink opened in new tab');
              this.sessionData.smartlinkOpened = true;
              this.saveSessionData();
            } else {
              console.warn('⚠️ Popup blocked, trying alternative method');
              // طريقة بديلة
              const link = document.createElement('a');
              link.href = this.config.smartlink.url;
              link.target = '_blank';
              link.rel = 'noopener noreferrer';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              this.sessionData.smartlinkOpened = true;
              this.saveSessionData();
            }
          } catch (error) {
            console.error('❌ Error opening smartlink:', error);
          }
        } else {
          window.location.href = this.config.smartlink.url;
        }
      }, this.config.smartlink.delay || 2000);
    };
    
    // محاولات متعددة للكشف عن الـ iframe
    const tryToDetectIframe = (attempt = 1, maxAttempts = 10) => {
      console.log(`🔍 Checking for game iframe (attempt ${attempt}/${maxAttempts})...`);
      
      const iframe = document.getElementById('game-iframe');
      
      if (iframe) {
        console.log('✅ Game iframe found');
        
        // إذا كان الـ iframe محمل بالفعل
        if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
          console.log('🎮 Iframe already loaded');
          openSmartlink();
        } else {
          // انتظار تحميل الـ iframe
          console.log('⏳ Waiting for iframe to load...');
          iframe.addEventListener('load', openSmartlink, { once: true });
          
          // فولباك: افتح بعد 10 ثواني بغض النظر
          setTimeout(openSmartlink, 10000);
        }
      } else if (attempt < maxAttempts) {
        // إعادة المحاولة إذا لم يوجد الـ iframe بعد
        setTimeout(() => tryToDetectIframe(attempt + 1, maxAttempts), 1000);
      } else {
        console.warn('⚠️ Game iframe not found after maximum attempts');
        // فتح مباشرة كفولباك
        openSmartlink();
      }
    };
    
    // بدء الكشف بعد تأخير
    setTimeout(() => tryToDetectIframe(), 3000);
  }

  // === 8. تحميل Social Bar ===
  loadSocialBar() {
    if (!this.config.socialBar?.enabled) return;
    
    if (document.getElementById('social-bar-ad')) return;
    
    const bar = document.createElement('div');
    bar.id = 'social-bar-ad';
    bar.style.cssText = 'position:fixed;bottom:0;left:0;width:100%;z-index:999;background:rgba(0,0,0,0.9);padding:10px;text-align:center;';
    
    if (this.config.socialBar.sticky) {
      bar.style.position = 'sticky';
      bar.style.top = 'auto';
      bar.style.bottom = '0';
    }
    
    bar.innerHTML = this.config.socialBar.html || `
      <div style="color:white;font-size:14px;">
        Follow us on 
        <a href="https://twitter.com" target="_blank" style="color:#1DA1F2;margin:0 10px;">Twitter</a> | 
        <a href="https://facebook.com" target="_blank" style="color:#4267B2;margin:0 10px;">Facebook</a> | 
        <a href="https://instagram.com" target="_blank" style="color:#E1306C;margin:0 10px;">Instagram</a>
      </div>
    `;
    
    document.body.appendChild(bar);
    console.log('✅ Social Bar loaded');
  }

  // === 9. تحميل Interstitial ===
  loadInterstitial() {
    if (!this.config.interstitialAd?.enabled) return;
    
    const frequency = this.config.interstitialAd.frequency;
    const pageViews = this.sessionData.pageViews || 0;
    
    if (frequency === 'every_3_pages' && pageViews % 3 !== 0) {
      return;
    }
    
    if (frequency === 'once_per_session' && this.sessionData.interstitialShown) {
      return;
    }
    
    console.log('⏳ Preparing interstitial ad...');
    
    setTimeout(() => {
      if (this.isAdBlockDetected) {
        console.warn('⚠️ AdBlock detected, skipping interstitial');
        return;
      }
      
      const overlay = document.createElement('div');
      overlay.id = 'interstitial-overlay';
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);z-index:999999;display:flex;align-items:center;justify-content:center;animation:fadeIn 0.3s;';
      
      overlay.innerHTML = `
        <div style="background:white;padding:30px;border-radius:15px;max-width:700px;max-height:90vh;overflow-y:auto;position:relative;">
          ${this.config.interstitialAd.html || `
            <div style="text-align:center;">
              <h2 style="color:#333;margin-bottom:20px;">Advertisement</h2>
              <p style="color:#666;margin-bottom:20px;">Please watch this short ad to support our free service</p>
              <div id="interstitial-content" style="min-height:300px;background:#f5f5f5;display:flex;align-items:center;justify-content:center;">
                <p>Ad content will load here...</p>
              </div>
              <div style="margin-top:20px;color:#999;font-size:14px;">
                Closing in <span id="countdown">7</span> seconds
              </div>
            </div>
          `}
          ${this.config.interstitialAd.closeable ? `
            <button onclick="document.getElementById('interstitial-overlay').remove()" 
                    style="position:absolute;top:10px;right:10px;background:#ff4444;color:white;border:none;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:16px;">
              ✕
            </button>
          ` : ''}
        </div>
      `;
      
      document.body.appendChild(overlay);
      
      // تحميل محتوى إعلاني إذا كان هناك سكريبت
      if (this.config.interstitialAd.script) {
        const script = document.createElement('script');
        script.src = this.config.interstitialAd.script;
        script.async = true;
        document.getElementById('interstitial-content').appendChild(script);
      }
      
      // العد التنازلي
      let countdown = Math.floor((this.config.interstitialAd.closeDelay || 7000) / 1000);
      const countdownEl = document.getElementById('countdown');
      
      const timer = setInterval(() => {
        countdown--;
        if (countdownEl) countdownEl.textContent = countdown;
        
        if (countdown <= 0) {
          clearInterval(timer);
          if (this.config.interstitialAd.closeable) {
            overlay.remove();
          }
        }
      }, 1000);
      
      // زر الإغلاق
      overlay.addEventListener('click', (e) => {
        if (e.target.closest('button') || (countdown <= 0 && this.config.interstitialAd.closeable)) {
          overlay.remove();
        }
      });
      
      this.sessionData.interstitialShown = true;
      this.saveSessionData();
      
      console.log('✅ Interstitial shown');
    }, this.config.interstitialAd.delay || 10000);
  }

  // === 10. إدارة الجلسة ===
  getSessionData() {
    const data = sessionStorage.getItem('adsSessionData');
    const defaultData = {
      popunderShown: false,
      smartlinkOpened: false,
      interstitialShown: false,
      pageViews: 0
    };
    
    if (!data) {
      return defaultData;
    }
    
    try {
      return { ...defaultData, ...JSON.parse(data) };
    } catch {
      return defaultData;
    }
  }

  saveSessionData() {
    sessionStorage.setItem('adsSessionData', JSON.stringify(this.sessionData));
  }

  // === 11. تحميل الإعلانات بالتسلسل ===
  async loadAdsSequentially() {
    // 1. كشف AdBlock
    this.detectAdBlock();
    
    // 2. إعلانات سريعة الظهور
    this.loadSocialBar();
    this.loadNativeBanner();
    this.loadSidebarAds();
    
    // 3. إعلانات اللعبة (بعد تأخير بسيط)
    await this.delay(1000);
    this.loadBanners();
    
    // 4. إعلانات تفاعلية (بعد تأخير أطول)
    await this.delay(2000);
    this.loadPopunder();
    this.loadSmartlink();
    this.loadInterstitial();
  }

  // === 12. فحص وإصلاح الحاويات ===
  fixAdContainers() {
    const containers = [
      'ad-above-iframe',
      'ad-below-iframe', 
      'ad-page-bottom',
      'ad-sidebar'
    ];
    
    containers.forEach(containerId => {
      let container = document.getElementById(containerId);
      
      if (!container) {
        console.warn(`⚠️ Container ${containerId} not found, creating...`);
        
        // إنشاء الحاوية في المكان الصحيح
        if (containerId === 'ad-sidebar') {
          const sidebar = document.querySelector('.sidebar');
          if (sidebar) {
            container = document.createElement('div');
            container.id = containerId;
            sidebar.prepend(container);
          }
        } else {
          const gameContainer = document.querySelector('.game-container');
          if (gameContainer) {
            container = document.createElement('div');
            container.id = containerId;
            
            // وضع الحاوية في المكان الصحيح
            if (containerId === 'ad-above-iframe') {
              const iframe = document.querySelector('.game-frame');
              if (iframe) {
                iframe.parentNode.insertBefore(container, iframe);
              } else {
                gameContainer.prepend(container);
              }
            } else if (containerId === 'ad-below-iframe') {
              const iframe = document.querySelector('.game-frame');
              if (iframe) {
                iframe.parentNode.insertBefore(container, iframe.nextSibling);
              } else {
                gameContainer.appendChild(container);
              }
            } else if (containerId === 'ad-page-bottom') {
              gameContainer.appendChild(container);
            }
          }
        }
      }
      
      // تنظيف الحاوية
      if (container) {
        container.innerHTML = '';
        container.style.cssText = 'min-height:50px;'; // ارتفاع أدنى
      }
    });
  }

  // === 13. عرض إعلانات فولباك ===
  showFallbackAds() {
    console.log('🔄 Showing fallback ads...');
    
    const containers = {
      'ad-above-iframe': '728x90 Banner',
      'ad-below-iframe': '728x90 Banner', 
      'ad-page-bottom': '970x250 Large Banner',
      'ad-sidebar': '300x250 Sidebar'
    };
    
    Object.entries(containers).forEach(([containerId, size]) => {
      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML = `
          <div class="ad-banner" style="background:linear-gradient(135deg,#1a2a6c,#b21f1f);padding:15px;border-radius:8px;text-align:center;">
            <div class="ad-label">Ad</div>
            <h4 style="color:#ffd700;margin:10px 0;">${size}</h4>
            <p style="color:rgba(255,255,255,0.8);font-size:12px;margin-bottom:10px;">
              Advertisement space
            </p>
            <div style="background:rgba(255,255,255,0.1);padding:10px;border-radius:5px;margin:5px 0;">
              <span style="color:#aaa;font-size:10px;">Ad loading failed</span>
            </div>
          </div>
        `;
      }
    });
  }

  // === 14. تصفية أخطاء Unity ===
  filterUnityErrors() {
    const originalError = console.error;
    const originalWarn = console.warn;
    
    console.error = function(...args) {
      // تجاهل أخطاء Unity الشائعة
      if (args[0] && typeof args[0] === 'string') {
        const errorMsg = args[0];
        if (errorMsg.includes('The referenced script') ||
            errorMsg.includes('is missing!') ||
            errorMsg.includes('2f3f5cd4') ||
            errorMsg.includes('crowd_new')) {
          return; // تجاهل هذا الخطأ
        }
      }
      originalError.apply(console, args);
    };
    
    console.warn = function(...args) {
      if (args[0] && typeof args[0] === 'string') {
        const warnMsg = args[0];
        if (warnMsg.includes('unity') || warnMsg.includes('Unity')) {
          return; // تجاهل تحذيرات Unity
        }
      }
      originalWarn.apply(console, args);
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
    
    // إزالة جميع الإعلانات المنشأة
    this.adElements.forEach(element => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
    this.adElements.clear();
    
    // إعادة ضبط وحدة التحكم
    console.error = console.error;
    console.warn = console.warn;
  }
}

// === تشغيل تلقائي ===
document.addEventListener('DOMContentLoaded', () => {
  const adsManager = new AdsManager();
  adsManager.init();
  
  // حفظ المدير عالمياً للتحكم
  window.adsManager = adsManager;
  
  // إضافة أنماط CSS للإعلانات
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
      transition: opacity 0.3s ease;
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
    
    .ad-close-btn {
      position: absolute;
      top: 8px;
      left: 8px;
      background: rgba(255,68,68,0.7);
      color: white;
      border: none;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.3s ease;
      z-index: 10;
    }
    
    .ad-close-btn:hover {
      background: rgba(255,68,68,1);
    }
    
    .ad-loading {
      animation: pulse 1.5s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 1; }
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `;
  document.head.appendChild(style);
});

console.log('🚀 نظام إدارة الإعلانات المصحح جاهز للعمل');
