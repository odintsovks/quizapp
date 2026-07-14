import http = require("http");

const server: http.Server = http.createServer((_req: http.IncomingMessage, res: http.ServerResponse) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end("Hello, world!");
})

server.listen(8000);
