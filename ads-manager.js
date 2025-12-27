/**
 * 🎯 نظام إدارة الإعلانات – نسخة الإصلاح النهائي
 * 1- Observer يراقب العناصر حتى لو أُضيفت متأخرة
 * 2- fallback فوري إذا فشل السكريبت الخارجي
 * 3- محاولات أسرع (5 مرات كل 1 ثانية)
 * 4- زر يدوي احتياطي للسمارت-لينك
 * 5- كشف أد-بلوك حقيقي عبر طلب ملف Google
 */
class AdsManager {
  constructor() {
    this.config        = null;
    this.rotationTimers= {};
    this.sessionData   = this.getSessionData();
    this.isAdBlockDetected = false;
    this.observer      = null;        // لمراقبة العناصر المتأخرة
  }

  /* ==================== 1. تهيئة ==================== */
  async init() {
    try {
      const res = await fetch('ads.json');
      if (!res.ok) throw new Error('ads.json not found');
      this.config = await res.json();

      // إذا أردت إلغاء التأخير completely ضع enabled:false في الـjson
      if (this.config.config?.smartDelay?.enabled) {
        await this.delay(this.config.config.smartDelay.delayBeforeFirstAd);
      }

      this.injectCSS();          // نضع CSS الاحتياطي
      this.watchElements();      // نراقب العناصر المتأخرة
      this.detectAdBlock();      // كشف أد-بلوك
      this.loadPopunder();
      this.loadSmartlink();      // نبدأ بمراقبة الiframe + زر احتياطي
      this.loadBanners();        // فوق / تحت / أسفل
      this.loadNativeBanner();
      this.loadSidebarAds();     // السايدبار (يعمل فعلاً)
      this.loadInterstitial();
      console.log('🎯 جميع الوحدات جاهزة');
    } catch (e) {
      console.error('❌ خطأ تهيئة:', e);
    }
  }

  /* ==================== 2. CSS مؤقت ==================== */
  injectCSS() {
    if (document.getElementById('adManagerCSS')) return;
    const st = document.createElement('style');
    st.id = 'adManagerCSS';
    st.textContent = `
      .ad-banner{
        min-height:90px;background:#111;display:flex;align-items:center;
        justify-content:center;color:#666;font-size:11px;border-radius:6px;margin:10px 0;
      }
      .ad-label{font-size:10px;color:#999;text-align:center;margin-bottom:4px;}
      #smartlinkBtn{position:fixed;bottom:70px;right:15px;z-index:9999;padding:8px 14px;
        background:#e91e63;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;}
    `;
    document.head.appendChild(st);
  }

  /* ==================== 3. مراقبة العناصر ==================== */
  watchElements() {
    const ids = ['ad-above-iframe','ad-below-iframe','ad-page-bottom','game-iframe','ad-sidebar'];
    this.observer = new MutationObserver(() => {
      ids.forEach(id => {
        if (document.getElementById(id) && !document.getElementById(id)?.dataset.ready) {
          document.getElementById(id).dataset.ready = '1';
          if (id.includes('iframe')) this.loadSmartlink();
          if (id === 'ad-page-bottom') this.loadBannerAd(id, this.config.banners.pageBottom);
          if (id === 'ad-above-iframe') this.loadBannerAd(id, this.config.banners.aboveIframe);
          if (id === 'ad-below-iframe') this.loadBannerAd(id, this.config.banners.belowIframe);
        }
      });
    });
    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  /* ==================== 4. Anti-Adblock – نسخة قوية ==================== */
  detectAdBlock() {
    if (!this.config.config?.antiAdblock?.enabled) return;
    // نختبر ملف google الحقيقي
    fetch('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', { mode: 'no-cors' })
      .then(() => {
        // نجح ⇒ لا أد-بلوك
        this.isAdBlockDetected = false;
      })
      .catch(() => {
        this.isAdBlockDetected = true;
        this.showAdBlockMessage();
      });
  }
  showAdBlockMessage() {
    const o = document.createElement('div');
    o.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:999999;display:flex;align-items:center;justify-content:center;';
    o.innerHTML = `
      <div style="background:#fff;padding:40px;border-radius:15px;text-align:center;max-width:500px;">
        <h2 style="color:#e74c3c;margin-bottom:20px;">⚠️ AdBlock Detected</h2>
        <p style="color:#333;margin-bottom:20px;">${this.config.config.antiAdblock.message}</p>
        <button onclick="location.reload()" style="background:#3498db;color:#fff;border:none;padding:12px 30px;border-radius:5px;cursor:pointer;">Refresh Page</button>
      </div>`;
    document.body.appendChild(o);
  }

  /* ==================== 5. Popunder ==================== */
  loadPopunder() {
    if (!this.config.popunder?.enabled) return;
    if (this.config.popunder.frequency === 'once_per_session' && this.sessionData.popunderShown) return;
    setTimeout(() => {
      this.config.popunder.scripts.forEach(src => {
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        document.body.appendChild(s);
      });
      this.sessionData.popunderShown = true;
      this.saveSessionData();
      console.log('✅ Popunder');
    }, this.config.popunder.delay || 3000);
  }

  /* ==================== 6. Smartlink – مع زر احتياطي ==================== */
  loadSmartlink() {
    if (!this.config.smartlink?.enabled) return;
    if (this.config.smartlink.frequency === 'once_per_session' && this.sessionData.smartlinkOpened) return;

    const fire = () => {
      if (this.config.smartlink.openInNewTab)
        window.open(this.config.smartlink.url, '_blank', 'noopener,noreferrer');
      else location.href = this.config.smartlink.url;
      this.sessionData.smartlinkOpened = true;
      this.saveSessionData();
      console.log('✅ Smartlink fired');
    };

    // أولاً: نحاول تلقائياً عند تحميل الiframe
    const iframe = document.getElementById('game-iframe');
    if (iframe) {
      iframe.addEventListener('load', () => setTimeout(fire, 2000), { once: true });
    } else {
      // ثانياً: زر يدوي يظهر بعد 4 ثواني
      setTimeout(() => {
        if (!this.sessionData.smartlinkOpened) {
          const btn = document.createElement('button');
          btn.id = 'smartlinkBtn';
          btn.textContent = 'Continue »';
          btn.onclick = () => { fire(); btn.remove(); };
          document.body.appendChild(btn);
        }
      }, 4000);
    }
  }

  /* ==================== 7. البانرات – محاولات أسرع ==================== */
  loadBanners() {
    if (this.config.banners?.aboveIframe?.enabled)
      this.loadBannerAd('ad-above-iframe', this.config.banners.aboveIframe);
    if (this.config.banners?.belowIframe?.enabled)
      this.loadBannerAd('ad-below-iframe', this.config.banners.belowIframe);
    if (this.config.banners?.pageBottom?.enabled)
      this.loadBannerAd('ad-page-bottom', this.config.banners.pageBottom);
  }
  loadBannerAd(containerId, bannerConfig) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const ads = bannerConfig.ads;
    let currentIndex = 0;

    const loadAd = idx => {
      const ad = ads[idx];
      const wrap = document.createElement('div');
      wrap.className = 'ad-banner';
      wrap.innerHTML = `
        <div class="ad-label">Advertisement</div>
        <div id="banner-${ad.id}" style="min-height:${ad.config.height}px;background:#111;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;">Loading ad...</div>`;
      container.innerHTML = '';
      container.appendChild(wrap);

      let retries = 0;
      const maxRetries = 5;
      const tryLoad = () => {
        const tgt = document.getElementById(`banner-${ad.id}`);
        if (!tgt) return;

        window.atOptions = ad.config;
        const s = document.createElement('script');
        s.src = ad.script;
        s.async = true;

        s.onload = () => {
          tgt.style.background = 'transparent';
          tgt.innerHTML = '';
        };
        s.onerror = () => {
          retries++;
          if (retries < maxRetries) setTimeout(tryLoad, 1000 * retries);
          else tgt.innerHTML = '<span style="color:#ccc;font-size:11px;">Ad unavailable</span>';
        };
        tgt.appendChild(s);
      };
      setTimeout(tryLoad, 100);
    };

    loadAd(currentIndex);

    if (bannerConfig.rotation && ads.length > 1) {
      const iv = bannerConfig.rotationInterval || 30000;
      this.rotationTimers[containerId] = setInterval(() => {
        currentIndex = (currentIndex + 1) % ads.length;
        loadAd(currentIndex);
        console.log(`🔄 rotate ${containerId} -> ${ads[currentIndex].id}`);
      }, iv);
    }
  }

  /* ==================== 8. Native Banner ==================== */
  loadNativeBanner() {
    if (!this.config.nativeBanner?.enabled) return;
    const sidebar = document.querySelector('.sidebar') || document.getElementById('ad-sidebar');
    if (!sidebar) return;

    const wrap = document.createElement('div');
    wrap.className = 'ad-banner';
    wrap.style.cssText = 'margin:20px 0;background:rgba(0,0,0,.7);border-radius:8px;padding:15px;';
    wrap.innerHTML = `<div class="ad-label">Sponsored</div>${this.config.nativeBanner.html}`;
    sidebar.insertBefore(wrap, sidebar.firstChild);

    setTimeout(() => {
      const s = document.createElement('script');
      s.src = this.config.nativeBanner.script;
      s.async = true;
      s.setAttribute('data-cfasync', 'false');
      wrap.appendChild(s);
      console.log('✅ Native Banner');
    }, 500);
  }

  /* ==================== 9. Sidebar Ads ==================== */
  loadSidebarAds() {
    if (!this.config.sidebarAd?.enabled) return;
    const container = document.getElementById('ad-sidebar');
    if (!container) return;

    const ads = this.config.sidebarAd.ads;
    let idx = 0;

    const load = i => {
      const ad = ads[i];
      const d = document.createElement('div');
      d.className = 'ad-banner ad-sidebar';
      d.style.cssText = 'background:rgba(0,0,0,.7);border-radius:8px;padding:15px;margin:20px 0;position:sticky;top:100px;';
      d.innerHTML = `<div class="ad-label">Advertisement</div><div id="sidebar-${ad.id}" style="min-height:${ad.config.height}px;"></div>`;
      container.innerHTML = '';
      container.appendChild(d);

      setTimeout(() => {
        window.atOptions = ad.config;
        const s = document.createElement('script');
        s.src = ad.script;
        s.async = true;
        document.getElementById(`sidebar-${ad.id}`).appendChild(s);
      }, 100);
    };
    load(idx);

    if (this.config.sidebarAd.rotation && ads.length > 1) {
      const iv = this.config.sidebarAd.rotationInterval || 35000;
      this.rotationTimers.sidebar = setInterval(() => {
        idx = (idx + 1) % ads.length;
        load(idx);
        console.log(`🔄 rotate Sidebar -> ${ads[idx].id}`);
      }, iv);
    }
  }

  /* ==================== 10. Interstitial ==================== */
  loadInterstitial() {
    if (!this.config.interstitialAd?.enabled) return;
    const freq = this.config.interstitialAd.frequency;
    const pv = this.sessionData.pageViews || 0;
    if (freq === 'every_3_pages' && pv % 3 !== 0) return;

    setTimeout(() => {
      const o = document.createElement('div');
      o.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.95);z-index:999999;display:flex;align-items:center;justify-content:center;';
      o.innerHTML = `<div style="background:#fff;padding:30px;border-radius:15px;max-width:700px;max-height:90vh;overflow-y:auto;">${this.config.interstitialAd.html}</div>`;
      document.body.appendChild(o);

      let cd = this.config.interstitialAd.closeDelay / 1000;
      const cdEl = document.getElementById('countdown');
      const t = setInterval(() => {
        cd--;
        if (cdEl) cdEl.textContent = cd;
        if (cd <= 0) {
          clearInterval(t);
          if (this.config.interstitialAd.closeable) o.remove();
        }
      }, 1000);
      o.addEventListener('click', e => {
        if (e.target.closest('button') || cd <= 0) o.remove();
      });
      console.log('✅ Interstitial');
    }, this.config.interstitialAd.delay || 10000);
  }

  /* ==================== أدوات مساعدة ==================== */
  getSessionData() {
    const d = sessionStorage.getItem('adsSessionData');
    const def = { popunderShown: false, smartlinkOpened: false, pageViews: 0 };
    if (!d) return def;
    try { return { ...def, ...JSON.parse(d) }; } catch { return def; }
  }
  saveSessionData() {
    this.sessionData.pageViews = (this.sessionData.pageViews || 0) + 1;
    sessionStorage.setItem('adsSessionData', JSON.stringify(this.sessionData));
  }
  delay(ms) { return new Promise(r => setTimeout(r, ms)); }
  destroy() {
    Object.values(this.rotationTimers).forEach(t => clearInterval(t));
    this.rotationTimers = {};
    if (this.observer) this.observer.disconnect();
  }
}

/* ==================== تشغيل تلقائي ==================== */
document.addEventListener('DOMContentLoaded', () => {
  window.adsManager = new AdsManager();
  window.adsManager.init();
});
console.log('🚀 Ads-Manager Enhanced Ready');
