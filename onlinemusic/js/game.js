class CandyCrush {
    constructor() {
        this.boardSize = 8;
        this.candyTypes = ['🍎', '🍇', '🍊', '🍋', '🍉', '🍓'];
        this.board = [];
        this.score = 0;
        this.moves = 30;
        this.selectedCandy = null;
        this.isAnimating = false;
        
        this.gameBoard = document.getElementById('game-board');
        this.scoreElement = document.getElementById('score');
        this.movesElement = document.getElementById('moves');
        
        this.initializeBoard();
        this.setupEventListeners();
    }

    initializeBoard() {
        this.gameBoard.style.gridTemplateColumns = `repeat(${this.boardSize}, 50px)`;
        this.board = [];

        // 清空游戏板
        while (this.gameBoard.firstChild) {
            this.gameBoard.removeChild(this.gameBoard.firstChild);
        }

        // 创建新的糖果板
        for (let row = 0; row < this.boardSize; row++) {
            this.board[row] = [];
            for (let col = 0; col < this.boardSize; col++) {
                const candy = this.createCandy(row, col);
                this.board[row][col] = candy;
                this.gameBoard.appendChild(candy);
            }
        }

        // 检查并消除初始匹配
        this.checkAndClearMatches();
    }

    createCandy(row, col) {
        const candy = document.createElement('div');
        candy.className = 'candy';
        candy.dataset.row = row;
        candy.dataset.col = col;
        candy.textContent = this.getRandomCandy();
        return candy;
    }

    getRandomCandy() {
        return this.candyTypes[Math.floor(Math.random() * this.candyTypes.length)];
    }

    setupEventListeners() {
        this.gameBoard.addEventListener('click', (e) => {
            const candy = e.target.closest('.candy');
            if (!candy) return;

            if (this.selectedCandy === null) {
                // 第一次选择
                this.selectedCandy = candy;
                candy.classList.add('selected');
            } else {
                // 第二次选择
                const row1 = parseInt(this.selectedCandy.dataset.row);
                const col1 = parseInt(this.selectedCandy.dataset.col);
                const row2 = parseInt(candy.dataset.row);
                const col2 = parseInt(candy.dataset.col);

                if (this.isAdjacent(row1, col1, row2, col2)) {
                    this.swapCandies(row1, col1, row2, col2);
                }

                this.selectedCandy.classList.remove('selected');
                this.selectedCandy = null;
            }
        });

        // 添加触摸事件支持
        let touchStartX, touchStartY;
        
        this.gameBoard.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            
            const candy = document.elementFromPoint(touchStartX, touchStartY).closest('.candy');
            if (!candy) return;

            if (this.selectedCandy === null) {
                this.selectedCandy = candy;
                candy.classList.add('selected');
            }
        });

        this.gameBoard.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (!this.selectedCandy) return;

            const touch = e.changedTouches[0];
            const touchEndX = touch.clientX;
            const touchEndY = touch.clientY;
            
            const candy = document.elementFromPoint(touchEndX, touchEndY).closest('.candy');
            if (!candy || candy === this.selectedCandy) {
                this.selectedCandy.classList.remove('selected');
                this.selectedCandy = null;
                return;
            }

            const row1 = parseInt(this.selectedCandy.dataset.row);
            const col1 = parseInt(this.selectedCandy.dataset.col);
            const row2 = parseInt(candy.dataset.row);
            const col2 = parseInt(candy.dataset.col);

            if (this.isAdjacent(row1, col1, row2, col2)) {
                this.swapCandies(row1, col1, row2, col2);
            }

            this.selectedCandy.classList.remove('selected');
            this.selectedCandy = null;
        });
    }

    isAdjacent(row1, col1, row2, col2) {
        return (Math.abs(row1 - row2) === 1 && col1 === col2) ||
               (Math.abs(col1 - col2) === 1 && row1 === row2);
    }

    async swapCandies(row1, col1, row2, col2) {
        if (this.isAnimating) return;
        this.isAnimating = true;

        const candy1 = this.board[row1][col1];
        const candy2 = this.board[row2][col2];
        
        // 添加交换动画
        const rect1 = candy1.getBoundingClientRect();
        const rect2 = candy2.getBoundingClientRect();
        const deltaX = rect2.left - rect1.left;
        const deltaY = rect2.top - rect1.top;

        try {
            await Promise.all([
                candy1.animate([
                    { transform: 'translate(0, 0)' },
                    { transform: `translate(${deltaX}px, ${deltaY}px)` }
                ], {
                    duration: 300,
                    easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
                }).finished,
                candy2.animate([
                    { transform: 'translate(0, 0)' },
                    { transform: `translate(${-deltaX}px, ${-deltaY}px)` }
                ], {
                    duration: 300,
                    easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
                }).finished
            ]);

            // 交换内容
            const tempContent = candy1.textContent;
            candy1.textContent = candy2.textContent;
            candy2.textContent = tempContent;

            // 更新数组
            this.board[row1][col1] = candy1;
            this.board[row2][col2] = candy2;

            // 检查匹配
            if (!await this.checkAndClearMatches()) {
                // 如果没有匹配，换回来
                await Promise.all([
                    candy1.animate([
                        { transform: `translate(${deltaX}px, ${deltaY}px)` },
                        { transform: 'translate(0, 0)' }
                    ], {
                        duration: 300,
                        easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
                    }).finished,
                    candy2.animate([
                        { transform: `translate(${-deltaX}px, ${-deltaY}px)` },
                        { transform: 'translate(0, 0)' }
                    ], {
                        duration: 300,
                        easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
                    }).finished
                ]);
                
                candy1.textContent = tempContent;
                candy2.textContent = candy1.textContent;
            } else {
                this.moves--;
                this.movesElement.textContent = this.moves;
                
                if (this.moves <= 0) {
                    this.showGameOver();
                }
            }
        } finally {
            this.isAnimating = false;
        }
    }

    async checkAndClearMatches() {
        let hasMatches = false;
        const matches = new Set();

        // 检查行匹配
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize - 2; col++) {
                const candy1 = this.board[row][col];
                const candy2 = this.board[row][col + 1];
                const candy3 = this.board[row][col + 2];

                if (candy1.textContent === candy2.textContent && 
                    candy2.textContent === candy3.textContent) {
                    matches.add(candy1);
                    matches.add(candy2);
                    matches.add(candy3);
                    hasMatches = true;
                }
            }
        }

        // 检查列匹配
        for (let col = 0; col < this.boardSize; col++) {
            for (let row = 0; row < this.boardSize - 2; row++) {
                const candy1 = this.board[row][col];
                const candy2 = this.board[row + 1][col];
                const candy3 = this.board[row + 2][col];

                if (candy1.textContent === candy2.textContent && 
                    candy2.textContent === candy3.textContent) {
                    matches.add(candy1);
                    matches.add(candy2);
                    matches.add(candy3);
                    hasMatches = true;
                }
            }
        }

        // 添加消除动画
        if (hasMatches) {
            await this.animateClearMatches(matches);
            
            // 更新分数
            this.score += matches.size * 10;
            this.scoreElement.textContent = this.score;
            
            // 填充新的糖果
            await this.fillEmptySpaces();
            
            // 检查是否有新的匹配
            await this.checkAndClearMatches();
        }

        return hasMatches;
    }

    async animateClearMatches(matches) {
        const animations = [];
        
        matches.forEach(candy => {
            candy.style.animation = 'sparkle 0.5s';
            this.createParticles(candy);
            this.showScorePopup(candy);
            
            const animation = new Promise(resolve => {
                candy.addEventListener('animationend', () => {
                    candy.style.animation = '';
                    resolve();
                }, { once: true });
            });
            
            animations.push(animation);
        });

        await Promise.all(animations);
        
        matches.forEach(candy => {
            candy.textContent = '';
            candy.classList.add('empty');
        });
    }

    showScorePopup(candy) {
        const rect = candy.getBoundingClientRect();
        const popup = document.createElement('div');
        popup.className = 'score-popup';
        popup.textContent = '+10';
        popup.style.left = `${rect.left + rect.width / 2}px`;
        popup.style.top = `${rect.top}px`;
        document.body.appendChild(popup);

        popup.addEventListener('animationend', () => popup.remove());
    }

    createParticles(candy) {
        const rect = candy.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.textContent = candy.textContent;
            particle.style.left = centerX + 'px';
            particle.style.top = centerY + 'px';
            
            const angle = (i * Math.PI * 2) / 8;
            const velocity = Math.random() * 2 + 1;
            const vx = Math.cos(angle) * velocity;
            const vy = Math.sin(angle) * velocity;
            
            document.body.appendChild(particle);
            
            particle.animate([
                { transform: 'translate(0, 0) scale(1)', opacity: 1 },
                { transform: `translate(${vx * 50}px, ${vy * 50}px) scale(0)`, opacity: 0 }
            ], {
                duration: 500,
                easing: 'ease-out'
            }).onfinish = () => particle.remove();
        }
    }

    async fillEmptySpaces() {
        let filled = false;
        const animations = [];
        
        // 从底部向上遍历
        for (let col = 0; col < this.boardSize; col++) {
            let emptySpaces = 0;
            
            // 先统计空格数量并移动现有糖果
            for (let row = this.boardSize - 1; row >= 0; row--) {
                const candy = this.board[row][col];
                
                if (candy.classList.contains('empty')) {
                    emptySpaces++;
                } else if (emptySpaces > 0) {
                    // 将非空糖果向下移动
                    const newRow = row + emptySpaces;
                    const targetCandy = this.board[newRow][col];
                    
                    const animation = candy.animate([
                        { transform: 'translateY(0)' },
                        { transform: `translateY(${emptySpaces * 55}px)` }
                    ], {
                        duration: 200,
                        easing: 'ease-in'
                    });
                    
                    animations.push(animation.finished);
                    
                    targetCandy.textContent = candy.textContent;
                    targetCandy.classList.remove('empty');
                    candy.textContent = '';
                    candy.classList.add('empty');
                    filled = true;
                }
            }
            
            // 在顶部添加新的糖果
            for (let i = 0; i < emptySpaces; i++) {
                const candy = this.board[i][col];
                candy.textContent = this.getRandomCandy();
                candy.classList.remove('empty');
                
                const animation = candy.animate([
                    { transform: 'translateY(-50px)', opacity: 0 },
                    { transform: 'translateY(0)', opacity: 1 }
                ], {
                    duration: 200,
                    easing: 'ease-out',
                    delay: i * 50 // 添加少许延迟使动画更自然
                });
                
                animations.push(animation.finished);
                filled = true;
            }
        }

        if (animations.length > 0) {
            await Promise.all(animations);
        }
        
        return filled;
    }

    resetGame() {
        this.score = 0;
        this.moves = 30;
        this.isAnimating = false;
        this.scoreElement.textContent = this.score;
        this.movesElement.textContent = this.moves;
        this.selectedCandy = null;
        this.initializeBoard();
    }

    showGameOver() {
        const overlay = document.createElement('div');
        overlay.className = 'game-over';
        overlay.innerHTML = `
            <div class="game-over-content">
                <h2>游戏结束!</h2>
                <p>最终得分: ${this.score}</p>
                <button onclick="game.resetGame(); this.parentElement.parentElement.remove();">
                    再玩一次
                </button>
            </div>
        `;
        document.body.appendChild(overlay);
    }
}

// 初始化游戏
const game = new CandyCrush(); 