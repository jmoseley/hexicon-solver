package main

import (
	"bufio"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"runtime"
	"runtime/pprof"
)

var cpuprofile = flag.String("cpuprofile", "", "write cpu profile to `file`")
var memprofile = flag.String("memprofile", "", "write memory profile to `file`")

func main() {
	flag.Parse()
	if *cpuprofile != "" {
		f, err := os.Create(*cpuprofile)
		if err != nil {
			log.Fatal("could not create CPU profile: ", err)
		}
		defer f.Close() // error handling omitted for example
		if err := pprof.StartCPUProfile(f); err != nil {
			log.Fatal("could not start CPU profile: ", err)
		}
		defer pprof.StopCPUProfile()
	}

	board := &Board{}

	err := json.NewDecoder(os.Stdin).Decode(board)
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

	result := ExecuteMinimax(board, trie)

	if len(result.word.SwappedNodes) > 0 {
		board.SwapNodes(result.word.SwappedNodes[0], result.word.SwappedNodes[1], false)
	}
	// Print the result
	fmt.Println(result.String(board))

	if *memprofile != "" {
		f, err := os.Create(*memprofile)
		if err != nil {
			log.Fatal("could not create memory profile: ", err)
		}
		defer f.Close() // error handling omitted for example
		runtime.GC()    // get up-to-date statistics
		if err := pprof.WriteHeapProfile(f); err != nil {
			log.Fatal("could not write memory profile: ", err)
		}
	}
}
