const fs = require('fs');
const https = require('https');
const path = require('path');

const themes = ['shapes'];
const pieces = ['wP', 'wN', 'wB', 'wR', 'wQ', 'wK', 'bP', 'bN', 'bB', 'bR', 'bQ', 'bK'];

const baseDir = path.join('ChessWeb', 'public', 'pieces');

async function download() {
  for (const theme of themes) {
    const themeDir = path.join(baseDir, theme);
    if (!fs.existsSync(themeDir)) fs.mkdirSync(themeDir, { recursive: true });
    
    for (const piece of pieces) {
      const url = `https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/${theme}/${piece}.svg`;
      const filePath = path.join(themeDir, `${piece}.svg`);
      
      await new Promise((resolve) => {
        https.get(url, (res) => {
          if (res.statusCode === 200) {
            const file = fs.createWriteStream(filePath);
            res.pipe(file);
            file.on('finish', () => { file.close(); resolve(); });
          } else {
            console.log('Failed:', url);
            resolve();
          }
        });
      });
      console.log('Downloaded', theme, piece);
    }
  }
}
download();
