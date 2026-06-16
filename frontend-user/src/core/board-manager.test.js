/**
 * BoardManager Unit Tests
 * 
 * Tests for board initialization, collision detection, and piece placement
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { BoardManager, BOARD_WIDTH, BOARD_HEIGHT, EMPTY_CELL } from './board-manager.js';
import { Tetromino } from './tetromino.js';

describe('BoardManager', () => {
    let board;
    
    beforeEach(() => {
        board = new BoardManager();
    });
    
    describe('Initialization', () => {
        test('should create a 10x20 empty grid', () => {
            expect(board.width).toBe(10);
            expect(board.height).toBe(20);
            expect(board.grid.length).toBe(20);
            expect(board.grid[0].length).toBe(10);
        });
        
        test('should initialize all cells as empty', () => {
            for (let y = 0; y < board.height; y++) {
                for (let x = 0; x < board.width; x++) {
                    expect(board.grid[y][x]).toBe(EMPTY_CELL);
                }
            }
        });
    });
    
    describe('Collision Detection', () => {
        test('should allow valid position in empty board', () => {
            const tetromino = new Tetromino('T', 4, 0);
            expect(board.isValidPosition(tetromino)).toBe(true);
        });
        
        test('should detect left wall collision', () => {
            const tetromino = new Tetromino('T', -1, 0);
            expect(board.isValidPosition(tetromino)).toBe(false);
        });
        
        test('should detect right wall collision', () => {
            const tetromino = new Tetromino('T', 8, 0);
            expect(board.isValidPosition(tetromino)).toBe(false);
        });
        
        test('should detect bottom collision', () => {
            const tetromino = new Tetromino('T', 4, 19);
            expect(board.isValidPosition(tetromino)).toBe(false);
        });
        
        test('should detect collision with placed blocks', () => {
            // Place a block at position (5, 10)
            board.setCell(5, 10, 1);
            
            // T-piece at position that would overlap
            const tetromino = new Tetromino('T', 4, 9);
            expect(board.isValidPosition(tetromino)).toBe(false);
        });
        
        test('should allow position with offset', () => {
            const tetromino = new Tetromino('T', 4, 0);
            expect(board.isValidPosition(tetromino, 1, 0)).toBe(true);
            expect(board.isValidPosition(tetromino, -1, 0)).toBe(true);
            expect(board.isValidPosition(tetromino, 0, 1)).toBe(true);
        });
    });
    
    describe('Piece Placement', () => {
        test('should place tetromino on the board', () => {
            const tetromino = new Tetromino('O', 4, 0);
            const result = board.placeTetromino(tetromino);
            
            expect(result).toBe(true);
            expect(board.getCell(4, 0)).not.toBe(EMPTY_CELL);
            expect(board.getCell(5, 0)).not.toBe(EMPTY_CELL);
            expect(board.getCell(4, 1)).not.toBe(EMPTY_CELL);
            expect(board.getCell(5, 1)).not.toBe(EMPTY_CELL);
        });
        
        test('should not place tetromino in invalid position', () => {
            const tetromino = new Tetromino('T', -2, 0);
            const result = board.placeTetromino(tetromino);
            
            expect(result).toBe(false);
        });
    });
    
    describe('Cell Operations', () => {
        test('should get and set cell values', () => {
            board.setCell(5, 10, 3);
            expect(board.getCell(5, 10)).toBe(3);
        });
        
        test('should return -1 for out of bounds cells', () => {
            expect(board.getCell(-1, 0)).toBe(-1);
            expect(board.getCell(10, 0)).toBe(-1);
            expect(board.getCell(0, -1)).toBe(-1);
            expect(board.getCell(0, 20)).toBe(-1);
        });
        
        test('should return false when setting out of bounds cells', () => {
            expect(board.setCell(-1, 0, 1)).toBe(false);
            expect(board.setCell(10, 0, 1)).toBe(false);
        });
    });
    
    describe('Grid Operations', () => {
        test('should create a deep copy of the grid', () => {
            board.setCell(5, 10, 3);
            const copy = board.getGridCopy();
            
            expect(copy[10][5]).toBe(3);
            
            // Modify copy should not affect original
            copy[10][5] = 0;
            expect(board.getCell(5, 10)).toBe(3);
        });
        
        test('should restore grid from data', () => {
            const newGrid = [];
            for (let y = 0; y < 20; y++) {
                newGrid.push(new Array(10).fill(0));
            }
            newGrid[19][5] = 2;
            
            board.setGrid(newGrid);
            expect(board.getCell(5, 19)).toBe(2);
        });
        
        test('should reset board to empty state', () => {
            board.setCell(5, 10, 3);
            board.reset();
            
            expect(board.getCell(5, 10)).toBe(EMPTY_CELL);
        });
    });
    
    describe('Game Over Detection', () => {
        test('should detect game over when spawn position is blocked', () => {
            // Fill the top row
            for (let x = 0; x < board.width; x++) {
                board.setCell(x, 0, 1);
            }
            
            const tetromino = new Tetromino('T', 4, 0);
            expect(board.isGameOver(tetromino)).toBe(true);
        });
        
        test('should not detect game over when spawn position is clear', () => {
            const tetromino = new Tetromino('T', 4, 0);
            expect(board.isGameOver(tetromino)).toBe(false);
        });
    });
    
    describe('Hard Drop Calculation', () => {
        test('should calculate correct hard drop position on empty board', () => {
            const tetromino = new Tetromino('T', 4, 0);
            const dropY = board.getHardDropY(tetromino);
            
            // T-piece has height 2, so it should drop to y=18
            expect(dropY).toBe(18);
        });
        
        test('should calculate correct hard drop position with obstacles', () => {
            // Place blocks at the bottom
            for (let x = 0; x < board.width; x++) {
                board.setCell(x, 19, 1);
            }
            
            const tetromino = new Tetromino('T', 4, 0);
            const dropY = board.getHardDropY(tetromino);
            
            // T-piece should stop above the filled row
            expect(dropY).toBe(17);
        });
    });
    
    describe('Filled Cell Count', () => {
        test('should count filled cells correctly', () => {
            expect(board.getFilledCellCount()).toBe(0);
            
            board.setCell(0, 0, 1);
            board.setCell(1, 0, 2);
            board.setCell(2, 0, 3);
            
            expect(board.getFilledCellCount()).toBe(3);
        });
    });
});


describe('Line Clearing', () => {
    let board;
    
    beforeEach(() => {
        board = new BoardManager();
    });
    
    test('should detect full lines', () => {
        // Fill bottom row completely
        for (let x = 0; x < board.width; x++) {
            board.setCell(x, 19, 1);
        }
        
        const fullLines = board.getFullLines();
        expect(fullLines).toContain(19);
        expect(fullLines.length).toBe(1);
    });
    
    test('should clear single full line', () => {
        // Fill bottom row completely
        for (let x = 0; x < board.width; x++) {
            board.setCell(x, 19, 1);
        }
        
        const clearedCount = board.clearLines();
        expect(clearedCount).toBe(1);
        
        // Bottom row should now be empty
        for (let x = 0; x < board.width; x++) {
            expect(board.getCell(x, 19)).toBe(EMPTY_CELL);
        }
    });
    
    test('should clear multiple full lines', () => {
        // Fill bottom two rows completely
        for (let x = 0; x < board.width; x++) {
            board.setCell(x, 18, 2);
            board.setCell(x, 19, 1);
        }
        
        const clearedCount = board.clearLines();
        expect(clearedCount).toBe(2);
    });
    
    test('should shift rows down after clearing', () => {
        // Place a block at row 17
        board.setCell(5, 17, 3);
        
        // Fill row 18 completely (only one row)
        for (let x = 0; x < board.width; x++) {
            board.setCell(x, 18, 2);
        }
        
        board.clearLines();
        
        // The block that was at row 17 should now be at row 18 (shifted down by 1)
        expect(board.getCell(5, 18)).toBe(3);
        // Row 17 should now be empty
        expect(board.getCell(5, 17)).toBe(EMPTY_CELL);
    });
    
    test('should not clear incomplete lines', () => {
        // Fill bottom row except one cell
        for (let x = 0; x < board.width - 1; x++) {
            board.setCell(x, 19, 1);
        }
        
        const clearedCount = board.clearLines();
        expect(clearedCount).toBe(0);
    });
    
    test('should clear 4 lines (Tetris)', () => {
        // Fill bottom 4 rows completely
        for (let y = 16; y < 20; y++) {
            for (let x = 0; x < board.width; x++) {
                board.setCell(x, y, 1);
            }
        }
        
        const clearedCount = board.clearLines();
        expect(clearedCount).toBe(4);
    });
    
    test('should reduce filled cell count after clearing', () => {
        // Fill bottom row (10 cells)
        for (let x = 0; x < board.width; x++) {
            board.setCell(x, 19, 1);
        }
        
        expect(board.getFilledCellCount()).toBe(10);
        
        board.clearLines();
        
        expect(board.getFilledCellCount()).toBe(0);
    });
});
