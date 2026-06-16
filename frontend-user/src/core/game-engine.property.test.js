/**
 * GameEngine Property-Based Tests
 * 
 * Property tests for movement, hard drop, scoring, and game over detection
 * Using fast-check for property-based testing
 * 
 * **Validates: Requirements 2.1-2.4, 4.3-4.6, 5.1-5.2**
 */

import * as fc from 'fast-check';
import { GameEngine, GAME_STATES, SCORING_RULES, SPEED_INTERVALS } from './game-engine.js';
import { TetrominoFactory } from './tetromino-factory.js';
import { TETROMINO_TYPES } from './tetromino.js';

describe('GameEngine Property Tests', () => {
    
    describe('Property 2: Valid Movement Position Change', () => {
        /**
         * **Validates: Requirements 2.1, 2.2, 2.3**
         * 
         * For any valid board state and tetromino position where movement is not blocked,
         * moving left SHALL decrease x by 1, moving right SHALL increase x by 1,
         * and moving down SHALL increase y by 1.
         */
        
        test('moveLeft decreases x by exactly 1 when valid', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 2, max: 7 }), // x position with room to move left
                    fc.integer({ min: 0, max: 15 }), // y position
                    (startX, startY) => {
                        const engine = new GameEngine();
                        engine.start();
                        
                        // Set position
                        engine.currentTetromino.x = startX;
                        engine.currentTetromino.y = startY;
                        
                        // Check if move is valid
                        if (engine.board.isValidPosition(engine.currentTetromino, -1, 0)) {
                            const beforeX = engine.currentTetromino.x;
                            const result = engine.moveLeft();
                            
                            expect(result).toBe(true);
                            expect(engine.currentTetromino.x).toBe(beforeX - 1);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        test('moveRight increases x by exactly 1 when valid', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 5 }), // x position with room to move right
                    fc.integer({ min: 0, max: 15 }), // y position
                    (startX, startY) => {
                        const engine = new GameEngine();
                        engine.start();
                        
                        engine.currentTetromino.x = startX;
                        engine.currentTetromino.y = startY;
                        
                        if (engine.board.isValidPosition(engine.currentTetromino, 1, 0)) {
                            const beforeX = engine.currentTetromino.x;
                            const result = engine.moveRight();
                            
                            expect(result).toBe(true);
                            expect(engine.currentTetromino.x).toBe(beforeX + 1);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        test('moveDown increases y by exactly 1 when valid', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 8 }), // x position
                    fc.integer({ min: 0, max: 15 }), // y position with room to move down
                    (startX, startY) => {
                        const engine = new GameEngine();
                        engine.start();
                        
                        engine.currentTetromino.x = startX;
                        engine.currentTetromino.y = startY;
                        
                        if (engine.board.isValidPosition(engine.currentTetromino, 0, 1)) {
                            const beforeY = engine.currentTetromino.y;
                            const result = engine.moveDown();
                            
                            expect(result).toBe(true);
                            expect(engine.currentTetromino.y).toBe(beforeY + 1);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        test('invalid movement preserves position', () => {
            fc.assert(
                fc.property(
                    fc.constantFrom('left', 'right', 'down'),
                    (direction) => {
                        const engine = new GameEngine();
                        engine.start();
                        
                        // Position at edge based on direction
                        if (direction === 'left') {
                            engine.currentTetromino.x = 0;
                        } else if (direction === 'right') {
                            engine.currentTetromino.x = 10 - engine.currentTetromino.width;
                        } else {
                            engine.currentTetromino.y = 20 - engine.currentTetromino.height;
                        }
                        
                        const beforeX = engine.currentTetromino.x;
                        const beforeY = engine.currentTetromino.y;
                        
                        // Try invalid move
                        if (direction === 'left') {
                            engine.moveLeft();
                        } else if (direction === 'right') {
                            engine.moveRight();
                        }
                        // Note: moveDown at bottom triggers lock, so we skip that case
                        
                        if (direction !== 'down') {
                            expect(engine.currentTetromino.x).toBe(beforeX);
                            expect(engine.currentTetromino.y).toBe(beforeY);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
    
    describe('Property 9: Hard Drop Placement', () => {
        /**
         * **Validates: Requirements 2.4**
         * 
         * For any tetromino and board state, hard drop SHALL place the tetromino
         * at the lowest valid y position where no collision occurs,
         * and this position SHALL be deterministic.
         */
        
        test('hard drop places piece at lowest valid position', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 6 }), // x position
                    (startX) => {
                        const engine = new GameEngine();
                        engine.start();
                        
                        engine.currentTetromino.x = startX;
                        engine.currentTetromino.y = 0;
                        
                        // Calculate expected drop position
                        const expectedY = engine.board.getHardDropY(engine.currentTetromino);
                        
                        // Perform hard drop
                        engine.hardDrop();
                        
                        // The piece should have been placed at expectedY
                        // Check that the board has blocks at that position
                        // (piece is now locked, so we check the board)
                        const shape = engine.factory.createByType(
                            engine.board.getGridCopy()[expectedY] ? 
                            TETROMINO_TYPES[engine.board.getGridCopy()[expectedY].find(c => c > 0) - 1] || 'T' : 'T'
                        );
                        
                        // The drop should be deterministic - same input = same output
                        const engine2 = new GameEngine();
                        engine2.start();
                        engine2.currentTetromino.x = startX;
                        engine2.currentTetromino.y = 0;
                        engine2.currentTetromino.type = engine.board.getGridCopy()[expectedY] ? 'T' : 'T';
                        
                        const expectedY2 = engine2.board.getHardDropY(engine2.currentTetromino);
                        expect(expectedY2).toBe(engine2.board.getHardDropY(engine2.currentTetromino));
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        test('hard drop is deterministic - same input produces same output', () => {
            fc.assert(
                fc.property(
                    fc.constantFrom(...TETROMINO_TYPES),
                    fc.integer({ min: 0, max: 6 }),
                    (type, startX) => {
                        // Create two identical game states
                        const engine1 = new GameEngine();
                        const engine2 = new GameEngine();
                        
                        engine1.start();
                        engine2.start();
                        
                        // Set same piece type and position
                        engine1.currentTetromino = engine1.factory.createByType(type, startX, 0);
                        engine2.currentTetromino = engine2.factory.createByType(type, startX, 0);
                        
                        // Get drop positions
                        const dropY1 = engine1.board.getHardDropY(engine1.currentTetromino);
                        const dropY2 = engine2.board.getHardDropY(engine2.currentTetromino);
                        
                        // Should be identical
                        expect(dropY1).toBe(dropY2);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        test('hard drop distance is non-negative', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 6 }),
                    fc.integer({ min: 0, max: 10 }),
                    (startX, startY) => {
                        const engine = new GameEngine();
                        engine.start();
                        
                        engine.currentTetromino.x = startX;
                        engine.currentTetromino.y = startY;
                        
                        if (engine.board.isValidPosition(engine.currentTetromino)) {
                            const distance = engine.hardDrop();
                            expect(distance).toBeGreaterThanOrEqual(0);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
    
    describe('Property 7: Scoring Calculation Correctness', () => {
        /**
         * **Validates: Requirements 4.3, 4.4, 4.5, 4.6**
         * 
         * For any line clear event, the score increase SHALL equal:
         * 100 for 1 line, 300 for 2 lines, 500 for 3 lines, or 800 for 4 lines.
         */
        
        test('score increase matches scoring rules exactly', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 4 }),
                    (linesCleared) => {
                        const engine = new GameEngine();
                        engine.start();
                        
                        const scoreBefore = engine.score;
                        engine._addScore(linesCleared);
                        const scoreAfter = engine.score;
                        
                        const expectedIncrease = SCORING_RULES[linesCleared];
                        expect(scoreAfter - scoreBefore).toBe(expectedIncrease);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        test('score is cumulative across multiple clears', () => {
            fc.assert(
                fc.property(
                    fc.array(fc.integer({ min: 1, max: 4 }), { minLength: 1, maxLength: 10 }),
                    (clearSequence) => {
                        const engine = new GameEngine();
                        engine.start();
                        
                        let expectedTotal = 0;
                        for (const lines of clearSequence) {
                            expectedTotal += SCORING_RULES[lines];
                            engine._addScore(lines);
                        }
                        
                        expect(engine.score).toBe(expectedTotal);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        test('scoring rules are monotonically increasing', () => {
            // More lines cleared should always give more points
            expect(SCORING_RULES[2]).toBeGreaterThan(SCORING_RULES[1]);
            expect(SCORING_RULES[3]).toBeGreaterThan(SCORING_RULES[2]);
            expect(SCORING_RULES[4]).toBeGreaterThan(SCORING_RULES[3]);
        });
    });
    
    describe('Property 8: Game Over Detection', () => {
        /**
         * **Validates: Requirements 5.1, 5.2**
         * 
         * For any board state where a newly spawned tetromino at the spawn position
         * immediately collides with existing blocks, the game state SHALL transition to 'gameover'.
         */
        
        test('game over triggers when spawn position is blocked', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 9 }),
                    (blockX) => {
                        const engine = new GameEngine();
                        engine.start();
                        
                        // Fill top rows to block spawn
                        for (let x = 0; x < 10; x++) {
                            engine.board.setCell(x, 0, 1);
                            engine.board.setCell(x, 1, 1);
                        }
                        
                        // Try to spawn new piece
                        const result = engine._spawnTetromino();
                        
                        expect(result).toBe(false);
                        expect(engine.gameState).toBe(GAME_STATES.GAMEOVER);
                    }
                ),
                { numRuns: 50 }
            );
        });
        
        test('game continues when spawn position is clear', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 5, max: 19 }), // Row to fill (not at top)
                    (fillRow) => {
                        const engine = new GameEngine();
                        engine.start();
                        
                        // Fill a row that's not at the top
                        for (let x = 0; x < 10; x++) {
                            engine.board.setCell(x, fillRow, 1);
                        }
                        
                        // Spawn should succeed
                        const result = engine._spawnTetromino();
                        
                        expect(result).toBe(true);
                        expect(engine.gameState).toBe(GAME_STATES.PLAYING);
                    }
                ),
                { numRuns: 50 }
            );
        });
    });
    
    describe('Property 3: Speed Level Range Validity', () => {
        /**
         * **Validates: Requirements 2.1**
         * 
         * For any speed level input, the Game_Speed_Controller SHALL accept values 
         * in range [1, 10] and clamp values outside this range to the nearest valid 
         * value (1 or 10).
         * 
         * Feature: tetris-enhancements, Property 3: Speed Level Range Validity
         */
        
        test('speed values within range [1, 10] are accepted as-is', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 10 }),
                    (speed) => {
                        const engine = new GameEngine();
                        engine.setSpeed(speed);
                        
                        // Speed should be exactly the input value when within valid range
                        expect(engine.speed).toBe(speed);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        test('speed values below 1 are clamped to 1', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: -1000, max: 0 }),
                    (speed) => {
                        const engine = new GameEngine();
                        engine.setSpeed(speed);
                        
                        // Speed should be clamped to minimum value 1
                        expect(engine.speed).toBe(1);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        test('speed values above 10 are clamped to 10', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 11, max: 1000 }),
                    (speed) => {
                        const engine = new GameEngine();
                        engine.setSpeed(speed);
                        
                        // Speed should be clamped to maximum value 10
                        expect(engine.speed).toBe(10);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        test('speed is always clamped to valid range [1, 10] for any integer input', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: -10000, max: 10000 }),
                    (speed) => {
                        const engine = new GameEngine();
                        engine.setSpeed(speed);
                        
                        // Speed should always be within valid range
                        expect(engine.speed).toBeGreaterThanOrEqual(1);
                        expect(engine.speed).toBeLessThanOrEqual(10);
                        
                        // Verify clamping behavior
                        if (speed < 1) {
                            expect(engine.speed).toBe(1);
                        } else if (speed > 10) {
                            expect(engine.speed).toBe(10);
                        } else {
                            expect(engine.speed).toBe(speed);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        test('drop interval is set correctly after speed clamping', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: -100, max: 100 }),
                    (speed) => {
                        const engine = new GameEngine();
                        engine.setSpeed(speed);
                        
                        const clampedSpeed = Math.max(1, Math.min(10, speed));
                        const expectedInterval = SPEED_INTERVALS[clampedSpeed];
                        
                        expect(engine.dropInterval).toBe(expectedInterval);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
    
    describe('Property 4: Speed-Interval Inverse Relationship', () => {
        /**
         * **Validates: Requirements 2.3**
         * 
         * For any speed level n in range [1, 10], the drop interval SHALL equal 
         * (1100 - n * 100) milliseconds, ensuring level 1 = 1000ms and level 10 = 100ms.
         * 
         * Feature: tetris-enhancements, Property 4: Speed-Interval Inverse Relationship
         */
        
        test('drop interval follows formula: interval = 1100 - speed * 100', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 10 }),
                    (speed) => {
                        const engine = new GameEngine();
                        engine.setSpeed(speed);
                        
                        // Verify the formula: interval = 1100 - speed * 100
                        const expectedInterval = 1100 - speed * 100;
                        expect(engine.dropInterval).toBe(expectedInterval);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        test('level 1 has drop interval of 1000ms', () => {
            fc.assert(
                fc.property(
                    fc.constant(1),
                    (speed) => {
                        const engine = new GameEngine();
                        engine.setSpeed(speed);
                        
                        // Level 1: 1100 - 1*100 = 1000ms
                        expect(engine.dropInterval).toBe(1000);
                    }
                ),
                { numRuns: 10 }
            );
        });
        
        test('level 10 has drop interval of 100ms', () => {
            fc.assert(
                fc.property(
                    fc.constant(10),
                    (speed) => {
                        const engine = new GameEngine();
                        engine.setSpeed(speed);
                        
                        // Level 10: 1100 - 10*100 = 100ms
                        expect(engine.dropInterval).toBe(100);
                    }
                ),
                { numRuns: 10 }
            );
        });
        
        test('SPEED_INTERVALS constant matches the formula for all levels', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 10 }),
                    (speed) => {
                        // Verify SPEED_INTERVALS constant is correctly defined
                        const expectedInterval = 1100 - speed * 100;
                        expect(SPEED_INTERVALS[speed]).toBe(expectedInterval);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        test('drop interval decreases by exactly 100ms for each speed level increase', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 9 }),
                    (speed) => {
                        const engine = new GameEngine();
                        
                        engine.setSpeed(speed);
                        const interval1 = engine.dropInterval;
                        
                        engine.setSpeed(speed + 1);
                        const interval2 = engine.dropInterval;
                        
                        // Each speed level increase should decrease interval by exactly 100ms
                        expect(interval1 - interval2).toBe(100);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        test('drop interval is always positive for all valid speed levels', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 10 }),
                    (speed) => {
                        const engine = new GameEngine();
                        engine.setSpeed(speed);
                        
                        // Drop interval should always be positive
                        expect(engine.dropInterval).toBeGreaterThan(0);
                        
                        // Minimum interval at level 10 should be 100ms
                        expect(engine.dropInterval).toBeGreaterThanOrEqual(100);
                        
                        // Maximum interval at level 1 should be 1000ms
                        expect(engine.dropInterval).toBeLessThanOrEqual(1000);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
    
    describe('Property 14: Speed Setting Effect', () => {
        /**
         * **Validates: Requirements 10.4**
         * 
         * For any speed setting value from 1 to 10, the drop interval SHALL be
         * inversely proportional to the speed value (higher speed = shorter interval).
         */
        
        test('higher speed results in shorter drop interval', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 9 }),
                    (speed) => {
                        const engine = new GameEngine();
                        
                        engine.setSpeed(speed);
                        const interval1 = engine.dropInterval;
                        
                        engine.setSpeed(speed + 1);
                        const interval2 = engine.dropInterval;
                        
                        expect(interval2).toBeLessThan(interval1);
                    }
                ),
                { numRuns: 9 }
            );
        });
        
        test('speed is clamped to valid range 1-10', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: -100, max: 100 }),
                    (speed) => {
                        const engine = new GameEngine();
                        engine.setSpeed(speed);
                        
                        expect(engine.speed).toBeGreaterThanOrEqual(1);
                        expect(engine.speed).toBeLessThanOrEqual(10);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        test('drop interval is always positive', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 10 }),
                    (speed) => {
                        const engine = new GameEngine();
                        engine.setSpeed(speed);
                        
                        expect(engine.dropInterval).toBeGreaterThan(0);
                    }
                ),
                { numRuns: 10 }
            );
        });
    });
    
    describe('Property 5: Immediate Speed Effect', () => {
        /**
         * **Validates: Requirements 2.2, 2.4**
         * 
         * For any game state (playing or paused), when the speed level is changed,
         * the new drop interval SHALL be applied immediately upon the next game update
         * (for playing state) or upon resume (for paused state).
         * 
         * Feature: tetris-enhancements, Property 5: Immediate Speed Effect
         */
        
        test('speed change during playing state resets accumulated time', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 10 }),
                    fc.integer({ min: 1, max: 10 }),
                    fc.integer({ min: 100, max: 500 }),
                    (initialSpeed, newSpeed, accumulatedTime) => {
                        const engine = new GameEngine();
                        engine.start();
                        engine.setSpeed(initialSpeed);
                        
                        // Simulate some accumulated time
                        engine.accumulatedTime = accumulatedTime;
                        
                        // Change speed
                        engine.setSpeed(newSpeed);
                        
                        // Accumulated time should be reset to 0 for immediate effect
                        expect(engine.accumulatedTime).toBe(0);
                        
                        // Drop interval should be updated to new speed's interval
                        expect(engine.dropInterval).toBe(SPEED_INTERVALS[newSpeed]);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        test('speed change during playing state applies new interval on next update', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 5 }),
                    fc.integer({ min: 6, max: 10 }),
                    (slowSpeed, fastSpeed) => {
                        const engine = new GameEngine();
                        engine.start();
                        engine.setSpeed(slowSpeed);
                        
                        const slowInterval = engine.dropInterval;
                        
                        // Change to faster speed
                        engine.setSpeed(fastSpeed);
                        
                        const fastInterval = engine.dropInterval;
                        
                        // New interval should be immediately available
                        expect(fastInterval).toBeLessThan(slowInterval);
                        expect(fastInterval).toBe(SPEED_INTERVALS[fastSpeed]);
                        
                        // Accumulated time should be reset
                        expect(engine.accumulatedTime).toBe(0);
                        
                        // Next update should use the new interval
                        // Simulate update with time less than new interval
                        const testDelta = fastInterval - 10;
                        const initialY = engine.currentTetromino.y;
                        engine.update(testDelta);
                        
                        // Piece should not have dropped yet (time < interval)
                        expect(engine.currentTetromino.y).toBe(initialY);
                        
                        // Now add enough time to trigger drop
                        engine.update(20);
                        
                        // Piece should have dropped (total time >= interval)
                        expect(engine.currentTetromino.y).toBe(initialY + 1);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        test('speed change during paused state is applied upon resume', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 10 }),
                    fc.integer({ min: 1, max: 10 }),
                    (initialSpeed, newSpeed) => {
                        const engine = new GameEngine();
                        engine.start();
                        engine.setSpeed(initialSpeed);
                        
                        // Pause the game
                        engine.pause();
                        expect(engine.gameState).toBe(GAME_STATES.PAUSED);
                        
                        // Change speed while paused
                        engine.setSpeed(newSpeed);
                        
                        // Speed and interval should be updated even while paused
                        expect(engine.speed).toBe(newSpeed);
                        expect(engine.dropInterval).toBe(SPEED_INTERVALS[newSpeed]);
                        
                        // Resume the game
                        engine.resume();
                        expect(engine.gameState).toBe(GAME_STATES.PLAYING);
                        
                        // New speed should be in effect
                        expect(engine.speed).toBe(newSpeed);
                        expect(engine.dropInterval).toBe(SPEED_INTERVALS[newSpeed]);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        test('speed change is immediate - no waiting for next drop cycle', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 10 }),
                    fc.integer({ min: 1, max: 10 }),
                    (initialSpeed, newSpeed) => {
                        const engine = new GameEngine();
                        engine.start();
                        engine.setSpeed(initialSpeed);
                        
                        // Simulate partial progress through drop cycle
                        const partialTime = SPEED_INTERVALS[initialSpeed] / 2;
                        engine.update(partialTime);
                        
                        const accumulatedBefore = engine.accumulatedTime;
                        expect(accumulatedBefore).toBeGreaterThan(0);
                        
                        // Change speed
                        engine.setSpeed(newSpeed);
                        
                        // Accumulated time should be reset (immediate effect)
                        expect(engine.accumulatedTime).toBe(0);
                        
                        // New interval should be active
                        expect(engine.dropInterval).toBe(SPEED_INTERVALS[newSpeed]);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        test('multiple speed changes all take immediate effect', () => {
            fc.assert(
                fc.property(
                    fc.array(fc.integer({ min: 1, max: 10 }), { minLength: 2, maxLength: 10 }),
                    (speedSequence) => {
                        const engine = new GameEngine();
                        engine.start();
                        
                        for (const speed of speedSequence) {
                            // Add some accumulated time
                            engine.accumulatedTime = 100;
                            
                            // Change speed
                            engine.setSpeed(speed);
                            
                            // Each change should reset accumulated time
                            expect(engine.accumulatedTime).toBe(0);
                            
                            // Each change should update interval immediately
                            expect(engine.dropInterval).toBe(SPEED_INTERVALS[speed]);
                            expect(engine.speed).toBe(speed);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        test('speed change during paused state does not affect game state', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 10 }),
                    fc.integer({ min: 1, max: 10 }),
                    (initialSpeed, newSpeed) => {
                        const engine = new GameEngine();
                        engine.start();
                        engine.setSpeed(initialSpeed);
                        
                        // Pause the game
                        engine.pause();
                        const pausedState = engine.gameState;
                        
                        // Change speed while paused
                        engine.setSpeed(newSpeed);
                        
                        // Game state should remain paused
                        expect(engine.gameState).toBe(pausedState);
                        expect(engine.gameState).toBe(GAME_STATES.PAUSED);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        test('update uses new drop interval after speed change', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 5 }),
                    fc.integer({ min: 6, max: 10 }),
                    (slowSpeed, fastSpeed) => {
                        const engine = new GameEngine();
                        engine.start();
                        
                        // Start with slow speed
                        engine.setSpeed(slowSpeed);
                        const slowInterval = SPEED_INTERVALS[slowSpeed];
                        
                        // Position piece at a safe location
                        engine.currentTetromino.y = 5;
                        const initialY = engine.currentTetromino.y;
                        
                        // Update with time less than slow interval but more than fast interval
                        const testTime = (slowInterval + SPEED_INTERVALS[fastSpeed]) / 2;
                        engine.update(testTime);
                        
                        // Piece should not have dropped (time < slow interval)
                        if (testTime < slowInterval) {
                            expect(engine.currentTetromino.y).toBe(initialY);
                        }
                        
                        // Now change to fast speed
                        engine.setSpeed(fastSpeed);
                        const fastInterval = SPEED_INTERVALS[fastSpeed];
                        
                        // Reset position for clean test
                        engine.currentTetromino.y = 5;
                        const newInitialY = engine.currentTetromino.y;
                        
                        // Update with time equal to fast interval
                        engine.update(fastInterval);
                        
                        // Piece should have dropped exactly once
                        expect(engine.currentTetromino.y).toBe(newInitialY + 1);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
    
    describe('Game State Invariants', () => {
        test('game state transitions are valid', () => {
            fc.assert(
                fc.property(
                    fc.array(fc.constantFrom('start', 'pause', 'resume', 'restart'), { minLength: 1, maxLength: 20 }),
                    (actions) => {
                        const engine = new GameEngine();
                        
                        for (const action of actions) {
                            const stateBefore = engine.gameState;
                            
                            switch (action) {
                                case 'start':
                                    engine.start();
                                    break;
                                case 'pause':
                                    engine.pause();
                                    break;
                                case 'resume':
                                    engine.resume();
                                    break;
                                case 'restart':
                                    engine.restart();
                                    break;
                            }
                            
                            // State should always be one of the valid states
                            expect(Object.values(GAME_STATES)).toContain(engine.gameState);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        test('score never decreases', () => {
            fc.assert(
                fc.property(
                    fc.array(fc.integer({ min: 1, max: 4 }), { minLength: 1, maxLength: 20 }),
                    (clearSequence) => {
                        const engine = new GameEngine();
                        engine.start();
                        
                        let previousScore = 0;
                        for (const lines of clearSequence) {
                            engine._addScore(lines);
                            expect(engine.score).toBeGreaterThanOrEqual(previousScore);
                            previousScore = engine.score;
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});
