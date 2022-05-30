import debugFactory from "debug";
import { Color } from "./extract_colors";
import { printBoard } from "./format";
import { question } from "./util";

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
      const line = lineStr.split("").filter((word) => word.trim().length > 0);

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

    debug("lines", lines);

    const nodes = lines.map((line, lineNum) =>
      line.map(({ char, color }) => new BoardNode(char, color))
    );

    return this.createFromNodes(nodes);
  }

  static createFromNodes(nodes: BoardNode[][]) {
    const board = new Board(nodes);

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

    return board;
  }

  // Count the hexagons in the board. This can also use the given word
  // to calculate the result as if that word had been played. The word
  // nodes should not be nodes that are already in the board.
  countHexagons(word?: Word): {
    redCount: number;
    blueCount: number;
    redCleared: number;
    blueCleared: number;
  } {
    debug("Board");
    debug(printBoard(this, word));
    let redCount = 0;
    let blueCount = 0;
    let blueCleared: Set<string> = new Set();
    let redCleared: Set<string> = new Set();
    for (const line of this.nodes) {
      for (const node of line) {
        const hexagonResult = node.isCenterOfHexagon(word);

        if (hexagonResult) {
          if (hexagonResult.color === "red") {
            redCount++;
          }
          if (hexagonResult.color === "blue") {
            blueCount++;
          }
          hexagonResult.blueCleared.forEach((node) =>
            blueCleared.add(JSON.stringify(node.coords))
          );
          hexagonResult.redCleared.forEach((node) =>
            redCleared.add(JSON.stringify(node.coords))
          );
        }
      }
    }
    return {
      redCount,
      blueCount,
      blueCleared: blueCleared.size,
      redCleared: redCleared.size,
    };
  }
}

export class BoardNode {
  public neighbors = new Set<BoardNode>();
  public used = false;
  public coords: [number, number] = [-1, -1];
  public amSwapped: boolean = false;
  public swappedWith: BoardNode | null = null;
  constructor(public char: string, public color?: Color) {}

  addNeighbor(node?: BoardNode) {
    if (!node || this.neighbors.has(node)) {
      return;
    }

    this.neighbors.add(node);
    node.addNeighbor(this);
  }

  swapWith(node: BoardNode, backSwap: boolean = false) {
    this.amSwapped = !backSwap;
    node.amSwapped = !backSwap;

    this.swappedWith = node;
    node.swappedWith = this;

    const tempChar = this.char;
    this.char = node.char;
    node.char = tempChar;

    const tempColor = this.color;
    this.color = node.color;
    node.color = tempColor;

    const tempUsed = this.used;
    this.used = node.used;
    node.used = tempUsed;
  }

  setCoords(coords: [number, number]) {
    this.coords = coords;
  }

  isCenterOfHexagon(word?: Word):
    | {
        redCleared: BoardNode[];
        blueCleared: BoardNode[];
        color: "red" | "blue";
      }
    | false {
    debug(
      "check if center",
      this.char,
      this.coords,
      this.color,
      this.neighbors.size
    );

    // Cannot be the center of the hexagon if it has less than 6 neighbors
    if (this.neighbors.size !== 6) {
      return false;
    }

    const centerWordNode = word?.containsNode(this);

    // Fixed squares can't be the center of hexagons, nor squares with no color.
    if (
      (this.color === "very_blue" ||
        this.color === "very_red" ||
        this.color === "none") &&
      !centerWordNode
    ) {
      return false;
    }

    let redCleared = [] as BoardNode[];
    let redCount = 0;
    let blueCount = 0;
    let blueCleared = [] as BoardNode[];

    // If the node is blue or red, or its a word node it can be the center of a hexagon
    if (this.color === "blue" || centerWordNode) {
      blueCount++;
    } else if (this.color === "red") {
      redCount++;
    } else {
      return false;
    }

    for (const neighbor of this.neighbors) {
      debug("neighbor", neighbor.char, neighbor.coords, neighbor.color);
      const wordNode = word?.containsNode(neighbor);
      if (wordNode) {
        debug("Word Node", wordNode.char, wordNode.coords, wordNode.color);
        blueCount++;
      } else if (neighbor.color === "blue") {
        blueCount++;
        blueCleared.push(neighbor.clone());
      } else if (neighbor.color === "red") {
        redCount++;
        redCleared.push(neighbor.clone());
      } else if (neighbor.color === "very_blue") {
        blueCount++;
      } else if (neighbor.color === "very_red") {
        redCount++;
      } else {
        return false;
      }
    }

    const hexagonColor = redCount > blueCount ? "red" : "blue";

    debug(
      "redCleared",
      redCleared.length,
      "blueCleared",
      blueCleared.length,
      "hexagonColor",
      hexagonColor
    );

    return {
      redCleared,
      blueCleared,
      color: hexagonColor,
    };
  }

  clone(recurse = true) {
    const node = new BoardNode(this.char, this.color);
    node.used = this.used;
    node.coords = this.coords;
    node.amSwapped = this.amSwapped;

    if (recurse && this.swappedWith) {
      node.swappedWith = this.swappedWith.clone(false);
      node.swappedWith!.swappedWith = node;
    }

    return node;
  }
}

export class Word {
  public nodes: BoardNode[] = [];

  constructor(fromNodes: BoardNode[]) {
    this.nodes = fromNodes.map((node) => node.clone());
  }

  toString() {
    return this.nodes.map((node) => node.char).join("");
  }

  containsNode(node: BoardNode) {
    return this.nodes.find((n) => n.coords === node.coords);
  }

  isStart(node: BoardNode) {
    return this.nodes[0] === node;
  }

  get length() {
    return this.nodes.length;
  }

  find(fn: (node: BoardNode) => boolean) {
    return this.nodes.find(fn);
  }
}
