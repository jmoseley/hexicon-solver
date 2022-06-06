import { Board, Word } from "./board";

interface SortedResult {
  word: Word;
  blueHexagonCount: number;
  redHexagonCount: number;
  redCleared: number;
  blueCleared: number;
  redSquaresRemaining: number;
  blueSquaresRemaining: number;
}

// Sort each word by the number of hexagons that the board contains
export function sortByMaxHexagons(board: Board, words: Word[]): SortedResult[] {
  return words
    .map((w) => {
      const result = board.clone().scoreBoard(w);
      return {
        word: w,
        ...result,
      };
    })
    .sort(sortByHexagonCount);
}

export function sortByMaxBlueSquares(
  board: Board,
  words: Word[]
): SortedResult[] {
  return words
    .map((w) => {
      const result = board.clone().scoreBoard(w);

      return {
        word: w,
        ...result,
      };
    })
    .sort(sortBySquaresRemaining);
}

function sortBySquaresRemaining(a: SortedResult, b: SortedResult) {
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

function sortByHexagonCount(a: SortedResult, b: SortedResult) {
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
