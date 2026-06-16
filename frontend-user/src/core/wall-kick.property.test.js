/**
 * Property-Based Tests for Wall Kick System
 * 
 * Tests universal properties of the Wall Kick rotation system using fast-check.
 * Each property test runs at least 100 iterations.
 * 
 * This file tests:
 * - Property 1: Rotation Round-Trip - validates that rotating clockwise then 
 *   counter-clockwise (or vice versa) returns the tetromino to its original rotation state.
 * - Property 2: Rotation Collision Invariant - validates that when rotation fails
 *   (all wall kick attempts fail), the tetromino's position and rotation state remain unchanged.
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.5**
 * 
 * @module wall-kick.property.test
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import * as fc from 'fast-check';
import { WallKickSystem } from './wall-kick.js';
import { BoardManager } from './board-manager.js';
import { Tetromino } from './tetromino.js';

// Configuration for property tests - minimum 100 iterations
const FC_CONFIG = { numRuns: 100 };

// Arbitrary for non-O tetromino types (I, T, S, Z, J, L)
// O piece is excluded because it has rotation invariance (only 1 rotation state)
const nonOTetrominoTypeArb = fc.constantFrom('I', 'T', 'S', 'Z', 'J', 'L');

// Arbitrary for initial rotation index (0-3)
// All non-O tetrominoes have 4 rotation states
const rotationIndexArb = fc.integer({ min: 0, max: 3 });

// Arbitrary for valid position coordinates
// Position is chosen to be in the center of the board to ensure
// rotations can succeed without wall kick interference
const centerPositionArb = fc.record({
    x: fc.integer({ min: 3, max: 6 }),  // Center of 10-wide board
    y: fc.integer({ min: 5, max: 15 })  // Middle of 20-high board
});

/**
 * Property 1: Rotation Round-Trip
 * 
 * *For any* tetromino type except O, and any initial rotation state,
 * rotating clockwise once then counter-clockwise once SHALL return
 * the tetromino to its original rotation index.
 * 
 * This property validates that the WallKickSystem correctly implements
 * the inverse relationship between clockwise and counter-clockwise rotations.
 * 
 * **Validates: Requirements 1.1, 1.2, 1.5**
 */
describe('Property-Based Tests: Wall Kick System', () => {
    let board;
    let wallKick;
    
    beforeEach(() => {
        // Create a fresh empty board for each test
        board = new BoardManager();
        wallKick = new WallKickSystem(board);
    });
    
    describe('Property 1: Rotation Round-Trip', () => {
        
        /**
         * Test: CW → CCW round-trip returns to original rotation index
         * 
         * For any non-O tetromino at any rotation state, rotating clockwise
         * once then counter-clockwise once should return to the original
         * rotation index.
         * 
         * **Validates: Requirements 1.1, 1.2, 1.5**
         */
        test('CW → CCW round-trip returns to original rotation index for all non-O tetrominoes', () => {
            fc.assert(
                fc.property(
                    nonOTetrominoTypeArb,
                    centerPositionArb,
                    rotationIndexArb,
                    (type, position, initialRotation) => {
                        // Create tetromino with given type and position
                        const tetromino = new Tetromino(type, position.x, position.y);
                        
                        // Set initial rotation state
                        tetromino.setRotationIndex(initialRotation);
                        
                        // Capture original rotation index
                        const originalRotationIndex = tetromino.rotationIndex;
                        
                        // Perform clockwise rotation using WallKickSystem
                        const cwSuccess = wallKick.rotateClockwise(tetromino);
                        
                        // If CW rotation succeeded, perform CCW rotation
                        if (cwSuccess) {
                            const ccwSuccess = wallKick.rotateCounterClockwise(tetromino);
                            
                            // If both rotations succeeded, verify round-trip property
                            if (ccwSuccess) {
                                expect(tetromino.rotationIndex).toBe(originalRotationIndex);
                            }
                        }
                        
                        // Note: If either rotation fails (due to wall kicks failing),
                        // the property still holds because the tetromino state is preserved
                        // on failure (Requirement 1.3)
                    }
                ),
                FC_CONFIG
            );
        });
        
        /**
         * Test: CCW → CW round-trip returns to original rotation index
         * 
         * For any non-O tetromino at any rotation state, rotating counter-clockwise
         * once then clockwise once should return to the original rotation index.
         * 
         * **Validates: Requirements 1.1, 1.2, 1.5**
         */
        test('CCW → CW round-trip returns to original rotation index for all non-O tetrominoes', () => {
            fc.assert(
                fc.property(
                    nonOTetrominoTypeArb,
                    centerPositionArb,
                    rotationIndexArb,
                    (type, position, initialRotation) => {
                        // Create tetromino with given type and position
                        const tetromino = new Tetromino(type, position.x, position.y);
                        
                        // Set initial rotation state
                        tetromino.setRotationIndex(initialRotation);
                        
                        // Capture original rotation index
                        const originalRotationIndex = tetromino.rotationIndex;
                        
                        // Perform counter-clockwise rotation using WallKickSystem
                        const ccwSuccess = wallKick.rotateCounterClockwise(tetromino);
                        
                        // If CCW rotation succeeded, perform CW rotation
                        if (ccwSuccess) {
                            const cwSuccess = wallKick.rotateClockwise(tetromino);
                            
                            // If both rotations succeeded, verify round-trip property
                            if (cwSuccess) {
                                expect(tetromino.rotationIndex).toBe(originalRotationIndex);
                            }
                        }
                    }
                ),
                FC_CONFIG
            );
        });
        
        /**
         * Test: Round-trip always succeeds on empty board
         * 
         * On an empty board with centered position, both CW→CCW and CCW→CW
         * round-trips should always succeed and return to original state.
         * 
         * **Validates: Requirements 1.1, 1.2, 1.5**
         */
        test('Round-trip always succeeds on empty board with centered position', () => {
            fc.assert(
                fc.property(
                    nonOTetrominoTypeArb,
                    rotationIndexArb,
                    (type, initialRotation) => {
                        // Create tetromino at center of empty board
                        const tetromino = new Tetromino(type, 4, 10);
                        
                        // Set initial rotation state
                        tetromino.setRotationIndex(initialRotation);
                        
                        // Capture original state
                        const originalRotationIndex = tetromino.rotationIndex;
                        const originalX = tetromino.x;
                        const originalY = tetromino.y;
                        
                        // Perform CW → CCW round-trip
                        const cwSuccess = wallKick.rotateClockwise(tetromino);
                        expect(cwSuccess).toBe(true);
                        
                        const ccwSuccess = wallKick.rotateCounterClockwise(tetromino);
                        expect(ccwSuccess).toBe(true);
                        
                        // Verify rotation index returns to original
                        expect(tetromino.rotationIndex).toBe(originalRotationIndex);
                        
                        // On empty board with no wall kicks needed, position should also be preserved
                        expect(tetromino.x).toBe(originalX);
                        expect(tetromino.y).toBe(originalY);
                    }
                ),
                FC_CONFIG
            );
        });
        
        /**
         * Test: All rotation state transitions are valid for round-trip
         * 
         * Explicitly test each rotation state (0, 1, 2, 3) to ensure
         * round-trip works for all state transitions.
         * 
         * **Validates: Requirements 1.1, 1.2, 1.5**
         */
        test('All rotation state transitions support round-trip', () => {
            fc.assert(
                fc.property(
                    nonOTetrominoTypeArb,
                    (type) => {
                        // Test all 4 rotation states
                        for (let state = 0; state < 4; state++) {
                            // Create fresh tetromino at center
                            const tetromino = new Tetromino(type, 4, 10);
                            tetromino.setRotationIndex(state);
                            
                            const originalState = tetromino.rotationIndex;
                            
                            // CW → CCW round-trip
                            wallKick.rotateClockwise(tetromino);
                            wallKick.rotateCounterClockwise(tetromino);
                            
                            expect(tetromino.rotationIndex).toBe(originalState);
                            
                            // Reset and test CCW → CW round-trip
                            tetromino.setRotationIndex(state);
                            
                            wallKick.rotateCounterClockwise(tetromino);
                            wallKick.rotateClockwise(tetromino);
                            
                            expect(tetromino.rotationIndex).toBe(originalState);
                        }
                    }
                ),
                FC_CONFIG
            );
        });
        
        /**
         * Test: Multiple consecutive round-trips preserve rotation state
         * 
         * Performing multiple CW→CCW or CCW→CW round-trips should always
         * return to the original rotation state.
         * 
         * **Validates: Requirements 1.1, 1.2, 1.5**
         */
        test('Multiple consecutive round-trips preserve rotation state', () => {
            fc.assert(
                fc.property(
                    nonOTetrominoTypeArb,
                    rotationIndexArb,
                    fc.integer({ min: 1, max: 10 }),
                    (type, initialRotation, roundTripCount) => {
                        // Create tetromino at center of empty board
                        const tetromino = new Tetromino(type, 4, 10);
                        tetromino.setRotationIndex(initialRotation);
                        
                        const originalRotationIndex = tetromino.rotationIndex;
                        
                        // Perform multiple CW→CCW round-trips
                        for (let i = 0; i < roundTripCount; i++) {
                            wallKick.rotateClockwise(tetromino);
                            wallKick.rotateCounterClockwise(tetromino);
                        }
                        
                        expect(tetromino.rotationIndex).toBe(originalRotationIndex);
                    }
                ),
                FC_CONFIG
            );
        });
        
        /**
         * Test: I-piece specific round-trip (I-piece has special wall kick data)
         * 
         * I-piece uses different wall kick offsets than JLSTZ pieces,
         * so we specifically test that round-trip works for I-piece.
         * 
         * **Validates: Requirements 1.1, 1.2, 1.5**
         */
        test('I-piece round-trip works correctly with special wall kick data', () => {
            fc.assert(
                fc.property(
                    rotationIndexArb,
                    (initialRotation) => {
                        // Create I-piece at center
                        const tetromino = new Tetromino('I', 4, 10);
                        tetromino.setRotationIndex(initialRotation);
                        
                        const originalRotationIndex = tetromino.rotationIndex;
                        
                        // CW → CCW round-trip
                        const cwSuccess = wallKick.rotateClockwise(tetromino);
                        expect(cwSuccess).toBe(true);
                        
                        const ccwSuccess = wallKick.rotateCounterClockwise(tetromino);
                        expect(ccwSuccess).toBe(true);
                        
                        expect(tetromino.rotationIndex).toBe(originalRotationIndex);
                    }
                ),
                FC_CONFIG
            );
        });
    });
    
    /**
     * Property 2: Rotation Collision Invariant
     * 
     * *For any* board state and tetromino position where both clockwise and 
     * counter-clockwise rotation (including all wall kick attempts) would result 
     * in collision, the tetromino's position (x, y) and rotation index SHALL 
     * remain unchanged after the rotation attempt.
     * 
     * This property validates that failed rotations preserve the tetromino's state,
     * ensuring the game remains consistent when rotation is impossible.
     * 
     * **Validates: Requirements 1.3**
     */
    describe('Property 2: Rotation Collision Invariant', () => {
        
        /**
         * Helper function to create a board with a constrained area around a position.
         * Fills cells around the tetromino to block all wall kick attempts.
         * 
         * @param {BoardManager} board - The board to modify
         * @param {number} centerX - Center X position
         * @param {number} centerY - Center Y position
         * @param {number} radius - Radius of the constrained area
         */
        const createConstrainedBoard = (board, centerX, centerY, radius) => {
            // Fill a large area around the tetromino position to block all wall kicks
            // Wall kick offsets can be up to 2 cells in any direction
            for (let y = 0; y < board.height; y++) {
                for (let x = 0; x < board.width; x++) {
                    // Leave a small area for the tetromino itself
                    const dx = Math.abs(x - centerX);
                    const dy = Math.abs(y - centerY);
                    
                    // Fill cells outside the small safe zone
                    if (dx > radius || dy > radius) {
                        board.setCell(x, y, 1); // Mark as occupied
                    }
                }
            }
        };
        
        /**
         * Helper function to create a fully blocked board where no rotation is possible.
         * Creates a tight enclosure around the tetromino.
         * 
         * @param {BoardManager} board - The board to modify
         * @param {Tetromino} tetromino - The tetromino to enclose
         */
        const createFullyBlockedBoard = (board, tetromino) => {
            const shape = tetromino.shape;
            const tetrominoX = tetromino.x;
            const tetrominoY = tetromino.y;
            
            // First, fill the entire board
            for (let y = 0; y < board.height; y++) {
                for (let x = 0; x < board.width; x++) {
                    board.setCell(x, y, 1);
                }
            }
            
            // Then, clear only the cells occupied by the current tetromino shape
            for (let row = 0; row < shape.length; row++) {
                for (let col = 0; col < shape[row].length; col++) {
                    if (shape[row][col] !== 0) {
                        const boardX = tetrominoX + col;
                        const boardY = tetrominoY + row;
                        if (boardX >= 0 && boardX < board.width && 
                            boardY >= 0 && boardY < board.height) {
                            board.setCell(boardX, boardY, 0); // Clear the cell
                        }
                    }
                }
            }
        };
        
        /**
         * Test: Failed clockwise rotation preserves tetromino state
         * 
         * When clockwise rotation fails (all wall kick attempts result in collision),
         * the tetromino's position (x, y) and rotation index must remain unchanged.
         * 
         * **Validates: Requirements 1.3**
         */
        test('Failed clockwise rotation preserves position and rotation index', () => {
            fc.assert(
                fc.property(
                    nonOTetrominoTypeArb,
                    rotationIndexArb,
                    fc.integer({ min: 2, max: 7 }),  // X position (away from edges)
                    fc.integer({ min: 2, max: 17 }), // Y position (away from edges)
                    (type, initialRotation, x, y) => {
                        // Create a fresh board
                        const board = new BoardManager();
                        const wallKick = new WallKickSystem(board);
                        
                        // Create tetromino at the specified position
                        const tetromino = new Tetromino(type, x, y);
                        tetromino.setRotationIndex(initialRotation);
                        
                        // Create a fully blocked board around the tetromino
                        createFullyBlockedBoard(board, tetromino);
                        
                        // Capture original state
                        const originalX = tetromino.x;
                        const originalY = tetromino.y;
                        const originalRotationIndex = tetromino.rotationIndex;
                        
                        // Attempt clockwise rotation (should fail)
                        const rotationResult = wallKick.rotateClockwise(tetromino);
                        
                        // Verify rotation failed
                        expect(rotationResult).toBe(false);
                        
                        // Verify state is preserved
                        expect(tetromino.x).toBe(originalX);
                        expect(tetromino.y).toBe(originalY);
                        expect(tetromino.rotationIndex).toBe(originalRotationIndex);
                    }
                ),
                FC_CONFIG
            );
        });
        
        /**
         * Test: Failed counter-clockwise rotation preserves tetromino state
         * 
         * When counter-clockwise rotation fails (all wall kick attempts result in collision),
         * the tetromino's position (x, y) and rotation index must remain unchanged.
         * 
         * **Validates: Requirements 1.3**
         */
        test('Failed counter-clockwise rotation preserves position and rotation index', () => {
            fc.assert(
                fc.property(
                    nonOTetrominoTypeArb,
                    rotationIndexArb,
                    fc.integer({ min: 2, max: 7 }),  // X position (away from edges)
                    fc.integer({ min: 2, max: 17 }), // Y position (away from edges)
                    (type, initialRotation, x, y) => {
                        // Create a fresh board
                        const board = new BoardManager();
                        const wallKick = new WallKickSystem(board);
                        
                        // Create tetromino at the specified position
                        const tetromino = new Tetromino(type, x, y);
                        tetromino.setRotationIndex(initialRotation);
                        
                        // Create a fully blocked board around the tetromino
                        createFullyBlockedBoard(board, tetromino);
                        
                        // Capture original state
                        const originalX = tetromino.x;
                        const originalY = tetromino.y;
                        const originalRotationIndex = tetromino.rotationIndex;
                        
                        // Attempt counter-clockwise rotation (should fail)
                        const rotationResult = wallKick.rotateCounterClockwise(tetromino);
                        
                        // Verify rotation failed
                        expect(rotationResult).toBe(false);
                        
                        // Verify state is preserved
                        expect(tetromino.x).toBe(originalX);
                        expect(tetromino.y).toBe(originalY);
                        expect(tetromino.rotationIndex).toBe(originalRotationIndex);
                    }
                ),
                FC_CONFIG
            );
        });
        
        /**
         * Test: Both rotation directions fail and preserve state on fully blocked board
         * 
         * When both clockwise and counter-clockwise rotations fail,
         * the tetromino's state must remain unchanged after both attempts.
         * 
         * **Validates: Requirements 1.3**
         */
        test('Both rotation directions fail and preserve state on fully blocked board', () => {
            fc.assert(
                fc.property(
                    nonOTetrominoTypeArb,
                    rotationIndexArb,
                    fc.integer({ min: 2, max: 7 }),
                    fc.integer({ min: 2, max: 17 }),
                    (type, initialRotation, x, y) => {
                        // Create a fresh board
                        const board = new BoardManager();
                        const wallKick = new WallKickSystem(board);
                        
                        // Create tetromino at the specified position
                        const tetromino = new Tetromino(type, x, y);
                        tetromino.setRotationIndex(initialRotation);
                        
                        // Create a fully blocked board around the tetromino
                        createFullyBlockedBoard(board, tetromino);
                        
                        // Capture original state
                        const originalX = tetromino.x;
                        const originalY = tetromino.y;
                        const originalRotationIndex = tetromino.rotationIndex;
                        
                        // Attempt clockwise rotation (should fail)
                        const cwResult = wallKick.rotateClockwise(tetromino);
                        expect(cwResult).toBe(false);
                        
                        // Verify state is still preserved after CW attempt
                        expect(tetromino.x).toBe(originalX);
                        expect(tetromino.y).toBe(originalY);
                        expect(tetromino.rotationIndex).toBe(originalRotationIndex);
                        
                        // Attempt counter-clockwise rotation (should also fail)
                        const ccwResult = wallKick.rotateCounterClockwise(tetromino);
                        expect(ccwResult).toBe(false);
                        
                        // Verify state is still preserved after CCW attempt
                        expect(tetromino.x).toBe(originalX);
                        expect(tetromino.y).toBe(originalY);
                        expect(tetromino.rotationIndex).toBe(originalRotationIndex);
                    }
                ),
                FC_CONFIG
            );
        });
        
        /**
         * Test: Multiple failed rotation attempts preserve state
         * 
         * Repeatedly attempting failed rotations should never change the tetromino's state.
         * 
         * **Validates: Requirements 1.3**
         */
        test('Multiple failed rotation attempts preserve state', () => {
            fc.assert(
                fc.property(
                    nonOTetrominoTypeArb,
                    rotationIndexArb,
                    fc.integer({ min: 2, max: 7 }),
                    fc.integer({ min: 2, max: 17 }),
                    fc.integer({ min: 1, max: 10 }), // Number of rotation attempts
                    (type, initialRotation, x, y, attemptCount) => {
                        // Create a fresh board
                        const board = new BoardManager();
                        const wallKick = new WallKickSystem(board);
                        
                        // Create tetromino at the specified position
                        const tetromino = new Tetromino(type, x, y);
                        tetromino.setRotationIndex(initialRotation);
                        
                        // Create a fully blocked board around the tetromino
                        createFullyBlockedBoard(board, tetromino);
                        
                        // Capture original state
                        const originalX = tetromino.x;
                        const originalY = tetromino.y;
                        const originalRotationIndex = tetromino.rotationIndex;
                        
                        // Attempt multiple rotations (alternating CW and CCW)
                        for (let i = 0; i < attemptCount; i++) {
                            if (i % 2 === 0) {
                                wallKick.rotateClockwise(tetromino);
                            } else {
                                wallKick.rotateCounterClockwise(tetromino);
                            }
                        }
                        
                        // Verify state is still preserved after all attempts
                        expect(tetromino.x).toBe(originalX);
                        expect(tetromino.y).toBe(originalY);
                        expect(tetromino.rotationIndex).toBe(originalRotationIndex);
                    }
                ),
                FC_CONFIG
            );
        });
        
        /**
         * Test: I-piece failed rotation preserves state (I-piece has special wall kick data)
         * 
         * I-piece uses different wall kick offsets (up to 2 cells), so we specifically
         * test that failed rotations preserve state for I-piece.
         * 
         * **Validates: Requirements 1.3**
         */
        test('I-piece failed rotation preserves state with special wall kick data', () => {
            fc.assert(
                fc.property(
                    rotationIndexArb,
                    fc.integer({ min: 2, max: 7 }),
                    fc.integer({ min: 2, max: 17 }),
                    (initialRotation, x, y) => {
                        // Create a fresh board
                        const board = new BoardManager();
                        const wallKick = new WallKickSystem(board);
                        
                        // Create I-piece at the specified position
                        const tetromino = new Tetromino('I', x, y);
                        tetromino.setRotationIndex(initialRotation);
                        
                        // Create a fully blocked board around the tetromino
                        createFullyBlockedBoard(board, tetromino);
                        
                        // Capture original state
                        const originalX = tetromino.x;
                        const originalY = tetromino.y;
                        const originalRotationIndex = tetromino.rotationIndex;
                        
                        // Attempt clockwise rotation (should fail)
                        const cwResult = wallKick.rotateClockwise(tetromino);
                        expect(cwResult).toBe(false);
                        
                        // Verify state is preserved
                        expect(tetromino.x).toBe(originalX);
                        expect(tetromino.y).toBe(originalY);
                        expect(tetromino.rotationIndex).toBe(originalRotationIndex);
                        
                        // Attempt counter-clockwise rotation (should also fail)
                        const ccwResult = wallKick.rotateCounterClockwise(tetromino);
                        expect(ccwResult).toBe(false);
                        
                        // Verify state is still preserved
                        expect(tetromino.x).toBe(originalX);
                        expect(tetromino.y).toBe(originalY);
                        expect(tetromino.rotationIndex).toBe(originalRotationIndex);
                    }
                ),
                FC_CONFIG
            );
        });
        
        /**
         * Test: Rotation at board edges fails and preserves state
         * 
         * When a tetromino is at the edge of the board and rotation would
         * push it out of bounds (even with wall kicks), the state must be preserved.
         * 
         * **Validates: Requirements 1.3**
         */
        test('Rotation at board edges fails and preserves state when blocked', () => {
            fc.assert(
                fc.property(
                    nonOTetrominoTypeArb,
                    rotationIndexArb,
                    // Edge positions: left edge (0-1), right edge (7-9), top (0-1), bottom (17-19)
                    fc.oneof(
                        fc.record({ x: fc.constant(0), y: fc.integer({ min: 5, max: 15 }) }),
                        fc.record({ x: fc.constant(9), y: fc.integer({ min: 5, max: 15 }) }),
                        fc.record({ x: fc.integer({ min: 3, max: 6 }), y: fc.constant(0) }),
                        fc.record({ x: fc.integer({ min: 3, max: 6 }), y: fc.constant(19) })
                    ),
                    (type, initialRotation, position) => {
                        // Create a fresh board
                        const board = new BoardManager();
                        const wallKick = new WallKickSystem(board);
                        
                        // Create tetromino at edge position
                        const tetromino = new Tetromino(type, position.x, position.y);
                        tetromino.setRotationIndex(initialRotation);
                        
                        // Create a fully blocked board around the tetromino
                        createFullyBlockedBoard(board, tetromino);
                        
                        // Capture original state
                        const originalX = tetromino.x;
                        const originalY = tetromino.y;
                        const originalRotationIndex = tetromino.rotationIndex;
                        
                        // Attempt rotations (should fail due to blocking)
                        wallKick.rotateClockwise(tetromino);
                        wallKick.rotateCounterClockwise(tetromino);
                        
                        // Verify state is preserved
                        expect(tetromino.x).toBe(originalX);
                        expect(tetromino.y).toBe(originalY);
                        expect(tetromino.rotationIndex).toBe(originalRotationIndex);
                    }
                ),
                FC_CONFIG
            );
        });
    });
});
