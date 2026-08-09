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
      const measureCtx = this._getMeasureCtx();
      for (const item of items) {
        if (!item.str || !item.str.trim()) continue;
        const x = item.transform[4] * this.scale;
        const y = (pageH - item.transform[5]) * this.scale;
        const fontSize = Math.hypot(item.transform[2], item.transform[3]) * this.scale;
        if (fontSize <= 0) continue;

        const top = (y - fontSize * ascentRatio) + 'px';
        measureCtx.font = Math.max(1, Math.round(fontSize)) + 'px sans-serif';

        const words = item.str.split(/\s+/).filter(Boolean);
        if (words.length === 0) continue;

        let itemWidth = (item.width || 0) * this.scale;

        if (words.length === 1) {
          if (itemWidth <= 0) itemWidth = measureCtx.measureText(words[0]).width;
          this._appendWordSpan(layerEl, words[0], x, top, fontSize, itemWidth);
        } else {
          if (itemWidth <= 0) {
            itemWidth = words.reduce((sum, w) => sum + measureCtx.measureText(w).width, 0);
          }
          const widths = words.map((w) => Math.max(1, measureCtx.measureText(w).width));
          const total = widths.reduce((a, b) => a + b, 0) || 1;
          let offset = 0;
          words.forEach((w, i) => {
            const ww = (widths[i] / total) * itemWidth;
            this._appendWordSpan(layerEl, w, x + offset, top, fontSize, ww);
            offset += ww;
          });
        }
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

  _getMeasureCtx() {
    if (!this._measureCtx) {
      this._measureCtx = document.createElement('canvas').getContext('2d');
    }
    return this._measureCtx;
  }

  _appendWordSpan(layerEl, word, left, top, fontSize, width) {
    const span = document.createElement('span');
    span.className = 'rw-word';
    span.dataset.word = word;
    span.textContent = word;
    span.style.position = 'absolute';
    span.style.left = left + 'px';
    span.style.top = top;
    span.style.width = Math.max(1, width) + 'px';
    span.style.height = fontSize + 'px';
    span.style.fontSize = fontSize + 'px';
    span.style.lineHeight = '1';
    span.style.whiteSpace = 'nowrap';
    span.style.overflow = 'hidden';
    span.style.fontFamily = 'sans-serif';
    layerEl.appendChild(span);
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
