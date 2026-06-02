class ChartsManager {
  constructor() {
    this.dailyCanvas = document.getElementById('chartDailyActivity');
    this.progressCanvas = document.getElementById('chartLearningProgress');
  }

  update() {
    this._drawDailyActivity();
    this._drawLearningProgress();
  }

  _isDark() {
    return document.body.classList.contains('theme-dark');
  }

  _colors() {
    const dark = this._isDark();
    return {
      text: dark ? '#aaa' : '#666',
      grid: dark ? '#2a2a4a' : '#e0e0e0',
      surface: dark ? '#16213e' : '#ffffff',
      remembered: '#4caf50',
      forgotten: '#f44336',
      primary: '#6c63ff',
    };
  }

  _clearCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.clearRect(0, 0, rect.width, rect.height);
    return { ctx, w: rect.width, h: rect.height };
  }

  _drawDailyActivity() {
    const canvas = this.dailyCanvas;
    if (!canvas) return;
    const { ctx, w, h } = this._clearCanvas(canvas);
    const c = this._colors();
    const data = appStore.getDailyActivity(14);
    if (data.length === 0) return this._drawEmptyChart(canvas);

    const pad = { top: 16, bottom: 28, left: 40, right: 16 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;
    const barW = Math.max(4, Math.floor(chartW / data.length * 0.3));
    const gap = Math.floor(chartW / data.length);

    let maxVal = 0;
    data.forEach(d => { if (d.remembered + d.forgotten > maxVal) maxVal = d.remembered + d.forgotten; });
    if (maxVal === 0) maxVal = 5;

    // grid lines
    ctx.strokeStyle = c.grid;
    ctx.lineWidth = 0.5;
    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
      const y = pad.top + (chartH / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();
      ctx.fillStyle = c.text;
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(maxVal - (maxVal / gridLines) * i), pad.left - 6, y + 3);
    }

    // bars
    data.forEach((d, i) => {
      const x = pad.left + gap * i + (gap - barW) / 2;
      const totalH = d.remembered + d.forgotten;
      const scale = chartH / maxVal;

      // remembered bar
      if (d.remembered > 0) {
        const rh = d.remembered * scale;
        ctx.fillStyle = c.remembered;
        ctx.fillRect(x, pad.top + chartH - rh, barW, rh);
      }

      // forgotten bar (on top)
      if (d.forgotten > 0) {
        const fh = d.forgotten * scale;
        const rh = d.remembered * scale;
        ctx.fillStyle = c.forgotten;
        ctx.fillRect(x, pad.top + chartH - rh - fh, barW, fh);
      }

      // date label
      const parts = d.date.split('-');
      const label = parts[1] + '/' + parts[2];
      ctx.fillStyle = c.text;
      ctx.font = '8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, x + barW / 2, h - pad.bottom + 16);
    });

    // legend
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    const legendY = 8;
    ctx.fillStyle = c.remembered;
    ctx.fillRect(pad.left, legendY, 10, 10);
    ctx.fillStyle = c.text;
    ctx.fillText('Remembered', pad.left + 14, legendY + 9);
    ctx.fillStyle = c.forgotten;
    ctx.fillRect(pad.left + 90, legendY, 10, 10);
    ctx.fillStyle = c.text;
    ctx.fillText('Forgotten', pad.left + 104, legendY + 9);
  }

  _drawLearningProgress() {
    const canvas = this.progressCanvas;
    if (!canvas) return;
    const { ctx, w, h } = this._clearCanvas(canvas);
    const c = this._colors();
    const data = appStore.getCumulativeStats();
    if (data.length === 0) return this._drawEmptyChart(canvas);

    const pad = { top: 20, bottom: 28, left: 44, right: 16 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;

    let maxVal = 0;
    data.forEach(d => { if (d.totalUnique > maxVal) maxVal = d.totalUnique; });
    if (maxVal === 0) maxVal = 10;
    maxVal = Math.ceil(maxVal * 1.1);

    // grid lines
    ctx.strokeStyle = c.grid;
    ctx.lineWidth = 0.5;
    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
      const y = pad.top + (chartH / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();
      ctx.fillStyle = c.text;
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(maxVal - (maxVal / gridLines) * i), pad.left - 6, y + 3);
    }

    if (data.length < 2) {
      // single point
      const x = pad.left;
      const y = pad.top + chartH - (data[0].totalUnique / maxVal) * chartH;
      ctx.fillStyle = c.primary;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    const xStep = chartW / (data.length - 1);

    const linePath = (key, color) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      data.forEach((d, i) => {
        const x = pad.left + xStep * i;
        const y = pad.top + chartH - (d[key] / maxVal) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    };

    linePath('cumulativeRemembered', c.remembered);
    linePath('cumulativeForgotten', c.forgotten);

    // x labels (every few dates)
    const step = Math.max(1, Math.floor(data.length / 8));
    data.forEach((d, i) => {
      if (i % step !== 0 && i !== data.length - 1) return;
      const x = pad.left + xStep * i;
      const parts = d.date.split('-');
      const label = parts[1] + '/' + parts[2];
      ctx.fillStyle = c.text;
      ctx.font = '8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, h - pad.bottom + 16);
    });

    // legend
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    const legendY = 8;
    ctx.fillStyle = c.remembered;
    ctx.fillRect(pad.left, legendY, 10, 10);
    ctx.fillStyle = c.text;
    ctx.fillText('Remembered', pad.left + 14, legendY + 9);
    ctx.fillStyle = c.forgotten;
    ctx.fillRect(pad.left + 100, legendY, 10, 10);
    ctx.fillStyle = c.text;
    ctx.fillText('Forgotten', pad.left + 114, legendY + 9);
  }

  _drawEmptyChart(canvas) {
    const { ctx, w, h } = this._clearCanvas(canvas);
    const c = this._colors();
    ctx.fillStyle = c.text;
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Start practicing to see your progress', w / 2, h / 2 + 4);
  }
}

const chartsManager = new ChartsManager();
