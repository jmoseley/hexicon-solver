import debugFactory from "debug";

import { Board, BoardNode, BoardScore, Word } from "./board";
import { printBoard } from "./format";
import { Trie } from "./trie";

const debug = debugFactory("solve");

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function findAllWords(
  board: Board,
  dictionary: Trie,
  mover: "red" | "blue"
): BoardScore[] {
  const words = [] as ReturnType<typeof getScoredWords>;
  for (const line of board.nodes) {
    for (const node of line) {
      if (node.color === "red" || node.color === "very_red") {
        continue;
      }
      debug("Starting at node", node.char, node.coords, "turn", mover);
      if (node.isCleared) {
        for (const letter of LETTERS) {
          node.char = letter;
          node.isCleared = false;
          words.push(
            ...getScoredWords(board, node, [], dictionary, mover, 1 / 26, false)
          );
        }
        node.isCleared = true;
      } else {
        words.push(
          ...getScoredWords(board, node, [], dictionary, mover, 1, false)
        );
      }

      // Run the search with this node swapped with any of its neighbors
      for (const neighbor of node.neighbors) {
        if (neighbor.color === "very_red" || neighbor.color === "very_blue") {
          continue;
        }
        node.swapWith(neighbor);
        debug("Starting at swapped node", node.char, node.coords);
        words.push(
          ...getScoredWords(board, node, [], dictionary, mover, 1, true)
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
  if (probability < 0.01) {
    return [];
  }

  if (node.used || node.isOpposingColor(mover)) {
    return [];
  }

  const words = [] as BoardScore[];

  if (!node.isCleared) {
    let originalColor = node.color;
    try {
      accumulation.push(node);
      node.used = true;
      if (node.color === "none") {
        node.color = mover;
      }

      const accumulatedString = getStringFromNodes(accumulation);
      if (dictionary.contains(accumulatedString)) {
        debug("Found word:", accumulatedString);
        words.push(
          Board.scoreBoard(board, new Word(accumulation), probability)
        );
      }

      // Check if the trie contains the accumulation
      const nextLetters = dictionary.containsPrefix(accumulatedString);
      if (!nextLetters) {
        return [];
      }

      debug("getWords", "hasSwapped", hasSwapped, node.char, accumulatedString);
      debug(printBoard(board, new Word(accumulation)));

      for (const neighbor of node.neighbors) {
        if (
          !hasSwapped &&
          !neighbor.used &&
          neighbor.color !== "very_red" &&
          neighbor.color !== "very_blue"
        ) {
          for (const neighborNeighbor of neighbor.neighbors) {
            if (
              neighborNeighbor.used ||
              neighborNeighbor.color === "very_red" ||
              neighborNeighbor.color === "very_blue" ||
              neighborNeighbor.coords === node.coords
            ) {
              continue;
            }

            if (!nextLetters[neighborNeighbor.char]) {
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

        if (!nextLetters[neighbor.char]) {
          continue;
        }

        words.push(
          ...getScoredWords(
            board,
            neighbor,
            accumulation,
            dictionary,
            mover,
            probability,
            hasSwapped
          )
        );
      }
    } finally {
      node.used = false;
      node.color = originalColor;
      accumulation.pop();
    }
  } else {
    debug("node isCleared", node.char, node.coords);

    const originalChar = node.char;
    for (const letter of LETTERS) {
      node.char = letter;
      node.isCleared = false;

      words.push(
        ...getScoredWords(
          board,
          node,
          accumulation,
          dictionary,
          mover,
          probability * (1 / 26),
          hasSwapped
        )
      );
    }
    node.char = originalChar;
    node.isCleared = true;
  }

  return words;
}

function getStringFromNodes(nodes: BoardNode[]): string {
  return nodes.map((node) => node.char).join("");
}
