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
    const ctx = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    canvas.style.width = viewport.width + 'px';
    canvas.style.height = viewport.height + 'px';

    const renderContext = { canvasContext: ctx, viewport };
    await page.render(renderContext).promise;

    document.getElementById('pdfPageNum').textContent = num;
    document.getElementById('pdfPageCount').textContent = this.pageCount;
    document.getElementById('pdfZoomInfo').textContent = Math.round(this.scale * 100) + '%';
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
    const maxW = container.clientWidth - 32;
    if (vp.width > maxW) {
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
  }
}

const readerMode = new ReaderMode();
