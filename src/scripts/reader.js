class ReaderMode {
  constructor() {
    this.isOpen = false;
    this.pdfDoc = null;
    this.pageNum = 1;
    this.pageCount = 0;
    this.scale = 1.0;
    this.currentFilePath = null;
    this._canvas = document.getElementById('viewerCanvas');
    this._ctx = null;
    this._container = document.getElementById('viewerContainer');
    this._empty = document.getElementById('viewerEmpty');
    this._textLayer = document.getElementById('viewerTextLayer');
    if (this._canvas) this._ctx = this._canvas.getContext('2d');
  }

  async openFile() {
    try {
      const result = await window.electronAPI.openPDFDialog();
      if (!result) return;
      await this._loadFromPath(result.filePath, result.fileName);
    } catch (e) {
      console.error('Failed to open file:', e);
    }
  }

  async openFileAtPath(filePath) {
    try {
      const fileName = filePath.split('\\').pop().split('/').pop();
      await this._loadFromPath(filePath, fileName);
    } catch (e) {
      console.error('Failed to open file:', e);
    }
  }

  async _loadFromPath(filePath, fileName) {
    const pdfData = await window.electronAPI.readFile(filePath);
    if (!pdfData) {
      alert('Failed to read PDF file');
      return;
    }
    this.currentFilePath = filePath;
    await this._loadPDF(pdfData);
  }

  async _loadPDF(data) {
    if (!this._canvas || !this._container || !this._empty) return;
    this._empty.style.display = 'none';
    this._container.style.display = 'flex';
    const loaded = typeof pdfjsLib !== 'undefined';
    if (!loaded) {
      this._showNotAvailable();
      return;
    }
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js';
      this.pdfDoc = await pdfjsLib.getDocument({ data: data }).promise;
      this.pageCount = this.pdfDoc.numPages;
      this.pageNum = 1;
      this.isOpen = true;
      await this._renderPage(1);
    } catch (e) {
      console.error('PDF render error:', e);
      this._showNotAvailable();
    }
  }

  _showNotAvailable() {
    if (!this._container || !this._empty) return;
    this._container.style.display = 'none';
    this._empty.style.display = 'flex';
  }

  async _renderPage(num) {
    if (!this.pdfDoc || !this._ctx) return;
    try {
      const page = await this.pdfDoc.getPage(num);
      const viewport = page.getViewport({ scale: this.scale });
      this._canvas.width = viewport.width;
      this._canvas.height = viewport.height;
      await page.render({
        canvasContext: this._ctx,
        viewport: viewport,
      }).promise;
    } catch (e) {
      console.error('Render error:', e);
    }
  }
}

const readerMode = new ReaderMode();
