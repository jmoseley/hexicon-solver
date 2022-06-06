import debugFactory from "debug";

import { Board, BoardNode, BoardScore, Word } from "./board";
import { printBoard } from "./format";
import { Trie } from "./trie";

const debug = debugFactory("solve");

export function findAllWords(
  board: Board,
  dictionary: Trie,
  mover: "red" | "blue",
  probability: number
): BoardScore[] {
  const words = [] as ReturnType<typeof getScoredWords>;
  for (const line of board.nodes) {
    for (const node of line) {
      if (node.color === "red" || node.color === "very_red") {
        continue;
      }
      debug("Starting at node", node.char, node.coords, "turn", mover);
      words.push(
        ...getScoredWords(
          board,
          node,
          [],
          dictionary,
          mover,
          probability,
          false
        ).map((s) => ({ ...s, probability: s.probability * probability }))
      );

      // Run the search with this node swapped with any of its neighbors
      for (const neighbor of node.neighbors) {
        if (neighbor.color === "very_red" || neighbor.color === "very_blue") {
          continue;
        }
        node.swapWith(neighbor);
        debug("Starting at swapped node", node.char, node.coords);
        words.push(
          ...getScoredWords(
            board,
            node,
            [],
            dictionary,
            mover,
            probability,
            true
          )
        );
        node.swapWith(neighbor, true);
      }
    }
  }

  return words;
}

// Recursively find the words in the graph
function getScoredWords(
  board: Board,
  node: BoardNode,
  accumulation: BoardNode[],
  dictionary: Trie,
  mover: "red" | "blue",
  probability: number,
  hasSwapped: boolean
): BoardScore[] {
  board = board.clone();
  node = board.getNode(node);
  accumulation = [...accumulation];

  if (node.used || node.isOpposingColor(mover)) {
    return [];
  }

  // Remember to pop and mark as unused before returning
  accumulation.push(node);
  const accumulatedString = getStringFromNodes(accumulation);
  // Check if the trie contains the accumulation
  if (!dictionary.containsPrefix(accumulatedString)) {
    return [];
  }

  node.used = true;
  if (!node.isVeryColor(mover)) {
    node.color = mover;
  }

  debug(
    "getWords",
    "hasSwapped",
    hasSwapped,
    node.char,
    accumulation.map((node) => node.char).join("")
  );
  debug(printBoard(board, new Word(accumulation)));

  const words = [] as BoardScore[];

  for (const neighbor of node.neighbors) {
    words.push(
      ...getScoredWords(
        board,
        neighbor,
        [...accumulation],
        dictionary,
        mover,
        probability,
        hasSwapped
      )
    );
  }

  if (!hasSwapped && node.color !== "very_red" && node.color !== "very_blue") {
    for (const neighbor of node.neighbors) {
      if (
        neighbor.used ||
        neighbor.color === "very_red" ||
        neighbor.color === "very_blue"
      ) {
        continue;
      }
      for (const neighborNeighbor of neighbor.neighbors) {
        if (
          neighborNeighbor.used ||
          neighborNeighbor.color === "very_red" ||
          neighborNeighbor.color === "very_blue"
        ) {
          continue;
        }
        neighbor.swapWith(neighborNeighbor);
        words.push(
          ...getScoredWords(
            board,
            neighbor,
            accumulation,
            dictionary,
            mover,
            probability,
            true
          )
        );
        neighbor.swapWith(neighborNeighbor, true);
      }
    }
  }

  // Must do this at the end, because scoreBoard mutates the board.
  if (dictionary.contains(accumulatedString)) {
    debug("Found word:", accumulatedString);
    words.push(board.scoreBoard(new Word(accumulation)));
  }

  return words;
}

function getStringFromNodes(nodes: BoardNode[]): string {
  return nodes.map((node) => node.char).join("");
}
