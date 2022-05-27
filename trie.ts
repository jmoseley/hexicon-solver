export class Trie {
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
