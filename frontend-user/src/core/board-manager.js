/**
 * @module core/board-manager
 * @description BoardManager - 俄罗斯方块棋盘管理类模块
 * 
 * 本模块负责管理俄罗斯方块游戏的棋盘状态，包括：
 * - 10x20标准棋盘网格管理
 * - 碰撞检测（边界和已放置方块）
 * - 方块放置
 * - 完整行检测和消除
 * - 游戏结束检测
 * 
 * ## 棋盘坐标系
 * - X轴：从左到右，范围 0-9（共10列）
 * - Y轴：从上到下，范围 0-19（共20行）
 * - 原点(0,0)在左上角
 * 
 * ## 单元格状态
 * - 0: 空单元格
 * - 1-7: 不同类型方块占用（对应TETROMINO_TYPES索引+1）
 * 
 * ## 实现的需求
 * - Requirements 2.5: 碰撞检测
 * - Requirements 4.1, 4.2: 行消除
 * - Requirements 5.1: 游戏结束检测
 * - Requirements 8.1: 硬降计算
 * 
 * @example
 * import { BoardManager, BOARD_WIDTH, BOARD_HEIGHT } from './board-manager.js';
 * 
 * const board = new BoardManager();
 * 
 * // 检查位置是否有效
 * if (board.isValidPosition(tetromino)) {
 *     board.placeTetromino(tetromino);
 * }
 * 
 * // 消除完整行
 * const linesCleared = board.clearLines();
 */

import { TETROMINO_TYPES } from './tetromino.js';

/**
 * 棋盘宽度（列数）
 * 
 * 标准俄罗斯方块棋盘宽度为10列。
 * 
 * @constant {number}
 */
const BOARD_WIDTH = 10;

/**
 * 棋盘高度（行数）
 * 
 * 标准俄罗斯方块棋盘高度为20行。
 * 
 * @constant {number}
 */
const BOARD_HEIGHT = 20;

/**
 * 空单元格值
 * 
 * 表示棋盘上未被方块占用的单元格。
 * 非零值（1-7）表示被不同类型的方块占用。
 * 
 * @constant {number}
 */
const EMPTY_CELL = 0;

/**
 * BoardManager 类
 * 
 * 管理俄罗斯方块游戏的棋盘状态和相关操作。
 * 
 * ## 主要功能
 * - 棋盘网格状态管理
 * - 方块位置有效性检测（碰撞检测）
 * - 方块放置到棋盘
 * - 完整行检测和消除
 * - 游戏结束条件检测
 * - 硬降位置计算
 * 
 * ## 棋盘表示
 * 使用二维数组表示棋盘，grid[y][x]表示第y行第x列的单元格状态。
 * 
 * @class
 * @example
 * const board = new BoardManager();
 * 
 * // 检查方块位置
 * if (board.isValidPosition(tetromino, 0, 1)) {
 *     tetromino.y += 1; // 可以下移
 * }
 * 
 * // 放置方块并消行
 * board.placeTetromino(tetromino);
 * const cleared = board.clearLines();
 */
class BoardManager {
    /**
     * 创建一个新的BoardManager实例
     * 
     * 初始化一个空的10x20棋盘网格。
     * 
     * @constructor
     * @example
     * const board = new BoardManager();
     * console.log(board.width);  // 10
     * console.log(board.height); // 20
     */
    constructor() {
        this.width = BOARD_WIDTH;
        this.height = BOARD_HEIGHT;
        this.grid = this._createEmptyGrid();
    }
    
    /**
     * 创建空的棋盘网格
     * 
     * 生成一个height行width列的二维数组，所有单元格初始化为EMPTY_CELL(0)。
     * 
     * @private
     * @returns {number[][]} 初始化的空网格，大小为height x width
     */
    _createEmptyGrid() {
        const grid = [];
        for (let y = 0; y < this.height; y++) {
            grid.push(new Array(this.width).fill(EMPTY_CELL));
        }
        return grid;
    }
    
    /**
     * 检查位置是否有效（在棋盘边界内且未被占用）
     * 
     * 验证方块在指定偏移位置是否可以放置，检查：
     * 1. 方块的所有填充单元格是否在棋盘边界内
     * 2. 方块的所有填充单元格是否与已放置的方块重叠
     * 
     * @param {Tetromino} tetromino - 要检查的方块实例
     * @param {number} [offsetX=0] - X偏移量（相对于方块当前位置）
     * @param {number} [offsetY=0] - Y偏移量（相对于方块当前位置）
     * @returns {boolean} 如果位置有效返回true，否则返回false
     * 
     * @description 实现 Requirement 2.5 - 碰撞检测
     * 
     * @example
     * // 检查方块能否下移一格
     * if (board.isValidPosition(tetromino, 0, 1)) {
     *     tetromino.y += 1;
     * }
     * 
     * // 检查方块能否左移
     * if (board.isValidPosition(tetromino, -1, 0)) {
     *     tetromino.x -= 1;
     * }
     */
    isValidPosition(tetromino, offsetX = 0, offsetY = 0) {
        const shape = tetromino.shape;
        const newX = tetromino.x + offsetX;
        const newY = tetromino.y + offsetY;
        
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col] !== 0) {
                    const boardX = newX + col;
                    const boardY = newY + row;
                    
                    // 检查边界
                    if (boardX < 0 || boardX >= this.width) {
                        return false;
                    }
                    if (boardY < 0 || boardY >= this.height) {
                        return false;
                    }
                    
                    // 检查是否与已放置的方块碰撞
                    if (this.grid[boardY][boardX] !== EMPTY_CELL) {
                        return false;
                    }
                }
            }
        }
        
        return true;
    }

    
    /**
     * 检查指定形状在指定位置是否有效
     * 
     * 与isValidPosition类似，但直接接受形状矩阵和坐标，
     * 用于Wall Kick系统等需要检查旋转后形状的场景。
     * 
     * @param {number[][]} shape - 方块形状矩阵
     * @param {number} x - X坐标（棋盘列位置）
     * @param {number} y - Y坐标（棋盘行位置）
     * @returns {boolean} 如果位置有效返回true，否则返回false
     * 
     * @example
     * const rotatedShape = tetromino.getRotatedShape(1);
     * if (board.isValidShapePosition(rotatedShape, tetromino.x, tetromino.y)) {
     *     // 旋转后的形状可以放置
     * }
     */
    isValidShapePosition(shape, x, y) {
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col] !== 0) {
                    const boardX = x + col;
                    const boardY = y + row;
                    
                    // 检查边界
                    if (boardX < 0 || boardX >= this.width) {
                        return false;
                    }
                    if (boardY < 0 || boardY >= this.height) {
                        return false;
                    }
                    
                    // 检查是否与已放置的方块碰撞
                    if (this.grid[boardY][boardX] !== EMPTY_CELL) {
                        return false;
                    }
                }
            }
        }
        
        return true;
    }
    
    /**
     * 将方块放置到棋盘上
     * 
     * 将方块的所有填充单元格写入棋盘网格。
     * 放置前会验证位置有效性，无效位置不会放置。
     * 
     * @param {Tetromino} tetromino - 要放置的方块实例
     * @returns {boolean} 如果成功放置返回true，位置无效返回false
     * 
     * @example
     * if (board.placeTetromino(tetromino)) {
     *     console.log('方块已放置');
     *     const cleared = board.clearLines();
     * }
     */
    placeTetromino(tetromino) {
        if (!this.isValidPosition(tetromino)) {
            return false;
        }
        
        const shape = tetromino.shape;
        const typeIndex = TETROMINO_TYPES.indexOf(tetromino.type) + 1;
        
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col] !== 0) {
                    const boardX = tetromino.x + col;
                    const boardY = tetromino.y + row;
                    this.grid[boardY][boardX] = typeIndex;
                }
            }
        }
        
        return true;
    }
    
    /**
     * 检查并清除完整的行
     * 
     * 从底部向上扫描棋盘，移除所有完整填充的行，
     * 并将上方的行下移填补空缺。
     * 
     * ## 消行算法详解
     * 
     * ### 算法步骤
     * 1. 从最底行（y = height - 1 = 19）开始向上扫描
     * 2. 检查当前行是否完整（所有单元格都被填充）
     * 3. 如果当前行完整：
     *    - 移除该行（从数组中删除）
     *    - 在顶部添加新的空行（实现"重力"效果）
     *    - 不移动y指针，继续检查同一位置（因为上方行已下移到当前位置）
     * 4. 如果当前行不完整：
     *    - 向上移动y指针（y--），检查下一行
     * 5. 重复直到检查完所有行（y < 0）
     * 
     * ### 为什么不移动y指针？
     * 当移除一行后，上方的所有行会下移一格。如果此时y--，
     * 会跳过刚刚下移到当前位置的行。保持y不变可以确保
     * 连续的完整行都被正确检测和移除。
     * 
     * ### 时间复杂度
     * - 最坏情况：O(height * width) = O(20 * 10) = O(200)
     * - 每行检查需要遍历所有列
     * 
     * ### 示例
     * 假设第18、19行都是完整的：
     * 1. y=19，第19行完整，移除，linesCleared=1
     * 2. y=19（不变），原第18行现在在第19行，完整，移除，linesCleared=2
     * 3. y=19（不变），原第17行现在在第19行，不完整，y--
     * 4. 继续向上扫描...
     * 
     * @returns {number} 清除的行数（0-4，俄罗斯方块最多一次消4行）
     * 
     * @description 实现 Requirements 4.1, 4.2 - 行消除功能
     * 
     * @example
     * board.placeTetromino(tetromino);
     * const linesCleared = board.clearLines();
     * if (linesCleared > 0) {
     *     score += calculateScore(linesCleared);
     * }
     */
    clearLines() {
        let linesCleared = 0;
        
        // 从底部向上扫描（y = height-1 是最底行）
        // 使用 while 循环而非 for 循环，因为 y 的变化不是固定的
        let y = this.height - 1;
        while (y >= 0) {
            if (this._isLineFull(y)) {
                // 当前行完整，执行消除
                this._removeLine(y);
                linesCleared++;
                // 关键：不递减 y！
                // 因为上方的行已经下移，需要重新检查当前位置
                // 这确保了连续的完整行都能被正确消除
            } else {
                // 当前行不完整，向上移动检查下一行
                y--;
            }
        }
        
        return linesCleared;
    }
    
    /**
     * 检查指定行是否完整
     * 
     * 检查指定行的所有单元格是否都被方块占用。
     * 
     * @private
     * @param {number} y - 行索引（0为顶行，height-1为底行）
     * @returns {boolean} 如果行完整（无空单元格）返回true
     */
    _isLineFull(y) {
        for (let x = 0; x < this.width; x++) {
            if (this.grid[y][x] === EMPTY_CELL) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * 移除指定行并将上方行下移
     * 
     * 从棋盘中移除指定行，并在顶部添加一个新的空行，
     * 实现"重力"效果。
     * 
     * ## 实现原理
     * 
     * 使用 JavaScript 数组的 splice 和 unshift 方法：
     * 1. splice(y, 1) - 从数组中移除索引为 y 的元素（即第 y 行）
     *    - 这会自动将 y 之后的所有元素向前移动一位
     *    - 即上方的行自动"下落"
     * 2. unshift(newRow) - 在数组开头添加新元素（新的空行）
     *    - 保持棋盘高度不变
     * 
     * ## 为什么这样实现？
     * 
     * 这种实现方式简洁高效：
     * - 不需要手动移动每一行
     * - JavaScript 引擎会优化数组操作
     * - 代码可读性好
     * 
     * @private
     * @param {number} y - 要移除的行索引（0为顶行，height-1为底行）
     */
    _removeLine(y) {
        // 移除该行（上方的行会自动下移填补空缺）
        this.grid.splice(y, 1);
        // 在顶部添加新的空行（保持棋盘高度不变）
        this.grid.unshift(new Array(this.width).fill(EMPTY_CELL));
    }

    
    /**
     * 检查游戏是否结束（新方块生成位置被占用）
     * 
     * 当新生成的方块无法放置在初始位置时，游戏结束。
     * 
     * @param {Tetromino} tetromino - 新生成的方块实例
     * @returns {boolean} 如果游戏结束返回true
     * 
     * @description 实现 Requirement 5.1 - 游戏结束检测
     * 
     * @example
     * const newPiece = factory.createRandom(spawnX, spawnY);
     * if (board.isGameOver(newPiece)) {
     *     gameState = 'gameover';
     * }
     */
    isGameOver(tetromino) {
        return !this.isValidPosition(tetromino);
    }
    
    /**
     * 重置棋盘到初始状态
     * 
     * 清空棋盘上的所有方块，恢复为空网格。
     * 
     * @returns {void}
     * 
     * @example
     * board.reset(); // 开始新游戏时调用
     */
    reset() {
        this.grid = this._createEmptyGrid();
    }
    
    /**
     * 获取指定单元格的值
     * 
     * 返回棋盘上指定位置的单元格状态。
     * 
     * @param {number} x - X坐标（列，0-9）
     * @param {number} y - Y坐标（行，0-19）
     * @returns {number} 单元格值：0为空，1-7为方块类型，-1为越界
     * 
     * @example
     * const cellValue = board.getCell(5, 10);
     * if (cellValue === 0) {
     *     console.log('该位置为空');
     * }
     */
    getCell(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return -1; // 越界
        }
        return this.grid[y][x];
    }
    
    /**
     * 设置指定单元格的值
     * 
     * 直接设置棋盘上指定位置的单元格值。
     * 越界坐标会被忽略。
     * 
     * @param {number} x - X坐标（列，0-9）
     * @param {number} y - Y坐标（行，0-19）
     * @param {number} value - 要设置的值（0为空，1-7为方块类型）
     * @returns {boolean} 如果成功设置返回true，越界返回false
     * 
     * @example
     * board.setCell(5, 10, 1); // 在(5,10)位置放置I型方块
     */
    setCell(x, y, value) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return false;
        }
        this.grid[y][x] = value;
        return true;
    }
    
    /**
     * 获取棋盘的深拷贝
     * 
     * 返回当前棋盘网格的深拷贝，修改拷贝不会影响原棋盘。
     * 用于AI模拟、状态保存等场景。
     * 
     * @returns {number[][]} 棋盘网格的深拷贝
     * 
     * @example
     * const gridCopy = board.getGridCopy();
     * // 可以安全地修改gridCopy而不影响board
     */
    getGridCopy() {
        return this.grid.map(row => [...row]);
    }
    
    /**
     * 从网格数据恢复棋盘状态
     * 
     * 用提供的网格数据替换当前棋盘状态。
     * 用于游戏状态恢复或测试场景。
     * 
     * @param {number[][]} grid - 网格数据，必须是height x width的二维数组
     * @throws {Error} 如果网格尺寸不匹配
     * 
     * @example
     * const savedGrid = board.getGridCopy();
     * // ... 进行一些操作 ...
     * board.setGrid(savedGrid); // 恢复之前的状态
     */
    setGrid(grid) {
        if (grid.length !== this.height || grid[0].length !== this.width) {
            throw new Error('Invalid grid dimensions');
        }
        this.grid = grid.map(row => [...row]);
    }
    
    /**
     * 计算棋盘上已填充的单元格数量
     * 
     * 统计棋盘上所有非空单元格的数量。
     * 可用于AI评估或统计显示。
     * 
     * @returns {number} 已填充的单元格数量
     * 
     * @example
     * const filledCount = board.getFilledCellCount();
     * const fillRate = filledCount / (BOARD_WIDTH * BOARD_HEIGHT);
     */
    getFilledCellCount() {
        let count = 0;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.grid[y][x] !== EMPTY_CELL) {
                    count++;
                }
            }
        }
        return count;
    }
    
    /**
     * 获取完整行的索引列表
     * 
     * 扫描整个棋盘，返回所有完整行的索引。
     * 用于预览将要消除的行或动画效果。
     * 
     * @returns {number[]} 完整行的索引数组（从上到下排序）
     * 
     * @example
     * const fullLines = board.getFullLines();
     * console.log(`将消除 ${fullLines.length} 行`);
     */
    getFullLines() {
        const fullLines = [];
        for (let y = 0; y < this.height; y++) {
            if (this._isLineFull(y)) {
                fullLines.push(y);
            }
        }
        return fullLines;
    }
    
    /**
     * 计算硬降位置（方块能下落到的最低有效位置）
     * 
     * 计算方块从当前位置直接下落到底部时的Y坐标。
     * 用于实现硬降功能和Ghost Piece显示。
     * 
     * @param {Tetromino} tetromino - 要计算的方块实例
     * @returns {number} 硬降后的Y坐标
     * 
     * @example
     * const dropY = board.getHardDropY(tetromino);
     * const distance = dropY - tetromino.y;
     * tetromino.y = dropY; // 执行硬降
     */
    getHardDropY(tetromino) {
        let dropY = tetromino.y;
        while (this.isValidPosition(tetromino, 0, dropY - tetromino.y + 1)) {
            dropY++;
        }
        return dropY;
    }
}

// 导出模块
export { BoardManager, BOARD_WIDTH, BOARD_HEIGHT, EMPTY_CELL };
