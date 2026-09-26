import http = require("http");
import { WebSocketServer, WebSocket } from "ws";
import { repository, User, Quiz, QuizStatus, stripAnswers, gradeAnswer } from "./repository";

interface ClientState {
  quizId: string | null;
  name: string;
  isOrganizer: boolean;
}

const wss = new WebSocketServer({ noServer: true });
const clients: Map<WebSocket, ClientState> = new Map();

function send(ws: WebSocket, message: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function roomClients(quizId: string): WebSocket[] {
  const result: WebSocket[] = [];
  for (const [ws, state] of clients) {
    if (state.quizId === quizId) result.push(ws);
  }
  return result;
}

function participantNames(quizId: string): string[] {
  const names: string[] = [];
  for (const [, state] of clients) {
    if (state.quizId === quizId) names.push(state.name);
  }
  return names;
}

export function broadcastToQuiz(quizId: string, message: unknown, except?: WebSocket): void {
  for (const ws of roomClients(quizId)) {
    if (ws !== except) send(ws, message);
  }
}

function publicQuiz(quiz: Quiz): Object {
  return { quizId: quiz.uid, author: quiz.author, title: quiz.title, status: quiz.status, questions: stripAnswers(quiz.questions) };
}

function handleJoin(ws: WebSocket, state: ClientState, msg: any): void {
  if (typeof msg.quizId !== "string") {
    send(ws, { type: "error", error: "expected a quizId" });
    return;
  }
  const quiz: Quiz | null = repository.fetchQuiz(msg.quizId);
  if (quiz === null) {
    send(ws, { type: "error", error: "quiz not found" });
    return;
  }
  let user: User | null = null;
  if (typeof msg.session === "string") {
    user = repository.fetchUserBySession(msg.session);
  }
  const isOrganizer: boolean = user !== null && user.name === quiz.author;
  if (quiz.status === QuizStatus.Draft && !isOrganizer) {
    send(ws, { type: "error", error: "quiz not found" });
    return;
  }
  if (!isOrganizer) {
    if (typeof msg.name !== "string" || msg.name.trim() === "") {
      send(ws, { type: "error", error: "name is required" });
      return;
    }
  }
  state.quizId = quiz.uid;
  state.name = isOrganizer && user !== null ? user.name : (msg.name as string).trim();
  state.isOrganizer = isOrganizer;
  const payload: Record<string, unknown> = { type: "joined", ...publicQuiz(quiz), participants: participantNames(quiz.uid), isOrganizer };
  if (quiz.status === QuizStatus.Finished) {
    payload.leaderboard = repository.fetchLeaderboard(quiz.uid);
  }
  send(ws, payload);
  broadcastToQuiz(quiz.uid, { type: "participant-joined", name: state.name }, ws);
}

function handleAnswer(ws: WebSocket, state: ClientState, msg: any): void {
  if (state.quizId === null) {
    send(ws, { type: "error", error: "join a quiz first" });
    return;
  }
  const quiz: Quiz | null = repository.fetchQuiz(state.quizId);
  if (quiz === null || quiz.status !== QuizStatus.Active) {
    send(ws, { type: "error", error: "quiz is not active" });
    return;
  }
  if (!Array.isArray(msg.answers)) {
    send(ws, { type: "error", error: "answers must be an array" });
    return;
  }
  const results = quiz.questions.map((q, i) => ({ question: q.question, correct: gradeAnswer(q, msg.answers[i]), weight: q.weight }));
  const score = results.reduce((sum: number, r) => sum + (r.correct ? r.weight : 0), 0);
  const maxScore = quiz.questions.reduce((sum: number, q) => sum + q.weight, 0);
  repository.saveResult(quiz.uid, state.name, score, maxScore);
  send(ws, { type: "scored", score, maxScore, questions: results });
}

wss.on("connection", (ws: WebSocket) => {
  clients.set(ws, { quizId: null, name: "", isOrganizer: false });

  ws.on("message", (raw) => {
    let msg: any;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      send(ws, { type: "error", error: "invalid JSON" });
      return;
    }
    const state: ClientState | undefined = clients.get(ws);
    if (state === undefined) return;
    if (msg.type === "join") {
      handleJoin(ws, state, msg);
      return;
    }
    if (msg.type === "answer") {
      handleAnswer(ws, state, msg);
      return;
    }
    send(ws, { type: "error", error: "unknown message type" });
  });

  ws.on("close", () => {
    const state: ClientState | undefined = clients.get(ws);
    if (state !== undefined && state.quizId !== null) {
      broadcastToQuiz(state.quizId, { type: "participant-left", name: state.name });
    }
    clients.delete(ws);
  });
});

export function attachWebSocketServer(server: http.Server): void {
  server.on("upgrade", (req: http.IncomingMessage, socket: import("net").Socket, head: Buffer) => {
    const url = new URL(`http://localhost${req.url}`);
    if (url.pathname !== "/ws") {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
  });
}

export function announceQuizStatus(quizId: string, status: QuizStatus): void {
  broadcastToQuiz(quizId, { type: "quiz-status", status });
}

export function announceLeaderboard(quizId: string): void {
  broadcastToQuiz(quizId, { type: "leaderboard", entries: repository.fetchLeaderboard(quizId) });
}
