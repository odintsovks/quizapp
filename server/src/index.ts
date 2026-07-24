import http = require("http");
import crypto = require("crypto");
import { repository, User, Quiz, QuizQuestion, AnswerKind, RadioAnswer, CheckboxAnswer } from "./repository";

function generateSalt(): string {
  return crypto.randomBytes(16).toString("hex");
}

function processPassword(pass: string, salt: string): string {
  return crypto.createHash("sha256").update(salt + pass + "somecleverpepper").digest("hex");
}

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

function stripAnswers(questions: QuizQuestion[]): Object[] {
  var result: Object[] = [];
  for (const q of questions) {
    switch (q.kind) {
      case AnswerKind.Radio:
        result.push({ question: q.question, weight: q.weight, kind: q.kind, options: (q.answer as RadioAnswer).options })
        break;
      case AnswerKind.Checkbox:
        result.push({ question: q.question, weight: q.weight, kind: q.kind, options: (q.answer as CheckboxAnswer).options })
        break;
      case AnswerKind.TextEdit:
        result.push({ question: q.question, weight: q.weight, kind: q.kind })
        break;
    }
  }
  return result;
}

addHandler("/quiz", "GET", (req: http.IncomingMessage, url: URL, res: http.ServerResponse) => {
  const searchParams: URLSearchParams = url.searchParams;
  const id: string | null = searchParams.get("id");
  if (id === null) {
    res.writeHead(400);
    res.end();
    return;
  }
  res.writeHead(200, { "Content-Type": "application/json" });
  const quiz: Quiz | null = repository.fetchQuiz(id);
  if (quiz === null) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(200);
  res.end(JSON.stringify({ author: quiz.author, title: quiz.title, questions: stripAnswers(quiz.questions) }));
});

addHandler("/login", "POST", (req: http.IncomingMessage, url: URL, res: http.ServerResponse) => {
  handleMessageData(req, url, res, (_req: http.IncomingMessage, _url: URL, data: string, res: http.ServerResponse) => {
    const jsonData = JSON.parse(data);
    const user: User | null = repository.fetchUser(jsonData.name);
    if (user === null) {
      res.writeHead(404);
      res.end();
      return;
    }
    const attemptedPass: string = processPassword(jsonData.pass, user.salt);
    if (attemptedPass != user.pass) {
      res.writeHead(403);
      res.end();
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ session: repository.createSession(user) }));
  })
});

addHandler("/register", "POST", (req: http.IncomingMessage, url: URL, res: http.ServerResponse) => {
  handleMessageData(req, url, res, (_req: http.IncomingMessage, _url: URL, data: string, res: http.ServerResponse) => {
    const jsonData = JSON.parse(data);
    if (repository.fetchUser(jsonData.name) !== null) {
      res.writeHead(400);
      res.end();
      return;
    }
    const salt: string = generateSalt();
    const user: User = {
      name: jsonData.name,
      email: jsonData.email,
      salt: salt,
      pass: processPassword(jsonData.pass, salt),
    }
    repository.uploadUser(user);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ session: repository.createSession(user) }));
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
