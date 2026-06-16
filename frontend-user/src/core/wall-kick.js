/**
 * Wall Kick System - SRS (Super Rotation System) 标准实现
 * 
 * 当方块旋转时发生碰撞，尝试通过位移来完成旋转。
 * Wall Kick 是俄罗斯方块中的一种机制，允许方块在旋转时"踢"离墙壁或其他方块，
 * 从而在原本会发生碰撞的情况下仍能完成旋转。
 * 
 * SRS (Super Rotation System) 是现代俄罗斯方块游戏的标准旋转系统，
 * 定义了每种旋转状态转换时应尝试的偏移量序列。
 * 
 * Requirements: 1.4 (逆时针旋转的 SRS Wall Kick 支持)
 * 
 * @module wall-kick
 */

/**
 * SRS Wall Kick 偏移量数据 - J, L, S, T, Z 方块
 * 
 * 数据格式: WALL_KICK_DATA[fromRotation->toRotation] = [[offsetX, offsetY], ...]
 * 
 * 旋转状态定义:
 *   0 = 初始状态 (spawn state)
 *   1 = 顺时针旋转90° (R state - Right)
 *   2 = 旋转180° (2 state)
 *   3 = 逆时针旋转90° (L state - Left)
 * 
 * 偏移量含义:
 *   offsetX: 正值向右移动，负值向左移动
 *   offsetY: 正值向上移动，负值向下移动
 * 
 * 每个状态转换有5个测试位置，按顺序尝试:
 *   Test 1: [0, 0]   - 原位旋转（无位移）
 *   Test 2-5: 各种位移尝试，根据旋转方向和状态不同而不同
 * 
 * SRS 标准参考: https://tetris.wiki/Super_Rotation_System
 * 
 * @constant {Object.<string, number[][]>}
 */
const WALL_KICK_DATA_JLSTZ = {
    // ==================== 顺时针旋转 (Clockwise) ====================
    
    /**
     * 0 → 1 (顺时针): 从初始状态旋转到右旋状态
     * Test 1: 原位旋转
     * Test 2: 向左移动1格（避开右侧障碍）
     * Test 3: 向左上移动（左1，上1）
     * Test 4: 向下移动2格（T-Spin 等特殊情况）
     * Test 5: 向左下移动（左1，下2）
     */
    '0->1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    
    /**
     * 1 → 2 (顺时针): 从右旋状态旋转到180°状态
     * Test 1: 原位旋转
     * Test 2: 向右移动1格
     * Test 3: 向右下移动（右1，下1）
     * Test 4: 向上移动2格
     * Test 5: 向右上移动（右1，上2）
     */
    '1->2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    
    /**
     * 2 → 3 (顺时针): 从180°状态旋转到左旋状态
     * Test 1: 原位旋转
     * Test 2: 向右移动1格
     * Test 3: 向右上移动（右1，上1）
     * Test 4: 向下移动2格
     * Test 5: 向右下移动（右1，下2）
     */
    '2->3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    
    /**
     * 3 → 0 (顺时针): 从左旋状态旋转回初始状态
     * Test 1: 原位旋转
     * Test 2: 向左移动1格
     * Test 3: 向左下移动（左1，下1）
     * Test 4: 向上移动2格
     * Test 5: 向左上移动（左1，上2）
     */
    '3->0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    
    // ==================== 逆时针旋转 (Counter-Clockwise) ====================
    
    /**
     * 1 → 0 (逆时针): 从右旋状态逆时针旋转回初始状态
     * 这是 0→1 的逆操作，偏移量是 0→1 的镜像
     * Test 1: [0, 0]   - 原位旋转
     * Test 2: [1, 0]   - 向右移动1格（与0→1的[-1,0]相反）
     * Test 3: [1, -1]  - 向右下移动（右1，下1）
     * Test 4: [0, 2]   - 向上移动2格（与0→1的[0,-2]相反）
     * Test 5: [1, 2]   - 向右上移动（右1，上2）
     * 
     * Requirements: 1.4 - SRS 标准逆时针旋转偏移量
     */
    '1->0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    
    /**
     * 2 → 1 (逆时针): 从180°状态逆时针旋转到右旋状态
     * 这是 1→2 的逆操作，偏移量是 1→2 的镜像
     * Test 1: [0, 0]   - 原位旋转
     * Test 2: [-1, 0]  - 向左移动1格（与1→2的[1,0]相反）
     * Test 3: [-1, 1]  - 向左上移动（左1，上1）
     * Test 4: [0, -2]  - 向下移动2格（与1→2的[0,2]相反）
     * Test 5: [-1, -2] - 向左下移动（左1，下2）
     * 
     * Requirements: 1.4 - SRS 标准逆时针旋转偏移量
     */
    '2->1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    
    /**
     * 3 → 2 (逆时针): 从左旋状态逆时针旋转到180°状态
     * 这是 2→3 的逆操作，偏移量是 2→3 的镜像
     * Test 1: [0, 0]   - 原位旋转
     * Test 2: [-1, 0]  - 向左移动1格（与2→3的[1,0]相反）
     * Test 3: [-1, -1] - 向左下移动（左1，下1）
     * Test 4: [0, 2]   - 向上移动2格（与2→3的[0,-2]相反）
     * Test 5: [-1, 2]  - 向左上移动（左1，上2）
     * 
     * Requirements: 1.4 - SRS 标准逆时针旋转偏移量
     */
    '3->2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    
    /**
     * 0 → 3 (逆时针): 从初始状态逆时针旋转到左旋状态
     * 这是 3→0 的逆操作，偏移量是 3→0 的镜像
     * Test 1: [0, 0]   - 原位旋转
     * Test 2: [1, 0]   - 向右移动1格（与3→0的[-1,0]相反）
     * Test 3: [1, 1]   - 向右上移动（右1，上1）
     * Test 4: [0, -2]  - 向下移动2格（与3→0的[0,2]相反）
     * Test 5: [1, -2]  - 向右下移动（右1，下2）
     * 
     * Requirements: 1.4 - SRS 标准逆时针旋转偏移量
     */
    '0->3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]]
};

/**
 * SRS Wall Kick 偏移量数据 - I 方块专用
 * 
 * I 方块由于其独特的4格长条形状，需要特殊的 Wall Kick 数据。
 * I 方块的旋转中心与其他方块不同，因此偏移量也完全不同。
 * 
 * I 方块的偏移量通常更大（最多2格），以适应其较长的形状。
 * 
 * 旋转状态定义（与 JLSTZ 相同）:
 *   0 = 初始状态 (水平，spawn state)
 *   1 = 顺时针旋转90° (垂直，R state)
 *   2 = 旋转180° (水平，2 state)
 *   3 = 逆时针旋转90° (垂直，L state)
 * 
 * SRS 标准参考: https://tetris.wiki/Super_Rotation_System
 * 
 * @constant {Object.<string, number[][]>}
 */
const WALL_KICK_DATA_I = {
    // ==================== 顺时针旋转 (Clockwise) ====================
    
    /**
     * 0 → 1 (顺时针): 从水平初始状态旋转到垂直右旋状态
     * Test 1: [0, 0]   - 原位旋转
     * Test 2: [-2, 0]  - 向左移动2格（I方块较长，需要更大位移）
     * Test 3: [1, 0]   - 向右移动1格
     * Test 4: [-2, -1] - 向左下移动（左2，下1）
     * Test 5: [1, 2]   - 向右上移动（右1，上2）
     */
    '0->1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    
    /**
     * 1 → 2 (顺时针): 从垂直右旋状态旋转到水平180°状态
     * Test 1: [0, 0]   - 原位旋转
     * Test 2: [-1, 0]  - 向左移动1格
     * Test 3: [2, 0]   - 向右移动2格
     * Test 4: [-1, 2]  - 向左上移动（左1，上2）
     * Test 5: [2, -1]  - 向右下移动（右2，下1）
     */
    '1->2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
    
    /**
     * 2 → 3 (顺时针): 从水平180°状态旋转到垂直左旋状态
     * Test 1: [0, 0]   - 原位旋转
     * Test 2: [2, 0]   - 向右移动2格
     * Test 3: [-1, 0]  - 向左移动1格
     * Test 4: [2, 1]   - 向右上移动（右2，上1）
     * Test 5: [-1, -2] - 向左下移动（左1，下2）
     */
    '2->3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    
    /**
     * 3 → 0 (顺时针): 从垂直左旋状态旋转回水平初始状态
     * Test 1: [0, 0]   - 原位旋转
     * Test 2: [1, 0]   - 向右移动1格
     * Test 3: [-2, 0]  - 向左移动2格
     * Test 4: [1, -2]  - 向右下移动（右1，下2）
     * Test 5: [-2, 1]  - 向左上移动（左2，上1）
     */
    '3->0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    
    // ==================== 逆时针旋转 (Counter-Clockwise) ====================
    
    /**
     * 1 → 0 (逆时针): 从垂直右旋状态逆时针旋转回水平初始状态
     * 这是 0→1 的逆操作
     * Test 1: [0, 0]   - 原位旋转
     * Test 2: [2, 0]   - 向右移动2格（与0→1的[-2,0]相反）
     * Test 3: [-1, 0]  - 向左移动1格（与0→1的[1,0]相反）
     * Test 4: [2, 1]   - 向右上移动（右2，上1）
     * Test 5: [-1, -2] - 向左下移动（左1，下2）
     * 
     * Requirements: 1.4 - SRS 标准逆时针旋转偏移量
     */
    '1->0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    
    /**
     * 2 → 1 (逆时针): 从水平180°状态逆时针旋转到垂直右旋状态
     * 这是 1→2 的逆操作
     * Test 1: [0, 0]   - 原位旋转
     * Test 2: [1, 0]   - 向右移动1格（与1→2的[-1,0]相反）
     * Test 3: [-2, 0]  - 向左移动2格（与1→2的[2,0]相反）
     * Test 4: [1, -2]  - 向右下移动（右1，下2）
     * Test 5: [-2, 1]  - 向左上移动（左2，上1）
     * 
     * Requirements: 1.4 - SRS 标准逆时针旋转偏移量
     */
    '2->1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    
    /**
     * 3 → 2 (逆时针): 从垂直左旋状态逆时针旋转到水平180°状态
     * 这是 2→3 的逆操作
     * Test 1: [0, 0]   - 原位旋转
     * Test 2: [-2, 0]  - 向左移动2格（与2→3的[2,0]相反）
     * Test 3: [1, 0]   - 向右移动1格（与2→3的[-1,0]相反）
     * Test 4: [-2, -1] - 向左下移动（左2，下1）
     * Test 5: [1, 2]   - 向右上移动（右1，上2）
     * 
     * Requirements: 1.4 - SRS 标准逆时针旋转偏移量
     */
    '3->2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    
    /**
     * 0 → 3 (逆时针): 从水平初始状态逆时针旋转到垂直左旋状态
     * 这是 3→0 的逆操作
     * Test 1: [0, 0]   - 原位旋转
     * Test 2: [-1, 0]  - 向左移动1格（与3→0的[1,0]相反）
     * Test 3: [2, 0]   - 向右移动2格（与3→0的[-2,0]相反）
     * Test 4: [-1, 2]  - 向左上移动（左1，上2）
     * Test 5: [2, -1]  - 向右下移动（右2，下1）
     * 
     * Requirements: 1.4 - SRS 标准逆时针旋转偏移量
     */
    '0->3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]]
};

/**
 * 获取指定旋转状态转换的 Wall Kick 偏移量数据
 * 
 * 根据方块类型和旋转状态转换，返回应尝试的偏移量序列。
 * 系统会按顺序尝试每个偏移量，直到找到一个有效位置或全部失败。
 * 
 * @param {string} tetrominoType - 方块类型 ('I', 'J', 'L', 'O', 'S', 'T', 'Z')
 * @param {number} fromRotation - 起始旋转状态 (0-3)
 * @param {number} toRotation - 目标旋转状态 (0-3)
 * @returns {number[][]} Wall Kick 偏移量数组，每个元素为 [offsetX, offsetY]
 * 
 * @example
 * // 获取 T 方块从状态 0 逆时针旋转到状态 3 的偏移量
 * const offsets = getWallKickData('T', 0, 3);
 * // 返回: [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]]
 * 
 * @example
 * // O 方块旋转不变，只返回原位偏移
 * const offsets = getWallKickData('O', 0, 1);
 * // 返回: [[0, 0]]
 */
function getWallKickData(tetrominoType, fromRotation, toRotation) {
    // O方块不需要Wall Kick（旋转不变，形状始终相同）
    if (tetrominoType === 'O') {
        return [[0, 0]];
    }
    
    // 构建状态转换键，格式: "fromRotation->toRotation"
    const key = `${fromRotation}->${toRotation}`;
    
    // I方块使用专用的 Wall Kick 数据
    if (tetrominoType === 'I') {
        return WALL_KICK_DATA_I[key] || [[0, 0]];
    }
    
    // J, L, S, T, Z 方块使用通用的 Wall Kick 数据
    return WALL_KICK_DATA_JLSTZ[key] || [[0, 0]];
}


/**
 * WallKickSystem 类
 * 
 * 处理方块旋转时的 Wall Kick 逻辑。当方块旋转导致碰撞时，
 * 系统会尝试一系列预定义的偏移量，以找到一个有效的位置完成旋转。
 * 
 * 支持的旋转方向:
 * - 顺时针 (Clockwise): 状态转换 0→1→2→3→0
 * - 逆时针 (Counter-Clockwise): 状态转换 0→3→2→1→0
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */
class WallKickSystem {
    /**
     * 创建 WallKickSystem 实例
     * @param {BoardManager} boardManager - 棋盘管理器，用于检测碰撞
     */
    constructor(boardManager) {
        this.board = boardManager;
    }
    
    /**
     * 尝试旋转方块，如果直接旋转失败则尝试 Wall Kick
     * 
     * 旋转过程:
     * 1. 计算目标旋转状态
     * 2. 获取旋转后的形状
     * 3. 获取对应的 Wall Kick 偏移量序列
     * 4. 按顺序尝试每个偏移量，直到找到有效位置
     * 
     * @param {Tetromino} tetromino - 要旋转的方块
     * @param {number} direction - 旋转方向：1 为顺时针，-1 为逆时针
     * @returns {Object|null} 成功时返回 {offsetX, offsetY, toRotation}，失败时返回 null
     * 
     * Requirements: 1.2, 1.3, 1.4
     */
    tryRotate(tetromino, direction) {
        const fromRotation = tetromino.rotationIndex;
        const totalRotations = tetromino.getRotationCount();
        
        // 计算目标旋转状态
        // 顺时针: (current + 1) % 4
        // 逆时针: (current - 1 + 4) % 4 = (current + 3) % 4
        let toRotation;
        if (direction === 1) {
            // 顺时针旋转: 0→1, 1→2, 2→3, 3→0
            toRotation = (fromRotation + 1) % totalRotations;
        } else {
            // 逆时针旋转: 0→3, 1→0, 2→1, 3→2
            toRotation = (fromRotation - 1 + totalRotations) % totalRotations;
        }
        
        // 获取旋转后的形状
        const rotatedShape = tetromino.getShapeAtRotation(toRotation);
        
        // 获取 Wall Kick 偏移量序列
        const kickData = getWallKickData(tetromino.type, fromRotation, toRotation);
        
        // 按顺序尝试每个 Wall Kick 偏移量
        for (const [offsetX, offsetY] of kickData) {
            const newX = tetromino.x + offsetX;
            const newY = tetromino.y + offsetY;
            
            // 检查新位置是否有效（无碰撞）
            if (this.board.isValidShapePosition(rotatedShape, newX, newY)) {
                return { offsetX, offsetY, toRotation };
            }
        }
        
        // 所有 Wall Kick 尝试都失败，返回 null
        // Requirements: 1.3 - 旋转失败时保持原状态
        return null;
    }
    
    /**
     * 执行旋转（包含 Wall Kick）
     * 
     * 如果旋转成功，会更新方块的位置和旋转状态。
     * 如果旋转失败，方块保持原状态不变。
     * 
     * @param {Tetromino} tetromino - 要旋转的方块
     * @param {number} direction - 旋转方向：1 为顺时针，-1 为逆时针
     * @returns {boolean} 是否成功旋转
     */
    rotate(tetromino, direction) {
        const result = this.tryRotate(tetromino, direction);
        
        if (result) {
            // 应用旋转和位移
            tetromino.x += result.offsetX;
            tetromino.y += result.offsetY;
            tetromino.setRotationIndex(result.toRotation);
            return true;
        }
        
        return false;
    }
    
    /**
     * 顺时针旋转方块
     * 
     * 状态转换: 0→1→2→3→0
     * 
     * @param {Tetromino} tetromino - 要旋转的方块
     * @returns {boolean} 是否成功旋转
     * 
     * @example
     * const success = wallKickSystem.rotateClockwise(tetromino);
     * if (success) {
     *     console.log('顺时针旋转成功');
     * }
     */
    rotateClockwise(tetromino) {
        return this.rotate(tetromino, 1);
    }
    
    /**
     * 逆时针旋转方块
     * 
     * 状态转换: 0→3→2→1→0
     * 
     * 逆时针旋转使用 SRS 标准的逆时针 Wall Kick 偏移量:
     * - 1→0: 从右旋状态回到初始状态
     * - 2→1: 从180°状态到右旋状态
     * - 3→2: 从左旋状态到180°状态
     * - 0→3: 从初始状态到左旋状态
     * 
     * @param {Tetromino} tetromino - 要旋转的方块
     * @returns {boolean} 是否成功旋转
     * 
     * Requirements: 1.1, 1.2, 1.4
     * 
     * @example
     * // 按 Z 键触发逆时针旋转
     * const success = wallKickSystem.rotateCounterClockwise(tetromino);
     * if (success) {
     *     console.log('逆时针旋转成功');
     * }
     */
    rotateCounterClockwise(tetromino) {
        return this.rotate(tetromino, -1);
    }
}

// 导出模块
export {
    WallKickSystem,
    getWallKickData,
    WALL_KICK_DATA_JLSTZ,
    WALL_KICK_DATA_I
};
