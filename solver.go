package main

import (
	"bufio"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
)

func main() {
	var board Board

	err := json.NewDecoder(os.Stdin).Decode(&board)
	if err != nil {
		log.Fatal(err)
	}
	board.Initialize()

	// Read the word list from the file
	file, err := os.Open("word_list.txt")
	if err != nil {
		log.Fatal(err)
	}
	defer file.Close()
	words := make([]string, 0)
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		words = append(words, scanner.Text())
	}

	// Instantiate the trie
	trie := CreateTrie(words)

	result, err := ExecuteMinimax(board, trie)
	if err != nil {
		log.Fatal(err)
	}

	// Print the result
	fmt.Println(result.String())
}

func (n *BoardNode) UnmarshalJSON(data []byte) error {
	type bn BoardNode
	node := &bn{
		used: false,
	}

	err := json.Unmarshal(data, node)
	if err != nil {
		return err
	}

	*n = BoardNode(*node)
	return nil
}

func (color *Color) UnmarshalJSON(b []byte) error {
	// Define a secondary type to avoid ending up with a recursive call to json.Unmarshal
	type C Color
	var r *C = (*C)(color)
	err := json.Unmarshal(b, &r)
	if err != nil {
		panic(err)
	}
	switch *color {
	case None, Red, Blue, VeryBlue, VeryRed:
		return nil
	}
	return errors.New("Invalid leave type")
}
