import chalk from "chalk";

import { Board, BoardNode } from "./board";

export function printWordOnBoard(board: Board, word: BoardNode[]) {
  console.info(chalk.greenBright(word.map((node) => node.char).join("")));

  const letters = [] as string[];

  for (const boardLine of board.nodes) {
    for (const node of boardLine) {
      const index = word.indexOf(node);
      if (index > -1) {
        if (index === 0) {
          letters.push(chalk.greenBright(node.char));
        } else {
          letters.push(chalk.green(node.char));
        }
      } else {
        if (node.color === "red") {
          letters.push(chalk.redBright(node.char));
        } else if (node.color === "very_red") {
          letters.push(chalk.red(node.char));
        } else if (node.color === "blue") {
          letters.push(chalk.blueBright(node.char));
        } else if (node.color === "very_blue") {
          letters.push(chalk.blue(node.char));
        } else {
          letters.push(node.char);
        }
      }
    }
  }

  console.info(boardFromTemplate(letters));
}

function boardFromTemplate(l: string[]): string {
  return `
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
