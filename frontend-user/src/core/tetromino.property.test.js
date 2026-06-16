/**
 * Property-Based Tests for Tetromino Rotation
 * 
 * Tests universal properties of tetromino rotation using fast-check.
 * Each property test runs at least 100 iterations.
 * 
 * **Validates: Requirements 3.1, 3.2, 3.5**
 */

import { describe, test, expect } from '@jest/globals';
import * as fc from 'fast-check';
import {
    Tetromino,
    TETROMINO_TYPES,
    TETROMINO_ROTATIONS
} from './tetromino.js';

// Configuration for property tests - minimum 100 iterations
const FC_CONFIG = { numRuns: 100 };

// Arbitrary for non-O tetromino types (I, T, S, Z, J, L)
const nonOTetrominoTypeArb = fc.constantFrom('I', 'T', 'S', 'Z', 'J', 'L');

// Arbitrary for all tetromino types
const tetrominoTypeArb = fc.constantFrom(...TETROMINO_TYPES);

// Arbitrary for O tetromino type only
const oTetrominoTypeArb = fc.constant('O');

// Arbitrary for valid position coordinates
const positionArb = fc.record({
    x: fc.integer({ min: 0, max: 9 }),
    y: fc.integer({ min: 0, max: 19 })
});

// Arbitrary for initial rotation index (0-3)
const rotationIndexArb = fc.integer({ min: 0, max: 3 });

// Arbitrary for number of rotations to apply (1-20)
const rotationCountArb = fc.integer({ min: 1, max: 20 });

/**
 * Helper function to compare two shape matrices for equality
 * @param {number[][]} shape1 - First shape matrix
 * @param {number[][]} shape2 - Second shape matrix
 * @returns {boolean} - True if shapes are identical
 */
function shapesAreEqual(shape1, shape2) {
    if (shape1.length !== shape2.length) return false;
    for (let i = 0; i < shape1.length; i++) {
        if (shape1[i].length !== shape2[i].length) return false;
        for (let j = 0; j < shape1[i].length; j++) {
            if (shape1[i][j] !== shape2[i][j]) return false;
        }
    }
    return true;
}

/**
 * Helper function to deep clone a shape matrix
 * @param {number[][]} shape - Shape matrix to clone
 * @returns {number[][]} - Cloned shape matrix
 */
function cloneShape(shape) {
    return shape.map(row => [...row]);
}

describe('Property-Based Tests: Tetromino Rotation', () => {
    
    /**
     * Property 4: Rotation Transformation Correctness
     * 
     * *For any* tetromino (except O), applying 4 consecutive clockwise rotations 
     * SHALL return the shape to its original orientation. Similarly, rotating 
     * clockwise then counter-clockwise SHALL return to the original orientation 
     * (round-trip property).
     * 
     * **Validates: Requirements 3.1, 3.2**
     */
    describe('Property 4: Rotation Transformation Correctness', () => {
        
        test('4 consecutive clockwise rotations return to original orientation', () => {
            fc.assert(
                fc.property(
                    nonOTetrominoTypeArb,
                    positionArb,
                    rotationIndexArb,
                    (type, position, initialRotation) => {
                        // Create tetromino with given type and position
                        const tetromino = new Tetromino(type, position.x, position.y);
                        
                        // Set initial rotation state
                        tetromino.setRotationIndex(initialRotation);
                        
                        // Capture original shape
                        const originalShape = cloneShape(tetromino.shape);
                        const originalRotationIndex = tetromino.rotationIndex;
                        
                        // Apply 4 consecutive clockwise rotations
                        tetromino.rotateClockwise();
                        tetromino.rotateClockwise();
                        tetromino.rotateClockwise();
                        tetromino.rotateClockwise();
                        
                        // Verify shape returns to original
                        expect(shapesAreEqual(tetromino.shape, originalShape)).toBe(true);
                        expect(tetromino.rotationIndex).toBe(originalRotationIndex);
                    }
                ),
                FC_CONFIG
            );
        });

        test('4 consecutive counter-clockwise rotations return to original orientation', () => {
            fc.assert(
                fc.property(
                    nonOTetrominoTypeArb,
                    positionArb,
                    rotationIndexArb,
                    (type, position, initialRotation) => {
                        // Create tetromino with given type and position
                        const tetromino = new Tetromino(type, position.x, position.y);
                        
                        // Set initial rotation state
                        tetromino.setRotationIndex(initialRotation);
                        
                        // Capture original shape
                        const originalShape = cloneShape(tetromino.shape);
                        const originalRotationIndex = tetromino.rotationIndex;
                        
                        // Apply 4 consecutive counter-clockwise rotations
                        tetromino.rotateCounterClockwise();
                        tetromino.rotateCounterClockwise();
                        tetromino.rotateCounterClockwise();
                        tetromino.rotateCounterClockwise();
                        
                        // Verify shape returns to original
                        expect(shapesAreEqual(tetromino.shape, originalShape)).toBe(true);
                        expect(tetromino.rotationIndex).toBe(originalRotationIndex);
                    }
                ),
                FC_CONFIG
            );
        });

        test('clockwise then counter-clockwise rotation returns to original (round-trip)', () => {
            fc.assert(
                fc.property(
                    nonOTetrominoTypeArb,
                    positionArb,
                    rotationIndexArb,
                    (type, position, initialRotation) => {
                        // Create tetromino with given type and position
                        const tetromino = new Tetromino(type, position.x, position.y);
                        
                        // Set initial rotation state
                        tetromino.setRotationIndex(initialRotation);
                        
                        // Capture original shape
                        const originalShape = cloneShape(tetromino.shape);
                        const originalRotationIndex = tetromino.rotationIndex;
                        
                        // Apply clockwise then counter-clockwise
                        tetromino.rotateClockwise();
                        tetromino.rotateCounterClockwise();
                        
                        // Verify shape returns to original
                        expect(shapesAreEqual(tetromino.shape, originalShape)).toBe(true);
                        expect(tetromino.rotationIndex).toBe(originalRotationIndex);
                    }
                ),
                FC_CONFIG
            );
        });

        test('counter-clockwise then clockwise rotation returns to original (round-trip)', () => {
            fc.assert(
                fc.property(
                    nonOTetrominoTypeArb,
                    positionArb,
                    rotationIndexArb,
                    (type, position, initialRotation) => {
                        // Create tetromino with given type and position
                        const tetromino = new Tetromino(type, position.x, position.y);
                        
                        // Set initial rotation state
                        tetromino.setRotationIndex(initialRotation);
                        
                        // Capture original shape
                        const originalShape = cloneShape(tetromino.shape);
                        const originalRotationIndex = tetromino.rotationIndex;
                        
                        // Apply counter-clockwise then clockwise
                        tetromino.rotateCounterClockwise();
                        tetromino.rotateClockwise();
                        
                        // Verify shape returns to original
                        expect(shapesAreEqual(tetromino.shape, originalShape)).toBe(true);
                        expect(tetromino.rotationIndex).toBe(originalRotationIndex);
                    }
                ),
                FC_CONFIG
            );
        });

        test('N clockwise rotations followed by N counter-clockwise rotations returns to original', () => {
            fc.assert(
                fc.property(
                    nonOTetrominoTypeArb,
                    positionArb,
                    rotationIndexArb,
                    rotationCountArb,
                    (type, position, initialRotation, n) => {
                        // Create tetromino with given type and position
                        const tetromino = new Tetromino(type, position.x, position.y);
                        
                        // Set initial rotation state
                        tetromino.setRotationIndex(initialRotation);
                        
                        // Capture original shape
                        const originalShape = cloneShape(tetromino.shape);
                        const originalRotationIndex = tetromino.rotationIndex;
                        
                        // Apply N clockwise rotations
                        for (let i = 0; i < n; i++) {
                            tetromino.rotateClockwise();
                        }
                        
                        // Apply N counter-clockwise rotations
                        for (let i = 0; i < n; i++) {
                            tetromino.rotateCounterClockwise();
                        }
                        
                        // Verify shape returns to original
                        expect(shapesAreEqual(tetromino.shape, originalShape)).toBe(true);
                        expect(tetromino.rotationIndex).toBe(originalRotationIndex);
                    }
                ),
                FC_CONFIG
            );
        });

        test('4*N rotations always return to original for any N', () => {
            fc.assert(
                fc.property(
                    nonOTetrominoTypeArb,
                    positionArb,
                    rotationIndexArb,
                    fc.integer({ min: 1, max: 10 }),
                    (type, position, initialRotation, multiplier) => {
                        // Create tetromino with given type and position
                        const tetromino = new Tetromino(type, position.x, position.y);
                        
                        // Set initial rotation state
                        tetromino.setRotationIndex(initialRotation);
                        
                        // Capture original shape
                        const originalShape = cloneShape(tetromino.shape);
                        const originalRotationIndex = tetromino.rotationIndex;
                        
                        // Apply 4*N clockwise rotations
                        const totalRotations = 4 * multiplier;
                        for (let i = 0; i < totalRotations; i++) {
                            tetromino.rotateClockwise();
                        }
                        
                        // Verify shape returns to original
                        expect(shapesAreEqual(tetromino.shape, originalShape)).toBe(true);
                        expect(tetromino.rotationIndex).toBe(originalRotationIndex);
                    }
                ),
                FC_CONFIG
            );
        });
    });

    /**
     * Property 5: O-Tetromino Rotation Invariance
     * 
     * *For any* O-shaped tetromino, the shape matrix SHALL be identical 
     * before and after any rotation operation.
     * 
     * **Validates: Requirements 3.5**
     */
    describe('Property 5: O-Tetromino Rotation Invariance', () => {
        
        test('O-tetromino shape is identical after any number of clockwise rotations', () => {
            fc.assert(
                fc.property(
                    positionArb,
                    rotationCountArb,
                    (position, rotationCount) => {
                        // Create O tetromino
                        const tetromino = new Tetromino('O', position.x, position.y);
                        
                        // Capture original shape
                        const originalShape = cloneShape(tetromino.shape);
                        
                        // Apply N clockwise rotations
                        for (let i = 0; i < rotationCount; i++) {
                            tetromino.rotateClockwise();
                        }
                        
                        // Verify shape remains identical
                        expect(shapesAreEqual(tetromino.shape, originalShape)).toBe(true);
                    }
                ),
                FC_CONFIG
            );
        });

        test('O-tetromino shape is identical after any number of counter-clockwise rotations', () => {
            fc.assert(
                fc.property(
                    positionArb,
                    rotationCountArb,
                    (position, rotationCount) => {
                        // Create O tetromino
                        const tetromino = new Tetromino('O', position.x, position.y);
                        
                        // Capture original shape
                        const originalShape = cloneShape(tetromino.shape);
                        
                        // Apply N counter-clockwise rotations
                        for (let i = 0; i < rotationCount; i++) {
                            tetromino.rotateCounterClockwise();
                        }
                        
                        // Verify shape remains identical
                        expect(shapesAreEqual(tetromino.shape, originalShape)).toBe(true);
                    }
                ),
                FC_CONFIG
            );
        });

        test('O-tetromino shape is identical after mixed clockwise and counter-clockwise rotations', () => {
            fc.assert(
                fc.property(
                    positionArb,
                    fc.array(fc.boolean(), { minLength: 1, maxLength: 20 }),
                    (position, rotationDirections) => {
                        // Create O tetromino
                        const tetromino = new Tetromino('O', position.x, position.y);
                        
                        // Capture original shape
                        const originalShape = cloneShape(tetromino.shape);
                        
                        // Apply mixed rotations (true = clockwise, false = counter-clockwise)
                        for (const isClockwise of rotationDirections) {
                            if (isClockwise) {
                                tetromino.rotateClockwise();
                            } else {
                                tetromino.rotateCounterClockwise();
                            }
                        }
                        
                        // Verify shape remains identical
                        expect(shapesAreEqual(tetromino.shape, originalShape)).toBe(true);
                    }
                ),
                FC_CONFIG
            );
        });

        test('O-tetromino has exactly one rotation state', () => {
            fc.assert(
                fc.property(
                    positionArb,
                    (position) => {
                        // Create O tetromino
                        const tetromino = new Tetromino('O', position.x, position.y);
                        
                        // Verify O has exactly 1 rotation state
                        expect(tetromino.getRotationCount()).toBe(1);
                        expect(TETROMINO_ROTATIONS.O.length).toBe(1);
                    }
                ),
                FC_CONFIG
            );
        });

        test('O-tetromino rotation index always stays at 0', () => {
            fc.assert(
                fc.property(
                    positionArb,
                    rotationCountArb,
                    fc.boolean(),
                    (position, rotationCount, isClockwise) => {
                        // Create O tetromino
                        const tetromino = new Tetromino('O', position.x, position.y);
                        
                        // Apply N rotations in specified direction
                        for (let i = 0; i < rotationCount; i++) {
                            if (isClockwise) {
                                tetromino.rotateClockwise();
                            } else {
                                tetromino.rotateCounterClockwise();
                            }
                        }
                        
                        // Verify rotation index stays at 0
                        expect(tetromino.rotationIndex).toBe(0);
                    }
                ),
                FC_CONFIG
            );
        });

        test('O-tetromino shape is always 2x2 square regardless of rotations', () => {
            fc.assert(
                fc.property(
                    positionArb,
                    rotationCountArb,
                    (position, rotationCount) => {
                        // Create O tetromino
                        const tetromino = new Tetromino('O', position.x, position.y);
                        
                        // Apply N clockwise rotations
                        for (let i = 0; i < rotationCount; i++) {
                            tetromino.rotateClockwise();
                        }
                        
                        // Verify shape is always 2x2 with all cells filled
                        expect(tetromino.width).toBe(2);
                        expect(tetromino.height).toBe(2);
                        expect(tetromino.shape).toEqual([[1, 1], [1, 1]]);
                    }
                ),
                FC_CONFIG
            );
        });
    });
});
