package main

import (
	"fmt"
	"strings"
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
	resultsChannel := make(chan *MinimaxResult)
	boardsPlayed := 0

	go GetBestResultForBoard(resultsChannel, board, trie)
	boardsPlayed++

	// Get swapped boards
	swappedBoards := board.GenerateSwaps(BlueMover)
	for _, swappedBoard := range swappedBoards {
		go GetBestResultForBoard(resultsChannel, swappedBoard, trie)
		boardsPlayed++
	}

	var bestResult *MinimaxResult
	for boardsPlayed > 0 {
		result := <-resultsChannel
		boardsPlayed--
		if bestResult == nil || result.score > bestResult.score {
			bestResult = result
		}
	}

	fmt.Println("Best result:", bestResult.String())

	return bestResult.moves[0]
}

func GetBestResultForBoard(resultsChannel chan *MinimaxResult, board *Board, trie *Trie) {
	var bestResult *MinimaxResult

	// Find all the words on the board
	words := FindWords(board, trie, BlueMover)

	alpha := 0.0
	for _, word := range words {
		updatedBoard := board.Play(word, BlueMover)
		result := runMinimax(trie, updatedBoard, RedMover, alpha, 1, DEPTH, []*Move{{word: word, board: board, Mover: BlueMover}}, word.Probability)
		if bestResult == nil || result.score > bestResult.score {
			fmt.Println("New best score:", result.score, "for word:", word.String())
			bestResult = result
			alpha = max(alpha, result.score)
		}
	}

	resultsChannel <- bestResult
}

type MinimaxResult struct {
	// should be between 0 and 1
	score       float64
	moves       []*Move
	probability float64
}

func runMinimax(trie *Trie, board *Board, mover Mover, alpha float64, beta float64, depth int, moves []*Move, probability float64) *MinimaxResult {
	if probability <= 0.01 {
		return &MinimaxResult{score: -1, moves: moves, probability: probability}
	}
	terminalResult := board.GetTerminalResult()
	if terminalResult != -1 {
		return &MinimaxResult{score: float64(terminalResult) * probability, moves: moves, probability: probability}
	}
	if depth == 0 {
		return &MinimaxResult{score: board.heuristic(mover) * probability, moves: moves, probability: probability}
	}

	words := FindWords(board, trie, mover)
	if len(words) == 0 {
		return &MinimaxResult{score: -1, moves: moves, probability: probability}
	}

	if mover == BlueMover {
		var best *MinimaxResult
		for _, word := range words {
			updatedBoard := board.Play(word, BlueMover)
			result := runMinimax(trie, updatedBoard, RedMover, alpha, beta, depth-1, append(moves, &Move{word: word, board: board, Mover: mover}), probability*word.Probability)
			if best == nil || result.score > best.score {
				best = result
			}
			if best.score >= beta {
				break
			}
			alpha = max(alpha, best.score)
		}
		return best
	} else if mover == RedMover {
		var best *MinimaxResult
		for _, word := range words {
			updatedBoard := board.Play(word, RedMover)
			result := runMinimax(trie, updatedBoard, BlueMover, alpha, beta, depth-1, append(moves, &Move{word: word, board: board, Mover: mover}), probability*word.Probability)
			if best == nil || (result.score < best.score && result.score != -1) {
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

func (r *MinimaxResult) String() string {
	var builder strings.Builder
	builder.Grow(10)
	for _, move := range r.moves {
		builder.WriteString(move.String())
		builder.WriteString("\n")
	}
	builder.WriteString(fmt.Sprintf("Score: %f", r.score))
	return builder.String()
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
