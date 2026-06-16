/**
 * @module core/tetromino
 * @description Tetromino - 俄罗斯方块方块类模块
 * 
 * 本模块定义了俄罗斯方块游戏中的7种标准方块（Tetromino）及其相关操作。
 * 包括方块形状定义、颜色映射、旋转状态预计算和Tetromino类实现。
 * 
 * ## 功能特性
 * - 7种标准方块类型：I, O, T, S, Z, J, L
 * - 预计算的旋转状态（O方块1种，其他方块4种）
 * - 顺时针和逆时针旋转支持
 * - 方块克隆和状态管理
 * 
 * ## 实现的需求
 * - Requirements 1.1: 方块旋转基础支持
 * - Requirements 3.1: 顺时针旋转
 * - Requirements 3.2: 逆时针旋转
 * - Requirements 3.5: O方块旋转不变性
 * 
 * @example
 * // 创建一个T型方块
 * import { Tetromino, TETROMINO_TYPES } from './tetromino.js';
 * const tPiece = new Tetromino('T', 3, 0);
 * console.log(tPiece.shape); // 获取当前形状
 * tPiece.rotateClockwise(); // 顺时针旋转
 */

/**
 * 7种标准方块形状定义
 * 
 * 每种方块使用二维数组表示，1表示填充的单元格，0表示空单元格。
 * 这些是方块的初始形状（旋转状态0）。
 * 
 * @constant {Object.<string, number[][]>}
 * @property {number[][]} I - I型方块（4x1直条）
 * @property {number[][]} O - O型方块（2x2正方形）
 * @property {number[][]} T - T型方块（T形）
 * @property {number[][]} S - S型方块（S形）
 * @property {number[][]} Z - Z型方块（Z形）
 * @property {number[][]} J - J型方块（J形）
 * @property {number[][]} L - L型方块（L形）
 */
const TETROMINO_SHAPES = {
    I: [[1, 1, 1, 1]],
    O: [[1, 1], [1, 1]],
    T: [[0, 1, 0], [1, 1, 1]],
    S: [[0, 1, 1], [1, 1, 0]],
    Z: [[1, 1, 0], [0, 1, 1]],
    J: [[1, 0, 0], [1, 1, 1]],
    L: [[0, 0, 1], [1, 1, 1]]
};

/**
 * 方块颜色映射
 * 
 * 每种方块类型对应一个独特的颜色，使用CSS颜色值表示。
 * 颜色选择遵循经典俄罗斯方块的配色方案。
 * 
 * @constant {Object.<string, string>}
 * @property {string} I - 青色 (#00f0f0)
 * @property {string} O - 黄色 (#f0f000)
 * @property {string} T - 紫色 (#a000f0)
 * @property {string} S - 绿色 (#00f000)
 * @property {string} Z - 红色 (#f00000)
 * @property {string} J - 蓝色 (#0000f0)
 * @property {string} L - 橙色 (#f0a000)
 */
const TETROMINO_COLORS = {
    I: '#00f0f0',  // 青色
    O: '#f0f000',  // 黄色
    T: '#a000f0',  // 紫色
    S: '#00f000',  // 绿色
    Z: '#f00000',  // 红色
    J: '#0000f0',  // 蓝色
    L: '#f0a000'   // 橙色
};

/**
 * 有效的方块类型列表
 * 
 * 包含所有7种标准俄罗斯方块类型的字符串标识符。
 * 用于验证方块类型和遍历所有方块类型。
 * 
 * @constant {string[]}
 */
const TETROMINO_TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

/**
 * 预计算的方块旋转状态缓存
 * 
 * 存储所有方块类型的所有旋转状态，避免运行时计算。
 * - O方块：只有1个旋转状态（旋转不变性，Requirement 3.5）
 * - 其他方块：有4个旋转状态（0°, 90°, 180°, 270°）
 * 
 * 旋转状态索引：
 * - 0: 初始状态
 * - 1: 顺时针旋转90°
 * - 2: 旋转180°
 * - 3: 顺时针旋转270°（或逆时针90°）
 * 
 * @constant {Object.<string, number[][][]>}
 */
const TETROMINO_ROTATIONS = {};

/**
 * 矩阵顺时针旋转90度
 * 
 * 将输入矩阵顺时针旋转90度。用于预计算方块的旋转状态。
 * 
 * 旋转算法：
 * - 原矩阵的第i行第j列元素
 * - 变为新矩阵的第j行第(rows-1-i)列元素
 * 
 * @param {number[][]} matrix - 输入矩阵（二维数组）
 * @returns {number[][]} 旋转后的新矩阵
 * 
 * @example
 * const original = [[1, 2], [3, 4]];
 * const rotated = rotateMatrixClockwise(original);
 * // rotated = [[3, 1], [4, 2]]
 */
function rotateMatrixClockwise(matrix) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const rotated = [];
    
    for (let col = 0; col < cols; col++) {
        const newRow = [];
        for (let row = rows - 1; row >= 0; row--) {
            newRow.push(matrix[row][col]);
        }
        rotated.push(newRow);
    }
    
    return rotated;
}

/**
 * 矩阵逆时针旋转90度
 * 
 * 将输入矩阵逆时针旋转90度。用于预计算方块的旋转状态。
 * 
 * 旋转算法：
 * - 原矩阵的第i行第j列元素
 * - 变为新矩阵的第(cols-1-j)行第i列元素
 * 
 * @param {number[][]} matrix - 输入矩阵（二维数组）
 * @returns {number[][]} 旋转后的新矩阵
 * 
 * @example
 * const original = [[1, 2], [3, 4]];
 * const rotated = rotateMatrixCounterClockwise(original);
 * // rotated = [[2, 4], [1, 3]]
 */
function rotateMatrixCounterClockwise(matrix) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const rotated = [];
    
    for (let col = cols - 1; col >= 0; col--) {
        const newRow = [];
        for (let row = 0; row < rows; row++) {
            newRow.push(matrix[row][col]);
        }
        rotated.push(newRow);
    }
    
    return rotated;
}

/**
 * 深拷贝矩阵
 * 
 * 创建输入矩阵的深拷贝，确保修改拷贝不会影响原矩阵。
 * 
 * @param {number[][]} matrix - 输入矩阵（二维数组）
 * @returns {number[][]} 矩阵的深拷贝
 * 
 * @example
 * const original = [[1, 2], [3, 4]];
 * const copy = cloneMatrix(original);
 * copy[0][0] = 9; // 不会影响original
 */
function cloneMatrix(matrix) {
    return matrix.map(row => [...row]);
}

/**
 * 预计算所有方块的旋转状态
 * 
 * 在模块初始化时调用，为每种方块类型预计算所有旋转状态。
 * 这样在游戏运行时可以直接查表获取旋转后的形状，无需实时计算。
 * 
 * @private
 * @description
 * - O方块具有旋转不变性，只存储1个状态（Requirement 3.5）
 * - 其他方块存储4个旋转状态（0°, 90°, 180°, 270°）
 */
function precomputeRotations() {
    for (const type of TETROMINO_TYPES) {
        const baseShape = TETROMINO_SHAPES[type];
        
        // O方块旋转不变性 - 只有一个旋转状态 (Requirement 3.5)
        if (type === 'O') {
            TETROMINO_ROTATIONS[type] = [cloneMatrix(baseShape)];
        } else {
            // 其他方块有4个旋转状态
            const rotations = [];
            let currentShape = cloneMatrix(baseShape);
            
            for (let i = 0; i < 4; i++) {
                rotations.push(cloneMatrix(currentShape));
                currentShape = rotateMatrixClockwise(currentShape);
            }
            
            TETROMINO_ROTATIONS[type] = rotations;
        }
    }
}

// 初始化时预计算所有旋转状态
precomputeRotations();

/**
 * Tetromino 类
 * 
 * 表示一个俄罗斯方块方块实例，包含类型、位置、颜色和旋转状态。
 * 
 * ## 功能
 * - 管理方块的位置（x, y坐标）
 * - 管理方块的旋转状态
 * - 提供顺时针和逆时针旋转方法
 * - 支持方块克隆和状态重置
 * 
 * ## 旋转状态
 * - rotationIndex 0: 初始状态
 * - rotationIndex 1: 顺时针旋转90°
 * - rotationIndex 2: 旋转180°
 * - rotationIndex 3: 顺时针旋转270°
 * 
 * @class
 * @example
 * // 创建一个T型方块在位置(3, 0)
 * const tetromino = new Tetromino('T', 3, 0);
 * 
 * // 获取当前形状
 * console.log(tetromino.shape);
 * 
 * // 旋转方块
 * tetromino.rotateClockwise();
 * 
 * // 克隆方块
 * const clone = tetromino.clone();
 */
class Tetromino {
    /**
     * 创建一个新的Tetromino实例
     * 
     * @constructor
     * @param {string} type - 方块类型，必须是 'I', 'O', 'T', 'S', 'Z', 'J', 'L' 之一
     * @param {number} [x=0] - 初始X坐标（棋盘列位置）
     * @param {number} [y=0] - 初始Y坐标（棋盘行位置）
     * @throws {Error} 如果提供的type不是有效的方块类型
     * 
     * @example
     * // 创建一个I型方块在默认位置
     * const iPiece = new Tetromino('I');
     * 
     * // 创建一个T型方块在指定位置
     * const tPiece = new Tetromino('T', 3, 0);
     */
    constructor(type, x = 0, y = 0) {
        if (!TETROMINO_TYPES.includes(type)) {
            throw new Error(`Invalid tetromino type: ${type}`);
        }
        
        this.type = type;
        this.x = x;
        this.y = y;
        this.color = TETROMINO_COLORS[type];
        this.rotationIndex = 0;
        this.rotations = TETROMINO_ROTATIONS[type];
    }
    
    /**
     * 获取当前形状矩阵
     * 
     * 返回当前旋转状态对应的形状矩阵。矩阵中1表示填充的单元格，0表示空单元格。
     * 
     * @type {number[][]}
     * @readonly
     * @example
     * const tetromino = new Tetromino('T');
     * console.log(tetromino.shape);
     * // 输出: [[0, 1, 0], [1, 1, 1]]
     */
    get shape() {
        return this.rotations[this.rotationIndex];
    }
    
    /**
     * 获取方块的宽度
     * 
     * 返回当前旋转状态下方块形状的列数。
     * 
     * @type {number}
     * @readonly
     * @example
     * const iPiece = new Tetromino('I');
     * console.log(iPiece.width); // 4 (初始状态为水平)
     * iPiece.rotateClockwise();
     * console.log(iPiece.width); // 1 (旋转后为垂直)
     */
    get width() {
        return this.shape[0].length;
    }
    
    /**
     * 获取方块的高度
     * 
     * 返回当前旋转状态下方块形状的行数。
     * 
     * @type {number}
     * @readonly
     * @example
     * const iPiece = new Tetromino('I');
     * console.log(iPiece.height); // 1 (初始状态为水平)
     * iPiece.rotateClockwise();
     * console.log(iPiece.height); // 4 (旋转后为垂直)
     */
    get height() {
        return this.shape.length;
    }
    
    /**
     * 顺时针旋转方块
     * 
     * 将方块顺时针旋转90度，更新rotationIndex。
     * O方块由于旋转不变性，调用此方法不会改变其形状。
     * 
     * @description 实现 Requirement 3.1 - 顺时针旋转支持
     * @returns {void}
     * 
     * @example
     * const tetromino = new Tetromino('T');
     * console.log(tetromino.rotationIndex); // 0
     * tetromino.rotateClockwise();
     * console.log(tetromino.rotationIndex); // 1
     */
    rotateClockwise() {
        const totalRotations = this.rotations.length;
        this.rotationIndex = (this.rotationIndex + 1) % totalRotations;
    }
    
    /**
     * 逆时针旋转方块
     * 
     * 将方块逆时针旋转90度，更新rotationIndex。
     * O方块由于旋转不变性，调用此方法不会改变其形状。
     * 
     * @description 实现 Requirement 3.2 - 逆时针旋转支持
     * @returns {void}
     * 
     * @example
     * const tetromino = new Tetromino('T');
     * console.log(tetromino.rotationIndex); // 0
     * tetromino.rotateCounterClockwise();
     * console.log(tetromino.rotationIndex); // 3
     */
    rotateCounterClockwise() {
        const totalRotations = this.rotations.length;
        this.rotationIndex = (this.rotationIndex - 1 + totalRotations) % totalRotations;
    }
    
    /**
     * 获取指定方向旋转后的形状（不改变当前状态）
     * 
     * 预览旋转后的形状，用于碰撞检测等场景。
     * 此方法不会修改方块的当前旋转状态。
     * 
     * @param {number} direction - 旋转方向：1为顺时针，-1为逆时针，其他值返回当前形状
     * @returns {number[][]} 旋转后的形状矩阵
     * 
     * @example
     * const tetromino = new Tetromino('T');
     * const cwShape = tetromino.getRotatedShape(1);  // 顺时针旋转后的形状
     * const ccwShape = tetromino.getRotatedShape(-1); // 逆时针旋转后的形状
     * // tetromino.rotationIndex 保持不变
     */
    getRotatedShape(direction) {
        const totalRotations = this.rotations.length;
        let newIndex;
        
        if (direction === 1) {
            // 顺时针
            newIndex = (this.rotationIndex + 1) % totalRotations;
        } else if (direction === -1) {
            // 逆时针
            newIndex = (this.rotationIndex - 1 + totalRotations) % totalRotations;
        } else {
            // 无效方向，返回当前形状
            newIndex = this.rotationIndex;
        }
        
        return this.rotations[newIndex];
    }
    
    /**
     * 获取指定旋转索引的形状
     * 
     * 获取任意旋转状态的形状，支持负数索引（会自动归一化）。
     * 此方法不会修改方块的当前旋转状态。
     * 
     * @param {number} rotationIndex - 旋转索引（0-3，支持负数和超出范围的值）
     * @returns {number[][]} 对应旋转状态的形状矩阵
     * 
     * @example
     * const tetromino = new Tetromino('T');
     * const shape0 = tetromino.getShapeAtRotation(0); // 初始状态
     * const shape1 = tetromino.getShapeAtRotation(1); // 顺时针90°
     * const shapeNeg = tetromino.getShapeAtRotation(-1); // 等同于索引3
     */
    getShapeAtRotation(rotationIndex) {
        const totalRotations = this.rotations.length;
        const normalizedIndex = ((rotationIndex % totalRotations) + totalRotations) % totalRotations;
        return this.rotations[normalizedIndex];
    }
    
    /**
     * 获取旋转状态总数
     * 
     * 返回该方块类型的旋转状态数量。
     * - O方块：1（旋转不变性）
     * - 其他方块：4
     * 
     * @returns {number} 旋转状态数量
     * 
     * @example
     * const oPiece = new Tetromino('O');
     * console.log(oPiece.getRotationCount()); // 1
     * 
     * const tPiece = new Tetromino('T');
     * console.log(tPiece.getRotationCount()); // 4
     */
    getRotationCount() {
        return this.rotations.length;
    }
    
    /**
     * 设置旋转索引
     * 
     * 直接设置方块的旋转状态。索引会自动归一化到有效范围内。
     * 
     * @param {number} index - 新的旋转索引（支持负数和超出范围的值）
     * @returns {void}
     * 
     * @example
     * const tetromino = new Tetromino('T');
     * tetromino.setRotationIndex(2); // 设置为180°旋转状态
     * tetromino.setRotationIndex(-1); // 等同于设置为索引3
     */
    setRotationIndex(index) {
        const totalRotations = this.rotations.length;
        this.rotationIndex = ((index % totalRotations) + totalRotations) % totalRotations;
    }
    
    /**
     * 克隆当前方块
     * 
     * 创建一个新的Tetromino实例，具有相同的类型、位置和旋转状态。
     * 用于模拟操作或AI决策时不影响原方块。
     * 
     * @returns {Tetromino} 新的Tetromino实例，与原方块状态相同
     * 
     * @example
     * const original = new Tetromino('T', 3, 5);
     * original.rotateClockwise();
     * const clone = original.clone();
     * // clone.type === 'T', clone.x === 3, clone.y === 5, clone.rotationIndex === 1
     */
    clone() {
        const cloned = new Tetromino(this.type, this.x, this.y);
        cloned.rotationIndex = this.rotationIndex;
        return cloned;
    }
    
    /**
     * 重置方块到初始状态
     * 
     * 将方块的旋转索引重置为0，位置重置为(0, 0)。
     * 
     * @returns {void}
     * 
     * @example
     * const tetromino = new Tetromino('T', 5, 10);
     * tetromino.rotateClockwise();
     * tetromino.reset();
     * // tetromino.x === 0, tetromino.y === 0, tetromino.rotationIndex === 0
     */
    reset() {
        this.rotationIndex = 0;
        this.x = 0;
        this.y = 0;
    }
}

// 导出模块
export {
    Tetromino,
    TETROMINO_SHAPES,
    TETROMINO_COLORS,
    TETROMINO_TYPES,
    TETROMINO_ROTATIONS,
    rotateMatrixClockwise,
    rotateMatrixCounterClockwise,
    cloneMatrix
};
