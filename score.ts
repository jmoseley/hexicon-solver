import { Board, BoardNode, BoardScore, Word } from "./board";
import debugFactory from "debug";
import { printBoard } from "./format";

const debug = debugFactory("score");

export function sortBySquaresRemaining(a: BoardScore, b: BoardScore) {
  // Sort by the difference in red and blue hexagons
  if (a.blueSquaresRemaining > b.blueSquaresRemaining) {
    return -1;
  }
  if (a.blueSquaresRemaining < b.blueSquaresRemaining) {
    return 1;
  }
  if (a.redSquaresRemaining > b.blueSquaresRemaining) {
    return 1;
  }
  if (a.redSquaresRemaining < b.redSquaresRemaining) {
    return -1;
  }

  return sortByHexagonCount(a, b);
}

export function sortByHexagonCount(a: BoardScore, b: BoardScore) {
  // Sort by the difference in red and blue hexagons
  if (a.blueHexagonCount > b.blueHexagonCount) {
    return -1;
  }
  if (a.blueHexagonCount < b.blueHexagonCount) {
    return 1;
  }

  if (a.blueSquaresRemaining > b.blueSquaresRemaining) {
    return -1;
  }
  if (a.blueSquaresRemaining < b.blueSquaresRemaining) {
    return 1;
  }
  if (a.redSquaresRemaining > b.blueSquaresRemaining) {
    return 1;
  }
  if (a.redSquaresRemaining < b.redSquaresRemaining) {
    return -1;
  }

  // Sort by word length
  if (a.word.length > b.word.length) {
    return -1;
  }
  if (a.word.length < b.word.length) {
    return 1;
  }

  return 0;
}

export function scoreBoard(
  board: Board,
  word: Word,
  probability: number
): BoardScore {
  board = board.clone();
  if (debug.enabled) debug("scoreBoard", word.toString());
  if (debug.enabled) debug(printBoard(board));

  let redHexagonCount = 0;
  let blueHexagonCount = 0;
  let blueSquaresRemaining = 0;
  let redSquaresRemaining = 0;
  let redCleared = 0;
  let blueCleared = 0;

  const hexagonCenters = [] as { color: "red" | "blue"; node: BoardNode }[];
  for (const line of board.nodes) {
    for (const node of line) {
      const hexagonResult = node.isCenterOfHexagon();

      if (hexagonResult) {
        hexagonCenters.push({ node, color: hexagonResult });
        if (hexagonResult === "red") {
          redHexagonCount++;
        }
        if (hexagonResult === "blue") {
          blueHexagonCount++;
        }
      }
    }
  }

  for (const { node, color } of hexagonCenters) {
    const cleared = node.clearForHexagon(color);
    redCleared += cleared.redCleared;
    blueCleared += cleared.blueCleared;
  }

  let numSuperHexagons = 0;
  // Super hexagons
  for (const line of board.nodes) {
    for (const node of line) {
      if (node.checkAndClearSuperHexagon()) {
        numSuperHexagons++;
      }
    }
  }

  if (debug.enabled) debug("cleared", printBoard(board));

  // Count the remaining squares
  for (const line of board.nodes) {
    for (const node of line) {
      if (node.color === "red" || node.color === "very_red") {
        redSquaresRemaining++;
      }
      if (node.color === "blue" || node.color === "very_blue") {
        blueSquaresRemaining++;
      }
    }
  }

  return {
    board,
    word,
    redHexagonCount,
    blueHexagonCount,
    blueCleared,
    redCleared,
    blueSquaresRemaining,
    redSquaresRemaining,
    numSuperHexagons,
    probability,
  };
}
