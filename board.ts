import debugFactory from "debug";
import { Color } from "./extract_colors";
import { question } from "./util";

// Expected lengths of the extracted lines. Lets the user correct
// if things are missed. (Likely "I" will be missed by the OCR)
const EXPECTED_LINE_LENGTHS = [
  1, 2, 3, 4, 5, 4, 5, 4, 5, 4, 5, 4, 5, 4, 3, 2, 1,
];

const debug = debugFactory("board");
const debugScore = debugFactory("scoreBoard");
const debugSuper = debugFactory("superhexagon");

export interface BoardScore {
  board: Board;
  word: Word;
  blueHexagonCount: number;
  redHexagonCount: number;
  redCleared: number;
  blueCleared: number;
  redSquaresRemaining: number;
  blueSquaresRemaining: number;
  numSuperHexagons: number;
}

type Coords = [number, number];

// Graph to represent the hexagonal board
export class Board {
  public redScore = 0;
  public blueScore = 0;
  public probability = 1;
  public nodes: BoardNode[][] = [];
  constructor() {}

  static async create(
    text: string,
    colors: Color[],
    blueScore: number | undefined,
    redScore: number | undefined
  ) {
    // validate the text input first
    const linesRaw = text.split("\n").filter((line) => line.length > 0);
    if (debug.enabled) debug("linesRaw", linesRaw);
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
        console.info(
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

    if (blueScore === undefined) {
      blueScore = parseInt(await question("Enter blue score: "));
    }

    if (redScore === undefined) {
      redScore = parseInt(await question("Enter red score: "));
    }

    if (debug.enabled) debug("lines", lines);

    const board = new Board();

    const nodes = lines.map((line, lineNum) =>
      line.map(
        ({ char, color }, nodeNum) =>
          new BoardNode(char, color, [lineNum, nodeNum], board)
      )
    );
    board.nodes = nodes;

    return board;
  }

  static createFromNodes(
    nodes: BoardNode[][],
    blueScore: number,
    redScore: number
  ) {
    const board = new Board();
    board.nodes = nodes.map((line) =>
      line.map((node) => {
        return node.clone(board);
      })
    );
    board.blueScore = blueScore;
    board.redScore = redScore;
    return board;
  }

  hash(node: BoardNode, mover: "red" | "blue", accumulation: BoardNode[]) {
    return (
      node.char +
      JSON.stringify(node.coords) +
      mover +
      accumulation.map((node) => node.char).join("") +
      this.nodes
        .map((line) =>
          line
            .map(
              (node) =>
                `${node.char}${getShortColor(node.color)}${
                  node.isCleared ? "c" : "n"
                }`
            )
            .join("")
        )
        .join("")
    );
  }

  getNode(coords: [number, number] | BoardNode) {
    if (coords instanceof BoardNode) {
      coords = coords.coords;
    }
    return this.nodes[coords[0]][coords[1]];
  }

  clone() {
    return Board.createFromNodes(this.nodes, this.blueScore, this.redScore);
  }

  getNeighbors(coords: Coords | BoardNode) {
    if (coords instanceof BoardNode) {
      coords = coords.coords;
    }
    const neighborCoords = NODE_TO_NEIGHBOR_COORDS[coords[0]][coords[1]];

    return neighborCoords.map((coords) => this.getNode(coords));
  }
}

function getShortColor(color: Color): string {
  switch (color) {
    case "blue":
      return "b";
    case "red":
      return "r";
    case "very_red":
      return "vr";
    case "very_blue":
      return "vb";
    case "none":
      return "n";
  }
}

export class BoardNode {
  public used = false;
  public swappedWith: [number, number] | null = null;
  public isCleared: boolean = false;
  constructor(
    public char: string,
    private nodeColor: Color = "none",
    public coords: Coords,
    private board?: Board
  ) {}

  get amSwapped() {
    return this.swappedWith !== null;
  }

  get neighbors() {
    if (!this.board) {
      return [];
    }

    return this.board.getNeighbors(this);
  }

  swapWith(node: BoardNode, unswap: boolean = false) {
    if (unswap) {
      this.swappedWith = null;
      node.swappedWith = null;
    } else {
      this.swappedWith = node.coords;
      node.swappedWith = this.coords;
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

    const tempIsCleared = this.isCleared;
    this.isCleared = node.isCleared;
    node.isCleared = tempIsCleared;
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

  isOpposingColor(mover: "red" | "blue") {
    switch (mover) {
      case "red":
        return this.color === "blue" || this.color === "very_blue";
      case "blue":
        return this.color === "red" || this.color === "very_red";
    }
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

  checkAndClearSuperHexagon(): number | false {
    if (debugSuper.enabled)
      debugSuper(
        "checkAndClearSuperHexagon",
        this.coords,
        this.char,
        this.color
      );
    if (this.color !== "very_blue" && this.color !== "very_red") return false;

    if (this.neighbors.length !== 6) return false;

    for (const neighbor of this.neighbors) {
      if (debugSuper.enabled)
        debugSuper("neighbor", neighbor.coords, neighbor.char, neighbor.color);
      if (neighbor.color !== "very_red" && neighbor.color !== "very_blue") {
        return false;
      }
    }

    if (debugSuper.enabled) debugSuper("clear");

    // This is a superhexagon. Clear it.
    for (const neighbor of this.neighbors) {
      neighbor.clear();
    }
    this.clear();

    // The number of hexagons cleared
    return 7;
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
      if (debugScore.enabled)
        debugScore(
          "clearing neighbor",
          neighbor.coords,
          neighbor.char,
          neighbor.getColor()
        );
      if (neighbor.getColor() === "red") {
        redCleared++;
        neighbor.clear();
      } else if (neighbor.getColor() === "blue") {
        blueCleared++;
        neighbor.clear();
      }
    }

    return {
      redCleared,
      blueCleared,
    };
  }

  isCenterOfHexagon(): "red" | "blue" | false {
    if (debugScore.enabled)
      debugScore(
        "check if center",
        this.char,
        this.coords,
        this.color,
        this.neighbors.length
      );

    // Cannot be the center of the hexagon if it has less than 6 neighbors
    if (this.neighbors.length !== 6) {
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
      if (debugScore.enabled)
        debugScore("neighbor", neighbor.char, neighbor.coords, neighbor.color);
      if (neighbor.color === "blue" || neighbor.color === "very_blue") {
        blueCount++;
      } else if (neighbor.color === "red" || neighbor.color === "very_red") {
        redCount++;
      } else {
        return false;
      }
    }

    if (debugScore.enabled)
      debugScore("redCount", redCount, "blueCount", blueCount);

    const hexagonColor = redCount > blueCount ? "red" : "blue";

    if (debugScore.enabled) debugScore("hexagonColor", hexagonColor);

    return hexagonColor;
  }

  clear() {
    this.color = "none";
    this.isCleared = true;
  }

  clone(board?: Board) {
    const node = new BoardNode(this.char, this.color, [...this.coords], board);
    node.used = this.used;
    node.coords = this.coords;
    node.swappedWith = this.swappedWith
      ? [this.swappedWith[0], this.swappedWith[1]]
      : null;

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
    return this.nodes.find((n) => compareCoords(n.coords, node.coords));
  }

  findSwappedNode(node: BoardNode) {
    return this.nodes.find(
      (n) => n.swappedWith && compareCoords(n.swappedWith, node.coords)
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

function compareCoords(node1: Coords, node2: Coords) {
  return node1[0] === node2[0] && node1[1] === node2[1];
}

const NODE_TO_NEIGHBOR_COORDS: Coords[][][] = [
  [
    [
      [1, 0],
      [1, 1],
      [2, 1],
    ],
  ],
  [
    [
      [0, 0],
      [2, 0],
      [2, 1],
      [3, 1],
    ],
    [
      [0, 0],
      [2, 1],
      [2, 2],
      [3, 2],
    ],
  ],
  [
    [
      [1, 0],
      [3, 0],
      [3, 1],
      [4, 1],
    ],
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [3, 1],
      [3, 2],
      [4, 2],
    ],
    [
      [1, 1],
      [3, 2],
      [3, 3],
      [4, 3],
    ],
  ],
  [
    [
      [2, 0],
      [4, 0],
      [4, 1],
      [5, 0],
    ],
    [
      [1, 0],
      [2, 0],
      [2, 1],
      [4, 1],
      [4, 2],
      [5, 1],
    ],
    [
      [1, 1],
      [2, 1],
      [2, 2],
      [4, 2],
      [4, 3],
      [5, 2],
    ],
    [
      [2, 2],
      [4, 3],
      [4, 4],
      [5, 3],
    ],
  ],
  [
    [
      [3, 0],
      [5, 0],
      [6, 0],
    ],
    [
      [2, 0],
      [3, 0],
      [3, 1],
      [5, 0],
      [5, 1],
      [6, 1],
    ],
    [
      [2, 1],
      [3, 1],
      [3, 2],
      [5, 1],
      [5, 2],
      [6, 2],
    ],
    [
      [2, 2],
      [3, 2],
      [3, 3],
      [5, 2],
      [5, 3],
      [6, 3],
    ],
    [
      [3, 3],
      [5, 3],
      [6, 4],
    ],
  ],
  [
    [
      [3, 0],
      [4, 0],
      [4, 1],
      [6, 0],
      [6, 1],
      [7, 0],
    ],
    [
      [3, 1],
      [4, 1],
      [4, 2],
      [6, 1],
      [6, 2],
      [7, 1],
    ],
    [
      [3, 2],
      [4, 2],
      [4, 3],
      [6, 2],
      [6, 3],
      [7, 2],
    ],
    [
      [3, 3],
      [4, 3],
      [4, 4],
      [6, 3],
      [6, 4],
      [7, 3],
    ],
  ],
  [
    [
      [4, 0],
      [5, 0],
      [7, 0],
      [8, 0],
    ],
    [
      [4, 1],
      [5, 0],
      [5, 1],
      [7, 0],
      [7, 1],
      [8, 1],
    ],
    [
      [4, 2],
      [5, 1],
      [5, 2],
      [7, 1],
      [7, 2],
      [8, 2],
    ],
    [
      [4, 3],
      [5, 2],
      [5, 3],
      [7, 2],
      [7, 3],
      [8, 3],
    ],
    [
      [4, 4],
      [5, 3],
      [7, 3],
      [8, 4],
    ],
  ],
  [
    [
      [5, 0],
      [6, 0],
      [6, 1],
      [8, 0],
      [8, 1],
      [9, 0],
    ],
    [
      [5, 1],
      [6, 1],
      [6, 2],
      [8, 1],
      [8, 2],
      [9, 1],
    ],
    [
      [5, 2],
      [6, 2],
      [6, 3],
      [8, 2],
      [8, 3],
      [9, 2],
    ],
    [
      [5, 3],
      [6, 3],
      [6, 4],
      [8, 3],
      [8, 4],
      [9, 3],
    ],
  ],
  [
    [
      [6, 0],
      [7, 0],
      [9, 0],
      [10, 0],
    ],
    [
      [6, 1],
      [7, 0],
      [7, 1],
      [9, 0],
      [9, 1],
      [10, 1],
    ],
    [
      [6, 2],
      [7, 1],
      [7, 2],
      [9, 1],
      [9, 2],
      [10, 2],
    ],
    [
      [6, 3],
      [7, 2],
      [7, 3],
      [9, 2],
      [9, 3],
      [10, 3],
    ],
    [
      [6, 4],
      [7, 3],
      [9, 3],
      [10, 4],
    ],
  ],
  [
    [
      [7, 0],
      [8, 0],
      [8, 1],
      [10, 0],
      [10, 1],
      [11, 0],
    ],
    [
      [7, 1],
      [8, 1],
      [8, 2],
      [10, 1],
      [10, 2],
      [11, 1],
    ],
    [
      [7, 2],
      [8, 2],
      [8, 3],
      [10, 2],
      [10, 3],
      [11, 2],
    ],
    [
      [7, 3],
      [8, 3],
      [8, 4],
      [10, 3],
      [10, 4],
      [11, 3],
    ],
  ],
  [
    [
      [8, 0],
      [9, 0],
      [11, 0],
      [12, 0],
    ],
    [
      [8, 1],
      [9, 0],
      [9, 1],
      [11, 0],
      [11, 1],
      [12, 1],
    ],
    [
      [8, 2],
      [9, 1],
      [9, 2],
      [11, 1],
      [11, 2],
      [12, 2],
    ],
    [
      [8, 3],
      [9, 2],
      [9, 3],
      [11, 2],
      [11, 3],
      [12, 3],
    ],
    [
      [8, 4],
      [9, 3],
      [11, 3],
      [12, 4],
    ],
  ],
  [
    [
      [9, 0],
      [10, 0],
      [10, 1],
      [12, 0],
      [12, 1],
      [13, 0],
    ],
    [
      [9, 1],
      [10, 1],
      [10, 2],
      [12, 1],
      [12, 2],
      [13, 1],
    ],
    [
      [9, 2],
      [10, 2],
      [10, 3],
      [12, 2],
      [12, 3],
      [13, 2],
    ],
    [
      [9, 3],
      [10, 3],
      [10, 4],
      [12, 3],
      [12, 4],
      [13, 3],
    ],
  ],
  [
    [
      [10, 0],
      [11, 0],
      [13, 0],
    ],
    [
      [10, 1],
      [11, 0],
      [11, 1],
      [13, 0],
      [13, 1],
      [14, 0],
    ],
    [
      [10, 2],
      [11, 1],
      [11, 2],
      [13, 1],
      [13, 2],
      [14, 1],
    ],
    [
      [10, 3],
      [11, 2],
      [11, 3],
      [13, 2],
      [13, 3],
      [14, 2],
    ],
    [
      [10, 4],
      [11, 3],
      [13, 3],
    ],
  ],
  [
    [
      [11, 0],
      [12, 0],
      [12, 1],
      [14, 0],
    ],
    [
      [11, 1],
      [12, 1],
      [12, 2],
      [14, 0],
      [14, 1],
      [15, 0],
    ],
    [
      [11, 2],
      [12, 2],
      [12, 3],
      [14, 1],
      [14, 2],
      [15, 1],
    ],
    [
      [11, 3],
      [12, 3],
      [12, 4],
      [14, 2],
    ],
  ],
  [
    [
      [12, 1],
      [13, 0],
      [13, 1],
      [15, 0],
    ],
    [
      [12, 2],
      [13, 1],
      [13, 2],
      [15, 0],
      [15, 1],
      [16, 0],
    ],
    [
      [12, 3],
      [13, 2],
      [13, 3],
      [15, 1],
    ],
  ],
  [
    [
      [13, 1],
      [14, 0],
      [14, 1],
      [16, 0],
    ],
    [
      [13, 2],
      [14, 1],
      [14, 2],
      [16, 0],
    ],
  ],
  [
    [
      [14, 1],
      [15, 0],
      [15, 1],
    ],
  ],
];
