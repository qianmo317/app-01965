/**
 * StateEvaluator Property-Based Tests
 * 
 * Property 11: State Evaluation Completeness
 * 
 * For any board state, the state evaluator SHALL compute all four metrics:
 * aggregate height, complete lines count, holes count, and bumpiness value.
 * 
 * **Validates: Requirements 6.3**
 */

import { describe, test, expect } from '@jest/globals';
import * as fc from 'fast-check';
import { StateEvaluator, BOARD_WIDTH, BOARD_HEIGHT } from './state-evaluator.js';

// Arbitrary for generating valid board cell values (0 = empty, 1-7 = filled)
const cellValueArb = fc.integer({ min: 0, max: 7 });

// Arbitrary for generating a random board row
const boardRowArb = fc.array(cellValueArb, { minLength: BOARD_WIDTH, maxLength: BOARD_WIDTH });

// Arbitrary for generating a complete random board
const boardArb = fc.array(boardRowArb, { minLength: BOARD_HEIGHT, maxLength: BOARD_HEIGHT });

// Arbitrary for generating a board with variable dimensions
const variableBoardArb = fc.tuple(
    fc.integer({ min: 1, max: 20 }),  // width
    fc.integer({ min: 1, max: 30 })   // height
).chain(([width, height]) => 
    fc.array(
        fc.array(cellValueArb, { minLength: width, maxLength: width }),
        { minLength: height, maxLength: height }
    )
);

// Arbitrary for generating evaluation weights
const weightsArb = fc.record({
    aggregateHeight: fc.double({ min: -10, max: 10, noNaN: true }),
    completeLines: fc.double({ min: -10, max: 10, noNaN: true }),
    holes: fc.double({ min: -10, max: 10, noNaN: true }),
    bumpiness: fc.double({ min: -10, max: 10, noNaN: true })
});

// Arbitrary for generating sparse board (more realistic game states)
const sparseBoardArb = fc.tuple(
    fc.integer({ min: 0, max: 100 }),  // number of filled cells
    fc.array(
        fc.tuple(
            fc.integer({ min: 0, max: BOARD_WIDTH - 1 }),   // x
            fc.integer({ min: 0, max: BOARD_HEIGHT - 1 }),  // y
            fc.integer({ min: 1, max: 7 })                   // value
        ),
        { minLength: 0, maxLength: 100 }
    )
).map(([_, cells]) => {
    // Create empty board
    const board = [];
    for (let y = 0; y < BOARD_HEIGHT; y++) {
        board.push(new Array(BOARD_WIDTH).fill(0));
    }
    // Fill specified cells
    for (const [x, y, value] of cells) {
        board[y][x] = value;
    }
    return board;
});

describe('StateEvaluator Property Tests', () => {
    /**
     * Property 11: State Evaluation Completeness
     * 
     * For any board state, the state evaluator SHALL compute all four metrics:
     * aggregate height, complete lines count, holes count, and bumpiness value.
     * 
     * **Validates: Requirements 6.3**
     */
    describe('Property 11: State Evaluation Completeness', () => {
        test('getAllMetrics returns all four metrics for any board state', () => {
            fc.assert(
                fc.property(boardArb, (board) => {
                    const evaluator = new StateEvaluator();
                    const metrics = evaluator.getAllMetrics(board);
                    
                    // Property: All four metrics must be present
                    expect(metrics).toHaveProperty('aggregateHeight');
                    expect(metrics).toHaveProperty('completeLines');
                    expect(metrics).toHaveProperty('holes');
                    expect(metrics).toHaveProperty('bumpiness');
                    
                    // Property: All metrics must be finite numbers
                    expect(typeof metrics.aggregateHeight).toBe('number');
                    expect(typeof metrics.completeLines).toBe('number');
                    expect(typeof metrics.holes).toBe('number');
                    expect(typeof metrics.bumpiness).toBe('number');
                    
                    expect(Number.isFinite(metrics.aggregateHeight)).toBe(true);
                    expect(Number.isFinite(metrics.completeLines)).toBe(true);
                    expect(Number.isFinite(metrics.holes)).toBe(true);
                    expect(Number.isFinite(metrics.bumpiness)).toBe(true);
                }),
                { numRuns: 100 }
            );
        });
        
        test('all four metrics are computed independently for any board', () => {
            fc.assert(
                fc.property(boardArb, (board) => {
                    const evaluator = new StateEvaluator();
                    
                    // Compute metrics individually
                    const aggregateHeight = evaluator.calculateAggregateHeight(board);
                    const completeLines = evaluator.calculateCompleteLines(board);
                    const holes = evaluator.calculateHoles(board);
                    const bumpiness = evaluator.calculateBumpiness(board);
                    
                    // Compute via getAllMetrics
                    const metrics = evaluator.getAllMetrics(board);
                    
                    // Property: Individual calculations must match getAllMetrics
                    expect(metrics.aggregateHeight).toBe(aggregateHeight);
                    expect(metrics.completeLines).toBe(completeLines);
                    expect(metrics.holes).toBe(holes);
                    expect(metrics.bumpiness).toBe(bumpiness);
                }),
                { numRuns: 100 }
            );
        });
        
        test('aggregate height is non-negative for any board', () => {
            fc.assert(
                fc.property(boardArb, (board) => {
                    const evaluator = new StateEvaluator();
                    const aggregateHeight = evaluator.calculateAggregateHeight(board);
                    
                    // Property: Aggregate height must be >= 0
                    expect(aggregateHeight).toBeGreaterThanOrEqual(0);
                }),
                { numRuns: 100 }
            );
        });
        
        test('complete lines count is non-negative and bounded for any board', () => {
            fc.assert(
                fc.property(boardArb, (board) => {
                    const evaluator = new StateEvaluator();
                    const completeLines = evaluator.calculateCompleteLines(board);
                    
                    // Property: Complete lines must be >= 0 and <= board height
                    expect(completeLines).toBeGreaterThanOrEqual(0);
                    expect(completeLines).toBeLessThanOrEqual(board.length);
                }),
                { numRuns: 100 }
            );
        });
        
        test('holes count is non-negative for any board', () => {
            fc.assert(
                fc.property(boardArb, (board) => {
                    const evaluator = new StateEvaluator();
                    const holes = evaluator.calculateHoles(board);
                    
                    // Property: Holes must be >= 0
                    expect(holes).toBeGreaterThanOrEqual(0);
                }),
                { numRuns: 100 }
            );
        });
        
        test('bumpiness is non-negative for any board', () => {
            fc.assert(
                fc.property(boardArb, (board) => {
                    const evaluator = new StateEvaluator();
                    const bumpiness = evaluator.calculateBumpiness(board);
                    
                    // Property: Bumpiness must be >= 0
                    expect(bumpiness).toBeGreaterThanOrEqual(0);
                }),
                { numRuns: 100 }
            );
        });
        
        test('evaluate function produces finite result for any board and weights', () => {
            fc.assert(
                fc.property(boardArb, weightsArb, (board, weights) => {
                    const evaluator = new StateEvaluator(weights);
                    const score = evaluator.evaluate(board);
                    
                    // Property: Score must be a finite number (or 0 for NaN cases)
                    expect(typeof score).toBe('number');
                    expect(Number.isFinite(score)).toBe(true);
                }),
                { numRuns: 100 }
            );
        });
        
        test('metrics are computed correctly for sparse boards', () => {
            fc.assert(
                fc.property(sparseBoardArb, (board) => {
                    const evaluator = new StateEvaluator();
                    const metrics = evaluator.getAllMetrics(board);
                    
                    // Property: All four metrics must be computed
                    expect(metrics).toHaveProperty('aggregateHeight');
                    expect(metrics).toHaveProperty('completeLines');
                    expect(metrics).toHaveProperty('holes');
                    expect(metrics).toHaveProperty('bumpiness');
                    
                    // Property: All metrics must be non-negative
                    expect(metrics.aggregateHeight).toBeGreaterThanOrEqual(0);
                    expect(metrics.completeLines).toBeGreaterThanOrEqual(0);
                    expect(metrics.holes).toBeGreaterThanOrEqual(0);
                    expect(metrics.bumpiness).toBeGreaterThanOrEqual(0);
                }),
                { numRuns: 100 }
            );
        });
        
        test('metrics are computed for variable dimension boards', () => {
            fc.assert(
                fc.property(variableBoardArb, (board) => {
                    const evaluator = new StateEvaluator();
                    const metrics = evaluator.getAllMetrics(board);
                    
                    // Property: All four metrics must be computed regardless of board size
                    expect(metrics).toHaveProperty('aggregateHeight');
                    expect(metrics).toHaveProperty('completeLines');
                    expect(metrics).toHaveProperty('holes');
                    expect(metrics).toHaveProperty('bumpiness');
                    
                    // Property: All metrics must be finite numbers
                    expect(Number.isFinite(metrics.aggregateHeight)).toBe(true);
                    expect(Number.isFinite(metrics.completeLines)).toBe(true);
                    expect(Number.isFinite(metrics.holes)).toBe(true);
                    expect(Number.isFinite(metrics.bumpiness)).toBe(true);
                }),
                { numRuns: 100 }
            );
        });
        
        test('aggregate height equals sum of column heights', () => {
            fc.assert(
                fc.property(boardArb, (board) => {
                    const evaluator = new StateEvaluator();
                    const aggregateHeight = evaluator.calculateAggregateHeight(board);
                    
                    // Calculate column heights manually
                    const width = board[0].length;
                    const height = board.length;
                    let expectedSum = 0;
                    
                    for (let x = 0; x < width; x++) {
                        for (let y = 0; y < height; y++) {
                            if (board[y][x] !== 0) {
                                expectedSum += height - y;
                                break;
                            }
                        }
                    }
                    
                    // Property: Aggregate height must equal sum of column heights
                    expect(aggregateHeight).toBe(expectedSum);
                }),
                { numRuns: 100 }
            );
        });
        
        test('complete lines count matches actual full rows', () => {
            fc.assert(
                fc.property(boardArb, (board) => {
                    const evaluator = new StateEvaluator();
                    const completeLines = evaluator.calculateCompleteLines(board);
                    
                    // Count full rows manually
                    let expectedCount = 0;
                    for (let y = 0; y < board.length; y++) {
                        let isFull = true;
                        for (let x = 0; x < board[y].length; x++) {
                            if (board[y][x] === 0) {
                                isFull = false;
                                break;
                            }
                        }
                        if (isFull) {
                            expectedCount++;
                        }
                    }
                    
                    // Property: Complete lines must match actual full row count
                    expect(completeLines).toBe(expectedCount);
                }),
                { numRuns: 100 }
            );
        });
        
        test('holes count matches empty cells with blocks above', () => {
            fc.assert(
                fc.property(boardArb, (board) => {
                    const evaluator = new StateEvaluator();
                    const holes = evaluator.calculateHoles(board);
                    
                    // Count holes manually
                    const width = board[0].length;
                    const height = board.length;
                    let expectedHoles = 0;
                    
                    for (let x = 0; x < width; x++) {
                        let foundBlock = false;
                        for (let y = 0; y < height; y++) {
                            if (board[y][x] !== 0) {
                                foundBlock = true;
                            } else if (foundBlock) {
                                expectedHoles++;
                            }
                        }
                    }
                    
                    // Property: Holes must match empty cells with blocks above
                    expect(holes).toBe(expectedHoles);
                }),
                { numRuns: 100 }
            );
        });
        
        test('bumpiness equals sum of adjacent column height differences', () => {
            fc.assert(
                fc.property(boardArb, (board) => {
                    const evaluator = new StateEvaluator();
                    const bumpiness = evaluator.calculateBumpiness(board);
                    
                    // Calculate column heights
                    const width = board[0].length;
                    const height = board.length;
                    const heights = new Array(width).fill(0);
                    
                    for (let x = 0; x < width; x++) {
                        for (let y = 0; y < height; y++) {
                            if (board[y][x] !== 0) {
                                heights[x] = height - y;
                                break;
                            }
                        }
                    }
                    
                    // Calculate expected bumpiness
                    let expectedBumpiness = 0;
                    for (let i = 0; i < heights.length - 1; i++) {
                        expectedBumpiness += Math.abs(heights[i] - heights[i + 1]);
                    }
                    
                    // Property: Bumpiness must equal sum of adjacent height differences
                    expect(bumpiness).toBe(expectedBumpiness);
                }),
                { numRuns: 100 }
            );
        });
        
        test('empty board has zero for all metrics', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 20 }),  // width
                    fc.integer({ min: 1, max: 30 }),  // height
                    (width, height) => {
                        // Create empty board
                        const board = [];
                        for (let y = 0; y < height; y++) {
                            board.push(new Array(width).fill(0));
                        }
                        
                        const evaluator = new StateEvaluator();
                        const metrics = evaluator.getAllMetrics(board);
                        
                        // Property: Empty board has all zero metrics
                        expect(metrics.aggregateHeight).toBe(0);
                        expect(metrics.completeLines).toBe(0);
                        expect(metrics.holes).toBe(0);
                        expect(metrics.bumpiness).toBe(0);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});
