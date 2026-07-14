import crypto = require("crypto")

interface User {
  name: string;
  email: string;
  pass: string;
}

enum AnswerKind {
  Radio,
  Checkbox,
  TextEdit
}

interface RadioAnswer {
  options: string[];
  correctAnswer: number;
}

interface CheckboxAnswer {
  options: string[];
  correctAnswers: number[];
}

interface TextEditAnswer {
  correctAnswers: string[];
}

interface QuizQuestion {
  weight: number;
  question: string;
  kind: AnswerKind;
  answer: RadioAnswer | CheckboxAnswer | TextEditAnswer;
}

interface Quiz {
  uid: string;
  author: string;
  title: string;
  question: QuizQuestion[];
}

interface Repository {
  fetchUser(name: string): User | null;
  uploadUser(user: User): void;
  fetchUserBySession(token: string): User | null;
  createSession(user: User): string;
  fetchQuiz(uid: string): Quiz | null;
  uploadQuiz(quiz: Quiz): void;
}

class MapRepository implements Repository {
  private users: Map<string, User> = new Map<string, User>();
  private sessions: Map<string, User> = new Map<string, User>();
  private quizes: Map<string, Quiz> = new Map<string, Quiz>();
  fetchUser(name: string): User | null {
    const user: User|undefined = this.users.get(name);
    return user === undefined ? null : user; 
  }
  uploadUser(user: User): void {
    this.users.set(user.name, user);
  }
  fetchUserBySession(token: string): User | null {
    const user: User|undefined = this.sessions.get(token);
    return user === undefined ? null : user; 
  }
  createSession(user: User): string {
    var token = crypto.randomBytes(16).toString("hex");
    while (this.sessions.has(token))
      token = crypto.randomBytes(16).toString("hex");
    this.sessions.set(token, user);
    return token;
  }
  fetchQuiz(uid: string): Quiz | null {
    const quiz: Quiz|undefined = this.quizes.get(uid)
    return quiz === undefined ? null : quiz; 
  }
  uploadQuiz(quiz: Quiz): void {
    this.quizes.set(quiz.uid, quiz);
  }
}

module.exports = {
  repository: new MapRepository()
}
