/**
 * Main Application Entry Point
 * 
 * 初始化并连接所有游戏模块
 */

import { GameEngine, GAME_STATES } from './core/game-engine.js';
import { InputHandler } from './core/input-handler.js';
import { CanvasRenderer } from './render/canvas-renderer.js';
import { AIController } from './ai/ai-controller.js';
import { RLAgent } from './ai/rl-agent.js';
import { StateEvaluator } from './ai/state-evaluator.js';
import { ControlPanel } from './ui/control-panel.js';

/**
 * TetrisApp - 主应用类
 */
class TetrisApp {
    constructor() {
        // 核心组件
        this.gameEngine = null;
        this.renderer = null;
        this.inputHandler = null;
        
        // AI组件
        this.stateEvaluator = null;
        this.rlAgent = null;
        this.aiController = null;
        
        // UI组件
        this.controlPanel = null;
        
        // 状态
        this.isRunning = false;
    }
    
    /**
     * 初始化应用
     */
    init() {
        // 获取Canvas元素
        const gameCanvas = document.getElementById('game-canvas');
        const nextPieceCanvas = document.getElementById('next-piece-canvas');
        const holdPieceCanvas = document.getElementById('hold-piece-canvas');
        
        if (!gameCanvas) {
            console.error('Game canvas not found!');
            return;
        }
        
        // 初始化游戏引擎
        this.gameEngine = new GameEngine({
            onStateChange: (state) => this._onGameStateChange(state),
            onScoreChange: (score, points) => this._onScoreChange(score, points),
            onLinesCleared: (cleared, total) => this._onLinesCleared(cleared, total),
            onGameOver: (score, lines) => this._onGameOver(score, lines),
            onPieceSpawned: (current, next) => this._onPieceSpawned(current, next)
        });
        
        // 初始化渲染器
        this.renderer = new CanvasRenderer(gameCanvas, nextPieceCanvas);
        // 绑定暂存方块预览Canvas
        if (holdPieceCanvas) {
            this.renderer.setHoldPieceCanvas(holdPieceCanvas);
        }
        
        // 初始化输入处理器
        this.inputHandler = new InputHandler(this.gameEngine);
        this.inputHandler.bind();
        
        // 初始化AI组件
        this.stateEvaluator = new StateEvaluator();
        this.rlAgent = new RLAgent();
        this.rlAgent.loadFromStorage(); // 加载之前的学习数据
        this.aiController = new AIController(this.stateEvaluator, this.rlAgent);
        
        // 初始化控制面板
        this.controlPanel = new ControlPanel({
            gameEngine: this.gameEngine,
            aiController: this.aiController,
            rlAgent: this.rlAgent,
            onStart: () => this._startGameLoop(),
            onPause: () => {},
            onResume: () => {},
            onRestart: () => this._onRestart(),
            onAIToggle: (enabled) => this._onAIToggle(enabled),
            onSpeedChange: (speed) => this._onSpeedChange(speed)
        });
        this.controlPanel.init();
        
        // 初始渲染
        this._render();
        
        console.log('Tetris AI Game initialized!');
    }
    
    /**
     * 启动游戏循环
     */
    _startGameLoop() {
        if (this.isRunning) return;
        this.isRunning = true;
        
        this.renderer.startGameLoop((deltaTime) => {
            this._update(deltaTime);
            this._render();
        });
    }
    
    /**
     * 停止游戏循环
     */
    _stopGameLoop() {
        this.isRunning = false;
        this.renderer.stopGameLoop();
    }
    
    /**
     * 游戏更新
     */
    _update(deltaTime) {
        if (!this.gameEngine.isPlaying()) return;
        
        // 更新游戏引擎
        this.gameEngine.update(deltaTime);
        
        // 处理持续按键
        this.inputHandler.processHeldKeys();
        
        // AI自动模式
        if (this.aiController.isEnabled() && this.gameEngine.currentTetromino) {
            const currentTime = Date.now();
            this.aiController.update(
                this.gameEngine.board,
                this.gameEngine.currentTetromino,
                currentTime,
                (move) => this._executeAIMove(move)
            );
        }
    }
    
    /**
     * 执行AI移动
     */
    _executeAIMove(move) {
        if (!move) return;
        
        switch (move.type) {
            case 'left':
                this.gameEngine.moveLeft();
                break;
            case 'right':
                this.gameEngine.moveRight();
                break;
            case 'down':
                this.gameEngine.moveDown();
                break;
            case 'rotate':
                this.gameEngine.rotateClockwise();
                break;
            case 'drop':
                this.gameEngine.hardDrop();
                break;
        }
    }
    
    /**
     * 渲染游戏
     */
    _render() {
        const state = this.gameEngine.getState();
        state.ghostY = this.gameEngine.getGhostY();
        this.renderer.render(state);
    }
    
    /**
     * 游戏状态变化回调
     */
    _onGameStateChange(state) {
        this.controlPanel.onGameStateChange(state);
        
        if (state === GAME_STATES.GAMEOVER) {
            // 游戏结束时停止循环，避免不必要的计算
            this._stopGameLoop();
        } else if (state === GAME_STATES.PAUSED) {
            // 暂停时不停止循环，只是不更新
        }
    }
    
    /**
     * 分数变化回调
     */
    _onScoreChange(score, points) {
        this.controlPanel.updateScore(score);
    }
    
    /**
     * 消行回调
     */
    _onLinesCleared(cleared, total) {
        this.controlPanel.updateLinesCleared(total);
    }
    
    /**
     * 游戏结束回调
     */
    _onGameOver(score, lines) {
        this.controlPanel.showGameOver(score);
        
        // 记录AI学习数据
        if (this.aiController.isEnabled()) {
            this.rlAgent.recordGame(score, lines);
            this.rlAgent.saveToStorage();
            this.controlPanel.updateAIStats();
        }
    }
    
    /**
     * 新方块生成回调
     */
    _onPieceSpawned(current, next) {
        // 如果AI启用，为新方块规划移动
        if (this.aiController.isEnabled()) {
            this.aiController.clearMoveQueue();
        }
    }
    
    /**
     * 重新开始回调
     */
    _onRestart() {
        this.aiController.reset();
        this._startGameLoop();
    }
    
    /**
     * AI开关回调
     */
    _onAIToggle(enabled) {
        if (enabled) {
            console.log('AI mode enabled');
        } else {
            console.log('AI mode disabled');
        }
    }
    
    /**
     * 速度变化回调
     */
    _onSpeedChange(speed) {
        console.log(`Speed changed to ${speed}`);
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    const app = new TetrisApp();
    app.init();
    
    // 暴露到全局以便调试
    window.tetrisApp = app;
});
