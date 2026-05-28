class StatsManager {
  show() {
    const stats = appStore.getStats();
    document.getElementById('statTotal').textContent = stats.total;
    document.getElementById('statRemembered').textContent = stats.remembered;
    document.getElementById('statForgotten').textContent = stats.forgotten;
    document.getElementById('statAccuracy').textContent = stats.accuracy + '%';
    document.getElementById('statStreak').textContent = stats.streak;
    document.getElementById('statSessions').textContent = stats.sessions;
  }
}

const statsManager = new StatsManager();
