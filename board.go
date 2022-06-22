package main

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
	Letter  string `json:"char"`
	Color   Color  `json:"color"`
	cleared bool
	used    bool
	coords  []int
}

type Board struct {
	Score BoardScore     `json:"score"`
	Nodes [][]*BoardNode `json:"nodes"`
}

func (b *Board) Initialize() {
	// Set the node coordinates
	for lineNum := 0; lineNum < len(b.Nodes); lineNum++ {
		for nodeNum := 0; nodeNum < len(b.Nodes[lineNum]); nodeNum++ {
			b.Nodes[lineNum][nodeNum].coords = []int{lineNum, nodeNum}
			b.Nodes[lineNum][nodeNum].used = false
			b.Nodes[lineNum][nodeNum].cleared = false

		}
	}
}

func (b *Board) Play(word Word, mover Mover) *Board {
	board := b.clone()
	for _, letter := range word.letters {
		node := board.Nodes[letter.coords[0]][letter.coords[1]]
		if node.Color == None {
			node.Color = mover.GetColor()
		}
	}

	hexagonCenters := []*BoardNode{}
	for lineNum := 0; lineNum < len(board.Nodes); lineNum++ {
		for nodeNum := 0; nodeNum < len(board.Nodes[lineNum]); nodeNum++ {
			node := board.Nodes[lineNum][nodeNum]
			hexagon := node.checkHexagon(board)
			if hexagon != "" {
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
		node.clearHexagon(board)
	}

	superHexagons := []*BoardNode{}
	for lineNum := 0; lineNum < len(board.Nodes); lineNum++ {
		for nodeNum := 0; nodeNum < len(board.Nodes[lineNum]); nodeNum++ {
			node := board.Nodes[lineNum][nodeNum]
			if node.isSuperHexagon(board) {
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
	neighbors := []*BoardNode{}
	neighbor_coords := coords_to_neighbors[nodeCoord[0]][nodeCoord[1]]

	for _, coord := range neighbor_coords {
		neighbors = append(neighbors, b.Nodes[coord[0]][coord[1]])
	}

	return neighbors
}

func (n *BoardNode) checkHexagon(board *Board) Mover {
	neighbors := board.GetNeighbors(n.coords)
	if len(neighbors) != 6 {
		return ""
	}
	if n.Color == None || n.Color == VeryRed || n.Color == VeryBlue {
		return ""
	}

	redCount := 0
	blueCount := 0
	if n.Color == Red {
		redCount = 1
	} else if n.Color == Blue {
		blueCount = 1
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
		Nodes: make([][]*BoardNode, len(b.Nodes)),
	}
	for lineNum := 0; lineNum < len(b.Nodes); lineNum++ {
		board.Nodes[lineNum] = make([]*BoardNode, len(b.Nodes[lineNum]))
		for nodeNum := 0; nodeNum < len(b.Nodes[lineNum]); nodeNum++ {
			board.Nodes[lineNum][nodeNum] = &BoardNode{
				Letter:  b.Nodes[lineNum][nodeNum].Letter,
				Color:   b.Nodes[lineNum][nodeNum].Color,
				cleared: b.Nodes[lineNum][nodeNum].cleared,
				used:    b.Nodes[lineNum][nodeNum].used,
				coords:  b.Nodes[lineNum][nodeNum].coords,
			}
		}
	}

	return &board
}

func (n *BoardNode) clearHexagon(board *Board) {
	if n.Color == Red {
		n.Color = VeryRed
	} else if n.Color == Blue {
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
