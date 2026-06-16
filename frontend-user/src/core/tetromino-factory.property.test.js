/**
 * Property-Based Tests for Tetromino Generation
 * 
 * Tests universal properties of tetromino generation using fast-check.
 * Each property test runs at least 100 iterations.
 * 
 * **Validates: Requirements 1.1, 1.4**
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import * as fc from 'fast-check';
import { TetrominoFactory } from './tetromino-factory.js';
import { Tetromino, TETROMINO_TYPES } from './tetromino.js';

// Configuration for property tests - minimum 100 iterations
const FC_CONFIG = { numRuns: 100 };

// Valid tetromino types set for quick lookup
const VALID_TYPES_SET = new Set(TETROMINO_TYPES);

/**
 * Property 1: Tetromino Generation Validity
 * 
 * *For any* tetromino generation operation, the generated tetromino type 
 * SHALL always be one of the 7 valid types (I, O, T, S, Z, J, L), and over 
 * a large number of generations, all 7 types SHALL appear with non-zero frequency.
 * 
 * **Validates: Requirements 1.1, 1.4**
 */
describe('Property-Based Tests: Tetromino Generation', () => {
    
    describe('Property 1: Tetromino Generation Validity', () => {
        
        test('generated tetromino type is always one of the 7 valid types', () => {
            fc.assert(
                fc.property(
                    // Generate a seed for deterministic random
                    fc.integer({ min: 0, max: 2147483647 }),
                    // Generate number of pieces to create
                    fc.integer({ min: 1, max: 50 }),
                    (seed, pieceCount) => {
                        // Create seeded random function for reproducibility
                        let currentSeed = seed;
                        const seededRandom = () => {
                            currentSeed = (currentSeed * 1103515245 + 12345) & 0x7fffffff;
                            return currentSeed / 0x7fffffff;
                        };
                        
                        const factory = new TetrominoFactory({ randomFn: seededRandom });
                        
                        // Generate multiple pieces and verify each is valid
                        for (let i = 0; i < pieceCount; i++) {
                            const tetromino = factory.createRandom();
                            
                            // Verify tetromino is a valid instance
                            expect(tetromino).toBeInstanceOf(Tetromino);
                            
                            // Verify type is one of the 7 valid types
                            expect(VALID_TYPES_SET.has(tetromino.type)).toBe(true);
                        }
                    }
                ),
                FC_CONFIG
            );
        });

        test('all 7 types appear within any complete 7-bag cycle', () => {
            fc.assert(
                fc.property(
                    // Generate a seed for deterministic random
                    fc.integer({ min: 0, max: 2147483647 }),
                    // Generate number of complete bags to test
                    fc.integer({ min: 1, max: 10 }),
                    (seed, bagCount) => {
                        // Create seeded random function for reproducibility
                        let currentSeed = seed;
                        const seededRandom = () => {
                            currentSeed = (currentSeed * 1103515245 + 12345) & 0x7fffffff;
                            return currentSeed / 0x7fffffff;
                        };
                        
                        const factory = new TetrominoFactory({ randomFn: seededRandom });
                        
                        // Test each complete bag
                        for (let bag = 0; bag < bagCount; bag++) {
                            const typesInBag = new Set();
                            
                            // Generate exactly 7 pieces (one complete bag)
                            for (let i = 0; i < 7; i++) {
                                const tetromino = factory.createRandom();
                                typesInBag.add(tetromino.type);
                            }
                            
                            // Verify all 7 types appeared in this bag
                            expect(typesInBag.size).toBe(7);
                            TETROMINO_TYPES.forEach(type => {
                                expect(typesInBag.has(type)).toBe(true);
                            });
                        }
                    }
                ),
                FC_CONFIG
            );
        });

        test('each type appears exactly once per 7-bag cycle (fair distribution)', () => {
            fc.assert(
                fc.property(
                    // Generate a seed for deterministic random
                    fc.integer({ min: 0, max: 2147483647 }),
                    // Generate number of complete bags to test
                    fc.integer({ min: 1, max: 10 }),
                    (seed, bagCount) => {
                        // Create seeded random function for reproducibility
                        let currentSeed = seed;
                        const seededRandom = () => {
                            currentSeed = (currentSeed * 1103515245 + 12345) & 0x7fffffff;
                            return currentSeed / 0x7fffffff;
                        };
                        
                        const factory = new TetrominoFactory({ randomFn: seededRandom });
                        
                        // Test each complete bag
                        for (let bag = 0; bag < bagCount; bag++) {
                            const typeCounts = {};
                            TETROMINO_TYPES.forEach(type => typeCounts[type] = 0);
                            
                            // Generate exactly 7 pieces (one complete bag)
                            for (let i = 0; i < 7; i++) {
                                const tetromino = factory.createRandom();
                                typeCounts[tetromino.type]++;
                            }
                            
                            // Verify each type appeared exactly once
                            TETROMINO_TYPES.forEach(type => {
                                expect(typeCounts[type]).toBe(1);
                            });
                        }
                    }
                ),
                FC_CONFIG
            );
        });

        test('over large number of generations, all 7 types appear with non-zero frequency', () => {
            fc.assert(
                fc.property(
                    // Generate a seed for deterministic random
                    fc.integer({ min: 0, max: 2147483647 }),
                    (seed) => {
                        // Create seeded random function for reproducibility
                        let currentSeed = seed;
                        const seededRandom = () => {
                            currentSeed = (currentSeed * 1103515245 + 12345) & 0x7fffffff;
                            return currentSeed / 0x7fffffff;
                        };
                        
                        const factory = new TetrominoFactory({ randomFn: seededRandom });
                        
                        // Track type frequencies
                        const typeFrequencies = {};
                        TETROMINO_TYPES.forEach(type => typeFrequencies[type] = 0);
                        
                        // Generate 70 pieces (10 complete bags)
                        const totalPieces = 70;
                        for (let i = 0; i < totalPieces; i++) {
                            const tetromino = factory.createRandom();
                            typeFrequencies[tetromino.type]++;
                        }
                        
                        // Verify all types have non-zero frequency
                        TETROMINO_TYPES.forEach(type => {
                            expect(typeFrequencies[type]).toBeGreaterThan(0);
                        });
                        
                        // With 7-bag algorithm, each type should appear exactly 10 times
                        TETROMINO_TYPES.forEach(type => {
                            expect(typeFrequencies[type]).toBe(10);
                        });
                    }
                ),
                FC_CONFIG
            );
        });

        test('generated tetromino has valid shape and color', () => {
            fc.assert(
                fc.property(
                    // Generate a seed for deterministic random
                    fc.integer({ min: 0, max: 2147483647 }),
                    // Generate position
                    fc.integer({ min: 0, max: 9 }),
                    fc.integer({ min: 0, max: 19 }),
                    (seed, x, y) => {
                        // Create seeded random function for reproducibility
                        let currentSeed = seed;
                        const seededRandom = () => {
                            currentSeed = (currentSeed * 1103515245 + 12345) & 0x7fffffff;
                            return currentSeed / 0x7fffffff;
                        };
                        
                        const factory = new TetrominoFactory({ randomFn: seededRandom });
                        const tetromino = factory.createRandom(x, y);
                        
                        // Verify tetromino has valid properties
                        expect(tetromino.type).toBeDefined();
                        expect(tetromino.shape).toBeDefined();
                        expect(Array.isArray(tetromino.shape)).toBe(true);
                        expect(tetromino.shape.length).toBeGreaterThan(0);
                        expect(tetromino.color).toBeDefined();
                        expect(typeof tetromino.color).toBe('string');
                        
                        // Verify position is set correctly
                        expect(tetromino.x).toBe(x);
                        expect(tetromino.y).toBe(y);
                    }
                ),
                FC_CONFIG
            );
        });

        test('factory reset maintains generation validity', () => {
            fc.assert(
                fc.property(
                    // Generate a seed for deterministic random
                    fc.integer({ min: 0, max: 2147483647 }),
                    // Generate number of pieces before reset
                    fc.integer({ min: 1, max: 10 }),
                    (seed, piecesBeforeReset) => {
                        // Create seeded random function for reproducibility
                        let currentSeed = seed;
                        const seededRandom = () => {
                            currentSeed = (currentSeed * 1103515245 + 12345) & 0x7fffffff;
                            return currentSeed / 0x7fffffff;
                        };
                        
                        const factory = new TetrominoFactory({ randomFn: seededRandom });
                        
                        // Generate some pieces
                        for (let i = 0; i < piecesBeforeReset; i++) {
                            factory.createRandom();
                        }
                        
                        // Reset factory
                        factory.reset();
                        
                        // Verify bag is full after reset
                        expect(factory.getBagSize()).toBe(7);
                        
                        // Generate a complete bag and verify validity
                        const typesAfterReset = new Set();
                        for (let i = 0; i < 7; i++) {
                            const tetromino = factory.createRandom();
                            expect(VALID_TYPES_SET.has(tetromino.type)).toBe(true);
                            typesAfterReset.add(tetromino.type);
                        }
                        
                        // All 7 types should appear
                        expect(typesAfterReset.size).toBe(7);
                    }
                ),
                FC_CONFIG
            );
        });
    });
});
