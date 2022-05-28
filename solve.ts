import debugFactory from "debug";

import { Board, BoardNode } from "./board";
import { printBoard } from "./format";
import { Trie } from "./trie";

const debug = debugFactory("solve");

export function findAllWords(board: Board, dictionary: Trie) {
  const words = [] as ReturnType<typeof getWords>;
  for (const line of board.nodes) {
    for (const node of line) {
      if (node.color === "red" || node.color === "very_red") {
        continue;
      }
      debug("Starting at node", node.char, node.coords);
      words.push(...getWords(board, node, [], dictionary));

      // Run the search with this node swapped with any of its neighbors
      for (const neighbor of node.neighbors) {
        if (neighbor.color === "very_red" || neighbor.color === "very_blue") {
          continue;
        }
        node.swapWith(neighbor);
        debug("Starting at swapped node", node.char, node.coords);
        words.push(...getWords(board, node, [], dictionary, true));
        node.swapWith(neighbor, true);
      }
    }
  }

  return words;
}

// Recursively find the words in the graph
function getWords(
  board: Board,
  node: BoardNode,
  accumulation: BoardNode[],
  dictionary: Trie,
  hasSwapped: boolean = false
): BoardNode[][] {
  debug(
    "getWords",
    hasSwapped,
    node.char,
    accumulation.map((node) => node.char).join("")
  );
  debug(printBoard(board));
  if (node.color === "red" || node.color === "very_red") {
    return [];
  }

  // Remember to pop and mark as unused before returning
  accumulation.push(node);
  node.used = true;

  const accumulatedString = getStringFromNodes(accumulation);
  // Check if the trie contains the accumulation
  if (!dictionary.containsPrefix(accumulatedString)) {
    accumulation.pop();
    node.used = false;
    return [];
  }

  const words = [] as BoardNode[][];

  if (dictionary.contains(accumulatedString)) {
    debug("Found word:", accumulatedString);
    words.push([...accumulation.map((node) => node.clone())]);
  }

  for (const neighbor of node.neighbors) {
    if (
      neighbor.used ||
      neighbor.color === "red" ||
      neighbor.color === "very_red"
    ) {
      continue;
    }
    words.push(
      ...getWords(board, neighbor, accumulation, dictionary, hasSwapped)
    );
  }

  accumulation.pop();
  node.used = false;

  if (!hasSwapped) {
    for (const neighbor of node.neighbors) {
      if (
        neighbor.used ||
        neighbor.color === "very_red" ||
        neighbor.color === "very_blue"
      ) {
        continue;
      }
      node.swapWith(neighbor);
      words.push(...getWords(board, node, accumulation, dictionary, true));
      node.swapWith(neighbor, true);
    }
  }

  return words;
}

function getStringFromNodes(nodes: BoardNode[]): string {
  return nodes.map((node) => node.char).join("");
}
