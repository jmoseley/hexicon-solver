import { Trie } from "./trie";
import { Board, Node } from "./board";
import { loadWords } from "./util";
import { extractTextFromScreenshot } from "./ocr";

async function main() {
  const dictionary = loadWords();

  const text = await extractTextFromScreenshot("./sample.png");
  console.log("ocr result", text);

  const graph = await Board.create(text);

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
  graph: Board,
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
