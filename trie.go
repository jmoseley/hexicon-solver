package main

import (
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
	IsWord   bool
	IsPrefix bool
}

func (t *Trie) Find(nodes []*BoardNode) FindResult {
	result := FindResult{
		IsWord:   false,
		IsPrefix: false,
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
	return result
}

func (t *Trie) NextLetters(prefix []*BoardNode) []byte {
	result := []byte{}
	current := t.root
	for _, node := range prefix {
		index := node.Letter - 'A'
		if current.children[index] == nil {
			return result
		}
		current = current.children[index]
	}
	for i := 0; i < ALPHABET_SIZE; i++ {
		if current.children[i] != nil {
			result = append(result, byte(i+'A'))
		}
	}
	return result
}
