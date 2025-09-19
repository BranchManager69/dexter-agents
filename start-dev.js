const next = require('next');
const http = require('http');

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3020;
const hostname = process.env.HOST || '0.0.0.0';

const app = next({ dev: true, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  http
    .createServer((req, res) => {
      // Allow proxy setups to work without extra config
      res.setHeader('Access-Control-Allow-Origin', '*');
      return handle(req, res);
    })
    .listen(port, hostname, (err) => {
      if (err) {
        console.error(err);
        process.exit(1);
      }
      console.log(`Next dev server ready on http://${hostname}:${port}`);
    });
});
