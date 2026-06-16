/**
 * @fileoverview State Evaluator Module - 俄罗斯方块AI状态评估器
 * 
 * 本模块实现了俄罗斯方块棋盘状态的评估功能，是AI决策系统的核心组件。
 * 状态评估器通过分析棋盘的多个特征来计算一个综合分数，用于比较不同放置位置的优劣。
 * 
 * ## 评估指标
 * 
 * 状态评估器使用四个关键指标来评估棋盘状态：
 * 
 * 1. **聚合高度 (Aggregate Height)**
 *    - 所有列高度的总和
 *    - 高度越低越好（权重为负）
 *    - 反映棋盘的整体填充程度
 * 
 * 2. **完整行数 (Complete Lines)**
 *    - 完全填满的行数
 *    - 完整行越多越好（权重为正）
 *    - 直接关联得分
 * 
 * 3. **空洞数 (Holes)**
 *    - 上方有方块覆盖的空单元格数量
 *    - 空洞越少越好（权重为负）
 *    - 空洞会阻碍行消除
 * 
 * 4. **凹凸度 (Bumpiness)**
 *    - 相邻列高度差的绝对值之和
 *    - 凹凸度越小越好（权重为负）
 *    - 平整的表面更容易放置方块
 * 
 * ## 权重调优
 * 
 * 默认权重是经过优化的参数，但可以根据需要调整：
 * - 增加 completeLines 权重会使AI更积极地消行
 * - 增加 holes 权重的绝对值会使AI更避免产生空洞
 * - 增加 bumpiness 权重的绝对值会使AI更倾向于平整表面
 * 
 * @module ai/state-evaluator
 * 
 * @see {@link AIController} AI控制器
 * @see {@link RLAgent} 强化学习代理
 * 
 * Requirements: 6.2, 6.3
 */

/**
 * 棋盘宽度常量
 * @constant {number}
 */
const BOARD_WIDTH = 10;

/**
 * 棋盘高度常量
 * @constant {number}
 */
const BOARD_HEIGHT = 20;

/**
 * 评估权重类型定义
 * 
 * 定义状态评估器使用的四个权重参数。
 * 
 * @typedef {Object} EvaluationWeights
 * @property {number} aggregateHeight - 聚合高度权重（通常为负值）
 * @property {number} completeLines - 完整行数权重（通常为正值）
 * @property {number} holes - 空洞数权重（通常为负值）
 * @property {number} bumpiness - 凹凸度权重（通常为负值）
 * 
 * @example
 * const weights = {
 *   aggregateHeight: -0.510066,
 *   completeLines: 0.760666,
 *   holes: -0.35663,
 *   bumpiness: -0.184483
 * };
 */

/**
 * 评估指标类型定义
 * 
 * @typedef {Object} EvaluationMetrics
 * @property {number} aggregateHeight - 聚合高度
 * @property {number} completeLines - 完整行数
 * @property {number} holes - 空洞数
 * @property {number} bumpiness - 凹凸度
 */

/**
 * 默认评估权重
 * 
 * 这些权重是经过优化的参数，适用于大多数游戏场景。
 * 
 * - **aggregateHeight**: -0.510066（负值，高度越高越不好）
 * - **completeLines**: 0.760666（正值，完整行越多越好）
 * - **holes**: -0.35663（负值，空洞越多越不好）
 * - **bumpiness**: -0.184483（负值，凹凸度越大越不好）
 * 
 * @constant {EvaluationWeights}
 * 
 * @example
 * import { DEFAULT_WEIGHTS } from './state-evaluator.js';
 * console.log(DEFAULT_WEIGHTS.completeLines); // 0.760666
 */
const DEFAULT_WEIGHTS = {
    aggregateHeight: -0.510066,
    completeLines: 0.760666,
    holes: -0.35663,
    bumpiness: -0.184483
};

/**
 * StateEvaluator类 - 棋盘状态评估器
 * 
 * 评估俄罗斯方块棋盘状态的质量，用于AI决策。
 * 通过分析聚合高度、完整行数、空洞数和凹凸度四个指标，
 * 计算加权分数来评估棋盘状态的优劣。
 * 
 * @class
 * 
 * @example
 * // 基本使用
 * import { StateEvaluator } from './state-evaluator.js';
 * 
 * const evaluator = new StateEvaluator();
 * 
 * // 创建一个简单的棋盘状态
 * const board = Array(20).fill(null).map(() => Array(10).fill(0));
 * board[19] = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]; // 底部一行填满
 * 
 * const score = evaluator.evaluate(board);
 * console.log(`评估分数: ${score}`);
 * 
 * @example
 * // 使用自定义权重
 * const customWeights = {
 *   aggregateHeight: -0.6,
 *   completeLines: 0.9,
 *   holes: -0.5,
 *   bumpiness: -0.2
 * };
 * const evaluator = new StateEvaluator(customWeights);
 * 
 * @example
 * // 获取详细指标
 * const metrics = evaluator.getAllMetrics(board);
 * console.log(`聚合高度: ${metrics.aggregateHeight}`);
 * console.log(`完整行数: ${metrics.completeLines}`);
 * console.log(`空洞数: ${metrics.holes}`);
 * console.log(`凹凸度: ${metrics.bumpiness}`);
 */
class StateEvaluator {
    /**
     * 创建一个新的StateEvaluator实例
     * 
     * @constructor
     * @param {EvaluationWeights} [weights=null] - 评估权重。如果不提供，将使用DEFAULT_WEIGHTS
     * 
     * @example
     * // 使用默认权重
     * const evaluator = new StateEvaluator();
     * 
     * @example
     * // 使用自定义权重
     * const evaluator = new StateEvaluator({
     *   aggregateHeight: -0.7,
     *   completeLines: 0.8,
     *   holes: -0.4,
     *   bumpiness: -0.2
     * });
     */
    constructor(weights = null) {
        /**
         * 评估权重
         * @type {EvaluationWeights}
         * @private
         */
        this.weights = weights ? { ...weights } : { ...DEFAULT_WEIGHTS };
    }
    
    /**
     * 评估棋盘状态
     * 
     * 综合考虑聚合高度、完整行数、空洞数和凹凸度四个指标，
     * 使用加权求和计算最终评估分数。分数越高表示状态越好。
     * 
     * ## 计算公式
     * 
     * ```
     * score = w1 * aggregateHeight + w2 * completeLines + w3 * holes + w4 * bumpiness
     * ```
     * 
     * 其中 w1, w2, w3, w4 是对应的权重值。
     * 
     * @param {number[][]} board - 棋盘网格（二维数组，0表示空，非0表示已填充）
     * @returns {number} 评估分数（越高越好）。如果计算结果为NaN，返回0
     * 
     * @example
     * const evaluator = new StateEvaluator();
     * 
     * // 空棋盘
     * const emptyBoard = Array(20).fill(null).map(() => Array(10).fill(0));
     * console.log(evaluator.evaluate(emptyBoard)); // 0（没有高度、行、空洞或凹凸）
     * 
     * // 有一行填满的棋盘
     * const boardWithLine = Array(20).fill(null).map(() => Array(10).fill(0));
     * boardWithLine[19] = Array(10).fill(1);
     * console.log(evaluator.evaluate(boardWithLine)); // 正分数（有完整行）
     * 
     * Requirements: 6.2, 6.3
     */
    evaluate(board) {
        const aggregateHeight = this.calculateAggregateHeight(board);
        const completeLines = this.calculateCompleteLines(board);
        const holes = this.calculateHoles(board);
        const bumpiness = this.calculateBumpiness(board);
        
        // 加权求和
        const score = 
            this.weights.aggregateHeight * aggregateHeight +
            this.weights.completeLines * completeLines +
            this.weights.holes * holes +
            this.weights.bumpiness * bumpiness;
        
        // 处理NaN情况
        if (isNaN(score)) {
            return 0;
        }
        
        return score;
    }
    
    /**
     * 计算聚合高度（所有列高度之和）
     * 
     * 聚合高度反映了棋盘的整体填充程度。
     * 较低的聚合高度通常意味着更好的游戏状态。
     * 
     * @param {number[][]} board - 棋盘网格
     * @returns {number} 聚合高度（所有列高度的总和）
     * 
     * @example
     * const evaluator = new StateEvaluator();
     * 
     * // 假设棋盘底部有一些方块
     * const board = Array(20).fill(null).map(() => Array(10).fill(0));
     * board[19][0] = 1; // 第0列高度为1
     * board[18][0] = 1; // 第0列高度为2
     * board[19][1] = 1; // 第1列高度为1
     * 
     * const height = evaluator.calculateAggregateHeight(board);
     * console.log(height); // 3 (2 + 1)
     * 
     * Requirements: 6.3
     */
    calculateAggregateHeight(board) {
        const heights = this._getColumnHeights(board);
        return heights.reduce((sum, height) => sum + height, 0);
    }
    
    /**
     * 计算完整行数（完全填满的行数）
     * 
     * 完整行是指所有单元格都被填充的行。
     * 在实际游戏中，完整行会被消除并得分。
     * 
     * @param {number[][]} board - 棋盘网格
     * @returns {number} 完整行数
     * 
     * @example
     * const evaluator = new StateEvaluator();
     * 
     * const board = Array(20).fill(null).map(() => Array(10).fill(0));
     * board[19] = Array(10).fill(1); // 底部一行填满
     * board[18] = Array(10).fill(1); // 倒数第二行也填满
     * 
     * const lines = evaluator.calculateCompleteLines(board);
     * console.log(lines); // 2
     * 
     * Requirements: 6.3
     */
    calculateCompleteLines(board) {
        let completeLines = 0;
        const height = board.length;
        const width = board[0]?.length || BOARD_WIDTH;
        
        for (let y = 0; y < height; y++) {
            let isComplete = true;
            for (let x = 0; x < width; x++) {
                if (board[y][x] === 0) {
                    isComplete = false;
                    break;
                }
            }
            if (isComplete) {
                completeLines++;
            }
        }
        
        return completeLines;
    }
    
    /**
     * 计算空洞数（上方有填充单元格的空单元格数量）
     * 
     * 空洞是指被方块覆盖的空单元格。空洞会阻碍行消除，
     * 因为必须先填充空洞才能消除包含空洞的行。
     * 
     * ## 算法说明
     * 
     * 对于每一列，从上到下扫描：
     * 1. 找到第一个填充的单元格
     * 2. 之后遇到的每个空单元格都计为一个空洞
     * 
     * @param {number[][]} board - 棋盘网格
     * @returns {number} 空洞数
     * 
     * @example
     * const evaluator = new StateEvaluator();
     * 
     * const board = Array(20).fill(null).map(() => Array(10).fill(0));
     * board[17][0] = 1; // 第0列有一个方块
     * board[19][0] = 1; // 第0列底部有一个方块
     * // board[18][0] 是空的，但上方有方块，所以是一个空洞
     * 
     * const holes = evaluator.calculateHoles(board);
     * console.log(holes); // 1
     * 
     * Requirements: 6.3
     */
    calculateHoles(board) {
        let holes = 0;
        const height = board.length;
        const width = board[0]?.length || BOARD_WIDTH;
        
        for (let x = 0; x < width; x++) {
            let foundBlock = false;
            for (let y = 0; y < height; y++) {
                if (board[y][x] !== 0) {
                    foundBlock = true;
                } else if (foundBlock) {
                    // 空单元格且上方有方块
                    holes++;
                }
            }
        }
        
        return holes;
    }
    
    /**
     * 计算凹凸度（相邻列高度差的绝对值之和）
     * 
     * 凹凸度反映了棋盘表面的平整程度。
     * 较低的凹凸度意味着更平整的表面，更容易放置方块。
     * 
     * ## 计算公式
     * 
     * ```
     * bumpiness = |h[0] - h[1]| + |h[1] - h[2]| + ... + |h[n-2] - h[n-1]|
     * ```
     * 
     * 其中 h[i] 是第 i 列的高度。
     * 
     * @param {number[][]} board - 棋盘网格
     * @returns {number} 凹凸度
     * 
     * @example
     * const evaluator = new StateEvaluator();
     * 
     * // 假设列高度为 [3, 1, 2, 2, 4, ...]
     * // 凹凸度 = |3-1| + |1-2| + |2-2| + |2-4| + ... = 2 + 1 + 0 + 2 + ...
     * 
     * const bumpiness = evaluator.calculateBumpiness(board);
     * 
     * Requirements: 6.3
     */
    calculateBumpiness(board) {
        const heights = this._getColumnHeights(board);
        let bumpiness = 0;
        
        for (let i = 0; i < heights.length - 1; i++) {
            bumpiness += Math.abs(heights[i] - heights[i + 1]);
        }
        
        return bumpiness;
    }
    
    /**
     * 获取所有列的高度
     * 
     * 列高度定义为从底部算起，该列最高的填充单元格的行数。
     * 空列的高度为0。
     * 
     * @param {number[][]} board - 棋盘网格
     * @returns {number[]} 每列的高度数组（长度等于棋盘宽度）
     * @private
     * 
     * @example
     * // 内部使用示例
     * const heights = this._getColumnHeights(board);
     * // heights = [3, 1, 2, 0, 5, ...] 表示各列的高度
     */
    _getColumnHeights(board) {
        const height = board.length;
        const width = board[0]?.length || BOARD_WIDTH;
        const heights = new Array(width).fill(0);
        
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                if (board[y][x] !== 0) {
                    // 高度 = 从底部算起的行数
                    heights[x] = height - y;
                    break;
                }
            }
        }
        
        return heights;
    }
    
    /**
     * 设置评估权重
     * 
     * 允许在运行时更改评估权重，用于调优或强化学习。
     * 
     * @param {EvaluationWeights} weights - 新的评估权重
     * @returns {void}
     * 
     * @example
     * const evaluator = new StateEvaluator();
     * 
     * // 调整权重以更重视消行
     * evaluator.setWeights({
     *   aggregateHeight: -0.4,
     *   completeLines: 1.0,
     *   holes: -0.3,
     *   bumpiness: -0.15
     * });
     */
    setWeights(weights) {
        this.weights = { ...weights };
    }
    
    /**
     * 获取当前评估权重
     * 
     * 返回权重的副本，修改返回值不会影响评估器内部的权重。
     * 
     * @returns {EvaluationWeights} 当前权重的副本
     * 
     * @example
     * const evaluator = new StateEvaluator();
     * const weights = evaluator.getWeights();
     * console.log(weights.completeLines); // 0.760666
     */
    getWeights() {
        return { ...this.weights };
    }
    
    /**
     * 获取所有评估指标
     * 
     * 返回棋盘状态的所有评估指标，用于调试或详细分析。
     * 
     * @param {number[][]} board - 棋盘网格
     * @returns {EvaluationMetrics} 包含所有指标的对象
     * 
     * @example
     * const evaluator = new StateEvaluator();
     * const metrics = evaluator.getAllMetrics(board);
     * 
     * console.log('棋盘状态分析:');
     * console.log(`  聚合高度: ${metrics.aggregateHeight}`);
     * console.log(`  完整行数: ${metrics.completeLines}`);
     * console.log(`  空洞数: ${metrics.holes}`);
     * console.log(`  凹凸度: ${metrics.bumpiness}`);
     */
    getAllMetrics(board) {
        return {
            aggregateHeight: this.calculateAggregateHeight(board),
            completeLines: this.calculateCompleteLines(board),
            holes: this.calculateHoles(board),
            bumpiness: this.calculateBumpiness(board)
        };
    }
}

// 导出模块
export { StateEvaluator, DEFAULT_WEIGHTS, BOARD_WIDTH, BOARD_HEIGHT };
