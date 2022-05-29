import { Board } from "./board";
import { loadWords } from "./util";
import { extractTextFromScreenshot } from "./ocr";
import { findAllWords } from "./solve";
import { printBoard } from "./format";
import { extractHexColor } from "./extract_colors";
import { sortWords } from "./score";

async function main() {
  const screenshot = "sample.png";

  const dictionary = loadWords();
  const text = await extractTextFromScreenshot(screenshot);
  const colors = await extractHexColor(screenshot);

  const board = await Board.create(text, colors);
  const results = findAllWords(board, dictionary);

  const sorted = sortWords(board, results);

  sorted
    // .filter(({ word }) => word.length > 4)
    .forEach(({ word, ...rest }) =>
      console.info(printBoard(board, word, rest))
    );
}

main();
