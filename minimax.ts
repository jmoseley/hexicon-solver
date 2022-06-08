import debugFactory from "debug";

import { Board, BoardScore } from "./board";
import { printBoard } from "./format";
import { findAllWords } from "./solve";
import { Trie } from "./trie";

const debug = debugFactory("minimax");

const MAX_DEPTH = 2;

// Use minimax to find the best move
export function miniMax(board: Board, dictionary: Trie) {
  return runMiniMax(board, dictionary, "blue");
}

function runMiniMax(
  board: Board,
  dictionary: Trie,
  mover: "red" | "blue",
  depth = 0
): { score?: BoardScore; hexagons: number; mover: "red" | "blue" } {
  if (debug.enabled) debug("Depth", depth, "mover", mover);
  const moves = findAllWords(board, dictionary, mover).filter(
    (s) => s.word.length > 6
  );

  // Base case
  if (depth >= MAX_DEPTH) {
    if (debug.enabled) debug("Base case");
    // Maximize blue, minimize red
    if (mover === "blue") {
      const score = moves.reduce(
        (best, score) => {
          if (score.blueHexagonCount * score.probability > best.hexagons) {
            return {
              score,
              hexagons: score.blueHexagonCount * score.probability,
              mover,
            };
          }
          return best;
        },
        {
          score: undefined,
          hexagons: 0,
          mover,
        } as { score?: BoardScore; hexagons: number; mover: "red" | "blue" }
      );
      if (score.score) {
        if (debug.enabled)
          debug(printBoard(score.score.board, score.score.word, score.score));
      }
      return score;
    } else {
      const score = moves.reduce(
        (best, score) => {
          if (score.redHexagonCount * score.probability < best.hexagons) {
            return {
              score,
              hexagons: score.redHexagonCount * score.probability,
              mover,
            };
          }
          return best;
        },
        {
          score: undefined,
          hexagons: Infinity,
          mover,
        } as { score?: BoardScore; hexagons: number; mover: "red" | "blue" }
      );
      if (score.score) {
        if (debug.enabled)
          debug(printBoard(score.score.board, score.score.word, score.score));
      }
      return score;
    }
  }

  if (debug.enabled) debug("Recursive case", "Mover", mover);

  // Recursive case
  if (mover === "blue") {
    return moves.reduce(
      (best, move) => {
        if (debug.enabled)
          debug(
            "Move",
            move.word.toString(),
            move.probability,
            move.blueHexagonCount
          );
        if (debug.enabled) debug(printBoard(move.board, move.word, move));

        const score = runMiniMax(
          move.board,
          dictionary,
          "red",
          depth + 1
        ).score;
        if (!score) {
          return best;
        }
        if (debug.enabled)
          debug("Score", score.redHexagonCount, score.probability);

        if (score.redHexagonCount * score.probability < best.hexagons) {
          return {
            score: move,
            hexagons: score.redHexagonCount * score.probability,
            mover: "red",
          };
        }
        return best;
      },
      {
        score: undefined,
        hexagons: Infinity,
        mover,
      } as { score?: BoardScore; hexagons: number; mover: "red" | "blue" }
    );
  } else {
    return moves.reduce(
      (best, move) => {
        if (debug.enabled)
          debug(
            "Move",
            move.word.toString(),
            move.probability,
            move.blueHexagonCount
          );
        if (debug.enabled) debug(printBoard(move.board, move.word, move));
        const score = runMiniMax(
          move.board,
          dictionary,
          "blue",
          depth + 1
        ).score;
        if (!score) {
          return best;
        }
        if (debug.enabled)
          debug("Score", score.blueHexagonCount, score.probability);

        if (score.blueHexagonCount * score.probability > best.hexagons) {
          return {
            score: move,
            hexagons: score.blueHexagonCount * score.probability,
            mover: "blue",
          };
        }
        return best;
      },
      {
        score: undefined,
        hexagons: 0,
        mover,
      } as { score?: BoardScore; hexagons: number; mover: "red" | "blue" }
    );
  }
}
