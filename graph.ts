// Graph to represent the hexagonal board
export class Graph {
  constructor(public nodes: Node[][]) {}

  static create(lines: string[][]) {
    const nodes = lines.map((line) => line.map((char) => new Node(char)));

    return this.createFromNodes(nodes);
  }

  static createFromNodes(nodes: Node[][]) {
    const graph = new Graph(nodes);

    // TODO: Can this be a loop or something?
    for (const [lineNum, line] of nodes.entries()) {
      // console.log("lineNum", lineNum);
      for (const [nodeNum, node] of line.entries()) {
        node.setCoords([lineNum, nodeNum]);
        // console.log("For node: ", node.char);

        // This is the upper area
        if (lineNum < 3) {
          node.addNeighbor(nodes[lineNum + 1]?.[nodeNum]);
          // console.log(`1. Added ${nodes[lineNum + 1]?.[nodeNum]?.char}`);
          node.addNeighbor(nodes[lineNum + 1]?.[nodeNum + 1]);
          // console.log(`2. Added ${nodes[lineNum + 1]?.[nodeNum + 1]?.char}`);
          node.addNeighbor(nodes[lineNum + 2]?.[nodeNum + 1]);
          // console.log(`3. Added ${nodes[lineNum + 2]?.[nodeNum + 1]?.char}`);
        }
        // this is the mid area
        else if (lineNum < 12) {
          if (line.length === 4) {
            node.addNeighbor(nodes[lineNum + 1]?.[nodeNum]);
            // console.log(`1. Added ${nodes[lineNum + 1][nodeNum]?.char}`);
            node.addNeighbor(nodes[lineNum + 1]?.[nodeNum + 1]);
            // console.log(`2. Added ${nodes[lineNum + 1][nodeNum + 1]?.char}`);
            node.addNeighbor(nodes[lineNum + 2]?.[nodeNum]);
            // console.log(`3. Added ${nodes[lineNum + 2][nodeNum]?.char}`);
          } else {
            node.addNeighbor(nodes[lineNum + 1]?.[nodeNum - 1]);
            // console.log(`1. Added ${nodes[lineNum + 1][nodeNum - 1]?.char}`);
            node.addNeighbor(nodes[lineNum + 1]?.[nodeNum]);
            // console.log(`2. Added ${nodes[lineNum + 1][nodeNum]?.char}`);
            node.addNeighbor(nodes[lineNum + 2]?.[nodeNum]);
            // console.log(`3. Added ${nodes[lineNum + 2][nodeNum]?.char}`);
          }
        }
        // this is the lower area
        else {
          node.addNeighbor(nodes[lineNum + 1]?.[nodeNum - 1]);
          // console.log(`1. Added ${nodes[lineNum + 1]?.[nodeNum - 1]?.char}`);
          node.addNeighbor(nodes[lineNum + 1]?.[nodeNum]);
          // console.log(`2. Added ${nodes[lineNum + 1]?.[nodeNum]?.char}`);
          node.addNeighbor(nodes[lineNum + 2]?.[nodeNum - 1]);
          // console.log(`3. Added ${nodes[lineNum + 2]?.[nodeNum - 1]?.char}`);
        }
      }
    }

    return graph;
  }

  copy() {
    const nodes = this.nodes.map((line) => line.map((node) => node.copy()));

    return Graph.createFromNodes(nodes);
  }
}

export class Node {
  public neighbors = new Set<Node>();
  public used = false;
  public coords: [number, number] = [-1, -1];
  constructor(public char: string) {}

  addNeighbor(node?: Node) {
    if (!node || this.neighbors.has(node)) {
      return;
    }

    this.neighbors.add(node);
    node.addNeighbor(this);
  }

  setCoords(coords: [number, number]) {
    this.coords = coords;
  }

  copy() {
    const node = new Node(this.char);
    node.used = this.used;
    node.coords = this.coords;

    return node;
  }
}
