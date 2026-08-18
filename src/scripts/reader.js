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
    this._renderQueue = Promise.resolve();
  }

  async loadPdf(data) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf/pdf.worker.min.js';
    this.pdfDoc = await pdfjsLib.getDocument({ data }).promise;
    await this._setupDoc();
  }

  async loadPdfDoc(doc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf/pdf.worker.min.js';
    this.pdfDoc = doc;
    await this._setupDoc();
  }

  async _setupDoc() {
    if (!this.pdfDoc) return;
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
    const pages = await Promise.all(
      Array.from({ length: this.pageCount }, (_, i) => this.pdfDoc.getPage(i + 1))
    );
    const frag = document.createDocumentFragment();
    for (let i = 0; i < pages.length; i++) {
      const viewport = pages[i].getViewport({ scale });
      this._viewports.push(viewport);

      const slot = document.createElement('div');
      slot.className = 'pdf-scroll-page';
      slot.dataset.page = i + 1;
      slot.style.height = viewport.height + 'px';
      slot.style.width = viewport.width + 'px';

      const canvas = document.createElement('canvas');
      canvas.className = 'pdf-scroll-canvas';
      slot.appendChild(canvas);

      const layer = document.createElement('div');
      layer.className = 'pdf-scroll-layer';
      slot.appendChild(layer);

      frag.appendChild(slot);
      this.slots.push(slot);
    }
    container.appendChild(frag);
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
    const task = this._renderQueue.then(() => {
      if (gen !== this._generation) return;
      if (this.rendered.has(num)) return;
      if (!this._isNearVisible(num)) return;
      return this.renderPageTo(canvas, layerEl, num, gen).then(() => {
        if (gen === this._generation) {
          this.rendered.add(num);
        }
      });
    }).catch(() => {});
    this._renderQueue = task;
    return task;
  }

  _isNearVisible(num) {
    const range = this._visiblePageRange();
    if (!range) return true;
    const i = num - 1;
    return i >= range.unloadStart && i <= range.unloadEnd;
  }

  async renderPageTo(canvas, layerEl, num, gen) {
    const page = await this.pdfDoc.getPage(num);
    if (gen !== this._generation) return;
    const viewport = page.getViewport({ scale: this.scale });

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
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
      layerEl.style.width = viewport.width + 'px';
      layerEl.style.height = viewport.height + 'px';
      layerEl.style.setProperty('--scale-factor', this.scale);
      const content = await page.getTextContent();
      if (gen !== this._generation) return;
      if (!content.items || content.items.length === 0) {
        layerEl.style.display = 'none';
        return;
      }
      const task = pdfjsLib.renderTextLayer({
        textContentSource: content,
        container: layerEl,
        viewport,
      });
      await task.promise;
      if (gen !== this._generation) return;
      this._splitTextIntoWordsFromItems(layerEl, content.items);
    } catch (e) {
      console.warn('Text render failed:', e);
      if (layerEl) layerEl.style.display = 'none';
    }
  }

  _splitTextIntoWordsFromItems(layerEl, items) {
    layerEl.querySelectorAll('br').forEach((br) => br.remove());
    const textDivs = layerEl.querySelectorAll('span[role="presentation"]');
    for (const div of textDivs) {
      const text = div.textContent;
      if (!text) continue;
      if (div.dir === 'rtl' || /rotate\(/.test(div.style.transform || '')) {
        this._splitDivInline(div, text);
        continue;
      }
      const fontSize = this._divFontSize(div);
      const family = div.style.fontFamily;
      const weight = div.style.fontWeight || 'normal';
      const style = div.style.fontStyle || 'normal';
      const stretch = div.style.fontStretch || 'normal';
      if (!isFinite(fontSize) || fontSize <= 0 || !family) {
        this._splitDivInline(div, text);
        continue;
      }
      const ctx = this._getMeasureCtx();
      ctx.font = `${style} ${weight} ${stretch} ${fontSize}px ${family}`;
      let m0;
      try {
        m0 = ctx.measureText('');
      } catch (e) {
        this._splitDivInline(div, text);
        continue;
      }
      const asc0 = m0.fontBoundingBoxAscent || 0;
      const desc0 = Math.abs(m0.fontBoundingBoxDescent) || 0;
      if (asc0 + desc0 <= 0) {
        this._splitDivInline(div, text);
        continue;
      }
      const baseline = (fontSize * asc0) / (asc0 + desc0);
      let cursor = 0;
      const frag = document.createDocumentFragment();
      for (const token of text.split(/(\s+)/)) {
        if (token === '') continue;
        let m;
        try {
          m = ctx.measureText(token);
        } catch (e) {
          m = null;
        }
        if (!m) {
          this._splitDivInline(div, text);
          cursor = -1;
          break;
        }
        const width = m.width || 0;
        if (/^\s+$/.test(token)) {
          cursor += width;
          continue;
        }
        let ba = m.actualBoundingBoxAscent;
        let bd = m.actualBoundingBoxDescent;
        if (typeof ba !== 'number' || typeof bd !== 'number' || !(ba + Math.abs(bd) > 0)) {
          this._splitDivInline(div, text);
          cursor = -1;
          break;
        }
        bd = Math.abs(bd);
        const left = m.actualBoundingBoxLeft || 0;
        const right = m.actualBoundingBoxRight || 0;
        const visualWidth = right - left;
        const span = document.createElement('span');
        span.className = 'rw-word';
        span.dataset.word = token;
        span.textContent = token;
        span.style.position = 'absolute';
        span.style.left = (cursor + left) + 'px';
        span.style.top = (baseline - ba) + 'px';
        span.style.width = visualWidth + 'px';
        span.style.height = (ba + bd) + 'px';
        frag.appendChild(span);
        cursor += width;
      }
      if (cursor < 0) continue;
      div.textContent = '';
      div.appendChild(frag);
    }
  }

  _getMeasureCtx() {
    if (!this._measureCtx) {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      this._measureCtx = canvas.getContext('2d', { alpha: false });
    }
    return this._measureCtx;
  }

  _divFontSize(div) {
    const raw = div.style.fontSize;
    if (raw) {
      if (raw.startsWith('calc(')) {
        const m = raw.match(/calc\(var\(--scale-factor\)\*([\d.]+)px\)/);
        if (m) return parseFloat(m[1]) * this.scale;
        const m2 = raw.match(/([\d.]+)px/);
        if (m2) return parseFloat(m2[1]);
      }
      const v = parseFloat(raw);
      if (isFinite(v)) return v;
    }
    return parseFloat(getComputedStyle(div).fontSize);
  }

  _splitDivInline(div, text) {
    const frag = document.createDocumentFragment();
    const re = /\S+/g;
    let lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      if (m.index > lastIndex) {
        frag.appendChild(document.createTextNode(text.slice(lastIndex, m.index)));
      }
      const span = document.createElement('span');
      span.className = 'rw-word';
      span.dataset.word = m[0];
      span.textContent = m[0];
      frag.appendChild(span);
      lastIndex = m.index + m[0].length;
    }
    if (lastIndex < text.length) {
      frag.appendChild(document.createTextNode(text.slice(lastIndex)));
    }
    div.textContent = '';
    div.appendChild(frag);
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

  async fitToWidth() {
    if (!this.pdfDoc) return;
    const container = document.getElementById('pdfViewerScroll');
    const anchorPage = this.pageNum;
    let anchorOffset = 0;
    if (container && this._pageOffsets[anchorPage - 1] !== undefined) {
      anchorOffset = container.scrollTop - this._pageOffsets[anchorPage - 1];
    }
    await this._fitWidth();
    await this._resizeScrollSlots();
    this._buildPageOffsets();
    if (container && this._pageOffsets[anchorPage - 1] !== undefined) {
      container.scrollTop = this._pageOffsets[anchorPage - 1] + anchorOffset;
    }
    this.onScroll(true);
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
    this._renderQueue = Promise.resolve();
    const pagesEl = document.getElementById('pdfPages');
    if (pagesEl) {
      pagesEl.innerHTML = '';
      pagesEl.style.display = 'none';
    }
  }
}

const readerMode = new ReaderMode();
