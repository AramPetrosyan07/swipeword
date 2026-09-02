(function () {
  let pdfLoadPromise = null;

  function loadScript(src, check) {
    return new Promise((resolve, reject) => {
      if (check()) {
        resolve();
        return;
      }
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load ' + src));
      document.head.appendChild(s);
    });
  }

  window._ensurePdfJs = function () {
    if (!pdfLoadPromise) {
      pdfLoadPromise = loadScript('lib/pdf/pdf.min.js', () => typeof window.pdfjsLib !== 'undefined')
        .catch((e) => { pdfLoadPromise = null; throw e; });
    }
    return pdfLoadPromise;
  };

  window._ensureYouTubeApi = function () {
    if (typeof window.YT !== 'undefined' && typeof window.YT.Player === 'function') {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () {
        if (typeof prev === 'function') prev();
        resolve();
      };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(s);
    });
  };
})();
