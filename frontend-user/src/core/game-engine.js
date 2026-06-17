/**
 * @module core/game-engine
 * @description GameEngine - 俄罗斯方块游戏引擎模块
 * 
 * 本模块是游戏的核心引擎，负责管理整个游戏流程，包括：
 * - 游戏状态管理（空闲、进行中、暂停、结束）
 * - 游戏主循环和时间控制
 * - 方块移动、旋转和下落控制
 * - 计分系统
 * - 速度级别管理
 * 
 * ## 游戏状态
 * - IDLE: 空闲状态，游戏未开始
 * - PLAYING: 游戏进行中
 * - PAUSED: 游戏暂停
 * - GAMEOVER: 游戏结束
 * 
 * ## 实现的需求
 * - Requirements 2.1-2.4: 方块移动控制（左、右、软降、硬降）
 * - Requirements 3.1-3.2: 方块旋转（顺时针、逆时针）
 * - Requirements 4.3-4.7: 计分系统
 * - Requirements 5.1-5.4: 游戏状态管理
 * - Requirements 10.4: 速度设置
 * 
 * @example
 * import { GameEngine, GAME_STATES } from './game-engine.js';
 * 
 * const engine = new GameEngine({
 *     onScoreChange: (score, points) => console.log(`得分: ${score}`),
 *     onGameOver: (score, lines) => console.log('游戏结束')
 * });
 * 
 * engine.start();
 * engine.moveLeft();
 * engine.rotateClockwise();
 */

import { BoardManager, BOARD_WIDTH } from './board-manager.js';
import { TetrominoFactory } from './tetromino-factory.js';
import { WallKickSystem } from './wall-kick.js';

/**
 * 游戏状态常量
 * 
 * 定义游戏的四种可能状态。
 * 
 * @constant {Object.<string, string>}
 * @property {string} IDLE - 空闲状态，游戏未开始或已重置
 * @property {string} PLAYING - 游戏进行中
 * @property {string} PAUSED - 游戏暂停
 * @property {string} GAMEOVER - 游戏结束
 */
const GAME_STATES = {
    IDLE: 'idle',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAMEOVER: 'gameover'
};

/**
 * 计分规则
 * 
 * 定义消除不同行数对应的得分。
 * 消除越多行，单行平均得分越高，鼓励一次消除多行。
 * 
 * ## 得分设计原理
 * 
 * 俄罗斯方块的计分系统鼓励玩家一次消除多行：
 * - 单行消除：100分（基础分）
 * - 双行消除：300分（1.5倍单行 × 2）
 * - 三行消除：500分（约1.67倍单行 × 3）
 * - 四行消除：800分（2倍单行 × 4，称为"Tetris"）
 * 
 * ## 为什么这样设计？
 * 
 * 1. **风险与回报**: 等待消除更多行需要承担更高的风险（棋盘可能堆满）
 * 2. **技巧奖励**: 能够一次消除4行需要更高的技巧和规划
 * 3. **游戏深度**: 玩家需要在安全（少行消除）和高分（多行消除）之间权衡
 * 
 * ## 单行平均得分
 * 
 * | 消除行数 | 总分 | 单行平均 |
 * |---------|------|---------|
 * | 1行     | 100  | 100     |
 * | 2行     | 300  | 150     |
 * | 3行     | 500  | 167     |
 * | 4行     | 800  | 200     |
 * 
 * @constant {Object.<number, number>}
 * @property {number} 1 - 单行消除：100分
 * @property {number} 2 - 双行消除：300分
 * @property {number} 3 - 三行消除：500分
 * @property {number} 4 - 四行消除（Tetris）：800分
 * 
 * @description 实现 Requirements 4.3-4.6 - 计分规则
 */
const SCORING_RULES = {
    1: 100,   // 单行：基础分100
    2: 300,   // 双行：300分（比2×100多50%）
    3: 500,   // 三行：500分（比3×100多67%）
    4: 800    // 四行 (Tetris)：800分（比4×100多100%）
};

/**
 * 默认下落间隔（毫秒）
 * 
 * 当未设置速度级别时使用的默认下落间隔。
 * 
 * @constant {number}
 */
const DEFAULT_DROP_INTERVAL = 1000;

/**
 * 速度级别对应的下落间隔（毫秒）
 * 
 * ## 计算公式
 * 
 * ```
 * interval = 1100 - speed × 100
 * ```
 * 
 * ## 速度级别说明
 * 
 * | 级别 | 间隔(ms) | 说明 |
 * |-----|---------|------|
 * | 1   | 1000    | 最慢，适合新手 |
 * | 2   | 900     | |
 * | 3   | 800     | |
 * | 4   | 700     | |
 * | 5   | 600     | 默认速度 |
 * | 6   | 500     | |
 * | 7   | 400     | |
 * | 8   | 300     | |
 * | 9   | 200     | |
 * | 10  | 100     | 最快，挑战模式 |
 * 
 * ## 设计原理
 * 
 * 1. **线性关系**: 速度与间隔呈线性反比，每提升一级速度，间隔减少100ms
 * 2. **范围合理**: 
 *    - 最慢1000ms（1秒）给新手足够反应时间
 *    - 最快100ms（0.1秒）提供足够挑战
 * 3. **默认值**: 级别5（600ms）作为默认，平衡难度和可玩性
 * 
 * ## 为什么使用查找表而非计算？
 * 
 * 虽然可以用公式 `1100 - speed * 100` 计算，但使用查找表：
 * - 更直观，便于阅读和维护
 * - 避免每次访问都进行计算
 * - 便于未来调整为非线性关系
 * 
 * @constant {Object.<number, number>}
 * 
 * Requirements: 2.3 - Drop_Interval SHALL be inversely proportional to speed level,
 *               with level 1 at 1000ms and level 10 at 100ms
 */
const SPEED_INTERVALS = {
    1: 1000,   // 1100 - 1×100 = 1000ms (最慢，新手友好)
    2: 900,    // 1100 - 2×100 = 900ms
    3: 800,    // 1100 - 3×100 = 800ms
    4: 700,    // 1100 - 4×100 = 700ms
    5: 600,    // 1100 - 5×100 = 600ms (默认速度)
    6: 500,    // 1100 - 6×100 = 500ms
    7: 400,    // 1100 - 7×100 = 400ms
    8: 300,    // 1100 - 8×100 = 300ms
    9: 200,    // 1100 - 9×100 = 200ms
    10: 100    // 1100 - 10×100 = 100ms (最快，挑战模式)
};

/**
 * GameEngine 类
 * 
 * 游戏主引擎，管理游戏流程和状态。
 * 
 * ## 主要功能
 * - 游戏生命周期管理（开始、暂停、恢复、重启）
 * - 方块控制（移动、旋转、下落）
 * - 计分和等级系统
 * - 速度控制
 * - 事件回调通知
 * 
 * ## 使用方式
 * 1. 创建GameEngine实例，传入回调函数
 * 2. 调用start()开始游戏
 * 3. 在游戏循环中调用update(deltaTime)
 * 4. 响应用户输入调用相应的控制方法
 * 
 * @class
 * @example
 * const engine = new GameEngine({
 *     onStateChange: (state) => updateUI(state),
 *     onScoreChange: (score, points) => showScore(score),
 *     onLinesCleared: (cleared, total) => showLines(total),
 *     onGameOver: (score, lines) => showGameOver()
 * });
 * 
 * engine.start();
 * 
 * // 游戏循环
 * function gameLoop(timestamp) {
 *     const deltaTime = timestamp - lastTime;
 *     engine.update(deltaTime);
 *     render(engine.getState());
 *     requestAnimationFrame(gameLoop);
 * }
 */
class GameEngine {
    /**
     * 创建游戏引擎实例
     * 
     * 初始化游戏引擎的所有组件和状态。
     * 
     * @constructor
     * @param {Object} [options={}] - 配置选项
     * @param {Function} [options.onStateChange] - 游戏状态变化回调，参数：(gameState: string)
     * @param {Function} [options.onScoreChange] - 分数变化回调，参数：(totalScore: number, pointsAdded: number)
     * @param {Function} [options.onLinesCleared] - 消行回调，参数：(linesJustCleared: number, totalLinesCleared: number)
     * @param {Function} [options.onGameOver] - 游戏结束回调，参数：(finalScore: number, totalLines: number)
     * @param {Function} [options.onPieceSpawned] - 新方块生成回调，参数：(currentTetromino: Tetromino, nextTetromino: Tetromino)
     * 
     * @example
     * const engine = new GameEngine({
     *     onStateChange: (state) => {
     *         if (state === 'gameover') showGameOverScreen();
     *     },
     *     onScoreChange: (score, points) => {
     *         scoreDisplay.textContent = score;
     *     }
     * });
     */
    constructor(options = {}) {
        // 核心组件
        this.board = new BoardManager();
        this.factory = new TetrominoFactory();
        this.wallKick = new WallKickSystem(this.board);
        
        // 游戏状态
        this.gameState = GAME_STATES.IDLE;
        this.score = 0;
        this.level = 1;
        this.linesCleared = 0;
        this.speed = 5;  // 默认速度级别
        
        // 当前和下一个方块
        this.currentTetromino = null;
        this.nextTetromino = null;
        
        // 暂存区
        this.heldTetromino = null;
        this.canHold = true;
        
        // 时间控制
        this.dropInterval = SPEED_INTERVALS[this.speed];
        this.lastDropTime = 0;
        this.accumulatedTime = 0;
        
        // 回调函数
        this.onStateChange = options.onStateChange || (() => {});
        this.onScoreChange = options.onScoreChange || (() => {});
        this.onLinesCleared = options.onLinesCleared || (() => {});
        this.onGameOver = options.onGameOver || (() => {});
        this.onPieceSpawned = options.onPieceSpawned || (() => {});
    }
    
    /**
     * 获取方块的生成位置（棋盘顶部中央）
     * 
     * 计算新方块应该生成的初始位置，使其水平居中于棋盘顶部。
     * 
     * @private
     * @returns {{x: number, y: number}} 生成位置坐标
     */
    _getSpawnPosition() {
        return {
            x: Math.floor((BOARD_WIDTH - 4) / 2),  // 居中
            y: 0  // 顶部
        };
    }
    
    /**
     * 生成新方块
     * 
     * 将预览方块设为当前方块，并生成新的预览方块。
     * 如果新方块无法放置（位置被占用），触发游戏结束。
     * 
     * @private
     * @returns {boolean} 如果成功生成返回true，游戏结束返回false
     * 
     * @description 实现 Requirements 1.2, 5.1 - 方块生成和游戏结束检测
     */
    _spawnTetromino() {
        const spawnPos = this._getSpawnPosition();
        
        // 如果有预览方块，使用它；否则创建新的
        if (this.nextTetromino) {
            this.currentTetromino = this.nextTetromino;
            this.currentTetromino.x = spawnPos.x;
            this.currentTetromino.y = spawnPos.y;
        } else {
            this.currentTetromino = this.factory.createRandom(spawnPos.x, spawnPos.y);
        }
        
        // 生成下一个预览方块
        this.nextTetromino = this.factory.createRandom();
        
        // 重置暂存权限
        this.canHold = true;
        
        // 检查游戏是否结束 (Requirement 5.1)
        if (this.board.isGameOver(this.currentTetromino)) {
            this._triggerGameOver();
            return false;
        }
        
        this.onPieceSpawned(this.currentTetromino, this.nextTetromino);
        return true;
    }
    
    /**
     * 触发游戏结束
     * 
     * 设置游戏状态为GAMEOVER并触发相关回调。
     * 
     * @private
     * @description 实现 Requirements 5.2, 5.3, 5.4 - 游戏结束处理
     */
    _triggerGameOver() {
        this.gameState = GAME_STATES.GAMEOVER;
        this.onStateChange(this.gameState);
        this.onGameOver(this.score, this.linesCleared);
    }
    
    /**
     * 锁定当前方块并处理消行
     * 
     * 将当前方块固定到棋盘上，检查并消除完整行，
     * 更新分数，然后生成新方块。
     * 
     * @private
     */
    _lockTetromino() {
        if (!this.currentTetromino) return;
        
        // 放置方块到棋盘
        this.board.placeTetromino(this.currentTetromino);
        
        // 检查并清除完整行
        const cleared = this.board.clearLines();
        if (cleared > 0) {
            this._addScore(cleared);
            this.linesCleared += cleared;
            this.onLinesCleared(cleared, this.linesCleared);
        }
        
        // 生成新方块
        this._spawnTetromino();
    }
    
    /**
     * 添加分数
     * 
     * 根据消除的行数计算并添加分数。
     * 
     * @private
     * @param {number} linesCleared - 消除的行数（1-4）
     * 
     * @description 实现 Requirements 4.3-4.6 - 计分规则
     */
    _addScore(linesCleared) {
        const points = SCORING_RULES[linesCleared] || 0;
        this.score += points;
        this.onScoreChange(this.score, points);
    }
    
    /**
     * 开始游戏
     * 
     * 初始化或重置游戏状态并开始游戏。
     * 如果游戏已在进行中，此方法不执行任何操作。
     * 
     * @returns {void}
     * 
     * @description 实现 Requirement 5.2 - 游戏开始
     * 
     * @example
     * engine.start(); // 开始新游戏
     */
    start() {
        if (this.gameState === GAME_STATES.PLAYING) return;
        
        // 如果是新游戏或游戏结束后重新开始
        if (this.gameState === GAME_STATES.IDLE || this.gameState === GAME_STATES.GAMEOVER) {
            this.board.reset();
            this.factory.reset();
            this.score = 0;
            this.linesCleared = 0;
            this.level = 1;
            this.currentTetromino = null;
            this.nextTetromino = null;
            this.heldTetromino = null;
            this.canHold = true;
            this.accumulatedTime = 0;
        }
        
        this.gameState = GAME_STATES.PLAYING;
        this.lastDropTime = Date.now();
        this.onStateChange(this.gameState);
        
        // 生成第一个方块
        if (!this.currentTetromino) {
            this._spawnTetromino();
        }
    }
    
    /**
     * 暂停游戏
     * 
     * 将游戏状态设为PAUSED。只有在游戏进行中时才有效。
     * 
     * @returns {void}
     * 
     * @example
     * if (engine.isPlaying()) {
     *     engine.pause();
     * }
     */
    pause() {
        if (this.gameState !== GAME_STATES.PLAYING) return;
        
        this.gameState = GAME_STATES.PAUSED;
        this.onStateChange(this.gameState);
    }
    
    /**
     * 恢复游戏
     * 
     * 从暂停状态恢复游戏。只有在游戏暂停时才有效。
     * 
     * @returns {void}
     * 
     * @example
     * if (engine.isPaused()) {
     *     engine.resume();
     * }
     */
    resume() {
        if (this.gameState !== GAME_STATES.PAUSED) return;
        
        this.gameState = GAME_STATES.PLAYING;
        this.lastDropTime = Date.now();
        this.onStateChange(this.gameState);
    }
    
    /**
     * 重新开始游戏
     * 
     * 重置所有游戏状态并开始新游戏。
     * 
     * @returns {void}
     * 
     * @description 实现 Requirement 5.4 - 游戏重启
     * 
     * @example
     * engine.restart(); // 重新开始
     */
    restart() {
        this.gameState = GAME_STATES.IDLE;
        this.start();
    }
    
    /**
     * 左移方块
     * 
     * 将当前方块向左移动一格。如果移动会导致碰撞，则不移动。
     * 
     * @returns {boolean} 如果成功移动返回true，否则返回false
     * 
     * @description 实现 Requirement 2.1 - 左移控制
     * 
     * @example
     * document.addEventListener('keydown', (e) => {
     *     if (e.key === 'ArrowLeft') engine.moveLeft();
     * });
     */
    moveLeft() {
        if (this.gameState !== GAME_STATES.PLAYING || !this.currentTetromino) {
            return false;
        }
        
        if (this.board.isValidPosition(this.currentTetromino, -1, 0)) {
            this.currentTetromino.x -= 1;
            return true;
        }
        return false;
    }
    
    /**
     * 右移方块
     * 
     * 将当前方块向右移动一格。如果移动会导致碰撞，则不移动。
     * 
     * @returns {boolean} 如果成功移动返回true，否则返回false
     * 
     * @description 实现 Requirement 2.2 - 右移控制
     * 
     * @example
     * document.addEventListener('keydown', (e) => {
     *     if (e.key === 'ArrowRight') engine.moveRight();
     * });
     */
    moveRight() {
        if (this.gameState !== GAME_STATES.PLAYING || !this.currentTetromino) {
            return false;
        }
        
        if (this.board.isValidPosition(this.currentTetromino, 1, 0)) {
            this.currentTetromino.x += 1;
            return true;
        }
        return false;
    }
    
    /**
     * 软降（下移一格）
     * 
     * 将当前方块向下移动一格。如果无法下移（到达底部或碰到其他方块），
     * 则锁定方块并生成新方块。
     * 
     * @returns {boolean} 如果成功下移返回true，如果锁定方块返回false
     * 
     * @description 实现 Requirement 2.3 - 软降控制
     * 
     * @example
     * document.addEventListener('keydown', (e) => {
     *     if (e.key === 'ArrowDown') engine.moveDown();
     * });
     */
    moveDown() {
        if (this.gameState !== GAME_STATES.PLAYING || !this.currentTetromino) {
            return false;
        }
        
        if (this.board.isValidPosition(this.currentTetromino, 0, 1)) {
            this.currentTetromino.y += 1;
            return true;
        } else {
            // 无法下移，锁定方块
            this._lockTetromino();
            return false;
        }
    }
    
    /**
     * 硬降（直接落到底部）
     * 
     * 将当前方块直接下落到最低有效位置并锁定。
     * 
     * @returns {number} 下落的格数
     * 
     * @description 实现 Requirement 2.4 - 硬降控制
     * 
     * @example
     * document.addEventListener('keydown', (e) => {
     *     if (e.key === ' ') { // 空格键
     *         const distance = engine.hardDrop();
     *         console.log(`下落了 ${distance} 格`);
     *     }
     * });
     */
    hardDrop() {
        if (this.gameState !== GAME_STATES.PLAYING || !this.currentTetromino) {
            return 0;
        }
        
        const startY = this.currentTetromino.y;
        const dropY = this.board.getHardDropY(this.currentTetromino);
        const distance = dropY - startY;
        
        this.currentTetromino.y = dropY;
        this._lockTetromino();
        
        return distance;
    }
    
    /**
     * 顺时针旋转
     * 
     * 将当前方块顺时针旋转90度。使用Wall Kick系统处理碰撞。
     * 
     * @returns {boolean} 如果成功旋转返回true，否则返回false
     * 
     * @description 实现 Requirement 3.1 - 顺时针旋转
     * 
     * @example
     * document.addEventListener('keydown', (e) => {
     *     if (e.key === 'ArrowUp') engine.rotateClockwise();
     * });
     */
    rotateClockwise() {
        if (this.gameState !== GAME_STATES.PLAYING || !this.currentTetromino) {
            return false;
        }
        
        return this.wallKick.rotateClockwise(this.currentTetromino);
    }
    
    /**
     * 逆时针旋转
     * 
     * 将当前方块逆时针旋转90度。使用Wall Kick系统处理碰撞。
     * 
     * @returns {boolean} 如果成功旋转返回true，否则返回false
     * 
     * @description 实现 Requirement 3.2 - 逆时针旋转
     * 
     * @example
     * document.addEventListener('keydown', (e) => {
     *     if (e.key === 'z' || e.key === 'Z') engine.rotateCounterClockwise();
     * });
     */
    rotateCounterClockwise() {
        if (this.gameState !== GAME_STATES.PLAYING || !this.currentTetromino) {
            return false;
        }
        
        return this.wallKick.rotateCounterClockwise(this.currentTetromino);
    }
    
    /**
     * 暂存当前方块
     * 
     * 将当前方块存入暂存区，或与暂存区中的方块交换。
     * 每一轮下落只能使用一次暂存功能。
     * 
     * @returns {boolean} 如果成功暂存或交换返回true，否则返回false
     * 
     * @description
     * 暂存规则：
     * - 如果暂存区为空，将当前方块存入暂存区，生成新方块
     * - 如果暂存区不为空，将当前方块与暂存区方块交换
     * - 每一轮下落只能使用一次暂存（方块锁定后重置）
     * - 交换后方块重置到初始位置和旋转状态
     * 
     * @example
     * document.addEventListener('keydown', (e) => {
     *     if (e.key === 'c' || e.key === 'C') engine.holdTetromino();
     * });
     */
    holdTetromino() {
        if (this.gameState !== GAME_STATES.PLAYING || !this.currentTetromino) {
            return false;
        }
        
        // 每轮只能暂存一次
        if (!this.canHold) {
            return false;
        }
        
        const spawnPos = this._getSpawnPosition();
        
        if (this.heldTetromino) {
            // 暂存区有方块，进行交换
            const temp = this.heldTetromino;
            this.heldTetromino = this.currentTetromino;
            this.currentTetromino = temp;
            
            // 重置当前方块的位置和旋转状态
            this.currentTetromino.x = spawnPos.x;
            this.currentTetromino.y = spawnPos.y;
            this.currentTetromino.setRotationIndex(0);
        } else {
            // 暂存区为空，存入当前方块并生成新方块
            this.heldTetromino = this.currentTetromino;
            
            // 使用下一个方块作为当前方块
            if (this.nextTetromino) {
                this.currentTetromino = this.nextTetromino;
                this.currentTetromino.x = spawnPos.x;
                this.currentTetromino.y = spawnPos.y;
            } else {
                this.currentTetromino = this.factory.createRandom(spawnPos.x, spawnPos.y);
            }
            
            // 生成新的下一个方块
            this.nextTetromino = this.factory.createRandom();
        }
        
        // 标记本轮已使用暂存
        this.canHold = false;
        
        // 检查游戏是否结束
        if (this.board.isGameOver(this.currentTetromino)) {
            this._triggerGameOver();
            return false;
        }
        
        this.onPieceSpawned(this.currentTetromino, this.nextTetromino);
        return true;
    }
    
    /**
     * 游戏主循环更新
     * 
     * 在每一帧调用，处理自动下落逻辑。
     * 累积时间达到下落间隔时，方块自动下移一格。
     * 
     * @param {number} deltaTime - 距离上次更新的时间（毫秒）
     * @returns {void}
     * 
     * @example
     * let lastTime = 0;
     * function gameLoop(timestamp) {
     *     const deltaTime = timestamp - lastTime;
     *     lastTime = timestamp;
     *     engine.update(deltaTime);
     *     render();
     *     requestAnimationFrame(gameLoop);
     * }
     * requestAnimationFrame(gameLoop);
     */
    update(deltaTime) {
        if (this.gameState !== GAME_STATES.PLAYING) return;
        
        this.accumulatedTime += deltaTime;
        
        // 自动下落
        if (this.accumulatedTime >= this.dropInterval) {
            this.accumulatedTime -= this.dropInterval;
            this.moveDown();
        }
    }
    
    /**
     * 重置累积时间
     * 
     * 将累积时间重置为0。在速度变化时调用，确保新速度立即生效。
     * 
     * @returns {void}
     * 
     * @description 实现 Requirement 2.2 - 速度变化即时生效
     */
    resetAccumulatedTime() {
        this.accumulatedTime = 0;
    }
    
    /**
     * 设置游戏速度
     * 
     * 设置游戏速度级别，速度变化立即生效。
     * 速度值会被钳制到有效范围[1, 10]内。
     * 
     * @param {number} speed - 速度级别（1-10），1最慢，10最快
     * @returns {void}
     * 
     * @description 实现 Requirements 2.2, 10.4 - 速度设置和即时生效
     * 
     * @example
     * engine.setSpeed(7); // 设置为较快速度
     * 
     * // 速度滑块控制
     * speedSlider.addEventListener('input', (e) => {
     *     engine.setSpeed(parseInt(e.target.value));
     * });
     */
    setSpeed(speed) {
        this.speed = Math.max(1, Math.min(10, speed));
        this.dropInterval = SPEED_INTERVALS[this.speed];
        // 重置累积时间，确保速度变化立即生效 (Requirement 2.2)
        this.resetAccumulatedTime();
    }
    
    /**
     * 获取当前游戏状态
     * 
     * 返回包含所有游戏状态信息的对象，用于渲染和状态保存。
     * 
     * @returns {Object} 游戏状态对象
     * @returns {string} returns.gameState - 当前游戏状态
     * @returns {number} returns.score - 当前分数
     * @returns {number} returns.level - 当前等级
     * @returns {number} returns.linesCleared - 已消除的总行数
     * @returns {number} returns.speed - 当前速度级别
     * @returns {Tetromino|null} returns.currentTetromino - 当前方块
     * @returns {Tetromino|null} returns.nextTetromino - 下一个方块
     * @returns {number[][]} returns.board - 棋盘网格的拷贝
     * 
     * @example
     * const state = engine.getState();
     * render(state.board, state.currentTetromino);
     * updateScoreDisplay(state.score);
     */
    getState() {
        return {
            gameState: this.gameState,
            score: this.score,
            level: this.level,
            linesCleared: this.linesCleared,
            speed: this.speed,
            currentTetromino: this.currentTetromino,
            nextTetromino: this.nextTetromino,
            holdTetromino: this.heldTetromino,
            canHold: this.canHold,
            board: this.board.getGridCopy()
        };
    }
    
    /**
     * 获取Ghost Piece位置（硬降预览）
     * 
     * 返回当前方块硬降后的Y坐标，用于渲染Ghost Piece。
     * 
     * @returns {number|null} Ghost Piece的Y坐标，如果没有当前方块返回null
     * 
     * @example
     * const ghostY = engine.getGhostY();
     * if (ghostY !== null) {
     *     renderGhostPiece(currentTetromino, ghostY);
     * }
     */
    getGhostY() {
        if (!this.currentTetromino) return null;
        return this.board.getHardDropY(this.currentTetromino);
    }
    
    /**
     * 检查游戏是否正在进行
     * 
     * @returns {boolean} 如果游戏处于进行中状态返回true
     * 
     * @example
     * if (engine.isPlaying()) {
     *     processInput();
     * }
     */
    isPlaying() {
        return this.gameState === GAME_STATES.PLAYING;
    }
    
    /**
     * 检查游戏是否暂停
     * 
     * @returns {boolean} 如果游戏处于暂停状态返回true
     * 
     * @example
     * if (engine.isPaused()) {
     *     showPauseOverlay();
     * }
     */
    isPaused() {
        return this.gameState === GAME_STATES.PAUSED;
    }
    
    /**
     * 检查游戏是否结束
     * 
     * @returns {boolean} 如果游戏处于结束状态返回true
     * 
     * @example
     * if (engine.isGameOver()) {
     *     showGameOverScreen();
     * }
     */
    isGameOver() {
        return this.gameState === GAME_STATES.GAMEOVER;
    }
}

// 导出模块
export {
    GameEngine,
    GAME_STATES,
    SCORING_RULES,
    SPEED_INTERVALS,
    DEFAULT_DROP_INTERVAL
};
