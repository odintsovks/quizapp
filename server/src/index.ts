import http = require("http");
import crypto = require("crypto");
import { repository, User, Quiz, QuizStatus, QuizQuestion, AnswerKind, stripAnswers } from "./repository";
import { attachWebSocketServer, announceQuizStatus, announceLeaderboard } from "./ws";

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

function handleJsonBody(req: http.IncomingMessage, url: URL, res: http.ServerResponse, handler: (url: URL, body: any, res: http.ServerResponse) => void): void {
  let data: string = "";
  req.on("data", chunk => { data += chunk; });
  req.on("end", () => {
    let body: any;
    try {
      body = JSON.parse(data);
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "invalid JSON body" }));
      return;
    }
    handler.call(null, url, body, res);
  });
}

function fetchUserBySessionHeader(req: http.IncomingMessage): User | null {
  const token = req.headers["x-session"];
  if (typeof token !== "string") {
    return null;
  }
  return repository.fetchUserBySession(token);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(v => typeof v === "string");
}

// the whole quiz (including pictures as data URLs) is one JSON document, so cap image size
const MAX_IMAGE_LENGTH = 5 * 1024 * 1024;

function isValidQuestion(value: unknown): value is QuizQuestion {
  if (typeof value !== "object" || value === null) return false;
  const q = value as Record<string, unknown>;
  if (typeof q.weight !== "number" || typeof q.question !== "string") return false;
  if (q.image !== undefined && (typeof q.image !== "string" || !q.image.startsWith("data:image/") || q.image.length > MAX_IMAGE_LENGTH)) return false;
  const answer = q.answer as Record<string, unknown> | null;
  if (answer === null || typeof answer !== "object") return false;
  switch (q.kind) {
    case AnswerKind.Radio:
      return isStringArray(answer.options) && typeof answer.correctAnswer === "number";
    case AnswerKind.Checkbox:
      return isStringArray(answer.options) && Array.isArray(answer.correctAnswers) && answer.correctAnswers.every(v => typeof v === "number");
    case AnswerKind.TextEdit:
      return isStringArray(answer.correctAnswers);
    default:
      return false;
  }
}

addHandler("/quiz", "GET", (req: http.IncomingMessage, url: URL, res: http.ServerResponse) => {
  const id: string | null = url.searchParams.get("id");
  if (id === null) {
    res.writeHead(400);
    res.end();
    return;
  }
  const quiz: Quiz | null = repository.fetchQuiz(id);
  if (quiz === null) {
    res.writeHead(404);
    res.end();
    return;
  }
  if (quiz.status === QuizStatus.Draft) {
    const user: User | null = fetchUserBySessionHeader(req);
    if (user === null || user.name !== quiz.author) {
      res.writeHead(404);
      res.end();
      return;
    }
  }
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ author: quiz.author, title: quiz.title, questions: stripAnswers(quiz.questions) }));
});

addHandler("/quiz", "POST", (req: http.IncomingMessage, url: URL, res: http.ServerResponse) => {
  const user: User | null = fetchUserBySessionHeader(req);
  if (user === null) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "authentication required" }));
    return;
  }
  handleJsonBody(req, url, res, (_url: URL, body: any, res: http.ServerResponse) => {
    if (typeof body.title !== "string" || body.title.length === 0 || !Array.isArray(body.questions) || !body.questions.every(isValidQuestion)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "invalid quiz payload" }));
      return;
    }
    if (body.durationSec !== undefined && (!Number.isInteger(body.durationSec) || body.durationSec <= 0)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "durationSec must be a positive number of seconds" }));
      return;
    }
    const quiz: Quiz = {
      uid: crypto.randomBytes(16).toString("hex"),
      author: user.name,
      title: body.title,
      status: QuizStatus.Draft,
      questions: body.questions as QuizQuestion[],
    };
    if (typeof body.durationSec === "number") quiz.durationSec = body.durationSec;
    repository.uploadQuiz(quiz);
    res.writeHead(201, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ uid: quiz.uid }));
  });
});

function handleQuizControl(url: URL, user: User, from: QuizStatus, to: QuizStatus, res: http.ServerResponse): void {
  const id: string | null = url.searchParams.get("id");
  if (id === null) {
    res.writeHead(400);
    res.end();
    return;
  }
  const quiz: Quiz | null = repository.fetchQuiz(id);
  if (quiz === null) {
    res.writeHead(404);
    res.end();
    return;
  }
  if (quiz.author !== user.name) {
    res.writeHead(403, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not your quiz" }));
    return;
  }
  if (quiz.status !== from) {
    res.writeHead(409, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: `quiz is not ${QuizStatus[from].toLowerCase()}` }));
    return;
  }
  if (to === QuizStatus.Finished) {
    finishQuiz(quiz);
  } else {
    // starting a timed quiz: remember when it should end on its own
    if (quiz.durationSec !== undefined && quiz.durationSec > 0) {
      quiz.endsAt = new Date(Date.now() + quiz.durationSec * 1000).toISOString();
      const delay = Date.parse(quiz.endsAt) - Date.now();
      if (delay > 0) setTimeout(() => autoFinishQuiz(id), delay);
    }
    quiz.status = to;
    repository.updateQuiz(quiz);
    announceQuizStatus(id, to);
  }
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: quiz.status }));
}

// shared by manual ending and the timer: persist, then tell every participant in the room
function finishQuiz(quiz: Quiz): void {
  quiz.status = QuizStatus.Finished;
  repository.updateQuiz(quiz);
  announceQuizStatus(quiz.uid, QuizStatus.Finished);
  announceLeaderboard(quiz.uid);
}

function autoFinishQuiz(quizUid: string): void {
  const quiz: Quiz | null = repository.fetchQuiz(quizUid);
  if (quiz === null || quiz.status !== QuizStatus.Active) return;
  finishQuiz(quiz);
}

// safety net for timers lost to a server restart; idempotent with the setTimeout above
function finishDueQuizzes(): void {
  for (const quiz of repository.fetchDueQuizzes(new Date().toISOString())) {
    autoFinishQuiz(quiz.uid);
  }
}

setInterval(finishDueQuizzes, 10_000).unref();
finishDueQuizzes(); // catch up on startup, e.g. if the server restarted mid-quiz

addHandler("/quiz/start", "POST", (req: http.IncomingMessage, url: URL, res: http.ServerResponse) => {
  const user: User | null = fetchUserBySessionHeader(req);
  if (user === null) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "authentication required" }));
    return;
  }
  handleQuizControl(url, user, QuizStatus.Draft, QuizStatus.Active, res);
});

addHandler("/quiz/end", "POST", (req: http.IncomingMessage, url: URL, res: http.ServerResponse) => {
  const user: User | null = fetchUserBySessionHeader(req);
  if (user === null) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "authentication required" }));
    return;
  }
  handleQuizControl(url, user, QuizStatus.Active, QuizStatus.Finished, res);
});

addHandler("/quizzes", "GET", (_req: http.IncomingMessage, _url: URL, res: http.ServerResponse) => {
  const quizzes = repository.listQuizzes().map(q => ({ uid: q.uid, author: q.author, title: q.title, status: q.status }));
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(quizzes));
});

addHandler("/history", "GET", (req: http.IncomingMessage, _url: URL, res: http.ServerResponse) => {
  const user: User | null = fetchUserBySessionHeader(req);
  if (user === null) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "authentication required" }));
    return;
  }
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(repository.fetchHistory(user.name)));
});

addHandler("/me", "GET", (req: http.IncomingMessage, _url: URL, res: http.ServerResponse) => {
  const user: User | null = fetchUserBySessionHeader(req);
  if (user === null) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "authentication required" }));
    return;
  }
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ name: user.name }));
});

addHandler("/login", "POST", (req: http.IncomingMessage, url: URL, res: http.ServerResponse) => {
  handleJsonBody(req, url, res, (_url: URL, body: any, res: http.ServerResponse) => {
    if (typeof body.name !== "string" || typeof body.pass !== "string") {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "name and pass are required" }));
      return;
    }
    const user: User | null = repository.fetchUser(body.name);
    if (user === null) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "invalid credentials" }));
      return;
    }
    const attemptedPass: string = processPassword(body.pass, user.salt);
    if (!crypto.timingSafeEqual(Buffer.from(attemptedPass), Buffer.from(user.pass))) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "invalid credentials" }));
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ session: repository.createSession(user) }));
  })
});

addHandler("/register", "POST", (req: http.IncomingMessage, url: URL, res: http.ServerResponse) => {
  handleJsonBody(req, url, res, (_url: URL, body: any, res: http.ServerResponse) => {
    if (typeof body.name !== "string" || body.name.length === 0 || typeof body.pass !== "string" || body.pass.length === 0 || typeof body.email !== "string" || !/^\S+@\S+\.\S+$/.test(body.email)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "name, email and pass are required" }));
      return;
    }
    if (repository.fetchUser(body.name) !== null) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "user already exists" }));
      return;
    }
    const salt: string = generateSalt();
    const user: User = {
      name: body.name,
      email: body.email,
      salt: salt,
      pass: processPassword(body.pass, salt),
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
  res.writeHead(404);
  res.end();
})

attachWebSocketServer(server);

server.listen(8000);
