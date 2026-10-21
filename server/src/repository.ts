import crypto = require("crypto")
import path = require("path")
import { DatabaseSync } from "node:sqlite"

export interface User {
  name: string;
  email: string;
  pass: string;
  salt: string;
}

export enum AnswerKind {
  Radio,
  Checkbox,
  TextEdit
}

export interface RadioAnswer {
  options: string[];
  correctAnswer: number;
}

export interface CheckboxAnswer {
  options: string[];
  correctAnswers: number[];
}

export interface TextEditAnswer {
  correctAnswers: string[];
}

export interface QuizQuestion {
  weight: number;
  question: string;
  image?: string; // optional data URL of a picture attached to the question text
  kind: AnswerKind;
  answer: RadioAnswer | CheckboxAnswer | TextEditAnswer;
}

export enum QuizStatus {
  Draft,
  Active,
  Finished
}

export interface Quiz {
  uid: string;
  author: string;
  title: string;
  status: QuizStatus;
  questions: QuizQuestion[];
}

export interface QuizResult {
  name: string;
  score: number;
  maxScore: number;
  createdAt: string;
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  maxScore: number;
}

export interface Repository {
  fetchUser(name: string): User | null;
  uploadUser(user: User): void;
  fetchUserBySession(token: string): User | null;
  createSession(user: User): string;
  fetchQuiz(uid: string): Quiz | null;
  uploadQuiz(quiz: Quiz): void;
  updateQuiz(quiz: Quiz): void;
  listQuizzes(): Quiz[];
  saveResult(quizUid: string, name: string, score: number, maxScore: number): void;
  fetchResults(quizUid: string): QuizResult[];
  fetchLeaderboard(quizUid: string): LeaderboardEntry[];
}

function quizFromRow(row: Record<string, unknown>): Quiz {
  return {
    uid: row.uid as string,
    author: row.author as string,
    title: row.title as string,
    status: row.status as QuizStatus,
    questions: JSON.parse(row.questions_json as string) as QuizQuestion[],
  };
}

class SqliteRepository implements Repository {
  private db: DatabaseSync;

  constructor(dbPath: string) {
    this.db = new DatabaseSync(dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        name TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        salt TEXT NOT NULL,
        pass TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_name TEXT NOT NULL REFERENCES users(name)
      );
      CREATE TABLE IF NOT EXISTS quizzes (
        uid TEXT PRIMARY KEY,
        author TEXT NOT NULL,
        title TEXT NOT NULL,
        status INTEGER NOT NULL,
        questions_json TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quiz_uid TEXT NOT NULL REFERENCES quizzes(uid),
        name TEXT NOT NULL,
        score INTEGER NOT NULL,
        max_score INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
  }

  fetchUser(name: string): User | null {
    const row = this.db.prepare("SELECT name, email, salt, pass FROM users WHERE name = ?").get(name) as Record<string, unknown> | undefined;
    if (row === undefined) return null;
    return { name: row.name as string, email: row.email as string, salt: row.salt as string, pass: row.pass as string };
  }

  uploadUser(user: User): void {
    this.db.prepare("INSERT INTO users (name, email, salt, pass) VALUES (?, ?, ?, ?)").run(user.name, user.email, user.salt, user.pass);
  }

  fetchUserBySession(token: string): User | null {
    const row = this.db.prepare(
      "SELECT u.name, u.email, u.salt, u.pass FROM sessions s JOIN users u ON u.name = s.user_name WHERE s.token = ?"
    ).get(token) as Record<string, unknown> | undefined;
    if (row === undefined) return null;
    return { name: row.name as string, email: row.email as string, salt: row.salt as string, pass: row.pass as string };
  }

  createSession(user: User): string {
    let token = crypto.randomBytes(16).toString("hex");
    while (this.db.prepare("SELECT token FROM sessions WHERE token = ?").get(token) !== undefined)
      token = crypto.randomBytes(16).toString("hex");
    this.db.prepare("INSERT INTO sessions (token, user_name) VALUES (?, ?)").run(token, user.name);
    return token;
  }

  fetchQuiz(uid: string): Quiz | null {
    const row = this.db.prepare("SELECT uid, author, title, status, questions_json FROM quizzes WHERE uid = ?").get(uid) as Record<string, unknown> | undefined;
    return row === undefined ? null : quizFromRow(row);
  }

  uploadQuiz(quiz: Quiz): void {
    this.storeQuiz(quiz);
  }

  updateQuiz(quiz: Quiz): void {
    this.storeQuiz(quiz);
  }

  private storeQuiz(quiz: Quiz): void {
    this.db.prepare("INSERT OR REPLACE INTO quizzes (uid, author, title, status, questions_json) VALUES (?, ?, ?, ?, ?)")
      .run(quiz.uid, quiz.author, quiz.title, quiz.status, JSON.stringify(quiz.questions));
  }

  listQuizzes(): Quiz[] {
    const rows = this.db.prepare("SELECT uid, author, title, status, questions_json FROM quizzes ORDER BY rowid").all() as Record<string, unknown>[];
    return rows.map(quizFromRow);
  }

  saveResult(quizUid: string, name: string, score: number, maxScore: number): void {
    this.db.prepare("INSERT INTO results (quiz_uid, name, score, max_score, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(quizUid, name, score, maxScore, new Date().toISOString());
  }

  fetchResults(quizUid: string): QuizResult[] {
    const rows = this.db.prepare("SELECT name, score, max_score AS maxScore, created_at AS createdAt FROM results WHERE quiz_uid = ? ORDER BY rowid").all(quizUid) as Record<string, unknown>[];
    return rows.map(row => ({ name: row.name as string, score: row.score as number, maxScore: row.maxScore as number, createdAt: row.createdAt as string }));
  }

  // best score per participant, ranked by score descending
  fetchLeaderboard(quizUid: string): LeaderboardEntry[] {
    const best = new Map<string, LeaderboardEntry>();
    for (const r of this.fetchResults(quizUid)) {
      const prev = best.get(r.name);
      if (prev === undefined || r.score > prev.score) {
        best.set(r.name, { name: r.name, score: r.score, maxScore: r.maxScore });
      }
    }
    return Array.from(best.values()).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  }
}

export function gradeAnswer(question: QuizQuestion, given: unknown): boolean {
  switch (question.kind) {
    case AnswerKind.Radio:
      return given === (question.answer as RadioAnswer).correctAnswer;
    case AnswerKind.Checkbox: {
      if (!Array.isArray(given) || !given.every(v => typeof v === "number")) return false;
      const expected = [...(question.answer as CheckboxAnswer).correctAnswers].sort((a, b) => a - b);
      const actual = (given as number[]).sort((a, b) => a - b);
      return expected.length === actual.length && expected.every((v, i) => v === actual[i]);
    }
    case AnswerKind.TextEdit: {
      if (typeof given !== "string") return false;
      const normalized = given.trim().toLowerCase();
      return (question.answer as TextEditAnswer).correctAnswers.some(a => a.trim().toLowerCase() === normalized);
    }
  }
}

// public view of the questions, without the correct answers
export function stripAnswers(questions: QuizQuestion[]): Object[] {
  var result: Object[] = [];
  for (const q of questions) {
    switch (q.kind) {
      case AnswerKind.Radio:
        result.push({ question: q.question, image: q.image, weight: q.weight, kind: q.kind, options: (q.answer as RadioAnswer).options })
        break;
      case AnswerKind.Checkbox:
        result.push({ question: q.question, image: q.image, weight: q.weight, kind: q.kind, options: (q.answer as CheckboxAnswer).options })
        break;
      case AnswerKind.TextEdit:
        result.push({ question: q.question, image: q.image, weight: q.weight, kind: q.kind })
        break;
    }
  }
  return result;
}

export const repository: Repository = new SqliteRepository(path.join(__dirname, "..", "quizapp.db"))
