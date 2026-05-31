// MCP-0D — Product Q&A engine (questions, answers, voting, accepted answers)

import type { QAAnswer, QAItem } from "./types";

export interface QAValidation {
  ok: boolean;
  errors: string[];
}

export function validateQuestion(question: string): QAValidation {
  const errors: string[] = [];
  const trimmed = question.trim();
  if (trimmed.length < 5) errors.push("question_too_short");
  if (trimmed.length > 500) errors.push("question_too_long");
  return { ok: errors.length === 0, errors };
}

export function validateAnswer(body: string): QAValidation {
  const errors: string[] = [];
  const trimmed = body.trim();
  if (trimmed.length < 2) errors.push("answer_too_short");
  if (trimmed.length > 2000) errors.push("answer_too_long");
  return { ok: errors.length === 0, errors };
}

/** Best answer = accepted, else seller answer, else most-voted. */
export function bestAnswer(item: QAItem): QAAnswer | null {
  if (item.answers.length === 0) return null;
  const accepted = item.answers.find((a) => a.accepted);
  if (accepted) return accepted;
  const seller = item.answers.filter((a) => a.bySeller).sort((a, b) => b.votes - a.votes)[0];
  if (seller) return seller;
  return [...item.answers].sort((a, b) => b.votes - a.votes)[0];
}

export interface QAAnalytics {
  questions: number;
  answered: number;
  answerRate: number; // %
  sellerAnswered: number;
  unanswered: number;
}

export function qaAnalytics(items: QAItem[]): QAAnalytics {
  const questions = items.length;
  const answered = items.filter((i) => i.answers.length > 0).length;
  const sellerAnswered = items.filter((i) => i.answers.some((a) => a.bySeller)).length;
  return {
    questions,
    answered,
    answerRate: questions ? Math.round((answered / questions) * 100) : 0,
    sellerAnswered,
    unanswered: questions - answered,
  };
}
