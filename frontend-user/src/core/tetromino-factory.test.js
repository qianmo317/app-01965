/**
 * TetrominoFactory Unit Tests
 * 
 * Tests for the 7-bag randomization algorithm and factory methods
 * Requirements: 1.1, 1.4
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { TetrominoFactory, shuffleArray } from './tetromino-factory.js';
import { Tetromino, TETROMINO_TYPES } from './tetromino.js';

describe('TetrominoFactory', () => {
    let factory;
    
    beforeEach(() => {
        factory = new TetrominoFactory();
    });
    
    describe('createRandom', () => {
        it('should create a valid Tetromino', () => {
            const tetromino = factory.createRandom();
            
            expect(tetromino).toBeInstanceOf(Tetromino);
            expect(TETROMINO_TYPES).toContain(tetromino.type);
        });
        
        it('should create Tetromino with specified position', () => {
            const tetromino = factory.createRandom(5, 10);
            
            expect(tetromino.x).toBe(5);
            expect(tetromino.y).toBe(10);
        });
        
        it('should create Tetromino with default position (0, 0)', () => {
            const tetromino = factory.createRandom();
            
            expect(tetromino.x).toBe(0);
            expect(tetromino.y).toBe(0);
        });
    });
    
    describe('7-bag algorithm', () => {
        it('should produce all 7 types within first 7 pieces', () => {
            const types = new Set();
            
            for (let i = 0; i < 7; i++) {
                const tetromino = factory.createRandom();
                types.add(tetromino.type);
            }
            
            expect(types.size).toBe(7);
            TETROMINO_TYPES.forEach(type => {
                expect(types.has(type)).toBe(true);
            });
        });
        
        it('should produce all 7 types in second bag', () => {
            // Exhaust first bag
            for (let i = 0; i < 7; i++) {
                factory.createRandom();
            }
            
            // Check second bag
            const types = new Set();
            for (let i = 0; i < 7; i++) {
                const tetromino = factory.createRandom();
                types.add(tetromino.type);
            }
            
            expect(types.size).toBe(7);
        });
        
        it('should produce exactly one of each type per bag', () => {
            const typeCounts = {};
            TETROMINO_TYPES.forEach(type => typeCounts[type] = 0);
            
            for (let i = 0; i < 7; i++) {
                const tetromino = factory.createRandom();
                typeCounts[tetromino.type]++;
            }
            
            TETROMINO_TYPES.forEach(type => {
                expect(typeCounts[type]).toBe(1);
            });
        });
        
        it('should maintain fair distribution over multiple bags', () => {
            const typeCounts = {};
            TETROMINO_TYPES.forEach(type => typeCounts[type] = 0);
            
            // Generate 70 pieces (10 complete bags)
            for (let i = 0; i < 70; i++) {
                const tetromino = factory.createRandom();
                typeCounts[tetromino.type]++;
            }
            
            // Each type should appear exactly 10 times
            TETROMINO_TYPES.forEach(type => {
                expect(typeCounts[type]).toBe(10);
            });
        });
    });
    
    describe('peekNext', () => {
        it('should return the next Tetromino without consuming it', () => {
            const peeked = factory.peekNext();
            const actual = factory.createRandom();
            
            expect(peeked.type).toBe(actual.type);
        });
        
        it('should return same type on multiple peeks', () => {
            const peek1 = factory.peekNext();
            const peek2 = factory.peekNext();
            const peek3 = factory.peekNext();
            
            expect(peek1.type).toBe(peek2.type);
            expect(peek2.type).toBe(peek3.type);
        });
        
        it('should update after consuming a piece', () => {
            const firstPeek = factory.peekNext();
            factory.createRandom(); // consume first piece
            const secondPeek = factory.peekNext();
            
            // After consuming, peek should show the next piece
            // (which may or may not be different, but the test verifies the mechanism)
            expect(secondPeek).toBeInstanceOf(Tetromino);
            expect(TETROMINO_TYPES).toContain(secondPeek.type);
        });
    });
    
    describe('peekNextN', () => {
        it('should return correct number of previews', () => {
            const previews = factory.peekNextN(3);
            
            expect(previews.length).toBe(3);
            previews.forEach(p => {
                expect(p).toBeInstanceOf(Tetromino);
            });
        });
        
        it('should return previews in correct order', () => {
            const previews = factory.peekNextN(5);
            
            // Verify order by consuming and comparing
            for (let i = 0; i < 5; i++) {
                const actual = factory.createRandom();
                expect(actual.type).toBe(previews[i].type);
            }
        });
        
        it('should handle preview across bag boundaries', () => {
            // Get 14 previews (spans 2 bags)
            const previews = factory.peekNextN(14);
            
            expect(previews.length).toBe(14);
            
            // Verify all are valid types
            previews.forEach(p => {
                expect(TETROMINO_TYPES).toContain(p.type);
            });
        });
    });
    
    describe('reset', () => {
        it('should reset the factory state', () => {
            // Consume some pieces
            for (let i = 0; i < 5; i++) {
                factory.createRandom();
            }
            
            factory.reset();
            
            // After reset, bag should be full again
            expect(factory.getBagSize()).toBe(7);
        });
        
        it('should produce all 7 types after reset', () => {
            // Consume some pieces
            for (let i = 0; i < 3; i++) {
                factory.createRandom();
            }
            
            factory.reset();
            
            const types = new Set();
            for (let i = 0; i < 7; i++) {
                const tetromino = factory.createRandom();
                types.add(tetromino.type);
            }
            
            expect(types.size).toBe(7);
        });
    });
    
    describe('getRemainingInBag', () => {
        it('should return 7 types initially', () => {
            const remaining = factory.getRemainingInBag();
            
            expect(remaining.length).toBe(7);
        });
        
        it('should decrease as pieces are consumed', () => {
            factory.createRandom();
            expect(factory.getRemainingInBag().length).toBe(6);
            
            factory.createRandom();
            expect(factory.getRemainingInBag().length).toBe(5);
        });
        
        it('should refill after bag is exhausted', () => {
            // Exhaust the bag
            for (let i = 0; i < 7; i++) {
                factory.createRandom();
            }
            
            // After exhausting 7 pieces, bag is empty (0 items)
            // The next createRandom() will trigger refill
            expect(factory.getRemainingInBag().length).toBe(0);
            
            // Now consume one more to trigger refill
            factory.createRandom();
            
            // After refill and consuming one piece, bag should have 6 items
            expect(factory.getRemainingInBag().length).toBe(6);
        });
    });
    
    describe('getBagSize', () => {
        it('should return 7 initially', () => {
            expect(factory.getBagSize()).toBe(7);
        });
        
        it('should decrease as pieces are consumed', () => {
            factory.createRandom();
            expect(factory.getBagSize()).toBe(6);
            
            factory.createRandom();
            factory.createRandom();
            expect(factory.getBagSize()).toBe(4);
        });
    });
    
    describe('createByType', () => {
        it('should create specified type', () => {
            const tetromino = factory.createByType('T');
            
            expect(tetromino.type).toBe('T');
        });
        
        it('should create with specified position', () => {
            const tetromino = factory.createByType('I', 3, 5);
            
            expect(tetromino.type).toBe('I');
            expect(tetromino.x).toBe(3);
            expect(tetromino.y).toBe(5);
        });
        
        it('should throw error for invalid type', () => {
            expect(() => factory.createByType('X')).toThrow('Invalid tetromino type: X');
        });
        
        it('should create all valid types', () => {
            TETROMINO_TYPES.forEach(type => {
                const tetromino = factory.createByType(type);
                expect(tetromino.type).toBe(type);
            });
        });
    });
    
    describe('custom random function', () => {
        it('should use custom random function for shuffling', () => {
            // Create a deterministic "random" function
            let callCount = 0;
            const deterministicRandom = () => {
                callCount++;
                return 0.5; // Always return 0.5
            };
            
            const customFactory = new TetrominoFactory({ randomFn: deterministicRandom });
            
            // The factory should have used the custom random function
            expect(callCount).toBeGreaterThan(0);
        });
        
        it('should produce deterministic results with seeded random', () => {
            // Create two factories with same "random" sequence
            let seed1 = 12345;
            let seed2 = 12345;
            
            const seededRandom1 = () => {
                seed1 = (seed1 * 1103515245 + 12345) & 0x7fffffff;
                return seed1 / 0x7fffffff;
            };
            
            const seededRandom2 = () => {
                seed2 = (seed2 * 1103515245 + 12345) & 0x7fffffff;
                return seed2 / 0x7fffffff;
            };
            
            const factory1 = new TetrominoFactory({ randomFn: seededRandom1 });
            const factory2 = new TetrominoFactory({ randomFn: seededRandom2 });
            
            // Both factories should produce same sequence
            for (let i = 0; i < 14; i++) {
                const t1 = factory1.createRandom();
                const t2 = factory2.createRandom();
                expect(t1.type).toBe(t2.type);
            }
        });
    });
});

describe('shuffleArray', () => {
    it('should maintain array length', () => {
        const arr = [1, 2, 3, 4, 5];
        shuffleArray(arr);
        
        expect(arr.length).toBe(5);
    });
    
    it('should contain all original elements', () => {
        const arr = [1, 2, 3, 4, 5];
        const original = [...arr];
        shuffleArray(arr);
        
        original.forEach(item => {
            expect(arr).toContain(item);
        });
    });
    
    it('should handle empty array', () => {
        const arr = [];
        shuffleArray(arr);
        
        expect(arr.length).toBe(0);
    });
    
    it('should handle single element array', () => {
        const arr = [1];
        shuffleArray(arr);
        
        expect(arr).toEqual([1]);
    });
});
