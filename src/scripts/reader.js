class ReaderMode {
  constructor() {
    this.pdfDoc = null;
    this.pageNum = 1;
    this.pageCount = 0;
    this.scale = 1;
  }

  async loadPdf(data) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf/pdf.worker.min.js';
    this.pdfDoc = await pdfjsLib.getDocument({ data }).promise;
    this.pageCount = this.pdfDoc.numPages;
    this.pageNum = 1;
    this.scale = 1;
    await this._fitWidth();
    await this.renderPage(this.pageNum);
  }

  async renderPage(num) {
    if (!this.pdfDoc) return;
    this.pageNum = num;
    const page = await this.pdfDoc.getPage(num);
    const viewport = page.getViewport({ scale: this.scale });

    const canvas = document.getElementById('pdfViewerCanvas');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = viewport.width * dpr;
    canvas.height = viewport.height * dpr;
    canvas.style.width = viewport.width + 'px';
    canvas.style.height = viewport.height + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const renderContext = { canvasContext: ctx, viewport };
    await page.render(renderContext).promise;

    document.getElementById('pdfPageNum').textContent = num;
    document.getElementById('pdfPageCount').textContent = this.pageCount;
    document.getElementById('pdfZoomInfo').textContent = Math.round(this.scale * 100) + '%';

    await this._renderText(num);

    document.getElementById('pdfViewerScroll').scrollTop = 0;
  }

  async _renderText(num) {
    const layerEl = document.getElementById('pdfTextLayer');
    const textEl = document.getElementById('pdfText');
    if (!layerEl) return;
    layerEl.innerHTML = '';
    layerEl.style.display = '';
    if (textEl) { textEl.innerHTML = ''; textEl.style.display = 'none'; }
    try {
      const page = await this.pdfDoc.getPage(num);
      if (this.pageNum !== num) return;
      const viewport = page.getViewport({ scale: this.scale });
      const rawDims = viewport.rawDims;
      const pageH = rawDims ? rawDims.pageHeight : viewport.height / this.scale;
      layerEl.style.width = viewport.width + 'px';
      layerEl.style.height = viewport.height + 'px';
      const content = await page.getTextContent();
      if (this.pageNum !== num) return;
      const { items } = content;
      if (items.length === 0) {
        if (textEl) {
          textEl.innerHTML = '<p style="color:var(--text-secondary);font-style:italic;font-size:14px;">No extractable text on this page.</p>';
          textEl.style.display = '';
        }
        layerEl.style.display = 'none';
        return;
      }
      const ascentRatio = 0.85;
      for (const item of items) {
        if (!item.str || !item.str.trim()) continue;
        const x = item.transform[4] * this.scale;
        const y = (pageH - item.transform[5]) * this.scale;
        const fontSize = Math.hypot(item.transform[2], item.transform[3]) * this.scale;
        if (fontSize <= 0) continue;
        const span = document.createElement('span');
        span.style.left = x + 'px';
        span.style.top = (y - fontSize * ascentRatio) + 'px';
        span.style.fontSize = fontSize + 'px';
        span.style.fontFamily = 'sans-serif';
        span.style.lineHeight = '1';
        span.style.whiteSpace = 'pre';
        span.textContent = item.str;
        layerEl.appendChild(span);
      }
      const allSpans = layerEl.querySelectorAll(':scope > span');
      for (const s of allSpans) {
        const text = s.textContent;
        if (!text.trim()) continue;
        const words = text.split(/\s+/).filter(Boolean);
        s.innerHTML = words.map(w => {
          const safe = w.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          return `<span class="rw-word" data-word="${safe}">${safe}</span>`;
        }).join(' ');
      }
    } catch (e) {
      console.warn('Text render failed:', e);
      if (textEl) {
        textEl.innerHTML = '';
        textEl.style.display = 'none';
      }
      if (layerEl) layerEl.style.display = 'none';
    }
  }

  getPageText(num) {
    if (!this.pdfDoc) return Promise.resolve('');
    return this.pdfDoc.getPage(num).then(page =>
      page.getTextContent().then(content =>
        content.items.map(item => item.str).join(' ')
      )
    ).catch(() => '');
  }

  async prevPage() {
    if (this.pageNum > 1) {
      await this.renderPage(this.pageNum - 1);
    }
  }

  async nextPage() {
    if (this.pageNum < this.pageCount) {
      await this.renderPage(this.pageNum + 1);
    }
  }

  async zoomBy(factor) {
    this.scale = Math.min(Math.max(this.scale * factor, 0.1), 10);
    await this.renderPage(this.pageNum);
  }

  async zoomIn() {
    await this.zoomBy(1.25);
  }

  async zoomOut() {
    await this.zoomBy(0.8);
  }

  async _fitWidth() {
    if (!this.pdfDoc) return;
    const page = await this.pdfDoc.getPage(1);
    const vp = page.getViewport({ scale: 1 });
    const container = document.getElementById('pdfViewerScroll');
    const cw = container.clientWidth;
    if (cw <= 0) return;
    const maxW = cw - 32;
    if (vp.width > maxW && maxW > 0) {
      this.scale = maxW / vp.width;
    }
  }

  reset() {
    this.pdfDoc = null;
    this.pageNum = 1;
    this.pageCount = 0;
    this.scale = 1;
    const canvas = document.getElementById('pdfViewerCanvas');
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
    const textEl = document.getElementById('pdfText');
    if (textEl) { textEl.innerHTML = ''; textEl.style.display = 'none'; }
    const layerEl = document.getElementById('pdfTextLayer');
    if (layerEl) { layerEl.innerHTML = ''; layerEl.style.display = 'none'; }
  }
}

const readerMode = new ReaderMode();
