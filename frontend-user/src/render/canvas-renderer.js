/**
 * @fileoverview CanvasRenderer - 俄罗斯方块Canvas渲染器模块
 * 
 * 本模块提供基于HTML5 Canvas的游戏渲染功能，负责将游戏状态可视化呈现。
 * 主要功能包括：
 * - 棋盘和已放置方块的渲染
 * - 当前活动方块的渲染
 * - Ghost Piece（硬降预览）的渲染
 * - 下一个方块预览的渲染
 * - 网格线的渲染
 * - 行消除动画效果
 * - 游戏结束画面
 * - 游戏循环和帧率控制
 * 
 * @module render/canvas-renderer
 * @requires core/tetromino
 * @requires core/board-manager
 * 
 * @example
 * // 基本使用示例
 * import { CanvasRenderer } from './render/canvas-renderer.js';
 * 
 * const canvas = document.getElementById('game-canvas');
 * const nextPieceCanvas = document.getElementById('next-piece-canvas');
 * const renderer = new CanvasRenderer(canvas, nextPieceCanvas, {
 *     cellSize: 30,
 *     ghostPieceEnabled: true,
 *     gridLinesEnabled: true
 * });
 * 
 * // 渲染游戏状态
 * renderer.render(gameState);
 * 
 * // 启动游戏循环
 * renderer.startGameLoop((deltaTime) => {
 *     gameEngine.update(deltaTime);
 *     renderer.render(gameEngine.getState());
 * });
 * 
 * Requirements: 10.1, 10.2, 10.3, 9.5, 9.6, 5.3, 3.1, 3.2, 4.1, 4.2, 7.1
 */

import { TETROMINO_COLORS, TETROMINO_TYPES } from '../core/tetromino.js';
import { BOARD_WIDTH, BOARD_HEIGHT } from '../core/board-manager.js';

/**
 * 默认单元格大小（像素）
 * 每个方块单元格的边长，用于计算Canvas尺寸和渲染位置
 * @constant {number}
 */
const DEFAULT_CELL_SIZE = 30;

/**
 * 网格线颜色
 * 用于绘制棋盘网格线的颜色值
 * @constant {string}
 */
const GRID_LINE_COLOR = '#333333';

/**
 * 棋盘背景颜色
 * 游戏区域的背景填充颜色
 * @constant {string}
 */
const GRID_BACKGROUND_COLOR = '#1a1a2e';

/**
 * Ghost Piece透明度
 * 硬降预览方块的透明度值（0-1）
 * @constant {number}
 */
const GHOST_PIECE_ALPHA = 0.3;

/**
 * 游戏结束遮罩颜色
 * 游戏结束时覆盖在棋盘上的半透明遮罩颜色
 * @constant {string}
 */
const GAME_OVER_OVERLAY_COLOR = 'rgba(0, 0, 0, 0.7)';

/**
 * 行消除动画持续时间（毫秒）
 * 消除行时闪烁动画的总持续时间
 * @constant {number}
 */
const LINE_CLEAR_ANIMATION_DURATION = 300;

/**
 * 行消除闪烁次数
 * 消除行时闪烁效果的次数
 * @constant {number}
 */
const LINE_CLEAR_FLASH_COUNT = 3;

/**
 * 默认渲染选项配置
 * 定义渲染器的默认行为设置
 * 
 * @constant {RenderOptions}
 * @property {boolean} ghostPieceEnabled - 是否显示Ghost Piece（硬降预览）
 * @property {boolean} gridLinesEnabled - 是否显示网格线
 * @property {string} gridLineColor - 网格线颜色
 * @property {number} gridLineWidth - 网格线宽度（像素）
 */
const DEFAULT_RENDER_OPTIONS = {
    ghostPieceEnabled: true,
    gridLinesEnabled: true,
    gridLineColor: GRID_LINE_COLOR,
    gridLineWidth: 1
};

/**
 * @typedef {Object} RenderOptions
 * @property {boolean} ghostPieceEnabled - 是否显示Ghost Piece（硬降预览）
 * @property {boolean} gridLinesEnabled - 是否显示网格线
 * @property {string} gridLineColor - 网格线颜色
 * @property {number} gridLineWidth - 网格线宽度（像素）
 */

/**
 * @typedef {Object} GameState
 * @property {number[][]} board - 棋盘网格数据，二维数组表示每个单元格的状态
 * @property {Tetromino|null} currentTetromino - 当前活动的方块对象
 * @property {Tetromino|null} nextTetromino - 下一个方块对象
 * @property {number|null} ghostY - Ghost Piece的Y坐标
 * @property {string} gameState - 游戏状态 ('idle', 'playing', 'paused', 'gameover')
 */

/**
 * CanvasRenderer 类 - 俄罗斯方块游戏的Canvas渲染器
 * 
 * 负责将游戏状态渲染到HTML5 Canvas上，提供完整的视觉呈现功能。
 * 支持可配置的渲染选项，包括Ghost Piece显示、网格线显示等。
 * 
 * @class
 * @description
 * CanvasRenderer是游戏的核心渲染组件，主要职责包括：
 * 1. 初始化和管理Canvas上下文
 * 2. 渲染棋盘背景和网格线
 * 3. 渲染已放置的方块和当前活动方块
 * 4. 渲染Ghost Piece（硬降预览）
 * 5. 渲染下一个方块预览
 * 6. 执行行消除动画
 * 7. 管理游戏渲染循环和帧率
 * 
 * Requirements: 10.1, 10.2, 10.3, 9.5, 9.6, 5.3, 3.1, 3.2
 * 
 * @example
 * // 创建渲染器实例
 * const canvas = document.getElementById('game-canvas');
 * const nextCanvas = document.getElementById('next-piece');
 * const renderer = new CanvasRenderer(canvas, nextCanvas, {
 *     cellSize: 30,
 *     ghostPieceEnabled: true,
 *     gridLinesEnabled: true
 * });
 * 
 * @example
 * // 渲染游戏状态
 * const gameState = {
 *     board: gameEngine.getBoard(),
 *     currentTetromino: gameEngine.getCurrentTetromino(),
 *     nextTetromino: gameEngine.getNextTetromino(),
 *     ghostY: gameEngine.getGhostY(),
 *     gameState: 'playing'
 * };
 * renderer.render(gameState);
 * 
 * @example
 * // 动态切换渲染选项
 * renderer.setGhostPieceEnabled(false);  // 关闭Ghost Piece
 * renderer.setGridLinesEnabled(true);    // 开启网格线
 */
class CanvasRenderer {
    /**
     * 创建Canvas渲染器实例
     * 
     * @constructor
     * @param {HTMLCanvasElement} canvas - 主游戏Canvas元素，用于渲染游戏棋盘
     * @param {HTMLCanvasElement|null} [nextPieceCanvas=null] - 下一个方块预览Canvas元素，可选
     * @param {Object} [options={}] - 配置选项对象
     * @param {number} [options.cellSize=30] - 单元格大小（像素），默认30px
     * @param {boolean} [options.ghostPieceEnabled=true] - 是否显示Ghost Piece
     * @param {boolean} [options.gridLinesEnabled=true] - 是否显示网格线
     * @param {string} [options.gridLineColor='#333333'] - 网格线颜色
     * @param {number} [options.gridLineWidth=1] - 网格线宽度（像素）
     * 
     * @throws {Error} 如果canvas参数无效
     * 
     * @example
     * // 基本创建
     * const renderer = new CanvasRenderer(canvas);
     * 
     * @example
     * // 带完整配置创建
     * const renderer = new CanvasRenderer(canvas, nextCanvas, {
     *     cellSize: 25,
     *     ghostPieceEnabled: true,
     *     gridLinesEnabled: false
     * });
     */
    constructor(canvas, nextPieceCanvas = null, optionsOrHoldCanvas = null, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.nextPieceCanvas = nextPieceCanvas;
        this.nextPieceCtx = nextPieceCanvas ? nextPieceCanvas.getContext('2d') : null;
        
        // 处理参数向后兼容：第三个参数可能是 holdCanvas 或 options
        let holdPieceCanvas = null;
        let finalOptions = options;
        
        if (optionsOrHoldCanvas !== null && typeof optionsOrHoldCanvas === 'object' && optionsOrHoldCanvas.getContext) {
            // 第三个参数是 canvas 元素
            holdPieceCanvas = optionsOrHoldCanvas;
        } else if (optionsOrHoldCanvas !== null && typeof optionsOrHoldCanvas === 'object') {
            // 第三个参数是 options 对象
            finalOptions = optionsOrHoldCanvas;
        }
        
        this.holdPieceCanvas = holdPieceCanvas;
        this.holdPieceCtx = holdPieceCanvas ? holdPieceCanvas.getContext('2d') : null;
        
        // 计算单元格大小
        this.cellSize = finalOptions.cellSize || DEFAULT_CELL_SIZE;
        
        // 渲染选项（从 options 中提取或使用默认值）
        // Requirements: 3.1 - Ghost piece toggle option
        this.renderOptions = {
            ghostPieceEnabled: finalOptions.ghostPieceEnabled !== undefined 
                ? finalOptions.ghostPieceEnabled 
                : DEFAULT_RENDER_OPTIONS.ghostPieceEnabled,
            gridLinesEnabled: finalOptions.gridLinesEnabled !== undefined 
                ? finalOptions.gridLinesEnabled 
                : DEFAULT_RENDER_OPTIONS.gridLinesEnabled,
            gridLineColor: finalOptions.gridLineColor || DEFAULT_RENDER_OPTIONS.gridLineColor,
            gridLineWidth: finalOptions.gridLineWidth || DEFAULT_RENDER_OPTIONS.gridLineWidth
        };
        
        // 动画状态
        this.lineClearAnimation = null;
        this.isAnimating = false;
        
        // 帧率控制
        this.lastFrameTime = 0;
        this.frameCount = 0;
        this.fps = 0;
        this.fpsUpdateInterval = 1000; // 每秒更新FPS
        this.lastFpsUpdate = 0;
        
        // 游戏循环
        this.animationFrameId = null;
        this.gameLoop = null;
        
        // 初始化Canvas
        this._initCanvas();
    }
    
    /**
     * 初始化Canvas设置
     * 设置Canvas尺寸和渲染属性，确保正确的像素渲染
     * 
     * @private
     * @description
     * 此方法执行以下初始化操作：
     * 1. 根据棋盘尺寸和单元格大小计算Canvas尺寸
     * 2. 禁用图像平滑以获得清晰的像素渲染
     * 3. 初始化下一个方块预览Canvas（如果存在）
     * 
     * Requirements: 10.1
     */
    _initCanvas() {
        // 设置Canvas尺寸
        this.canvas.width = BOARD_WIDTH * this.cellSize;
        this.canvas.height = BOARD_HEIGHT * this.cellSize;
        
        // 设置渲染属性
        this.ctx.imageSmoothingEnabled = false;
        
        // 初始化下一个方块预览Canvas
        if (this.nextPieceCanvas && this.nextPieceCtx) {
            this.nextPieceCanvas.width = 4 * this.cellSize;
            this.nextPieceCanvas.height = 4 * this.cellSize;
            this.nextPieceCtx.imageSmoothingEnabled = false;
        }
        
        // 初始化暂存区Canvas
        if (this.holdPieceCanvas && this.holdPieceCtx) {
            this.holdPieceCanvas.width = 4 * this.cellSize;
            this.holdPieceCanvas.height = 4 * this.cellSize;
            this.holdPieceCtx.imageSmoothingEnabled = false;
        }
    }
    
    /**
     * 渲染完整游戏状态
     * 
     * 这是主要的渲染入口方法，负责协调所有渲染子任务。
     * 按照正确的层次顺序渲染游戏的各个视觉元素。
     * 
     * @param {GameState} gameState - 游戏状态对象
     * @param {number[][]} gameState.board - 棋盘网格数据
     * @param {Tetromino|null} gameState.currentTetromino - 当前活动方块
     * @param {Tetromino|null} gameState.nextTetromino - 下一个方块
     * @param {number|null} gameState.ghostY - Ghost Piece的Y坐标
     * @param {string} gameState.gameState - 游戏状态字符串
     * 
     * @description
     * 渲染顺序（从底层到顶层）：
     * 1. 清空画布
     * 2. 渲染背景
     * 3. 渲染已放置的方块
     * 4. 渲染Ghost Piece（如果启用且游戏进行中）
     * 5. 渲染当前活动方块
     * 6. 渲染网格线（如果启用）
     * 7. 渲染下一个方块预览
     * 8. 渲染游戏结束画面（如果游戏结束）
     * 
     * @example
     * const gameState = gameEngine.getState();
     * renderer.render(gameState);
     */
    render(gameState) {
        // 清空画布
        this._clearCanvas();
        
        // 渲染棋盘背景和网格
        this._renderBackground();
        
        // 渲染已放置的方块
        this.renderBoard(gameState.board);
        
        // 渲染Ghost Piece（如果有当前方块且设置启用）
        // Requirements: 3.1 - Ghost piece toggle option
        if (gameState.currentTetromino && gameState.gameState === 'playing' && this.renderOptions.ghostPieceEnabled) {
            this.renderGhostPiece(gameState.currentTetromino, gameState.ghostY);
        }
        
        // 渲染当前方块
        if (gameState.currentTetromino) {
            this.renderTetromino(gameState.currentTetromino);
        }
        
        // 渲染网格线（如果设置启用）
        if (this.renderOptions.gridLinesEnabled) {
            this._renderGridLines();
        }
        
        // 渲染下一个方块预览
        if (gameState.nextTetromino) {
            this.renderNextPiece(gameState.nextTetromino);
        }
        
        // 渲染暂存区方块
        if (this.holdPieceCtx) {
            this.renderHoldPiece(gameState.holdTetromino, gameState.canHold);
        }
        
        // 渲染游戏结束画面
        if (gameState.gameState === 'gameover') {
            this.renderGameOver();
        }
    }
    
    /**
     * 清空画布
     * 使用clearRect清除整个Canvas区域，为新一帧渲染做准备
     * 
     * @private
     */
    _clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    /**
     * 渲染背景
     * 使用预定义的背景颜色填充整个Canvas区域
     * 
     * @private
     */
    _renderBackground() {
        this.ctx.fillStyle = GRID_BACKGROUND_COLOR;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    /**
     * 渲染网格线
     * 在棋盘上绘制垂直和水平网格线，帮助玩家定位方块
     * 
     * @private
     * @description
     * 网格线的显示可以通过renderOptions.gridLinesEnabled控制。
     * 使用renderOptions中配置的颜色和宽度绘制网格线。
     * 
     * Requirements: 3.2 - Grid lines toggle option
     */
    _renderGridLines() {
        this.ctx.strokeStyle = GRID_LINE_COLOR;
        this.ctx.lineWidth = 1;
        
        // 垂直线
        for (let x = 0; x <= BOARD_WIDTH; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.cellSize, 0);
            this.ctx.lineTo(x * this.cellSize, this.canvas.height);
            this.ctx.stroke();
        }
        
        // 水平线
        for (let y = 0; y <= BOARD_HEIGHT; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.cellSize);
            this.ctx.lineTo(this.canvas.width, y * this.cellSize);
            this.ctx.stroke();
        }
    }
    
    /**
     * 渲染棋盘上已放置的方块
     * 
     * 遍历棋盘网格，为每个非空单元格渲染对应颜色的方块。
     * 
     * @param {number[][]} board - 棋盘网格数据，二维数组
     *   - 0 表示空单元格
     *   - 1-7 表示不同类型的方块（对应TETROMINO_TYPES索引+1）
     * 
     * @description
     * 方块类型与颜色的映射通过TETROMINO_TYPES和TETROMINO_COLORS常量定义。
     * 每个单元格的值减1后对应TETROMINO_TYPES数组的索引。
     * 
     * Requirements: 9.5
     * 
     * @example
     * // 渲染一个包含已放置方块的棋盘
     * const board = gameEngine.getBoard();
     * renderer.renderBoard(board);
     */
    renderBoard(board) {
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            for (let x = 0; x < BOARD_WIDTH; x++) {
                const cellValue = board[y][x];
                if (cellValue !== 0) {
                    // 获取方块类型对应的颜色
                    const tetrominoType = TETROMINO_TYPES[cellValue - 1];
                    const color = TETROMINO_COLORS[tetrominoType];
                    this._renderCell(x, y, color);
                }
            }
        }
    }
    
    /**
     * 渲染单个单元格
     * 
     * 在指定位置绘制一个带有3D效果的方块单元格。
     * 包含高光（左上角）和阴影（右下角）效果，使方块看起来更立体。
     * 
     * @private
     * @param {number} x - 单元格的X坐标（网格坐标，非像素）
     * @param {number} y - 单元格的Y坐标（网格坐标，非像素）
     * @param {string} color - 单元格的填充颜色（CSS颜色值）
     * @param {number} [alpha=1] - 透明度（0-1），默认为1（完全不透明）
     * 
     * @description
     * 渲染效果包括：
     * 1. 主体颜色填充（留1像素边距）
     * 2. 左上角高光效果（白色半透明）
     * 3. 右下角阴影效果（黑色半透明）
     */
    _renderCell(x, y, color, alpha = 1) {
        const pixelX = x * this.cellSize;
        const pixelY = y * this.cellSize;
        const size = this.cellSize;
        
        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        
        // 填充主体颜色
        this.ctx.fillStyle = color;
        this.ctx.fillRect(pixelX + 1, pixelY + 1, size - 2, size - 2);
        
        // 添加高光效果（左上角）
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.fillRect(pixelX + 1, pixelY + 1, size - 2, 3);
        this.ctx.fillRect(pixelX + 1, pixelY + 1, 3, size - 2);
        
        // 添加阴影效果（右下角）
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(pixelX + size - 4, pixelY + 4, 3, size - 5);
        this.ctx.fillRect(pixelX + 4, pixelY + size - 4, size - 5, 3);
        
        this.ctx.restore();
    }
    
    /**
     * 渲染当前活动方块
     * 
     * 根据方块的形状、位置和颜色，在棋盘上渲染当前玩家控制的方块。
     * 
     * @param {Tetromino} tetromino - 方块对象
     * @param {number[][]} tetromino.shape - 方块形状矩阵
     * @param {string} tetromino.color - 方块颜色
     * @param {number} tetromino.x - 方块X坐标
     * @param {number} tetromino.y - 方块Y坐标
     * 
     * @description
     * 只渲染在棋盘可见范围内的方块部分。
     * 方块可能部分位于棋盘顶部之外（y < 0），这些部分不会被渲染。
     * 
     * Requirements: 9.5
     * 
     * @example
     * const currentTetromino = gameEngine.getCurrentTetromino();
     * if (currentTetromino) {
     *     renderer.renderTetromino(currentTetromino);
     * }
     */
    renderTetromino(tetromino) {
        const shape = tetromino.shape;
        const color = tetromino.color;
        
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col] !== 0) {
                    const x = tetromino.x + col;
                    const y = tetromino.y + row;
                    
                    // 只渲染在棋盘范围内的部分
                    if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) {
                        this._renderCell(x, y, color);
                    }
                }
            }
        }
    }
    
    /**
     * 渲染Ghost Piece（硬降预览）
     * 
     * 在方块将要落下的位置显示一个半透明的预览，帮助玩家预判硬降位置。
     * 
     * @param {Tetromino} tetromino - 当前方块对象
     * @param {number} ghostY - Ghost Piece的Y坐标（方块硬降后的最终Y位置）
     * 
     * @description
     * Ghost Piece使用与当前方块相同的形状和颜色，但透明度降低（由GHOST_PIECE_ALPHA定义）。
     * 如果ghostY与当前方块的Y坐标相同，则不渲染Ghost Piece（避免重叠）。
     * 
     * 此功能可以通过setGhostPieceEnabled()方法或renderOptions.ghostPieceEnabled控制。
     * 
     * Requirements: 10.3, 3.1 - Ghost piece toggle option
     * 
     * @example
     * const ghostY = gameEngine.calculateGhostY();
     * renderer.renderGhostPiece(currentTetromino, ghostY);
     */
    renderGhostPiece(tetromino, ghostY) {
        if (ghostY === null || ghostY === undefined || ghostY === tetromino.y) {
            return; // 不需要渲染Ghost Piece
        }
        
        const shape = tetromino.shape;
        const color = tetromino.color;
        
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col] !== 0) {
                    const x = tetromino.x + col;
                    const y = ghostY + row;
                    
                    // 只渲染在棋盘范围内的部分
                    if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) {
                        this._renderCell(x, y, color, GHOST_PIECE_ALPHA);
                    }
                }
            }
        }
    }
    
    /**
     * 渲染下一个方块预览
     * 
     * 在预览Canvas上显示下一个将要出现的方块，帮助玩家提前规划。
     * 
     * @param {Tetromino} tetromino - 下一个方块对象
     * @param {number[][]} tetromino.shape - 方块形状矩阵
     * @param {string} tetromino.color - 方块颜色
     * 
     * @description
     * 方块会在预览Canvas中居中显示。
     * 如果没有配置nextPieceCanvas，此方法不执行任何操作。
     * 
     * @example
     * const nextTetromino = gameEngine.getNextTetromino();
     * if (nextTetromino) {
     *     renderer.renderNextPiece(nextTetromino);
     * }
     */
    renderNextPiece(tetromino) {
        if (!this.nextPieceCtx) return;
        
        const ctx = this.nextPieceCtx;
        const canvas = this.nextPieceCanvas;
        
        // 清空预览画布
        ctx.fillStyle = GRID_BACKGROUND_COLOR;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const shape = tetromino.shape;
        const color = tetromino.color;
        
        // 计算居中偏移
        const shapeWidth = shape[0].length;
        const shapeHeight = shape.length;
        const offsetX = Math.floor((4 - shapeWidth) / 2);
        const offsetY = Math.floor((4 - shapeHeight) / 2);
        
        // 渲染方块
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col] !== 0) {
                    const x = offsetX + col;
                    const y = offsetY + row;
                    this._renderNextPieceCell(ctx, x, y, color);
                }
            }
        }
        
        // 渲染边框
        ctx.strokeStyle = GRID_LINE_COLOR;
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
    }
    
    /**
     * 渲染下一个方块预览的单元格
     * 
     * 在预览Canvas上绘制单个方块单元格，带有3D效果。
     * 
     * @private
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D渲染上下文
     * @param {number} x - 单元格X坐标（网格坐标）
     * @param {number} y - 单元格Y坐标（网格坐标）
     * @param {string} color - 单元格颜色（CSS颜色值）
     */
    _renderNextPieceCell(ctx, x, y, color) {
        const pixelX = x * this.cellSize;
        const pixelY = y * this.cellSize;
        const size = this.cellSize;
        
        // 填充主体颜色
        ctx.fillStyle = color;
        ctx.fillRect(pixelX + 1, pixelY + 1, size - 2, size - 2);
        
        // 添加高光效果
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(pixelX + 1, pixelY + 1, size - 2, 3);
        ctx.fillRect(pixelX + 1, pixelY + 1, 3, size - 2);
        
        // 添加阴影效果
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(pixelX + size - 4, pixelY + 4, 3, size - 5);
        ctx.fillRect(pixelX + 4, pixelY + size - 4, size - 5, 3);
    }
    
    /**
     * 渲染暂存区方块
     * 
     * 在暂存区Canvas上显示当前暂存的方块。
     * 如果暂存区为空或者不可用，显示为灰色状态。
     * 
     * @param {Tetromino|null} tetromino - 暂存的方块对象
     * @param {boolean} canHold - 是否可以使用暂存功能
     * 
     * @description
     * 方块会在暂存区Canvas中居中显示。
     * 如果没有配置holdPieceCanvas，此方法不执行任何操作。
     * 当 canHold 为 false 时，方块会以半透明显示，表示暂存功能暂不可用。
     */
    renderHoldPiece(tetromino, canHold = true) {
        if (!this.holdPieceCtx) return;
        
        const ctx = this.holdPieceCtx;
        const canvas = this.holdPieceCanvas;
        
        // 清空暂存区画布
        ctx.fillStyle = GRID_BACKGROUND_COLOR;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (tetromino) {
            const shape = tetromino.shape;
            const color = tetromino.color;
            
            // 计算居中偏移
            const shapeWidth = shape[0].length;
            const shapeHeight = shape.length;
            const offsetX = Math.floor((4 - shapeWidth) / 2);
            const offsetY = Math.floor((4 - shapeHeight) / 2);
            
            // 渲染方块
            ctx.save();
            if (!canHold) {
                ctx.globalAlpha = 0.4;
            }
            
            for (let row = 0; row < shape.length; row++) {
                for (let col = 0; col < shape[row].length; col++) {
                    if (shape[row][col] !== 0) {
                        const x = offsetX + col;
                        const y = offsetY + row;
                        this._renderHoldPieceCell(ctx, x, y, color);
                    }
                }
            }
            
            ctx.restore();
        }
        
        // 渲染边框
        ctx.strokeStyle = canHold ? GRID_LINE_COLOR : '#555555';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
    }
    
    /**
     * 渲染暂存区方块的单元格
     * 
     * 在暂存区Canvas上绘制单个方块单元格，带有3D效果。
     * 
     * @private
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D渲染上下文
     * @param {number} x - 单元格X坐标（网格坐标）
     * @param {number} y - 单元格Y坐标（网格坐标）
     * @param {string} color - 单元格颜色（CSS颜色值）
     */
    _renderHoldPieceCell(ctx, x, y, color) {
        const pixelX = x * this.cellSize;
        const pixelY = y * this.cellSize;
        const size = this.cellSize;
        
        // 填充主体颜色
        ctx.fillStyle = color;
        ctx.fillRect(pixelX + 1, pixelY + 1, size - 2, size - 2);
        
        // 添加高光效果
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(pixelX + 1, pixelY + 1, size - 2, 3);
        ctx.fillRect(pixelX + 1, pixelY + 1, 3, size - 2);
        
        // 添加阴影效果
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(pixelX + size - 4, pixelY + 4, 3, size - 5);
        ctx.fillRect(pixelX + 4, pixelY + size - 4, size - 5, 3);
    }
    
    /**
     * 渲染分数（在Canvas上）
     * 
     * 在Canvas左上角显示当前分数。
     * 注意：分数通常在HTML元素中显示，此方法可用于Canvas内显示备用方案。
     * 
     * @param {number} score - 当前分数
     * 
     * @example
     * renderer.renderScore(12500);
     */
    renderScore(score) {
        // 分数通常在HTML元素中显示，此方法可用于Canvas内显示
        this.ctx.save();
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Score: ${score}`, 10, 20);
        this.ctx.restore();
    }
    
    /**
     * 渲染游戏结束画面
     * 
     * 在棋盘上显示半透明遮罩和"GAME OVER"文字，提示玩家游戏已结束。
     * 
     * @description
     * 显示内容包括：
     * 1. 半透明黑色遮罩覆盖整个棋盘
     * 2. 居中显示"GAME OVER"大标题
     * 3. 提示文字"Press Restart to play again"
     * 
     * Requirements: 5.3
     * 
     * @example
     * if (gameState === 'gameover') {
     *     renderer.renderGameOver();
     * }
     */
    renderGameOver() {
        // 半透明遮罩
        this.ctx.fillStyle = GAME_OVER_OVERLAY_COLOR;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 游戏结束文字
        this.ctx.save();
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 32px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        this.ctx.fillText('GAME OVER', centerX, centerY - 20);
        
        this.ctx.font = '18px Arial';
        this.ctx.fillText('Press Restart to play again', centerX, centerY + 20);
        
        this.ctx.restore();
    }
    
    /**
     * 执行行消除动画
     * 
     * 对指定的行执行闪烁动画效果，然后返回Promise表示动画完成。
     * 
     * @param {number[]} lines - 要消除的行索引数组（Y坐标）
     * @returns {Promise<void>} 动画完成时resolve的Promise
     * 
     * @description
     * 动画效果：
     * 1. 持续时间由LINE_CLEAR_ANIMATION_DURATION定义（默认300ms）
     * 2. 闪烁次数由LINE_CLEAR_FLASH_COUNT定义（默认3次）
     * 3. 行在白色和背景色之间交替闪烁
     * 
     * 使用requestAnimationFrame实现平滑动画。
     * 动画期间isAnimating属性为true。
     * 
     * Requirements: 9.6
     * 
     * @example
     * // 消除第18和19行
     * const linesToClear = [18, 19];
     * await renderer.animateLineClear(linesToClear);
     * // 动画完成后继续执行
     * gameEngine.removeLines(linesToClear);
     */
    animateLineClear(lines) {
        return new Promise((resolve) => {
            if (!lines || lines.length === 0) {
                resolve();
                return;
            }
            
            this.isAnimating = true;
            const startTime = performance.now();
            const duration = LINE_CLEAR_ANIMATION_DURATION;
            
            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // 闪烁效果
                const flashPhase = Math.floor(progress * LINE_CLEAR_FLASH_COUNT * 2);
                const isFlashOn = flashPhase % 2 === 0;
                
                // 渲染闪烁的行
                for (const lineY of lines) {
                    if (isFlashOn) {
                        this.ctx.fillStyle = '#ffffff';
                    } else {
                        this.ctx.fillStyle = GRID_BACKGROUND_COLOR;
                    }
                    this.ctx.fillRect(
                        0,
                        lineY * this.cellSize,
                        this.canvas.width,
                        this.cellSize
                    );
                }
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.isAnimating = false;
                    resolve();
                }
            };
            
            requestAnimationFrame(animate);
        });
    }
    
    /**
     * 启动游戏渲染循环
     * 
     * 使用requestAnimationFrame启动持续的渲染循环，并跟踪帧率。
     * 
     * @param {Function} updateCallback - 每帧调用的更新函数
     * @param {number} updateCallback.deltaTime - 距上一帧的时间间隔（毫秒）
     * 
     * @description
     * 渲染循环功能：
     * 1. 计算每帧的deltaTime（帧间隔时间）
     * 2. 跟踪和计算FPS（每秒更新一次）
     * 3. 调用提供的updateCallback进行游戏逻辑更新
     * 4. 持续循环直到调用stopGameLoop()
     * 
     * Requirements: 10.2
     * 
     * @example
     * renderer.startGameLoop((deltaTime) => {
     *     // 更新游戏逻辑
     *     gameEngine.update(deltaTime);
     *     // 渲染新状态
     *     renderer.render(gameEngine.getState());
     * });
     */
    startGameLoop(updateCallback) {
        this.lastFrameTime = performance.now();
        this.lastFpsUpdate = this.lastFrameTime;
        this.frameCount = 0;
        
        const loop = (currentTime) => {
            // 计算帧间隔
            const deltaTime = currentTime - this.lastFrameTime;
            this.lastFrameTime = currentTime;
            
            // 更新FPS计数
            this.frameCount++;
            if (currentTime - this.lastFpsUpdate >= this.fpsUpdateInterval) {
                this.fps = Math.round(this.frameCount * 1000 / (currentTime - this.lastFpsUpdate));
                this.frameCount = 0;
                this.lastFpsUpdate = currentTime;
            }
            
            // 调用更新回调
            if (updateCallback) {
                updateCallback(deltaTime);
            }
            
            // 继续循环
            this.animationFrameId = requestAnimationFrame(loop);
        };
        
        this.animationFrameId = requestAnimationFrame(loop);
    }
    
    /**
     * 停止游戏渲染循环
     * 
     * 取消当前的requestAnimationFrame循环，停止渲染更新。
     * 
     * @description
     * 调用此方法后，渲染循环将停止，不再调用updateCallback。
     * 可以通过再次调用startGameLoop()重新启动循环。
     * 
     * @example
     * // 暂停游戏时停止渲染循环
     * renderer.stopGameLoop();
     */
    stopGameLoop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }
    
    /**
     * 获取当前FPS（每秒帧数）
     * 
     * @returns {number} 当前帧率，每秒更新一次
     * 
     * @example
     * const fps = renderer.getFPS();
     * console.log(`当前帧率: ${fps} FPS`);
     */
    getFPS() {
        return this.fps;
    }
    
    /**
     * 检查帧率是否稳定
     * 
     * 判断当前帧率是否达到可接受的最低标准（30+ FPS）。
     * 
     * @returns {boolean} 如果帧率>=30则返回true，否则返回false
     * 
     * @description
     * 30 FPS被认为是游戏流畅运行的最低标准。
     * 低于此值可能导致游戏体验不佳。
     * 
     * Requirements: 10.2
     * 
     * @example
     * if (!renderer.isFrameRateStable()) {
     *     console.warn('帧率过低，可能影响游戏体验');
     * }
     */
    isFrameRateStable() {
        return this.fps >= 30;
    }
    
    /**
     * 设置单元格大小
     * 
     * 更改方块单元格的像素大小，并重新初始化Canvas尺寸。
     * 
     * @param {number} size - 新的单元格大小（像素）
     * 
     * @description
     * 更改单元格大小会影响：
     * 1. Canvas的总尺寸
     * 2. 所有方块的渲染大小
     * 3. 网格线的间距
     * 
     * @example
     * // 设置更大的单元格以适应高分辨率显示
     * renderer.setCellSize(40);
     */
    setCellSize(size) {
        this.cellSize = size;
        this._initCanvas();
    }
    
    /**
     * 获取Canvas元素
     * 
     * @returns {HTMLCanvasElement} 主游戏Canvas元素
     * 
     * @example
     * const canvas = renderer.getCanvas();
     * canvas.style.border = '2px solid white';
     */
    getCanvas() {
        return this.canvas;
    }
    
    /**
     * 获取Canvas 2D渲染上下文
     * 
     * @returns {CanvasRenderingContext2D} Canvas 2D渲染上下文
     * 
     * @example
     * const ctx = renderer.getContext();
     * ctx.fillStyle = 'red';
     * ctx.fillRect(0, 0, 10, 10);
     */
    getContext() {
        return this.ctx;
    }
    
    /**
     * 设置渲染选项
     * 
     * 动态配置渲染行为，如Ghost Piece和网格线的显示。
     * 设置变化会立即生效，无需重启游戏。
     * 
     * @param {Object} options - 渲染选项对象
     * @param {boolean} [options.ghostPieceEnabled] - 是否显示Ghost Piece
     * @param {boolean} [options.gridLinesEnabled] - 是否显示网格线
     * @param {string} [options.gridLineColor] - 网格线颜色（CSS颜色值）
     * @param {number} [options.gridLineWidth] - 网格线宽度（像素）
     * 
     * @description
     * 只有提供的选项会被更新，未提供的选项保持原值。
     * 这允许部分更新渲染选项而不影响其他设置。
     * 
     * Requirements: 3.1 - Ghost piece toggle option
     * Requirements: 3.5 - Settings changes apply immediately
     * 
     * @example
     * // 只更新Ghost Piece设置
     * renderer.setRenderOptions({ ghostPieceEnabled: false });
     * 
     * @example
     * // 更新多个选项
     * renderer.setRenderOptions({
     *     ghostPieceEnabled: true,
     *     gridLinesEnabled: false,
     *     gridLineColor: '#444444'
     * });
     */
    setRenderOptions(options) {
        if (!options || typeof options !== 'object') {
            return;
        }
        
        // 只更新提供的选项
        if (options.ghostPieceEnabled !== undefined) {
            this.renderOptions.ghostPieceEnabled = Boolean(options.ghostPieceEnabled);
        }
        if (options.gridLinesEnabled !== undefined) {
            this.renderOptions.gridLinesEnabled = Boolean(options.gridLinesEnabled);
        }
        if (options.gridLineColor !== undefined) {
            this.renderOptions.gridLineColor = String(options.gridLineColor);
        }
        if (options.gridLineWidth !== undefined) {
            this.renderOptions.gridLineWidth = Number(options.gridLineWidth);
        }
    }
    
    /**
     * 获取当前渲染选项
     * 
     * 返回当前渲染选项的副本，包括Ghost Piece、网格线等设置。
     * 
     * @returns {RenderOptions} 当前渲染选项的副本
     * 
     * @example
     * const options = renderer.getRenderOptions();
     * console.log('Ghost Piece启用:', options.ghostPieceEnabled);
     * console.log('网格线启用:', options.gridLinesEnabled);
     */
    getRenderOptions() {
        return { ...this.renderOptions };
    }
    
    /**
     * 检查Ghost Piece是否启用
     * 
     * @returns {boolean} 如果Ghost Piece显示启用则返回true
     * 
     * @example
     * if (renderer.isGhostPieceEnabled()) {
     *     console.log('Ghost Piece已启用');
     * }
     */
    isGhostPieceEnabled() {
        return this.renderOptions.ghostPieceEnabled;
    }
    
    /**
     * 设置Ghost Piece是否启用
     * 
     * 控制是否显示硬降预览（Ghost Piece）。
     * 设置立即生效，下一帧渲染时会反映变化。
     * 
     * @param {boolean} enabled - 是否启用Ghost Piece显示
     * 
     * Requirements: 3.1 - Ghost piece toggle option
     * 
     * @example
     * // 关闭Ghost Piece显示
     * renderer.setGhostPieceEnabled(false);
     */
    setGhostPieceEnabled(enabled) {
        this.renderOptions.ghostPieceEnabled = Boolean(enabled);
    }
    
    /**
     * 检查网格线是否启用
     * 
     * @returns {boolean} 如果网格线显示启用则返回true
     * 
     * @example
     * if (renderer.isGridLinesEnabled()) {
     *     console.log('网格线已启用');
     * }
     */
    isGridLinesEnabled() {
        return this.renderOptions.gridLinesEnabled;
    }
    
    /**
     * 设置网格线是否启用
     * 
     * 控制是否在棋盘上显示网格线。
     * 设置立即生效，下一帧渲染时会反映变化。
     * 
     * @param {boolean} enabled - 是否启用网格线显示
     * 
     * Requirements: 3.2 - Grid lines toggle option
     * 
     * @example
     * // 开启网格线显示
     * renderer.setGridLinesEnabled(true);
     */
    setGridLinesEnabled(enabled) {
        this.renderOptions.gridLinesEnabled = Boolean(enabled);
    }
}

// 导出模块
export {
    CanvasRenderer,
    DEFAULT_CELL_SIZE,
    DEFAULT_RENDER_OPTIONS,
    GRID_LINE_COLOR,
    GRID_BACKGROUND_COLOR,
    GHOST_PIECE_ALPHA,
    LINE_CLEAR_ANIMATION_DURATION
};
