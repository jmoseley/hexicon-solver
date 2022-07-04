import debugFactory from "debug";
import DraftLog from "draftLog";

import { Board, BoardScore } from "./board";
import { sortByHexagonCount } from "./score";
import { findAllWords } from "./solve";
import { Trie } from "./trie";

const debug = debugFactory("minimax");

DraftLog(console);

class StatusTracker {
  private bestMove: BoardScore | undefined;
  private bestScore: number | undefined;
  private boardsAnalyzed: number = 0;
  private analysisTime: number = 0;
  private maxDepth: number = 0;
  private currentDepth: number = 0;
  private movesRemaining: number = 0;

  // private statusLine: ReturnType<typeof console.draft>;

  constructor() {
    // this.statusLine = console.draft("Minimax initializing....");
  }

  addMovesRemaining(numMoves: number) {
    this.movesRemaining += numMoves;
    this.draw();
  }

  moveProcessed(num = 1) {
    this.movesRemaining -= num;
    this.draw();
  }

  updateDepth(depth: number) {
    this.maxDepth = Math.max(this.maxDepth, depth);
    this.currentDepth = depth;
    this.draw();
  }

  boardAnalyzed(time: number) {
    this.boardsAnalyzed++;
    this.analysisTime += time;
    this.draw();
  }

  updateScore({
    bestMove,
    bestScore,
  }: {
    bestMove: BoardScore;
    bestScore: number;
  }) {
    this.bestMove = bestMove;
    this.bestScore = bestScore;
    this.draw();
  }

  draw() {
    // const avgTimePerBoard = Math.round(this.analysisTime / this.boardsAnalyzed);
    // this.statusLine(
    //   `Moves Remaining: ${
    //     this.movesRemaining
    //   } Avg ms/Board: ${avgTimePerBoard} Depth: ${
    //     this.currentDepth
    //   } Max Depth: ${this.maxDepth} ${
    //     this.bestMove
    //       ? ` Minimax best move: ${this.bestMove?.word.toString()}`
    //       : ""
    //   }`
    // );
  }
}

// Use minimax to find the best move
export function miniMax(board: Board, dictionary: Trie) {
  const statusTracker = new StatusTracker();

  const startTime = performance.now();
  const moves = findAllWords(board, dictionary, "blue")
    .filter((s) => s.word.length > 5)
    .sort(sortByHexagonCount("blue"))
    .slice(0, 100);
  statusTracker.boardAnalyzed(performance.now() - startTime);

  const maxDepth = Math.min(16 - board.blueScore + 1, 2);
  debug("maxDepth", maxDepth);

  debug(
    "top level moves",
    moves.map((s) => s.word.toString())
  );

  let alpha = -Infinity;
  let best = -Infinity;
  let bestMove: BoardScore | undefined;
  statusTracker.addMovesRemaining(moves.length);
  for (const move of moves) {
    const score = runMiniMax(
      statusTracker,
      move.board,
      dictionary,
      "red",
      maxDepth,
      alpha
    );
    if (score > best) {
      best = score;
      bestMove = move;
      statusTracker.updateScore({
        bestMove: move,
        bestScore: score,
      });
      debug("best move", move.word.toString());
    }
    alpha = Math.max(alpha, best);
    debug("Top level", best, alpha);
    statusTracker.moveProcessed();
  }

  if (!bestMove) {
    throw new Error("No best move.");
  }

  console.info(`Best move: ${bestMove.word} Expected Final Score: ${best}`);

  return bestMove;
}

function runMiniMax(
  statusTracker: StatusTracker,
  board: Board,
  dictionary: Trie,
  mover: "red" | "blue",
  maxDepth: number,
  alpha: number = -Infinity,
  beta: number = Infinity,
  depth: number = 0
): number {
  if (debug.enabled) debug("Depth", depth, "mover", mover);
  statusTracker.updateDepth(depth);

  if (mover === "blue" && board.blueScore * board.probability >= 16) {
    if (debug.enabled)
      debug("Blue winner", board.blueScore * board.probability);
    return board.blueScore * board.probability;
  } else if (mover === "red" && board.redScore * board.probability >= 16) {
    if (debug.enabled) debug("Red winner", board.redScore * board.probability);
    return board.redScore * board.probability;
  }

  // Base case
  if (depth === maxDepth) {
    if (debug.enabled) debug("Base case");
    // Maximize blue, minimize red
    if (mover === "blue") {
      if (debug.enabled) debug("Blue", board.blueScore * board.probability);
      return board.blueScore * board.probability;
    } else {
      if (debug.enabled) debug("Red", board.redScore * board.probability);
      return board.redScore * board.probability;
    }
  }

  const startTime = performance.now();
  const moves = findAllWords(board, dictionary, mover)
    .filter((s) => s.word.length > 4)
    .filter((s) => {
      if (mover === "blue") {
        return s.blueHexagonCount > 0;
      } else {
        return s.redHexagonCount > 0;
      }
    })
    .sort(sortByHexagonCount(mover));

  statusTracker.boardAnalyzed(performance.now() - startTime);
  statusTracker.addMovesRemaining(moves.length);
  if (moves.length === 0) {
    if (debug.enabled) debug("No moves");
    if (mover === "blue") {
      return board.blueScore * board.probability;
    } else {
      return board.redScore * board.probability;
    }
  }

  if (debug.enabled) debug("Moves", moves.length);

  // Recursive case
  if (mover === "blue") {
    let best = -Infinity;
    let movesProcessed = 0;
    for (const move of moves) {
      best = Math.max(
        best,
        runMiniMax(
          statusTracker,
          move.board,
          dictionary,
          "red",
          maxDepth,
          alpha,
          beta,
          depth + 1
        )
      );
      if (best >= beta) {
        if (debug.enabled) debug("Beta cutoff", best, beta);
        statusTracker.moveProcessed(moves.length - movesProcessed);
        break;
      }
      alpha = Math.max(alpha, best);
      statusTracker.moveProcessed();
      movesProcessed++;
    }
    return best;
  } else {
    let best = Infinity;
    let movesProcessed = 0;
    for (const move of moves) {
      best = Math.min(
        best,
        runMiniMax(
          statusTracker,
          move.board,
          dictionary,
          "blue",
          maxDepth,
          alpha,
          beta,
          depth + 1
        )
      );
      if (best <= alpha) {
        if (debug.enabled) debug("Alpha cutoff", best, alpha);
        statusTracker.moveProcessed(moves.length - movesProcessed);
        break;
      }
      beta = Math.min(beta, best);
      statusTracker.moveProcessed();
      movesProcessed++;
    }
    return best;
  }
}
