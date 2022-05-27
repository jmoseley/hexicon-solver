import debugFactory from "debug";
import { Color } from "./extract_colors";
import { question, readline } from "./util";

// Expected lengths of the extracted lines. Lets the user correct
// if things are missed. (Likely "I" will be missed by the OCR)
const EXPECTED_LINE_LENGTHS = [
  1, 2, 3, 4, 5, 4, 5, 4, 5, 4, 5, 4, 5, 4, 3, 2, 1,
];

const debug = debugFactory("board");

// Graph to represent the hexagonal board
export class Board {
  constructor(public nodes: BoardNode[][]) {}

  static async create(text: string, colors: Color[]) {
    // validate the text input first
    const linesRaw = text.split("\n").filter((line) => line.length > 0);
    debug("linesRaw", linesRaw);
    if (linesRaw.length !== EXPECTED_LINE_LENGTHS.length) {
      throw new Error(
        `Expected ${EXPECTED_LINE_LENGTHS.length} lines, got ${linesRaw.length}`
      );
    }
    const lines = [] as { char: string; color: Color }[][];

    // Validate each line is the right length, and ask the user
    // to correct any that aren't.
    let colorPosition = 0;
    for (const [idx, lineStr] of linesRaw.entries()) {
      const line = lineStr.split(" ").filter((word) => word.length > 0);

      if (line.length !== EXPECTED_LINE_LENGTHS[idx]) {
        console.log(
          `Line ${idx} is ${line.length} characters long, expected ${EXPECTED_LINE_LENGTHS[idx]}.`
        );

        const newLine = await question(`Enter new line (got ${line}): `);
        lines[idx] = newLine.split("").map((char) => {
          return {
            char: char.toUpperCase().trim(),
            color: colors[colorPosition++],
          };
        });
      } else {
        lines[idx] = line.map((char) => {
          return {
            char: char.toUpperCase().trim(),
            color: colors[colorPosition++],
          };
        });
      }
    }

    readline.close();

    debug("lines", lines);

    const nodes = lines.map((line, lineNum) =>
      line.map(({ char, color }) => new BoardNode(char, color))
    );

    return this.createFromNodes(nodes);
  }

  static createFromNodes(nodes: BoardNode[][]) {
    const boards = new Board(nodes);

    for (const [lineNum, line] of nodes.entries()) {
      debug("lineNum", lineNum);
      for (const [nodeNum, node] of line.entries()) {
        node.setCoords([lineNum, nodeNum]);
        debug("For node: ", node.char);

        // This is the upper area
        if (lineNum < 3) {
          node.addNeighbor(nodes[lineNum + 1]?.[nodeNum]);
          debug(`1. Added ${nodes[lineNum + 1]?.[nodeNum]?.char}`);
          node.addNeighbor(nodes[lineNum + 1]?.[nodeNum + 1]);
          debug(`2. Added ${nodes[lineNum + 1]?.[nodeNum + 1]?.char}`);
          node.addNeighbor(nodes[lineNum + 2]?.[nodeNum + 1]);
          debug(`3. Added ${nodes[lineNum + 2]?.[nodeNum + 1]?.char}`);
        }
        // this is the mid area
        else if (lineNum < 12) {
          if (line.length === 4) {
            node.addNeighbor(nodes[lineNum + 1]?.[nodeNum]);
            debug(`1. Added ${nodes[lineNum + 1][nodeNum]?.char}`);
            node.addNeighbor(nodes[lineNum + 1]?.[nodeNum + 1]);
            debug(`2. Added ${nodes[lineNum + 1][nodeNum + 1]?.char}`);
            node.addNeighbor(nodes[lineNum + 2]?.[nodeNum]);
            debug(`3. Added ${nodes[lineNum + 2][nodeNum]?.char}`);
          } else {
            node.addNeighbor(nodes[lineNum + 1]?.[nodeNum - 1]);
            debug(`1. Added ${nodes[lineNum + 1][nodeNum - 1]?.char}`);
            node.addNeighbor(nodes[lineNum + 1]?.[nodeNum]);
            debug(`2. Added ${nodes[lineNum + 1][nodeNum]?.char}`);
            node.addNeighbor(nodes[lineNum + 2]?.[nodeNum]);
            debug(`3. Added ${nodes[lineNum + 2][nodeNum]?.char}`);
          }
        }
        // this is the lower area
        else {
          node.addNeighbor(nodes[lineNum + 1]?.[nodeNum - 1]);
          debug(`1. Added ${nodes[lineNum + 1]?.[nodeNum - 1]?.char}`);
          node.addNeighbor(nodes[lineNum + 1]?.[nodeNum]);
          debug(`2. Added ${nodes[lineNum + 1]?.[nodeNum]?.char}`);
          node.addNeighbor(nodes[lineNum + 2]?.[nodeNum - 1]);
          debug(`3. Added ${nodes[lineNum + 2]?.[nodeNum - 1]?.char}`);
        }
      }
    }

    return boards;
  }
}

export class BoardNode {
  public neighbors = new Set<BoardNode>();
  public used = false;
  public coords: [number, number] = [-1, -1];
  constructor(public char: string, public color?: Color) {}

  addNeighbor(node?: BoardNode) {
    if (!node || this.neighbors.has(node)) {
      return;
    }

    this.neighbors.add(node);
    node.addNeighbor(this);
  }

  setCoords(coords: [number, number]) {
    this.coords = coords;
  }
}
