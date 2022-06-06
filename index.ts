import { Board, BoardScore, Word } from "./board";
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

  const parsedBoard = await Board.create(text, colors);
  const results = findAllWords(parsedBoard, dictionary, "red", 1);

  const sorted = sortResults(results);

  for (const { word, board, ...rest } of sorted) {
    console.info(printBoard(parsedBoard, word, rest));
    const ok = await yesno({
      question: "More?",
      defaultValue: true,
    });
    if (!ok) {
      process.exit(0);
    }
  }
}

function sortResults(results: BoardScore[]) {
  const command = process.env.COMMAND || "";

  switch (command) {
    case "":
    case "solve":
      return results.sort(solve.sortByHexagonCount);
    case "grow":
      return results.sort(solve.sortBySquaresRemaining);
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

main();
