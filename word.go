package main

import (
	"fmt"
	"sort"
	"strings"
)

type WordLetter struct {
	coords  []int
	Letter  byte
	IsStart bool
}

type Word struct {
	letters      []*WordLetter
	Probability  float64
	NumGreyNodes int
}

type Move struct {
	word  *Word
	board *Board
	Mover Mover
}

func (m *Move) String() string {
	if m.board == nil {
		return m.word.String()
	} else {
		return m.board.StringWithWord(m.word)
	}
}

const MIN_WORD_LENGTH = 0

func (w *Word) String() string {
	// Join all the letters of the word
	var b strings.Builder
	b.Grow(len(w.letters))
	for _, letter := range w.letters {
		fmt.Fprintf(&b, "%c", letter.Letter)
	}
	return b.String()
}

func (w *Word) Has(coords []int) bool {
	for _, letter := range w.letters {
		if letter.coords[0] == coords[0] && letter.coords[1] == coords[1] {
			return true
		}
	}
	return false
}

func (w *Word) Get(coords []int) *WordLetter {
	for _, letter := range w.letters {
		if letter.coords[0] == coords[0] && letter.coords[1] == coords[1] {
			return letter
		}
	}
	return nil
}

func FindWords(board *Board, trie *Trie, mover Mover) []*Word {
	result := []*Word{}
	accumulation := []*BoardNode{}
	for lineNum := 0; lineNum < len(board.Nodes); lineNum++ {
		for nodeNum := 0; nodeNum < len(board.Nodes[lineNum]); nodeNum++ {
			node := board.Nodes[lineNum][nodeNum]
			// Find all the words on the board
			if !mover.IsMatching(node.Color) {
				continue
			}

			result = append(result, getWordsStartingAtNode(trie, board, mover, node, accumulation, 1.0)...)
		}
	}

	sort.Slice(result, func(i, j int) bool {
		if result[i].NumGreyNodes > result[j].NumGreyNodes {
			return true
		} else if result[i].NumGreyNodes < result[j].NumGreyNodes {
			return false
		} else {
			return len(result[i].letters) > len(result[j].letters)
		}
	})

	return result
}

var lettersArray = []byte{'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'}

func getWordsStartingAtNode(trie *Trie, board *Board, mover Mover, node *BoardNode, accumulation []*BoardNode, probability float64) []*Word {
	result := []*Word{}
	if probability < 0.01 {
		return result
	}

	if node.cleared {
		originalLetter := node.Letter
		for _, letter := range lettersArray {
			node.Letter = letter
			node.cleared = false
			result = append(result, getWordsStartingAtNode(trie, board, mover, node, accumulation, probability/26)...)
		}
		node.Letter = originalLetter
		node.cleared = true
		return result
	}

	if node.used {
		return result
	}
	if !mover.IsMatching(node.Color) {
		return result
	}

	accumulation = append(accumulation, node)
	node.used = true
	defer func() {
		node.used = false
		accumulation = accumulation[:len(accumulation)-1]
	}()

	wordFindResult := trie.Find(accumulation)
	if wordFindResult.IsWord && len(accumulation) >= MIN_WORD_LENGTH {
		word := Word{letters: []*WordLetter{}, Probability: probability}
		numGreyNodes := 0
		for idx, node := range accumulation {
			if node.Color == None {
				numGreyNodes++
			}
			if idx == 0 {
				word.letters = append(word.letters, &WordLetter{coords: node.coords, Letter: node.Letter, IsStart: true})
			} else {
				word.letters = append(word.letters, &WordLetter{coords: node.coords, Letter: node.Letter})
			}
		}
		word.NumGreyNodes = numGreyNodes
		result = append(result, &word)
	}
	if !wordFindResult.IsPrefix {
		return result
	}

	neighbors := board.GetNeighbors(node.coords)
	for _, neighbor := range neighbors {
		result = append(result, getWordsStartingAtNode(trie, board, mover, neighbor, accumulation, probability)...)
	}

	return result
}
