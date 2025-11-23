// Data latest helper - exposes newest casino scrape CSV safely
const fs = require('fs');
const path = require('path');

function getLatestCasinoCSVPath(dataDir) {
  try {
    const files = fs.readdirSync(dataDir)
      .filter(f => f.startsWith('casino_data_') && f.endsWith('.csv'))
      .map(f => ({ name: f, full: path.join(dataDir, f), mtime: fs.statSync(path.join(dataDir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    return files.length ? files[0].full : null;
  } catch (e) {
    console.warn('getLatestCasinoCSVPath failed:', e.message);
    return null;
  }
}

module.exports = { getLatestCasinoCSVPath };