import * as fs from "fs";
import readlineFactory from "readline";

import { Trie } from "./trie";

export function loadWords(): Trie {
  const words = fs.readFileSync("./scrabble_word_list.txt", "utf8").split("\n");

  const trie = new Trie();
  for (const word of words) {
    trie.insert(word.toUpperCase());
  }
  return trie;
}

export const readline = readlineFactory.createInterface({
  input: process.stdin,
  output: process.stdout,
});

export async function question(question: string): Promise<string> {
  const answer = await new Promise<string>((resolve) => {
    readline.question(question, (answer) => {
      resolve(answer);
    });
  });

  return answer;
}
