import { Board, BoardScore, Word } from "./board";
import { loadWords } from "./util";
import { extractTextFromScreenshot } from "./ocr";
import { findAllWords } from "./solve";
import { printBoard } from "./format";
import { extractHexColor } from "./extract_colors";
import * as solve from "./score";
import yesno from "yesno";
import { Trie } from "./trie";
import { miniMax } from "./minimax";

async function main() {
  const screenshot = "sample.png";

  const dictionary = loadWords();
  const text = await extractTextFromScreenshot(screenshot);
  const colors = await extractHexColor(screenshot);

  const parsedBoard = await Board.create(text, colors);

  const sorted = getResults(parsedBoard, dictionary);

  for (const [idx, { word, board, ...rest }] of sorted.entries()) {
    console.info(printBoard(parsedBoard, word, rest));
    if (idx < sorted.length - 1) {
      const ok = await yesno({
        question: "More?",
        defaultValue: true,
      });

      if (!ok) {
        process.exit(0);
      }
    }
  }
}

function getResults(parsedBoard: Board, dictionary: Trie) {
  const command = process.env.COMMAND || "";

  switch (command) {
    case "":
    case "solve":
      return findAllWords(parsedBoard, dictionary, "blue").sort(
        solve.sortByHexagonCount
      );
    case "grow":
      return findAllWords(parsedBoard, dictionary, "blue").sort(
        solve.sortBySquaresRemaining
      );
    case "minimax":
      const result = miniMax(parsedBoard, dictionary);
      if (!result.score) {
        throw new Error("No solution found.");
      }
      return [result.score];
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

main();
