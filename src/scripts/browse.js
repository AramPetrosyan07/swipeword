class FolderBrowser {
  constructor(containerId, backBtnId, pathId, rootDir) {
    this.container = document.getElementById(containerId);
    this.backBtn = document.getElementById(backBtnId);
    this.pathEl = document.getElementById(pathId);
    this.rootDir = rootDir;
    this.currentPath = rootDir;
    this.history = [];
    this.backBtn.addEventListener('click', () => this._goBack());
  }

  async open() {
    this.currentPath = this.rootDir;
    this.history = [];
    await this._load();
  }

  async _navigateTo(dirPath) {
    this.history.push(this.currentPath);
    this.currentPath = dirPath;
    await this._load();
  }

  _goBack() {
    if (this.history.length === 0) return;
    this.currentPath = this.history.pop();
    this._load();
  }

  async _load() {
    const items = await window.electronAPI.readDir(this.currentPath);
    this.pathEl.textContent = this.currentPath;
    if (!items || items.length === 0) {
      this.container.innerHTML = '<div class="fb-empty"><div class="fb-empty-icon">&#128193;</div><span>This folder is empty</span></div>';
      return;
    }
    this.container.innerHTML = '';
    items.forEach((item) => {
      const el = document.createElement('div');
      el.className = 'fb-grid-item';
      const icon = document.createElement('div');
      icon.className = 'fb-grid-icon';
      icon.innerHTML = item.isDirectory ? '&#128193;' : '&#128196;';
      const name = document.createElement('div');
      name.className = 'fb-grid-name';
      name.textContent = item.name;
      el.appendChild(icon);
      el.appendChild(name);
      el.addEventListener('click', () => {
        if (item.isDirectory) {
          this._navigateTo(item.path);
        } else {
          this._openFile(item.path);
        }
      });
      this.container.appendChild(el);
    });
  }

  _openFile(filePath) {
    const ext = filePath.split('.').pop().toLowerCase();
    if (ext === 'pdf') {
      document.querySelectorAll('.reader-page').forEach((p) => p.classList.remove('active'));
      document.getElementById('reader-viewer').classList.add('active');
      document.querySelectorAll('#sidebarReadContent .sidebar-btn').forEach((b) => b.classList.remove('active'));
      const btn = document.querySelector('#sidebarReadContent .sidebar-btn[data-readpage="viewer"]');
      if (btn) btn.classList.add('active');
      if (typeof readerMode !== 'undefined') {
        readerMode.openFileAtPath(filePath);
      }
    }
  }
}

let pinnedFolderBrowser = null;

async function showPinnedFolder() {
  if (!pinnedFolderBrowser) {
    const home = await window.electronAPI.getHomeDir();
    pinnedFolderBrowser = new FolderBrowser('pinnedGrid', 'pinnedBack', 'pinnedPath', home + '\\lecto');
  }
  await pinnedFolderBrowser.open();
}

async function browseOpenPDF() {
  const result = await window.electronAPI.openPDFDialog();
  if (!result) return;
  if (typeof readerMode !== 'undefined') {
    document.querySelectorAll('.reader-page').forEach((p) => p.classList.remove('active'));
    document.getElementById('reader-viewer').classList.add('active');
    document.querySelectorAll('#sidebarReadContent .sidebar-btn').forEach((b) => b.classList.remove('active'));
    const btn = document.querySelector('#sidebarReadContent .sidebar-btn[data-readpage="viewer"]');
    if (btn) btn.classList.add('active');
    await readerMode.openFileAtPath(result.filePath);
  }
}
