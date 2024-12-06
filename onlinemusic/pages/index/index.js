Page({
  data: {
    board: [],
    score: 0,
    moves: 30,
    candyTypes: ['🍎', '🐻', '🐼', '🐨', '🦁', '🐯'],
    selectedCandy: null,
    boardSize: 8,
    isAnimating: false,
  },

  onLoad() {
    this.initializeBoard();
  },

  initializeBoard() {
    const board = [];
    let id = 0;
    
    for (let row = 0; row < this.data.boardSize; row++) {
      for (let col = 0; col < this.data.boardSize; col++) {
        board.push({
          id: id++,
          row,
          col,
          type: this.getRandomCandy(),
          selected: false
        });
      }
    }
    
    this.setData({ board });
    this.checkAndClearMatches();
  },

  getRandomCandy() {
    const { candyTypes } = this.data;
    return candyTypes[Math.floor(Math.random() * candyTypes.length)];
  },

  onBoardTap(e) {
    const { row, col } = e.target.dataset;
    if (row === undefined || col === undefined) return;

    const index = row * this.data.boardSize + col;
    const candy = this.data.board[index];

    if (!this.data.selectedCandy) {
      // 第一次选择
      const board = this.data.board.map(c => ({
        ...c,
        selected: c.id === candy.id
      }));
      this.setData({
        selectedCandy: candy,
        board
      });
    } else {
      // 第二次选择
      if (this.isAdjacent(this.data.selectedCandy, candy)) {
        this.swapCandies(this.data.selectedCandy, candy);
      }
      
      const board = this.data.board.map(c => ({
        ...c,
        selected: false
      }));
      this.setData({
        selectedCandy: null,
        board
      });
    }
  },

  isAdjacent(candy1, candy2) {
    return (Math.abs(candy1.row - candy2.row) === 1 && candy1.col === candy2.col) ||
           (Math.abs(candy1.col - candy2.col) === 1 && candy1.row === candy2.row);
  },

  async swapCandies(candy1, candy2) {
    if (this.data.isAnimating) return;
    this.data.isAnimating = true;

    const board = [...this.data.board];
    const index1 = candy1.row * this.data.boardSize + candy1.col;
    const index2 = candy2.row * this.data.boardSize + candy2.col;
    
    // 确定交换方向
    let direction1, direction2;
    if (candy1.row === candy2.row) {
      direction1 = candy1.col < candy2.col ? 'swap-right' : 'swap-left';
      direction2 = candy1.col < candy2.col ? 'swap-left' : 'swap-right';
    } else {
      direction1 = candy1.row < candy2.row ? 'swap-down' : 'swap-up';
      direction2 = candy1.row < candy2.row ? 'swap-up' : 'swap-down';
    }

    // 添加交换动画类
    board[index1].swapDirection = direction1;
    board[index2].swapDirection = direction2;
    this.setData({ board });

    // 等待动画完成
    await new Promise(resolve => setTimeout(resolve, 300));

    // 交换糖果
    const tempType = board[index1].type;
    board[index1].type = board[index2].type;
    board[index2].type = tempType;
    
    // 移除动画类
    board[index1].swapDirection = '';
    board[index2].swapDirection = '';
    
    this.setData({ board });

    // 检查是否有匹配
    if (!await this.checkAndClearMatches()) {
      // 如果没有匹配，换回来
      board[index1].swapDirection = direction2;
      board[index2].swapDirection = direction1;
      this.setData({ board });

      await new Promise(resolve => setTimeout(resolve, 300));

      board[index1].type = board[index2].type;
      board[index2].type = tempType;
      board[index1].swapDirection = '';
      board[index2].swapDirection = '';
      this.setData({ board });
    } else {
      this.setData({
        moves: this.data.moves - 1
      });
      
      if (this.data.moves <= 0) {
        this.showGameOver();
      }
    }

    this.data.isAnimating = false;
  },

  checkAndClearMatches() {
    const matches = new Set();
    let hasMatches = false;

    // 检查行匹配
    for (let row = 0; row < this.data.boardSize; row++) {
      let count = 1;
      let currentType = null;
      
      for (let col = 0; col < this.data.boardSize; col++) {
        const index = row * this.data.boardSize + col;
        const type = this.data.board[index].type;
        
        if (type === currentType) {
          count++;
        } else {
          if (count >= 3) {
            // 添加之前连续的匹配
            for (let i = 1; i <= count; i++) {
              matches.add(row * this.data.boardSize + (col - i));
            }
            hasMatches = true;
          }
          count = 1;
          currentType = type;
        }
      }
      // 检查行末尾的匹配
      if (count >= 3) {
        for (let i = 1; i <= count; i++) {
          matches.add(row * this.data.boardSize + (this.data.boardSize - i));
        }
        hasMatches = true;
      }
    }

    // 检查列匹配
    for (let col = 0; col < this.data.boardSize; col++) {
      let count = 1;
      let currentType = null;
      
      for (let row = 0; row < this.data.boardSize; row++) {
        const index = row * this.data.boardSize + col;
        const type = this.data.board[index].type;
        
        if (type === currentType) {
          count++;
        } else {
          if (count >= 3) {
            // 添加之前连续的匹配
            for (let i = 1; i <= count; i++) {
              matches.add((row - i) * this.data.boardSize + col);
            }
            hasMatches = true;
          }
          count = 1;
          currentType = type;
        }
      }
      // 检查列末尾的匹配
      if (count >= 3) {
        for (let i = 1; i <= count; i++) {
          matches.add((this.data.boardSize - i) * this.data.boardSize + col);
        }
        hasMatches = true;
      }
    }

    // 处理匹配的消除和动画
    if (hasMatches) {
      const board = [...this.data.board];
      matches.forEach(index => {
        board[index] = {
          ...board[index],
          matched: true,
          score: true,
        };
      });

      this.setData({ board });

      setTimeout(() => {
        matches.forEach(index => {
          board[index] = {
            ...board[index],
            type: this.getRandomCandy(),
            matched: false,
            score: false,
            new: true
          };
        });
        
        this.setData({
          board,
          score: this.data.score + matches.size * 10
        });

        setTimeout(() => {
          matches.forEach(index => {
            board[index].new = false;
          });
          this.setData({ board });
        }, 300);
      }, 500);

      return true;
    }

    return false;
  },

  resetGame() {
    this.setData({
      score: 0,
      moves: 30,
      selectedCandy: null,
      isAnimating: false
    });
    this.initializeBoard();
  },

  showGameOver() {
    wx.showModal({
      title: '游戏结束',
      content: `最终得分：${this.data.score}`,
      confirmText: '再玩一次',
      success: (res) => {
        if (res.confirm) {
          this.resetGame();
        }
      }
    });
  },

  // 添加分数弹出方法
  showScorePopup(candy) {
    const popup = document.createElement('view');
    popup.className = 'score-popup';
    popup.textContent = '+10';
    candy.appendChild(popup);
    
    popup.addEventListener('animationend', () => {
      popup.remove();
    });
  }
}); 