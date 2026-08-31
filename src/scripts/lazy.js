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
    return loadScript('https://www.youtube.com/iframe_api', () =>
      typeof window.YT !== 'undefined' && typeof window.YT.Player === 'function'
    );
  };
})();
