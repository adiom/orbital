import { tool } from "ai";
import { z } from "zod";
import { generateUUID } from "@/lib/utils";

const gameInput = z.object({
  title: z.string().min(2).describe("Title of the mini game"),
  genre: z
    .enum(["quiz", "memory", "flashcards", "estimation"])
    .default("quiz"),
  difficulty: z.enum(["easy", "medium", "hard"]).default("easy"),
  questions: z
    .array(
      z.object({
        question: z.string().min(2),
        options: z.array(z.string()).min(1).default(["True", "False"]),
        answerIndex: z.number().int().min(0).default(0),
      })
    )
    .min(1)
    .describe("List of quiz questions. For non-quiz games used as content items."),
});

export const createGame = tool({
  description:
    "Create an interactive mini-game specification (quiz/memory/etc). Returns JSON spec for client rendering.",
  inputSchema: gameInput,
  execute: async ({ title, genre, difficulty, questions }) => {
    const id = generateUUID();
    // Pre-calculate score potential & simple metrics
    const totalQuestions = questions.length;
    const potentialScore = totalQuestions * 10; // Arbitrary scoring rule
    return {
      toolName: "create-game",
      id,
      title,
      genre,
      difficulty,
      questions,
      scoring: { perQuestion: 10, potential: potentialScore },
      meta: { totalQuestions },
      specVersion: 1,
      message: "Game specification created",
    };
  },
});

