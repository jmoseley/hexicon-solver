import debugFactory from "debug";

import { Board, BoardNode } from "./board";
import { Trie } from "./trie";

const debug = debugFactory("solve");

export function findAllWords(board: Board, dictionary: Trie) {
  const words = [] as ReturnType<typeof getWords>;
  for (const line of board.nodes) {
    for (const node of line) {
      debug("Starting at node", node.char, node.coords);
      words.push(...getWords(board, node, node, "", dictionary));
    }
  }

  return words;
}

// Recursively find the words in the graph
function getWords(
  board: Board,
  startNode: BoardNode,
  currentNode: BoardNode,
  accumulation: string,
  dictionary: Trie
): { startNode: BoardNode; word: string }[] {
  debug(`Working on '${accumulation}'`);
  if (accumulation.length > 10) {
    return [];
  }
  // Check if the trie contains the accumulation
  if (!dictionary.containsPrefix(accumulation)) {
    return [];
  }

  const words = [] as { startNode: BoardNode; word: string }[];

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
      ...getWords(board.copy(), startNode, neighbor, accumulation, dictionary)
    );
    neighbor.used = false;
  }

  return words;
}
