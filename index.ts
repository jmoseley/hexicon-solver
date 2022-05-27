import * as fs from "fs";
import Tesseract from "tesseract.js";
import sharp from "sharp";
import readlineFactory from "readline";
// import { Trie, TrieNode } from "@datastructures-js/trie";

const readline = readlineFactory.createInterface({
  input: process.stdin,
  output: process.stdout,
});

class Trie {
  private root = new TrieNode(null, null);
  constructor() {}

  insert(word: string) {
    let node = this.root; // we start at the root

    // for every character in the word
    for (let i = 0; i < word.length; i++) {
      // check to see if character node exists in children.
      if (!node.children[word[i]]) {
        // if it doesn't exist, we then create it.
        node.children[word[i]] = new TrieNode(word[i], node);
      }

      // proceed to the next depth in the trie.
      node = node.children[word[i]];

      // finally, we check to see if it's the last word.
      if (i == word.length - 1) {
        // if it is, we set the end flag to true.
        node.end = true;
      }
    }
  }

  contains(word: string) {
    let node = this.root;

    // for every character in the word
    for (let i = 0; i < word.length; i++) {
      // check to see if character node exists in children.
      if (node.children[word[i]]) {
        // if it exists, proceed to the next depth of the trie.
        node = node.children[word[i]];
      } else {
        // doesn't exist, return false since it's not a valid word.
        return false;
      }
    }

    // we finished going through all the words, but is it a whole word?
    return node.end;
  }

  containsPrefix(prefix: string) {
    let node = this.root;

    if (prefix.length === 0) {
      return true;
    }

    // for every character in the prefix
    for (let i = 0; i < prefix.length; i++) {
      // make sure prefix actually has words
      if (node.children[prefix[i]]) {
        node = node.children[prefix[i]];
      } else {
        // there's none. just return it.
        return false;
      }
    }

    return true;
  }

  find(prefix: string) {
    let node = this.root;
    let output = [] as string[];

    // for every character in the prefix
    for (let i = 0; i < prefix.length; i++) {
      // make sure prefix actually has words
      if (node.children[prefix[i]]) {
        node = node.children[prefix[i]];
      } else {
        // there's none. just return it.
        return output;
      }
    }
    // recursively find all words in the node
    findAllWords(node, output);

    return output;
  }
}

const findAllWords = (node: TrieNode, arr: string[]) => {
  // base case, if node is at a word, push to output
  if (node.end) {
    arr.unshift(node.getWord());
  }

  // iterate through each children, call recursive findAllWords
  for (let child in node.children) {
    findAllWords(node.children[child], arr);
  }
};

class TrieNode {
  public children: { [key: string]: TrieNode } = {};
  public end: boolean = false;
  constructor(private key: string | null, public parent: TrieNode | null) {}

  public getWord() {
    let output = [] as string[];
    let node: TrieNode | null = this;

    while (node !== null) {
      if (node.key !== null) {
        output.unshift(node.key);
        node = node.parent;
      }
    }

    return output.join("");
  }
}

// Graph to represent the hexagonal board
class Graph {
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

class Node {
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

async function question(question: string): Promise<string> {
  const answer = await new Promise<string>((resolve) => {
    readline.question(question, (answer) => {
      resolve(answer);
    });
  });

  return answer;
}

// Expected lengths of the extracted lines. Lets the user correct
// if things are missed. (Likely "I" will be missed by the OCR)
const EXPECTED_LINE_LENGTHS = [
  1, 2, 3, 4, 5, 4, 5, 4, 5, 4, 5, 4, 5, 4, 3, 2, 1,
];

async function main() {
  // await sharp("./sample.png")
  //   .extract({ width: 1080, height: 1440, left: 0, top: 360 })
  //   .greyscale()
  //   .threshold()
  //   .toFile("sample-cropped.png");

  // const worker = Tesseract.createWorker({});
  // await worker.load();
  // await worker.loadLanguage("eng");
  // await worker.initialize("eng");
  // await worker.setParameters({
  //   // tessedit_pageseg_mode: Tesseract.PSM.AUTO_ONLY,
  //   tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  // });

  // const text = await worker.recognize("./sample-cropped.png");

  // await worker.terminate();

  // load words from the file
  const dictionary = loadWords();

  const text =
    "P\n" +
    "T R\n" +
    "H E A\n" +
    "S A K E\n" +
    "T I R E F\n" +
    // "T R E F\n" +
    "B L F T\n" +
    "E L T S I\n" +
    // "E L T S\n" +
    "R S I U\n" +
    // "R S U\n" +
    "D T A G C\n" +
    "A I R E\n" +
    // "A R E\n" +
    "Y B L A I\n" +
    "Y A M L\n" +
    "R R G D R\n" +
    "I E E I\n" +
    // "E E\n" +
    "F N L\n" +
    "T R\n" +
    "G\n";

  const linesRaw = text.split("\n").filter((line) => line.length > 0);
  if (linesRaw.length !== EXPECTED_LINE_LENGTHS.length) {
    throw new Error(
      `Expected ${EXPECTED_LINE_LENGTHS.length} lines, got ${linesRaw.length}`
    );
  }

  const lines = [];

  // Validate each line is the right length, and ask the user
  // to correct any that aren't.
  for (const [idx, lineStr] of linesRaw.entries()) {
    const line = lineStr.split(" ").filter((word) => word.length > 0);

    if (line.length !== EXPECTED_LINE_LENGTHS[idx]) {
      console.log(
        `Line ${idx} is ${line.length} characters long, expected ${EXPECTED_LINE_LENGTHS[idx]}.`
      );

      const newLine = await question(`Enter new line (got ${line}): `);
      lines[idx] = newLine.split("").map((char) => char.toUpperCase().trim());
    } else {
      lines[idx] = line;
    }
  }

  readline.close();

  const graph = Graph.create(lines);

  const words = [] as ReturnType<typeof getWords>;
  for (const line of graph.nodes) {
    for (const node of line) {
      console.info("Starting at node", node.char, node.coords);
      words.push(...getWords(graph, node, node, "", dictionary));
    }
  }

  console.log(
    words.map(({ startNode, word }) => `${startNode.coords}: ${word}`)
  );
}

// Recursively find the words in the graph
function getWords(
  graph: Graph,
  startNode: Node,
  currentNode: Node,
  accumulation: string,
  dictionary: Trie
): { startNode: Node; word: string }[] {
  console.log(`Working on '${accumulation}'`);
  if (accumulation.length > 10) {
    return [];
  }
  // Check if the trie contains the accumulation
  if (!dictionary.containsPrefix(accumulation)) {
    return [];
  }

  const words = [] as { startNode: Node; word: string }[];

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
      ...getWords(graph.copy(), startNode, neighbor, accumulation, dictionary)
    );
    neighbor.used = false;
  }

  return words;
}

function loadWords(): Trie {
  const words = fs.readFileSync("./scrabble_word_list.txt", "utf8").split("\n");

  const trie = new Trie();
  for (const word of words) {
    trie.insert(word.toUpperCase());
  }
  return trie;
}

main();
