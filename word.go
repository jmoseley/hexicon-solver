package main

import (
	"fmt"
	"sort"
	"strings"
)

type WordLetter struct {
	coords  Coords
	Letter  byte
	IsStart bool
}

type Word struct {
	letters      []*WordLetter
	Probability  float64
	NumGreyNodes int
	SwappedNodes []Coords
	board        *Board
}

type Move struct {
	word  *Word
	Mover Mover
}

func (m *Move) String() string {
	if m.word.board == nil {
		return m.word.String()
	} else {
		return m.word.board.StringWithWord(m.word)
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

func (w *Word) Has(coords Coords) bool {
	for _, letter := range w.letters {
		if letter.coords.Line == coords.Line && letter.coords.Col == coords.Col {
			return true
		}
	}
	return false
}

func (w *Word) Get(coords Coords) *WordLetter {
	for _, letter := range w.letters {
		if letter.coords.Line == coords.Line && letter.coords.Col == coords.Col {
			return letter
		}
	}
	return nil
}

func FindWords(board *Board, trie *Trie, mover Mover) []*Word {
	result := []*Word{}
	accumulation := []*AccumulatedNode{}
	for lineNum := 0; lineNum < len(board.Nodes); lineNum++ {
		for nodeNum := 0; nodeNum < len(board.Nodes[lineNum]); nodeNum++ {
			node := board.Nodes[lineNum][nodeNum]
			// Find all the words on the board
			if !mover.IsMatching(node.Color) {
				continue
			}

			result = append(result, findWordsRecursive(trie, board, mover, node, accumulation, 1.0, []Coords{})...)
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

type AccumulatedNode struct {
	Letter byte
	coords []int
	Color  Color
}

func getWordsStartingAtNode(trie *Trie, board *Board, mover Mover, node *BoardNode, accumulation []*AccumulatedNode, probability float64) []*Word {
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

	accumulatedNode := &AccumulatedNode{
		Letter: node.Letter,
		coords: node.coords,
		Color:  node.Color,
	}
	accumulation = append(accumulation, accumulatedNode)
	node.used = true
	defer func() {
		node.used = false
		accumulation = accumulation[:len(accumulation)-1]
	}()

	wordFindResult := trie.Find(accumulation)
	if wordFindResult.IsWord && len(accumulation) >= MIN_WORD_LENGTH {
		word := Word{letters: []*WordLetter{}, Probability: probability, NumGreyNodes: 0, board: board}
		numGreyNodes := 0
		for idx, node := range accumulation {
			if node.Color == None {
				numGreyNodes++
			}
			coords := make([]int, 2)
			copy(coords, node.coords)
			if idx == 0 {
				word.letters = append(word.letters, &WordLetter{coords: coords, Letter: node.Letter, IsStart: true})
			} else {
				word.letters = append(word.letters, &WordLetter{coords: coords, Letter: node.Letter})
			}
		}
		word.NumGreyNodes = numGreyNodes
		result = append(result, &word)
	}
	if !wordFindResult.IsPrefix {
		return result
	}

	nextLetters := trie.NextLetters(accumulation)

	neighbors := board.GetNeighbors(node.coords)
	for _, neighbor := range neighbors {
		// TODO: Don't run this if the neighbor is not in the list of next letters. Small improvement.
		result = append(result, getWordsStartingAtNode(trie, board, mover, neighbor, accumulation, probability)...)

		if !board.hasSwapped {
			for _, nextLetter := range nextLetters {
				swaps := board.FindSwaps(neighbor, node, nextLetter)
				if len(swaps) > 0 {
					fmt.Println("found swaps", neighbor.coords, nextLetter, len(swaps), board.String())
				}
				for _, nodeToSwap := range swaps {
					clone := board.clone()
					clone.SwapNodes(neighbor.coords, nodeToSwap.coords)
					clone.hasSwapped = true
					fmt.Println("swapped board", clone.String())
					result = append(result, getWordsStartingAtNode(trie, clone, mover, clone.Nodes[neighbor.coords[0]][neighbor.coords[1]], accumulation, probability)...)
				}
			}
		}
	}

	return result
}
