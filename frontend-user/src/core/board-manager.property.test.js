/**
 * BoardManager Property-Based Tests
 * 
 * Property 3: Collision Invariant (Invalid Operations Preserve State)
 * Property 6: Line Clearing Correctness
 * 
 * Validates: Requirements 2.5, 4.1, 4.2
 */

import { describe, test, expect } from '@jest/globals';
import * as fc from 'fast-check';
import { BoardManager, BOARD_WIDTH, BOARD_HEIGHT, EMPTY_CELL } from './board-manager.js';
import { Tetromino, TETROMINO_TYPES } from './tetromino.js';

// Arbitrary for generating valid tetromino types
const tetrominoTypeArb = fc.constantFrom(...TETROMINO_TYPES);

// Arbitrary for generating valid board positions
const validXArb = fc.integer({ min: 0, max: BOARD_WIDTH - 1 });
const validYArb = fc.integer({ min: 0, max: BOARD_HEIGHT - 1 });

// Arbitrary for generating rotation indices
const rotationArb = fc.integer({ min: 0, max: 3 });

// Arbitrary for generating a random board state with some filled cells
const boardStateArb = fc.array(
    fc.tuple(validXArb, validYArb, fc.integer({ min: 1, max: 7 })),
    { minLength: 0, maxLength: 50 }
);

describe('BoardManager Property Tests', () => {
    /**
     * Property 3: Collision Invariant (Invalid Operations Preserve State)
     * 
     * For any board state and tetromino position, if a movement or rotation
     * would result in collision with walls or placed blocks, the tetromino's
     * position and rotation SHALL remain unchanged after the operation attempt.
     * 
     * **Validates: Requirements 2.5, 3.4**
     */
    describe('Property 3: Collision Invariant', () => {
        test('invalid position does not change tetromino state when checked', () => {
            fc.assert(
                fc.property(
                    tetrominoTypeArb,
                    fc.integer({ min: -10, max: BOARD_WIDTH + 10 }),
                    fc.integer({ min: -10, max: BOARD_HEIGHT + 10 }),
                    rotationArb,
                    boardStateArb,
                    (type, x, y, rotation, filledCells) => {
                        const board = new BoardManager();
                        
                        // Fill some cells on the board
                        for (const [cellX, cellY, value] of filledCells) {
                            board.setCell(cellX, cellY, value);
                        }
                        
                        // Create tetromino and set its state
                        const tetromino = new Tetromino(type, x, y);
                        tetromino.setRotationIndex(rotation);
                        
                        // Store original state
                        const originalX = tetromino.x;
                        const originalY = tetromino.y;
                        const originalRotation = tetromino.rotationIndex;
                        const originalShape = JSON.stringify(tetromino.shape);
                        
                        // Check if position is valid (this should NOT modify tetromino)
                        board.isValidPosition(tetromino);
                        
                        // Verify tetromino state is unchanged
                        expect(tetromino.x).toBe(originalX);
                        expect(tetromino.y).toBe(originalY);
                        expect(tetromino.rotationIndex).toBe(originalRotation);
                        expect(JSON.stringify(tetromino.shape)).toBe(originalShape);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        test('checking position with offset does not modify tetromino', () => {
            fc.assert(
                fc.property(
                    tetrominoTypeArb,
                    fc.integer({ min: 0, max: BOARD_WIDTH - 4 }),
                    fc.integer({ min: 0, max: BOARD_HEIGHT - 4 }),
                    fc.integer({ min: -5, max: 5 }),
                    fc.integer({ min: -5, max: 5 }),
                    (type, x, y, offsetX, offsetY) => {
                        const board = new BoardManager();
                        const tetromino = new Tetromino(type, x, y);
                        
                        // Store original state
                        const originalX = tetromino.x;
                        const originalY = tetromino.y;
                        
                        // Check position with offset
                        board.isValidPosition(tetromino, offsetX, offsetY);
                        
                        // Tetromino position should remain unchanged
                        expect(tetromino.x).toBe(originalX);
                        expect(tetromino.y).toBe(originalY);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        test('failed placement does not modify board state', () => {
            fc.assert(
                fc.property(
                    tetrominoTypeArb,
                    boardStateArb,
                    (type, filledCells) => {
                        const board = new BoardManager();
                        
                        // Fill some cells on the board
                        for (const [cellX, cellY, value] of filledCells) {
                            board.setCell(cellX, cellY, value);
                        }
                        
                        // Store original board state
                        const originalGrid = board.getGridCopy();
                        
                        // Try to place tetromino at invalid position (outside board)
                        const tetromino = new Tetromino(type, -5, -5);
                        board.placeTetromino(tetromino);
                        
                        // Board state should remain unchanged
                        expect(board.getGridCopy()).toEqual(originalGrid);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });


    /**
     * Property 6: Line Clearing Correctness
     * 
     * For any board state where one or more rows are completely filled,
     * after line clearing:
     * (1) those rows SHALL be removed
     * (2) all rows above SHALL shift down by the number of cleared rows
     * (3) the total number of filled cells SHALL decrease by (cleared_rows × board_width)
     * 
     * **Validates: Requirements 4.1, 4.2**
     */
    describe('Property 6: Line Clearing Correctness', () => {
        test('clearing full lines reduces filled cells by correct amount', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 4 }),  // Number of full lines to create
                    fc.integer({ min: 10, max: 16 }), // Starting row for full lines (leave room at top)
                    (numFullLines, startRow) => {
                        const board = new BoardManager();
                        
                        // Ensure we don't exceed board height
                        const actualStartRow = Math.min(startRow, BOARD_HEIGHT - numFullLines);
                        
                        // Fill complete lines only
                        for (let i = 0; i < numFullLines; i++) {
                            const row = actualStartRow + i;
                            for (let x = 0; x < BOARD_WIDTH; x++) {
                                board.setCell(x, row, 1);
                            }
                        }
                        
                        // Count filled cells before clearing
                        const filledBefore = board.getFilledCellCount();
                        const expectedFullLineCells = numFullLines * BOARD_WIDTH;
                        
                        // Verify we have the expected number of filled cells
                        expect(filledBefore).toBe(expectedFullLineCells);
                        
                        // Clear lines
                        const clearedCount = board.clearLines();
                        
                        // Count filled cells after clearing
                        const filledAfter = board.getFilledCellCount();
                        
                        // Property: cleared lines should equal number of full lines we created
                        expect(clearedCount).toBe(numFullLines);
                        
                        // Property: filled cells should decrease by exactly (cleared_rows × board_width)
                        expect(filledBefore - filledAfter).toBe(expectedFullLineCells);
                        
                        // All cells should be cleared
                        expect(filledAfter).toBe(0);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        test('rows above cleared lines shift down correctly', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 3 }),  // Number of full lines
                    fc.integer({ min: 10, max: 16 }), // Row for full lines (leaving room above)
                    fc.integer({ min: 1, max: 7 }),  // Marker value
                    fc.integer({ min: 0, max: BOARD_WIDTH - 1 }), // Marker X position
                    (numFullLines, fullLineRow, markerValue, markerX) => {
                        const board = new BoardManager();
                        
                        // Ensure valid row
                        const actualFullLineRow = Math.min(fullLineRow, BOARD_HEIGHT - numFullLines);
                        
                        // Place a marker cell above the full lines (at least 2 rows above)
                        const markerRow = actualFullLineRow - 2;
                        if (markerRow < 0) return; // Skip if no room for marker
                        
                        board.setCell(markerX, markerRow, markerValue);
                        
                        // Fill complete lines
                        for (let i = 0; i < numFullLines; i++) {
                            const row = actualFullLineRow + i;
                            for (let x = 0; x < BOARD_WIDTH; x++) {
                                board.setCell(x, row, 2);
                            }
                        }
                        
                        // Clear lines
                        const clearedCount = board.clearLines();
                        
                        // The marker should have shifted down by the number of cleared lines
                        const expectedNewRow = markerRow + clearedCount;
                        
                        // Verify marker shifted down
                        expect(board.getCell(markerX, expectedNewRow)).toBe(markerValue);
                        
                        // Original position should be empty
                        expect(board.getCell(markerX, markerRow)).toBe(EMPTY_CELL);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        test('cleared rows are replaced with empty rows at top', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 4 }),
                    fc.integer({ min: 10, max: 19 }),
                    (numFullLines, startRow) => {
                        const board = new BoardManager();
                        
                        // Ensure valid row
                        const actualStartRow = Math.min(startRow, BOARD_HEIGHT - numFullLines);
                        
                        // Fill complete lines at bottom
                        for (let i = 0; i < numFullLines; i++) {
                            const row = actualStartRow + i;
                            for (let x = 0; x < BOARD_WIDTH; x++) {
                                board.setCell(x, row, 1);
                            }
                        }
                        
                        // Clear lines
                        board.clearLines();
                        
                        // Top rows should be empty
                        for (let y = 0; y < numFullLines; y++) {
                            for (let x = 0; x < BOARD_WIDTH; x++) {
                                expect(board.getCell(x, y)).toBe(EMPTY_CELL);
                            }
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        test('incomplete lines are not cleared', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: BOARD_HEIGHT - 1 }),
                    fc.integer({ min: 0, max: BOARD_WIDTH - 1 }),  // Gap position
                    (row, gapX) => {
                        const board = new BoardManager();
                        
                        // Fill row except for one cell
                        for (let x = 0; x < BOARD_WIDTH; x++) {
                            if (x !== gapX) {
                                board.setCell(x, row, 1);
                            }
                        }
                        
                        const filledBefore = board.getFilledCellCount();
                        const clearedCount = board.clearLines();
                        const filledAfter = board.getFilledCellCount();
                        
                        // No lines should be cleared
                        expect(clearedCount).toBe(0);
                        expect(filledAfter).toBe(filledBefore);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        test('board dimensions remain constant after clearing', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 4 }),
                    fc.integer({ min: 15, max: 19 }),
                    (numFullLines, startRow) => {
                        const board = new BoardManager();
                        
                        const actualStartRow = Math.min(startRow, BOARD_HEIGHT - numFullLines);
                        
                        // Fill complete lines
                        for (let i = 0; i < numFullLines; i++) {
                            const row = actualStartRow + i;
                            for (let x = 0; x < BOARD_WIDTH; x++) {
                                board.setCell(x, row, 1);
                            }
                        }
                        
                        // Clear lines
                        board.clearLines();
                        
                        // Board dimensions should remain constant
                        expect(board.grid.length).toBe(BOARD_HEIGHT);
                        expect(board.grid[0].length).toBe(BOARD_WIDTH);
                        expect(board.width).toBe(BOARD_WIDTH);
                        expect(board.height).toBe(BOARD_HEIGHT);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});
