import { ref } from 'vue'

export function use2048() {
  // 4x4 grid of tiles
  const board = ref([])
  const score = ref(0)
  const gameOver = ref(false)
  const gameWon = ref(false)
  const bestScore = ref(Number.parseInt(localStorage.getItem('2048-best-score') || '0'))

  // Initialize empty board
  const initBoard = () => {
    board.value = Array.from({ length: 4 }, () =>
      Array.from({ length: 4 }, () => ({ value: 0, isNew: false, isMerged: false }))
    )
  }

  // Get empty cells
  const getEmptyCells = () => {
    const empty = []
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if (board.value[i][j].value === 0) {
          empty.push({ row: i, col: j })
        }
      }
    }
    return empty
  }

  // Add random tile (2 or 4)
  const addRandomTile = () => {
    const empty = getEmptyCells()
    if (empty.length === 0) {return false}

    const { row, col } = empty[Math.floor(Math.random() * empty.length)]
    const value = Math.random() < 0.9 ? 2 : 4
    board.value[row][col] = { value, isNew: true, isMerged: false }
    return true
  }

  // Clear animation flags
  const clearAnimationFlags = () => {
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        board.value[i][j].isNew = false
        board.value[i][j].isMerged = false
      }
    }
  }

  // Move and merge tiles in one direction
  const moveTiles = (direction) => {
    if (gameOver.value) {return false}

    clearAnimationFlags()
    let moved = false
    // Deep clone the board array and cell objects
    const newBoard = board.value.map(row =>
      row.map(cell => ({ ...cell }))
    )

    if (direction === 'left' || direction === 'right') {
      for (let i = 0; i < 4; i++) {
        const row = newBoard[i].map(cell => cell.value)
        const { newRow, scored, hasMoved } = mergeRow(row, direction === 'right')
        if (hasMoved) {moved = true}
        score.value += scored
        for (let j = 0; j < 4; j++) {
          newBoard[i][j].value = newRow[j]
        }
      }
    } else {
      // up or down
      for (let j = 0; j < 4; j++) {
        const col = newBoard.map(row => row[j].value)
        const { newRow, scored, hasMoved } = mergeRow(col, direction === 'down')
        if (hasMoved) {moved = true}
        score.value += scored
        for (let i = 0; i < 4; i++) {
          newBoard[i][j].value = newRow[i]
        }
      }
    }

    if (moved) {
      board.value = newBoard
      setTimeout(() => {
        addRandomTile()
        checkGameState()
      }, 150)
    }

    return moved
  }

  // Merge a single row/column
  const mergeRow = (row, reverse) => {
    const newRow = row.filter(val => val !== 0)
    let scored = 0
    let hasMoved = false

    if (reverse) {newRow.reverse()}

    // Merge adjacent equal values
    for (let i = 0; i < newRow.length - 1; i++) {
      if (newRow[i] === newRow[i + 1]) {
        newRow[i] *= 2
        scored += newRow[i]
        newRow.splice(i + 1, 1)
        hasMoved = true
      }
    }

    // Pad with zeros
    while (newRow.length < 4) {
      newRow.push(0)
    }

    if (reverse) {newRow.reverse()}

    // Check if row changed
    if (!hasMoved) {
      for (let i = 0; i < 4; i++) {
        if (row[i] !== newRow[i]) {
          hasMoved = true
          break
        }
      }
    }

    return { newRow, scored, hasMoved }
  }

  // Check if any moves are possible
  const canMove = () => {
    // Check for empty cells
    if (getEmptyCells().length > 0) {return true}

    // Check for adjacent equal values
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const val = board.value[i][j].value
        if (
          (i < 3 && board.value[i + 1][j].value === val) ||
          (j < 3 && board.value[i][j + 1].value === val)
        ) {
          return true
        }
      }
    }
    return false
  }

  // Check game state (win/lose)
  const checkGameState = () => {
    // Check for 2048 tile (win)
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if (board.value[i][j].value === 2048 && !gameWon.value) {
          gameWon.value = true
          return
        }
      }
    }

    // Check for game over
    if (!canMove()) {
      gameOver.value = true
      if (score.value > bestScore.value) {
        bestScore.value = score.value
        localStorage.setItem('2048-best-score', score.value.toString())
      }
    }
  }

  // Continue playing after winning
  const continueGame = () => {
    gameWon.value = false
  }

  // Reset game
  const resetGame = () => {
    initBoard()
    score.value = 0
    gameOver.value = false
    gameWon.value = false
    addRandomTile()
    addRandomTile()
  }

  // Handle keyboard input
  const handleKeyPress = (event) => {
    if (gameOver.value) {return}

    const keyMap = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
    }

    const direction = keyMap[event.key]
    if (direction) {
      event.preventDefault()
      moveTiles(direction)
    }
  }

  // Handle swipe gestures
  const handleSwipe = (direction) => {
    moveTiles(direction)
  }

  // Initialize game
  resetGame()

  return {
    board,
    score,
    bestScore,
    gameOver,
    gameWon,
    moveTiles,
    resetGame,
    continueGame,
    handleKeyPress,
    handleSwipe,
  }
}
