import chalk from "chalk";

import { Board, BoardNode, Word } from "./board";

export function printBoard(
  board: Board,
  word?: Word,
  score?: {
    redHexagons: number;
    blueHexagons: number;
    redCleared: number;
    blueCleared: number;
  }
) {
  const letters = [] as string[];

  for (const boardLine of board.nodes) {
    for (const node of boardLine) {
      if (word) {
        const wordNode = word.containsNode(node);
        if (wordNode) {
          if (word.isStart(wordNode)) {
            letters.push(renderNodeGreen(wordNode, true));
          } else {
            letters.push(renderNodeGreen(wordNode));
          }
        } else {
          const swappedNode = word.find(
            (node2) =>
              node2.swappedWith !== null &&
              node2.swappedWith.coords === node.coords
          );
          if (swappedNode) {
            letters.push(renderNode(swappedNode.swappedWith!));
          } else {
            letters.push(renderNode(node));
          }
        }
      } else {
        letters.push(renderNode(node));
      }
    }
  }

  return boardFromTemplate(
    letters,
    word?.toString(),
    `Hexagons: R: ${score?.redHexagons} B: ${score?.blueHexagons} Squares Cleared: R: ${score?.redCleared} B: ${score?.blueCleared}`
  );
}

function renderNodeGreen(node: BoardNode, highlight: boolean = false) {
  if (node.amSwapped) {
    if (highlight) {
      return chalk.bgGreenBright(chalk.black(node.char));
    }
    return chalk.bgGreen(chalk.black(node.char));
  } else {
    if (highlight) {
      return chalk.greenBright(node.char);
    }
    return chalk.green(node.char);
  }
}

function renderNode(node: BoardNode) {
  if (node.amSwapped) {
    if (node.color === "red") {
      return chalk.bgRedBright(node.char);
    } else if (node.color === "very_red") {
      return chalk.bgRed(node.char);
    } else if (node.color === "blue") {
      return chalk.bgBlueBright(node.char);
    } else if (node.color === "very_blue") {
      return chalk.bgBlue(node.char);
    } else {
      return chalk.bgGray(node.char);
    }
  }

  if (node.color === "red") {
    return chalk.redBright(node.char);
  } else if (node.color === "very_red") {
    return chalk.red(node.char);
  } else if (node.color === "blue") {
    return chalk.blueBright(node.char);
  } else if (node.color === "very_blue") {
    return chalk.blue(node.char);
  } else {
    return node.char;
  }
}

function boardFromTemplate(
  l: string[],
  word?: string,
  annotation?: string
): string {
  return `
  ${word || ""}${annotation !== undefined ? `(${annotation})` : ""}
                     ___
                 ___/ X \\___
             ___/ X \\___/ X \\___
         ___/ X \\___/ X \\___/ X \\___
     ___/ X \\___/ X \\___/ X \\___/ X \\___
    / X \\___/ X \\___/ X \\___/ X \\___/ X \\
    \\___/ X \\___/ X \\___/ X \\___/ X \\___/
    / X \\___/ X \\___/ X \\___/ X \\___/ X \\
    \\___/ X \\___/ X \\___/ X \\___/ X \\___/
    / X \\___/ X \\___/ X \\___/ X \\___/ X \\
    \\___/ X \\___/ X \\___/ X \\___/ X \\___/
    / X \\___/ X \\___/ X \\___/ X \\___/ X \\
    \\___/ X \\___/ X \\___/ X \\___/ X \\___/
    / X \\___/ X \\___/ X \\___/ X \\___/ X \\
    \\___/ X \\___/ X \\___/ X \\___/ X \\___/
        \\___/ X \\___/ X \\___/ X \\___/
            \\___/ X \\___/ X \\___/
                \\___/ X \\___/
                    \\___/
  `
    .split("X")
    .map((line, i) => line + (l[i] || ""))
    .join("");
}
