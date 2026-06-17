/**
 * CanvasRenderer Unit Tests
 * 
 * Tests for the Canvas rendering functionality
 * Requirements: 10.1, 10.2, 10.3, 9.5, 9.6, 5.3
 */

import { jest } from '@jest/globals';
import {
    CanvasRenderer,
    DEFAULT_CELL_SIZE,
    DEFAULT_RENDER_OPTIONS,
    GRID_LINE_COLOR,
    GRID_BACKGROUND_COLOR,
    GHOST_PIECE_ALPHA,
    LINE_CLEAR_ANIMATION_DURATION
} from './canvas-renderer.js';
import { Tetromino, TETROMINO_COLORS, TETROMINO_TYPES } from '../core/tetromino.js';
import { BOARD_WIDTH, BOARD_HEIGHT } from '../core/board-manager.js';

// Mock canvas and context
function createMockCanvas() {
    const mockContext = {
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        font: '',
        textAlign: '',
        textBaseline: '',
        globalAlpha: 1,
        imageSmoothingEnabled: true,
        fillRect: jest.fn(),
        strokeRect: jest.fn(),
        clearRect: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        stroke: jest.fn(),
        fillText: jest.fn(),
        save: jest.fn(),
        restore: jest.fn()
    };
    
    const mockCanvas = {
        width: 300,
        height: 600,
        getContext: jest.fn(() => mockContext)
    };
    
    return { canvas: mockCanvas, ctx: mockContext };
}

describe('CanvasRenderer', () => {
    let renderer;
    let mockCanvas;
    let mockCtx;
    let mockNextCanvas;
    let mockNextCtx;
    
    beforeEach(() => {
        const main = createMockCanvas();
        mockCanvas = main.canvas;
        mockCtx = main.ctx;
        
        const next = createMockCanvas();
        mockNextCanvas = next.canvas;
        mockNextCtx = next.ctx;
        
        renderer = new CanvasRenderer(mockCanvas, mockNextCanvas);
    });
    
    describe('Initialization (Requirement 10.1)', () => {
        test('should initialize with default cell size', () => {
            expect(renderer.cellSize).toBe(DEFAULT_CELL_SIZE);
        });
        
        test('should initialize with custom cell size', () => {
            const customRenderer = new CanvasRenderer(mockCanvas, null, { cellSize: 25 });
            expect(customRenderer.cellSize).toBe(25);
        });
        
        test('should set canvas dimensions based on board size', () => {
            expect(mockCanvas.width).toBe(BOARD_WIDTH * DEFAULT_CELL_SIZE);
            expect(mockCanvas.height).toBe(BOARD_HEIGHT * DEFAULT_CELL_SIZE);
        });
        
        test('should get 2D context from canvas', () => {
            expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');
        });
        
        test('should initialize next piece canvas if provided', () => {
            expect(mockNextCanvas.getContext).toHaveBeenCalledWith('2d');
            expect(mockNextCanvas.width).toBe(4 * DEFAULT_CELL_SIZE);
            expect(mockNextCanvas.height).toBe(4 * DEFAULT_CELL_SIZE);
        });
        
        test('should work without next piece canvas', () => {
            const rendererWithoutNext = new CanvasRenderer(mockCanvas);
            expect(rendererWithoutNext.nextPieceCanvas).toBeNull();
            expect(rendererWithoutNext.nextPieceCtx).toBeNull();
        });
    });
    
    describe('Board Rendering (Requirement 9.5)', () => {
        test('should render empty board without filling cells', () => {
            const emptyBoard = Array(BOARD_HEIGHT).fill(null).map(() => 
                Array(BOARD_WIDTH).fill(0)
            );
            
            mockCtx.fillRect.mockClear();
            renderer.renderBoard(emptyBoard);
            
            // Should not render any cells for empty board
            // (fillRect is only called for non-zero cells)
            expect(mockCtx.fillRect).not.toHaveBeenCalled();
        });
        
        test('should render placed blocks with correct colors', () => {
            const board = Array(BOARD_HEIGHT).fill(null).map(() => 
                Array(BOARD_WIDTH).fill(0)
            );
            // Place an I-piece (type index 1) at position (0, 19)
            board[19][0] = 1;
            
            mockCtx.fillRect.mockClear();
            renderer.renderBoard(board);
            
            // Should have called fillRect for the cell
            expect(mockCtx.fillRect).toHaveBeenCalled();
        });
        
        test('should use distinct colors for each tetromino type', () => {
            // Verify all 7 tetromino types have distinct colors
            const colors = Object.values(TETROMINO_COLORS);
            const uniqueColors = new Set(colors);
            expect(uniqueColors.size).toBe(7);
        });
    });
    
    describe('Tetromino Rendering (Requirement 9.5)', () => {
        test('should render tetromino at correct position', () => {
            const tetromino = new Tetromino('T', 3, 5);
            
            mockCtx.fillRect.mockClear();
            renderer.renderTetromino(tetromino);
            
            // T-piece has 4 cells, should render them
            expect(mockCtx.fillRect).toHaveBeenCalled();
        });
        
        test('should render all 7 tetromino types', () => {
            for (const type of TETROMINO_TYPES) {
                const tetromino = new Tetromino(type, 3, 5);
                mockCtx.fillRect.mockClear();
                
                renderer.renderTetromino(tetromino);
                
                expect(mockCtx.fillRect).toHaveBeenCalled();
            }
        });
        
        test('should not render cells outside board boundaries', () => {
            // Create tetromino at top edge (y = -1)
            const tetromino = new Tetromino('I', 0, -1);
            
            mockCtx.fillRect.mockClear();
            renderer.renderTetromino(tetromino);
            
            // Should only render cells that are within bounds
            // I-piece at y=-1 has some cells at y=-1 which should not be rendered
        });
    });
    
    describe('Ghost Piece Rendering (Requirement 10.3)', () => {
        test('should render ghost piece with reduced alpha', () => {
            const tetromino = new Tetromino('T', 3, 0);
            const ghostY = 17;
            
            mockCtx.save.mockClear();
            mockCtx.restore.mockClear();
            
            renderer.renderGhostPiece(tetromino, ghostY);
            
            // Should save and restore context for alpha changes
            expect(mockCtx.save).toHaveBeenCalled();
            expect(mockCtx.restore).toHaveBeenCalled();
        });
        
        test('should not render ghost piece when at same position as tetromino', () => {
            const tetromino = new Tetromino('T', 3, 5);
            const ghostY = 5; // Same as tetromino.y
            
            mockCtx.fillRect.mockClear();
            renderer.renderGhostPiece(tetromino, ghostY);
            
            // Should not render anything
            expect(mockCtx.fillRect).not.toHaveBeenCalled();
        });
        
        test('should not render ghost piece when ghostY is null', () => {
            const tetromino = new Tetromino('T', 3, 5);
            
            mockCtx.fillRect.mockClear();
            renderer.renderGhostPiece(tetromino, null);
            
            expect(mockCtx.fillRect).not.toHaveBeenCalled();
        });
        
        test('should not render ghost piece when ghostY is undefined', () => {
            const tetromino = new Tetromino('T', 3, 5);
            
            mockCtx.fillRect.mockClear();
            renderer.renderGhostPiece(tetromino, undefined);
            
            expect(mockCtx.fillRect).not.toHaveBeenCalled();
        });
    });
    
    describe('Render Options and Ghost Piece Toggle (Requirement 3.1)', () => {
        test('should initialize with default render options', () => {
            const options = renderer.getRenderOptions();
            expect(options.ghostPieceEnabled).toBe(true);
            expect(options.gridLinesEnabled).toBe(true);
        });
        
        test('should initialize with custom render options', () => {
            const customRenderer = new CanvasRenderer(mockCanvas, null, {
                ghostPieceEnabled: false,
                gridLinesEnabled: false
            });
            
            const options = customRenderer.getRenderOptions();
            expect(options.ghostPieceEnabled).toBe(false);
            expect(options.gridLinesEnabled).toBe(false);
        });
        
        test('should set render options via setRenderOptions', () => {
            renderer.setRenderOptions({ ghostPieceEnabled: false });
            expect(renderer.isGhostPieceEnabled()).toBe(false);
            
            renderer.setRenderOptions({ ghostPieceEnabled: true });
            expect(renderer.isGhostPieceEnabled()).toBe(true);
        });
        
        test('should set ghost piece enabled via setGhostPieceEnabled', () => {
            renderer.setGhostPieceEnabled(false);
            expect(renderer.isGhostPieceEnabled()).toBe(false);
            
            renderer.setGhostPieceEnabled(true);
            expect(renderer.isGhostPieceEnabled()).toBe(true);
        });
        
        test('should set grid lines enabled via setGridLinesEnabled', () => {
            renderer.setGridLinesEnabled(false);
            expect(renderer.isGridLinesEnabled()).toBe(false);
            
            renderer.setGridLinesEnabled(true);
            expect(renderer.isGridLinesEnabled()).toBe(true);
        });
        
        test('should not render ghost piece when ghostPieceEnabled is false', () => {
            renderer.setGhostPieceEnabled(false);
            
            const gameState = {
                board: Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0)),
                currentTetromino: new Tetromino('T', 4, 0),
                nextTetromino: new Tetromino('I', 0, 0),
                ghostY: 17,
                gameState: 'playing',
                score: 1000
            };
            
            // Spy on renderGhostPiece
            const ghostSpy = jest.spyOn(renderer, 'renderGhostPiece');
            
            renderer.render(gameState);
            
            // Ghost piece should not be rendered when disabled
            expect(ghostSpy).not.toHaveBeenCalled();
            
            ghostSpy.mockRestore();
        });
        
        test('should render ghost piece when ghostPieceEnabled is true', () => {
            renderer.setGhostPieceEnabled(true);
            
            const gameState = {
                board: Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0)),
                currentTetromino: new Tetromino('T', 4, 0),
                nextTetromino: new Tetromino('I', 0, 0),
                ghostY: 17,
                gameState: 'playing',
                score: 1000
            };
            
            // Spy on renderGhostPiece
            const ghostSpy = jest.spyOn(renderer, 'renderGhostPiece');
            
            renderer.render(gameState);
            
            // Ghost piece should be rendered when enabled
            expect(ghostSpy).toHaveBeenCalled();
            
            ghostSpy.mockRestore();
        });
        
        test('should not render grid lines when gridLinesEnabled is false', () => {
            renderer.setGridLinesEnabled(false);
            
            const gameState = {
                board: Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0)),
                currentTetromino: new Tetromino('T', 4, 0),
                nextTetromino: null,
                ghostY: 17,
                gameState: 'playing',
                score: 1000
            };
            
            // Spy on _renderGridLines
            const gridSpy = jest.spyOn(renderer, '_renderGridLines');
            
            renderer.render(gameState);
            
            // Grid lines should not be rendered when disabled
            expect(gridSpy).not.toHaveBeenCalled();
            
            gridSpy.mockRestore();
        });
        
        test('should render grid lines when gridLinesEnabled is true', () => {
            renderer.setGridLinesEnabled(true);
            
            const gameState = {
                board: Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0)),
                currentTetromino: new Tetromino('T', 4, 0),
                nextTetromino: null,
                ghostY: 17,
                gameState: 'playing',
                score: 1000
            };
            
            // Spy on _renderGridLines
            const gridSpy = jest.spyOn(renderer, '_renderGridLines');
            
            renderer.render(gameState);
            
            // Grid lines should be rendered when enabled
            expect(gridSpy).toHaveBeenCalled();
            
            gridSpy.mockRestore();
        });
        
        test('should handle invalid setRenderOptions input gracefully', () => {
            const originalOptions = renderer.getRenderOptions();
            
            // Should not throw for null
            renderer.setRenderOptions(null);
            expect(renderer.getRenderOptions()).toEqual(originalOptions);
            
            // Should not throw for undefined
            renderer.setRenderOptions(undefined);
            expect(renderer.getRenderOptions()).toEqual(originalOptions);
            
            // Should not throw for non-object
            renderer.setRenderOptions('invalid');
            expect(renderer.getRenderOptions()).toEqual(originalOptions);
        });
        
        test('should only update provided options in setRenderOptions', () => {
            renderer.setRenderOptions({
                ghostPieceEnabled: true,
                gridLinesEnabled: true
            });
            
            // Update only ghostPieceEnabled
            renderer.setRenderOptions({ ghostPieceEnabled: false });
            
            const options = renderer.getRenderOptions();
            expect(options.ghostPieceEnabled).toBe(false);
            expect(options.gridLinesEnabled).toBe(true); // Should remain unchanged
        });
        
        test('should coerce values to correct types in setRenderOptions', () => {
            // Test boolean coercion
            renderer.setRenderOptions({ ghostPieceEnabled: 1 });
            expect(renderer.isGhostPieceEnabled()).toBe(true);
            
            renderer.setRenderOptions({ ghostPieceEnabled: 0 });
            expect(renderer.isGhostPieceEnabled()).toBe(false);
            
            renderer.setRenderOptions({ ghostPieceEnabled: 'true' });
            expect(renderer.isGhostPieceEnabled()).toBe(true);
        });
    });
    
    describe('Next Piece Preview', () => {
        test('should render next piece in preview canvas', () => {
            const tetromino = new Tetromino('O', 0, 0);
            
            mockNextCtx.fillRect.mockClear();
            renderer.renderNextPiece(tetromino);
            
            // Should render the piece
            expect(mockNextCtx.fillRect).toHaveBeenCalled();
        });
        
        test('should center next piece in preview area', () => {
            const tetromino = new Tetromino('I', 0, 0);
            
            mockNextCtx.fillRect.mockClear();
            renderer.renderNextPiece(tetromino);
            
            // Should render with offset for centering
            expect(mockNextCtx.fillRect).toHaveBeenCalled();
        });
        
        test('should not crash when next piece canvas is not provided', () => {
            const rendererWithoutNext = new CanvasRenderer(mockCanvas);
            const tetromino = new Tetromino('T', 0, 0);
            
            // Should not throw
            expect(() => rendererWithoutNext.renderNextPiece(tetromino)).not.toThrow();
        });
    });
    
    describe('Hold Piece Preview (暂存方块)', () => {
        test('setHoldPieceCanvas should bind hold canvas', () => {
            const { canvas: holdCanvas } = createMockCanvas();
            
            renderer.setHoldPieceCanvas(holdCanvas);
            
            expect(renderer.holdPieceCanvas).toBe(holdCanvas);
            expect(renderer.holdPieceCtx).not.toBeNull();
        });
        
        test('renderHoldPiece should render held piece in preview canvas', () => {
            const { canvas: holdCanvas, ctx: holdCtx } = createMockCanvas();
            renderer.setHoldPieceCanvas(holdCanvas);
            const tetromino = new Tetromino('O', 0, 0);
            
            holdCtx.fillRect.mockClear();
            renderer.renderHoldPiece(tetromino, true);
            
            expect(holdCtx.fillRect).toHaveBeenCalled();
        });
        
        test('renderHoldPiece should render empty area when tetromino is null', () => {
            const { canvas: holdCanvas, ctx: holdCtx } = createMockCanvas();
            renderer.setHoldPieceCanvas(holdCanvas);
            
            holdCtx.fillRect.mockClear();
            holdCtx.strokeRect.mockClear();
            renderer.renderHoldPiece(null, true);
            
            // 背景填充与边框仍应渲染
            expect(holdCtx.fillRect).toHaveBeenCalled();
            expect(holdCtx.strokeRect).toHaveBeenCalled();
        });
        
        test('renderHoldPiece should dim piece when canHold is false', () => {
            const { canvas: holdCanvas, ctx: holdCtx } = createMockCanvas();
            renderer.setHoldPieceCanvas(holdCanvas);
            const tetromino = new Tetromino('T', 0, 0);
            
            holdCtx.save.mockClear();
            renderer.renderHoldPiece(tetromino, false);
            
            expect(holdCtx.save).toHaveBeenCalled();
            expect(holdCtx.globalAlpha).toBe(GHOST_PIECE_ALPHA);
        });
        
        test('renderHoldPiece should not throw when hold canvas is not set', () => {
            const tetromino = new Tetromino('I', 0, 0);
            
            expect(() => renderer.renderHoldPiece(tetromino, true)).not.toThrow();
        });
    });
    
    describe('Game Over Rendering (Requirement 5.3)', () => {
        test('should render game over overlay', () => {
            mockCtx.fillRect.mockClear();
            mockCtx.fillText.mockClear();
            
            renderer.renderGameOver();
            
            // Should render overlay background
            expect(mockCtx.fillRect).toHaveBeenCalled();
            // Should render text
            expect(mockCtx.fillText).toHaveBeenCalled();
        });
        
        test('should display GAME OVER text', () => {
            renderer.renderGameOver();
            
            // Check that fillText was called with 'GAME OVER'
            const calls = mockCtx.fillText.mock.calls;
            const hasGameOverText = calls.some(call => call[0].includes('GAME OVER'));
            expect(hasGameOverText).toBe(true);
        });
    });
    
    describe('Line Clear Animation (Requirement 9.6)', () => {
        beforeEach(() => {
            // Mock requestAnimationFrame for animation tests
            global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));
            global.performance = { now: jest.fn(() => Date.now()) };
            jest.useFakeTimers();
        });
        
        afterEach(() => {
            jest.useRealTimers();
            delete global.requestAnimationFrame;
        });
        
        test('should return promise for animation', () => {
            const result = renderer.animateLineClear([19]);
            expect(result).toBeInstanceOf(Promise);
        });
        
        test('should resolve immediately for empty lines array', async () => {
            const result = await renderer.animateLineClear([]);
            expect(result).toBeUndefined();
        });
        
        test('should resolve immediately for null lines', async () => {
            const result = await renderer.animateLineClear(null);
            expect(result).toBeUndefined();
        });
        
        test('should set isAnimating flag during animation', () => {
            renderer.animateLineClear([19]);
            expect(renderer.isAnimating).toBe(true);
        });
    });
    
    describe('Full Render Cycle', () => {
        test('should render complete game state', () => {
            const gameState = {
                board: Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0)),
                currentTetromino: new Tetromino('T', 4, 0),
                nextTetromino: new Tetromino('I', 0, 0),
                ghostY: 17,
                gameState: 'playing',
                score: 1000
            };
            
            mockCtx.clearRect.mockClear();
            mockCtx.fillRect.mockClear();
            
            renderer.render(gameState);
            
            // Should clear canvas
            expect(mockCtx.clearRect).toHaveBeenCalled();
            // Should render various elements
            expect(mockCtx.fillRect).toHaveBeenCalled();
        });
        
        test('should render game over state', () => {
            const gameState = {
                board: Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0)),
                currentTetromino: null,
                nextTetromino: null,
                ghostY: null,
                gameState: 'gameover',
                score: 5000
            };
            
            mockCtx.fillText.mockClear();
            
            renderer.render(gameState);
            
            // Should render game over text
            expect(mockCtx.fillText).toHaveBeenCalled();
        });
        
        test('should not render ghost piece when game is not playing', () => {
            const gameState = {
                board: Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0)),
                currentTetromino: new Tetromino('T', 4, 0),
                nextTetromino: new Tetromino('I', 0, 0),
                ghostY: 17,
                gameState: 'paused',
                score: 1000
            };
            
            // Spy on renderGhostPiece
            const ghostSpy = jest.spyOn(renderer, 'renderGhostPiece');
            
            renderer.render(gameState);
            
            // Ghost piece should not be rendered when paused
            expect(ghostSpy).not.toHaveBeenCalled();
            
            ghostSpy.mockRestore();
        });
    });
    
    describe('Game Loop (Requirement 10.2)', () => {
        beforeEach(() => {
            // Mock requestAnimationFrame
            jest.useFakeTimers();
            global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));
            global.cancelAnimationFrame = jest.fn(id => clearTimeout(id));
            global.performance = { now: jest.fn(() => Date.now()) };
        });
        
        afterEach(() => {
            jest.useRealTimers();
            renderer.stopGameLoop();
        });
        
        test('should start game loop with callback', () => {
            const callback = jest.fn();
            
            renderer.startGameLoop(callback);
            
            // Advance timers to trigger animation frame
            jest.advanceTimersByTime(16);
            
            expect(callback).toHaveBeenCalled();
        });
        
        test('should stop game loop', () => {
            const callback = jest.fn();
            
            renderer.startGameLoop(callback);
            renderer.stopGameLoop();
            
            expect(renderer.animationFrameId).toBeNull();
        });
        
        test('should track FPS', () => {
            renderer.startGameLoop(() => {});
            
            // Initial FPS should be 0
            expect(renderer.getFPS()).toBe(0);
        });
        
        test('should check frame rate stability', () => {
            // Initially FPS is 0, so not stable
            expect(renderer.isFrameRateStable()).toBe(false);
            
            // Manually set FPS to test
            renderer.fps = 60;
            expect(renderer.isFrameRateStable()).toBe(true);
            
            renderer.fps = 25;
            expect(renderer.isFrameRateStable()).toBe(false);
        });
    });
    
    describe('Utility Methods', () => {
        test('should get canvas element', () => {
            expect(renderer.getCanvas()).toBe(mockCanvas);
        });
        
        test('should get canvas context', () => {
            expect(renderer.getContext()).toBe(mockCtx);
        });
        
        test('should set cell size and reinitialize canvas', () => {
            renderer.setCellSize(25);
            
            expect(renderer.cellSize).toBe(25);
            expect(mockCanvas.width).toBe(BOARD_WIDTH * 25);
            expect(mockCanvas.height).toBe(BOARD_HEIGHT * 25);
        });
        
        test('should render score on canvas', () => {
            mockCtx.fillText.mockClear();
            
            renderer.renderScore(1500);
            
            expect(mockCtx.fillText).toHaveBeenCalled();
            const calls = mockCtx.fillText.mock.calls;
            const hasScoreText = calls.some(call => call[0].includes('1500'));
            expect(hasScoreText).toBe(true);
        });
    });
    
    describe('Constants Export', () => {
        test('should export DEFAULT_CELL_SIZE', () => {
            expect(DEFAULT_CELL_SIZE).toBe(30);
        });
        
        test('should export DEFAULT_RENDER_OPTIONS', () => {
            expect(DEFAULT_RENDER_OPTIONS).toBeDefined();
            expect(DEFAULT_RENDER_OPTIONS.ghostPieceEnabled).toBe(true);
            expect(DEFAULT_RENDER_OPTIONS.gridLinesEnabled).toBe(true);
            expect(DEFAULT_RENDER_OPTIONS.gridLineColor).toBe(GRID_LINE_COLOR);
            expect(DEFAULT_RENDER_OPTIONS.gridLineWidth).toBe(1);
        });
        
        test('should export GRID_LINE_COLOR', () => {
            expect(GRID_LINE_COLOR).toBe('#333333');
        });
        
        test('should export GRID_BACKGROUND_COLOR', () => {
            expect(GRID_BACKGROUND_COLOR).toBe('#1a1a2e');
        });
        
        test('should export GHOST_PIECE_ALPHA', () => {
            expect(GHOST_PIECE_ALPHA).toBe(0.3);
        });
        
        test('should export LINE_CLEAR_ANIMATION_DURATION', () => {
            expect(LINE_CLEAR_ANIMATION_DURATION).toBe(300);
        });
    });
});
