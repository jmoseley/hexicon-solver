import { Board } from "./board";
import { loadWords } from "./util";
import { extractTextFromScreenshot } from "./ocr";
import { findAllWords } from "./solve";
import { printBoard } from "./format";
import { extractHexColor } from "./extract_colors";

async function main() {
  const screenshot = "sample.png";

  const dictionary = loadWords();
  const text = await extractTextFromScreenshot(screenshot);
  const colors = await extractHexColor(screenshot);

  const board = await Board.create(text, colors);
  const results = findAllWords(board, dictionary);

  console.info(
    results
      // .filter((wordNodes) => wordNodes.length > 4)
      .sort((a, b) => b.length - a.length)
      .forEach((wordNodes) => console.info(printBoard(board, wordNodes)))
  );
}

main();
