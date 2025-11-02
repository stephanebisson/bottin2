import { computed, ref } from 'vue'

export function useTicTacToe() {
  // Board state: 3x3 grid, null = empty, 'X' = player, 'O' = computer
  const board = ref(Array.from({length: 9}).fill(null))
  const currentPlayer = ref('X')
  const gameOver = ref(false)
  const winner = ref(null)

  // Winning combinations
  const winningCombinations = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6], // Diagonals
  ]

  // Check for winner
  const checkWinner = () => {
    for (const combo of winningCombinations) {
      const [a, b, c] = combo
      if (board.value[a] && board.value[a] === board.value[b] && board.value[a] === board.value[c]) {
        return board.value[a]
      }
    }
    return null
  }

  // Check for draw
  const isDraw = computed(() => {
    return !winner.value && board.value.every(cell => cell !== null)
  })

  // Get available moves
  const getAvailableMoves = () => {
    return board.value
      .map((cell, index) => (cell === null ? index : null))
      .filter(index => index !== null)
  }

  // Simple AI: random move with basic strategy
  const makeComputerMove = () => {
    if (gameOver.value) {return}

    const availableMoves = getAvailableMoves()
    if (availableMoves.length === 0) {return}

    // Try to win
    for (const move of availableMoves) {
      board.value[move] = 'O'
      if (checkWinner() === 'O') {
        finishTurn()
        return
      }
      board.value[move] = null
    }

    // Try to block player from winning
    for (const move of availableMoves) {
      board.value[move] = 'X'
      if (checkWinner() === 'X') {
        board.value[move] = 'O'
        finishTurn()
        return
      }
      board.value[move] = null
    }

    // Take center if available
    if (availableMoves.includes(4)) {
      board.value[4] = 'O'
      finishTurn()
      return
    }

    // Take a corner if available
    const corners = [0, 2, 6, 8].filter(i => availableMoves.includes(i))
    if (corners.length > 0) {
      const randomCorner = corners[Math.floor(Math.random() * corners.length)]
      board.value[randomCorner] = 'O'
      finishTurn()
      return
    }

    // Random move
    const randomMove = availableMoves[Math.floor(Math.random() * availableMoves.length)]
    board.value[randomMove] = 'O'
    finishTurn()
  }

  // Finish turn and check game state
  const finishTurn = () => {
    const foundWinner = checkWinner()
    if (foundWinner) {
      winner.value = foundWinner
      gameOver.value = true
    } else if (isDraw.value) {
      gameOver.value = true
    } else {
      currentPlayer.value = currentPlayer.value === 'X' ? 'O' : 'X'
    }
  }

  // Make a move
  const makeMove = (index) => {
    if (board.value[index] || gameOver.value || currentPlayer.value !== 'X') {
      return
    }

    board.value[index] = 'X'
    finishTurn()

    // Computer's turn after a short delay
    if (!gameOver.value && currentPlayer.value === 'O') {
      setTimeout(() => {
        makeComputerMove()
      }, 500)
    }
  }

  // Reset game
  const resetGame = () => {
    board.value = Array.from({length: 9}).fill(null)
    currentPlayer.value = 'X'
    gameOver.value = false
    winner.value = null
  }

  return {
    board,
    currentPlayer,
    gameOver,
    winner,
    isDraw,
    makeMove,
    resetGame,
  }
}
