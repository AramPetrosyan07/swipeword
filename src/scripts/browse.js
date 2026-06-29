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
