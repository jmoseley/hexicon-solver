package main

import (
	"fmt"
	"strings"
)

const (
	//ALPHABET_SIZE total characters in english alphabet
	ALPHABET_SIZE = 26
)

type trieNode struct {
	children  [ALPHABET_SIZE]*trieNode
	isWordEnd bool
	isPrefix  bool
}

type Trie struct {
	root *trieNode
}

func CreateTrie(words []string) *Trie {
	trie := initTrie()
	for _, word := range words {
		trie.insert(word)
	}

	return trie
}

func initTrie() *Trie {
	return &Trie{
		root: &trieNode{},
	}
}

func (t *Trie) insert(word string) {
	word = strings.ToUpper(word)
	wordLength := len(word)
	current := t.root
	for i := 0; i < wordLength; i++ {
		index := word[i] - 'A'
		if current.children[index] == nil {
			current.children[index] = &trieNode{}
		}
		current = current.children[index]
		if i < wordLength-1 {
			current.isPrefix = true
		}
	}
	current.isWordEnd = true
}

type FindResult struct {
	IsWord      bool
	IsPrefix    bool
	NextLetters map[byte]bool
}

func (fr FindResult) String() string {
	var b strings.Builder
	b.Grow(len(fr.NextLetters))
	for letter := range fr.NextLetters {
		b.WriteByte(letter)
	}
	return fmt.Sprintf("IsWord: %t IsPrefix: %t NextLetters: %s", fr.IsWord, fr.IsPrefix, b.String())
}

func (t *Trie) Find(nodes []*AccumulatedNode) FindResult {
	result := FindResult{
		IsWord:      false,
		IsPrefix:    false,
		NextLetters: make(map[byte]bool, ALPHABET_SIZE),
	}
	wordLength := len(nodes)
	current := t.root
	for i := 0; i < wordLength; i++ {
		index := nodes[i].Letter - 'A'
		if current.children[index] == nil {
			return result
		}
		current = current.children[index]
	}
	result.IsPrefix = current.isPrefix
	if current.isWordEnd {
		result.IsWord = true
	}
	if result.IsPrefix {
		for i := 0; i < ALPHABET_SIZE; i++ {
			if current.children[i] != nil {
				result.NextLetters[byte(i+'A')] = true
			}
		}
	}
	return result
}
