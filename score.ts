import { BoardScore } from "./board";

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
