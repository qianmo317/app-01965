/**
 * @fileoverview ControlPanel - UI控制面板模块
 * 
 * 本模块提供游戏UI控制面板的管理功能，负责处理用户与游戏的交互。
 * 主要功能包括：
 * - 游戏控制按钮（开始、暂停、重新开始）
 * - AI模式开关和统计显示
 * - 游戏速度调节
 * - 分数和等级显示
 * - 游戏状态覆盖层（暂停、游戏结束）
 * - 按键绑定显示
 * - 音效开关（预留功能）
 * 
 * @module ui/control-panel
 * 
 * @example
 * // 基本使用示例
 * import { ControlPanel } from './ui/control-panel.js';
 * 
 * const controlPanel = new ControlPanel({
 *     gameEngine: gameEngine,
 *     aiController: aiController,
 *     rlAgent: rlAgent,
 *     onStart: () => console.log('游戏开始'),
 *     onPause: () => console.log('游戏暂停'),
 *     onRestart: () => console.log('游戏重新开始')
 * });
 * 
 * controlPanel.init();
 * 
 * Requirements: 8.4, 8.5, 8.6, 8.7, 9.3, 10.4, 3.3, 3.4, 4.1, 4.2, 7.1
 */

/**
 * 默认配置对象
 * 定义控制面板中各UI元素的DOM ID
 * 
 * @constant {ControlPanelConfig}
 * @property {string} startButtonId - 开始按钮ID
 * @property {string} pauseButtonId - 暂停按钮ID
 * @property {string} restartButtonId - 重新开始按钮ID
 * @property {string} restartOverlayButtonId - 覆盖层重新开始按钮ID
 * @property {string} aiToggleId - AI开关ID
 * @property {string} soundToggleId - 音效开关ID
 * @property {string} speedSliderId - 速度滑块ID
 * @property {string} speedValueId - 速度值显示ID
 * @property {string} gamesPlayedId - 游戏次数显示ID
 * @property {string} bestScoreId - 最高分显示ID
 * @property {string} avgScoreId - 平均分显示ID
 * @property {string} totalLinesId - 总消行数显示ID
 * @property {string} epsilonValueId - Epsilon值显示ID
 * @property {string} currentScoreId - 当前分数显示ID
 * @property {string} linesClearedId - 消行数显示ID
 * @property {string} currentLevelId - 当前等级显示ID
 * @property {string} gameOverlayId - 游戏覆盖层ID
 * @property {string} overlayTitleId - 覆盖层标题ID
 * @property {string} overlayScoreId - 覆盖层分数ID
 * @property {string} gameBoardContainerId - 游戏棋盘容器ID
 * @property {string} keyBindingsDisplayId - 按键绑定显示ID
 */
const DEFAULT_CONFIG = {
    // 按钮ID
    startButtonId: 'start-btn',
    pauseButtonId: 'pause-btn',
    restartButtonId: 'restart-btn',
    restartOverlayButtonId: 'restart-btn-overlay',
    
    // AI控制
    aiToggleId: 'ai-toggle',
    
    // 音效控制（预留）
    soundToggleId: 'sound-toggle',
    
    // 速度控制
    speedSliderId: 'speed-slider',
    speedValueId: 'speed-value',
    
    // AI统计显示
    gamesPlayedId: 'games-played',
    bestScoreId: 'best-score',
    avgScoreId: 'avg-score',
    totalLinesId: 'total-lines',
    epsilonValueId: 'epsilon-value',
    
    // 分数显示
    currentScoreId: 'current-score',
    linesClearedId: 'lines-cleared',
    currentLevelId: 'current-level',
    
    // 游戏覆盖层
    gameOverlayId: 'game-overlay',
    overlayTitleId: 'overlay-title',
    overlayScoreId: 'overlay-score',
    
    // 游戏容器
    gameBoardContainerId: 'game-board-container',
    
    // 按键绑定显示
    keyBindingsDisplayId: 'key-bindings-display'
};

/**
 * @typedef {Object} ControlPanelConfig
 * @property {string} startButtonId - 开始按钮的DOM ID
 * @property {string} pauseButtonId - 暂停按钮的DOM ID
 * @property {string} restartButtonId - 重新开始按钮的DOM ID
 * @property {string} restartOverlayButtonId - 覆盖层重新开始按钮的DOM ID
 * @property {string} aiToggleId - AI开关的DOM ID
 * @property {string} soundToggleId - 音效开关的DOM ID
 * @property {string} speedSliderId - 速度滑块的DOM ID
 * @property {string} speedValueId - 速度值显示的DOM ID
 * @property {string} gamesPlayedId - 游戏次数显示的DOM ID
 * @property {string} bestScoreId - 最高分显示的DOM ID
 * @property {string} avgScoreId - 平均分显示的DOM ID
 * @property {string} totalLinesId - 总消行数显示的DOM ID
 * @property {string} epsilonValueId - Epsilon值显示的DOM ID
 * @property {string} currentScoreId - 当前分数显示的DOM ID
 * @property {string} linesClearedId - 消行数显示的DOM ID
 * @property {string} currentLevelId - 当前等级显示的DOM ID
 * @property {string} gameOverlayId - 游戏覆盖层的DOM ID
 * @property {string} overlayTitleId - 覆盖层标题的DOM ID
 * @property {string} overlayScoreId - 覆盖层分数的DOM ID
 * @property {string} gameBoardContainerId - 游戏棋盘容器的DOM ID
 * @property {string} keyBindingsDisplayId - 按键绑定显示的DOM ID
 */

/**
 * @typedef {Object} ControlPanelOptions
 * @property {Object} [gameEngine] - 游戏引擎实例
 * @property {Object} [aiController] - AI控制器实例
 * @property {Object} [rlAgent] - 强化学习代理实例
 * @property {Object} [settingsManager] - 设置管理器实例
 * @property {ControlPanelConfig} [config] - 自定义配置
 * @property {Function} [onStart] - 开始游戏回调
 * @property {Function} [onPause] - 暂停游戏回调
 * @property {Function} [onResume] - 恢复游戏回调
 * @property {Function} [onRestart] - 重新开始回调
 * @property {Function} [onAIToggle] - AI开关切换回调
 * @property {Function} [onSoundToggle] - 音效开关切换回调
 * @property {Function} [onSpeedChange] - 速度变化回调
 */

/**
 * 速度级别对应的下落间隔映射表（毫秒）
 * 
 * 速度级别范围为1-10，速度越高下落间隔越短。
 * 计算公式：interval = 1100 - speed * 100
 * - 速度1：1000ms（最慢）
 * - 速度5：600ms（默认）
 * - 速度10：100ms（最快）
 * 
 * @constant {Object.<number, number>}
 * 
 * Requirements: 10.4, 2.3
 */
const SPEED_INTERVALS = {
    1: 1000,
    2: 900,
    3: 800,
    4: 700,
    5: 600,
    6: 500,
    7: 400,
    8: 300,
    9: 200,
    10: 100
};

/**
 * ControlPanel 类 - UI控制面板管理器
 * 
 * 负责管理游戏的用户界面控制元素，包括按钮、滑块、开关和状态显示。
 * 提供游戏控制、AI管理、速度调节和统计显示等功能。
 * 
 * @class
 * @description
 * ControlPanel是游戏UI的核心管理组件，主要职责包括：
 * 1. 管理游戏控制按钮（开始、暂停、重新开始）
 * 2. 管理AI模式开关和统计显示
 * 3. 管理游戏速度滑块
 * 4. 更新分数、等级和消行数显示
 * 5. 管理游戏状态覆盖层
 * 6. 显示按键绑定信息
 * 7. 管理音效开关（预留功能）
 * 
 * Requirements: 8.4, 8.5, 8.6, 8.7, 9.3, 10.4, 3.3, 3.4
 * 
 * @example
 * // 创建控制面板实例
 * const controlPanel = new ControlPanel({
 *     gameEngine: gameEngine,
 *     aiController: aiController,
 *     rlAgent: rlAgent,
 *     onStart: () => console.log('游戏开始'),
 *     onSpeedChange: (speed) => console.log(`速度: ${speed}`)
 * });
 * 
 * // 初始化控制面板
 * controlPanel.init();
 * 
 * // 更新分数显示
 * controlPanel.updateScore(1000);
 * 
 * @example
 * // 处理游戏状态变化
 * gameEngine.onStateChange((state) => {
 *     controlPanel.onGameStateChange(state);
 *     if (state === 'gameover') {
 *         controlPanel.showGameOver(gameEngine.getScore());
 *     }
 * });
 */
class ControlPanel {
    /**
     * 创建控制面板实例
     * 
     * @constructor
     * @param {ControlPanelOptions} [options={}] - 配置选项对象
     * @param {Object} [options.gameEngine=null] - 游戏引擎实例，用于控制游戏状态
     * @param {Object} [options.aiController=null] - AI控制器实例，用于管理AI模式
     * @param {Object} [options.rlAgent=null] - 强化学习代理实例，用于获取AI统计
     * @param {Object} [options.settingsManager=null] - 设置管理器实例，用于获取按键绑定
     * @param {ControlPanelConfig} [options.config={}] - 自定义DOM ID配置
     * @param {Function} [options.onStart] - 游戏开始时的回调函数
     * @param {Function} [options.onPause] - 游戏暂停时的回调函数
     * @param {Function} [options.onResume] - 游戏恢复时的回调函数
     * @param {Function} [options.onRestart] - 游戏重新开始时的回调函数
     * @param {Function} [options.onAIToggle] - AI开关切换时的回调函数，参数为boolean
     * @param {Function} [options.onSoundToggle] - 音效开关切换时的回调函数，参数为boolean
     * @param {Function} [options.onSpeedChange] - 速度变化时的回调函数，参数为number
     * 
     * @example
     * const controlPanel = new ControlPanel({
     *     gameEngine: myGameEngine,
     *     onStart: () => console.log('开始'),
     *     onSpeedChange: (speed) => console.log(`速度: ${speed}`)
     * });
     */
    constructor(options = {}) {
        this.gameEngine = options.gameEngine || null;
        this.aiController = options.aiController || null;
        this.rlAgent = options.rlAgent || null;
        this.settingsManager = options.settingsManager || null;
        this.config = { ...DEFAULT_CONFIG, ...options.config };
        
        // DOM元素缓存
        this.elements = {};
        
        // 状态
        this.isInitialized = false;
        this.currentSpeed = 5;
        this.aiEnabled = false;
        this.soundEnabled = false;
        
        // 回调函数
        this.onStart = options.onStart || (() => {});
        this.onPause = options.onPause || (() => {});
        this.onResume = options.onResume || (() => {});
        this.onRestart = options.onRestart || (() => {});
        this.onAIToggle = options.onAIToggle || (() => {});
        this.onSoundToggle = options.onSoundToggle || (() => {});
        this.onSpeedChange = options.onSpeedChange || (() => {});
        
        // 统计更新间隔ID
        this.statsUpdateInterval = null;
    }
    
    /**
     * 初始化控制面板
     * 
     * 获取DOM元素引用、绑定事件处理器并初始化状态。
     * 此方法应在DOM加载完成后调用。
     * 
     * @description
     * 初始化过程包括：
     * 1. 缓存所有需要的DOM元素引用
     * 2. 绑定按钮点击、滑块变化等事件
     * 3. 初始化速度、AI状态等初始值
     * 4. 更新AI统计显示
     * 5. 更新按键绑定显示
     * 
     * 重复调用此方法不会产生副作用（幂等性）。
     * 
     * @example
     * const controlPanel = new ControlPanel({ gameEngine });
     * 
     * // DOM加载完成后初始化
     * document.addEventListener('DOMContentLoaded', () => {
     *     controlPanel.init();
     * });
     */
    init() {
        if (this.isInitialized) {
            return;
        }
        
        this._cacheElements();
        this._bindEvents();
        this._initializeState();
        
        this.isInitialized = true;
    }
    
    /**
     * 缓存DOM元素引用
     * 
     * 根据配置中的ID获取所有需要的DOM元素，并存储在elements对象中。
     * 这样可以避免重复的DOM查询，提高性能。
     * 
     * @private
     */
    _cacheElements() {
        const config = this.config;
        
        // 控制按钮
        this.elements.startButton = document.getElementById(config.startButtonId);
        this.elements.pauseButton = document.getElementById(config.pauseButtonId);
        this.elements.restartButton = document.getElementById(config.restartButtonId);
        this.elements.restartOverlayButton = document.getElementById(config.restartOverlayButtonId);
        
        // AI控制
        this.elements.aiToggle = document.getElementById(config.aiToggleId);
        
        // 音效控制（预留）
        this.elements.soundToggle = document.getElementById(config.soundToggleId);
        
        // 速度控制
        this.elements.speedSlider = document.getElementById(config.speedSliderId);
        this.elements.speedValue = document.getElementById(config.speedValueId);
        
        // AI统计
        this.elements.gamesPlayed = document.getElementById(config.gamesPlayedId);
        this.elements.bestScore = document.getElementById(config.bestScoreId);
        this.elements.avgScore = document.getElementById(config.avgScoreId);
        this.elements.totalLines = document.getElementById(config.totalLinesId);
        this.elements.epsilonValue = document.getElementById(config.epsilonValueId);
        
        // 分数显示
        this.elements.currentScore = document.getElementById(config.currentScoreId);
        this.elements.linesCleared = document.getElementById(config.linesClearedId);
        this.elements.currentLevel = document.getElementById(config.currentLevelId);
        
        // 游戏覆盖层
        this.elements.gameOverlay = document.getElementById(config.gameOverlayId);
        this.elements.overlayTitle = document.getElementById(config.overlayTitleId);
        this.elements.overlayScore = document.getElementById(config.overlayScoreId);
        
        // 按键绑定显示
        this.elements.keyBindingsDisplay = document.getElementById(config.keyBindingsDisplayId);
    }
    
    /**
     * 绑定事件处理器
     * 
     * 为所有控制元素绑定相应的事件监听器。
     * 
     * @private
     * @description
     * 绑定的事件包括：
     * - 开始按钮点击
     * - 暂停按钮点击
     * - 重新开始按钮点击
     * - AI开关切换
     * - 音效开关切换（预留）
     * - 速度滑块变化
     * 
     * Requirements: 8.6, 9.3
     */
    _bindEvents() {
        // 开始按钮
        if (this.elements.startButton) {
            this.elements.startButton.addEventListener('click', () => this._handleStart());
        }
        
        // 暂停按钮
        if (this.elements.pauseButton) {
            this.elements.pauseButton.addEventListener('click', () => this._handlePause());
        }
        
        // 重新开始按钮
        if (this.elements.restartButton) {
            this.elements.restartButton.addEventListener('click', () => this._handleRestart());
        }
        
        // 覆盖层重新开始按钮
        if (this.elements.restartOverlayButton) {
            this.elements.restartOverlayButton.addEventListener('click', () => this._handleRestart());
        }
        
        // AI开关
        if (this.elements.aiToggle) {
            this.elements.aiToggle.addEventListener('change', (e) => this._handleAIToggle(e));
        }
        
        // 音效开关（预留）
        // 注意：UI元素默认禁用，此处预留事件绑定以便未来启用
        if (this.elements.soundToggle) {
            this.elements.soundToggle.addEventListener('change', (e) => this._handleSoundToggle(e));
        }
        
        // 速度滑块
        if (this.elements.speedSlider) {
            this.elements.speedSlider.addEventListener('input', (e) => this._handleSpeedChange(e));
        }
    }
    
    /**
     * 初始化状态
     * 
     * 从DOM元素读取初始值并设置内部状态。
     * 
     * @private
     * @description
     * 初始化内容包括：
     * - 从速度滑块读取初始速度值
     * - 从AI开关读取初始AI状态
     * - 更新按钮状态为idle
     * - 更新AI统计显示
     * - 更新按键绑定显示
     */
    _initializeState() {
        // 设置初始速度显示
        if (this.elements.speedSlider && this.elements.speedValue) {
            this.currentSpeed = parseInt(this.elements.speedSlider.value, 10) || 5;
            this.elements.speedValue.textContent = this.currentSpeed;
        }
        
        // 设置初始AI状态
        if (this.elements.aiToggle) {
            this.aiEnabled = this.elements.aiToggle.checked;
        }
        
        // 更新按钮状态
        this._updateButtonStates('idle');
        
        // 更新AI统计
        this.updateAIStats();
        
        // 更新按键绑定显示
        this.updateKeyBindingsDisplay();
    }
    
    /**
     * 处理开始按钮点击
     * 
     * 根据当前游戏状态执行开始或恢复操作。
     * 
     * @private
     * @description
     * 行为逻辑：
     * - 如果游戏已暂停：恢复游戏
     * - 如果游戏未在进行中：开始新游戏
     * - 隐藏覆盖层
     * - 触发onStart回调
     * 
     * Requirements: 8.6
     */
    _handleStart() {
        if (this.gameEngine) {
            if (this.gameEngine.isPaused()) {
                this.gameEngine.resume();
                this._updateButtonStates('playing');
            } else if (!this.gameEngine.isPlaying()) {
                this.gameEngine.start();
                this._updateButtonStates('playing');
            }
        }
        
        this.onStart();
        this.hideOverlay();
    }
    
    /**
     * 处理暂停按钮点击
     * 
     * 切换游戏的暂停/恢复状态。
     * 
     * @private
     * @description
     * 行为逻辑：
     * - 如果游戏正在进行：暂停游戏，按钮文本变为"继续"
     * - 如果游戏已暂停：恢复游戏，按钮文本变为"暂停"
     * - 触发onPause回调
     * 
     * Requirements: 8.6
     */
    _handlePause() {
        if (this.gameEngine) {
            if (this.gameEngine.isPlaying()) {
                this.gameEngine.pause();
                this._updateButtonStates('paused');
                this._updatePauseButtonText('继续');
            } else if (this.gameEngine.isPaused()) {
                this.gameEngine.resume();
                this._updateButtonStates('playing');
                this._updatePauseButtonText('暂停');
            }
        }
        
        this.onPause();
    }
    
    /**
     * 处理重新开始按钮点击
     * 
     * 重置游戏状态并开始新游戏。
     * 
     * @private
     * @description
     * 执行操作：
     * 1. 调用游戏引擎的restart方法
     * 2. 更新按钮状态为playing
     * 3. 重置暂停按钮文本
     * 4. 重置AI控制器
     * 5. 隐藏覆盖层
     * 6. 触发onRestart回调
     * 
     * Requirements: 8.6
     */
    _handleRestart() {
        if (this.gameEngine) {
            this.gameEngine.restart();
            this._updateButtonStates('playing');
            this._updatePauseButtonText('暂停');
        }
        
        // 重置AI控制器
        if (this.aiController) {
            this.aiController.reset();
        }
        
        this.onRestart();
        this.hideOverlay();
    }
    
    /**
     * 处理AI开关切换
     * 
     * 启用或禁用AI控制模式。
     * 
     * @private
     * @param {Event} event - 事件对象，包含开关的checked状态
     * 
     * @description
     * 行为逻辑：
     * - 启用AI时：调用aiController.enable()，开始统计更新
     * - 禁用AI时：调用aiController.disable()，停止统计更新
     * - 触发onAIToggle回调，传递当前状态
     * 
     * Requirements: 8.4
     */
    _handleAIToggle(event) {
        this.aiEnabled = event.target.checked;
        
        if (this.aiController) {
            if (this.aiEnabled) {
                this.aiController.enable();
                this._startStatsUpdate();
            } else {
                this.aiController.disable();
                this._stopStatsUpdate();
            }
        }
        
        this.onAIToggle(this.aiEnabled);
    }
    
    /**
     * 处理音效开关切换（预留功能）
     * 
     * 启用或禁用游戏音效。
     * 
     * @private
     * @param {Event} event - 事件对象，包含开关的checked状态
     * 
     * @description
     * 此功能为预留功能，UI元素默认禁用。
     * 当音效系统实现后，可启用此功能。
     * 
     * Requirements: 3.3 - Sound effects toggle option (placeholder)
     */
    _handleSoundToggle(event) {
        this.soundEnabled = event.target.checked;
        this.onSoundToggle(this.soundEnabled);
    }
    
    /**
     * 处理速度滑块变化
     * 
     * 更新游戏速度并同步显示。
     * 
     * @private
     * @param {Event} event - 事件对象，包含滑块的当前值
     * 
     * @description
     * 执行操作：
     * 1. 解析滑块值为整数
     * 2. 更新内部速度状态
     * 3. 更新速度值显示
     * 4. 调用游戏引擎的setSpeed方法
     * 5. 触发onSpeedChange回调
     * 
     * Requirements: 8.5, 10.4
     */
    _handleSpeedChange(event) {
        const speed = parseInt(event.target.value, 10);
        this.currentSpeed = speed;
        
        // 更新显示
        if (this.elements.speedValue) {
            this.elements.speedValue.textContent = speed;
        }
        
        // 更新游戏引擎速度
        if (this.gameEngine) {
            this.gameEngine.setSpeed(speed);
        }
        
        this.onSpeedChange(speed);
    }
    
    /**
     * 更新按钮状态
     * 
     * 根据游戏状态更新各控制按钮的启用/禁用状态和文本。
     * 
     * @private
     * @param {string} gameState - 游戏状态
     *   - 'idle': 空闲状态，游戏未开始
     *   - 'playing': 游戏进行中
     *   - 'paused': 游戏已暂停
     *   - 'gameover': 游戏结束
     * 
     * @description
     * 各状态下的按钮行为：
     * - idle: 开始按钮启用，暂停和重新开始禁用
     * - playing: 开始按钮禁用，暂停和重新开始启用
     * - paused: 开始按钮禁用，暂停（显示"继续"）和重新开始启用
     * - gameover: 开始和重新开始启用，暂停禁用
     */
    _updateButtonStates(gameState) {
        const { startButton, pauseButton, restartButton } = this.elements;
        
        switch (gameState) {
            case 'idle':
                if (startButton) {
                    startButton.disabled = false;
                    startButton.textContent = '开始游戏';
                }
                if (pauseButton) {
                    pauseButton.disabled = true;
                }
                if (restartButton) {
                    restartButton.disabled = true;
                }
                break;
                
            case 'playing':
                if (startButton) {
                    startButton.disabled = true;
                }
                if (pauseButton) {
                    pauseButton.disabled = false;
                    pauseButton.textContent = '暂停';
                }
                if (restartButton) {
                    restartButton.disabled = false;
                }
                break;
                
            case 'paused':
                if (startButton) {
                    startButton.disabled = true;
                }
                if (pauseButton) {
                    pauseButton.disabled = false;
                    pauseButton.textContent = '继续';
                }
                if (restartButton) {
                    restartButton.disabled = false;
                }
                break;
                
            case 'gameover':
                if (startButton) {
                    startButton.disabled = false;
                    startButton.textContent = '开始游戏';
                }
                if (pauseButton) {
                    pauseButton.disabled = true;
                }
                if (restartButton) {
                    restartButton.disabled = false;
                }
                break;
        }
    }
    
    /**
     * 更新暂停按钮文本
     * 
     * @private
     * @param {string} text - 按钮显示文本（如"暂停"或"继续"）
     */
    _updatePauseButtonText(text) {
        if (this.elements.pauseButton) {
            this.elements.pauseButton.textContent = text;
        }
    }
    
    /**
     * 开始AI统计更新定时器
     * 
     * 启动定时器，每秒更新一次AI统计显示。
     * 
     * @private
     * @description
     * 如果定时器已存在，不会创建新的定时器。
     * 
     * Requirements: 8.7
     */
    _startStatsUpdate() {
        if (this.statsUpdateInterval) {
            return;
        }
        
        // 每秒更新一次统计
        this.statsUpdateInterval = setInterval(() => {
            this.updateAIStats();
        }, 1000);
    }
    
    /**
     * 停止AI统计更新定时器
     * 
     * 清除统计更新定时器，停止自动更新。
     * 
     * @private
     */
    _stopStatsUpdate() {
        if (this.statsUpdateInterval) {
            clearInterval(this.statsUpdateInterval);
            this.statsUpdateInterval = null;
        }
    }
    
    /**
     * 更新AI统计显示
     * 
     * 从强化学习代理获取统计数据并更新UI显示。
     * 
     * @description
     * 更新的统计项包括：
     * - 游戏次数 (gamesPlayed)
     * - 最高分 (bestScore)
     * - 平均分 (averageScore)
     * - 总消行数 (totalLinesCleared)
     * - Epsilon值 (探索率)
     * 
     * 如果没有设置rlAgent，此方法不执行任何操作。
     * 
     * Requirements: 8.7
     * 
     * @example
     * // 手动更新AI统计
     * controlPanel.updateAIStats();
     */
    updateAIStats() {
        if (!this.rlAgent) {
            return;
        }
        
        const stats = this.rlAgent.getStatistics();
        const epsilon = this.rlAgent.getEpsilon();
        
        if (this.elements.gamesPlayed) {
            this.elements.gamesPlayed.textContent = stats.gamesPlayed;
        }
        
        if (this.elements.bestScore) {
            this.elements.bestScore.textContent = stats.bestScore;
        }
        
        if (this.elements.avgScore) {
            this.elements.avgScore.textContent = Math.round(stats.averageScore);
        }
        
        if (this.elements.totalLines) {
            this.elements.totalLines.textContent = stats.totalLinesCleared;
        }
        
        if (this.elements.epsilonValue) {
            this.elements.epsilonValue.textContent = epsilon.toFixed(2);
        }
    }
    
    /**
     * 更新分数显示
     * 
     * @param {number} score - 当前分数
     * 
     * @example
     * controlPanel.updateScore(12500);
     */
    updateScore(score) {
        if (this.elements.currentScore) {
            this.elements.currentScore.textContent = score;
        }
    }
    
    /**
     * 更新消行数显示
     * 
     * @param {number} lines - 已消除的行数
     * 
     * @example
     * controlPanel.updateLinesCleared(42);
     */
    updateLinesCleared(lines) {
        if (this.elements.linesCleared) {
            this.elements.linesCleared.textContent = lines;
        }
    }
    
    /**
     * 更新等级显示
     * 
     * @param {number} level - 当前游戏等级
     * 
     * @example
     * controlPanel.updateLevel(5);
     */
    updateLevel(level) {
        if (this.elements.currentLevel) {
            this.elements.currentLevel.textContent = level;
        }
    }
    
    /**
     * 显示游戏结束覆盖层
     * 
     * 在游戏区域显示游戏结束信息和最终分数。
     * 
     * @param {number} finalScore - 最终分数
     * 
     * @description
     * 显示内容包括：
     * - "游戏结束"标题
     * - 最终分数
     * - 重新开始按钮
     * 
     * @example
     * if (gameState === 'gameover') {
     *     controlPanel.showGameOver(gameEngine.getScore());
     * }
     */
    showGameOver(finalScore) {
        this._updateButtonStates('gameover');
        
        if (this.elements.overlayTitle) {
            this.elements.overlayTitle.textContent = '游戏结束';
        }
        
        if (this.elements.overlayScore) {
            this.elements.overlayScore.textContent = `最终分数: ${finalScore}`;
        }
        
        if (this.elements.gameOverlay) {
            this.elements.gameOverlay.classList.add('active');
        }
    }
    
    /**
     * 显示暂停覆盖层
     * 
     * 在游戏区域显示暂停信息。
     * 
     * @description
     * 显示内容包括：
     * - "游戏暂停"标题
     * - 恢复游戏提示
     * 
     * @example
     * if (gameState === 'paused') {
     *     controlPanel.showPaused();
     * }
     */
    showPaused() {
        if (this.elements.overlayTitle) {
            this.elements.overlayTitle.textContent = '游戏暂停';
        }
        
        if (this.elements.overlayScore) {
            this.elements.overlayScore.textContent = '按继续按钮恢复游戏';
        }
        
        if (this.elements.gameOverlay) {
            this.elements.gameOverlay.classList.add('active');
        }
    }
    
    /**
     * 隐藏覆盖层
     * 
     * 移除游戏区域的覆盖层（暂停或游戏结束）。
     * 
     * @example
     * // 游戏恢复时隐藏覆盖层
     * controlPanel.hideOverlay();
     */
    hideOverlay() {
        if (this.elements.gameOverlay) {
            this.elements.gameOverlay.classList.remove('active');
        }
    }
    
    /**
     * 处理游戏状态变化
     * 
     * 根据新的游戏状态更新UI元素。
     * 
     * @param {string} state - 新的游戏状态
     *   - 'idle': 空闲状态
     *   - 'playing': 游戏进行中
     *   - 'paused': 游戏已暂停
     *   - 'gameover': 游戏结束
     * 
     * @description
     * 此方法应在游戏状态变化时调用，它会：
     * 1. 更新按钮状态
     * 2. 根据状态显示或隐藏覆盖层
     * 
     * @example
     * gameEngine.onStateChange((state) => {
     *     controlPanel.onGameStateChange(state);
     * });
     */
    onGameStateChange(state) {
        this._updateButtonStates(state);
        
        if (state === 'paused') {
            this.showPaused();
        } else if (state === 'playing') {
            this.hideOverlay();
        }
    }
    
    /**
     * 设置游戏引擎
     * 
     * @param {Object} gameEngine - 游戏引擎实例
     * 
     * @example
     * controlPanel.setGameEngine(new GameEngine());
     */
    setGameEngine(gameEngine) {
        this.gameEngine = gameEngine;
    }
    
    /**
     * 设置AI控制器
     * 
     * @param {Object} aiController - AI控制器实例
     * 
     * @example
     * controlPanel.setAIController(new AIController(gameEngine));
     */
    setAIController(aiController) {
        this.aiController = aiController;
    }
    
    /**
     * 设置强化学习代理
     * 
     * @param {Object} rlAgent - 强化学习代理实例
     * 
     * @example
     * controlPanel.setRLAgent(new RLAgent());
     */
    setRLAgent(rlAgent) {
        this.rlAgent = rlAgent;
    }
    
    /**
     * 获取当前速度级别
     * 
     * @returns {number} 当前速度级别（1-10）
     * 
     * @example
     * const speed = controlPanel.getSpeed();
     * console.log(`当前速度: ${speed}`);
     */
    getSpeed() {
        return this.currentSpeed;
    }
    
    /**
     * 设置速度级别
     * 
     * 更新速度级别并同步UI和游戏引擎。
     * 
     * @param {number} speed - 速度级别（1-10），超出范围会被钳制
     * 
     * @description
     * 此方法会：
     * 1. 将速度值钳制到有效范围[1, 10]
     * 2. 更新内部状态
     * 3. 更新滑块位置
     * 4. 更新速度值显示
     * 5. 调用游戏引擎的setSpeed方法
     * 
     * @example
     * controlPanel.setSpeed(8);  // 设置为速度8
     * controlPanel.setSpeed(15); // 会被钳制为10
     */
    setSpeed(speed) {
        const clampedSpeed = Math.max(1, Math.min(10, speed));
        this.currentSpeed = clampedSpeed;
        
        if (this.elements.speedSlider) {
            this.elements.speedSlider.value = clampedSpeed;
        }
        
        if (this.elements.speedValue) {
            this.elements.speedValue.textContent = clampedSpeed;
        }
        
        if (this.gameEngine) {
            this.gameEngine.setSpeed(clampedSpeed);
        }
    }
    
    /**
     * 获取AI是否启用
     * 
     * @returns {boolean} 如果AI模式启用则返回true
     * 
     * @example
     * if (controlPanel.isAIEnabled()) {
     *     console.log('AI模式已启用');
     * }
     */
    isAIEnabled() {
        return this.aiEnabled;
    }
    
    /**
     * 设置AI启用状态
     * 
     * 启用或禁用AI模式，并同步UI和AI控制器。
     * 
     * @param {boolean} enabled - 是否启用AI模式
     * 
     * @description
     * 此方法会：
     * 1. 更新内部状态
     * 2. 更新AI开关UI
     * 3. 启用/禁用AI控制器
     * 4. 启动/停止统计更新
     * 
     * @example
     * controlPanel.setAIEnabled(true);  // 启用AI模式
     */
    setAIEnabled(enabled) {
        this.aiEnabled = enabled;
        
        if (this.elements.aiToggle) {
            this.elements.aiToggle.checked = enabled;
        }
        
        if (this.aiController) {
            if (enabled) {
                this.aiController.enable();
                this._startStatsUpdate();
            } else {
                this.aiController.disable();
                this._stopStatsUpdate();
            }
        }
    }
    
    /**
     * 获取音效是否启用（预留功能）
     * 
     * @returns {boolean} 如果音效启用则返回true
     * 
     * @description
     * 此功能为预留功能，当前始终返回false。
     * 
     * Requirements: 3.3 - Sound effects toggle option (placeholder)
     * 
     * @example
     * if (controlPanel.isSoundEnabled()) {
     *     playSound('drop');
     * }
     */
    isSoundEnabled() {
        return this.soundEnabled;
    }
    
    /**
     * 设置音效启用状态（预留功能）
     * 
     * 启用或禁用游戏音效。
     * 
     * @param {boolean} enabled - 是否启用音效
     * 
     * @description
     * 此功能为预留功能，当音效系统实现后可启用。
     * 当前仅更新内部状态和UI，不产生实际音效。
     * 
     * Requirements: 3.3 - Sound effects toggle option (placeholder)
     * 
     * @example
     * controlPanel.setSoundEnabled(true);  // 启用音效
     */
    setSoundEnabled(enabled) {
        this.soundEnabled = enabled;
        
        if (this.elements.soundToggle) {
            this.elements.soundToggle.checked = enabled;
        }
    }
    
    /**
     * 设置设置管理器
     * 
     * @param {Object} settingsManager - 设置管理器实例
     * 
     * @example
     * controlPanel.setSettingsManager(new SettingsManager());
     */
    setSettingsManager(settingsManager) {
        this.settingsManager = settingsManager;
    }
    
    /**
     * 更新按键绑定显示
     * 
     * 从设置管理器获取当前按键绑定并更新UI显示。
     * 
     * @description
     * 此方法会遍历所有按键绑定，并更新对应的DOM元素。
     * DOM元素ID格式为 `key-{action}`，如 `key-left`、`key-right` 等。
     * 
     * 如果没有设置settingsManager，此方法不执行任何操作。
     * 
     * Requirements: 3.4 - Key bindings display showing current control mappings
     * 
     * @example
     * // 设置管理器更新后刷新显示
     * settingsManager.setKeyBinding('left', 'KeyA');
     * controlPanel.updateKeyBindingsDisplay();
     */
    updateKeyBindingsDisplay() {
        if (!this.settingsManager) {
            return;
        }
        
        const keyBindings = this.settingsManager.getKeyBindingsDisplay();
        
        for (const binding of keyBindings) {
            const keyElement = document.getElementById(`key-${binding.action}`);
            if (keyElement) {
                keyElement.textContent = binding.displayKey;
            }
        }
    }
    
    /**
     * 获取速度对应的下落间隔
     * 
     * 根据速度级别计算方块下落的时间间隔。
     * 
     * @static
     * @param {number} speed - 速度级别（1-10）
     * @returns {number} 下落间隔（毫秒）
     * 
     * @description
     * 速度与间隔的对应关系：
     * - 速度1：1000ms
     * - 速度5：600ms
     * - 速度10：100ms
     * 
     * 超出范围的速度值会被钳制到[1, 10]。
     * 
     * Requirements: 10.4, 2.3
     * 
     * @example
     * const interval = ControlPanel.getDropInterval(5);
     * console.log(interval); // 输出: 600
     */
    static getDropInterval(speed) {
        const clampedSpeed = Math.max(1, Math.min(10, speed));
        return SPEED_INTERVALS[clampedSpeed];
    }
    
    /**
     * 销毁控制面板
     * 
     * 清理事件监听器和定时器，释放资源。
     * 
     * @description
     * 此方法应在不再需要控制面板时调用，以防止内存泄漏。
     * 调用后，控制面板将不再响应用户交互。
     * 
     * @example
     * // 页面卸载时清理
     * window.addEventListener('beforeunload', () => {
     *     controlPanel.destroy();
     * });
     */
    destroy() {
        this._stopStatsUpdate();
        
        // 移除事件监听器（如果需要更精细的控制，可以保存引用）
        // 这里简化处理，因为通常页面卸载时会自动清理
        
        this.isInitialized = false;
        this.elements = {};
    }
}

// 导出模块
export { ControlPanel, DEFAULT_CONFIG, SPEED_INTERVALS };
