import { Board } from "./board";
import { loadWords, question } from "./util";
import { extractTextFromScreenshot } from "./ocr";
import { findAllWords } from "./solve";
import { printBoard } from "./format";
import { extractHexColor } from "./extract_colors";
import { sortWords } from "./score";
import yesno from "yesno";

async function main() {
  const screenshot = "sample.png";

  const dictionary = loadWords();
  const text = await extractTextFromScreenshot(screenshot);
  const colors = await extractHexColor(screenshot);

  const board = await Board.create(text, colors);
  const results = findAllWords(board, dictionary);

  const sorted = sortWords(board, results);

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

main();
