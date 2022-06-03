import { Board, Word } from "./board";
import { loadWords } from "./util";
import { extractTextFromScreenshot } from "./ocr";
import { findAllWords } from "./solve";
import { printBoard } from "./format";
import { extractHexColor } from "./extract_colors";
import * as solve from "./score";
import yesno from "yesno";

async function main() {
  const screenshot = "sample.png";

  const dictionary = loadWords();
  const text = await extractTextFromScreenshot(screenshot);
  const colors = await extractHexColor(screenshot);

  const board = await Board.create(text, colors);
  const results = findAllWords(board, dictionary);

  const sorted = sortResults(board, results);

  for (const { word, ...rest } of sorted) {
    console.info(printBoard(board, word, rest));
    const ok = await yesno({
      question: "More?",
      defaultValue: true,
    });
    if (!ok) {
      process.exit(0);
    }
  }
}

function sortResults(board: Board, results: Word[]) {
  const command = process.env.COMMAND || "";

  switch (command) {
    case "":
    case "solve":
      return solve.sortByMaxHexagons(board, results);
    case "grow":
      return solve.sortByMaxBlueSquares(board, results);
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

main();
