import { Board, Word } from "./board";

// Sort each word by the number of hexagons that the board contains
export function sortWords(board: Board, words: Word[]) {
  return words
    .map((w) => {
      const result = board.countHexagons(w);
      return {
        word: w,
        blueHexagons: result.blueCount,
        redHexagons: result.redCount,
        redCleared: result.redCleared,
        blueCleared: result.blueCleared,
      };
    })
    .sort((a, b) => {
      // Sort by the difference in red and blue hexagons
      if (a.blueHexagons > b.blueHexagons) {
        return -1;
      }
      if (a.blueHexagons < b.blueHexagons) {
        return 1;
      }

      // Sort by the max number of red squares cleared
      if (a.redCleared > b.redCleared) {
        return -1;
      }
      if (a.redCleared < b.redCleared) {
        return 1;
      }

      // Sort by the minimum number of blue squares cleared
      if (a.blueCleared < b.blueCleared) {
        return -1;
      }
      if (a.blueCleared > b.blueCleared) {
        return 1;
      }

      // Sort by word length
      if (a.word.length > b.word.length) {
        return -1;
      }
      if (a.word.length < b.word.length) {
        return 1;
      }
      return 0;
    });
}
