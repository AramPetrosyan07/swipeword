(function loadPartials() {
  document.querySelectorAll('[data-partial]').forEach((mount) => {
    const src = mount.getAttribute('data-partial');
    if (!src || mount.dataset.loaded) return;
    mount.dataset.loaded = '1';
    const req = new XMLHttpRequest();
    req.open('GET', src, false);
    req.send();
    if (req.status >= 200 && req.status < 300) {
      mount.outerHTML = req.responseText;
    } else {
      console.error('Failed to load partial:', src, req.status);
    }
  });
})();
