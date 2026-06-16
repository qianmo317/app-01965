/**
 * @fileoverview Reinforcement Learning Agent Module - 强化学习代理
 * 
 * 本模块实现了俄罗斯方块AI的强化学习功能，使用Epsilon-Greedy策略
 * 在探索（尝试新策略）和利用（使用已知最佳策略）之间取得平衡。
 * 
 * ## 核心概念
 * 
 * ### Epsilon-Greedy策略
 * 
 * - **探索 (Exploration)**: 以概率ε随机选择动作，发现新的可能性
 * - **利用 (Exploitation)**: 以概率(1-ε)选择当前已知最佳动作
 * - **ε衰减**: 随着学习进行，逐渐减少探索，增加利用
 * 
 * ### 学习过程
 * 
 * 1. 初始阶段：高探索率（ε≈1），大量尝试不同策略
 * 2. 中期阶段：探索率逐渐降低，开始利用学到的知识
 * 3. 后期阶段：低探索率（ε≈0.01），主要利用最佳策略
 * 
 * ## 数据持久化
 * 
 * RLAgent支持将学习数据保存到Local Storage，包括：
 * - 评估权重
 * - 探索率
 * - 游戏统计数据
 * - 历史分数
 * 
 * ## 使用场景
 * 
 * RLAgent通常与AIController配合使用：
 * - AIController负责评估放置位置和生成移动
 * - RLAgent负责选择动作（探索或利用）和学习优化
 * 
 * @module ai/rl-agent
 * @requires ./state-evaluator
 * 
 * @see {@link AIController} AI控制器
 * @see {@link StateEvaluator} 状态评估器
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

import { DEFAULT_WEIGHTS } from './state-evaluator.js';

/**
 * Local Storage存储键名
 * 
 * 用于保存和加载学习数据的键名。
 * 
 * @constant {string}
 */
const STORAGE_KEY = 'tetris-ai-learning-data';

/**
 * RLAgent配置选项类型定义
 * 
 * @typedef {Object} RLAgentConfig
 * @property {number} [epsilon=1.0] - 初始探索率（0-1，1表示100%探索）
 * @property {number} [epsilonMin=0.01] - 最小探索率（探索率不会低于此值）
 * @property {number} [epsilonDecay=0.995] - 探索率衰减系数（每局游戏后乘以此值）
 * @property {number} [learningRate=0.01] - 学习率（权重调整的步长）
 * @property {number} [scoreHistorySize=100] - 保存的历史分数数量
 * @property {Function} [random] - 随机数生成器（用于测试时注入）
 */

/**
 * 默认配置
 * 
 * @constant {RLAgentConfig}
 * 
 * @example
 * import { DEFAULT_CONFIG } from './rl-agent.js';
 * console.log(DEFAULT_CONFIG.epsilon); // 1.0
 * console.log(DEFAULT_CONFIG.epsilonDecay); // 0.995
 */
const DEFAULT_CONFIG = {
    epsilon: 1.0,           // 初始探索率（100%探索）
    epsilonMin: 0.01,       // 最小探索率
    epsilonDecay: 0.995,    // 探索率衰减系数
    learningRate: 0.01,     // 学习率
    scoreHistorySize: 100   // 保存的历史分数数量
};

/**
 * 游戏统计数据类型定义
 * 
 * 记录AI的游戏表现统计。
 * 
 * @typedef {Object} GameStatistics
 * @property {number} gamesPlayed - 已玩游戏次数
 * @property {number} totalScore - 总分数
 * @property {number} bestScore - 最高分
 * @property {number} totalLinesCleared - 总消行数
 * @property {number} averageScore - 平均分
 * 
 * @example
 * const stats = rlAgent.getStatistics();
 * console.log(`已玩 ${stats.gamesPlayed} 局`);
 * console.log(`最高分: ${stats.bestScore}`);
 * console.log(`平均分: ${stats.averageScore.toFixed(2)}`);
 */

/**
 * 游戏结果类型定义
 * 
 * 用于记录单局游戏的结果，供学习使用。
 * 
 * @typedef {Object} GameResult
 * @property {number} score - 游戏分数
 * @property {number} linesCleared - 消除行数
 * @property {Object} [finalBoardMetrics] - 最终棋盘指标（可选，用于权重调整）
 * 
 * @example
 * const result = {
 *   score: 1500,
 *   linesCleared: 12,
 *   finalBoardMetrics: {
 *     aggregateHeight: 45,
 *     holes: 3,
 *     bumpiness: 8
 *   }
 * };
 * rlAgent.updateWeights(result);
 */

/**
 * 放置位置类型定义
 * 
 * @typedef {Object} Placement
 * @property {number} x - 目标X坐标
 * @property {number} rotation - 目标旋转状态
 * @property {number} score - 评估分数
 */

/**
 * AI学习数据类型定义
 * 
 * 用于持久化存储的完整学习数据结构。
 * 
 * @typedef {Object} AILearningData
 * @property {Object} weights - 评估权重
 * @property {number} epsilon - 当前探索率
 * @property {GameStatistics} statistics - 游戏统计
 * @property {number[]} scoreHistory - 历史分数数组
 * @property {string} version - 数据版本号
 * @property {string} lastUpdated - 最后更新时间（ISO格式）
 * 
 * @example
 * const data = rlAgent.getLearningData();
 * console.log(`数据版本: ${data.version}`);
 * console.log(`最后更新: ${data.lastUpdated}`);
 */

/**
 * RLAgent状态摘要类型定义
 * 
 * @typedef {Object} RLAgentStatus
 * @property {number} epsilon - 当前探索率
 * @property {number} learningRate - 学习率
 * @property {number} gamesPlayed - 已玩游戏次数
 * @property {number} averageScore - 平均分
 * @property {number} bestScore - 最高分
 * @property {number} totalLinesCleared - 总消行数
 * @property {number} recentAverageScore - 最近10局平均分
 */

/**
 * RLAgent类 - 强化学习代理
 * 
 * 实现Epsilon-Greedy策略选择，通过强化学习不断优化游戏策略。
 * 支持学习数据持久化到Local Storage。
 * 
 * ## 核心功能
 * 
 * 1. **动作选择**: 使用epsilon-greedy策略在探索和利用之间平衡
 * 2. **学习更新**: 根据游戏结果调整评估权重
 * 3. **数据持久化**: 保存和加载学习数据到Local Storage
 * 4. **统计跟踪**: 记录游戏表现统计数据
 * 
 * @class
 * 
 * @example
 * // 基本使用
 * import { RLAgent } from './rl-agent.js';
 * 
 * const agent = new RLAgent();
 * 
 * // 选择动作
 * const placements = aiController.evaluateAllPlacements(board, tetromino);
 * const selectedPlacement = agent.selectAction(placements);
 * 
 * // 游戏结束后记录结果
 * agent.recordGame(score, linesCleared);
 * 
 * // 保存学习数据
 * agent.saveToStorage();
 * 
 * @example
 * // 自定义配置
 * const agent = new RLAgent({
 *   epsilon: 0.5,        // 50%探索率
 *   epsilonDecay: 0.99,  // 更快的衰减
 *   learningRate: 0.02   // 更高的学习率
 * });
 * 
 * @example
 * // 加载之前的学习数据
 * const agent = new RLAgent();
 * if (agent.loadFromStorage()) {
 *   console.log('成功加载学习数据');
 *   console.log(`已玩 ${agent.getStatistics().gamesPlayed} 局`);
 * }
 */
class RLAgent {
    /**
     * 创建一个新的RLAgent实例
     * 
     * @constructor
     * @param {RLAgentConfig} [config={}] - 配置选项
     * @param {Storage} [storage=null] - 存储接口（用于测试时注入mock）
     * 
     * @example
     * // 使用默认配置
     * const agent = new RLAgent();
     * 
     * @example
     * // 使用自定义配置
     * const agent = new RLAgent({
     *   epsilon: 0.3,
     *   epsilonMin: 0.05,
     *   epsilonDecay: 0.99,
     *   learningRate: 0.02
     * });
     * 
     * @example
     * // 测试时注入mock存储
     * const mockStorage = {
     *   getItem: jest.fn(),
     *   setItem: jest.fn(),
     *   removeItem: jest.fn()
     * };
     * const agent = new RLAgent({}, mockStorage);
     */
    constructor(config = {}, storage = null) {
        /**
         * 配置选项（合并默认配置和用户配置）
         * @type {RLAgentConfig}
         * @private
         */
        this.config = { ...DEFAULT_CONFIG, ...config };
        
        /**
         * 存储接口（默认使用localStorage，测试时可注入mock）
         * @type {Storage|null}
         * @private
         */
        this._storage = storage;
        
        /**
         * 当前探索率（0-1）
         * @type {number}
         */
        this.epsilon = this.config.epsilon;
        
        /**
         * 最小探索率
         * @type {number}
         * @private
         */
        this.epsilonMin = this.config.epsilonMin;
        
        /**
         * 探索率衰减系数
         * @type {number}
         * @private
         */
        this.epsilonDecay = this.config.epsilonDecay;
        
        /**
         * 学习率
         * @type {number}
         */
        this.learningRate = this.config.learningRate;
        
        /**
         * 评估权重
         * @type {Object}
         */
        this.weights = { ...DEFAULT_WEIGHTS };
        
        /**
         * 游戏统计数据
         * @type {GameStatistics}
         * @private
         */
        this.statistics = this._createEmptyStatistics();
        
        /**
         * 历史分数（用于计算移动平均）
         * @type {number[]}
         * @private
         */
        this.scoreHistory = [];
        
        /**
         * 数据版本号
         * @type {string}
         * @private
         */
        this.version = '1.0.0';
        
        /**
         * 随机数生成器（可注入用于测试）
         * @type {Function}
         * @private
         */
        this._random = config.random || Math.random;
    }
    
    /**
     * 创建空的统计对象
     * 
     * @returns {GameStatistics} 初始化为零的统计对象
     * @private
     */
    _createEmptyStatistics() {
        return {
            gamesPlayed: 0,
            totalScore: 0,
            bestScore: 0,
            totalLinesCleared: 0,
            averageScore: 0
        };
    }
    
    /**
     * 获取存储接口
     * 
     * 优先使用注入的存储接口，否则尝试使用localStorage。
     * 如果localStorage不可用（如隐私模式），返回null。
     * 
     * @returns {Storage|null} 存储接口，如果不可用则返回null
     * @private
     */
    _getStorage() {
        if (this._storage !== null) {
            return this._storage;
        }
        // 检查localStorage是否可用
        try {
            if (typeof localStorage !== 'undefined') {
                return localStorage;
            }
        } catch (e) {
            // localStorage不可用（可能是隐私模式）
        }
        return null;
    }

    /**
     * 使用Epsilon-Greedy策略选择动作
     * 
     * 这是强化学习的核心方法，在探索和利用之间取得平衡：
     * - 以概率ε随机选择一个放置位置（探索）
     * - 以概率(1-ε)选择分数最高的放置位置（利用）
     * 
     * ## 策略说明
     * 
     * - **epsilon = 0**: 总是选择最高分的放置位置（纯利用）
     * - **epsilon = 1**: 随机选择（纯探索，均匀分布）
     * - **0 < epsilon < 1**: 混合策略
     * 
     * @param {Placement[]} placements - 所有可能的放置位置数组
     * @returns {Placement|null} 选择的放置位置，如果输入为空则返回null
     * 
     * @example
     * const agent = new RLAgent({ epsilon: 0.1 }); // 10%探索率
     * 
     * const placements = [
     *   { x: 0, rotation: 0, score: 0.5 },
     *   { x: 3, rotation: 1, score: 0.8 },
     *   { x: 5, rotation: 0, score: 0.6 }
     * ];
     * 
     * // 90%的概率选择score=0.8的位置，10%的概率随机选择
     * const selected = agent.selectAction(placements);
     * 
     * Requirements: 7.1, 7.6
     */
    selectAction(placements) {
        if (!placements || placements.length === 0) {
            return null;
        }
        
        if (placements.length === 1) {
            return placements[0];
        }
        
        // 生成随机数决定是探索还是利用
        const randomValue = this._random();
        
        if (randomValue < this.epsilon) {
            // 探索：随机选择（均匀分布）
            const randomIndex = Math.floor(this._random() * placements.length);
            return placements[randomIndex];
        } else {
            // 利用：选择最高分的放置位置
            return this._selectBestPlacement(placements);
        }
    }
    
    /**
     * 选择分数最高的放置位置
     * 
     * 遍历所有放置位置，返回score属性最高的那个。
     * 
     * @param {Placement[]} placements - 所有可能的放置位置
     * @returns {Placement} 分数最高的放置位置
     * @private
     */
    _selectBestPlacement(placements) {
        let best = placements[0];
        for (let i = 1; i < placements.length; i++) {
            if (placements[i].score > best.score) {
                best = placements[i];
            }
        }
        return best;
    }
    
    /**
     * 衰减探索率
     * 
     * 每次游戏结束后调用，逐渐减少探索，增加利用。
     * 探索率不会低于epsilonMin。
     * 
     * ## 衰减公式
     * 
     * ```
     * epsilon = max(epsilonMin, epsilon * epsilonDecay)
     * ```
     * 
     * @returns {void}
     * 
     * @example
     * const agent = new RLAgent({ epsilon: 1.0, epsilonDecay: 0.995 });
     * 
     * // 模拟100局游戏
     * for (let i = 0; i < 100; i++) {
     *   agent.decayEpsilon();
     * }
     * 
     * console.log(agent.getEpsilon()); // 约0.606
     * 
     * Requirements: 7.6
     */
    decayEpsilon() {
        this.epsilon = Math.max(this.epsilonMin, this.epsilon * this.epsilonDecay);
    }
    
    /**
     * 根据游戏结果更新权重
     * 
     * 使用简单的梯度更新策略，根据游戏表现调整评估权重。
     * 表现好时强化当前权重方向，表现差时减弱。
     * 
     * @param {GameResult} gameResult - 游戏结果对象
     * @returns {void}
     * 
     * @example
     * const result = {
     *   score: 2000,
     *   linesCleared: 15,
     *   finalBoardMetrics: {
     *     aggregateHeight: 30,
     *     completeLines: 0,
     *     holes: 2,
     *     bumpiness: 5
     *   }
     * };
     * 
     * agent.updateWeights(result);
     * 
     * Requirements: 7.3
     */
    updateWeights(gameResult) {
        if (!gameResult) {
            return;
        }
        
        const { score, linesCleared, finalBoardMetrics } = gameResult;
        
        // 计算性能指标（归一化）
        const performance = this._calculatePerformance(score, linesCleared);
        
        // 如果有最终棋盘指标，使用它们来调整权重
        if (finalBoardMetrics) {
            this._adjustWeightsFromMetrics(finalBoardMetrics, performance);
        }
        
        // 基于整体表现微调权重
        this._adjustWeightsFromPerformance(performance);
    }
    
    /**
     * 计算性能指标（0-1范围）
     * 
     * 使用sigmoid函数将相对分数归一化到0-1范围。
     * 
     * @param {number} score - 游戏分数
     * @param {number} linesCleared - 消除行数（当前未使用，保留用于未来扩展）
     * @returns {number} 性能指标（0-1范围，0.5表示平均水平）
     * @private
     */
    _calculatePerformance(score, linesCleared) {
        // 使用历史数据计算相对性能
        if (this.statistics.gamesPlayed === 0 || this.statistics.averageScore === 0) {
            return 0.5; // 没有历史数据时返回中等性能
        }
        
        // 相对于平均分的表现
        const relativeScore = score / this.statistics.averageScore;
        
        // 归一化到0-1范围（使用sigmoid函数）
        const performance = 1 / (1 + Math.exp(-2 * (relativeScore - 1)));
        
        return performance;
    }
    
    /**
     * 根据棋盘指标调整权重
     * 
     * 根据游戏表现和最终棋盘状态调整各项权重。
     * 
     * @param {Object} metrics - 棋盘指标
     * @param {number} performance - 性能指标（0-1）
     * @returns {void}
     * @private
     */
    _adjustWeightsFromMetrics(metrics, performance) {
        const adjustment = this.learningRate * (performance - 0.5);
        
        // 如果表现好，强化当前权重方向
        // 如果表现差，减弱当前权重方向
        if (metrics.aggregateHeight !== undefined) {
            // 高度越低越好，所以权重应该是负的
            this.weights.aggregateHeight -= adjustment * 0.1;
        }
        if (metrics.completeLines !== undefined) {
            // 完整行越多越好，所以权重应该是正的
            this.weights.completeLines += adjustment * 0.1;
        }
        if (metrics.holes !== undefined) {
            // 空洞越少越好，所以权重应该是负的
            this.weights.holes -= adjustment * 0.1;
        }
        if (metrics.bumpiness !== undefined) {
            // 凹凸度越小越好，所以权重应该是负的
            this.weights.bumpiness -= adjustment * 0.1;
        }
    }
    
    /**
     * 根据整体表现调整权重
     * 
     * 添加小幅度随机扰动，帮助跳出局部最优。
     * 
     * @param {number} performance - 性能指标（0-1）
     * @returns {void}
     * @private
     */
    _adjustWeightsFromPerformance(performance) {
        // 小幅度随机扰动，帮助跳出局部最优
        const noise = (this._random() - 0.5) * this.learningRate * 0.1;
        
        // 根据表现调整扰动方向
        const direction = performance > 0.5 ? 1 : -1;
        
        // 应用微小调整
        this.weights.aggregateHeight += noise * direction;
        this.weights.completeLines += noise * direction;
        this.weights.holes += noise * direction;
        this.weights.bumpiness += noise * direction;
    }

    /**
     * 记录游戏结果
     * 
     * 更新统计数据并衰减探索率。应在每局游戏结束后调用。
     * 
     * @param {number} score - 游戏分数
     * @param {number} linesCleared - 消除行数
     * @returns {void}
     * 
     * @example
     * // 游戏结束时
     * const finalScore = gameEngine.getScore();
     * const linesCleared = gameEngine.getLinesCleared();
     * 
     * agent.recordGame(finalScore, linesCleared);
     * agent.saveToStorage(); // 可选：保存学习数据
     * 
     * Requirements: 7.2, 7.5
     */
    recordGame(score, linesCleared) {
        // 更新游戏次数
        this.statistics.gamesPlayed++;
        
        // 更新总分
        this.statistics.totalScore += score;
        
        // 更新最高分
        if (score > this.statistics.bestScore) {
            this.statistics.bestScore = score;
        }
        
        // 更新总消行数
        this.statistics.totalLinesCleared += linesCleared;
        
        // 更新平均分
        this.statistics.averageScore = this.statistics.totalScore / this.statistics.gamesPlayed;
        
        // 添加到历史记录
        this.scoreHistory.push(score);
        
        // 限制历史记录大小
        if (this.scoreHistory.length > this.config.scoreHistorySize) {
            this.scoreHistory.shift();
        }
        
        // 衰减探索率
        this.decayEpsilon();
    }
    
    /**
     * 保存学习数据到Local Storage
     * 
     * 将当前的权重、探索率、统计数据和历史分数保存到Local Storage。
     * 
     * @returns {boolean} 如果保存成功返回true，否则返回false
     * 
     * @example
     * const agent = new RLAgent();
     * 
     * // 进行一些学习...
     * agent.recordGame(1500, 10);
     * 
     * // 保存学习数据
     * if (agent.saveToStorage()) {
     *   console.log('学习数据已保存');
     * } else {
     *   console.log('保存失败（可能是存储不可用）');
     * }
     * 
     * Requirements: 7.4
     */
    saveToStorage() {
        const storage = this._getStorage();
        if (!storage) {
            return false;
        }
        
        try {
            const data = this._createLearningData();
            storage.setItem(STORAGE_KEY, JSON.stringify(data));
            return true;
        } catch (e) {
            // 存储失败（可能是配额超限或其他错误）
            console.error('Failed to save learning data:', e);
            return false;
        }
    }
    
    /**
     * 从Local Storage加载学习数据
     * 
     * 加载之前保存的权重、探索率、统计数据和历史分数。
     * 
     * @returns {boolean} 如果加载成功返回true，否则返回false
     * 
     * @example
     * const agent = new RLAgent();
     * 
     * // 尝试加载之前的学习数据
     * if (agent.loadFromStorage()) {
     *   console.log('成功加载学习数据');
     *   console.log(`已玩 ${agent.getStatistics().gamesPlayed} 局`);
     *   console.log(`当前探索率: ${agent.getEpsilon()}`);
     * } else {
     *   console.log('没有找到学习数据，从头开始');
     * }
     * 
     * Requirements: 7.4
     */
    loadFromStorage() {
        const storage = this._getStorage();
        if (!storage) {
            return false;
        }
        
        try {
            const dataStr = storage.getItem(STORAGE_KEY);
            if (!dataStr) {
                return false;
            }
            
            const data = JSON.parse(dataStr);
            return this._loadLearningData(data);
        } catch (e) {
            // 加载失败（可能是数据损坏）
            console.error('Failed to load learning data:', e);
            return false;
        }
    }
    
    /**
     * 创建学习数据对象
     * 
     * 将当前状态打包为可序列化的学习数据对象。
     * 
     * @returns {AILearningData} 学习数据对象
     * @private
     */
    _createLearningData() {
        return {
            weights: { ...this.weights },
            epsilon: this.epsilon,
            statistics: { ...this.statistics },
            scoreHistory: [...this.scoreHistory],
            version: this.version,
            lastUpdated: new Date().toISOString()
        };
    }
    
    /**
     * 从学习数据对象加载
     * 
     * 验证并加载学习数据对象中的各项数据。
     * 
     * @param {AILearningData} data - 学习数据对象
     * @returns {boolean} 如果成功加载返回true，否则返回false
     * @private
     */
    _loadLearningData(data) {
        if (!data || typeof data !== 'object') {
            return false;
        }
        
        // 验证并加载权重
        if (data.weights && typeof data.weights === 'object') {
            if (this._isValidWeights(data.weights)) {
                this.weights = { ...data.weights };
            }
        }
        
        // 加载探索率
        if (typeof data.epsilon === 'number' && 
            data.epsilon >= 0 && data.epsilon <= 1) {
            this.epsilon = data.epsilon;
        }
        
        // 加载统计数据
        if (data.statistics && typeof data.statistics === 'object') {
            if (this._isValidStatistics(data.statistics)) {
                this.statistics = { ...data.statistics };
            }
        }
        
        // 加载历史分数
        if (Array.isArray(data.scoreHistory)) {
            this.scoreHistory = data.scoreHistory.filter(
                s => typeof s === 'number' && Number.isFinite(s)
            );
        }
        
        // 加载版本
        if (typeof data.version === 'string') {
            this.version = data.version;
        }
        
        return true;
    }
    
    /**
     * 验证权重对象是否有效
     * 
     * 检查权重对象是否包含所有必需的属性，且值为有限数字。
     * 
     * @param {Object} weights - 权重对象
     * @returns {boolean} 如果有效返回true，否则返回false
     * @private
     */
    _isValidWeights(weights) {
        const requiredKeys = ['aggregateHeight', 'completeLines', 'holes', 'bumpiness'];
        for (const key of requiredKeys) {
            if (typeof weights[key] !== 'number' || !Number.isFinite(weights[key])) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * 验证统计对象是否有效
     * 
     * 检查统计对象是否包含所有必需的属性，且值为有限数字。
     * 
     * @param {Object} stats - 统计对象
     * @returns {boolean} 如果有效返回true，否则返回false
     * @private
     */
    _isValidStatistics(stats) {
        const requiredKeys = ['gamesPlayed', 'totalScore', 'bestScore', 'totalLinesCleared', 'averageScore'];
        for (const key of requiredKeys) {
            if (typeof stats[key] !== 'number' || !Number.isFinite(stats[key])) {
                return false;
            }
        }
        return true;
    }

    /**
     * 清除存储的学习数据
     * 
     * 从Local Storage中删除学习数据。不会影响当前内存中的状态。
     * 
     * @returns {boolean} 如果清除成功返回true，否则返回false
     * 
     * @example
     * // 重新开始学习
     * agent.clearStorage();
     * agent.reset();
     */
    clearStorage() {
        const storage = this._getStorage();
        if (!storage) {
            return false;
        }
        
        try {
            storage.removeItem(STORAGE_KEY);
            return true;
        } catch (e) {
            console.error('Failed to clear learning data:', e);
            return false;
        }
    }
    
    /**
     * 重置代理到初始状态
     * 
     * 将探索率、权重、统计数据和历史分数重置为初始值。
     * 不会清除Local Storage中的数据。
     * 
     * @returns {void}
     * 
     * @example
     * // 重新开始学习
     * agent.reset();
     * console.log(agent.getEpsilon()); // 1.0（初始探索率）
     */
    reset() {
        this.epsilon = this.config.epsilon;
        this.weights = { ...DEFAULT_WEIGHTS };
        this.statistics = this._createEmptyStatistics();
        this.scoreHistory = [];
    }
    
    /**
     * 获取当前探索率
     * 
     * @returns {number} 当前探索率（0-1）
     * 
     * @example
     * const epsilon = agent.getEpsilon();
     * console.log(`当前探索率: ${(epsilon * 100).toFixed(1)}%`);
     */
    getEpsilon() {
        return this.epsilon;
    }
    
    /**
     * 设置探索率
     * 
     * 手动设置探索率，值会被钳制到[0, 1]范围。
     * 
     * @param {number} epsilon - 新的探索率（0-1）
     * @returns {void}
     * 
     * @example
     * // 设置为10%探索率
     * agent.setEpsilon(0.1);
     */
    setEpsilon(epsilon) {
        this.epsilon = Math.max(0, Math.min(1, epsilon));
    }
    
    /**
     * 获取学习率
     * 
     * @returns {number} 当前学习率
     */
    getLearningRate() {
        return this.learningRate;
    }
    
    /**
     * 设置学习率
     * 
     * @param {number} rate - 新的学习率（非负数）
     * @returns {void}
     */
    setLearningRate(rate) {
        this.learningRate = Math.max(0, rate);
    }
    
    /**
     * 获取当前权重
     * 
     * 返回权重的副本，修改返回值不会影响代理内部的权重。
     * 
     * @returns {Object} 权重副本
     * 
     * @example
     * const weights = agent.getWeights();
     * console.log(`完整行权重: ${weights.completeLines}`);
     */
    getWeights() {
        return { ...this.weights };
    }
    
    /**
     * 设置权重
     * 
     * 手动设置评估权重。只有在权重有效时才会更新。
     * 
     * @param {Object} weights - 新的权重对象
     * @returns {void}
     * 
     * @example
     * agent.setWeights({
     *   aggregateHeight: -0.6,
     *   completeLines: 0.9,
     *   holes: -0.4,
     *   bumpiness: -0.2
     * });
     */
    setWeights(weights) {
        if (this._isValidWeights(weights)) {
            this.weights = { ...weights };
        }
    }
    
    /**
     * 获取游戏统计
     * 
     * 返回统计数据的副本。
     * 
     * @returns {GameStatistics} 统计数据副本
     * 
     * @example
     * const stats = agent.getStatistics();
     * console.log(`已玩: ${stats.gamesPlayed} 局`);
     * console.log(`最高分: ${stats.bestScore}`);
     * console.log(`平均分: ${stats.averageScore.toFixed(2)}`);
     * 
     * Requirements: 7.5
     */
    getStatistics() {
        return { ...this.statistics };
    }
    
    /**
     * 获取历史分数
     * 
     * 返回历史分数数组的副本。
     * 
     * @returns {number[]} 历史分数副本
     */
    getScoreHistory() {
        return [...this.scoreHistory];
    }
    
    /**
     * 获取最近N局的平均分
     * 
     * 用于评估最近的学习效果。
     * 
     * @param {number} [n=10] - 要计算的局数
     * @returns {number} 最近N局的平均分，如果没有历史记录则返回0
     * 
     * @example
     * const recentAvg = agent.getRecentAverageScore(20);
     * console.log(`最近20局平均分: ${recentAvg.toFixed(2)}`);
     */
    getRecentAverageScore(n = 10) {
        if (this.scoreHistory.length === 0) {
            return 0;
        }
        
        const recentScores = this.scoreHistory.slice(-n);
        const sum = recentScores.reduce((a, b) => a + b, 0);
        return sum / recentScores.length;
    }
    
    /**
     * 获取学习数据对象（用于导出或调试）
     * 
     * 返回完整的学习数据对象，可用于导出或调试。
     * 
     * @returns {AILearningData} 学习数据对象
     * 
     * @example
     * const data = agent.getLearningData();
     * console.log(JSON.stringify(data, null, 2));
     * 
     * // 导出到文件
     * const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
     */
    getLearningData() {
        return this._createLearningData();
    }
    
    /**
     * 从学习数据对象导入
     * 
     * 从之前导出的学习数据对象恢复状态。
     * 
     * @param {AILearningData} data - 学习数据对象
     * @returns {boolean} 如果成功导入返回true，否则返回false
     * 
     * @example
     * // 从文件导入
     * const data = JSON.parse(fileContent);
     * if (agent.importLearningData(data)) {
     *   console.log('成功导入学习数据');
     * }
     */
    importLearningData(data) {
        return this._loadLearningData(data);
    }
    
    /**
     * 获取代理状态摘要
     * 
     * 返回代理当前状态的摘要信息，用于UI显示或调试。
     * 
     * @returns {RLAgentStatus} 状态摘要对象
     * 
     * @example
     * const status = agent.getStatus();
     * console.log('AI学习状态:');
     * console.log(`  探索率: ${(status.epsilon * 100).toFixed(1)}%`);
     * console.log(`  已玩: ${status.gamesPlayed} 局`);
     * console.log(`  最高分: ${status.bestScore}`);
     * console.log(`  平均分: ${status.averageScore.toFixed(2)}`);
     * console.log(`  最近10局平均: ${status.recentAverageScore.toFixed(2)}`);
     */
    getStatus() {
        return {
            epsilon: this.epsilon,
            learningRate: this.learningRate,
            gamesPlayed: this.statistics.gamesPlayed,
            averageScore: this.statistics.averageScore,
            bestScore: this.statistics.bestScore,
            totalLinesCleared: this.statistics.totalLinesCleared,
            recentAverageScore: this.getRecentAverageScore(10)
        };
    }
}

// 导出模块
export { RLAgent, STORAGE_KEY, DEFAULT_CONFIG };
