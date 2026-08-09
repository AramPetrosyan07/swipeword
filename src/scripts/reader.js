class ReaderMode {
  constructor() {
    this.pdfDoc = null;
    this.pageNum = 1;
    this.pageCount = 0;
    this.scale = 1;
    this.rendered = new Set();
    this.slots = [];
    this._pageOffsets = [];
    this._generation = 0;
    this._scrollPending = false;
    this._viewports = [];
  }

  async loadPdf(data) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf/pdf.worker.min.js';
    this.pdfDoc = await pdfjsLib.getDocument({ data }).promise;
    this.pageCount = this.pdfDoc.numPages;
    this.pageNum = 1;
    this.scale = 1;
    await this._fitWidth();
    await this._buildScrollSlots();
    const pagesEl = document.getElementById('pdfPages');
    if (pagesEl) pagesEl.style.display = 'flex';
    this._buildPageOffsets();
    const scrollContainer = document.getElementById('pdfViewerScroll');
    if (scrollContainer) scrollContainer.scrollTop = 0;
    this.onScroll(true);
  }

  async _buildScrollSlots() {
    const container = document.getElementById('pdfPages');
    if (!container) return;
    container.innerHTML = '';
    this.slots = [];
    this.rendered.clear();
    this._viewports = [];
    const scale = this.scale;
    for (let i = 1; i <= this.pageCount; i++) {
      const page = await this.pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale });
      this._viewports.push(viewport);

      const slot = document.createElement('div');
      slot.className = 'pdf-scroll-page';
      slot.dataset.page = i;
      slot.style.height = viewport.height + 'px';
      slot.style.width = viewport.width + 'px';

      const canvas = document.createElement('canvas');
      canvas.className = 'pdf-scroll-canvas';
      slot.appendChild(canvas);

      const layer = document.createElement('div');
      layer.className = 'pdf-scroll-layer';
      slot.appendChild(layer);

      container.appendChild(slot);
      this.slots.push(slot);
    }
  }

  _buildPageOffsets() {
    const container = document.getElementById('pdfViewerScroll');
    this._pageOffsets = [];
    if (!container || this.slots.length === 0) return;
    const paddingTop = parseFloat(getComputedStyle(container).paddingTop) || 0;
    let gap = 0;
    if (this.slots.length > 1) {
      gap = Math.max(0, this.slots[1].offsetTop - this.slots[0].offsetTop - this.slots[0].offsetHeight);
    }
    let acc = paddingTop;
    for (let i = 0; i < this.slots.length; i++) {
      this._pageOffsets.push(acc);
      acc += this.slots[i].offsetHeight + gap;
    }
  }

  async renderScrollPage(num) {
    if (!this.pdfDoc || num < 1 || num > this.pageCount) return;
    if (this.rendered.has(num)) return;
    const slot = this.slots[num - 1];
    if (!slot) return;
    const canvas = slot.querySelector('.pdf-scroll-canvas');
    const layerEl = slot.querySelector('.pdf-scroll-layer');
    if (!canvas || !layerEl) return;
    const gen = this._generation;
    await this.renderPageTo(canvas, layerEl, num, gen);
    if (gen !== this._generation) return;
    this.rendered.add(num);
  }

  async renderPageTo(canvas, layerEl, num, gen) {
    const page = await this.pdfDoc.getPage(num);
    if (gen !== this._generation) return;
    const viewport = page.getViewport({ scale: this.scale });

    const dpr = window.devicePixelRatio || 1;
    canvas.width = viewport.width * dpr;
    canvas.height = viewport.height * dpr;
    canvas.style.width = viewport.width + 'px';
    canvas.style.height = viewport.height + 'px';

    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    const renderContext = { canvasContext: ctx, viewport };
    await page.render(renderContext).promise;
    if (gen !== this._generation) return;

    await this._renderTextInto(layerEl, num, gen);
  }

  async _renderTextInto(layerEl, num, gen) {
    if (!layerEl) return;
    layerEl.innerHTML = '';
    layerEl.style.display = '';
    try {
      const page = await this.pdfDoc.getPage(num);
      if (gen !== this._generation) return;
      const viewport = page.getViewport({ scale: this.scale });
      const rawDims = viewport.rawDims;
      const pageH = rawDims ? rawDims.pageHeight : viewport.height / this.scale;
      layerEl.style.width = viewport.width + 'px';
      layerEl.style.height = viewport.height + 'px';
      const content = await page.getTextContent();
      if (gen !== this._generation) return;
      const { items } = content;
      if (items.length === 0) {
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

  _visiblePageRange() {
    const container = document.getElementById('pdfViewerScroll');
    if (!container || this.slots.length === 0) return null;
    const scrollTop = container.scrollTop;
    const viewH = container.clientHeight;
    const buffer = 1;
    let first = -1;
    let last = -1;
    for (let i = 0; i < this.slots.length; i++) {
      const top = this._pageOffsets[i];
      const bottom = top + this.slots[i].offsetHeight;
      if (bottom > scrollTop && top < scrollTop + viewH) {
        if (first === -1) first = i;
        last = i;
      }
    }
    if (first === -1) return null;
    const keep = 6;
    const start = Math.max(0, first - buffer);
    const end = Math.min(this.pageCount - 1, last + buffer);
    const unloadStart = Math.max(0, first - keep);
    const unloadEnd = Math.min(this.pageCount - 1, last + keep);
    return { start, end, unloadStart, unloadEnd };
  }

  onScroll(force) {
    if (this._scrollPending && !force) return;
    this._scrollPending = true;
    requestAnimationFrame(() => {
      this._scrollPending = false;
      this._updateOnScroll();
    });
  }

  _updateOnScroll() {
    const container = document.getElementById('pdfViewerScroll');
    if (!container) return;
    const range = this._visiblePageRange();
    if (!range) return;

    let topPage = 1;
    const scrollTop = container.scrollTop;
    for (let i = 0; i < this.slots.length; i++) {
      if (this._pageOffsets[i] <= scrollTop + 2) {
        topPage = i + 1;
      } else {
        break;
      }
    }
    if (topPage !== this.pageNum) {
      this.pageNum = topPage;
      document.getElementById('pdfPageNum').textContent = topPage;
    }
    document.getElementById('pdfPageCount').textContent = this.pageCount;
    document.getElementById('pdfZoomInfo').textContent = Math.round(this.scale * 100) + '%';

    for (let i = range.start; i <= range.end; i++) {
      const num = i + 1;
      if (!this.rendered.has(num)) {
        this.renderScrollPage(num);
      }
    }
    for (let i = 0; i < range.unloadStart; i++) {
      this._unloadScrollPage(i + 1);
    }
    for (let i = range.unloadEnd + 1; i < this.pageCount; i++) {
      this._unloadScrollPage(i + 1);
    }
  }

  _unloadScrollPage(num) {
    if (!this.rendered.has(num)) return;
    const slot = this.slots[num - 1];
    if (!slot) return;
    const canvas = slot.querySelector('.pdf-scroll-canvas');
    const layerEl = slot.querySelector('.pdf-scroll-layer');
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
    if (layerEl) layerEl.innerHTML = '';
    this.rendered.delete(num);
  }

  async prevPage() {
    if (this.pageNum > 1) {
      this._scrollToPage(this.pageNum - 1);
    }
  }

  async nextPage() {
    if (this.pageNum < this.pageCount) {
      this._scrollToPage(this.pageNum + 1);
    }
  }

  _scrollToPage(num) {
    const container = document.getElementById('pdfViewerScroll');
    if (!container || this._pageOffsets[num - 1] === undefined) return;
    container.scrollTop = this._pageOffsets[num - 1];
    this.pageNum = num;
    document.getElementById('pdfPageNum').textContent = num;
  }

  async zoomBy(factor) {
    this.scale = Math.min(Math.max(this.scale * factor, 0.1), 10);
    const container = document.getElementById('pdfViewerScroll');
    let anchorPage = this.pageNum;
    let anchorOffset = 0;
    if (container && this._pageOffsets[anchorPage - 1] !== undefined) {
      anchorOffset = container.scrollTop - this._pageOffsets[anchorPage - 1];
    }
    await this._resizeScrollSlots();
    this._buildPageOffsets();
    if (container && this._pageOffsets[anchorPage - 1] !== undefined) {
      container.scrollTop = this._pageOffsets[anchorPage - 1] + anchorOffset;
    }
    this.onScroll(true);
  }

  async _resizeScrollSlots() {
    for (let i = 1; i <= this.pageCount; i++) {
      const baseVp = this._viewports[i - 1];
      if (!baseVp) continue;
      const slot = this.slots[i - 1];
      if (!slot) continue;
      const ratio = this.scale / baseVp.scale;
      slot.style.height = (baseVp.height * ratio) + 'px';
      slot.style.width = (baseVp.width * ratio) + 'px';
    }
    this._generation++;
    this.rendered.clear();
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
    this.rendered.clear();
    this.slots = [];
    this._pageOffsets = [];
    this._viewports = [];
    this._generation++;
    const pagesEl = document.getElementById('pdfPages');
    if (pagesEl) {
      pagesEl.innerHTML = '';
      pagesEl.style.display = 'none';
    }
  }
}

const readerMode = new ReaderMode();
