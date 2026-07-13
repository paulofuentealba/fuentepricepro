import server from './dist/server/server.js';
import http from 'http';
import { Readable } from 'stream';

const webServer = http.createServer(async (req, res) => {
  const url = 'http://localhost:3000' + req.url;
  
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      value.forEach(v => headers.append(key, v));
    } else if (value) {
      headers.set(key, value);
    }
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

  const webRequest = new Request(url, {
    method: req.method,
    headers,
    body,
    duplex: 'half'
  });

  try {
    const response = await server.fetch(webRequest, process.env, {});
    
    res.statusCode = response.status;
    res.statusMessage = response.statusText;
    
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

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
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
});

webServer.listen(3000, () => {
  console.log('Test server listening on port 3000');
});
