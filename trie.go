package main

import "strings"

const (
	//ALBHABET_SIZE total characters in english alphabet
	ALBHABET_SIZE = 26
)

type trieNode struct {
	childrens [ALBHABET_SIZE]*trieNode
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
	word = strings.ToLower(word)
	wordLength := len(word)
	current := t.root
	for i := 0; i < wordLength; i++ {
		index := word[i] - 'a'
		if current.childrens[index] == nil {
			current.childrens[index] = &trieNode{}
		}
		current = current.childrens[index]
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

func (t *Trie) Find(word string) FindResult {
	word = strings.ToLower(word)
	result := FindResult{
		IsWord:   false,
		IsPrefix: false,
	}
	wordLength := len(word)
	current := t.root
	for i := 0; i < wordLength; i++ {
		index := word[i] - 'a'
		if current.childrens[index] == nil {
			return result
		}
		current = current.childrens[index]
	}
	result.IsPrefix = current.isPrefix
	if current.isWordEnd {
		result.IsWord = true
	}
	return result
}
