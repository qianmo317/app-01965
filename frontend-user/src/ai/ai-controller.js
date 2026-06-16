/**
 * @fileoverview AI Controller Module - 俄罗斯方块AI控制器
 * 
 * 本模块实现了俄罗斯方块游戏的AI自动玩功能。AI控制器负责：
 * - 评估所有可能的方块放置位置
 * - 选择最佳放置位置（基于状态评估或强化学习）
 * - 生成从当前位置到目标位置的移动序列
 * - 按时间间隔执行移动，与游戏速度同步
 * 
 * ## 核心算法
 * 
 * AI决策过程分为三个阶段：
 * 1. **位置枚举**：遍历所有可能的X坐标和旋转状态组合
 * 2. **状态评估**：模拟放置并使用StateEvaluator评估结果棋盘
 * 3. **移动生成**：计算从当前位置到目标位置的最短移动序列
 * 
 * ## 与游戏引擎的集成
 * 
 * AIController可以关联GameEngine实例，以同步AI移动间隔与游戏速度设置。
 * 这确保了AI模式下的游戏体验与手动模式一致。
 * 
 * @module ai/ai-controller
 * @requires ./state-evaluator
 * @requires ../core/tetromino
 * @requires ../core/board-manager
 * 
 * @see {@link StateEvaluator} 状态评估器
 * @see {@link RLAgent} 强化学习代理
 * 
 * Requirements: 6.1, 6.4, 6.5, 6.6, 2.6
 */

import { StateEvaluator } from './state-evaluator.js';
import { Tetromino, TETROMINO_TYPES } from '../core/tetromino.js';
import { BoardManager, BOARD_WIDTH, BOARD_HEIGHT } from '../core/board-manager.js';

/**
 * AI移动指令类型定义
 * 
 * 表示AI生成的单个移动指令，用于控制方块的移动和旋转。
 * 
 * @typedef {Object} Move
 * @property {'left'|'right'|'down'|'rotate'|'drop'} type - 移动类型
 *   - 'left': 向左移动一格
 *   - 'right': 向右移动一格
 *   - 'down': 向下移动一格（软降）
 *   - 'rotate': 顺时针旋转90度
 *   - 'drop': 硬降（直接落到底部）
 * 
 * @example
 * // 向左移动
 * const moveLeft = { type: 'left' };
 * 
 * // 硬降
 * const hardDrop = { type: 'drop' };
 */

/**
 * 方块放置位置类型定义
 * 
 * 表示一个可能的方块放置位置及其评估分数。
 * AI通过比较所有可能放置位置的分数来选择最佳位置。
 * 
 * @typedef {Object} Placement
 * @property {number} x - 目标X坐标（棋盘列索引，0-9）
 * @property {number} rotation - 目标旋转状态索引（0-3，取决于方块类型）
 * @property {number} score - 评估分数（由StateEvaluator计算，越高越好）
 * @property {number} [y] - 目标Y坐标（可选，用于验证）
 * 
 * @example
 * // 一个放置位置示例
 * const placement = {
 *   x: 3,
 *   rotation: 1,
 *   score: 0.85,
 *   y: 18
 * };
 */

/**
 * AI状态信息类型定义
 * 
 * @typedef {Object} AIStatus
 * @property {boolean} enabled - AI是否启用
 * @property {number} pendingMoves - 待执行的移动数量
 * @property {number} decisionInterval - 决策间隔（毫秒）
 * @property {number} lastDecisionTime - 上次决策时间戳
 * @property {boolean} hasGameEngine - 是否关联了GameEngine
 */

/**
 * AIController类 - AI自动玩模式控制器
 * 
 * 负责自动决策方块放置位置和旋转角度，评估所有可能的放置位置，
 * 选择最佳位置并生成移动序列。
 * 
 * AI移动间隔与游戏速度设置同步，确保AI模式下的游戏体验与手动模式一致。
 * 
 * ## 使用方式
 * 
 * AIController可以独立使用，也可以与RLAgent配合使用：
 * - **独立使用**：使用StateEvaluator的固定权重进行决策
 * - **配合RLAgent**：使用强化学习的动态权重，支持探索和学习
 * 
 * @class
 * @example
 * // 基本使用
 * import { AIController } from './ai-controller.js';
 * import { BoardManager } from '../core/board-manager.js';
 * import { Tetromino } from '../core/tetromino.js';
 * 
 * const ai = new AIController();
 * ai.enable();
 * 
 * // 找到最佳放置位置
 * const board = new BoardManager();
 * const tetromino = new Tetromino('T');
 * const bestPlacement = ai.findBestPlacement(board, tetromino);
 * 
 * // 生成移动序列
 * const moves = ai.generateMoveSequence(tetromino, bestPlacement);
 * console.log(moves); // [{ type: 'rotate' }, { type: 'left' }, { type: 'drop' }]
 * 
 * @example
 * // 与GameEngine集成
 * const ai = new AIController();
 * ai.setGameEngine(gameEngine);
 * ai.enable();
 * 
 * // AI决策间隔将自动与游戏速度同步
 * console.log(ai.getDecisionInterval()); // 返回gameEngine.dropInterval
 * 
 * @example
 * // 与RLAgent配合使用
 * import { RLAgent } from './rl-agent.js';
 * 
 * const rlAgent = new RLAgent();
 * const ai = new AIController(null, rlAgent);
 * ai.enable();
 * 
 * // AI将使用RLAgent的epsilon-greedy策略选择动作
 * const placement = ai.findBestPlacement(board, tetromino);
 * 
 * Requirements: 2.6 - WHEN AI mode is active, THE Game_Speed_Controller SHALL apply 
 *               the same speed settings to AI-controlled gameplay
 */
class AIController {
    /**
     * 创建一个新的AIController实例
     * 
     * @constructor
     * @param {StateEvaluator} [evaluator=null] - 状态评估器实例。如果不提供，将创建默认的StateEvaluator
     * @param {RLAgent} [rlAgent=null] - 强化学习代理实例。如果提供，AI将使用epsilon-greedy策略选择动作
     * 
     * @example
     * // 使用默认评估器
     * const ai = new AIController();
     * 
     * @example
     * // 使用自定义评估器
     * const customEvaluator = new StateEvaluator({
     *   aggregateHeight: -0.6,
     *   completeLines: 0.8,
     *   holes: -0.4,
     *   bumpiness: -0.2
     * });
     * const ai = new AIController(customEvaluator);
     * 
     * @example
     * // 使用强化学习代理
     * const rlAgent = new RLAgent();
     * const ai = new AIController(null, rlAgent);
     */
    constructor(evaluator = null, rlAgent = null) {
        /**
         * AI是否启用
         * @type {boolean}
         * @private
         */
        this.enabled = false;
        
        /**
         * 状态评估器，用于评估棋盘状态
         * @type {StateEvaluator}
         * @private
         */
        this.evaluator = evaluator || new StateEvaluator();
        
        /**
         * 强化学习代理，用于epsilon-greedy策略选择
         * @type {RLAgent|null}
         * @private
         */
        this.rlAgent = rlAgent;
        
        /**
         * 待执行的移动队列
         * @type {Move[]}
         * @private
         */
        this.moveQueue = [];
        
        /**
         * AI决策间隔（毫秒）
         * 默认值100ms，会被游戏速度覆盖
         * @type {number}
         * @private
         */
        this.decisionInterval = 100;
        
        /**
         * 上次决策的时间戳
         * @type {number}
         * @private
         */
        this.lastDecisionTime = 0;
        
        /**
         * 关联的GameEngine实例，用于同步速度设置
         * @type {Object|null}
         * @private
         */
        this.gameEngine = null;
    }
    
    /**
     * 启用AI模式
     * 
     * 启用后，AI将自动控制方块的移动和放置。
     * 调用此方法会清空现有的移动队列并重置决策时间。
     * 
     * @returns {void}
     * 
     * @example
     * const ai = new AIController();
     * ai.enable();
     * console.log(ai.isEnabled()); // true
     * 
     * Requirements: 6.5
     */
    enable() {
        this.enabled = true;
        this.moveQueue = [];
        this.lastDecisionTime = 0;
    }
    
    /**
     * 禁用AI模式
     * 
     * 禁用后，AI将停止自动控制，立即返回控制权给玩家。
     * 调用此方法会清空现有的移动队列。
     * 
     * @returns {void}
     * 
     * @example
     * const ai = new AIController();
     * ai.enable();
     * // ... AI运行中 ...
     * ai.disable(); // 立即停止AI控制
     * console.log(ai.isEnabled()); // false
     * 
     * Requirements: 6.6
     */
    disable() {
        this.enabled = false;
        this.moveQueue = [];
    }
    
    /**
     * 检查AI是否启用
     * 
     * @returns {boolean} AI是否处于启用状态
     * 
     * @example
     * const ai = new AIController();
     * console.log(ai.isEnabled()); // false
     * ai.enable();
     * console.log(ai.isEnabled()); // true
     */
    isEnabled() {
        return this.enabled;
    }

    /**
     * 评估所有可能的放置位置
     * 
     * 枚举所有可能的X坐标和旋转状态组合，对每个有效的放置位置
     * 进行模拟放置和状态评估。
     * 
     * ## 算法说明
     * 
     * 1. 遍历所有旋转状态（0到rotationCount-1）
     * 2. 对于每个旋转状态，计算有效的X坐标范围
     * 3. 对于每个(x, rotation)组合，模拟放置并评估结果
     * 
     * @param {BoardManager} board - 棋盘管理器实例
     * @param {Tetromino} tetromino - 当前要放置的方块
     * @returns {Placement[]} 所有有效放置位置及其评估分数的数组
     * 
     * @example
     * const ai = new AIController();
     * const board = new BoardManager();
     * const tetromino = new Tetromino('T');
     * 
     * const placements = ai.evaluateAllPlacements(board, tetromino);
     * console.log(`找到 ${placements.length} 个可能的放置位置`);
     * 
     * // 按分数排序
     * placements.sort((a, b) => b.score - a.score);
     * console.log('最佳位置:', placements[0]);
     * 
     * Requirements: 6.4
     */
    evaluateAllPlacements(board, tetromino) {
        const placements = [];
        const rotationCount = tetromino.getRotationCount();
        
        // 遍历所有旋转状态
        for (let rotation = 0; rotation < rotationCount; rotation++) {
            const shape = tetromino.getShapeAtRotation(rotation);
            const shapeWidth = shape[0].length;
            
            // 遍历所有可能的X坐标
            // X坐标范围：从最左边（可能为负）到最右边
            // Use Math.max to avoid -0 edge case
            const minX = 0 - this._getLeftPadding(shape);
            const maxX = BOARD_WIDTH - shapeWidth + this._getRightPadding(shape);
            
            for (let x = minX; x <= maxX; x++) {
                // Normalize x to avoid -0
                const normalizedX = x === 0 ? 0 : x;
                // 检查该位置是否有效（从顶部开始）
                const placement = this._evaluatePlacement(board, tetromino, normalizedX, rotation);
                if (placement !== null) {
                    placements.push(placement);
                }
            }
        }
        
        return placements;
    }
    
    /**
     * 获取形状左侧的空白列数
     * 
     * 用于计算方块可以放置的最左边X坐标。
     * 某些方块形状（如I方块）在矩阵中有空白列，需要考虑这些空白。
     * 
     * @param {number[][]} shape - 方块形状矩阵（0表示空，非0表示填充）
     * @returns {number} 左侧空白列数
     * @private
     * 
     * @example
     * // T方块在旋转状态0的形状
     * const shape = [
     *   [0, 1, 0],
     *   [1, 1, 1]
     * ];
     * const padding = ai._getLeftPadding(shape); // 返回 0
     */
    _getLeftPadding(shape) {
        let padding = 0;
        const width = shape[0].length;
        
        for (let col = 0; col < width; col++) {
            let hasBlock = false;
            for (let row = 0; row < shape.length; row++) {
                if (shape[row][col] !== 0) {
                    hasBlock = true;
                    break;
                }
            }
            if (hasBlock) break;
            padding++;
        }
        
        return padding;
    }
    
    /**
     * 获取形状右侧的空白列数
     * 
     * 用于计算方块可以放置的最右边X坐标。
     * 某些方块形状在矩阵中有空白列，需要考虑这些空白。
     * 
     * @param {number[][]} shape - 方块形状矩阵（0表示空，非0表示填充）
     * @returns {number} 右侧空白列数
     * @private
     * 
     * @example
     * // L方块在某个旋转状态的形状
     * const shape = [
     *   [1, 0],
     *   [1, 0],
     *   [1, 1]
     * ];
     * const padding = ai._getRightPadding(shape); // 返回 0
     */
    _getRightPadding(shape) {
        let padding = 0;
        const width = shape[0].length;
        
        for (let col = width - 1; col >= 0; col--) {
            let hasBlock = false;
            for (let row = 0; row < shape.length; row++) {
                if (shape[row][col] !== 0) {
                    hasBlock = true;
                    break;
                }
            }
            if (hasBlock) break;
            padding++;
        }
        
        return padding;
    }
    
    /**
     * 评估单个放置位置
     * 
     * 对指定的(x, rotation)组合进行评估：
     * 1. 检查初始位置是否有效
     * 2. 模拟方块下落到最终位置
     * 3. 模拟放置并评估结果棋盘状态
     * 
     * @param {BoardManager} board - 棋盘管理器实例
     * @param {Tetromino} tetromino - 当前方块
     * @param {number} targetX - 目标X坐标
     * @param {number} rotation - 目标旋转状态索引
     * @returns {Placement|null} 放置信息对象，如果位置无效则返回null
     * @private
     */
    _evaluatePlacement(board, tetromino, targetX, rotation) {
        const shape = tetromino.getShapeAtRotation(rotation);
        
        // 从顶部开始，找到最低的有效Y坐标
        let targetY = 0;
        
        // 检查初始位置是否有效
        if (!board.isValidShapePosition(shape, targetX, targetY)) {
            return null;
        }
        
        // 模拟下落，找到最终位置
        while (board.isValidShapePosition(shape, targetX, targetY + 1)) {
            targetY++;
        }
        
        // 模拟放置并评估棋盘状态
        const score = this._simulateAndEvaluate(board, shape, targetX, targetY, tetromino.type);
        
        return {
            x: targetX,
            rotation: rotation,
            score: score,
            y: targetY  // 额外信息，用于验证
        };
    }

    /**
     * 模拟放置方块并评估结果棋盘状态
     * 
     * 创建棋盘副本，在副本上放置方块，模拟行消除，
     * 然后使用StateEvaluator评估结果状态。
     * 
     * @param {BoardManager} board - 棋盘管理器实例
     * @param {number[][]} shape - 方块形状矩阵
     * @param {number} x - 放置的X坐标
     * @param {number} y - 放置的Y坐标
     * @param {string} type - 方块类型（'I', 'O', 'T', 'S', 'Z', 'J', 'L'）
     * @returns {number} 评估分数（由StateEvaluator计算）
     * @private
     */
    _simulateAndEvaluate(board, shape, x, y, type) {
        // 创建棋盘副本
        const gridCopy = board.getGridCopy();
        const typeIndex = TETROMINO_TYPES.indexOf(type) + 1;
        
        // 放置方块
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col] !== 0) {
                    const boardX = x + col;
                    const boardY = y + row;
                    if (boardY >= 0 && boardY < BOARD_HEIGHT && 
                        boardX >= 0 && boardX < BOARD_WIDTH) {
                        gridCopy[boardY][boardX] = typeIndex;
                    }
                }
            }
        }
        
        // 模拟行消除
        this._simulateClearLines(gridCopy);
        
        // 评估结果状态
        return this.evaluator.evaluate(gridCopy);
    }
    
    /**
     * 模拟行消除（在棋盘副本上）
     * 
     * 检查并移除所有完整的行，将上方的行下移。
     * 此方法直接修改传入的网格数组。
     * 
     * @param {number[][]} grid - 棋盘网格副本（会被直接修改）
     * @returns {void}
     * @private
     */
    _simulateClearLines(grid) {
        let y = grid.length - 1;
        while (y >= 0) {
            let isFull = true;
            for (let x = 0; x < grid[y].length; x++) {
                if (grid[y][x] === 0) {
                    isFull = false;
                    break;
                }
            }
            if (isFull) {
                // 移除该行
                grid.splice(y, 1);
                // 在顶部添加空行
                grid.unshift(new Array(grid[0]?.length || BOARD_WIDTH).fill(0));
            } else {
                y--;
            }
        }
    }
    
    /**
     * 找到最佳放置位置
     * 
     * 评估所有可能的放置位置，选择分数最高的位置。
     * 如果配置了RLAgent，将使用epsilon-greedy策略选择（可能包含探索）。
     * 
     * @param {BoardManager} board - 棋盘管理器实例
     * @param {Tetromino} tetromino - 当前要放置的方块
     * @returns {Placement|null} 最佳放置位置，如果没有有效位置则返回null
     * 
     * @example
     * const ai = new AIController();
     * const board = new BoardManager();
     * const tetromino = new Tetromino('T');
     * 
     * const best = ai.findBestPlacement(board, tetromino);
     * if (best) {
     *   console.log(`最佳位置: x=${best.x}, rotation=${best.rotation}, score=${best.score}`);
     * }
     * 
     * Requirements: 6.1
     */
    findBestPlacement(board, tetromino) {
        const placements = this.evaluateAllPlacements(board, tetromino);
        
        if (placements.length === 0) {
            return null;
        }
        
        // 如果有RL代理，使用它来选择（可能包含探索）
        if (this.rlAgent && typeof this.rlAgent.selectAction === 'function') {
            return this.rlAgent.selectAction(placements);
        }
        
        // 否则选择分数最高的放置位置
        let bestPlacement = placements[0];
        for (let i = 1; i < placements.length; i++) {
            if (placements[i].score > bestPlacement.score) {
                bestPlacement = placements[i];
            }
        }
        
        return bestPlacement;
    }
    
    /**
     * 为接口兼容性提供的别名方法
     * 
     * 如果移动队列为空，会先生成新的移动序列，然后返回第一个移动。
     * 此方法主要用于与旧版接口兼容。
     * 
     * @param {BoardManager} board - 棋盘管理器实例
     * @param {Tetromino} tetromino - 当前方块
     * @returns {Move|null} 队列中的第一个移动，如果没有则返回null
     * 
     * @example
     * const ai = new AIController();
     * const move = ai.findBestMove(board, tetromino);
     * if (move) {
     *   console.log(`下一步: ${move.type}`);
     * }
     */
    findBestMove(board, tetromino) {
        // 如果移动队列为空，生成新的移动序列
        if (this.moveQueue.length === 0) {
            const placement = this.findBestPlacement(board, tetromino);
            if (placement) {
                this.moveQueue = this.generateMoveSequence(tetromino, placement);
            }
        }
        
        // 返回队列中的第一个移动
        return this.moveQueue.length > 0 ? this.moveQueue[0] : null;
    }

    /**
     * 生成从当前位置到目标位置的移动序列
     * 
     * 计算从方块当前位置和旋转状态到目标位置的最短移动序列。
     * 移动顺序：先旋转，再水平移动，最后硬降。
     * 
     * ## 移动序列生成规则
     * 
     * 1. **旋转**：计算需要的旋转次数，选择最短路径
     * 2. **水平移动**：根据X坐标差生成left/right移动
     * 3. **硬降**：最后添加drop指令
     * 
     * @param {Tetromino} tetromino - 当前方块（用于获取当前位置和旋转状态）
     * @param {Placement} placement - 目标放置位置
     * @returns {Move[]} 移动序列数组
     * 
     * @example
     * const ai = new AIController();
     * const tetromino = new Tetromino('T');
     * tetromino.x = 4; // 当前X位置
     * 
     * const placement = { x: 2, rotation: 1, score: 0.8 };
     * const moves = ai.generateMoveSequence(tetromino, placement);
     * 
     * // 可能的输出: [{ type: 'rotate' }, { type: 'left' }, { type: 'left' }, { type: 'drop' }]
     * console.log(moves);
     */
    generateMoveSequence(tetromino, placement) {
        const moves = [];
        const currentX = tetromino.x;
        const currentRotation = tetromino.rotationIndex;
        const targetX = placement.x;
        const targetRotation = placement.rotation;
        
        // 首先处理旋转
        const rotationCount = tetromino.getRotationCount();
        let rotationsNeeded = (targetRotation - currentRotation + rotationCount) % rotationCount;
        
        // 选择最短的旋转路径
        if (rotationsNeeded > rotationCount / 2) {
            // 逆时针更短（但我们只支持顺时针旋转作为主要操作）
            // 对于大多数方块，顺时针旋转即可
            rotationsNeeded = rotationCount - rotationsNeeded;
            // 注意：这里简化处理，总是使用顺时针旋转
            // 实际上可以添加逆时针旋转支持
        }
        
        for (let i = 0; i < rotationsNeeded; i++) {
            moves.push({ type: 'rotate' });
        }
        
        // 然后处理水平移动
        const horizontalDiff = targetX - currentX;
        
        if (horizontalDiff < 0) {
            // 向左移动
            for (let i = 0; i < Math.abs(horizontalDiff); i++) {
                moves.push({ type: 'left' });
            }
        } else if (horizontalDiff > 0) {
            // 向右移动
            for (let i = 0; i < horizontalDiff; i++) {
                moves.push({ type: 'right' });
            }
        }
        
        // 最后硬降
        moves.push({ type: 'drop' });
        
        return moves;
    }
    
    /**
     * 执行下一个移动
     * 
     * 从移动队列中取出并返回下一个移动指令。
     * 移动被取出后会从队列中移除。
     * 
     * @returns {Move|null} 下一个移动指令，如果队列为空则返回null
     * 
     * @example
     * const ai = new AIController();
     * ai.planMoves(board, tetromino);
     * 
     * while (ai.hasPendingMoves()) {
     *   const move = ai.executeNextMove();
     *   console.log(`执行移动: ${move.type}`);
     *   // 实际执行移动...
     * }
     * 
     * Requirements: 6.5
     */
    executeNextMove() {
        if (this.moveQueue.length === 0) {
            return null;
        }
        return this.moveQueue.shift();
    }
    
    /**
     * 检查是否有待执行的移动
     * 
     * @returns {boolean} 如果移动队列不为空则返回true
     * 
     * @example
     * if (ai.hasPendingMoves()) {
     *   const move = ai.executeNextMove();
     *   // 执行移动...
     * } else {
     *   // 需要生成新的移动计划
     *   ai.planMoves(board, tetromino);
     * }
     */
    hasPendingMoves() {
        return this.moveQueue.length > 0;
    }
    
    /**
     * 清空移动队列
     * 
     * 通常在方块锁定或新方块生成时调用，以确保AI重新规划移动。
     * 
     * @returns {void}
     */
    clearMoveQueue() {
        this.moveQueue = [];
    }
    
    /**
     * 获取当前移动队列长度
     * 
     * @returns {number} 队列中待执行的移动数量
     */
    getMoveQueueLength() {
        return this.moveQueue.length;
    }
    
    /**
     * 设置AI决策间隔
     * 
     * 决策间隔决定了AI执行移动的速度。较小的间隔意味着更快的AI。
     * 最小值为10毫秒。
     * 
     * @param {number} interval - 间隔时间（毫秒），最小值为10
     * @returns {void}
     * 
     * @example
     * ai.setDecisionInterval(200); // 每200ms执行一次移动
     */
    setDecisionInterval(interval) {
        this.decisionInterval = Math.max(10, interval);
    }
    
    /**
     * 获取AI决策间隔
     * 
     * 如果关联了GameEngine，返回游戏的下落间隔以保持一致性。
     * 这确保了AI模式下的游戏体验与手动模式一致。
     * 
     * @returns {number} 间隔时间（毫秒）
     * 
     * @example
     * const ai = new AIController();
     * ai.setGameEngine(gameEngine);
     * 
     * // 返回gameEngine.dropInterval（如果已关联）
     * const interval = ai.getDecisionInterval();
     * 
     * Requirements: 2.6 - AI模式下使用与手动游戏相同的速度设置
     */
    getDecisionInterval() {
        // 如果有关联的GameEngine，使用其下落间隔
        if (this.gameEngine && typeof this.gameEngine.dropInterval === 'number') {
            return this.gameEngine.dropInterval;
        }
        return this.decisionInterval;
    }
    
    /**
     * 设置关联的GameEngine
     * 
     * 关联GameEngine后，AI决策间隔将自动与游戏速度同步。
     * 这确保了AI模式下的游戏体验与手动模式一致。
     * 
     * @param {Object} gameEngine - GameEngine实例
     * @returns {void}
     * 
     * @example
     * const ai = new AIController();
     * const gameEngine = new GameEngine();
     * 
     * ai.setGameEngine(gameEngine);
     * ai.enable();
     * 
     * // AI决策间隔现在与游戏速度同步
     * 
     * Requirements: 2.6 - AI模式下使用与手动游戏相同的速度设置
     */
    setGameEngine(gameEngine) {
        this.gameEngine = gameEngine;
    }
    
    /**
     * 获取关联的GameEngine
     * 
     * @returns {Object|null} GameEngine实例，如果未关联则返回null
     */
    getGameEngine() {
        return this.gameEngine;
    }
    
    /**
     * 同步AI决策间隔与游戏速度
     * 
     * 当游戏速度改变时调用此方法，确保AI移动速度与游戏速度一致。
     * 
     * @param {number} dropInterval - 游戏的下落间隔（毫秒）
     * @returns {void}
     * 
     * @example
     * // 当游戏速度改变时
     * gameEngine.setSpeed(8);
     * ai.syncWithGameSpeed(gameEngine.dropInterval);
     * 
     * Requirements: 2.6 - AI模式下使用与手动游戏相同的速度设置
     */
    syncWithGameSpeed(dropInterval) {
        this.decisionInterval = Math.max(10, dropInterval);
    }
    
    /**
     * 检查是否可以进行下一次决策（基于时间间隔）
     * 
     * 使用getDecisionInterval()获取当前有效的间隔，确保与游戏速度同步。
     * 
     * @param {number} currentTime - 当前时间戳（通常来自performance.now()或Date.now()）
     * @returns {boolean} 如果距离上次决策已超过决策间隔则返回true
     * 
     * @example
     * const currentTime = performance.now();
     * if (ai.canMakeDecision(currentTime)) {
     *   const move = ai.executeNextMove();
     *   ai.updateDecisionTime(currentTime);
     * }
     * 
     * Requirements: 2.6 - AI模式下使用与手动游戏相同的速度设置
     */
    canMakeDecision(currentTime) {
        return currentTime - this.lastDecisionTime >= this.getDecisionInterval();
    }
    
    /**
     * 更新最后决策时间
     * 
     * 在执行移动后调用，用于控制下一次决策的时机。
     * 
     * @param {number} currentTime - 当前时间戳
     * @returns {void}
     */
    updateDecisionTime(currentTime) {
        this.lastDecisionTime = currentTime;
    }
    
    /**
     * 设置状态评估器
     * 
     * 允许在运行时更换评估器，例如使用不同的权重配置。
     * 
     * @param {StateEvaluator} evaluator - 新的状态评估器实例
     * @returns {void}
     * 
     * @example
     * const customEvaluator = new StateEvaluator({
     *   aggregateHeight: -0.7,
     *   completeLines: 0.9,
     *   holes: -0.5,
     *   bumpiness: -0.3
     * });
     * ai.setEvaluator(customEvaluator);
     */
    setEvaluator(evaluator) {
        this.evaluator = evaluator;
    }
    
    /**
     * 获取状态评估器
     * 
     * @returns {StateEvaluator} 当前使用的状态评估器实例
     */
    getEvaluator() {
        return this.evaluator;
    }
    
    /**
     * 设置强化学习代理
     * 
     * 设置后，AI将使用RLAgent的epsilon-greedy策略选择动作。
     * 
     * @param {RLAgent} rlAgent - 强化学习代理实例
     * @returns {void}
     * 
     * @example
     * const rlAgent = new RLAgent({ epsilon: 0.1 });
     * ai.setRLAgent(rlAgent);
     */
    setRLAgent(rlAgent) {
        this.rlAgent = rlAgent;
    }
    
    /**
     * 获取强化学习代理
     * 
     * @returns {RLAgent|null} 当前的强化学习代理实例，如果未设置则返回null
     */
    getRLAgent() {
        return this.rlAgent;
    }
    
    /**
     * 为当前方块计划移动（生成移动队列）
     * 
     * 找到最佳放置位置并生成相应的移动序列。
     * 
     * @param {BoardManager} board - 棋盘管理器实例
     * @param {Tetromino} tetromino - 当前方块
     * @returns {boolean} 如果成功生成移动计划则返回true，否则返回false
     * 
     * @example
     * const success = ai.planMoves(board, tetromino);
     * if (success) {
     *   console.log(`计划了 ${ai.getMoveQueueLength()} 个移动`);
     * } else {
     *   console.log('无法找到有效的放置位置');
     * }
     */
    planMoves(board, tetromino) {
        const placement = this.findBestPlacement(board, tetromino);
        if (placement === null) {
            return false;
        }
        
        this.moveQueue = this.generateMoveSequence(tetromino, placement);
        return true;
    }
    
    /**
     * AI更新方法 - 在游戏循环中调用
     * 
     * 根据时间间隔自动执行移动。此方法应在游戏主循环中定期调用。
     * 
     * ## 执行流程
     * 
     * 1. 检查AI是否启用
     * 2. 检查是否到了决策时间
     * 3. 如果没有待执行的移动，生成新的移动计划
     * 4. 执行下一个移动
     * 
     * @param {BoardManager} board - 棋盘管理器实例
     * @param {Tetromino} tetromino - 当前方块
     * @param {number} currentTime - 当前时间戳
     * @param {Function} executeMove - 执行移动的回调函数，接收Move对象作为参数
     * @returns {boolean} 如果执行了移动则返回true，否则返回false
     * 
     * @example
     * // 在游戏循环中使用
     * function gameLoop(timestamp) {
     *   if (ai.isEnabled()) {
     *     ai.update(board, currentTetromino, timestamp, (move) => {
     *       switch (move.type) {
     *         case 'left': gameEngine.moveLeft(); break;
     *         case 'right': gameEngine.moveRight(); break;
     *         case 'rotate': gameEngine.rotate(); break;
     *         case 'drop': gameEngine.hardDrop(); break;
     *       }
     *     });
     *   }
     *   requestAnimationFrame(gameLoop);
     * }
     * 
     * Requirements: 6.5
     */
    update(board, tetromino, currentTime, executeMove) {
        // 如果AI未启用，不执行任何操作
        if (!this.enabled) {
            return false;
        }
        
        // 检查是否到了决策时间
        if (!this.canMakeDecision(currentTime)) {
            return false;
        }
        
        // 如果没有待执行的移动，生成新的移动计划
        if (!this.hasPendingMoves()) {
            const success = this.planMoves(board, tetromino);
            if (!success) {
                return false;
            }
        }
        
        // 执行下一个移动
        const move = this.executeNextMove();
        if (move && typeof executeMove === 'function') {
            executeMove(move);
            this.updateDecisionTime(currentTime);
            return true;
        }
        
        return false;
    }
    
    /**
     * 获取当前移动队列的副本
     * 
     * 返回移动队列的浅拷贝，不会影响原始队列。
     * 
     * @returns {Move[]} 移动队列的副本
     */
    getMoveQueue() {
        return [...this.moveQueue];
    }
    
    /**
     * 重置AI状态
     * 
     * 清空移动队列并重置决策时间。通常在游戏重新开始时调用。
     * 
     * @returns {void}
     * 
     * @example
     * // 游戏重新开始时
     * gameEngine.reset();
     * ai.reset();
     */
    reset() {
        this.moveQueue = [];
        this.lastDecisionTime = 0;
    }
    
    /**
     * 获取AI状态信息
     * 
     * 返回AI的当前状态，用于调试和UI显示。
     * 
     * @returns {AIStatus} AI状态对象
     * 
     * @example
     * const status = ai.getStatus();
     * console.log(`AI启用: ${status.enabled}`);
     * console.log(`待执行移动: ${status.pendingMoves}`);
     * console.log(`决策间隔: ${status.decisionInterval}ms`);
     */
    getStatus() {
        return {
            enabled: this.enabled,
            pendingMoves: this.moveQueue.length,
            decisionInterval: this.getDecisionInterval(),
            lastDecisionTime: this.lastDecisionTime,
            hasGameEngine: this.gameEngine !== null
        };
    }
}

// 导出模块
export { AIController };
