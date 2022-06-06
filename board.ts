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
const debugScore = debugFactory("scoreBoard");

export interface BoardScore {
  board: Board;
  word: Word;
  blueHexagonCount: number;
  redHexagonCount: number;
  redCleared: number;
  blueCleared: number;
  redSquaresRemaining: number;
  blueSquaresRemaining: number;
}

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

  // Count the hexagons in the board. This mutates the board, so should only
  // be called on a fresh .clone(). The board at the end has all the hexagons
  // cleared.
  // TODO: Super hexagons.
  scoreBoard(word: Word): BoardScore {
    debugScore("scoreBoard", word.toString());
    debugScore(printBoard(this));

    let redHexagonCount = 0;
    let blueHexagonCount = 0;
    let blueSquaresRemaining = 0;
    let redSquaresRemaining = 0;
    let redCleared = 0;
    let blueCleared = 0;

    const hexagonCenters = [] as { color: "red" | "blue"; node: BoardNode }[];
    for (const line of this.nodes) {
      for (const node of line) {
        const hexagonResult = node.isCenterOfHexagon();

        if (hexagonResult) {
          hexagonCenters.push({ node, color: hexagonResult });
          if (hexagonResult === "red") {
            redHexagonCount++;
          }
          if (hexagonResult === "blue") {
            blueHexagonCount++;
          }
        }
      }
    }

    for (const { node, color } of hexagonCenters) {
      const cleared = node.clearForHexagon(color);
      redCleared += cleared.redCleared;
      blueCleared += cleared.blueCleared;
    }

    debugScore("cleared", printBoard(this));

    // Count the remaining squares
    for (const line of this.nodes) {
      for (const node of line) {
        if (node.color === "red" || node.color === "very_red") {
          redSquaresRemaining++;
        }
        if (node.color === "blue" || node.color === "very_blue") {
          blueSquaresRemaining++;
        }
      }
    }

    return {
      board: this,
      word,
      redHexagonCount,
      blueHexagonCount,
      blueCleared,
      redCleared,
      blueSquaresRemaining,
      redSquaresRemaining,
    };
  }

  getNode(coords: [number, number] | BoardNode) {
    if (coords instanceof BoardNode) {
      coords = coords.coords;
    }
    return this.nodes[coords[0]][coords[1]];
  }

  clone() {
    return Board.createFromNodes(
      this.nodes.map((line) => line.map((node) => node.clone()))
    );
  }
}

export class BoardNode {
  public neighbors = new Set<BoardNode>();
  public used = false;
  public coords: [number, number] = [-1, -1];
  public amSwapped: boolean = false;
  public swappedWith: BoardNode | null = null;
  constructor(public char: string, private nodeColor: Color = "none") {}

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

    if (!backSwap) {
      this.swappedWith = node;
      node.swappedWith = this;
    } else {
      this.swappedWith = null;
      node.swappedWith = null;
    }

    const tempChar = this.char;
    this.char = node.char;
    node.char = tempChar;

    const tempColor = this.color;
    this.nodeColor = node.color;
    node.color = tempColor;

    const tempUsed = this.used;
    this.used = node.used;
    node.used = tempUsed;
  }

  setCoords(coords: [number, number]) {
    this.coords = coords;
  }

  set color(color: Color) {
    this.nodeColor = color;
  }

  get color() {
    return this.getColor();
  }

  getColor(word?: Word): Color {
    const wordNode = word?.findNode(this);
    if (wordNode) {
      if (wordNode.color === "very_blue") return "very_blue";
      if (wordNode.color === "very_red") throw new Error("invalid word node");
      return "blue";
    }

    return this.nodeColor;
  }

  clearForHexagon(hexagonColor: "blue" | "red") {
    if (hexagonColor === "red") {
      this.color = "very_red";
    }
    if (hexagonColor === "blue") {
      this.color = "very_blue";
    }

    let redCleared = 0;
    let blueCleared = 0;

    for (const neighbor of this.neighbors) {
      debugScore(
        "clearing neighbor",
        neighbor.coords,
        neighbor.char,
        neighbor.getColor()
      );
      if (neighbor.getColor() === "red") {
        redCleared++;
        neighbor.color = "none";
      } else if (neighbor.getColor() === "blue") {
        blueCleared++;
        neighbor.color = "none";
      }
    }

    return {
      redCleared,
      blueCleared,
    };
  }

  isCenterOfHexagon(): "red" | "blue" | false {
    debugScore(
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

    // Fixed squares can't be the center of hexagons, nor squares with no color.
    if (
      this.color === "very_blue" ||
      this.color === "very_red" ||
      this.color === "none"
    ) {
      return false;
    }

    let redCount = 0;
    let blueCount = 0;

    // If the node is blue or red it can be the center of a hexagon
    if (this.color === "blue") {
      blueCount++;
    } else if (this.color === "red") {
      redCount++;
    } else {
      return false;
    }

    for (let neighbor of this.neighbors) {
      debugScore("neighbor", neighbor.char, neighbor.coords, neighbor.color);
      if (neighbor.color === "blue" || neighbor.color === "very_blue") {
        blueCount++;
      } else if (neighbor.color === "red" || neighbor.color === "very_red") {
        redCount++;
      } else {
        return false;
      }
    }

    debugScore("redCount", redCount, "blueCount", blueCount);

    const hexagonColor = redCount > blueCount ? "red" : "blue";

    debugScore("hexagonColor", hexagonColor);

    return hexagonColor;
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

  findNode(node: BoardNode) {
    return this.nodes.find((n) => compareCoords(n, node));
  }

  findSwappedNode(node: BoardNode) {
    return this.nodes.find(
      (n) => n.swappedWith && compareCoords(n.swappedWith, node)
    );
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

function compareCoords(node1: BoardNode, node2: BoardNode) {
  return (
    node1.coords[0] === node2.coords[0] && node1.coords[1] === node2.coords[1]
  );
}
