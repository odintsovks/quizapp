import http = require("http");
import { repository, User } from "./repository";

type Handler = (req: http.IncomingMessage, url: URL, res: http.ServerResponse) => void
const endpoints: Map<string, Map<string, Handler>> = new Map()

function addHandler(endpoint: string, method: string, handler: Handler): void {
  if (!endpoints.has(endpoint)) {
    endpoints.set(endpoint, new Map());
  }
  endpoints.get(endpoint)?.set(method, handler)
}

function handleMessageData(req: http.IncomingMessage, url: URL, res: http.ServerResponse, handler: (req: http.IncomingMessage, url: URL, data: string, res: http.ServerResponse) => void): void {
  let data: string = "";
  req.on("data", chunk => { data += chunk; });
  req.on("end", () => {
    handler.call(null, req, url, data, res);
  });
}

addHandler("/register", "POST", (req: http.IncomingMessage, url: URL, res: http.ServerResponse) => {
  handleMessageData(req, url, res, (req: http.IncomingMessage, url: URL, data: string, res: http.ServerResponse) => {
    const jsonData: User = JSON.parse(data);
    if (repository.fetchUser(jsonData.name) !== null) {
      res.writeHead(400);
      res.end();
      return;
    }
    repository.uploadUser(jsonData);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ session: repository.createSession(jsonData) }));
  })
});

const server: http.Server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
  const urlData = new URL(`http://localhost${req.url}`);
  const handler: Handler | undefined = endpoints.get(urlData.pathname)?.get(req.method ?? "");
  if (handler !== undefined) {
    handler.call(null, req, urlData, res);
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end("Hello, world!");
})

server.listen(8000);
