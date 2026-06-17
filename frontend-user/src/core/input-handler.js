/**
 * @fileoverview InputHandler - 键盘输入处理器模块
 * 
 * 本模块提供键盘输入处理功能，负责将用户的按键操作映射到游戏动作。
 * 主要功能包括：
 * - 键盘事件监听和处理
 * - 按键到游戏动作的映射
 * - 输入节流（防止过快输入）
 * - 按键状态跟踪
 * - 自定义按键绑定
 * 
 * @module core/input-handler
 * 
 * @example
 * // 基本使用示例
 * import { InputHandler } from './core/input-handler.js';
 * 
 * const inputHandler = new InputHandler(gameEngine, {
 *     keyBindings: {
 *         left: 'KeyA',
 *         right: 'KeyD',
 *         down: 'KeyS',
 *         drop: 'Space',
 *         rotateCW: 'KeyW',
 *         rotateCCW: 'KeyQ'
 *     },
 *     throttleInterval: 50
 * });
 * 
 * // 绑定键盘事件
 * inputHandler.bind();
 * 
 * // 游戏结束时解绑
 * inputHandler.unbind();
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 4.1, 4.2, 7.1
 */

/**
 * 默认按键绑定配置
 * 定义每个游戏动作对应的默认按键
 * 
 * @constant {KeyBindings}
 * @property {string} left - 左移按键，默认为左箭头
 * @property {string} right - 右移按键，默认为右箭头
 * @property {string} down - 软降按键，默认为下箭头
 * @property {string} drop - 硬降按键，默认为空格键
 * @property {string} rotateCW - 顺时针旋转按键，默认为上箭头
 * @property {string} rotateCCW - 逆时针旋转按键，默认为Z键
 * @property {string} hold - 暂存方块按键，默认为C键
 */
const DEFAULT_KEY_BINDINGS = {
    left: 'ArrowLeft',      // 左移
    right: 'ArrowRight',    // 右移
    down: 'ArrowDown',      // 软降
    drop: 'Space',          // 硬降
    rotateCW: 'ArrowUp',    // 顺时针旋转
    rotateCCW: 'KeyZ',      // 逆时针旋转
    hold: 'KeyC'            // 暂存方块（Hold）
};

/**
 * 默认节流间隔（毫秒）
 * 控制同一动作的最小执行间隔，防止过快输入
 * 
 * @constant {number}
 */
const DEFAULT_THROTTLE_INTERVAL = 50;

/**
 * 软降的节流间隔（毫秒）
 * 软降使用更短的间隔，允许更快的下落速度
 * 
 * @constant {number}
 */
const SOFT_DROP_THROTTLE_INTERVAL = 30;

/**
 * @typedef {Object} KeyBindings
 * @property {string} left - 左移动作的按键代码
 * @property {string} right - 右移动作的按键代码
 * @property {string} down - 软降动作的按键代码
 * @property {string} drop - 硬降动作的按键代码
 * @property {string} rotateCW - 顺时针旋转动作的按键代码
 * @property {string} rotateCCW - 逆时针旋转动作的按键代码
 * @property {string} hold - 暂存方块动作的按键代码
 */

/**
 * @typedef {Object} InputHandlerOptions
 * @property {KeyBindings} [keyBindings] - 自定义按键绑定
 * @property {number} [throttleInterval] - 节流间隔（毫秒）
 */

/**
 * InputHandler 类 - 键盘输入处理器
 * 
 * 负责监听键盘事件并将按键操作转换为游戏动作。
 * 支持自定义按键绑定和输入节流。
 * 
 * @class
 * @description
 * InputHandler是游戏输入系统的核心组件，主要职责包括：
 * 1. 监听document级别的键盘事件
 * 2. 将按键代码映射到游戏动作
 * 3. 调用游戏引擎的相应方法执行动作
 * 4. 实现输入节流，防止过快输入
 * 5. 跟踪按键状态，支持持续按键处理
 * 
 * 支持的游戏动作：
 * - left: 方块左移
 * - right: 方块右移
 * - down: 软降（加速下落）
 * - drop: 硬降（立即落到底部）
 * - rotateCW: 顺时针旋转
 * - rotateCCW: 逆时针旋转
 * - hold: 暂存方块（每轮下落只能暂存一次）
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2
 * 
 * @example
 * // 创建输入处理器
 * const inputHandler = new InputHandler(gameEngine);
 * 
 * // 绑定键盘事件
 * inputHandler.bind();
 * 
 * // 自定义按键绑定
 * inputHandler.setKeyBinding('left', 'KeyA');
 * inputHandler.setKeyBinding('right', 'KeyD');
 * 
 * @example
 * // 在游戏循环中处理持续按键
 * function gameLoop() {
 *     inputHandler.processHeldKeys();
 *     // ... 其他游戏逻辑
 *     requestAnimationFrame(gameLoop);
 * }
 */
class InputHandler {
    /**
     * 创建输入处理器实例
     * 
     * @constructor
     * @param {Object} gameEngine - 游戏引擎实例，必须提供
     * @param {InputHandlerOptions} [options={}] - 配置选项
     * @param {KeyBindings} [options.keyBindings] - 自定义按键绑定，会与默认绑定合并
     * @param {number} [options.throttleInterval=50] - 节流间隔（毫秒）
     * 
     * @throws {Error} 如果gameEngine参数未提供
     * 
     * @example
     * // 使用默认配置
     * const inputHandler = new InputHandler(gameEngine);
     * 
     * @example
     * // 使用自定义配置
     * const inputHandler = new InputHandler(gameEngine, {
     *     keyBindings: {
     *         left: 'KeyA',
     *         right: 'KeyD'
     *     },
     *     throttleInterval: 100
     * });
     */
    constructor(gameEngine, options = {}) {
        if (!gameEngine) {
            throw new Error('GameEngine is required');
        }
        
        this.gameEngine = gameEngine;
        this.keyBindings = { ...DEFAULT_KEY_BINDINGS, ...options.keyBindings };
        this.throttleInterval = options.throttleInterval || DEFAULT_THROTTLE_INTERVAL;
        
        // 按键状态跟踪
        this.pressedKeys = new Set();
        
        // 节流时间戳记录
        this.lastActionTime = {};
        
        // 绑定事件处理器（保持this引用）
        this._boundHandleKeyDown = this.handleKeyDown.bind(this);
        this._boundHandleKeyUp = this.handleKeyUp.bind(this);
        
        // 绑定状态
        this._isBound = false;
    }
    
    /**
     * 获取按键对应的动作名称
     * 
     * 根据按键代码查找对应的游戏动作。
     * 
     * @private
     * @param {string} code - 按键代码（如'ArrowLeft', 'Space'等）
     * @returns {string|null} 动作名称（如'left', 'drop'等），未找到则返回null
     */
    _getActionForKey(code) {
        for (const [action, keyCode] of Object.entries(this.keyBindings)) {
            if (keyCode === code) {
                return action;
            }
        }
        return null;
    }
    
    /**
     * 检查动作是否被节流
     * 
     * 判断指定动作距上次执行是否已超过节流间隔。
     * 
     * @private
     * @param {string} action - 动作名称
     * @returns {boolean} 如果动作被节流（间隔未到）则返回true
     * 
     * @description
     * 软降动作使用更短的节流间隔（SOFT_DROP_THROTTLE_INTERVAL），
     * 其他动作使用默认节流间隔（throttleInterval）。
     */
    _isThrottled(action) {
        const now = Date.now();
        const lastTime = this.lastActionTime[action] || 0;
        
        // 软降使用更短的节流间隔
        const interval = action === 'down' 
            ? SOFT_DROP_THROTTLE_INTERVAL 
            : this.throttleInterval;
        
        return (now - lastTime) < interval;
    }
    
    /**
     * 记录动作执行时间
     * 
     * 更新指定动作的最后执行时间戳，用于节流计算。
     * 
     * @private
     * @param {string} action - 动作名称
     */
    _recordActionTime(action) {
        this.lastActionTime[action] = Date.now();
    }
    
    /**
     * 执行游戏动作
     * 
     * 根据动作名称调用游戏引擎的相应方法。
     * 
     * @private
     * @param {string} action - 动作名称
     * @returns {boolean} 如果动作成功执行则返回true
     * 
     * @description
     * 执行前会检查：
     * 1. 游戏是否正在进行（isPlaying）
     * 2. 动作是否被节流
     * 
     * 支持的动作及对应的游戏引擎方法：
     * - left: gameEngine.moveLeft() - Requirement 2.1
     * - right: gameEngine.moveRight() - Requirement 2.2
     * - down: gameEngine.moveDown() - Requirement 2.3
     * - drop: gameEngine.hardDrop() - Requirement 2.4
     * - rotateCW: gameEngine.rotateClockwise() - Requirement 3.1
     * - rotateCCW: gameEngine.rotateCounterClockwise() - Requirement 3.2
     * - hold: gameEngine.hold() - 暂存方块
     */
    _executeAction(action) {
        // 检查游戏是否正在进行
        if (!this.gameEngine.isPlaying()) {
            return false;
        }
        
        // 检查节流
        if (this._isThrottled(action)) {
            return false;
        }
        
        let result = false;
        
        switch (action) {
            case 'left':
                // Requirement 2.1: 左箭头键左移方块
                result = this.gameEngine.moveLeft();
                break;
            case 'right':
                // Requirement 2.2: 右箭头键右移方块
                result = this.gameEngine.moveRight();
                break;
            case 'down':
                // Requirement 2.3: 下箭头键软降
                result = this.gameEngine.moveDown();
                break;
            case 'drop':
                // Requirement 2.4: 空格键硬降
                this.gameEngine.hardDrop();
                result = true;
                break;
            case 'rotateCW':
                // Requirement 3.1: 上箭头键顺时针旋转
                result = this.gameEngine.rotateClockwise();
                break;
            case 'rotateCCW':
                // Requirement 3.2: Z键逆时针旋转
                result = this.gameEngine.rotateCounterClockwise();
                break;
            case 'hold':
                // 暂存当前方块（每轮下落只能暂存一次）
                result = this.gameEngine.hold();
                break;
            default:
                return false;
        }
        
        // 记录执行时间（用于节流）
        if (result) {
            this._recordActionTime(action);
        }
        
        return result;
    }
    
    /**
     * 处理按键按下事件
     * 
     * 当按键按下时，执行对应的游戏动作。
     * 
     * @param {KeyboardEvent} event - 键盘事件对象
     * 
     * @description
     * 此方法执行以下操作：
     * 1. 检查按键是否绑定到游戏动作
     * 2. 阻止默认浏览器行为（如页面滚动）
     * 3. 记录按键状态
     * 4. 执行对应的游戏动作
     * 
     * Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2
     * 
     * @example
     * // 通常不需要手动调用，由bind()方法自动绑定
     * // 但可以用于测试
     * const event = new KeyboardEvent('keydown', { code: 'ArrowLeft' });
     * inputHandler.handleKeyDown(event);
     */
    handleKeyDown(event) {
        const code = event.code;
        const action = this._getActionForKey(code);
        
        // 忽略未绑定的按键
        if (!action) {
            return;
        }
        
        // 阻止默认行为（如页面滚动）
        event.preventDefault();
        
        // 记录按键状态
        this.pressedKeys.add(code);
        
        // 执行动作
        this._executeAction(action);
    }
    
    /**
     * 处理按键释放事件
     * 
     * 当按键释放时，更新按键状态并清除节流记录。
     * 
     * @param {KeyboardEvent} event - 键盘事件对象
     * 
     * @description
     * 此方法执行以下操作：
     * 1. 从pressedKeys集合中移除按键
     * 2. 清除该按键对应动作的节流时间记录
     */
    handleKeyUp(event) {
        const code = event.code;
        
        // 移除按键状态
        this.pressedKeys.delete(code);
        
        // 清除该按键对应动作的节流时间
        const action = this._getActionForKey(code);
        if (action) {
            delete this.lastActionTime[action];
        }
    }
    
    /**
     * 绑定键盘事件监听器
     * 
     * 在document上添加keydown和keyup事件监听器。
     * 
     * @description
     * 此方法会检查：
     * 1. 是否已经绑定（避免重复绑定）
     * 2. 是否在浏览器环境中（支持jsdom测试环境）
     * 
     * 重复调用此方法不会产生副作用。
     * 
     * @example
     * // 游戏开始时绑定
     * inputHandler.bind();
     */
    bind() {
        if (this._isBound) {
            return;
        }
        
        // 检查是否在浏览器环境（包括jsdom测试环境）
        if (typeof document !== 'undefined' && document.addEventListener) {
            document.addEventListener('keydown', this._boundHandleKeyDown);
            document.addEventListener('keyup', this._boundHandleKeyUp);
            this._isBound = true;
        }
    }
    
    /**
     * 解绑键盘事件监听器
     * 
     * 移除document上的键盘事件监听器，并清除所有状态。
     * 
     * @description
     * 此方法执行以下操作：
     * 1. 清除按键状态（pressedKeys）
     * 2. 清除节流时间记录
     * 3. 移除keydown和keyup事件监听器
     * 4. 更新绑定状态为false
     * 
     * 即使未绑定，调用此方法也是安全的（会清除状态）。
     * 
     * @example
     * // 游戏结束或暂停时解绑
     * inputHandler.unbind();
     */
    unbind() {
        // 清除状态（无论是否绑定）
        this.pressedKeys.clear();
        this.lastActionTime = {};
        
        if (!this._isBound) {
            return;
        }
        
        if (typeof document !== 'undefined' && document.removeEventListener) {
            document.removeEventListener('keydown', this._boundHandleKeyDown);
            document.removeEventListener('keyup', this._boundHandleKeyUp);
        }
        
        // Always reset the bound state
        this._isBound = false;
    }
    
    /**
     * 检查是否已绑定键盘事件
     * 
     * @returns {boolean} 如果已绑定事件监听器则返回true
     * 
     * @example
     * if (!inputHandler.isBound()) {
     *     inputHandler.bind();
     * }
     */
    isBound() {
        return this._isBound;
    }
    
    /**
     * 检查某个按键是否被按下
     * 
     * @param {string} code - 按键代码
     * @returns {boolean} 如果按键当前被按下则返回true
     * 
     * @example
     * if (inputHandler.isKeyPressed('ArrowLeft')) {
     *     console.log('左箭头键被按下');
     * }
     */
    isKeyPressed(code) {
        return this.pressedKeys.has(code);
    }
    
    /**
     * 获取当前按键绑定
     * 
     * 返回当前所有按键绑定的副本。
     * 
     * @returns {KeyBindings} 当前按键绑定的副本
     * 
     * @example
     * const bindings = inputHandler.getKeyBindings();
     * console.log('左移按键:', bindings.left);
     * console.log('右移按键:', bindings.right);
     */
    getKeyBindings() {
        return { ...this.keyBindings };
    }
    
    /**
     * 设置单个按键绑定
     * 
     * 更新指定动作的按键绑定。
     * 
     * @param {string} action - 动作名称（'left', 'right', 'down', 'drop', 'rotateCW', 'rotateCCW'）
     * @param {string} keyCode - 按键代码（如'KeyA', 'ArrowLeft', 'Space'等）
     * 
     * @description
     * 只有有效的动作名称才会被更新。
     * 无效的动作名称会被忽略。
     * 
     * @example
     * // 将左移绑定到A键
     * inputHandler.setKeyBinding('left', 'KeyA');
     * 
     * // 将硬降绑定到Enter键
     * inputHandler.setKeyBinding('drop', 'Enter');
     */
    setKeyBinding(action, keyCode) {
        if (this.keyBindings.hasOwnProperty(action)) {
            this.keyBindings[action] = keyCode;
        }
    }
    
    /**
     * 重置为默认按键绑定
     * 
     * 将所有按键绑定恢复为默认值。
     * 
     * @example
     * // 恢复默认按键
     * inputHandler.resetKeyBindings();
     */
    resetKeyBindings() {
        this.keyBindings = { ...DEFAULT_KEY_BINDINGS };
    }
    
    /**
     * 处理持续按键
     * 
     * 遍历所有当前被按下的按键，并执行对应的动作。
     * 此方法应在游戏循环中调用，以支持按住按键时持续执行动作。
     * 
     * @description
     * 此方法允许玩家按住方向键持续移动方块，
     * 而不需要反复按键。节流机制仍然生效，
     * 防止动作执行过快。
     * 
     * @example
     * // 在游戏循环中调用
     * function gameLoop(deltaTime) {
     *     inputHandler.processHeldKeys();
     *     gameEngine.update(deltaTime);
     *     renderer.render(gameEngine.getState());
     *     requestAnimationFrame(gameLoop);
     * }
     */
    processHeldKeys() {
        for (const code of this.pressedKeys) {
            const action = this._getActionForKey(code);
            if (action) {
                this._executeAction(action);
            }
        }
    }
}

// 导出模块
export {
    InputHandler,
    DEFAULT_KEY_BINDINGS,
    DEFAULT_THROTTLE_INTERVAL,
    SOFT_DROP_THROTTLE_INTERVAL
};
