class ReaderMode {
  constructor() {
    this.isOpen = false;
    this.pdfDoc = null;
    this.pageNum = 1;
    this.pageCount = 0;
    this.scale = 1.0;
    this.themeIndex = 0;
    this.themes = ['light', 'sepia', 'dark'];
    this.currentFilePath = null;
    this._canvas = document.getElementById('readerCanvas');
    this._ctx = this._canvas.getContext('2d');
    this._viewport = document.getElementById('readerViewport');
    this._empty = document.getElementById('readerEmpty');
    this._pageInfo = document.getElementById('readerPageInfo');
    this._zoomLevel = document.getElementById('readerZoomLevel');
    this._title = document.getElementById('readerTitle');
    this._textLayer = document.getElementById('readerTextLayer');
  }

  async openFile() {
    try {
      const result = await window.electronAPI.openPDFDialog();
      if (!result) return;
      await this._loadFromPath(result.filePath, result.fileName);
    } catch (e) {
      console.error('Failed to open file:', e);
      alert('Failed to open PDF file');
    }
  }

  async openFileAtPath(filePath) {
    try {
      const fileName = filePath.split('\\').pop().split('/').pop();
      await this._loadFromPath(filePath, fileName);
    } catch (e) {
      console.error('Failed to open file:', e);
      alert('Failed to open PDF file');
    }
  }

  async _loadFromPath(filePath, fileName) {
    const pdfData = await window.electronAPI.readFile(filePath);
    if (!pdfData) {
      alert('Failed to read PDF file');
      return;
    }
    this.currentFilePath = filePath;
    this._title.textContent = fileName;
    this._loadPDF(pdfData);
  }

  async _loadPDF(data) {
    this._empty.style.display = 'none';
    this._viewport.style.display = 'flex';
    if (this._ctx) {
      this._canvas.width = 0;
      this._canvas.height = 0;
    }
    this._textLayer.innerHTML = '';
    this.pdfDoc = null;
    this.pageNum = 1;
    if (typeof pdfjsLib !== 'undefined' && pdfjsLib.version) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js';
      try {
        const loadingTask = pdfjsLib.getDocument({ data: data });
        this.pdfDoc = await loadingTask.promise;
        this.pageCount = this.pdfDoc.numPages;
        this.isOpen = true;
        this._pageInfo.textContent = `1 / ${this.pageCount}`;
        await this._renderPage(1);
      } catch (e) {
        console.error('PDF.js load error:', e);
        this._showPDFNotAvailable();
      }
    } else {
      this._showPDFNotAvailable();
    }
  }

  _showPDFNotAvailable() {
    this._viewport.style.display = 'none';
    this._empty.style.display = 'flex';
    document.querySelector('.reader-empty-title').textContent = 'PDF.js not loaded';
    document.querySelector('.reader-empty-text').textContent = 'Add pdfjs-dist to enable PDF viewing';
  }

  async _renderPage(num) {
    if (!this.pdfDoc) return;
    try {
      const page = await this.pdfDoc.getPage(num);
      const viewport = page.getViewport({ scale: this.scale });
      this._canvas.width = viewport.width;
      this._canvas.height = viewport.height;
      const renderContext = {
        canvasContext: this._ctx,
        viewport: viewport,
      };
      await page.render(renderContext).promise;
      this._pageInfo.textContent = `${num} / ${this.pageCount}`;
      this._zoomLevel.textContent = `${Math.round(this.scale * 100)}%`;
    } catch (e) {
      console.error('Render error:', e);
    }
  }

  prevPage() {
    if (!this.isOpen || this.pageNum <= 1) return;
    this.pageNum--;
    this._renderPage(this.pageNum);
  }

  nextPage() {
    if (!this.isOpen || this.pageNum >= this.pageCount) return;
    this.pageNum++;
    this._renderPage(this.pageNum);
  }

  zoomIn() {
    if (!this.isOpen) return;
    this.scale = Math.min(3, this.scale + 0.25);
    this._renderPage(this.pageNum);
  }

  zoomOut() {
    if (!this.isOpen) return;
    this.scale = Math.max(0.25, this.scale - 0.25);
    this._renderPage(this.pageNum);
  }

  toggleTheme() {
    this.themeIndex = (this.themeIndex + 1) % this.themes.length;
    const theme = this.themes[this.themeIndex];
    document.getElementById('screen-reader').className = 'screen active reader-theme-' + theme;
  }
}

const readerMode = new ReaderMode();
