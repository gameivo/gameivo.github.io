/**
 * 🎯 نظام إدارة الإعلانات الذكي مع كشف AdBlock المتقدم
 * يعمل مع ads.json بشكل كامل
 */

class AdsManager {
  constructor() {
    this.config = null;
    this.rotationTimers = {};
    this.sessionData = this.getSessionData();
    this.isAdBlockDetected = false;
    this.adElements = new Map();
    this.adBlockCheckComplete = false;
  }

  // === 1. تحميل الإعدادات ===
  async init() {
    try {
      this.filterUnityErrors();
      
      // كشف AdBlock أولاً قبل أي شيء
      await this.detectAdBlockAdvanced();
      
      // إذا تم اكتشاف AdBlock، أوقف كل شيء
      if (this.isAdBlockDetected) {
        this.blockPageInteraction();
        return;
      }
      
      this.fixAdContainers();
      
      const response = await fetch('ads.json');
      if (!response.ok) throw new Error('Failed to load ads.json');
      
      this.config = await response.json();
      console.log('✅ تم تحميل إعدادات الإعلانات');
      
      if (this.config.config?.smartDelay?.enabled) {
        await this.delay(this.config.config.smartDelay.delayBeforeFirstAd);
      }
      
      await this.loadAdsSequentially();
      
      console.log('🎯 تم تفعيل جميع الإعلانات بنجاح');
      
    } catch (error) {
      console.error('❌ خطأ في تحميل الإعلانات:', error);
      this.showFallbackAds();
    }
  }

  // === 2. كشف AdBlock المتقدم - طرق متعددة ===
  async detectAdBlockAdvanced() {
    if (!this.config?.config?.antiAdblock?.enabled) {
      this.adBlockCheckComplete = true;
      return;
    }

    console.log('🔍 بدء فحص مانع الإعلانات...');
    
    const methods = this.config.config.antiAdblock.detectionMethods || 
                    ["element", "script", "fetch", "iframe", "bait", "timing"];
    
    let detectionResults = [];

    // الطريقة 1: فحص العنصر التقليدي
    if (methods.includes("element")) {
      detectionResults.push(await this.detectByElement());
    }

    // الطريقة 2: فحص تحميل السكريبت الإعلاني
    if (methods.includes("script")) {
      detectionResults.push(await this.detectByScript());
    }

    // الطريقة 3: فحص Fetch API
    if (methods.includes("fetch")) {
      detectionResults.push(await this.detectByFetch());
    }

    // الطريقة 4: فحص iframe
    if (methods.includes("iframe")) {
      detectionResults.push(await this.detectByIframe());
    }

    // الطريقة 5: الطُعم (Bait Element)
    if (methods.includes("bait")) {
      detectionResults.push(await this.detectByBait());
    }

    // الطريقة 6: فحص التوقيت
    if (methods.includes("timing")) {
      detectionResults.push(await this.detectByTiming());
    }

    // إذا اكتشفت أي طريقة AdBlock
    const detected = detectionResults.some(result => result === true);
    
    if (detected) {
      this.isAdBlockDetected = true;
      console.warn('⚠️ تم اكتشاف مانع الإعلانات!');
      this.showAdBlockModal();
    } else {
      console.log('✅ لا يوجد مانع إعلانات');
    }

    this.adBlockCheckComplete = true;
  }

  // طريقة 1: فحص العنصر
  async detectByElement() {
    return new Promise((resolve) => {
      const bait = document.createElement('div');
      bait.innerHTML = '&nbsp;';
      bait.className = 'adsbox ad-banner advertisement pub_300x250 pub_300x250m pub_728x90 text-ad textAd text_ad text_ads text-ads text-ad-links';
      bait.style.cssText = 'width:1px!important;height:1px!important;position:absolute!important;left:-10000px!important;top:-1000px!important;';
      
      document.body.appendChild(bait);
      
      setTimeout(() => {
        const detected = bait.offsetHeight === 0 || 
                        bait.offsetWidth === 0 || 
                        bait.offsetParent === null ||
                        window.getComputedStyle(bait).display === 'none' ||
                        window.getComputedStyle(bait).visibility === 'hidden';
        
        document.body.removeChild(bait);
        resolve(detected);
      }, 100);
    });
  }

  // طريقة 2: فحص السكريبت
  async detectByScript() {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
      script.async = true;
      
      let detected = false;
      const timeout = setTimeout(() => {
        detected = true;
        resolve(true);
      }, 1000);
      
      script.onload = () => {
        clearTimeout(timeout);
        resolve(false);
      };
      
      script.onerror = () => {
        clearTimeout(timeout);
        resolve(true);
      };
      
      document.head.appendChild(script);
    });
  }

  // طريقة 3: فحص Fetch
  async detectByFetch() {
    try {
      const response = await fetch('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', {
        method: 'HEAD',
        mode: 'no-cors'
      });
      return false;
    } catch (error) {
      return true;
    }
  }

  // طريقة 4: فحص iframe
  async detectByIframe() {
    return new Promise((resolve) => {
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'width:1px;height:1px;position:absolute;left:-10000px;top:-10000px;';
      iframe.src = 'about:blank';
      
      document.body.appendChild(iframe);
      
      setTimeout(() => {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          const adDiv = iframeDoc.createElement('div');
          adDiv.className = 'advertisement banner ad-unit';
          adDiv.innerHTML = 'AD';
          iframeDoc.body.appendChild(adDiv);
          
          setTimeout(() => {
            const detected = adDiv.offsetHeight === 0 || 
                           window.getComputedStyle(adDiv).display === 'none';
            document.body.removeChild(iframe);
            resolve(detected);
          }, 100);
        } catch (e) {
          document.body.removeChild(iframe);
          resolve(true);
        }
      }, 100);
    });
  }

  // طريقة 5: الطُعم (Bait)
  async detectByBait() {
    return new Promise((resolve) => {
      const bait = document.createElement('div');
      bait.setAttribute('class', 'pub_300x250 pub_300x250m pub_728x90 text-ad textAd text_ad text_ads text-ads text-ad-links');
      bait.setAttribute('style', 'width: 1px !important; height: 1px !important; position: absolute !important; left: -10000px !important; top: -1000px !important;');
      
      window.document.body.appendChild(bait);
      
      setTimeout(() => {
        const detected = bait.offsetParent === null || 
                        bait.offsetHeight === 0 || 
                        bait.offsetLeft === 0 || 
                        bait.offsetTop === 0 || 
                        bait.offsetWidth === 0 || 
                        bait.clientHeight === 0 || 
                        bait.clientWidth === 0;
        
        window.document.body.removeChild(bait);
        resolve(detected);
      }, 10);
    });
  }

  // طريقة 6: فحص التوقيت
  async detectByTiming() {
    const startTime = performance.now();
    
    return new Promise((resolve) => {
      const testAd = document.createElement('ins');
      testAd.className = 'adsbygoogle';
      testAd.style.cssText = 'display:block;width:1px;height:1px;position:absolute;left:-10000px;';
      
      document.body.appendChild(testAd);
      
      setTimeout(() => {
        const endTime = performance.now();
        const loadTime = endTime - startTime;
        
        // إذا كان وقت التحميل أقل من 5ms، غالباً ما يكون AdBlock
        const detected = loadTime < 5 || testAd.offsetHeight === 0;
        
        document.body.removeChild(testAd);
        resolve(detected);
      }, 100);
    });
  }

  // === 3. عرض نافذة AdBlock المنبثقة ===
  showAdBlockModal() {
    // إزالة أي نافذة سابقة
    const existingModal = document.getElementById('adblock-modal-overlay');
    if (existingModal) {
      existingModal.remove();
    }

    const config = this.config?.config?.antiAdblock || {};
    const message = config.message || 'Please disable your ad blocker to continue using this website.';
    const showOnlyOnce = config.showOnlyOnce !== false;
    
    // إذا تم عرض الرسالة من قبل في هذه الجلسة
    if (showOnlyOnce && this.sessionData.adBlockModalShown) {
      return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'adblock-modal-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.95);
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(10px);
      animation: fadeIn 0.3s ease;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      background: linear-gradient(135deg, #1a2a6c, #b21f1f);
      padding: 40px;
      border-radius: 20px;
      max-width: 500px;
      width: 90%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      animation: slideIn 0.5s ease;
      position: relative;
    `;

    const icon = config.messageStyle === 'modern' ? '🚫' : '⚠️';
    
    modal.innerHTML = `
      <div style="font-size: 4rem; margin-bottom: 20px;">${icon}</div>
      <h2 style="color: #ffd700; margin-bottom: 20px; font-size: 1.8rem; font-weight: bold;">
        AdBlock Detected
      </h2>
      <p style="color: #fff; margin-bottom: 30px; font-size: 1.1rem; line-height: 1.6;">
        ${message}
      </p>
      <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
        <button id="refresh-btn" style="
          background: #3CF7DC;
          color: #000;
          border: none;
          padding: 15px 30px;
          border-radius: 10px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: bold;
          transition: all 0.3s;
          box-shadow: 0 4px 15px rgba(60, 247, 220, 0.3);
        ">
          🔄 Refresh Page
        </button>
        ${config.closeButton ? `
          <button id="close-modal-btn" style="
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
            border: 2px solid rgba(255, 255, 255, 0.3);
            padding: 15px 30px;
            border-radius: 10px;
            cursor: pointer;
            font-size: 1rem;
            font-weight: bold;
            transition: all 0.3s;
          ">
            ✕ Close
          </button>
        ` : ''}
      </div>
      <p style="color: rgba(255, 255, 255, 0.6); margin-top: 25px; font-size: 0.9rem;">
        Our games are 100% free. Ads help us keep this service running.
      </p>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // الأنيميشن
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideIn {
        from { 
          opacity: 0; 
          transform: translateY(-50px) scale(0.9); 
        }
        to { 
          opacity: 1; 
          transform: translateY(0) scale(1); 
        }
      }
      #refresh-btn:hover {
        background: #fff;
        color: #000;
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(60, 247, 220, 0.5);
      }
      #close-modal-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.5);
        transform: translateY(-2px);
      }
    `;
    document.head.appendChild(style);

    // الأحداث
    document.getElementById('refresh-btn').addEventListener('click', () => {
      if (config.autoRefresh !== false) {
        location.reload();
      } else {
        window.location.href = config.redirectUrl || '/';
      }
    });

    if (config.closeButton) {
      document.getElementById('close-modal-btn')?.addEventListener('click', () => {
        overlay.remove();
        this.sessionData.adBlockModalShown = true;
        this.saveSessionData();
      });
    }

    // حفظ أن الرسالة تم عرضها
    this.sessionData.adBlockModalShown = true;
    this.saveSessionData();

    // منع التمرير
    document.body.style.overflow = 'hidden';
  }

  // === 4. منع التفاعل مع الصفحة ===
  blockPageInteraction() {
    // إخفاء كل المحتوى
    document.body.style.opacity = '0.3';
    document.body.style.pointerEvents = 'none';
    document.body.style.userSelect = 'none';
    
    // منع النقر
    const blockClicks = (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
    
    document.addEventListener('click', blockClicks, true);
    document.addEventListener('mousedown', blockClicks, true);
    document.addEventListener('mouseup', blockClicks, true);
    document.addEventListener('touchstart', blockClicks, true);
    document.addEventListener('touchend', blockClicks, true);
    
    // منع التمرير
    document.body.style.overflow = 'hidden';
  }

  // === باقي الدوال من الكود الأصلي ===
  loadPopunder() {
    if (!this.config.popunder?.enabled || this.isAdBlockDetected) return;
    
    const frequency = this.config.popunder.frequency;
    if (frequency === 'once_per_session' && this.sessionData.popunderShown) {
      return;
    }
    
    setTimeout(() => {
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

  async loadBanners() {
    if (this.isAdBlockDetected) return;
    
    const promises = [];
    
    if (this.config.banners?.aboveIframe?.enabled) {
      promises.push(this.loadBannerWithDelay('ad-above-iframe', this.config.banners.aboveIframe, 500));
    }
    
    if (this.config.banners?.belowIframe?.enabled) {
      promises.push(this.loadBannerWithDelay('ad-below-iframe', this.config.banners.belowIframe, 1000));
    }
    
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
    if (this.isAdBlockDetected) return;
    
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`❌ Container ${containerId} not found`);
      return;
    }
    
    container.innerHTML = '';
    
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
      
      this.loadAdScript(ad, `banner-${ad.id}-${containerId}`, container, bannerConfig);
    };
    
    loadAd(currentIndex);
    
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
        
        delete window.atOptions;
        
        if (ad.config) {
          window.atOptions = ad.config;
        }
        
        const script = document.createElement('script');
        script.src = ad.script;
        script.async = true;
        script.setAttribute('data-cfasync', 'false');
        
        script.onload = () => {
          console.log(`✅ Ad ${ad.id} loaded successfully`);
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

  loadNativeBanner() {
    if (!this.config.nativeBanner?.enabled || this.isAdBlockDetected) return;
    
    const sidebar = document.querySelector('.sidebar') || document.getElementById('ad-sidebar');
    if (!sidebar) {
      console.warn('❌ Sidebar not found for native banner');
      return;
    }
    
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

  loadSidebarAds() {
    if (!this.config.sidebarAd?.enabled || this.isAdBlockDetected) return;
    
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

  loadSmartlink() {
    if (!this.config.smartlink?.enabled || this.isAdBlockDetected) return;
    
    const frequency = this.config.smartlink.frequency;
    if (frequency === 'once_per_session' && this.sessionData.smartlinkOpened) {
      console.log('ℹ️ Smartlink already opened this session');
      return;
    }
    
    console.log('🔍 Setting up smartlink detection...');
    
    const openSmartlink = () => {
      console.log('🎮
