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
func (m Mover) IsMatchingDrab(c Color) bool {
	if c == None {
		return true
	}
	if m == RedMover {
		return c == Red
	}
	return c == Blue
}

// Execute minimax algorithm on the board
func ExecuteMinimax(board *Board, trie *Trie) *Move {
	bestMove := GetBestMoveForBoard(board, trie)

	// Get swapped boards
	swappedBoards := board.GenerateSwaps(BlueMover)
	for _, swappedBoard := range swappedBoards {
		move := GetBestMoveForBoard(swappedBoard, trie)
		if move.ExpectedScore > bestMove.ExpectedScore {
			bestMove = move
			fmt.Println("Better move found:", move.String())
		}
	}

	return bestMove
}

func GetBestMoveForBoard(board *Board, trie *Trie) *Move {
	var bestMove *Move
	bestScore := float64(math.MinInt)

	// Find all the words on the board
	words := findWords(board, trie, BlueMover)

	alpha := float64(math.MinInt)
	for _, word := range words {
		updatedBoard := board.Play(word, BlueMover)
		result := runMinimax(trie, updatedBoard, RedMover, alpha, math.MaxInt, DEPTH, []*Move{{word: word, board: board, ExpectedScore: -1, Mover: BlueMover}}, word.Probability)
		if result.score > bestScore || bestMove == nil {
			fmt.Println("New best score:", result.score, "for word:", word.String())
			bestMove = result.moves[0]
			bestScore = result.score
			alpha = max(alpha, result.score)
			// var builder strings.Builder
			// builder.Grow(10)
			// for _, move := range result.moves {
			// 	builder.WriteString(move.String())
			// 	builder.WriteString("\n")
			// }
			// fmt.Println(builder.String())
		}
	}

	return bestMove
}

type MinimaxResult struct {
	score       float64
	moves       []*Move
	probability float64
}

func runMinimax(trie *Trie, board *Board, mover Mover, alpha float64, beta float64, depth int, moves []*Move, probability float64) *MinimaxResult {
	if probability <= 0.05 {
		return &MinimaxResult{score: math.MinInt, moves: moves, probability: probability}
	}
	if depth == 0 {
		return &MinimaxResult{score: float64(board.Score.Blue-board.Score.Red) * probability, moves: moves, probability: probability}
	}
	if board.Score.Red >= 16 {
		return &MinimaxResult{score: math.MinInt * probability, moves: moves, probability: probability}
	} else if board.Score.Blue >= 16 {
		return &MinimaxResult{score: math.MaxInt * probability, moves: moves, probability: probability}
	}

	words := findWords(board, trie, mover)

	if mover == BlueMover {
		best := &MinimaxResult{score: math.MinInt, moves: moves, probability: probability}
		for _, word := range words {
			updatedBoard := board.Play(word, BlueMover)
			result := runMinimax(trie, updatedBoard, mover.Opposite(), alpha, beta, depth-1, append(moves, &Move{word: word, board: board, Mover: mover}), probability*word.Probability)
			if result.score > best.score {
				best = result
			}
			if best.score >= beta {
				break
			}
			alpha = max(alpha, best.score)
		}
		return best
	} else if mover == RedMover {
		best := &MinimaxResult{score: math.MaxInt, moves: moves, probability: probability}
		for _, word := range words {
			updatedBoard := board.Play(word, RedMover)
			result := runMinimax(trie, updatedBoard, mover.Opposite(), alpha, beta, depth-1, append(moves, &Move{word: word, board: board, Mover: mover}), probability*word.Probability)
			if result.score < best.score {
				best = result
			}
			if best.score <= alpha {
				break
			}
			beta = min(beta, best.score)
		}
		return best
	} else {
		panic("Invalid mover")
	}
}

func max(a float64, b float64) float64 {
	if a > b {
		return a
	}
	return b
}

func min(a float64, b float64) float64 {
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
	if probability < 0.1 {
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
