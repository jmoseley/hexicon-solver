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
	coords    Coords
	IsSwapped bool
	neighbors []*BoardNode
}

type Board struct {
	Score        BoardScore     `json:"score"`
	Nodes        [][]*BoardNode `json:"nodes"`
	neighbors    [][][]*BoardNode
	nodesList    []*BoardNode
	HasSwapped   bool
	SwappedNodes []*BoardNode
}

type Coords struct {
	Line int
	Col  int
}

func (bn *BoardNode) String() string {
	return fmt.Sprintf("%d,%d:%s", bn.coords.Line, bn.coords.Col, string(bn.Letter))
}

func (b *Board) Initialize() {
	// Set the node coordinates
	for lineNum := 0; lineNum < len(b.Nodes); lineNum++ {
		for nodeNum := 0; nodeNum < len(b.Nodes[lineNum]); nodeNum++ {
			b.Nodes[lineNum][nodeNum].coords = Coords{Line: lineNum, Col: nodeNum}
			b.Nodes[lineNum][nodeNum].used = false
			b.Nodes[lineNum][nodeNum].cleared = false
		}
	}
}

// This mutates the board
func (b *Board) Play(word *Word, mover Mover) {
	for _, letter := range word.letters {
		node := b.Nodes[letter.coords.Line][letter.coords.Col]
		if node.Color == None {
			node.Color = mover.GetColor()
		} else if !mover.IsMatching(node.Color) {
			fmt.Println(b.String())
			fmt.Println(word.SwappedNodes)
			log.Fatalln("Invalid move: As", mover, "letter:", letter.coords, string(letter.Letter), "Node:", node.Color, node.coords, "swapped", node.IsSwapped, "letter", string(node.Letter), "\n", b.StringWithWord(word))
		}
	}

	hexagonCenters := []*BoardNode{}
	for lineNum := 0; lineNum < len(b.Nodes); lineNum++ {
		for nodeNum := 0; nodeNum < len(b.Nodes[lineNum]); nodeNum++ {
			node := b.Nodes[lineNum][nodeNum]
			hexagon := node.checkHexagon(b)
			if hexagon != "" {
				// fmt.Println("Hexagon", node.coords, "is", hexagon)
				hexagonCenters = append(hexagonCenters, node)
				if hexagon == Red {
					b.Score.Red++
				} else {
					b.Score.Blue++
				}
			}
		}
	}

	for _, node := range hexagonCenters {
		node.clearHexagon(b, mover)
	}

	if len(hexagonCenters) > 0 {
		superHexagons := []*BoardNode{}
		for lineNum := 0; lineNum < len(b.Nodes); lineNum++ {
			for nodeNum := 0; nodeNum < len(b.Nodes[lineNum]); nodeNum++ {
				node := b.Nodes[lineNum][nodeNum]
				if node.isSuperHexagon(b) {
					superHexagons = append(superHexagons, node)
				}
			}
		}

		for _, node := range superHexagons {
			node.clearSuperHexagon(b)
		}
	}

	b.ResetSwap()
}

func (b *Board) GetNeighbors(node *BoardNode) []*BoardNode {
	if node.neighbors != nil {
		return node.neighbors
	}
	neighbors := make([]*BoardNode, 0, 6)
	neighbor_coords := coords_to_neighbors[node.coords.Line][node.coords.Col]

	for _, coord := range neighbor_coords {
		neighbors = append(neighbors, b.Nodes[coord[0]][coord[1]])
	}
	node.neighbors = neighbors
	return neighbors
}

func (b *Board) GetTerminalResult() float64 {
	if b.Score.Blue >= 16 {
		return 1
	} else if b.Score.Red >= 16 {
		return 0
	} else {
		return -1
	}
}

const NUM_SQUARES = 61

// between 0 and 1
func (b *Board) heuristic(mover Mover) float64 {
	var closenessToWinning float64
	var closenessToLosing float64
	closenessToWinning = float64(b.Score.Blue) / 16.0
	closenessToLosing = 1 - (float64(b.Score.Red) / 16.0)
	numBlueSquareNeighbors := 0
	numRedSquareNeighbors := 0
	numNeighbors := 0
	for lineNum := 0; lineNum < len(b.Nodes); lineNum++ {
		for nodeNum := 0; nodeNum < len(b.Nodes[lineNum]); nodeNum++ {
			neighbors := b.GetNeighbors(b.Nodes[lineNum][nodeNum])
			for _, neighbor := range neighbors {
				numNeighbors++
				if neighbor.Color == Red || neighbor.Color == VeryRed {
					numRedSquareNeighbors++
				} else if neighbor.Color == Blue || neighbor.Color == VeryBlue {
					numBlueSquareNeighbors++
				}
			}
		}
	}

	blueSquareNeighborRatio := float64(numBlueSquareNeighbors) / float64(numNeighbors)
	redSquareNeighborRatio := 1 - (float64(numRedSquareNeighbors) / float64(numNeighbors))

	result := closenessToWinning*.7 + closenessToLosing*.05 + blueSquareNeighborRatio*.2 + redSquareNeighborRatio*.05

	// fmt.Println(b.String())
	// fmt.Println("Blue", blueSquareRatio, "Red", redSquareRatio)
	// fmt.Println("Result", result, "Closeness to winning:", closenessToWinning, "Closeness to losing:", closenessToLosing, "Blue squares:", numBlueSquares, "Red squares:", numRedSquares)

	return result
}

func (n *BoardNode) checkHexagon(board *Board) Mover {
	if n.Color == None || n.Color == VeryRed || n.Color == VeryBlue {
		return ""
	}
	neighbors := board.GetNeighbors(n)
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
		// HasSwapped: b.HasSwapped,
		Nodes: make([][]*BoardNode, len(b.Nodes)),
	}
	for lineNum := 0; lineNum < len(b.Nodes); lineNum++ {
		board.Nodes[lineNum] = make([]*BoardNode, len(b.Nodes[lineNum]))
		for nodeNum := 0; nodeNum < len(b.Nodes[lineNum]); nodeNum++ {
			node := b.Nodes[lineNum][nodeNum]
			board.Nodes[lineNum][nodeNum] = &BoardNode{
				Letter:    node.Letter,
				Color:     node.Color,
				cleared:   node.cleared,
				coords:    node.coords,
				IsSwapped: node.IsSwapped,
			}
		}
	}
	// if board.HasSwapped {
	// 	board.SwappedNodes = make([]*BoardNode, 0, 2)
	// 	board.SwappedNodes = append(board.SwappedNodes, board.Nodes[b.SwappedNodes[0].coords.Line][b.SwappedNodes[0].coords.Col], board.Nodes[b.SwappedNodes[1].coords.Line][b.SwappedNodes[1].coords.Col])
	// }

	return &board
}

func (n *BoardNode) clearHexagon(board *Board, mover Mover) {
	if mover == RedMover {
		n.Color = VeryRed
	} else if mover == BlueMover {
		n.Color = VeryBlue
	}

	neighbors := board.GetNeighbors(n)
	for _, neighbor := range neighbors {
		if neighbor.Color == Red || neighbor.Color == Blue {
			neighbor.Color = None
			neighbor.cleared = true
		}
	}
}

func (n *BoardNode) isSuperHexagon(board *Board) bool {
	if n.Color != VeryBlue && n.Color != VeryRed {
		return false
	}
	neighbors := board.GetNeighbors(n)
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

	neighbors := board.GetNeighbors(n)
	for _, neighbor := range neighbors {
		neighbor.Color = None
		neighbor.cleared = true
	}
}

func (b *Board) ResetSwap() {
	b.HasSwapped = false
	b.SwappedNodes = b.SwappedNodes[:0]
}

func (b *Board) SwapNodes(node1Coords, node2Coords Coords, isReset bool) {
	if b.HasSwapped && !isReset {
		log.Fatalln("Cannot swap nodes after a swap has already been made")
	}

	node1 := b.Nodes[node1Coords.Line][node1Coords.Col]
	node2 := b.Nodes[node2Coords.Line][node2Coords.Col]

	if node1.Color == VeryBlue || node1.Color == VeryRed || node2.Color == VeryBlue || node2.Color == VeryRed {
		log.Fatalln("Can't swap nodes that are captured")
	}
	if node1.used || node2.used {
		log.Fatalln("Cannot swap nodes that have already been used")
	}

	if isReset {
		if !b.HasSwapped {
			log.Fatalln("Cannot reset a board that has not been swapped")
		}
		b.HasSwapped = false
		b.SwappedNodes = b.SwappedNodes[:0]
		node1.IsSwapped = false
		node2.IsSwapped = false
	} else {
		if b.HasSwapped {
			log.Fatalln("Cannot swap nodes after a swap has already been made")
		}
		b.HasSwapped = true
		b.SwappedNodes = append(b.SwappedNodes, node1, node2)
		node1.IsSwapped = true
		node2.IsSwapped = true
	}

	tempColor := node1.Color
	tempCleared := node1.cleared
	tempUsed := node1.used
	tempLetter := node1.Letter

	node1.Color = node2.Color
	node1.cleared = node2.cleared
	node1.used = node2.used
	node1.Letter = node2.Letter

	node2.Color = tempColor
	node2.cleared = tempCleared
	node2.used = tempUsed
	node2.Letter = tempLetter
}

func (b *Board) String() string {
	return b.StringWithWord(nil)
}

func (b *Board) StringWithWord(word *Word) string {
	if chunks == nil {
		chunks = strings.Split(boardLayout, "X")
	}

	red := color.New(color.FgRed)
	blue := color.New(color.FgBlue)

	var builder strings.Builder

	fmt.Fprintf(&builder, "Score: %s / %s\n", blue.Sprintf("%d", b.Score.Blue), red.Sprintf("%d", b.Score.Red))

	if word != nil {
		fmt.Fprintf(&builder, "Word: %s", word)
	}
	fmt.Fprintf(&builder, "\n")

	builder.Grow(len(boardLayout))
	for idx, node := range b.nodesFlat() {
		var letter string
		printColor := color.New(color.FgWhite)
		isSwapped := word != nil && len(word.SwappedNodes) > 0 && (word.SwappedNodes[0] == node.coords || word.SwappedNodes[1] == node.coords)
		if word != nil && word.Has(node.coords) {
			wordLetter := word.Get(node.coords)
			letter = string(wordLetter.Letter)
			if wordLetter.IsStart {
				if isSwapped {
					printColor = color.New(color.FgBlack, color.BgHiGreen)
				} else {
					printColor = color.New(color.FgHiGreen)
				}
			} else {
				if isSwapped {
					printColor = color.New(color.FgBlack, color.BgGreen)
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
				printColor = color.New(color.FgHiRed)
			} else if node.Color == VeryBlue {
				printColor = color.New(color.FgHiBlue)
			}
			// TODO: There is no way to have a swapped node that is not part of the word right now
			// but that would be a good improvement to the algorithm.
			// if node.IsSwapped {
			// 	if node.Color == None {
			// 		printColor = color.New(color.FgBlack, color.BgWhite)
			// 	} else {
			// 		printColor = printColor.Add(color.BgWhite)
			// 	}
			// }
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
	{ // 0
		{ // 0
			{1, 0},
			{1, 1},
			{2, 1},
		},
	},
	{ // 1
		{ // 0
			{0, 0},
			{2, 0},
			{2, 1},
			{3, 1},
		},
		{ // 1
			{0, 0},
			{2, 1},
			{2, 2},
			{3, 2},
		},
	},
	{ // 2
		{ // 0
			{1, 0},
			{3, 0},
			{3, 1},
			{4, 1},
		},
		{ // 1
			{0, 0},
			{1, 0},
			{1, 1},
			{3, 1},
			{3, 2},
			{4, 2},
		},
		{ // 2
			{1, 1},
			{3, 2},
			{3, 3},
			{4, 3},
		},
	},
	{ // 3
		{ // 0
			{2, 0},
			{4, 0},
			{4, 1},
			{5, 0},
		},
		{ // 1
			{1, 0},
			{2, 0},
			{2, 1},
			{4, 1},
			{4, 2},
			{5, 1},
		},
		{ // 2
			{1, 1},
			{2, 1},
			{2, 2},
			{4, 2},
			{4, 3},
			{5, 2},
		},
		{ // 3
			{2, 2},
			{4, 3},
			{4, 4},
			{5, 3},
		},
	},
	{ // 4
		{ // 0
			{3, 0},
			{5, 0},
			{6, 0},
		},
		{ // 1
			{2, 0},
			{3, 0},
			{3, 1},
			{5, 0},
			{5, 1},
			{6, 1},
		},
		{ // 2
			{2, 1},
			{3, 1},
			{3, 2},
			{5, 1},
			{5, 2},
			{6, 2},
		},
		{ // 3
			{2, 2},
			{3, 2},
			{3, 3},
			{5, 2},
			{5, 3},
			{6, 3},
		},
		{ // 4
			{3, 3},
			{5, 3},
			{6, 4},
		},
	},
	{ // 5
		{ // 0
			{3, 0},
			{4, 0},
			{4, 1},
			{6, 0},
			{6, 1},
			{7, 0},
		},
		{ // 1
			{3, 1},
			{4, 1},
			{4, 2},
			{6, 1},
			{6, 2},
			{7, 1},
		},
		{ // 2
			{3, 2},
			{4, 2},
			{4, 3},
			{6, 2},
			{6, 3},
			{7, 2},
		},
		{ // 3
			{3, 3},
			{4, 3},
			{4, 4},
			{6, 3},
			{6, 4},
			{7, 3},
		},
	},
	{ // 6
		{ // 0
			{4, 0},
			{5, 0},
			{7, 0},
			{8, 0},
		},
		{ // 1
			{4, 1},
			{5, 0},
			{5, 1},
			{7, 0},
			{7, 1},
			{8, 1},
		},
		{ // 2
			{4, 2},
			{5, 1},
			{5, 2},
			{7, 1},
			{7, 2},
			{8, 2},
		},
		{ // 3
			{4, 3},
			{5, 2},
			{5, 3},
			{7, 2},
			{7, 3},
			{8, 3},
		},
		{ // 4
			{4, 4},
			{5, 3},
			{7, 3},
			{8, 4},
		},
	},
	{ // 7
		{ // 0
			{5, 0},
			{6, 0},
			{6, 1},
			{8, 0},
			{8, 1},
			{9, 0},
		},
		{ // 1
			{5, 1},
			{6, 1},
			{6, 2},
			{8, 1},
			{8, 2},
			{9, 1},
		},
		{ // 2
			{5, 2},
			{6, 2},
			{6, 3},
			{8, 2},
			{8, 3},
			{9, 2},
		},
		{ // 3
			{5, 3},
			{6, 3},
			{6, 4},
			{8, 3},
			{8, 4},
			{9, 3},
		},
	},
	{ // 8
		{ // 0
			{6, 0},
			{7, 0},
			{9, 0},
			{10, 0},
		},
		{ // 1
			{6, 1},
			{7, 0},
			{7, 1},
			{9, 0},
			{9, 1},
			{10, 1},
		},
		{ // 2
			{6, 2},
			{7, 1},
			{7, 2},
			{9, 1},
			{9, 2},
			{10, 2},
		},
		{ // 3
			{6, 3},
			{7, 2},
			{7, 3},
			{9, 2},
			{9, 3},
			{10, 3},
		},
		{ // 4
			{6, 4},
			{7, 3},
			{9, 3},
			{10, 4},
		},
	},
	{ // 9
		{ // 0
			{7, 0},
			{8, 0},
			{8, 1},
			{10, 0},
			{10, 1},
			{11, 0},
		},
		{ // 1
			{7, 1},
			{8, 1},
			{8, 2},
			{10, 1},
			{10, 2},
			{11, 1},
		},
		{ // 2
			{7, 2},
			{8, 2},
			{8, 3},
			{10, 2},
			{10, 3},
			{11, 2},
		},
		{ // 3
			{7, 3},
			{8, 3},
			{8, 4},
			{10, 3},
			{10, 4},
			{11, 3},
		},
	},
	{ // 10
		{ // 0
			{8, 0},
			{9, 0},
			{11, 0},
			{12, 0},
		},
		{ // 1
			{8, 1},
			{9, 0},
			{9, 1},
			{11, 0},
			{11, 1},
			{12, 1},
		},
		{ // 2
			{8, 2},
			{9, 1},
			{9, 2},
			{11, 1},
			{11, 2},
			{12, 2},
		},
		{ // 3
			{8, 3},
			{9, 2},
			{9, 3},
			{11, 2},
			{11, 3},
			{12, 3},
		},
		{ // 4
			{8, 4},
			{9, 3},
			{11, 3},
			{12, 4},
		},
	},
	{ // 11
		{ // 0
			{9, 0},
			{10, 0},
			{10, 1},
			{12, 0},
			{12, 1},
			{13, 0},
		},
		{ // 1
			{9, 1},
			{10, 1},
			{10, 2},
			{12, 1},
			{12, 2},
			{13, 1},
		},
		{ // 2
			{9, 2},
			{10, 2},
			{10, 3},
			{12, 2},
			{12, 3},
			{13, 2},
		},
		{ // 3
			{9, 3},
			{10, 3},
			{10, 4},
			{12, 3},
			{12, 4},
			{13, 3},
		},
	},
	{ // 12
		{ // 0
			{10, 0},
			{11, 0},
			{13, 0},
		},
		{ // 1
			{10, 1},
			{11, 0},
			{11, 1},
			{13, 0},
			{13, 1},
			{14, 0},
		},
		{ // 2
			{10, 2},
			{11, 1},
			{11, 2},
			{13, 1},
			{13, 2},
			{14, 1},
		},
		{ // 3
			{10, 3},
			{11, 2},
			{11, 3},
			{13, 2},
			{13, 3},
			{14, 2},
		},
		{ // 4
			{10, 4},
			{11, 3},
			{13, 3},
		},
	},
	{ // 13
		{ // 0
			{11, 0},
			{12, 0},
			{12, 1},
			{14, 0},
		},
		{ // 1
			{11, 1},
			{12, 1},
			{12, 2},
			{14, 0},
			{14, 1},
			{15, 0},
		},
		{ // 2
			{11, 2},
			{12, 2},
			{12, 3},
			{14, 1},
			{14, 2},
			{15, 1},
		},
		{ // 3
			{11, 3},
			{12, 3},
			{12, 4},
			{14, 2},
		},
	},
	{ // 14
		{ // 0
			{12, 1},
			{13, 0},
			{13, 1},
			{15, 0},
		},
		{ // 1
			{12, 2},
			{13, 1},
			{13, 2},
			{15, 0},
			{15, 1},
			{16, 0},
		},
		{ // 2
			{12, 3},
			{13, 2},
			{13, 3},
			{15, 1},
		},
	},
	{ // 15
		{ // 0
			{13, 1},
			{14, 0},
			{14, 1},
			{16, 0},
		},
		{ // 1
			{13, 2},
			{14, 1},
			{14, 2},
			{16, 0},
		},
	},
	{ // 16
		{ // 0
			{14, 1},
			{15, 0},
			{15, 1},
		},
	},
}
