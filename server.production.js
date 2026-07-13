import express from 'express';
import { Readable } from 'stream';
import server from './dist/server/server.js'; 

const app = express();
const port = process.env.PORT || 3000;
const host = process.env.HOST || '0.0.0.0';

app.use(express.static('dist/client'));

app.use(async (req, res) => {
  const url = `http://${host}:${port}${req.url}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) value.forEach(v => headers.append(key, v));
    else if (value) headers.set(key, value);
  }

  let body = undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = new ReadableStream({
      start(controller) {
        req.on('data', chunk => controller.enqueue(chunk));
        req.on('end', () => controller.close());
        req.on('error', err => controller.error(err));
      }
    });
  }

  const webRequest = new Request(url, { method: req.method, headers, body, duplex: 'half' });

  try {
    const response = await server.fetch(webRequest, process.env, {});
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    if (response.body) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    } else {
      res.end();
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(port, host, () => {
  console.log(`Produção ativa! Escutando em http://${host}:${port}`);
});
