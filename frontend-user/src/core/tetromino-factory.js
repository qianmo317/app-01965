/**
 * @module core/tetromino-factory
 * @description TetrominoFactory - 俄罗斯方块工厂类模块
 * 
 * 本模块实现了俄罗斯方块的方块生成功能，使用 7-bag 随机算法确保公平分布。
 * 
 * ## 7-bag 随机算法
 * 
 * 7-bag 算法是现代俄罗斯方块游戏的标准随机算法，其核心思想是：
 * - 将7种方块类型放入一个"袋子"中
 * - 随机打乱袋子中的顺序
 * - 依次取出方块，直到袋子为空
 * - 袋子为空时，重新填充并打乱
 * 
 * ### 算法优势
 * 
 * 1. **公平性**: 在任意连续14个方块中，每种类型至少出现1次，最多出现2次
 * 2. **可预测性**: 玩家可以预期即将出现的方块类型
 * 3. **避免极端情况**: 不会出现连续多个相同方块或长时间不出现某种方块
 * 
 * ### 实现细节
 * 
 * 本实现使用双袋机制（bag + nextBag）：
 * - 当前袋子（bag）用于生成方块
 * - 下一个袋子（nextBag）用于预览
 * - 当 bag 为空时，将 nextBag 移动到 bag，并生成新的 nextBag
 * 
 * ## 实现的需求
 * - Requirements 1.1: 方块生成
 * - Requirements 1.3: 下一个方块预览
 * - Requirements 1.4: 7-bag 随机算法
 * 
 * @example
 * import { TetrominoFactory } from './tetromino-factory.js';
 * 
 * const factory = new TetrominoFactory();
 * 
 * // 生成随机方块
 * const tetromino = factory.createRandom(3, 0);
 * 
 * // 预览下一个方块
 * const next = factory.peekNext();
 * 
 * // 重置工厂（新游戏时）
 * factory.reset();
 */

import { Tetromino, TETROMINO_TYPES } from './tetromino.js';

/**
 * Fisher-Yates 洗牌算法（也称为 Knuth 洗牌）
 * 
 * 这是一种高效的原地洗牌算法，能够生成均匀分布的随机排列。
 * 
 * ## 算法原理
 * 
 * 从数组末尾开始，每次随机选择一个位置与当前位置交换：
 * 1. 从最后一个元素开始（i = n-1）
 * 2. 在 [0, i] 范围内随机选择一个索引 j
 * 3. 交换位置 i 和 j 的元素
 * 4. i--，重复直到 i = 0
 * 
 * ## 时间复杂度
 * - O(n)，其中 n 是数组长度
 * 
 * ## 空间复杂度
 * - O(1)，原地修改数组
 * 
 * @param {Array} array - 要洗牌的数组
 * @returns {Array} - 洗牌后的数组（原地修改）
 * 
 * @example
 * const arr = [1, 2, 3, 4, 5];
 * shuffleArray(arr);
 * // arr 现在是随机排列，如 [3, 1, 5, 2, 4]
 */
function shuffleArray(array) {
    // 从最后一个元素开始向前遍历
    for (let i = array.length - 1; i > 0; i--) {
        // 在 [0, i] 范围内随机选择一个索引
        const j = Math.floor(Math.random() * (i + 1));
        // 交换元素（使用解构赋值）
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * TetrominoFactory 类
 * 
 * 使用 7-bag 随机算法生成方块，确保公平分布。
 * 7-bag 算法保证在任意连续7个方块中，每种类型恰好出现一次。
 * 
 * ## 内部结构
 * 
 * - **bag**: 当前袋子，包含待生成的方块类型
 * - **nextBag**: 下一个袋子，用于预览和无缝衔接
 * - **randomFn**: 随机函数，可注入用于测试
 * 
 * ## 使用流程
 * 
 * 1. 创建工厂实例
 * 2. 调用 createRandom() 生成方块
 * 3. 调用 peekNext() 预览下一个方块
 * 4. 游戏结束时调用 reset() 重置
 * 
 * @class
 * @example
 * const factory = new TetrominoFactory();
 * 
 * // 生成方块
 * const piece1 = factory.createRandom(3, 0);
 * const piece2 = factory.createRandom(3, 0);
 * 
 * // 预览
 * const nextPiece = factory.peekNext();
 * console.log(`下一个方块: ${nextPiece.type}`);
 */
class TetrominoFactory {
    /**
     * 创建一个新的 TetrominoFactory
     * 
     * @param {Object} options - 配置选项
     * @param {Function} options.randomFn - 自定义随机函数（用于测试），默认使用 Math.random
     * 
     * @example
     * // 使用默认随机函数
     * const factory = new TetrominoFactory();
     * 
     * // 使用自定义随机函数（用于测试）
     * let seed = 0;
     * const factory = new TetrominoFactory({
     *     randomFn: () => {
     *         seed = (seed * 1103515245 + 12345) % (2 ** 31);
     *         return seed / (2 ** 31);
     *     }
     * });
     */
    constructor(options = {}) {
        // 随机函数，可注入用于测试
        this.randomFn = options.randomFn || Math.random;
        // 当前袋子和下一个袋子
        this.bag = [];
        this.nextBag = [];
        // 初始化两个袋子
        this._fillBag();
        this._fillNextBag();
    }
    
    /**
     * 使用自定义随机函数进行洗牌
     * @param {Array} array - 要洗牌的数组
     * @returns {Array} - 洗牌后的数组
     */
    _shuffleWithRandom(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(this.randomFn() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    
    /**
     * 填充当前bag
     * 创建包含所有7种方块类型的数组并洗牌
     */
    _fillBag() {
        this.bag = [...TETROMINO_TYPES];
        this._shuffleWithRandom(this.bag);
    }
    
    /**
     * 填充下一个bag（用于预览）
     */
    _fillNextBag() {
        this.nextBag = [...TETROMINO_TYPES];
        this._shuffleWithRandom(this.nextBag);
    }
    
    /**
     * 从bag中获取下一个方块类型
     * 当bag为空时，将nextBag移动到bag并生成新的nextBag
     * @returns {string} - 方块类型
     */
    _getNextType() {
        if (this.bag.length === 0) {
            // 将nextBag移动到bag
            this.bag = this.nextBag;
            // 生成新的nextBag
            this._fillNextBag();
        }
        return this.bag.shift();
    }
    
    /**
     * 创建一个随机方块
     * 使用7-bag算法确保公平分布
     * @param {number} x - 初始X坐标（默认为0）
     * @param {number} y - 初始Y坐标（默认为0）
     * @returns {Tetromino} - 新创建的方块
     * 
     * Requirements: 1.1, 1.4
     */
    createRandom(x = 0, y = 0) {
        const type = this._getNextType();
        return new Tetromino(type, x, y);
    }
    
    /**
     * 预览下一个方块（不消耗）
     * @returns {Tetromino} - 下一个方块的预览
     * 
     * Requirements: 1.3
     */
    peekNext() {
        // 如果当前bag为空，下一个方块在nextBag的第一个位置
        const nextType = this.bag.length > 0 ? this.bag[0] : this.nextBag[0];
        return new Tetromino(nextType);
    }
    
    /**
     * 预览接下来的N个方块（不消耗）
     * @param {number} count - 要预览的方块数量
     * @returns {Tetromino[]} - 预览方块数组
     */
    peekNextN(count) {
        const result = [];
        const combinedBag = [...this.bag, ...this.nextBag];
        
        for (let i = 0; i < Math.min(count, combinedBag.length); i++) {
            result.push(new Tetromino(combinedBag[i]));
        }
        
        return result;
    }
    
    /**
     * 重置工厂状态
     * 清空当前bag并重新填充
     */
    reset() {
        this.bag = [];
        this.nextBag = [];
        this._fillBag();
        this._fillNextBag();
    }
    
    /**
     * 获取当前bag中剩余的方块类型
     * @returns {string[]} - 剩余方块类型数组
     */
    getRemainingInBag() {
        return [...this.bag];
    }
    
    /**
     * 获取当前bag的大小
     * @returns {number} - bag中剩余方块数量
     */
    getBagSize() {
        return this.bag.length;
    }
    
    /**
     * 创建指定类型的方块（用于测试或特殊场景）
     * @param {string} type - 方块类型
     * @param {number} x - 初始X坐标
     * @param {number} y - 初始Y坐标
     * @returns {Tetromino} - 新创建的方块
     */
    createByType(type, x = 0, y = 0) {
        if (!TETROMINO_TYPES.includes(type)) {
            throw new Error(`Invalid tetromino type: ${type}`);
        }
        return new Tetromino(type, x, y);
    }
}

// 导出模块
export { TetrominoFactory, shuffleArray };
