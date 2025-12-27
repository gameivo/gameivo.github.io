/**
 * 🎯 نظام إدارة الإعلانات الذكي – نسخة محسّنة
 * ✅ تم معالجة:
 *   - البانرات السوداء (إعادة محاولة تلقائية + fallback)
 *   - Anti-Adblock لا يعمل (كشف مزدوج)
 *   - التأخير في ظهور الإعلانات (تقليل التأخير)
 *   - إدخال CSS مؤقت لحامل الإعلان
 */

class AdsManager {
  constructor() {
    this.config = null;
    this.rotationTimers = {};
    this.sessionData = this.getSessionData();
    this.isAdBlockDetected = false;
  }

  /* ========== 1. تهيئة النظام ========== */
  async init() {
    try {
      const response = await fetch('ads.json');
      if (!response.ok) throw new Error('Failed to load ads.json');

      this.config = await response.json();
      console.log('✅ تم تحميل إعدادات الإعلانات');

      if (this.config.config?.smartDelay?.enabled) {
        await this.delay(this.config.config.smartDelay.delayBeforeFirstAd);
      }

      this.detectAdBlock();
      this.loadPopunder();
      this.loadBanners();
      this.loadNativeBanner();
      this.loadSidebarAds();
      this.loadSmartlink();
      this.loadSocialBar();
      this.loadInterstitial();

      console.log('🎯 تم تفعيل جميع الإعلانات بنجاح');
    } catch (error) {
      console.error('❌ خطأ في تحميل الإعلانات:', error);
    }
  }

  /* ========== 2. كشف AdBlock – نسخة محسّنة ========== */
  detectAdBlock() {
    if (!this.config.config?.antiAdblock?.enabled) return;

    const checks = [
      () => {
        const test = document.createElement('div');
        test.className = 'adsbox';
        test.style.height = '1px';
        document.body.appendChild(test);
        const blocked = test.offsetHeight === 0;
        document.body.removeChild(test);
        return blocked;
      },
      () =>
        fetch('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', {
          mode: 'no-cors'
        })
          .then(() => false)
          .catch(() => true)
    ];

    Promise.all(checks.map(fn => Promise.resolve(fn()))).then(results => {
      if (results.some(Boolean)) {
        this.isAdBlockDetected = true;
        this.showAdBlockMessage();
      }
    });
  }

  showAdBlockMessage() {
    const overlay = document.createElement('div');
    overlay.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.9);z-index:999999;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
      <div style="background:#fff;padding:40px;border-radius:15px;text-align:center;max-width:500px;">
        <h2 style="color:#e74c3c;margin-bottom:20px;">⚠️ AdBlock Detected</h2>
        <p style="color:#333;margin-bottom:20px;">${this.config.config.antiAdblock.message}</p>
        <button onclick="location.reload()" style="background:#3498db;color:#fff;border:none;padding:12px 30px;border-radius:5px;cursor:pointer;font-size:16px;">Refresh Page</button>
      </div>`;
    document.body.appendChild(overlay);
  }

  /* ========== 3. Popunder ========== */
  loadPopunder() {
    if (!this.config.popunder?.enabled) return;
    if (
      this.config.popunder.frequency === 'once_per_session' &&
      this.sessionData.popunderShown
    )
      return;

    setTimeout(() => {
      this.config.popunder.scripts.forEach(src => {
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        document.body.appendChild(s);
      });
      this.sessionData.popunderShown = true;
      this.saveSessionData();
      console.log('✅ Popunder loaded');
    }, this.config.popunder.delay || 3000);
  }

  /* ========== 4. البانرات مع إعادة محاولة تلقائية ========== */
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
      const adContainer = document.createElement('div');
      adContainer.className = 'ad-banner';
      adContainer.innerHTML = `
        <div class="ad-label">Advertisement</div>
        <div id="banner-${ad.id}" style="min-height:${ad.config.height}px;background:#111;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;">
          Loading ad...
        </div>`;

      container.innerHTML = '';
      container.appendChild(adContainer);

      let retries = 0;
      const maxRetries = 3;
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
          if (retries < maxRetries)
            setTimeout(tryLoad, 1500 * retries);
          else
            tgt.innerHTML = '<span style="color:#ccc;font-size:11px;">Ad failed</span>';
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
        console.log(`🔄 تدوير ${containerId} -> ${ads[currentIndex].id}`);
      }, iv);
    }
  }

  /* ========== 5. Native Banner ========== */
  loadNativeBanner() {
    if (!this.config.nativeBanner?.enabled) return;
    const sidebar =
      document.querySelector('.sidebar') || document.getElementById('ad-sidebar');
    if (!sidebar) return;

    const wrap = document.createElement('div');
    wrap.className = 'ad-banner';
    wrap.style.cssText =
      'margin:20px 0;background:rgba(0,0,0,.7);border-radius:8px;padding:15px;';
    wrap.innerHTML = `
      <div class="ad-label">Sponsored</div>
      ${this.config.nativeBanner.html}`;

    sidebar.insertBefore(wrap, sidebar.firstChild);
    setTimeout(() => {
      const s = document.createElement('script');
      s.src = this.config.nativeBanner.script;
      s.async = true;
      s.setAttribute('data-cfasync', 'false');
      wrap.appendChild(s);
      console.log('✅ Native Banner loaded');
    }, 500);
  }

  /* ========== 6. Sidebar Ads ========== */
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
      d.style.cssText =
        'background:rgba(0,0,0,.7);border-radius:8px;padding:15px;margin:20px 0;position:sticky;top:100px;';
      d.innerHTML = `
        <div class="ad-label">Advertisement</div>
        <div id="sidebar-${ad.id}" style="min-height:${ad.config.height}px;"></div>`;

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
        console.log(`🔄 تدوير Sidebar -> ${ads[idx].id}`);
      }, iv);
    }
  }

  /* ========== 7. Smartlink ========== */
  loadSmartlink() {
    if (!this.config.smartlink?.enabled) return;
    if (
      this.config.smartlink.frequency === 'once_per_session' &&
      this.sessionData.smartlinkOpened
    )
      return;

    const iframe = document.getElementById('game-iframe');
    if (iframe) {
      iframe.addEventListener('load', () => {
        setTimeout(() => {
          if (this.config.smartlink.openInNewTab)
            window.open(this.config.smartlink.url, '_blank', 'noopener,noreferrer');
          else window.location.href = this.config.smartlink.url;

          this.sessionData.smartlinkOpened = true;
          this.saveSessionData();
          console.log('✅ Smartlink opened');
        }, 2000);
      }, { once: true });
    }
  }

  /* ========== 8. Social Bar ========== */
  loadSocialBar() {
    if (!this.config.socialBar?.enabled) return;
    const bar = document.createElement('div');
    bar.style.cssText =
      'position:fixed;bottom:0;left:0;width:100%;z-index:999;';
    if (this.config.socialBar.sticky) bar.style.position = 'sticky';
    bar.innerHTML = this.config.socialBar.html;
    document.body.appendChild(bar);
    console.log('✅ Social Bar loaded');
  }

  /* ========== 9. Interstitial ========== */
  loadInterstitial() {
    if (!this.config.interstitialAd?.enabled) return;
    const freq = this.config.interstitialAd.frequency;
    const pv = this.sessionData.pageViews || 0;
    if (freq === 'every_3_pages' && pv % 3 !== 0) return;

    setTimeout(() => {
      const overlay = document.createElement('div');
      overlay.id = 'interstitial-overlay';
      overlay.style.cssText =
        'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.95);z-index:999999;display:flex;align-items:center;justify-content:center;';
      overlay.innerHTML = `
        <div style="background:#fff;padding:30px;border-radius:15px;max-width:700px;max-height:90vh;overflow-y:auto;">
          ${this.config.interstitialAd.html}
        </div>`;
      document.body.appendChild(overlay);

      let cd = this.config.interstitialAd.closeDelay / 1000;
      const cdEl = document.getElementById('countdown');
      const t = setInterval(() => {
        cd--;
        if (cdEl) cdEl.textContent = cd;
        if (cd <= 0) {
          clearInterval(t);
          if (this.config.interstitialAd.closeable) overlay.remove();
        }
      }, 1000);
      overlay.addEventListener('click', e => {
        if (e.target.closest('button') || cd <= 0) overlay.remove();
      });
      console.log('✅ Interstitial shown');
    }, this.config.interstitialAd.delay || 10000);
  }

  /* ========== 10. إدارة الجلسة ========== */
  getSessionData() {
    const d = sessionStorage.getItem('adsSessionData');
    const defaults = { popunderShown: false, smartlinkOpened: false, pageViews: 0 };
    if (!d) return defaults;
    try {
      return { ...defaults, ...JSON.parse(d) };
    } catch {
      return defaults;
    }
  }
  saveSessionData() {
    this.sessionData.pageViews = (this.sessionData.pageViews || 0) + 1;
    sessionStorage.setItem('adsSessionData', JSON.stringify(this.sessionData));
  }

  /* ========== 11. ديلاي مساعد ========== */
  delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  /* ========== 12. تنظيف ========== */
  destroy() {
    Object.values(this.rotationTimers).forEach(t => clearInterval(t));
    this.rotationTimers = {};
  }
}

/* ========== تشغيل تلقائي ========== */
document.addEventListener('DOMContentLoaded', () => {
  const adsManager = new AdsManager();
  adsManager.init();
  window.adsManager = adsManager;
});

/* ========== CSS مؤقت (يمكن نقله إلى ملف CSS خارجي) ========== */
const style = document.createElement('style');
style.textContent = `
.ad-banner{
  min-height:90px;
  background:#111;
  display:flex;
  align-items:center;
  justify-content:center;
  color:#666;
  font-size:11px;
  border-radius:6px;
  margin:10px 0;
}
.ad-label{
  font-size:10px;
  color:#999;
  margin-bottom:4px;
  text-align:center;
}
`;
document.head.appendChild(style);

console.log('🚀 نظام إدارة الإعلانات جاهز للعمل – نسخة محسّنة');
