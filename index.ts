import * as fs from "fs";
import Tesseract from "tesseract.js";
import sharp from "sharp";

import { Trie } from "./trie";
import { Graph, Node } from "./graph";
import { loadWords, question, readline } from "./util";

// Expected lengths of the extracted lines. Lets the user correct
// if things are missed. (Likely "I" will be missed by the OCR)
const EXPECTED_LINE_LENGTHS = [
  1, 2, 3, 4, 5, 4, 5, 4, 5, 4, 5, 4, 5, 4, 3, 2, 1,
];

async function main() {
  // await sharp("./sample.png")
  //   .extract({ width: 1080, height: 1440, left: 0, top: 360 })
  //   .greyscale()
  //   .threshold()
  //   .toFile("sample-cropped.png");

  // const worker = Tesseract.createWorker({});
  // await worker.load();
  // await worker.loadLanguage("eng");
  // await worker.initialize("eng");
  // await worker.setParameters({
  //   // tessedit_pageseg_mode: Tesseract.PSM.AUTO_ONLY,
  //   tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  // });

  // const text = await worker.recognize("./sample-cropped.png");

  // await worker.terminate();

  // load words from the file
  const dictionary = loadWords();

  const text =
    "P\n" +
    "T R\n" +
    "H E A\n" +
    "S A K E\n" +
    "T I R E F\n" +
    // "T R E F\n" +
    "B L F T\n" +
    "E L T S I\n" +
    // "E L T S\n" +
    "R S I U\n" +
    // "R S U\n" +
    "D T A G C\n" +
    "A I R E\n" +
    // "A R E\n" +
    "Y B L A I\n" +
    "Y A M L\n" +
    "R R G D R\n" +
    "I E E I\n" +
    // "E E\n" +
    "F N L\n" +
    "T R\n" +
    "G\n";

  const linesRaw = text.split("\n").filter((line) => line.length > 0);
  if (linesRaw.length !== EXPECTED_LINE_LENGTHS.length) {
    throw new Error(
      `Expected ${EXPECTED_LINE_LENGTHS.length} lines, got ${linesRaw.length}`
    );
  }

  const lines = [];

  // Validate each line is the right length, and ask the user
  // to correct any that aren't.
  for (const [idx, lineStr] of linesRaw.entries()) {
    const line = lineStr.split(" ").filter((word) => word.length > 0);

    if (line.length !== EXPECTED_LINE_LENGTHS[idx]) {
      console.log(
        `Line ${idx} is ${line.length} characters long, expected ${EXPECTED_LINE_LENGTHS[idx]}.`
      );

      const newLine = await question(`Enter new line (got ${line}): `);
      lines[idx] = newLine.split("").map((char) => char.toUpperCase().trim());
    } else {
      lines[idx] = line;
    }
  }

  readline.close();

  const graph = Graph.create(lines);

  const words = [] as ReturnType<typeof getWords>;
  for (const line of graph.nodes) {
    for (const node of line) {
      console.info("Starting at node", node.char, node.coords);
      words.push(...getWords(graph, node, node, "", dictionary));
    }
  }

  console.log(
    words
      .filter(({ word }) => word.length > 5)
      .map(({ startNode, word }) => `${startNode.coords}: ${word}`)
  );
}

// Recursively find the words in the graph
function getWords(
  graph: Graph,
  startNode: Node,
  currentNode: Node,
  accumulation: string,
  dictionary: Trie
): { startNode: Node; word: string }[] {
  console.log(`Working on '${accumulation}'`);
  if (accumulation.length > 10) {
    return [];
  }
  // Check if the trie contains the accumulation
  if (!dictionary.containsPrefix(accumulation)) {
    return [];
  }

  const words = [] as { startNode: Node; word: string }[];

  currentNode.used = true;
  if (dictionary.contains(accumulation + currentNode.char)) {
    words.push({ startNode, word: accumulation + currentNode.char });
  }
  accumulation = accumulation + currentNode.char;

  for (const neighbor of currentNode.neighbors) {
    if (neighbor.used) {
      continue;
    }
    neighbor.used = true;
    words.push(
      ...getWords(graph.copy(), startNode, neighbor, accumulation, dictionary)
    );
    neighbor.used = false;
  }

  return words;
}

main();
