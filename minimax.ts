import debugFactory from "debug";

import { Board, BoardScore } from "./board";
import { printBoard } from "./format";
import { sortByHexagonCount } from "./score";
import { findAllWords } from "./solve";
import { Trie } from "./trie";

const debug = debugFactory("minimax");

const MAX_DEPTH = 5;

// Use minimax to find the best move
export function miniMax(board: Board, dictionary: Trie) {
  const moves = findAllWords(board, dictionary, "blue")
    .filter((s) => s.word.length > 5)
    .sort(sortByHexagonCount("blue"));

  let alpha = -Infinity;
  let best = -Infinity;
  let bestMove: BoardScore | undefined;
  for (const move of moves) {
    const score = runMiniMax(move.board, dictionary, "red", alpha);
    if (score > best) {
      best = score;
      bestMove = move;
    }
    alpha = Math.max(alpha, best);
    debug("Top level", best, alpha);
  }

  if (!bestMove) {
    throw new Error("No best move.");
  }

  console.info(`Best move: ${bestMove.word} Expected Final Score: ${best}`);

  return bestMove;
}

function runMiniMax(
  board: Board,
  dictionary: Trie,
  mover: "red" | "blue",
  alpha: number = -Infinity,
  beta: number = Infinity,
  depth: number = 0
): number {
  if (debug.enabled) debug("Depth", depth, "mover", mover);

  if (mover === "blue" && board.blueScore * board.probability >= 16) {
    if (debug.enabled)
      debug("Blue winner", board.blueScore * board.probability);
    return board.blueScore * board.probability;
  } else if (mover === "red" && board.redScore * board.probability >= 16) {
    if (debug.enabled) debug("Red winner", board.redScore * board.probability);
    return board.redScore * board.probability;
  }

  // Base case
  if (depth === MAX_DEPTH) {
    if (debug.enabled) debug("Base case");
    // Maximize blue, minimize red
    if (mover === "blue") {
      if (debug.enabled) debug("Blue", board.blueScore * board.probability);
      return board.blueScore * board.probability;
    } else {
      if (debug.enabled) debug("Red", board.redScore * board.probability);
      return board.redScore * board.probability;
    }
  }

  const moves = findAllWords(board, dictionary, mover)
    .filter((s) => s.word.length > 4)
    .filter((s) => {
      if (mover === "blue") {
        return s.blueHexagonCount > 0;
      }
      return true;
    })
    .sort(sortByHexagonCount(mover));

  if (moves.length === 0) {
    if (debug.enabled) debug("No moves");
    if (mover === "blue") {
      return board.blueScore;
    } else {
      return board.redScore;
    }
  }

  if (debug.enabled) debug("Moves", moves.length);

  // Recursive case
  if (mover === "blue") {
    let best = -Infinity;
    for (const move of moves) {
      best = Math.max(
        best,
        runMiniMax(move.board, dictionary, "red", alpha, beta, depth + 1)
      );
      if (best >= beta) {
        if (debug.enabled) debug("Beta cutoff", best, beta);
        break;
      }
      alpha = Math.max(alpha, best);
    }
    return best;
  } else {
    let best = Infinity;
    for (const move of moves) {
      best = Math.min(
        best,
        runMiniMax(move.board, dictionary, "blue", alpha, beta, depth + 1)
      );
      if (best <= alpha) {
        if (debug.enabled) debug("Alpha cutoff", best, alpha);
        break;
      }
      beta = Math.min(beta, best);
    }
    return best;
  }
}
