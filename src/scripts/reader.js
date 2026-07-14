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
}

const readerMode = new ReaderMode();
