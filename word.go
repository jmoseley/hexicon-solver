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

func (m *Move) String(board *Board) string {
	if board == nil {
		board = m.word.board
	}
	if board == nil {
		return m.word.String()
	} else {
		return board.StringWithWord(m.word)
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

func (wl *WordLetter) String() string {
	return fmt.Sprintf("%v %c", wl.coords, wl.Letter)
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
	coords Coords
	Color  Color
}

func (a *AccumulatedNode) String() string {
	return fmt.Sprintf("%c {%d %d}", a.Letter, a.coords.Line, a.coords.Col)
}

func findWordsRecursive(trie *Trie, board *Board, mover Mover, node *BoardNode, accumulation []*AccumulatedNode, probability float64, swappedNodes []Coords) []*Word {
	result := []*Word{}
	if probability < 0.01 {
		return result
	}

	// Just skip any nodes that have been cleared, since 1/26 is really low and not worth it.
	// TODO: Enable this for monte carlo simulations.
	if node.cleared {
		return result
		// originalLetter := node.Letter
		// for _, letter := range lettersArray {
		// 	node.Letter = letter
		// 	node.cleared = false
		// 	result = append(result, findWordsRecursive(trie, board, mover, node, accumulation, probability/26)...)
		// }
		// node.Letter = originalLetter
		// node.cleared = true
		// return result
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
		playedBoard := board.clone()
		word := Word{letters: make([]*WordLetter, 0, len(accumulation)), Probability: probability, board: playedBoard, SwappedNodes: swappedNodes}
		numGreyNodes := 0
		for idx, node := range accumulation {
			if node.Color == None {
				numGreyNodes++
			}
			word.letters = append(word.letters, &WordLetter{coords: node.coords, Letter: node.Letter, IsStart: idx == 0})
		}
		word.NumGreyNodes = numGreyNodes
		playedBoard.Play(&word, mover)

		result = append(result, &word)
	}
	if !wordFindResult.IsPrefix {
		return result
	}

	neighbors := board.GetNeighbors(node)
	for _, neighbor := range neighbors {
		result = append(result, findWordsRecursive(trie, board, mover, neighbor, accumulation, probability, swappedNodes)...)

		if neighbor.used || neighbor.Color == VeryBlue || neighbor.Color == VeryRed {
			continue
		}

		coords := neighbor.coords

		if !board.HasSwapped {
			neighborNeighbors := board.GetNeighbors(neighbor)
			for _, neighborNeighbor := range neighborNeighbors {
				// neighborNeighbor.used ensures that we won't continue with the current node
				if neighborNeighbor.used || neighborNeighbor.cleared || neighborNeighbor.Color != None {
					continue
				}

				for nextLetter := range wordFindResult.NextLetters {
					if neighbor.Letter != nextLetter {
						continue
					}

					swappedNodes = append(swappedNodes, coords, neighborNeighbor.coords)

					board.SwapNodes(neighbor.coords, neighborNeighbor.coords, false)
					result = append(result, findWordsRecursive(trie, board, mover, board.Nodes[coords.Line][coords.Col], accumulation, probability, swappedNodes)...)
					board.SwapNodes(neighborNeighbor.coords, neighbor.coords, true)

					swappedNodes = swappedNodes[:0]
				}
			}
		}
	}

	return result
}
