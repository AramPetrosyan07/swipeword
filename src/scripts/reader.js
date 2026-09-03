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
    this._readAloudToken = 0;
    this._readAloudClickedPage = 0;
    this._readAloudClickedIdx = -1;
    this._readAloudQueued = null;
  }

  async loadPdf(data) {
    await window._ensurePdfJs();
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf/pdf.worker.min.js';
    this.pdfDoc = await pdfjsLib.getDocument({ data }).promise;
    await this._setupDoc();
  }

  async loadPdfDoc(doc) {
    await window._ensurePdfJs();
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

      const pageBadge = document.createElement('div');
      pageBadge.className = 'pdf-page-badge';
      pageBadge.textContent = i + 1;
      slot.appendChild(pageBadge);

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
      this._splitTextIntoWordsFromItems(layerEl, content.items, num);
      this.applyAnnotationsToPage(layerEl, num);
    } catch (e) {
      console.warn('Text render failed:', e);
      if (layerEl) layerEl.style.display = 'none';
    }
  }

  _splitTextIntoWordsFromItems(layerEl, items, pageNum) {
    layerEl.querySelectorAll('br').forEach((br) => br.remove());
    const textDivs = layerEl.querySelectorAll('span[role="presentation"]');
    let wordIndex = 0;
    for (const div of textDivs) {
      const text = div.textContent;
      if (!text) continue;
      if (div.dir === 'rtl' || /rotate\(/.test(div.style.transform || '')) {
        wordIndex = this._splitDivInline(div, text, pageNum, wordIndex);
        continue;
      }
      const fontSize = this._divFontSize(div);
      const family = div.style.fontFamily;
      const weight = div.style.fontWeight || 'normal';
      const style = div.style.fontStyle || 'normal';
      const stretch = div.style.fontStretch || 'normal';
      if (!isFinite(fontSize) || fontSize <= 0 || !family) {
        wordIndex = this._splitDivInline(div, text, pageNum, wordIndex);
        continue;
      }
      const ctx = this._getMeasureCtx();
      ctx.font = `${style} ${weight} ${stretch} ${fontSize}px ${family}`;
      let m0;
      try {
        m0 = ctx.measureText('');
      } catch (e) {
        wordIndex = this._splitDivInline(div, text, pageNum, wordIndex);
        continue;
      }
      const asc0 = m0.fontBoundingBoxAscent || 0;
      const desc0 = Math.abs(m0.fontBoundingBoxDescent) || 0;
      if (asc0 + desc0 <= 0) {
        wordIndex = this._splitDivInline(div, text, pageNum, wordIndex);
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
          wordIndex = this._splitDivInline(div, text, pageNum, wordIndex);
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
          wordIndex = this._splitDivInline(div, text, pageNum, wordIndex);
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
        span.dataset.page = pageNum || '';
        span.dataset.widx = wordIndex++;
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

  _splitDivInline(div, text, pageNum, startIdx = 0) {
    let wordIndex = startIdx;
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
      span.dataset.page = pageNum || '';
      span.dataset.widx = wordIndex++;
      span.textContent = m[0];
      frag.appendChild(span);
      lastIndex = m.index + m[0].length;
    }
    if (lastIndex < text.length) {
      frag.appendChild(document.createTextNode(text.slice(lastIndex)));
    }
    div.textContent = '';
    div.appendChild(frag);
    return wordIndex;
  }

  _getActiveDocKey() {
    if (typeof app !== 'undefined' && app._readSourceInfo && app._readSourceInfo.title) {
      return app._readSourceInfo.title;
    }
    if (typeof app !== 'undefined' && app._pdfTabs && app._pdfTabs[app._pdfActiveTab]) {
      const t = app._pdfTabs[app._pdfActiveTab];
      return t.path || t.name;
    }
    return null;
  }

  applyAnnotationsToPage(layerEl, pageNum) {
    if (!layerEl || typeof appStore === 'undefined') return;
    const docKey = this._getActiveDocKey();
    if (!docKey) return;
    const annots = appStore.getPdfAnnotations(docKey);
    const p = String(pageNum);
    const words = layerEl.querySelectorAll('.rw-word');
    words.forEach(w => {
      const widx = w.dataset.widx;
      const key = `${p}_${widx}`;
      const a = annots[key];
      // clear existing annotation classes and inline styles
      w.classList.remove(
        'annot-highlight-yellow', 'annot-highlight-green', 'annot-highlight-blue', 'annot-highlight-pink',
        'annot-highlight-purple', 'annot-highlight-orange',
        'annot-underline', 'annot-underline-wavy', 'annot-has-note'
      );
      w.style.backgroundColor = '';
      w.style.textDecoration = '';
      w.style.textDecorationColor = '';
      w.style.textDecorationStyle = '';
      w.style.textDecorationThickness = '';
      w.style.textUnderlineOffset = '';
      w.removeAttribute('data-annot-note');

      if (a) {
        if (a.color) {
          if (a.color.startsWith('#') || a.color.startsWith('rgb')) {
            w.style.backgroundColor = this._colorWithAlpha(a.color, 0.45);
            w.style.borderRadius = '2px';
          } else {
            w.classList.add(`annot-highlight-${a.color}`);
          }
        }
        if (a.underline) {
          const uColor = a.underlineColor || '#2196f3';
          w.style.textDecoration = 'underline';
          w.style.textDecorationColor = uColor;
          w.style.textDecorationStyle = a.underline === 'wavy' ? 'wavy' : 'solid';
          w.style.textDecorationThickness = '2px';
          w.style.textUnderlineOffset = '3px';
        }
        if (a.note && a.note.trim()) {
          w.classList.add('annot-has-note');
          w.setAttribute('data-annot-note', a.note.trim());
        }
      }
    });
  }

  _colorWithAlpha(color, alpha) {
    if (color.startsWith('#')) {
      let hex = color.slice(1);
      if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
      const r = parseInt(hex.slice(0, 2), 16) || 0;
      const g = parseInt(hex.slice(2, 4), 16) || 0;
      const b = parseInt(hex.slice(4, 6), 16) || 0;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return color;
  }

  _parseRgb01(color) {
    if (!color) return { r: 1, g: 0.9, b: 0.2 };
    let hex = color;
    if (hex.startsWith('#')) hex = hex.slice(1);
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const r = (parseInt(hex.slice(0, 2), 16) || 255) / 255;
    const g = (parseInt(hex.slice(2, 4), 16) || 255) / 255;
    const b = (parseInt(hex.slice(4, 6), 16) || 0) / 255;
    return { r, g, b };
  }

  async exportAnnotatedPdf(rawBuffer) {
    await window._ensurePdfLib();
    const { PDFDocument, rgb } = window.PDFLib;
    const pdfDoc = await PDFDocument.load(rawBuffer, { ignoreEncryption: true });
    const docKey = this._getActiveDocKey();
    if (!docKey || typeof appStore === 'undefined') {
      return await pdfDoc.save();
    }
    const annots = appStore.getPdfAnnotations(docKey);
    const totalPages = pdfDoc.getPageCount();

    for (let pNum = 1; pNum <= totalPages; pNum++) {
      const pageIndex = pNum - 1;
      const prefix = `${pNum}_`;
      const pageAnnotKeys = Object.keys(annots).filter(k => k.startsWith(prefix));
      if (!pageAnnotKeys.length) continue;

      const page = pdfDoc.getPage(pageIndex);
      const { width: pWidth, height: pHeight } = page.getSize();
      
      const jsPage = this.pdfDoc ? await this.pdfDoc.getPage(pNum) : null;
      if (!jsPage) continue;
      const vp = jsPage.getViewport({ scale: this.scale || 1 });
      const scaleX = pWidth / vp.width;
      const scaleY = pHeight / vp.height;

      const slot = this.slots[pageIndex];
      let layer = slot ? slot.querySelector('.pdf-scroll-layer') : null;

      // If page was offscreen/unrendered, render text layer temporarily
      let tempLayer = null;
      if (!layer || !layer.querySelector('.rw-word')) {
        tempLayer = document.createElement('div');
        tempLayer.className = 'pdf-scroll-layer';
        tempLayer.style.position = 'absolute';
        tempLayer.style.left = '0';
        tempLayer.style.top = '0';
        tempLayer.style.visibility = 'hidden';
        tempLayer.style.width = vp.width + 'px';
        tempLayer.style.height = vp.height + 'px';
        tempLayer.style.setProperty('--scale-factor', this.scale || 1);
        document.body.appendChild(tempLayer);
        const content = await jsPage.getTextContent();
        if (content && content.items && content.items.length > 0) {
          const task = pdfjsLib.renderTextLayer({
            textContentSource: content,
            container: tempLayer,
            viewport: vp,
          });
          await task.promise;
          this._splitTextIntoWordsFromItems(tempLayer, content.items, pNum);
          layer = tempLayer;
        }
      }

      if (!layer) continue;
      const wordEls = layer.querySelectorAll('.rw-word');
      
      const layerRect = layer.getBoundingClientRect();

      wordEls.forEach(w => {
        const widx = w.dataset.widx;
        const a = annots[`${pNum}_${widx}`];
        if (!a) return;

        const wRect = w.getBoundingClientRect();
        const widthPx = wRect.width || parseFloat(w.style.width) || 0;
        const heightPx = wRect.height || parseFloat(w.style.height) || 0;
        if (widthPx <= 0 || heightPx <= 0) return;

        const totalLeftPx = wRect.left - layerRect.left;
        const totalTopPx = wRect.top - layerRect.top;

        const pdfX = totalLeftPx * scaleX;
        const pdfY = pHeight - ((totalTopPx + heightPx) * scaleY);
        const pdfW = widthPx * scaleX;
        const pdfH = heightPx * scaleY;

        if (a.color) {
          const c = this._parseRgb01(a.color);
          try {
            page.drawRectangle({
              x: Math.max(0, pdfX),
              y: Math.max(0, pdfY),
              width: Math.min(pWidth, pdfW),
              height: Math.min(pHeight, pdfH),
              color: rgb(c.r, c.g, c.b),
              opacity: 0.4,
            });
          } catch (err) {
            console.warn('Could not draw rectangle annotation:', err);
          }
        }

        if (a.underline) {
          const uc = this._parseRgb01(a.underlineColor || '#2196f3');
          const underlineY = Math.max(0, pdfY - 1.5);
          try {
            page.drawLine({
              start: { x: Math.max(0, pdfX), y: underlineY },
              end: { x: Math.min(pWidth, pdfX + pdfW), y: underlineY },
              thickness: 1.5,
              color: rgb(uc.r, uc.g, uc.b),
              opacity: 0.85,
            });
          } catch (err) {
            console.warn('Could not draw line annotation:', err);
          }
        }
      });

      if (tempLayer && tempLayer.parentNode) {
        tempLayer.parentNode.removeChild(tempLayer);
      }
    }

    return await pdfDoc.save();
  }

  refreshAllAnnotations() {
    const layers = document.querySelectorAll('#pdfPages .pdf-scroll-layer');
    layers.forEach(layer => {
      const slot = layer.closest('.pdf-scroll-page');
      const page = slot ? parseInt(slot.dataset.page, 10) : 1;
      this.applyAnnotationsToPage(layer, page);
    });
  }

  getPageText(num) {
    if (!this.pdfDoc) return Promise.resolve('');
    return this.pdfDoc.getPage(num).then(page =>
      page.getTextContent().then(content =>
        content.items.map(item => item.str).join(' ')
      )
    ).catch(() => '');
  }

  async detectSourceLang(samplePages) {
    if (!this.pdfDoc) return '';
    const pages = Math.min(samplePages || 3, this.pageCount);
    let sample = '';
    for (let i = 1; i <= pages; i++) {
      sample += await this.getPageText(i);
      if (/[\u0530-\u058F]/.test(sample) || /[\u0400-\u04FF]/.test(sample)) break;
    }
    if (!sample) return '';
    const hy = (sample.match(/[\u0530-\u058F]/g) || []).length;
    const ru = (sample.match(/[\u0400-\u04FF]/g) || []).length;
    const latin = (sample.match(/[A-Za-z]/g) || []).length;
    if (ru >= hy && ru >= latin) return 'ru';
    if (hy >= ru && hy >= latin) return 'hy';
    return 'en';
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

  async gotoPage(num) {
    this._scrollToPage(num);
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

  async zoomIn5() {
    this.scale = Math.min(Math.max(Math.round((this.scale + 0.05) * 100) / 100, 0.1), 10);
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

  async zoomOut5() {
    this.scale = Math.min(Math.max(Math.round((this.scale - 0.05) * 100) / 100, 0.1), 10);
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
    this._readAloudToken++;
    this._readAloudClickedPage = 0;
    this._readAloudClickedIdx = -1;
    this._readAloudQueued = null;
    const pagesEl = document.getElementById('pdfPages');
    if (pagesEl) {
      pagesEl.innerHTML = '';
      pagesEl.style.display = 'none';
    }
    this.readAloudStop();
  }

  async _extractAllSentences() {
    if (!this.pdfDoc) return [];
    const sentences = [];
    for (let i = 1; i <= this.pageCount; i++) {
      const text = await this.getPageText(i);
      if (!text) continue;
      const pageStart = sentences.length;
      const parts = text.split(/(?<=[.!?])\s+/);
      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed) sentences.push({ text: trimmed, page: i, pageStart });
      }
    }
    return sentences;
  }

  _findSentenceForWord(wordText, sentences, clickedPage, clickedEl) {
    let clickedIdx = -1;
    let layer = null;
    if (clickedPage > 0 && clickedEl) {
      if (this._readAloudClickedIdx >= 0) {
        clickedIdx = this._readAloudClickedIdx;
      } else {
        layer = clickedEl.closest ? clickedEl.closest('.pdf-scroll-layer') : null;
        if (layer) {
          const words = Array.from(layer.querySelectorAll('.rw-word'));
          clickedIdx = words.indexOf(clickedEl);
        }
      }
    }
    if (clickedPage > 0 && clickedIdx >= 0) {
      const pageSents = sentences.filter(s => s.page === clickedPage);
      if (pageSents.length > 0) {
        let acc = 0;
        for (const s of pageSents) {
          const wordCount = s.text.split(/\s+/).length;
          if (clickedIdx >= acc && clickedIdx < acc + wordCount) {
            return sentences.indexOf(s);
          }
          acc += wordCount;
        }
        let best = 0;
        let bestDist = Infinity;
        acc = 0;
        for (let i = 0; i < pageSents.length; i++) {
          const mid = acc + Math.floor(pageSents[i].text.split(/\s+/).length / 2);
          const dist = Math.abs(clickedIdx - mid);
          if (dist < bestDist) { bestDist = dist; best = i; }
          acc += pageSents[i].text.split(/\s+/).length;
        }
        return sentences.indexOf(pageSents[best]);
      }
    }
    if (clickedPage > 0 && sentences.length) {
      let best = 0;
      let bestPd = Infinity;
      for (let i = 0; i < sentences.length; i++) {
        const pd = Math.abs(sentences[i].page - clickedPage);
        if (pd < bestPd) { bestPd = pd; best = i; }
      }
      return best;
    }
    const clean = wordText ? wordText.replace(/[^\w]/g, '').toLowerCase() : '';
    let lastMatch = -1;
    for (let i = 0; i < sentences.length; i++) {
      if (sentences[i].text.toLowerCase().includes(clean)) lastMatch = i;
    }
    return lastMatch >= 0 ? lastMatch : 0;
  }

  _highlightReadAloudSentence(idx) {
    document.querySelectorAll('.pdf-read-aloud-active').forEach(el => el.classList.remove('pdf-read-aloud-active'));
    if (idx < 0 || !this.slots.length) return;
    const sent = this._readAloudSentences[idx];
    if (!sent) return;
    const slot = this.slots[sent.page - 1];
    if (!slot) return;
    const layer = slot.querySelector('.pdf-scroll-layer');
    if (!layer) return;
    const words = layer.querySelectorAll('.rw-word');
    const sentWords = sent.text.split(/\s+/);
    if (!sentWords.length) return;
    // Map the sentence to its word offset within the page using the same
    // per-page word counts that determine the reading position, so the
    // underline always lands on the sentence actually being spoken.
    let startIdx = 0;
    for (let i = 0; i < idx; i++) {
      const s = this._readAloudSentences[i];
      if (s.page === sent.page) startIdx += s.text.split(/\s+/).length;
    }
    const highlightStart = startIdx;
    const wordCount = sentWords.length;
    let matchCount = 0;
    for (let i = highlightStart; i < words.length && matchCount < wordCount; i++) {
      words[i].classList.add('pdf-read-aloud-active');
      matchCount++;
    }
    const activeEl = words[highlightStart];
    if (activeEl) {
      const container = document.getElementById('pdfViewerScroll');
      if (container) {
        const elTop = activeEl.getBoundingClientRect().top + container.scrollTop;
        const viewH = container.clientHeight;
        if (elTop < container.scrollTop + 60 || elTop > container.scrollTop + viewH - 60) {
          container.scrollTo({ top: elTop - 80, behavior: 'smooth' });
        }
      }
    }
  }

  async readAloudStart(wordText, lang, voiceId, speed, clickedPage, clickedEl) {
    if (!this.pdfDoc) return;
    // Invalidate any previously running speech session so only one can be active.
    const token = ++this._readAloudToken;
    this._readAloudQueued = null;
    this._readAloudActive = false;
    this._readAloudPaused = false;
    this._readAloudLang = lang || 'en';
    this._readAloudVoiceId = voiceId || 0;
    this._readAloudSpeed = speed || 1;
    this._readAloudClickedPage = clickedPage || 0;
    this._readAloudClickedIdx = -1;
    if (clickedEl && clickedPage > 0) {
      const layer = clickedEl.closest ? clickedEl.closest('.pdf-scroll-layer') : null;
      if (layer) {
        const idx = Array.from(layer.querySelectorAll('.rw-word')).indexOf(clickedEl);
        if (idx >= 0) this._readAloudClickedIdx = idx;
      }
    }
    if (this._readAloudAudio) {
      this._readAloudAudio.pause();
      this._readAloudAudio = null;
    }
    this._readAloudSentences = await this._extractAllSentences();
    if (!this._readAloudSentences.length) return;
    if (token !== this._readAloudToken) return;
    this._readAloudIdx = this._findSentenceForWord(wordText, this._readAloudSentences, this._readAloudClickedPage, clickedEl);
    this._readAloudStartIdx = this._readAloudIdx;
    this._readAloudClickedEl = clickedEl;
    this._readAloudActive = true;
    this._readAloudPaused = false;
    this._readAloudSpeakCurrent(token);
  }

  async _readAloudSpeakCurrent(token) {
    if (token !== this._readAloudToken || !this._readAloudActive || this._readAloudPaused) return;
    if (this._readAloudIdx >= this._readAloudSentences.length) {
      this.readAloudStop();
      return;
    }
    const sent = this._readAloudSentences[this._readAloudIdx];
    this._highlightReadAloudSentence(this._readAloudIdx);

    // Use the audio that was prefetched while the previous sentence was playing,
    // or generate the current sentence's audio now for the very first sentence.
    const currentPromise =
      this._readAloudQueued ||
      window.electronAPI.ttsSpeak(sent.text, this._readAloudLang, this._readAloudVoiceId);
    this._readAloudQueued = null;

    // Look ahead: start generating the NEXT sentence's audio while the current
    // one is retrieved/played, so the next one is ready and playback is gapless.
    const next = this._readAloudSentences[this._readAloudIdx + 1];
    if (next) {
      this._readAloudQueued = window.electronAPI
        .ttsSpeak(next.text, this._readAloudLang, this._readAloudVoiceId)
        .catch(() => null);
    }

    try {
      const result = await currentPromise;
      if (token !== this._readAloudToken || !this._readAloudActive || this._readAloudPaused) return;
      if (result && result.success) {
        const audio = new Audio('data:audio/mpeg;base64,' + result.audio);
        audio.playbackRate = this._readAloudSpeed || 1;
        if (token !== this._readAloudToken || !this._readAloudActive || this._readAloudPaused) {
          audio.pause();
          return;
        }
        this._readAloudAudio = audio;
        await new Promise((resolve) => {
          audio.onended = resolve;
          audio.onerror = resolve;
          audio.play().catch(resolve);
        });
        this._readAloudAudio = null;
      }
    } catch (e) {
      console.warn('Read aloud TTS failed:', e);
    }
    if (token !== this._readAloudToken || !this._readAloudActive || this._readAloudPaused) return;
    this._readAloudIdx++;
    this._readAloudSpeakCurrent(token);
  }

  readAloudPause() {
    if (!this._readAloudActive) return;
    this._readAloudPaused = true;
    if (this._readAloudAudio) {
      this._readAloudAudio.pause();
    }
  }

  readAloudResume() {
    if (!this._readAloudActive || !this._readAloudPaused) return;
    this._readAloudPaused = false;
    // Resume the same audio element from its paused position so playback
    // continues; the pending speak promise resolves when it ends naturally.
    const audio = this._readAloudAudio;
    if (audio && !audio.ended) {
      audio.play().catch(() => {});
      return;
    }
    this._readAloudAudio = null;
    this._readAloudSpeakCurrent(this._readAloudToken);
  }

  readAloudStop() {
    this._readAloudToken++;
    this._readAloudActive = false;
    this._readAloudPaused = false;
    this._readAloudIdx = 0;
    this._readAloudSentences = [];
    this._readAloudStartIdx = 0;
    this._readAloudClickedEl = null;
    this._readAloudQueued = null;
    this._readAloudClickedPage = 0;
    this._readAloudClickedIdx = -1;
    if (this._readAloudAudio) {
      this._readAloudAudio.pause();
      this._readAloudAudio = null;
    }
    document.querySelectorAll('.pdf-read-aloud-active').forEach(el => el.classList.remove('pdf-read-aloud-active'));
  }

  readAloudTogglePause() {
    if (!this._readAloudActive) return false;
    if (this._readAloudPaused) {
      this.readAloudResume();
      return true;
    } else {
      this.readAloudPause();
      return false;
    }
  }

  readAloudSetSpeed(speed) {
    this._readAloudSpeed = speed;
    if (this._readAloudAudio) {
      this._readAloudAudio.playbackRate = speed;
    }
  }

  readAloudSetVoice(voiceId) {
    this._readAloudVoiceId = voiceId || 0;
    if (!this._readAloudActive || this._readAloudPaused) return;
    const token = ++this._readAloudToken;
    this._readAloudQueued = null;
    if (this._readAloudAudio) {
      this._readAloudAudio.pause();
      this._readAloudAudio = null;
    }
    this._readAloudSpeakCurrent(token);
  }
}

const readerMode = new ReaderMode();
