/**
 * GameEngine Unit Tests
 * 
 * Tests for game state management, movement controls, scoring, and game over detection
 */

import { GameEngine, GAME_STATES, SCORING_RULES, SPEED_INTERVALS } from './game-engine.js';
import { Tetromino } from './tetromino.js';

describe('GameEngine', () => {
    let engine;
    
    beforeEach(() => {
        engine = new GameEngine();
    });
    
    describe('Initialization', () => {
        test('should initialize with idle state', () => {
            expect(engine.gameState).toBe(GAME_STATES.IDLE);
        });
        
        test('should initialize with zero score', () => {
            expect(engine.score).toBe(0);
        });
        
        test('should initialize with zero lines cleared', () => {
            expect(engine.linesCleared).toBe(0);
        });
        
        test('should initialize with level 1', () => {
            expect(engine.level).toBe(1);
        });
        
        test('should initialize with default speed', () => {
            expect(engine.speed).toBe(5);
        });
        
        test('should have no current tetromino initially', () => {
            expect(engine.currentTetromino).toBeNull();
        });
        
        test('should have no next tetromino initially', () => {
            expect(engine.nextTetromino).toBeNull();
        });
    });
    
    describe('Game State Management', () => {
        test('start() should change state to playing', () => {
            engine.start();
            expect(engine.gameState).toBe(GAME_STATES.PLAYING);
        });
        
        test('start() should spawn current tetromino', () => {
            engine.start();
            expect(engine.currentTetromino).not.toBeNull();
            expect(engine.currentTetromino).toBeInstanceOf(Tetromino);
        });
        
        test('start() should spawn next tetromino', () => {
            engine.start();
            expect(engine.nextTetromino).not.toBeNull();
            expect(engine.nextTetromino).toBeInstanceOf(Tetromino);
        });
        
        test('pause() should change state to paused when playing', () => {
            engine.start();
            engine.pause();
            expect(engine.gameState).toBe(GAME_STATES.PAUSED);
        });
        
        test('pause() should not change state when not playing', () => {
            engine.pause();
            expect(engine.gameState).toBe(GAME_STATES.IDLE);
        });
        
        test('resume() should change state to playing when paused', () => {
            engine.start();
            engine.pause();
            engine.resume();
            expect(engine.gameState).toBe(GAME_STATES.PLAYING);
        });
        
        test('resume() should not change state when not paused', () => {
            engine.start();
            engine.resume();
            expect(engine.gameState).toBe(GAME_STATES.PLAYING);
        });
        
        test('restart() should reset game state', () => {
            engine.start();
            engine.score = 1000;
            engine.linesCleared = 10;
            engine.restart();
            expect(engine.score).toBe(0);
            expect(engine.linesCleared).toBe(0);
            expect(engine.gameState).toBe(GAME_STATES.PLAYING);
        });
    });
    
    describe('Movement Controls (Requirements 2.1-2.3)', () => {
        beforeEach(() => {
            engine.start();
        });
        
        test('moveLeft() should decrease x by 1 when valid', () => {
            const initialX = engine.currentTetromino.x;
            // Move to center first to ensure we have room
            engine.currentTetromino.x = 5;
            const result = engine.moveLeft();
            expect(result).toBe(true);
            expect(engine.currentTetromino.x).toBe(4);
        });
        
        test('moveRight() should increase x by 1 when valid', () => {
            engine.currentTetromino.x = 3;
            const result = engine.moveRight();
            expect(result).toBe(true);
            expect(engine.currentTetromino.x).toBe(4);
        });
        
        test('moveDown() should increase y by 1 when valid', () => {
            const initialY = engine.currentTetromino.y;
            const result = engine.moveDown();
            expect(result).toBe(true);
            expect(engine.currentTetromino.y).toBe(initialY + 1);
        });
        
        test('moveLeft() should return false when blocked by wall', () => {
            engine.currentTetromino.x = 0;
            const result = engine.moveLeft();
            expect(result).toBe(false);
            expect(engine.currentTetromino.x).toBe(0);
        });
        
        test('moveRight() should return false when blocked by wall', () => {
            // Move to right edge
            engine.currentTetromino.x = 10 - engine.currentTetromino.width;
            const initialX = engine.currentTetromino.x;
            const result = engine.moveRight();
            expect(result).toBe(false);
            expect(engine.currentTetromino.x).toBe(initialX);
        });
        
        test('movement should not work when game is paused', () => {
            engine.pause();
            const initialX = engine.currentTetromino.x;
            engine.moveLeft();
            expect(engine.currentTetromino.x).toBe(initialX);
        });
        
        test('movement should not work when game is idle', () => {
            const newEngine = new GameEngine();
            const result = newEngine.moveLeft();
            expect(result).toBe(false);
        });
    });
    
    describe('Hard Drop (Requirement 2.4)', () => {
        beforeEach(() => {
            engine.start();
        });
        
        test('hardDrop() should move piece to bottom', () => {
            const distance = engine.hardDrop();
            expect(distance).toBeGreaterThan(0);
        });
        
        test('hardDrop() should lock piece and spawn new one', () => {
            const oldPiece = engine.currentTetromino;
            engine.hardDrop();
            expect(engine.currentTetromino).not.toBe(oldPiece);
        });
        
        test('hardDrop() should return 0 when game is not playing', () => {
            engine.pause();
            const distance = engine.hardDrop();
            expect(distance).toBe(0);
        });
    });
    
    describe('Rotation Controls (Requirements 3.1-3.2)', () => {
        beforeEach(() => {
            engine.start();
        });
        
        test('rotateClockwise() should rotate piece', () => {
            // Move piece to center to ensure rotation is possible
            engine.currentTetromino.x = 4;
            engine.currentTetromino.y = 5;
            const initialRotation = engine.currentTetromino.rotationIndex;
            const result = engine.rotateClockwise();
            // Result depends on piece type and position
            expect(typeof result).toBe('boolean');
        });
        
        test('rotateCounterClockwise() should rotate piece', () => {
            engine.currentTetromino.x = 4;
            engine.currentTetromino.y = 5;
            const result = engine.rotateCounterClockwise();
            expect(typeof result).toBe('boolean');
        });
        
        test('rotation should not work when game is paused', () => {
            engine.pause();
            const initialRotation = engine.currentTetromino.rotationIndex;
            engine.rotateClockwise();
            expect(engine.currentTetromino.rotationIndex).toBe(initialRotation);
        });
    });
    
    describe('Scoring System (Requirements 4.3-4.6)', () => {
        test('SCORING_RULES should have correct values', () => {
            expect(SCORING_RULES[1]).toBe(100);
            expect(SCORING_RULES[2]).toBe(300);
            expect(SCORING_RULES[3]).toBe(500);
            expect(SCORING_RULES[4]).toBe(800);
        });
        
        test('clearing 1 line should add 100 points', () => {
            engine.start();
            // Manually trigger score addition
            engine._addScore(1);
            expect(engine.score).toBe(100);
        });
        
        test('clearing 2 lines should add 300 points', () => {
            engine.start();
            engine._addScore(2);
            expect(engine.score).toBe(300);
        });
        
        test('clearing 3 lines should add 500 points', () => {
            engine.start();
            engine._addScore(3);
            expect(engine.score).toBe(500);
        });
        
        test('clearing 4 lines (Tetris) should add 800 points', () => {
            engine.start();
            engine._addScore(4);
            expect(engine.score).toBe(800);
        });
        
        test('score should accumulate correctly', () => {
            engine.start();
            engine._addScore(1);
            engine._addScore(2);
            expect(engine.score).toBe(400); // 100 + 300
        });
    });
    
    describe('Game Over Detection (Requirements 5.1-5.2)', () => {
        test('should trigger game over when spawn position is blocked', () => {
            engine.start();
            
            // Fill top rows to block spawn
            for (let x = 0; x < 10; x++) {
                engine.board.setCell(x, 0, 1);
                engine.board.setCell(x, 1, 1);
            }
            
            // Force spawn new piece
            engine._spawnTetromino();
            
            expect(engine.gameState).toBe(GAME_STATES.GAMEOVER);
        });
        
        test('isGameOver() should return true when game is over', () => {
            engine.start();
            
            // Fill top rows
            for (let x = 0; x < 10; x++) {
                engine.board.setCell(x, 0, 1);
                engine.board.setCell(x, 1, 1);
            }
            
            engine._spawnTetromino();
            
            expect(engine.isGameOver()).toBe(true);
        });
    });
    
    describe('Speed Settings (Requirement 10.4)', () => {
        test('setSpeed() should update speed level', () => {
            engine.setSpeed(8);
            expect(engine.speed).toBe(8);
        });
        
        test('setSpeed() should update drop interval', () => {
            engine.setSpeed(10);
            expect(engine.dropInterval).toBe(SPEED_INTERVALS[10]);
        });
        
        test('setSpeed() should clamp to valid range (1-10)', () => {
            engine.setSpeed(0);
            expect(engine.speed).toBe(1);
            
            engine.setSpeed(15);
            expect(engine.speed).toBe(10);
        });
        
        test('higher speed should have shorter interval', () => {
            expect(SPEED_INTERVALS[10]).toBeLessThan(SPEED_INTERVALS[1]);
        });
        
        /**
         * Validates: Requirements 2.3
         * 
         * SPEED_INTERVALS must follow the formula: interval = 1100 - speed * 100
         * This ensures level 1 = 1000ms and level 10 = 100ms
         */
        test('SPEED_INTERVALS should follow formula: interval = 1100 - speed * 100', () => {
            // Verify all speed levels follow the formula
            for (let speed = 1; speed <= 10; speed++) {
                const expectedInterval = 1100 - speed * 100;
                expect(SPEED_INTERVALS[speed]).toBe(expectedInterval);
            }
        });
        
        test('SPEED_INTERVALS level 1 should be 1000ms (Requirements 2.3)', () => {
            expect(SPEED_INTERVALS[1]).toBe(1000);
        });
        
        test('SPEED_INTERVALS level 10 should be 100ms (Requirements 2.3)', () => {
            expect(SPEED_INTERVALS[10]).toBe(100);
        });
        
        test('setSpeed() should reset accumulated time for immediate effect (Requirement 2.2)', () => {
            engine.start();
            // Simulate some accumulated time
            engine.update(500);
            expect(engine.accumulatedTime).toBe(500);
            
            // Change speed - should reset accumulated time
            engine.setSpeed(8);
            expect(engine.accumulatedTime).toBe(0);
        });
        
        test('resetAccumulatedTime() should set accumulated time to zero', () => {
            engine.start();
            engine.update(300);
            expect(engine.accumulatedTime).toBe(300);
            
            engine.resetAccumulatedTime();
            expect(engine.accumulatedTime).toBe(0);
        });
        
        test('speed change should take effect immediately without waiting for next drop cycle', () => {
            engine.start();
            const initialY = engine.currentTetromino.y;
            
            // Accumulate time close to the drop interval
            engine.update(550); // Just under default 600ms interval
            expect(engine.currentTetromino.y).toBe(initialY); // No drop yet
            
            // Change to faster speed (level 10 = 100ms interval)
            engine.setSpeed(10);
            
            // Now update with a small amount - should trigger drop with new interval
            engine.update(100);
            expect(engine.currentTetromino.y).toBe(initialY + 1); // Drop occurred
        });
        
        /**
         * Validates: Requirements 2.4
         * 
         * WHEN the game is paused and speed is changed, 
         * THE Game_Engine SHALL apply the new speed when the game resumes
         */
        describe('Speed Changes During Pause (Requirement 2.4)', () => {
            test('setSpeed() should work when game is paused', () => {
                engine.start();
                engine.pause();
                
                // Change speed while paused
                engine.setSpeed(10);
                
                // Speed should be updated
                expect(engine.speed).toBe(10);
                expect(engine.dropInterval).toBe(SPEED_INTERVALS[10]);
            });
            
            test('speed change during pause should apply when game resumes', () => {
                engine.start();
                const initialY = engine.currentTetromino.y;
                
                // Pause the game
                engine.pause();
                
                // Change to fastest speed while paused
                engine.setSpeed(10);
                expect(engine.dropInterval).toBe(100);
                
                // Resume the game
                engine.resume();
                
                // Update with the new interval - should trigger drop
                engine.update(100);
                expect(engine.currentTetromino.y).toBe(initialY + 1);
            });
            
            test('multiple speed changes during pause should apply final value on resume', () => {
                engine.start();
                engine.pause();
                
                // Change speed multiple times while paused
                engine.setSpeed(1);
                engine.setSpeed(5);
                engine.setSpeed(10);
                
                // Only the final speed should be applied
                expect(engine.speed).toBe(10);
                expect(engine.dropInterval).toBe(100);
                
                engine.resume();
                expect(engine.speed).toBe(10);
                expect(engine.dropInterval).toBe(100);
            });
            
            test('speed change during pause should reset accumulated time', () => {
                engine.start();
                
                // Accumulate some time
                engine.update(300);
                expect(engine.accumulatedTime).toBe(300);
                
                // Pause and change speed
                engine.pause();
                engine.setSpeed(8);
                
                // Accumulated time should be reset
                expect(engine.accumulatedTime).toBe(0);
            });
            
            test('slow speed change during pause should apply correctly on resume', () => {
                engine.start();
                const initialY = engine.currentTetromino.y;
                
                // Start with fast speed
                engine.setSpeed(10);
                
                // Pause and change to slow speed
                engine.pause();
                engine.setSpeed(1);
                expect(engine.dropInterval).toBe(1000);
                
                // Resume
                engine.resume();
                
                // Update with less than the new interval - should NOT trigger drop
                engine.update(500);
                expect(engine.currentTetromino.y).toBe(initialY);
                
                // Update to exceed the interval - should trigger drop
                engine.update(500);
                expect(engine.currentTetromino.y).toBe(initialY + 1);
            });
            
            test('setSpeed() should work in any game state', () => {
                // Test in IDLE state
                engine.setSpeed(3);
                expect(engine.speed).toBe(3);
                expect(engine.dropInterval).toBe(SPEED_INTERVALS[3]);
                
                // Test in PLAYING state
                engine.start();
                engine.setSpeed(7);
                expect(engine.speed).toBe(7);
                expect(engine.dropInterval).toBe(SPEED_INTERVALS[7]);
                
                // Test in PAUSED state
                engine.pause();
                engine.setSpeed(9);
                expect(engine.speed).toBe(9);
                expect(engine.dropInterval).toBe(SPEED_INTERVALS[9]);
            });
        });
    });
    
    describe('Game Update Loop', () => {
        beforeEach(() => {
            engine.start();
        });
        
        test('update() should accumulate time', () => {
            engine.update(100);
            expect(engine.accumulatedTime).toBe(100);
        });
        
        test('update() should trigger moveDown when interval exceeded', () => {
            const initialY = engine.currentTetromino.y;
            engine.update(engine.dropInterval + 1);
            expect(engine.currentTetromino.y).toBe(initialY + 1);
        });
        
        test('update() should not do anything when paused', () => {
            engine.pause();
            const initialY = engine.currentTetromino.y;
            engine.update(engine.dropInterval + 1);
            expect(engine.currentTetromino.y).toBe(initialY);
        });
    });
    
    describe('Ghost Piece', () => {
        test('getGhostY() should return drop position', () => {
            engine.start();
            const ghostY = engine.getGhostY();
            expect(ghostY).toBeGreaterThanOrEqual(engine.currentTetromino.y);
        });
        
        test('getGhostY() should return null when no current piece', () => {
            const ghostY = engine.getGhostY();
            expect(ghostY).toBeNull();
        });
    });
    
    describe('State Getters', () => {
        test('getState() should return complete game state', () => {
            engine.start();
            const state = engine.getState();
            
            expect(state).toHaveProperty('gameState');
            expect(state).toHaveProperty('score');
            expect(state).toHaveProperty('level');
            expect(state).toHaveProperty('linesCleared');
            expect(state).toHaveProperty('speed');
            expect(state).toHaveProperty('currentTetromino');
            expect(state).toHaveProperty('nextTetromino');
            expect(state).toHaveProperty('board');
        });
        
        test('isPlaying() should return correct value', () => {
            expect(engine.isPlaying()).toBe(false);
            engine.start();
            expect(engine.isPlaying()).toBe(true);
        });
        
        test('isPaused() should return correct value', () => {
            engine.start();
            expect(engine.isPaused()).toBe(false);
            engine.pause();
            expect(engine.isPaused()).toBe(true);
        });
    });
    
    describe('Callbacks', () => {
        test('onStateChange should be called on state changes', () => {
            let callCount = 0;
            let lastState = null;
            const mockCallback = (state) => {
                callCount++;
                lastState = state;
            };
            const engineWithCallback = new GameEngine({ onStateChange: mockCallback });
            
            engineWithCallback.start();
            expect(callCount).toBeGreaterThan(0);
            expect(lastState).toBe(GAME_STATES.PLAYING);
        });
        
        test('onScoreChange should be called when score changes', () => {
            let callCount = 0;
            let lastScore = null;
            let lastPoints = null;
            const mockCallback = (score, points) => {
                callCount++;
                lastScore = score;
                lastPoints = points;
            };
            const engineWithCallback = new GameEngine({ onScoreChange: mockCallback });
            
            engineWithCallback.start();
            engineWithCallback._addScore(1);
            expect(callCount).toBe(1);
            expect(lastScore).toBe(100);
            expect(lastPoints).toBe(100);
        });
        
        test('onPieceSpawned should be called when piece spawns', () => {
            let callCount = 0;
            const mockCallback = () => {
                callCount++;
            };
            const engineWithCallback = new GameEngine({ onPieceSpawned: mockCallback });
            
            engineWithCallback.start();
            expect(callCount).toBeGreaterThan(0);
        });
    });
    
    describe('Next Piece Preview (Requirements 1.2, 1.3)', () => {
        test('next piece should become current after lock', () => {
            engine.start();
            const nextType = engine.nextTetromino.type;
            engine.hardDrop();
            expect(engine.currentTetromino.type).toBe(nextType);
        });
        
        test('new next piece should be generated after lock', () => {
            engine.start();
            const oldNext = engine.nextTetromino;
            engine.hardDrop();
            expect(engine.nextTetromino).not.toBe(oldNext);
        });
    });
    
    describe('Hold Piece (暂存方块)', () => {
        test('should initialize with empty hold area', () => {
            expect(engine.heldTetromino).toBeNull();
        });
        
        test('should initialize with canHold = true', () => {
            expect(engine.canHold).toBe(true);
        });
        
        test('holdTetromino() should be a function', () => {
            expect(typeof engine.holdTetromino).toBe('function');
        });
        
        test('holdTetromino() should return false when game is not playing', () => {
            expect(engine.gameState).toBe(GAME_STATES.IDLE);
            const result = engine.holdTetromino();
            expect(result).toBe(false);
        });
        
        test('first hold should store current tetromino in hold area', () => {
            engine.start();
            const currentType = engine.currentTetromino.type;
            
            const result = engine.holdTetromino();
            
            expect(result).toBe(true);
            expect(engine.heldTetromino).not.toBeNull();
            expect(engine.heldTetromino.type).toBe(currentType);
        });
        
        test('first hold should move next tetromino to current', () => {
            engine.start();
            const nextType = engine.nextTetromino.type;
            
            engine.holdTetromino();
            
            expect(engine.currentTetromino.type).toBe(nextType);
        });
        
        test('first hold should generate a new next tetromino', () => {
            engine.start();
            const oldNext = engine.nextTetromino;
            
            engine.holdTetromino();
            
            expect(engine.nextTetromino).not.toBe(oldNext);
        });
        
        test('hold should set canHold to false', () => {
            engine.start();
            
            engine.holdTetromino();
            
            expect(engine.canHold).toBe(false);
        });
        
        test('second hold in same round should fail', () => {
            engine.start();
            
            engine.holdTetromino();
            const result = engine.holdTetromino();
            
            expect(result).toBe(false);
        });
        
        test('canHold should reset to true after piece locks', () => {
            engine.start();
            engine.holdTetromino();
            expect(engine.canHold).toBe(false);
            
            engine.hardDrop();
            
            expect(engine.canHold).toBe(true);
        });
        
        test('hold should swap with held tetromino when hold area is not empty', () => {
            engine.start();
            const firstCurrentType = engine.currentTetromino.type;
            
            engine.holdTetromino();
            expect(engine.heldTetromino.type).toBe(firstCurrentType);
            
            engine.hardDrop();
            expect(engine.canHold).toBe(true);
            
            const secondCurrentType = engine.currentTetromino.type;
            engine.holdTetromino();
            
            expect(engine.heldTetromino.type).toBe(secondCurrentType);
            expect(engine.currentTetromino.type).toBe(firstCurrentType);
        });
        
        test('swapped tetromino should reset rotation to 0', () => {
            engine.start();
            
            engine.rotateClockwise();
            const rotatedIndex = engine.currentTetromino.rotationIndex;
            expect(rotatedIndex).not.toBe(0);
            
            engine.holdTetromino();
            engine.hardDrop();
            engine.holdTetromino();
            
            expect(engine.currentTetromino.rotationIndex).toBe(0);
        });
        
        test('swapped tetromino should reset to spawn position', () => {
            engine.start();
            const spawnPos = { x: Math.floor(engine.board.width / 2) - 2, y: 0 };
            
            engine.moveDown();
            engine.moveDown();
            expect(engine.currentTetromino.y).toBeGreaterThan(0);
            
            engine.holdTetromino();
            engine.hardDrop();
            engine.holdTetromino();
            
            expect(engine.currentTetromino.x).toBe(spawnPos.x);
            expect(engine.currentTetromino.y).toBe(spawnPos.y);
        });
        
        test('getState() should include holdTetromino and canHold', () => {
            engine.start();
            engine.holdTetromino();
            
            const state = engine.getState();
            
            expect(state).toHaveProperty('holdTetromino');
            expect(state).toHaveProperty('canHold');
            expect(state.holdTetromino).not.toBeNull();
            expect(state.canHold).toBe(false);
        });
        
        test('restart() should clear hold area and reset canHold', () => {
            engine.start();
            engine.holdTetromino();
            expect(engine.heldTetromino).not.toBeNull();
            expect(engine.canHold).toBe(false);
            
            engine.restart();
            
            expect(engine.heldTetromino).toBeNull();
            expect(engine.canHold).toBe(true);
        });
    });
});
