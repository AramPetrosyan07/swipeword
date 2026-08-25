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
    if (clickedPage > 0 && clickedEl) {
      const layer = clickedEl.closest('.pdf-scroll-layer');
      if (layer) {
        const allWords = Array.from(layer.querySelectorAll('.rw-word'));
        const clickedIdx = allWords.indexOf(clickedEl);
        const pageSents = sentences.filter(s => s.page === clickedPage);
        let acc = 0;
        for (const s of pageSents) {
          const wordCount = s.text.split(/\s+/).length;
          if (clickedIdx >= acc && clickedIdx < acc + wordCount) {
            return sentences.indexOf(s);
          }
          acc += wordCount;
        }
        if (pageSents.length > 0) {
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
    }
    const clean = wordText.replace(/[^\w]/g, '').toLowerCase();
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
    const first = sentWords[0].replace(/[^\w]/g, '').toLowerCase();
    let startIdx = -1;
    for (let i = 0; i < words.length; i++) {
      if ((words[i].dataset.word || words[i].textContent).replace(/[^\w]/g, '').toLowerCase() === first) {
        startIdx = i;
        break;
      }
    }
    if (startIdx === -1) return;
    let matchCount = 0;
    for (let i = startIdx; i < words.length && matchCount < sentWords.length; i++) {
      words[i].classList.add('pdf-read-aloud-active');
      matchCount++;
    }
    const activeEl = words[startIdx];
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
    // Stop any currently playing audio before restarting
    if (this._readAloudAudio) {
      this._readAloudAudio.pause();
      this._readAloudAudio = null;
    }
    this._readAloudActive = false;
    this._readAloudLang = lang || 'en';
    this._readAloudVoiceId = voiceId || 0;
    this._readAloudSpeed = speed || 1;
    this._readAloudSentences = await this._extractAllSentences();
    if (!this._readAloudSentences.length) return;
    this._readAloudIdx = this._findSentenceForWord(wordText, this._readAloudSentences, clickedPage, clickedEl);
    this._readAloudActive = true;
    this._readAloudPaused = false;
    this._readAloudSpeakCurrent();
  }

  async _readAloudSpeakCurrent() {
    if (!this._readAloudActive || this._readAloudPaused) return;
    if (this._readAloudIdx >= this._readAloudSentences.length) {
      this.readAloudStop();
      return;
    }
    const sent = this._readAloudSentences[this._readAloudIdx];
    this._highlightReadAloudSentence(this._readAloudIdx);
    const container = document.getElementById('pdfViewerScroll');
    const slot = this.slots[sent.page - 1];
    if (container && slot) {
      const slotTop = slot.offsetTop;
      const slotH = slot.offsetHeight;
      const viewH = container.clientHeight;
      if (slotTop < container.scrollTop || slotTop + slotH > container.scrollTop + viewH) {
        container.scrollTo({ top: slotTop - 40, behavior: 'smooth' });
      }
    }
    try {
      const result = await window.electronAPI.ttsSpeak(sent.text, this._readAloudLang, this._readAloudVoiceId);
      if (!this._readAloudActive || this._readAloudPaused) return;
      if (result && result.success) {
        const audio = new Audio('data:audio/mpeg;base64,' + result.audio);
        audio.playbackRate = this._readAloudSpeed || 1;
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
    if (!this._readAloudActive || this._readAloudPaused) return;
    this._readAloudIdx++;
    this._readAloudSpeakCurrent();
  }

  readAloudPause() {
    if (!this._readAloudActive) return;
    this._readAloudPaused = true;
    if (this._readAloudAudio) {
      this._readAloudAudio.pause();
      this._readAloudAudio = null;
    }
  }

  readAloudResume() {
    if (!this._readAloudActive || !this._readAloudPaused) return;
    this._readAloudPaused = false;
    this._readAloudSpeakCurrent();
  }

  readAloudStop() {
    this._readAloudActive = false;
    this._readAloudPaused = false;
    this._readAloudIdx = 0;
    this._readAloudSentences = [];
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
}

const readerMode = new ReaderMode();
