import debugFactory from "debug";

import { Board, BoardNode } from "./board";
import { Trie } from "./trie";

const debug = debugFactory("solve");

export function findAllWords(board: Board, dictionary: Trie) {
  const words = [] as ReturnType<typeof getWords>;
  for (const line of board.nodes) {
    for (const node of line) {
      debug("Starting at node", node.char, node.coords);
      words.push(...getWords(board, node, [], dictionary));
    }
  }

  return words;
}

// Recursively find the words in the graph
function getWords(
  board: Board,
  node: BoardNode,
  accumulation: BoardNode[],
  dictionary: Trie
): BoardNode[][] {
  accumulation.push(node);
  node.used = true;

  const accumulatedString = getStringFromNodes(accumulation);
  debug(`Working on '${accumulatedString}'`);
  // Check if the trie contains the accumulation
  if (!dictionary.containsPrefix(accumulatedString)) {
    accumulation.pop();
    node.used = false;
    return [];
  }

  const words = [] as BoardNode[][];

  if (dictionary.contains(accumulatedString)) {
    debug("Found word:", accumulatedString);
    words.push([...accumulation]);
  }

  for (const neighbor of node.neighbors) {
    if (
      neighbor.used ||
      neighbor.color === "red" ||
      neighbor.color === "very_red"
    ) {
      continue;
    }
    words.push(...getWords(board, neighbor, accumulation, dictionary));
  }

  accumulation.pop();
  node.used = false;
  return words;
}

function getStringFromNodes(nodes: BoardNode[]): string {
  return nodes.map((node) => node.char).join("");
}
