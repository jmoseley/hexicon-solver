package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strings"

	"github.com/fatih/color"
)

type Color string

const (
	None     Color = "none"
	Red            = "red"
	Blue           = "blue"
	VeryRed        = "very_red"
	VeryBlue       = "very_blue"
)

type BoardScore struct {
	Red  int `json:"red"`
	Blue int `json:"blue"`
}

type BoardNode struct {
	Letter    byte
	Char      string `json:"char"`
	Color     Color  `json:"color"`
	cleared   bool
	used      bool
	coords    []int
	IsSwapped bool
}

type Board struct {
	Score       BoardScore     `json:"score"`
	Nodes       [][]*BoardNode `json:"nodes"`
	probability float64
	neighbors   [][][]*BoardNode
	nodesList   []*BoardNode
}

func (b *Board) Initialize() {
	b.probability = 1.0
	// Set the node coordinates
	for lineNum := 0; lineNum < len(b.Nodes); lineNum++ {
		for nodeNum := 0; nodeNum < len(b.Nodes[lineNum]); nodeNum++ {
			b.Nodes[lineNum][nodeNum].coords = []int{lineNum, nodeNum}
			b.Nodes[lineNum][nodeNum].used = false
			b.Nodes[lineNum][nodeNum].cleared = false
		}
	}
}

func (b *Board) Play(word *Word, mover Mover) *Board {
	// fmt.Println("Playing", word, "as", mover, "Red", b.Score.Red, "Blue", b.Score.Blue)
	board := b.clone()
	for _, letter := range word.letters {
		node := board.Nodes[letter.coords[0]][letter.coords[1]]
		if node.Color == None {
			node.Color = mover.GetColor()
		} else if !mover.IsMatching(node.Color) {
			fmt.Println(board.String())
			log.Fatalln("Invalid move: As", mover, "letter:", letter.coords, string(letter.Letter), "Node:", node.Color, node.coords, "swapped", node.IsSwapped, "letter", string(node.Letter), "\n", board.StringWithWord(word))
		}
	}

	hexagonCenters := []*BoardNode{}
	for lineNum := 0; lineNum < len(board.Nodes); lineNum++ {
		for nodeNum := 0; nodeNum < len(board.Nodes[lineNum]); nodeNum++ {
			node := board.Nodes[lineNum][nodeNum]
			hexagon := node.checkHexagon(board)
			if hexagon != "" {
				// fmt.Println("Hexagon", node.coords, "is", hexagon)
				hexagonCenters = append(hexagonCenters, node)
				if hexagon == Red {
					board.Score.Red++
				} else {
					board.Score.Blue++
				}
			}
		}
	}

	for _, node := range hexagonCenters {
		node.clearHexagon(board, mover)
	}

	superHexagons := []*BoardNode{}
	for lineNum := 0; lineNum < len(board.Nodes); lineNum++ {
		for nodeNum := 0; nodeNum < len(board.Nodes[lineNum]); nodeNum++ {
			node := board.Nodes[lineNum][nodeNum]
			if node.isSuperHexagon(board) {
				fmt.Println("Node", node.coords, "is", node.Color)
				superHexagons = append(superHexagons, node)
			}
		}
	}

	for _, node := range superHexagons {
		node.clearSuperHexagon(board)
	}

	return board
}

func (b *Board) GetNeighbors(nodeCoord []int) []*BoardNode {
	if b.neighbors == nil {
		b.neighbors = make([][][]*BoardNode, len(b.Nodes))
	}
	if b.neighbors[nodeCoord[0]] == nil {
		b.neighbors[nodeCoord[0]] = make([][]*BoardNode, len(b.Nodes[nodeCoord[0]]))
	}
	if b.neighbors[nodeCoord[0]][nodeCoord[1]] == nil {
		neighbor_coords := coords_to_neighbors[nodeCoord[0]][nodeCoord[1]]
		neighbors := []*BoardNode{}

		for _, coord := range neighbor_coords {
			neighbors = append(neighbors, b.Nodes[coord[0]][coord[1]])
		}
		b.neighbors[nodeCoord[0]][nodeCoord[1]] = neighbors
		return neighbors
	} else {
		return b.neighbors[nodeCoord[0]][nodeCoord[1]]
	}
}

func (n *BoardNode) checkHexagon(board *Board) Mover {
	if n.Color == None || n.Color == VeryRed || n.Color == VeryBlue {
		return ""
	}
	neighbors := board.GetNeighbors(n.coords)
	if len(neighbors) != 6 {
		return ""
	}

	redCount := 0
	blueCount := 0
	if n.Color == Red {
		redCount++
	} else if n.Color == Blue {
		blueCount++
	} else {
		return ""
	}
	for _, neighbor := range neighbors {
		if neighbor.Color == Red || neighbor.Color == VeryRed {
			redCount++
		} else if neighbor.Color == Blue || neighbor.Color == VeryBlue {
			blueCount++
		} else {
			return ""
		}
	}

	if redCount > blueCount {
		return Red
	}
	return Blue
}

func (b *Board) clone() *Board {
	board := Board{
		Score: BoardScore{
			Red:  b.Score.Red,
			Blue: b.Score.Blue,
		},
		Nodes:       make([][]*BoardNode, len(b.Nodes)),
		probability: b.probability,
	}
	for lineNum := 0; lineNum < len(b.Nodes); lineNum++ {
		board.Nodes[lineNum] = make([]*BoardNode, len(b.Nodes[lineNum]))
		for nodeNum := 0; nodeNum < len(b.Nodes[lineNum]); nodeNum++ {
			board.Nodes[lineNum][nodeNum] = &BoardNode{
				Letter:  b.Nodes[lineNum][nodeNum].Letter,
				Color:   b.Nodes[lineNum][nodeNum].Color,
				cleared: b.Nodes[lineNum][nodeNum].cleared,
				used:    b.Nodes[lineNum][nodeNum].used,
				coords:  []int{lineNum, nodeNum},
			}
		}
	}

	return &board
}

func (n *BoardNode) clearHexagon(board *Board, mover Mover) {
	if mover == RedMover {
		n.Color = VeryRed
	} else if mover == BlueMover {
		n.Color = VeryBlue
	}

	neighbors := board.GetNeighbors(n.coords)
	for _, neighbor := range neighbors {
		neighbor.Color = None
		neighbor.cleared = true
	}
}

func (n *BoardNode) isSuperHexagon(board *Board) bool {
	if n.Color != VeryBlue && n.Color != VeryRed {
		return false
	}
	neighbors := board.GetNeighbors(n.coords)
	if len(neighbors) != 6 {
		return false
	}

	for _, neighbor := range neighbors {
		if neighbor.Color != VeryBlue && neighbor.Color != VeryRed {
			return false
		}
	}
	return true
}

func (n *BoardNode) clearSuperHexagon(board *Board) {
	n.Color = None
	n.cleared = true

	neighbors := board.GetNeighbors(n.coords)
	for _, neighbor := range neighbors {
		neighbor.Color = None
		neighbor.cleared = true
	}
}

func (b *Board) GenerateSwaps(mover Mover) []*Board {
	swaps := []*Board{}
	for lineNum := 0; lineNum < len(b.Nodes); lineNum++ {
		for nodeNum := 0; nodeNum < len(b.Nodes[lineNum]); nodeNum++ {
			node := b.Nodes[lineNum][nodeNum]
			if !mover.IsMatching(node.Color) {
				continue
			}
			for _, neighbor := range b.GetNeighbors(node.coords) {
				if mover.IsMatchingDrab(neighbor.Color) {
					fmt.Println("Swap", node.coords, "with", neighbor.coords, "node color", node.Color, "neighbor color", neighbor.Color)
					swaps = append(swaps, b.clone())
					swaps[len(swaps)-1].SwapNodes(node.coords, neighbor.coords)
					fmt.Println("swap\n", swaps[len(swaps)-1].String())
				}
			}
		}
	}
	return swaps
}

func (b *Board) SwapNodes(node1Coords, node2Coords []int) {
	node1 := b.Nodes[node1Coords[0]][node1Coords[1]]
	node2 := b.Nodes[node2Coords[0]][node2Coords[1]]
	b.Nodes[node1Coords[0]][node1Coords[1]] = node2
	b.Nodes[node2Coords[0]][node2Coords[1]] = node1
	node1.IsSwapped = true
	node2.IsSwapped = true

	node1.coords = node2Coords
	node2.coords = node1Coords
}

func (b *Board) String() string {
	return b.StringWithWord(nil)
}

func (b *Board) StringWithWord(word *Word) string {
	if chunks == nil {
		chunks = strings.Split(boardLayout, "X")
	}

	var builder strings.Builder

	if word != nil {
		fmt.Fprintf(&builder, "Word: %s\n", word)
	}

	builder.Grow(len(boardLayout))
	for idx, node := range b.nodesFlat() {
		var letter string
		printColor := color.New(color.FgWhite)
		if word != nil && word.Has(node.coords) {
			wordLetter := word.Get(node.coords)
			letter = string(node.Letter)
			if wordLetter.IsStart {
				if node.IsSwapped {
					printColor = color.New(color.FgHiWhite, color.BgGreen)
				} else {
					printColor = color.New(color.FgHiGreen)
				}
			} else {
				if node.IsSwapped {
					printColor = color.New(color.FgWhite, color.BgGreen)
				} else {
					printColor = color.New(color.FgGreen)
				}
			}
		} else {
			letter = string(node.Letter)
			if node.Color == Red {
				printColor = color.New(color.FgRed)
			} else if node.Color == Blue {
				printColor = color.New(color.FgBlue)
			} else if node.Color == VeryRed {
				printColor = color.New(color.FgRed)
			} else if node.Color == VeryBlue {
				printColor = color.New(color.FgBlue)
			}
			if node.IsSwapped {
				printColor = printColor.Add(color.BgWhite)
			}
		}
		fmt.Fprintf(&builder, "%s%s", chunks[idx], printColor.Sprintf(letter))
	}
	fmt.Fprintf(&builder, "%s", chunks[len(chunks)-1])

	return builder.String()
}

func (b *Board) nodesFlat() []*BoardNode {
	if b.nodesList != nil {
		return b.nodesList
	}

	nodes := []*BoardNode{}
	for _, line := range b.Nodes {
		for _, node := range line {
			nodes = append(nodes, node)
		}
	}
	b.nodesList = nodes
	return nodes
}

var chunks []string

const boardLayout = `
                     ___
                 ___/ X \___
             ___/ X \___/ X \___
         ___/ X \___/ X \___/ X \___
     ___/ X \___/ X \___/ X \___/ X \___
    / X \___/ X \___/ X \___/ X \___/ X \
    \___/ X \___/ X \___/ X \___/ X \___/
    / X \___/ X \___/ X \___/ X \___/ X \
    \___/ X \___/ X \___/ X \___/ X \___/
    / X \___/ X \___/ X \___/ X \___/ X \
    \___/ X \___/ X \___/ X \___/ X \___/
    / X \___/ X \___/ X \___/ X \___/ X \
    \___/ X \___/ X \___/ X \___/ X \___/
    / X \___/ X \___/ X \___/ X \___/ X \
    \___/ X \___/ X \___/ X \___/ X \___/
        \___/ X \___/ X \___/ X \___/
            \___/ X \___/ X \___/
                \___/ X \___/
                    \___/
`

func (n *BoardNode) UnmarshalJSON(data []byte) error {
	type bn BoardNode
	node := &bn{
		used: false,
	}

	err := json.Unmarshal(data, node)
	if err != nil {
		return err
	}
	if len(node.Char) > 1 || len(node.Char) == 0 {
		return errors.New(fmt.Sprintf("Invalid character: %s", node.Char))
	}
	node.Letter = node.Char[0]

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

var coords_to_neighbors = [][][][]int{
	{
		{
			{1, 0},
			{1, 1},
			{2, 1},
		},
	},
	{
		{
			{0, 0},
			{2, 0},
			{2, 1},
			{3, 1},
		},
		{
			{0, 0},
			{2, 1},
			{2, 2},
			{3, 2},
		},
	},
	{
		{
			{1, 0},
			{3, 0},
			{3, 1},
			{4, 1},
		},
		{
			{0, 0},
			{1, 0},
			{1, 1},
			{3, 1},
			{3, 2},
			{4, 2},
		},
		{
			{1, 1},
			{3, 2},
			{3, 3},
			{4, 3},
		},
	},
	{
		{
			{2, 0},
			{4, 0},
			{4, 1},
			{5, 0},
		},
		{
			{1, 0},
			{2, 0},
			{2, 1},
			{4, 1},
			{4, 2},
			{5, 1},
		},
		{
			{1, 1},
			{2, 1},
			{2, 2},
			{4, 2},
			{4, 3},
			{5, 2},
		},
		{
			{2, 2},
			{4, 3},
			{4, 4},
			{5, 3},
		},
	},
	{
		{
			{3, 0},
			{5, 0},
			{6, 0},
		},
		{
			{2, 0},
			{3, 0},
			{3, 1},
			{5, 0},
			{5, 1},
			{6, 1},
		},
		{
			{2, 1},
			{3, 1},
			{3, 2},
			{5, 1},
			{5, 2},
			{6, 2},
		},
		{
			{2, 2},
			{3, 2},
			{3, 3},
			{5, 2},
			{5, 3},
			{6, 3},
		},
		{
			{3, 3},
			{5, 3},
			{6, 4},
		},
	},
	{
		{
			{3, 0},
			{4, 0},
			{4, 1},
			{6, 0},
			{6, 1},
			{7, 0},
		},
		{
			{3, 1},
			{4, 1},
			{4, 2},
			{6, 1},
			{6, 2},
			{7, 1},
		},
		{
			{3, 2},
			{4, 2},
			{4, 3},
			{6, 2},
			{6, 3},
			{7, 2},
		},
		{
			{3, 3},
			{4, 3},
			{4, 4},
			{6, 3},
			{6, 4},
			{7, 3},
		},
	},
	{
		{
			{4, 0},
			{5, 0},
			{7, 0},
			{8, 0},
		},
		{
			{4, 1},
			{5, 0},
			{5, 1},
			{7, 0},
			{7, 1},
			{8, 1},
		},
		{
			{4, 2},
			{5, 1},
			{5, 2},
			{7, 1},
			{7, 2},
			{8, 2},
		},
		{
			{4, 3},
			{5, 2},
			{5, 3},
			{7, 2},
			{7, 3},
			{8, 3},
		},
		{
			{4, 4},
			{5, 3},
			{7, 3},
			{8, 4},
		},
	},
	{
		{
			{5, 0},
			{6, 0},
			{6, 1},
			{8, 0},
			{8, 1},
			{9, 0},
		},
		{
			{5, 1},
			{6, 1},
			{6, 2},
			{8, 1},
			{8, 2},
			{9, 1},
		},
		{
			{5, 2},
			{6, 2},
			{6, 3},
			{8, 2},
			{8, 3},
			{9, 2},
		},
		{
			{5, 3},
			{6, 3},
			{6, 4},
			{8, 3},
			{8, 4},
			{9, 3},
		},
	},
	{
		{
			{6, 0},
			{7, 0},
			{9, 0},
			{10, 0},
		},
		{
			{6, 1},
			{7, 0},
			{7, 1},
			{9, 0},
			{9, 1},
			{10, 1},
		},
		{
			{6, 2},
			{7, 1},
			{7, 2},
			{9, 1},
			{9, 2},
			{10, 2},
		},
		{
			{6, 3},
			{7, 2},
			{7, 3},
			{9, 2},
			{9, 3},
			{10, 3},
		},
		{
			{6, 4},
			{7, 3},
			{9, 3},
			{10, 4},
		},
	},
	{
		{
			{7, 0},
			{8, 0},
			{8, 1},
			{10, 0},
			{10, 1},
			{11, 0},
		},
		{
			{7, 1},
			{8, 1},
			{8, 2},
			{10, 1},
			{10, 2},
			{11, 1},
		},
		{
			{7, 2},
			{8, 2},
			{8, 3},
			{10, 2},
			{10, 3},
			{11, 2},
		},
		{
			{7, 3},
			{8, 3},
			{8, 4},
			{10, 3},
			{10, 4},
			{11, 3},
		},
	},
	{
		{
			{8, 0},
			{9, 0},
			{11, 0},
			{12, 0},
		},
		{
			{8, 1},
			{9, 0},
			{9, 1},
			{11, 0},
			{11, 1},
			{12, 1},
		},
		{
			{8, 2},
			{9, 1},
			{9, 2},
			{11, 1},
			{11, 2},
			{12, 2},
		},
		{
			{8, 3},
			{9, 2},
			{9, 3},
			{11, 2},
			{11, 3},
			{12, 3},
		},
		{
			{8, 4},
			{9, 3},
			{11, 3},
			{12, 4},
		},
	},
	{
		{
			{9, 0},
			{10, 0},
			{10, 1},
			{12, 0},
			{12, 1},
			{13, 0},
		},
		{
			{9, 1},
			{10, 1},
			{10, 2},
			{12, 1},
			{12, 2},
			{13, 1},
		},
		{
			{9, 2},
			{10, 2},
			{10, 3},
			{12, 2},
			{12, 3},
			{13, 2},
		},
		{
			{9, 3},
			{10, 3},
			{10, 4},
			{12, 3},
			{12, 4},
			{13, 3},
		},
	},
	{
		{
			{10, 0},
			{11, 0},
			{13, 0},
		},
		{
			{10, 1},
			{11, 0},
			{11, 1},
			{13, 0},
			{13, 1},
			{14, 0},
		},
		{
			{10, 2},
			{11, 1},
			{11, 2},
			{13, 1},
			{13, 2},
			{14, 1},
		},
		{
			{10, 3},
			{11, 2},
			{11, 3},
			{13, 2},
			{13, 3},
			{14, 2},
		},
		{
			{10, 4},
			{11, 3},
			{13, 3},
		},
	},
	{
		{
			{11, 0},
			{12, 0},
			{12, 1},
			{14, 0},
		},
		{
			{11, 1},
			{12, 1},
			{12, 2},
			{14, 0},
			{14, 1},
			{15, 0},
		},
		{
			{11, 2},
			{12, 2},
			{12, 3},
			{14, 1},
			{14, 2},
			{15, 1},
		},
		{
			{11, 3},
			{12, 3},
			{12, 4},
			{14, 2},
		},
	},
	{
		{
			{12, 1},
			{13, 0},
			{13, 1},
			{15, 0},
		},
		{
			{12, 2},
			{13, 1},
			{13, 2},
			{15, 0},
			{15, 1},
			{16, 0},
		},
		{
			{12, 3},
			{13, 2},
			{13, 3},
			{15, 1},
		},
	},
	{
		{
			{13, 1},
			{14, 0},
			{14, 1},
			{16, 0},
		},
		{
			{13, 2},
			{14, 1},
			{14, 2},
			{16, 0},
		},
	},
	{
		{
			{14, 1},
			{15, 0},
			{15, 1},
		},
	},
}
