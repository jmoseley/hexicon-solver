package main

import (
	"fmt"
	"math"
	"sort"
)

const DEPTH = 3

type Mover string

const (
	RedMover  Mover = "red"
	BlueMover       = "blue"
)

func (m Mover) GetColor() Color {
	if m == RedMover {
		return Red
	}
	return Blue
}
func (m Mover) Opposite() Mover {
	if m == RedMover {
		return BlueMover
	}
	return RedMover
}
func (m Mover) IsMatching(c Color) bool {
	if c == None {
		return true
	}
	if m == RedMover {
		return c == Red || c == VeryRed
	}
	return c == Blue || c == VeryBlue
}

// Execute minimax algorithm on the board
func ExecuteMinimax(board *Board, trie *Trie) (*Move, error) {
	// Find all the words on the board
	words := findWords(board, trie, BlueMover)
	sort.Slice(words, func(i, j int) bool {
		return len(words[i].letters) > len(words[j].letters)
	})

	var bestMove *Move
	alpha := math.MinInt
	bestScore := math.MinInt
	for _, word := range words {
		updatedBoard := board.Play(word, BlueMover)
		score := runMinimax(trie, updatedBoard, RedMover, alpha, math.MaxInt, DEPTH)
		if score > bestScore || bestMove == nil {
			fmt.Println("New best score:", score, "for word:", word.String())
			bestMove = &Move{word: word, board: board}
			bestScore = score
			alpha = max(alpha, score)
		}
	}

	return bestMove, nil
}

func runMinimax(trie *Trie, board *Board, mover Mover, alpha int, beta int, depth int) int {
	if depth == 0 {
		if mover == RedMover {
			return board.Score.Red - board.Score.Blue
		}
		return board.Score.Blue - board.Score.Red
	}

	words := findWords(board, trie, mover)

	if mover == BlueMover {
		best := math.MinInt
		for _, word := range words {
			updatedBoard := board.Play(word, BlueMover)
			best = max(best, runMinimax(trie, updatedBoard, mover.Opposite(), alpha, beta, depth-1))
			if best >= beta {
				break
			}
			alpha = max(alpha, best)
		}
		return best
	} else if mover == RedMover {
		best := math.MaxInt
		for _, word := range words {
			updatedBoard := board.Play(word, RedMover)
			best = min(best, runMinimax(trie, updatedBoard, mover.Opposite(), alpha, beta, depth-1))
			if best <= alpha {
				break
			}
			beta = min(beta, best)
		}
		return best
	} else {
		panic("Invalid mover")
	}
}

func max(a int, b int) int {
	if a > b {
		return a
	}
	return b
}

func min(a int, b int) int {
	if a < b {
		return a
	}
	return b
}

func findWords(board *Board, trie *Trie, mover Mover) []*Word {
	result := []*Word{}
	accumulation := []*BoardNode{}
	for lineNum := 0; lineNum < len(board.Nodes); lineNum++ {
		for nodeNum := 0; nodeNum < len(board.Nodes[lineNum]); nodeNum++ {
			node := board.Nodes[lineNum][nodeNum]
			// Find all the words on the board
			if !mover.IsMatching(node.Color) {
				continue
			}

			result = append(result, getWordsStartingAtNode(trie, board, mover, node, accumulation)...)
		}
	}

	return result
}

func getWordsStartingAtNode(trie *Trie, board *Board, mover Mover, node *BoardNode, accumulation []*BoardNode) []*Word {
	result := []*Word{}

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
		word := Word{letters: []*WordLetter{}}
		for idx, node := range accumulation {
			if idx == 0 {
				word.letters = append(word.letters, &WordLetter{coords: node.coords, Letter: node.Letter, IsStart: true})
			} else {
				word.letters = append(word.letters, &WordLetter{coords: node.coords, Letter: node.Letter})
			}
		}
		result = append(result, &word)
	}
	if !wordFindResult.IsPrefix {
		return result
	}

	neighbors := board.GetNeighbors(node.coords)
	for _, neighbor := range neighbors {
		result = append(result, getWordsStartingAtNode(trie, board, mover, neighbor, accumulation)...)
	}

	return result
}
