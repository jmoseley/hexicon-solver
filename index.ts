import { Trie } from "./trie";
import { Board, BoardNode } from "./board";
import { loadWords } from "./util";
import { extractTextFromScreenshot } from "./ocr";
import { findAllWords } from "./solve";

async function main() {
  const dictionary = loadWords();

  const text = await extractTextFromScreenshot("./sample.png");

  const graph = await Board.create(text);

  const results = findAllWords(graph, dictionary);

  console.info(
    results
      .filter(({ word }) => word.length > 5)
      .map(({ startNode, word }) => `${startNode.coords}: ${word}`)
  );
}

main();
