import { Trie } from "./trie";
import { Board, BoardNode } from "./board";
import { loadWords } from "./util";
import { extractTextFromScreenshot } from "./ocr";
import { findAllWords } from "./solve";

async function main() {
  const dictionary = loadWords();

  const text = await extractTextFromScreenshot("./sample.png");

  const board = await Board.create(text);

  const results = findAllWords(board, dictionary);

  console.info(
    results
      .filter((wordNodes) => wordNodes.length > 5)
      .sort((a, b) => b.length - a.length)
      .map(
        (wordNodes) =>
          `${wordNodes[0].coords}: ${wordNodes
            .map((node) => node.char)
            .join("")}`
      )
  );
}

main();
