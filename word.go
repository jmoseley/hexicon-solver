package main

import (
	"fmt"
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

const MIN_WORD_LENGTH = 4

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
