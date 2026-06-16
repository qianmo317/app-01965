/**
 * StateEvaluator Unit Tests
 * 
 * Tests for the AI state evaluator that assesses board quality
 * Requirements: 6.2, 6.3
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { StateEvaluator, DEFAULT_WEIGHTS, BOARD_WIDTH, BOARD_HEIGHT } from './state-evaluator.js';

// Helper function to create an empty board
function createEmptyBoard(width = BOARD_WIDTH, height = BOARD_HEIGHT) {
    const board = [];
    for (let y = 0; y < height; y++) {
        board.push(new Array(width).fill(0));
    }
    return board;
}

// Helper function to fill a row
function fillRow(board, rowIndex, value = 1) {
    for (let x = 0; x < board[0].length; x++) {
        board[rowIndex][x] = value;
    }
}

describe('StateEvaluator', () => {
    let evaluator;
    
    beforeEach(() => {
        evaluator = new StateEvaluator();
    });
    
    describe('constructor', () => {
        test('should use default weights when no weights provided', () => {
            const weights = evaluator.getWeights();
            expect(weights).toEqual(DEFAULT_WEIGHTS);
        });
        
        test('should use custom weights when provided', () => {
            const customWeights = {
                aggregateHeight: -1.0,
                completeLines: 2.0,
                holes: -0.5,
                bumpiness: -0.3
            };
            const customEvaluator = new StateEvaluator(customWeights);
            expect(customEvaluator.getWeights()).toEqual(customWeights);
        });
        
        test('should not modify original weights object', () => {
            const customWeights = {
                aggregateHeight: -1.0,
                completeLines: 2.0,
                holes: -0.5,
                bumpiness: -0.3
            };
            const customEvaluator = new StateEvaluator(customWeights);
            customWeights.aggregateHeight = -999;
            expect(customEvaluator.getWeights().aggregateHeight).toBe(-1.0);
        });
    });
    
    describe('calculateAggregateHeight', () => {
        test('should return 0 for empty board', () => {
            const board = createEmptyBoard();
            expect(evaluator.calculateAggregateHeight(board)).toBe(0);
        });
        
        test('should calculate height correctly for single column', () => {
            const board = createEmptyBoard();
            // Place a block at the bottom of column 0
            board[BOARD_HEIGHT - 1][0] = 1;
            expect(evaluator.calculateAggregateHeight(board)).toBe(1);
        });
        
        test('should calculate height correctly for multiple columns', () => {
            const board = createEmptyBoard();
            // Column 0: height 1 (bottom row)
            board[BOARD_HEIGHT - 1][0] = 1;
            // Column 1: height 2 (bottom two rows)
            board[BOARD_HEIGHT - 1][1] = 1;
            board[BOARD_HEIGHT - 2][1] = 1;
            // Column 2: height 3
            board[BOARD_HEIGHT - 1][2] = 1;
            board[BOARD_HEIGHT - 2][2] = 1;
            board[BOARD_HEIGHT - 3][2] = 1;
            
            expect(evaluator.calculateAggregateHeight(board)).toBe(1 + 2 + 3);
        });
        
        test('should count from topmost block in column', () => {
            const board = createEmptyBoard();
            // Place a block at row 10 (height = 20 - 10 = 10)
            board[10][0] = 1;
            expect(evaluator.calculateAggregateHeight(board)).toBe(10);
        });
        
        test('should handle full board', () => {
            const board = createEmptyBoard();
            // Fill entire board
            for (let y = 0; y < BOARD_HEIGHT; y++) {
                for (let x = 0; x < BOARD_WIDTH; x++) {
                    board[y][x] = 1;
                }
            }
            // Each column has height 20, 10 columns
            expect(evaluator.calculateAggregateHeight(board)).toBe(BOARD_HEIGHT * BOARD_WIDTH);
        });
    });
    
    describe('calculateCompleteLines', () => {
        test('should return 0 for empty board', () => {
            const board = createEmptyBoard();
            expect(evaluator.calculateCompleteLines(board)).toBe(0);
        });
        
        test('should detect single complete line', () => {
            const board = createEmptyBoard();
            fillRow(board, BOARD_HEIGHT - 1);
            expect(evaluator.calculateCompleteLines(board)).toBe(1);
        });
        
        test('should detect multiple complete lines', () => {
            const board = createEmptyBoard();
            fillRow(board, BOARD_HEIGHT - 1);
            fillRow(board, BOARD_HEIGHT - 2);
            fillRow(board, BOARD_HEIGHT - 3);
            expect(evaluator.calculateCompleteLines(board)).toBe(3);
        });
        
        test('should not count incomplete lines', () => {
            const board = createEmptyBoard();
            // Fill row except one cell
            for (let x = 0; x < BOARD_WIDTH - 1; x++) {
                board[BOARD_HEIGHT - 1][x] = 1;
            }
            expect(evaluator.calculateCompleteLines(board)).toBe(0);
        });
        
        test('should detect 4 complete lines (Tetris)', () => {
            const board = createEmptyBoard();
            fillRow(board, BOARD_HEIGHT - 1);
            fillRow(board, BOARD_HEIGHT - 2);
            fillRow(board, BOARD_HEIGHT - 3);
            fillRow(board, BOARD_HEIGHT - 4);
            expect(evaluator.calculateCompleteLines(board)).toBe(4);
        });
        
        test('should detect non-consecutive complete lines', () => {
            const board = createEmptyBoard();
            fillRow(board, BOARD_HEIGHT - 1);
            // Leave row BOARD_HEIGHT - 2 incomplete
            board[BOARD_HEIGHT - 2][0] = 1;
            fillRow(board, BOARD_HEIGHT - 3);
            expect(evaluator.calculateCompleteLines(board)).toBe(2);
        });
    });
    
    describe('calculateHoles', () => {
        test('should return 0 for empty board', () => {
            const board = createEmptyBoard();
            expect(evaluator.calculateHoles(board)).toBe(0);
        });
        
        test('should return 0 for board with no holes', () => {
            const board = createEmptyBoard();
            // Stack blocks without gaps
            board[BOARD_HEIGHT - 1][0] = 1;
            board[BOARD_HEIGHT - 2][0] = 1;
            expect(evaluator.calculateHoles(board)).toBe(0);
        });
        
        test('should detect single hole', () => {
            const board = createEmptyBoard();
            // Block at row 18, empty at row 19 (hole)
            board[BOARD_HEIGHT - 2][0] = 1;
            // Row 19 (bottom) is empty - this is a hole
            expect(evaluator.calculateHoles(board)).toBe(1);
        });
        
        test('should detect multiple holes in same column', () => {
            const board = createEmptyBoard();
            // Block at top, two empty cells below
            board[BOARD_HEIGHT - 3][0] = 1;
            // Rows 18 and 19 are empty - 2 holes
            expect(evaluator.calculateHoles(board)).toBe(2);
        });
        
        test('should detect holes in multiple columns', () => {
            const board = createEmptyBoard();
            // Column 0: 1 hole
            board[BOARD_HEIGHT - 2][0] = 1;
            // Column 1: 1 hole
            board[BOARD_HEIGHT - 2][1] = 1;
            expect(evaluator.calculateHoles(board)).toBe(2);
        });
        
        test('should not count empty cells without blocks above', () => {
            const board = createEmptyBoard();
            // Only bottom row has blocks
            board[BOARD_HEIGHT - 1][0] = 1;
            board[BOARD_HEIGHT - 1][1] = 1;
            // All cells above are empty but not holes
            expect(evaluator.calculateHoles(board)).toBe(0);
        });
        
        test('should handle complex hole pattern', () => {
            const board = createEmptyBoard();
            // Column 0: block-empty-block-empty (2 holes)
            board[BOARD_HEIGHT - 4][0] = 1;
            board[BOARD_HEIGHT - 2][0] = 1;
            // Holes at rows 17 and 19
            expect(evaluator.calculateHoles(board)).toBe(2);
        });
    });
    
    describe('calculateBumpiness', () => {
        test('should return 0 for empty board', () => {
            const board = createEmptyBoard();
            expect(evaluator.calculateBumpiness(board)).toBe(0);
        });
        
        test('should return 0 for flat surface', () => {
            const board = createEmptyBoard();
            // All columns have same height
            for (let x = 0; x < BOARD_WIDTH; x++) {
                board[BOARD_HEIGHT - 1][x] = 1;
            }
            expect(evaluator.calculateBumpiness(board)).toBe(0);
        });
        
        test('should calculate bumpiness for two adjacent columns', () => {
            const board = createEmptyBoard();
            // Column 0: height 1
            board[BOARD_HEIGHT - 1][0] = 1;
            // Column 1: height 3
            board[BOARD_HEIGHT - 1][1] = 1;
            board[BOARD_HEIGHT - 2][1] = 1;
            board[BOARD_HEIGHT - 3][1] = 1;
            // Bumpiness = |1-3| + |3-0| + |0-0| + ... = 2 + 3 = 5
            expect(evaluator.calculateBumpiness(board)).toBe(5);
        });
        
        test('should calculate bumpiness for staircase pattern', () => {
            const board = createEmptyBoard();
            // Create staircase: heights 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
            for (let x = 0; x < BOARD_WIDTH; x++) {
                for (let h = 0; h <= x; h++) {
                    board[BOARD_HEIGHT - 1 - h][x] = 1;
                }
            }
            // Bumpiness = |1-2| + |2-3| + ... + |9-10| = 9
            expect(evaluator.calculateBumpiness(board)).toBe(9);
        });
        
        test('should handle alternating heights', () => {
            const board = createEmptyBoard();
            // Alternating: height 1, 3, 1, 3, ...
            for (let x = 0; x < BOARD_WIDTH; x++) {
                const height = x % 2 === 0 ? 1 : 3;
                for (let h = 0; h < height; h++) {
                    board[BOARD_HEIGHT - 1 - h][x] = 1;
                }
            }
            // Bumpiness = |1-3| + |3-1| + |1-3| + ... = 2 * 9 = 18
            expect(evaluator.calculateBumpiness(board)).toBe(18);
        });
    });
    
    describe('evaluate', () => {
        test('should return 0 for empty board with default weights', () => {
            const board = createEmptyBoard();
            // All metrics are 0, so score should be 0
            expect(evaluator.evaluate(board)).toBe(0);
        });
        
        test('should return positive score for complete lines', () => {
            const board = createEmptyBoard();
            fillRow(board, BOARD_HEIGHT - 1);
            // Complete line adds positive value
            const score = evaluator.evaluate(board);
            // Score should consider: aggregateHeight (10*1=10), completeLines (1), holes (0), bumpiness (0)
            const expected = 
                DEFAULT_WEIGHTS.aggregateHeight * 10 +
                DEFAULT_WEIGHTS.completeLines * 1 +
                DEFAULT_WEIGHTS.holes * 0 +
                DEFAULT_WEIGHTS.bumpiness * 0;
            expect(score).toBeCloseTo(expected, 5);
        });
        
        test('should return negative score for holes', () => {
            const board = createEmptyBoard();
            // Create a hole
            board[BOARD_HEIGHT - 2][0] = 1;
            const score = evaluator.evaluate(board);
            // Should have negative contribution from hole
            expect(score).toBeLessThan(0);
        });
        
        test('should handle custom weights', () => {
            const customWeights = {
                aggregateHeight: 0,
                completeLines: 1,
                holes: 0,
                bumpiness: 0
            };
            const customEvaluator = new StateEvaluator(customWeights);
            const board = createEmptyBoard();
            fillRow(board, BOARD_HEIGHT - 1);
            // Only complete lines contribute
            expect(customEvaluator.evaluate(board)).toBe(1);
        });
        
        test('should return 0 for NaN result', () => {
            const badWeights = {
                aggregateHeight: NaN,
                completeLines: 1,
                holes: 0,
                bumpiness: 0
            };
            const badEvaluator = new StateEvaluator(badWeights);
            const board = createEmptyBoard();
            board[BOARD_HEIGHT - 1][0] = 1;
            expect(badEvaluator.evaluate(board)).toBe(0);
        });
    });
    
    describe('getAllMetrics', () => {
        test('should return all four metrics', () => {
            const board = createEmptyBoard();
            const metrics = evaluator.getAllMetrics(board);
            
            expect(metrics).toHaveProperty('aggregateHeight');
            expect(metrics).toHaveProperty('completeLines');
            expect(metrics).toHaveProperty('holes');
            expect(metrics).toHaveProperty('bumpiness');
        });
        
        test('should return correct values for all metrics', () => {
            const board = createEmptyBoard();
            // Create a specific board state
            fillRow(board, BOARD_HEIGHT - 1);  // Complete line at bottom
            board[BOARD_HEIGHT - 3][0] = 1;    // Creates a hole at row 18 (BOARD_HEIGHT - 2)
            
            const metrics = evaluator.getAllMetrics(board);
            
            // Column 0 has height 3 (topmost block at row 17), columns 1-9 have height 1
            // Aggregate height = 3 + 1*9 = 12
            expect(metrics.aggregateHeight).toBe(3 + 9);
            expect(metrics.completeLines).toBe(1);
            expect(metrics.holes).toBe(1);  // One hole in column 0 at row 18
            expect(metrics.bumpiness).toBeGreaterThan(0);  // Column 0 is higher
        });
    });
    
    describe('setWeights', () => {
        test('should update weights', () => {
            const newWeights = {
                aggregateHeight: -2.0,
                completeLines: 3.0,
                holes: -1.0,
                bumpiness: -0.5
            };
            evaluator.setWeights(newWeights);
            expect(evaluator.getWeights()).toEqual(newWeights);
        });
        
        test('should not modify original weights object', () => {
            const newWeights = {
                aggregateHeight: -2.0,
                completeLines: 3.0,
                holes: -1.0,
                bumpiness: -0.5
            };
            evaluator.setWeights(newWeights);
            newWeights.aggregateHeight = -999;
            expect(evaluator.getWeights().aggregateHeight).toBe(-2.0);
        });
    });
    
    describe('getWeights', () => {
        test('should return a copy of weights', () => {
            const weights = evaluator.getWeights();
            weights.aggregateHeight = -999;
            expect(evaluator.getWeights().aggregateHeight).toBe(DEFAULT_WEIGHTS.aggregateHeight);
        });
    });
    
    describe('edge cases', () => {
        test('should handle board with different dimensions', () => {
            const smallBoard = createEmptyBoard(5, 10);
            smallBoard[9][0] = 1;  // Bottom left
            
            expect(evaluator.calculateAggregateHeight(smallBoard)).toBe(1);
            expect(evaluator.calculateCompleteLines(smallBoard)).toBe(0);
            expect(evaluator.calculateHoles(smallBoard)).toBe(0);
            expect(evaluator.calculateBumpiness(smallBoard)).toBe(1);  // |1-0| = 1
        });
        
        test('should handle single column board', () => {
            const singleColBoard = createEmptyBoard(1, 10);
            singleColBoard[9][0] = 1;
            
            expect(evaluator.calculateAggregateHeight(singleColBoard)).toBe(1);
            expect(evaluator.calculateBumpiness(singleColBoard)).toBe(0);  // No adjacent columns
        });
        
        test('should handle single row board', () => {
            const singleRowBoard = createEmptyBoard(10, 1);
            singleRowBoard[0][0] = 1;
            
            expect(evaluator.calculateAggregateHeight(singleRowBoard)).toBe(1);
            expect(evaluator.calculateHoles(singleRowBoard)).toBe(0);
        });
    });
});
