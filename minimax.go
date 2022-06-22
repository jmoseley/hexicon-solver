package main

import "fmt"

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

type WordLetter struct {
	coords []int
	letter string
}

type Word struct {
	letters []WordLetter
}

type Move struct {
	word Word
}

const MIN_WORD_LENGTH = 5

func (m Move) String() string {
	// Join all the letters of the word
	word := ""
	for _, letter := range m.word.letters {
		word += letter.letter
	}
	return word
}

// Execute minimax algorithm on the board
func ExecuteMinimax(board Board, trie *Trie) (Move, error) {
	// Find all the words on the board
	words := findWords(&board, trie, BlueMover)

	var bestMove Move
	bestScore := board.Score.Blue
	for _, word := range words {
		updatedBoard := board.Play(word, BlueMover)
		if updatedBoard.Score.Blue > bestScore {
			fmt.Println("New best score:", updatedBoard.Score.Blue, "for word:", word)
			bestMove = Move{word}
			bestScore = updatedBoard.Score.Blue
		}
	}

	return bestMove, nil
}

func findWords(board *Board, trie *Trie, mover Mover) []Word {
	result := []Word{}
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

func getWordsStartingAtNode(trie *Trie, board *Board, mover Mover, node *BoardNode, accumulation []*BoardNode) []Word {
	result := []Word{}

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

	prefixStr := ""
	for _, node := range accumulation {
		prefixStr += node.Letter
	}
	wordFindResult := trie.Find(prefixStr)
	if wordFindResult.IsWord && len(accumulation) >= MIN_WORD_LENGTH {
		word := Word{letters: []WordLetter{}}
		for _, node := range accumulation {
			word.letters = append(word.letters, WordLetter{coords: node.coords, letter: node.Letter})
		}
		result = append(result, word)
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
