/**
 * Unit Tests for Tetromino class
 * Tests specific examples and edge cases for tetromino functionality
 */

import { describe, test, expect } from '@jest/globals';
import {
    Tetromino,
    TETROMINO_SHAPES,
    TETROMINO_COLORS,
    TETROMINO_TYPES,
    TETROMINO_ROTATIONS,
    rotateMatrixClockwise,
    rotateMatrixCounterClockwise,
    cloneMatrix
} from './tetromino.js';

describe('TETROMINO_SHAPES', () => {
    test('should define all 7 standard tetromino shapes', () => {
        expect(Object.keys(TETROMINO_SHAPES)).toHaveLength(7);
        expect(TETROMINO_SHAPES).toHaveProperty('I');
        expect(TETROMINO_SHAPES).toHaveProperty('O');
        expect(TETROMINO_SHAPES).toHaveProperty('T');
        expect(TETROMINO_SHAPES).toHaveProperty('S');
        expect(TETROMINO_SHAPES).toHaveProperty('Z');
        expect(TETROMINO_SHAPES).toHaveProperty('J');
        expect(TETROMINO_SHAPES).toHaveProperty('L');
    });

    test('I shape should be a 1x4 horizontal line', () => {
        expect(TETROMINO_SHAPES.I).toEqual([[1, 1, 1, 1]]);
    });

    test('O shape should be a 2x2 square', () => {
        expect(TETROMINO_SHAPES.O).toEqual([[1, 1], [1, 1]]);
    });

    test('T shape should be T-shaped', () => {
        expect(TETROMINO_SHAPES.T).toEqual([[0, 1, 0], [1, 1, 1]]);
    });

    test('S shape should be S-shaped', () => {
        expect(TETROMINO_SHAPES.S).toEqual([[0, 1, 1], [1, 1, 0]]);
    });

    test('Z shape should be Z-shaped', () => {
        expect(TETROMINO_SHAPES.Z).toEqual([[1, 1, 0], [0, 1, 1]]);
    });

    test('J shape should be J-shaped', () => {
        expect(TETROMINO_SHAPES.J).toEqual([[1, 0, 0], [1, 1, 1]]);
    });

    test('L shape should be L-shaped', () => {
        expect(TETROMINO_SHAPES.L).toEqual([[0, 0, 1], [1, 1, 1]]);
    });
});

describe('TETROMINO_COLORS', () => {
    test('should define colors for all 7 tetromino types', () => {
        expect(Object.keys(TETROMINO_COLORS)).toHaveLength(7);
    });

    test('I should be cyan (#00f0f0)', () => {
        expect(TETROMINO_COLORS.I).toBe('#00f0f0');
    });

    test('O should be yellow (#f0f000)', () => {
        expect(TETROMINO_COLORS.O).toBe('#f0f000');
    });

    test('T should be purple (#a000f0)', () => {
        expect(TETROMINO_COLORS.T).toBe('#a000f0');
    });

    test('S should be green (#00f000)', () => {
        expect(TETROMINO_COLORS.S).toBe('#00f000');
    });

    test('Z should be red (#f00000)', () => {
        expect(TETROMINO_COLORS.Z).toBe('#f00000');
    });

    test('J should be blue (#0000f0)', () => {
        expect(TETROMINO_COLORS.J).toBe('#0000f0');
    });

    test('L should be orange (#f0a000)', () => {
        expect(TETROMINO_COLORS.L).toBe('#f0a000');
    });
});

describe('TETROMINO_TYPES', () => {
    test('should contain all 7 types', () => {
        expect(TETROMINO_TYPES).toEqual(['I', 'O', 'T', 'S', 'Z', 'J', 'L']);
    });
});

describe('TETROMINO_ROTATIONS', () => {
    test('O tetromino should have only 1 rotation state (Requirement 3.5)', () => {
        expect(TETROMINO_ROTATIONS.O).toHaveLength(1);
    });

    test('all non-O tetrominoes should have 4 rotation states', () => {
        const nonOTypes = ['I', 'T', 'S', 'Z', 'J', 'L'];
        for (const type of nonOTypes) {
            expect(TETROMINO_ROTATIONS[type]).toHaveLength(4);
        }
    });

    test('O rotation state should be identical to base shape', () => {
        expect(TETROMINO_ROTATIONS.O[0]).toEqual([[1, 1], [1, 1]]);
    });
});

describe('rotateMatrixClockwise', () => {
    test('should rotate a 1x4 matrix to 4x1', () => {
        const input = [[1, 2, 3, 4]];
        const expected = [[1], [2], [3], [4]];
        expect(rotateMatrixClockwise(input)).toEqual(expected);
    });

    test('should rotate a 2x3 matrix correctly', () => {
        const input = [
            [1, 2, 3],
            [4, 5, 6]
        ];
        const expected = [
            [4, 1],
            [5, 2],
            [6, 3]
        ];
        expect(rotateMatrixClockwise(input)).toEqual(expected);
    });

    test('should rotate a 2x2 matrix correctly', () => {
        const input = [
            [1, 2],
            [3, 4]
        ];
        const expected = [
            [3, 1],
            [4, 2]
        ];
        expect(rotateMatrixClockwise(input)).toEqual(expected);
    });
});

describe('rotateMatrixCounterClockwise', () => {
    test('should rotate a 4x1 matrix to 1x4', () => {
        const input = [[1], [2], [3], [4]];
        const expected = [[1, 2, 3, 4]];
        expect(rotateMatrixCounterClockwise(input)).toEqual(expected);
    });

    test('should rotate a 3x2 matrix correctly', () => {
        const input = [
            [4, 1],
            [5, 2],
            [6, 3]
        ];
        const expected = [
            [1, 2, 3],
            [4, 5, 6]
        ];
        expect(rotateMatrixCounterClockwise(input)).toEqual(expected);
    });

    test('should be inverse of clockwise rotation', () => {
        const input = [
            [1, 2, 3],
            [4, 5, 6]
        ];
        const rotatedCW = rotateMatrixClockwise(input);
        const rotatedBack = rotateMatrixCounterClockwise(rotatedCW);
        expect(rotatedBack).toEqual(input);
    });
});

describe('cloneMatrix', () => {
    test('should create a deep copy of the matrix', () => {
        const original = [[1, 2], [3, 4]];
        const cloned = cloneMatrix(original);
        
        expect(cloned).toEqual(original);
        expect(cloned).not.toBe(original);
        expect(cloned[0]).not.toBe(original[0]);
    });

    test('modifying clone should not affect original', () => {
        const original = [[1, 2], [3, 4]];
        const cloned = cloneMatrix(original);
        
        cloned[0][0] = 99;
        expect(original[0][0]).toBe(1);
    });
});

describe('Tetromino class', () => {
    describe('constructor', () => {
        test('should create a tetromino with correct type', () => {
            const tetromino = new Tetromino('I');
            expect(tetromino.type).toBe('I');
        });

        test('should set default position to (0, 0)', () => {
            const tetromino = new Tetromino('T');
            expect(tetromino.x).toBe(0);
            expect(tetromino.y).toBe(0);
        });

        test('should accept custom position', () => {
            const tetromino = new Tetromino('S', 5, 10);
            expect(tetromino.x).toBe(5);
            expect(tetromino.y).toBe(10);
        });

        test('should set correct color', () => {
            const tetromino = new Tetromino('I');
            expect(tetromino.color).toBe('#00f0f0');
        });

        test('should start with rotation index 0', () => {
            const tetromino = new Tetromino('T');
            expect(tetromino.rotationIndex).toBe(0);
        });

        test('should throw error for invalid type', () => {
            expect(() => new Tetromino('X')).toThrow('Invalid tetromino type: X');
        });
    });

    describe('shape getter', () => {
        test('should return current rotation shape', () => {
            const tetromino = new Tetromino('I');
            expect(tetromino.shape).toEqual([[1, 1, 1, 1]]);
        });

        test('should return updated shape after rotation', () => {
            const tetromino = new Tetromino('I');
            tetromino.rotateClockwise();
            expect(tetromino.shape).toEqual([[1], [1], [1], [1]]);
        });
    });

    describe('width and height getters', () => {
        test('I tetromino should have width 4 and height 1 initially', () => {
            const tetromino = new Tetromino('I');
            expect(tetromino.width).toBe(4);
            expect(tetromino.height).toBe(1);
        });

        test('O tetromino should have width 2 and height 2', () => {
            const tetromino = new Tetromino('O');
            expect(tetromino.width).toBe(2);
            expect(tetromino.height).toBe(2);
        });

        test('dimensions should update after rotation', () => {
            const tetromino = new Tetromino('I');
            tetromino.rotateClockwise();
            expect(tetromino.width).toBe(1);
            expect(tetromino.height).toBe(4);
        });
    });

    describe('rotateClockwise (Requirement 3.1)', () => {
        test('should increment rotation index', () => {
            const tetromino = new Tetromino('T');
            expect(tetromino.rotationIndex).toBe(0);
            tetromino.rotateClockwise();
            expect(tetromino.rotationIndex).toBe(1);
        });

        test('should wrap around after 4 rotations for non-O', () => {
            const tetromino = new Tetromino('T');
            tetromino.rotateClockwise();
            tetromino.rotateClockwise();
            tetromino.rotateClockwise();
            tetromino.rotateClockwise();
            expect(tetromino.rotationIndex).toBe(0);
        });

        test('O tetromino should stay at index 0 after rotation', () => {
            const tetromino = new Tetromino('O');
            tetromino.rotateClockwise();
            expect(tetromino.rotationIndex).toBe(0);
        });
    });

    describe('rotateCounterClockwise (Requirement 3.2)', () => {
        test('should decrement rotation index', () => {
            const tetromino = new Tetromino('T');
            tetromino.rotationIndex = 2;
            tetromino.rotateCounterClockwise();
            expect(tetromino.rotationIndex).toBe(1);
        });

        test('should wrap around from 0 to 3 for non-O', () => {
            const tetromino = new Tetromino('T');
            tetromino.rotateCounterClockwise();
            expect(tetromino.rotationIndex).toBe(3);
        });

        test('O tetromino should stay at index 0 after rotation', () => {
            const tetromino = new Tetromino('O');
            tetromino.rotateCounterClockwise();
            expect(tetromino.rotationIndex).toBe(0);
        });
    });

    describe('getRotatedShape', () => {
        test('should return next clockwise shape without changing state', () => {
            const tetromino = new Tetromino('T');
            const originalIndex = tetromino.rotationIndex;
            const rotatedShape = tetromino.getRotatedShape(1);
            
            expect(tetromino.rotationIndex).toBe(originalIndex);
            expect(rotatedShape).toEqual(TETROMINO_ROTATIONS.T[1]);
        });

        test('should return next counter-clockwise shape without changing state', () => {
            const tetromino = new Tetromino('T');
            const rotatedShape = tetromino.getRotatedShape(-1);
            
            expect(tetromino.rotationIndex).toBe(0);
            expect(rotatedShape).toEqual(TETROMINO_ROTATIONS.T[3]);
        });

        test('should return current shape for invalid direction', () => {
            const tetromino = new Tetromino('T');
            const shape = tetromino.getRotatedShape(0);
            expect(shape).toEqual(tetromino.shape);
        });
    });

    describe('getShapeAtRotation', () => {
        test('should return shape at specified rotation index', () => {
            const tetromino = new Tetromino('T');
            expect(tetromino.getShapeAtRotation(0)).toEqual(TETROMINO_ROTATIONS.T[0]);
            expect(tetromino.getShapeAtRotation(1)).toEqual(TETROMINO_ROTATIONS.T[1]);
            expect(tetromino.getShapeAtRotation(2)).toEqual(TETROMINO_ROTATIONS.T[2]);
            expect(tetromino.getShapeAtRotation(3)).toEqual(TETROMINO_ROTATIONS.T[3]);
        });

        test('should handle negative indices', () => {
            const tetromino = new Tetromino('T');
            expect(tetromino.getShapeAtRotation(-1)).toEqual(TETROMINO_ROTATIONS.T[3]);
        });

        test('should handle indices greater than rotation count', () => {
            const tetromino = new Tetromino('T');
            expect(tetromino.getShapeAtRotation(4)).toEqual(TETROMINO_ROTATIONS.T[0]);
            expect(tetromino.getShapeAtRotation(5)).toEqual(TETROMINO_ROTATIONS.T[1]);
        });
    });

    describe('getRotationCount', () => {
        test('O tetromino should return 1', () => {
            const tetromino = new Tetromino('O');
            expect(tetromino.getRotationCount()).toBe(1);
        });

        test('non-O tetrominoes should return 4', () => {
            const types = ['I', 'T', 'S', 'Z', 'J', 'L'];
            for (const type of types) {
                const tetromino = new Tetromino(type);
                expect(tetromino.getRotationCount()).toBe(4);
            }
        });
    });

    describe('setRotationIndex', () => {
        test('should set rotation index directly', () => {
            const tetromino = new Tetromino('T');
            tetromino.setRotationIndex(2);
            expect(tetromino.rotationIndex).toBe(2);
        });

        test('should normalize negative indices', () => {
            const tetromino = new Tetromino('T');
            tetromino.setRotationIndex(-1);
            expect(tetromino.rotationIndex).toBe(3);
        });

        test('should normalize indices greater than rotation count', () => {
            const tetromino = new Tetromino('T');
            tetromino.setRotationIndex(5);
            expect(tetromino.rotationIndex).toBe(1);
        });
    });

    describe('clone', () => {
        test('should create an independent copy', () => {
            const original = new Tetromino('T', 5, 10);
            original.rotationIndex = 2;
            
            const cloned = original.clone();
            
            expect(cloned.type).toBe(original.type);
            expect(cloned.x).toBe(original.x);
            expect(cloned.y).toBe(original.y);
            expect(cloned.rotationIndex).toBe(original.rotationIndex);
            expect(cloned.color).toBe(original.color);
        });

        test('modifying clone should not affect original', () => {
            const original = new Tetromino('T', 5, 10);
            const cloned = original.clone();
            
            cloned.x = 100;
            cloned.rotateClockwise();
            
            expect(original.x).toBe(5);
            expect(original.rotationIndex).toBe(0);
        });
    });

    describe('reset', () => {
        test('should reset position and rotation', () => {
            const tetromino = new Tetromino('T', 5, 10);
            tetromino.rotationIndex = 2;
            
            tetromino.reset();
            
            expect(tetromino.x).toBe(0);
            expect(tetromino.y).toBe(0);
            expect(tetromino.rotationIndex).toBe(0);
        });
    });

    describe('O-Tetromino Rotation Invariance (Requirement 3.5)', () => {
        test('O shape should be identical after any number of clockwise rotations', () => {
            const tetromino = new Tetromino('O');
            const originalShape = JSON.stringify(tetromino.shape);
            
            for (let i = 0; i < 10; i++) {
                tetromino.rotateClockwise();
                expect(JSON.stringify(tetromino.shape)).toBe(originalShape);
            }
        });

        test('O shape should be identical after any number of counter-clockwise rotations', () => {
            const tetromino = new Tetromino('O');
            const originalShape = JSON.stringify(tetromino.shape);
            
            for (let i = 0; i < 10; i++) {
                tetromino.rotateCounterClockwise();
                expect(JSON.stringify(tetromino.shape)).toBe(originalShape);
            }
        });
    });

    describe('4 clockwise rotations return to original (Requirement 3.1, 3.2)', () => {
        test('non-O tetrominoes should return to original after 4 clockwise rotations', () => {
            const types = ['I', 'T', 'S', 'Z', 'J', 'L'];
            
            for (const type of types) {
                const tetromino = new Tetromino(type);
                const originalShape = JSON.stringify(tetromino.shape);
                
                tetromino.rotateClockwise();
                tetromino.rotateClockwise();
                tetromino.rotateClockwise();
                tetromino.rotateClockwise();
                
                expect(JSON.stringify(tetromino.shape)).toBe(originalShape);
            }
        });

        test('clockwise then counter-clockwise should return to original', () => {
            const types = ['I', 'T', 'S', 'Z', 'J', 'L'];
            
            for (const type of types) {
                const tetromino = new Tetromino(type);
                const originalShape = JSON.stringify(tetromino.shape);
                
                tetromino.rotateClockwise();
                tetromino.rotateCounterClockwise();
                
                expect(JSON.stringify(tetromino.shape)).toBe(originalShape);
            }
        });
    });
});
