const express = require('express');
const path = require('path');
const fs = require('fs');

const distDir = path.join(__dirname, 'dist');
const indexFile = path.join(distDir, 'index.html');
const port = Number(process.env.PORT) || 8080;

const app = express();

if (fs.existsSync(distDir) && fs.existsSync(indexFile)) {
  app.use(express.static(distDir, {
    extensions: ['html'],
    maxAge: '1h',
  }));

  app.use((_req, res) => {
    res.sendFile(indexFile);
  });
} else {
  app.use((_req, res) => {
    res.status(503).send(
      'Build output not found. Run "npm run build" before starting the server.'
    );
  });
}

app.listen(port, () => {
  console.log(`QWER Climb server listening on port ${port}`);
});
