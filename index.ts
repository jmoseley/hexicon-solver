import yesno from "yesno";
import * as fs from "fs";

import { Board } from "./board";
import { loadWords } from "./util";
import {
  extractTextFromScreenshot,
  extractCurrentScoreFromScreenshot,
} from "./ocr";
import { findAllWords } from "./solve";
import { printBoard } from "./format";
import { extractHexColor } from "./extract_colors";
import * as solve from "./score";
import { Trie } from "./trie";
import { miniMax } from "./minimax";

async function main() {
  const screenshot = "sample.png";

  const dictionary = loadWords();
  const text = await extractTextFromScreenshot(screenshot);
  const colors = await extractHexColor(screenshot, text);

  const currentScore = await extractCurrentScoreFromScreenshot(screenshot);
  console.info("Extracted current score:", currentScore);
  const parsedBoard = Board.create(
    text,
    colors,
    currentScore.blueScore,
    currentScore.redScore
  );

  const sorted = getResults(parsedBoard, dictionary);

  if (!sorted) {
    return;
  }

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
    case "extract":
      fs.writeFileSync(
        "parsed_board.json",
        JSON.stringify(parsedBoard.toJson(), null, 2)
      );
      return;
    case "":
    case "solve":
      return findAllWords(parsedBoard, dictionary, "blue").sort(
        solve.sortByHexagonCount("blue")
      );
    case "grow":
      return findAllWords(parsedBoard, dictionary, "blue").sort(
        solve.sortBySquaresRemaining("blue")
      );
    case "minimax":
      const result = miniMax(parsedBoard, dictionary);
      return [result];
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

main();
