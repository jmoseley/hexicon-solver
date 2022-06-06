import { Board, BoardScore } from "./board";
import { findAllWords } from "./solve";
import { Trie } from "./trie";

// Use minimax to find the best move
export function miniMax(board: Board, dictionary: Trie) {
  // Always trying to maximize blue
  const mover = "blue";

  return runMiniMax(board, dictionary, mover, 1);
}

function runMiniMax(
  board: Board,
  dictionary: Trie,
  mover: "red" | "blue",
  probability: number
) {
  const scores = findAllWords(board, dictionary, mover, probability);
}

function maximize(scores: BoardScore[]) {
  return;
}
