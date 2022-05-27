import { Board } from "./board";
import { loadWords } from "./util";
import { extractTextFromScreenshot } from "./ocr";
import { findAllWords } from "./solve";
import { printWordOnBoard } from "./format";

async function main() {
  const dictionary = loadWords();
  const text = await extractTextFromScreenshot("./sample.png");
  const board = await Board.create(text);
  const results = findAllWords(board, dictionary);
  console.info(
    results
      .filter((wordNodes) => wordNodes.length > 5)
      .sort((a, b) => b.length - a.length)
      .forEach((wordNodes) => printWordOnBoard(board, wordNodes))
  );
}

main();
