/**
 * AIController Property-Based Tests
 * 
 * Property 10: AI Placement Validity
 * 
 * For any board state and current tetromino, the AI controller SHALL return a placement that:
 * (1) is within board boundaries
 * (2) does not collide with existing blocks
 * (3) represents a valid final resting position
 * 
 * **Validates: Requirements 6.1, 6.4**
 * 
 * Property 6: AI Speed Consistency
 * 
 * For any speed level setting, when AI mode is enabled, the AI's move execution timing
 * SHALL respect the same drop interval as manual gameplay at that speed level.
 * 
 * **Validates: Requirements 2.6**
 */

import { describe, test, expect } from '@jest/globals';
import * as fc from 'fast-check';
import { AIController } from './ai-controller.js';
import { BoardManager, BOARD_WIDTH, BOARD_HEIGHT } from '../core/board-manager.js';
import { Tetromino, TETROMINO_TYPES } from '../core/tetromino.js';
import { GameEngine, SPEED_INTERVALS } from '../core/game-engine.js';

// Arbitrary for generating valid tetromino types
const tetrominoTypeArb = fc.constantFrom(...TETROMINO_TYPES);

// Arbitrary for generating valid board cell values (0 = empty, 1-7 = filled)
const cellValueArb = fc.integer({ min: 0, max: 7 });

// Arbitrary for generating a sparse board (more realistic game states)
// This generates boards with blocks concentrated at the bottom
const sparseBoardArb = fc.tuple(
    fc.integer({ min: 0, max: 80 }),  // number of filled cells
    fc.array(
        fc.tuple(
            fc.integer({ min: 0, max: BOARD_WIDTH - 1 }),   // x
            fc.integer({ min: 0, max: BOARD_HEIGHT - 1 }),  // y
            fc.integer({ min: 1, max: 7 })                   // value
        ),
        { minLength: 0, maxLength: 80 }
    )
).map(([_, cells]) => {
    // Create empty board
    const board = new BoardManager();
    // Fill specified cells
    for (const [x, y, value] of cells) {
        board.setCell(x, y, value);
    }
    return board;
});

// Arbitrary for generating a board with blocks at the bottom (more realistic)
const realisticBoardArb = fc.tuple(
    fc.integer({ min: 0, max: 10 }),  // max height of blocks
    fc.array(
        fc.tuple(
            fc.integer({ min: 0, max: BOARD_WIDTH - 1 }),   // x
            fc.integer({ min: 1, max: 7 })                   // value
        ),
        { minLength: 0, maxLength: BOARD_WIDTH * 10 }
    )
).map(([maxHeight, columns]) => {
    const board = new BoardManager();
    // Build up from bottom
    const columnHeights = new Array(BOARD_WIDTH).fill(0);
    
    for (const [x, value] of columns) {
        if (columnHeights[x] < maxHeight) {
            const y = BOARD_HEIGHT - 1 - columnHeights[x];
            board.setCell(x, y, value);
            columnHeights[x]++;
        }
    }
    return board;
});

// Arbitrary for generating a tetromino at spawn position
const tetrominoArb = tetrominoTypeArb.map(type => {
    // Standard spawn position: centered at top
    const tetromino = new Tetromino(type, 3, 0);
    return tetromino;
});

// Arbitrary for generating a tetromino with random rotation
const tetrominoWithRotationArb = fc.tuple(
    tetrominoTypeArb,
    fc.integer({ min: 0, max: 3 })
).map(([type, rotation]) => {
    const tetromino = new Tetromino(type, 3, 0);
    tetromino.setRotationIndex(rotation % tetromino.getRotationCount());
    return tetromino;
});

describe('AIController Property Tests', () => {
    /**
     * Property 10: AI Placement Validity
     * 
     * For any board state and current tetromino, the AI controller SHALL return a placement that:
     * (1) is within board boundaries
     * (2) does not collide with existing blocks
     * (3) represents a valid final resting position
     * 
     * **Validates: Requirements 6.1, 6.4**
     */
    describe('Property 10: AI Placement Validity', () => {

        test('all placements returned by AI are within board boundaries', () => {
            fc.assert(
                fc.property(realisticBoardArb, tetrominoArb, (board, tetromino) => {
                    const aiController = new AIController();
                    const placements = aiController.evaluateAllPlacements(board, tetromino);
                    
                    // Property: All placements must have valid x coordinates
                    for (const placement of placements) {
                        const shape = tetromino.getShapeAtRotation(placement.rotation);
                        const shapeWidth = shape[0].length;
                        
                        // The leftmost block of the shape must be >= 0
                        // The rightmost block must be < BOARD_WIDTH
                        let leftmostBlock = shapeWidth;
                        let rightmostBlock = -1;
                        
                        for (let col = 0; col < shapeWidth; col++) {
                            for (let row = 0; row < shape.length; row++) {
                                if (shape[row][col] !== 0) {
                                    leftmostBlock = Math.min(leftmostBlock, col);
                                    rightmostBlock = Math.max(rightmostBlock, col);
                                    break;
                                }
                            }
                        }
                        
                        const actualLeftX = placement.x + leftmostBlock;
                        const actualRightX = placement.x + rightmostBlock;
                        
                        expect(actualLeftX).toBeGreaterThanOrEqual(0);
                        expect(actualRightX).toBeLessThan(BOARD_WIDTH);
                    }
                }),
                { numRuns: 100 }
            );
        });
        
        test('all placements do not collide with existing blocks', () => {
            fc.assert(
                fc.property(realisticBoardArb, tetrominoArb, (board, tetromino) => {
                    const aiController = new AIController();
                    const placements = aiController.evaluateAllPlacements(board, tetromino);
                    
                    // Property: All placements must not collide with existing blocks
                    for (const placement of placements) {
                        const shape = tetromino.getShapeAtRotation(placement.rotation);
                        const targetY = placement.y;
                        
                        // Check that the placement position is valid
                        const isValid = board.isValidShapePosition(shape, placement.x, targetY);
                        expect(isValid).toBe(true);
                    }
                }),
                { numRuns: 100 }
            );
        });
        
        test('all placements represent valid final resting positions', () => {
            fc.assert(
                fc.property(realisticBoardArb, tetrominoArb, (board, tetromino) => {
                    const aiController = new AIController();
                    const placements = aiController.evaluateAllPlacements(board, tetromino);
                    
                    // Property: All placements must be at the lowest valid position
                    // (cannot move down further)
                    for (const placement of placements) {
                        const shape = tetromino.getShapeAtRotation(placement.rotation);
                        const targetY = placement.y;
                        
                        // The position should be valid
                        expect(board.isValidShapePosition(shape, placement.x, targetY)).toBe(true);
                        
                        // Moving one step down should be invalid (resting position)
                        const canMoveDown = board.isValidShapePosition(shape, placement.x, targetY + 1);
                        expect(canMoveDown).toBe(false);
                    }
                }),
                { numRuns: 100 }
            );
        });

        test('best placement satisfies all validity criteria', () => {
            fc.assert(
                fc.property(realisticBoardArb, tetrominoArb, (board, tetromino) => {
                    const aiController = new AIController();
                    const bestPlacement = aiController.findBestPlacement(board, tetromino);
                    
                    // If there's a valid placement, it must satisfy all criteria
                    if (bestPlacement !== null) {
                        const shape = tetromino.getShapeAtRotation(bestPlacement.rotation);
                        
                        // (1) Within board boundaries
                        let leftmostBlock = shape[0].length;
                        let rightmostBlock = -1;
                        for (let col = 0; col < shape[0].length; col++) {
                            for (let row = 0; row < shape.length; row++) {
                                if (shape[row][col] !== 0) {
                                    leftmostBlock = Math.min(leftmostBlock, col);
                                    rightmostBlock = Math.max(rightmostBlock, col);
                                    break;
                                }
                            }
                        }
                        expect(bestPlacement.x + leftmostBlock).toBeGreaterThanOrEqual(0);
                        expect(bestPlacement.x + rightmostBlock).toBeLessThan(BOARD_WIDTH);
                        
                        // (2) Does not collide with existing blocks
                        expect(board.isValidShapePosition(shape, bestPlacement.x, bestPlacement.y)).toBe(true);
                        
                        // (3) Is a valid final resting position
                        expect(board.isValidShapePosition(shape, bestPlacement.x, bestPlacement.y + 1)).toBe(false);
                    }
                }),
                { numRuns: 100 }
            );
        });
        
        test('AI evaluates all possible rotations for each tetromino type', () => {
            fc.assert(
                fc.property(tetrominoTypeArb, (type) => {
                    const board = new BoardManager(); // Empty board
                    const tetromino = new Tetromino(type, 3, 0);
                    const aiController = new AIController();
                    
                    const placements = aiController.evaluateAllPlacements(board, tetromino);
                    const rotations = new Set(placements.map(p => p.rotation));
                    
                    // Property: All rotations should be evaluated
                    const expectedRotations = tetromino.getRotationCount();
                    expect(rotations.size).toBe(expectedRotations);
                }),
                { numRuns: 100 }
            );
        });
        
        test('AI returns placements for all valid x positions', () => {
            fc.assert(
                fc.property(tetrominoTypeArb, (type) => {
                    const board = new BoardManager(); // Empty board
                    const tetromino = new Tetromino(type, 3, 0);
                    const aiController = new AIController();
                    
                    const placements = aiController.evaluateAllPlacements(board, tetromino);
                    
                    // Property: Should have multiple x positions for each rotation
                    // (at least for most tetromino types on an empty board)
                    expect(placements.length).toBeGreaterThan(0);
                    
                    // Group by rotation and check x variety
                    const byRotation = {};
                    for (const p of placements) {
                        if (!byRotation[p.rotation]) {
                            byRotation[p.rotation] = new Set();
                        }
                        byRotation[p.rotation].add(p.x);
                    }
                    
                    // Each rotation should have multiple x positions
                    for (const rotation in byRotation) {
                        expect(byRotation[rotation].size).toBeGreaterThan(1);
                    }
                }),
                { numRuns: 100 }
            );
        });

        test('placement scores are finite numbers', () => {
            fc.assert(
                fc.property(realisticBoardArb, tetrominoArb, (board, tetromino) => {
                    const aiController = new AIController();
                    const placements = aiController.evaluateAllPlacements(board, tetromino);
                    
                    // Property: All placement scores must be finite numbers
                    for (const placement of placements) {
                        expect(typeof placement.score).toBe('number');
                        expect(Number.isFinite(placement.score)).toBe(true);
                    }
                }),
                { numRuns: 100 }
            );
        });
        
        test('best placement has highest score among all placements', () => {
            fc.assert(
                fc.property(realisticBoardArb, tetrominoArb, (board, tetromino) => {
                    const aiController = new AIController();
                    const placements = aiController.evaluateAllPlacements(board, tetromino);
                    const bestPlacement = aiController.findBestPlacement(board, tetromino);
                    
                    if (placements.length > 0 && bestPlacement !== null) {
                        // Property: Best placement should have the highest score
                        const maxScore = Math.max(...placements.map(p => p.score));
                        expect(bestPlacement.score).toBe(maxScore);
                    }
                }),
                { numRuns: 100 }
            );
        });
        
        test('generated move sequence leads to valid placement', () => {
            fc.assert(
                fc.property(tetrominoArb, (tetromino) => {
                    const board = new BoardManager(); // Empty board
                    const aiController = new AIController();
                    const bestPlacement = aiController.findBestPlacement(board, tetromino);
                    
                    if (bestPlacement !== null) {
                        const moves = aiController.generateMoveSequence(tetromino, bestPlacement);
                        
                        // Property: Move sequence should end with drop
                        expect(moves.length).toBeGreaterThan(0);
                        expect(moves[moves.length - 1].type).toBe('drop');
                        
                        // Property: All moves should be valid types
                        for (const move of moves) {
                            expect(['left', 'right', 'rotate', 'drop']).toContain(move.type);
                        }
                        
                        // Simulate moves to verify they lead to the target
                        let currentX = tetromino.x;
                        let currentRotation = tetromino.rotationIndex;
                        const rotationCount = tetromino.getRotationCount();
                        
                        for (const move of moves) {
                            if (move.type === 'left') currentX--;
                            else if (move.type === 'right') currentX++;
                            else if (move.type === 'rotate') {
                                currentRotation = (currentRotation + 1) % rotationCount;
                            }
                            // drop doesn't change x or rotation
                        }
                        
                        // Property: Final position should match target
                        // Use toEqual instead of toBe to handle -0 vs 0 edge case
                        expect(currentX).toEqual(bestPlacement.x);
                        expect(currentRotation).toEqual(bestPlacement.rotation);
                    }
                }),
                { numRuns: 100 }
            );
        });

        test('AI handles all tetromino types correctly', () => {
            fc.assert(
                fc.property(tetrominoTypeArb, realisticBoardArb, (type, board) => {
                    const tetromino = new Tetromino(type, 3, 0);
                    const aiController = new AIController();
                    const placements = aiController.evaluateAllPlacements(board, tetromino);
                    
                    // Property: For any tetromino type, all returned placements are valid
                    for (const placement of placements) {
                        const shape = tetromino.getShapeAtRotation(placement.rotation);
                        
                        // Valid position
                        expect(board.isValidShapePosition(shape, placement.x, placement.y)).toBe(true);
                        
                        // Resting position
                        expect(board.isValidShapePosition(shape, placement.x, placement.y + 1)).toBe(false);
                    }
                }),
                { numRuns: 100 }
            );
        });
        
        test('AI returns empty placements only when board is full', () => {
            fc.assert(
                fc.property(tetrominoArb, (tetromino) => {
                    // Create a nearly full board (leave top 2 rows empty)
                    const board = new BoardManager();
                    for (let y = 2; y < BOARD_HEIGHT; y++) {
                        for (let x = 0; x < BOARD_WIDTH; x++) {
                            board.setCell(x, y, 1);
                        }
                    }
                    
                    const aiController = new AIController();
                    const placements = aiController.evaluateAllPlacements(board, tetromino);
                    
                    // Property: Should still find some placements in the top rows
                    // (unless the tetromino is too tall)
                    // This is a weak property - just checking consistency
                    if (placements.length === 0) {
                        // Verify that indeed no valid placement exists
                        const rotationCount = tetromino.getRotationCount();
                        let foundValid = false;
                        
                        for (let rotation = 0; rotation < rotationCount; rotation++) {
                            const shape = tetromino.getShapeAtRotation(rotation);
                            for (let x = -3; x < BOARD_WIDTH; x++) {
                                if (board.isValidShapePosition(shape, x, 0)) {
                                    foundValid = true;
                                    break;
                                }
                            }
                            if (foundValid) break;
                        }
                        
                        // If we found a valid position, placements should not be empty
                        // (This would indicate a bug)
                        expect(foundValid).toBe(false);
                    }
                }),
                { numRuns: 100 }
            );
        });
        
        test('placement y coordinate is always valid', () => {
            fc.assert(
                fc.property(realisticBoardArb, tetrominoArb, (board, tetromino) => {
                    const aiController = new AIController();
                    const placements = aiController.evaluateAllPlacements(board, tetromino);
                    
                    // Property: All placement y coordinates must be within board
                    for (const placement of placements) {
                        const shape = tetromino.getShapeAtRotation(placement.rotation);
                        const shapeHeight = shape.length;
                        
                        // Top of shape must be >= 0
                        expect(placement.y).toBeGreaterThanOrEqual(0);
                        
                        // Bottom of shape must be < BOARD_HEIGHT
                        expect(placement.y + shapeHeight - 1).toBeLessThan(BOARD_HEIGHT);
                    }
                }),
                { numRuns: 100 }
            );
        });
    });

    /**
     * Property 6: AI Speed Consistency
     * 
     * For any speed level setting, when AI mode is enabled, the AI's move execution timing
     * SHALL respect the same drop interval as manual gameplay at that speed level.
     * 
     * **Validates: Requirements 2.6**
     * 
     * Feature: tetris-enhancements, Property 6: AI Speed Consistency
     */
    describe('Property 6: AI Speed Consistency', () => {
        
        // Arbitrary for generating valid speed levels (1-10)
        const speedLevelArb = fc.integer({ min: 1, max: 10 });
        
        test('AI decision interval matches game engine drop interval when linked', () => {
            fc.assert(
                fc.property(speedLevelArb, (speed) => {
                    const gameEngine = new GameEngine();
                    const aiController = new AIController();
                    
                    // Link AI controller to game engine
                    aiController.setGameEngine(gameEngine);
                    
                    // Set game speed
                    gameEngine.setSpeed(speed);
                    
                    // Property: AI decision interval should match game's drop interval
                    const expectedInterval = SPEED_INTERVALS[speed];
                    expect(aiController.getDecisionInterval()).toBe(expectedInterval);
                    expect(aiController.getDecisionInterval()).toBe(gameEngine.dropInterval);
                }),
                { numRuns: 100 }
            );
        });
        
        test('AI decision interval updates when game speed changes', () => {
            fc.assert(
                fc.property(
                    speedLevelArb,
                    speedLevelArb,
                    (initialSpeed, newSpeed) => {
                        const gameEngine = new GameEngine();
                        const aiController = new AIController();
                        
                        // Link AI controller to game engine
                        aiController.setGameEngine(gameEngine);
                        
                        // Set initial speed
                        gameEngine.setSpeed(initialSpeed);
                        const initialInterval = aiController.getDecisionInterval();
                        expect(initialInterval).toBe(SPEED_INTERVALS[initialSpeed]);
                        
                        // Change speed
                        gameEngine.setSpeed(newSpeed);
                        const newInterval = aiController.getDecisionInterval();
                        
                        // Property: AI interval should update to match new game speed
                        expect(newInterval).toBe(SPEED_INTERVALS[newSpeed]);
                        expect(newInterval).toBe(gameEngine.dropInterval);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        test('AI respects same timing as manual gameplay for all speed levels', () => {
            fc.assert(
                fc.property(speedLevelArb, (speed) => {
                    const gameEngine = new GameEngine();
                    const aiController = new AIController();
                    
                    // Link AI controller to game engine
                    aiController.setGameEngine(gameEngine);
                    gameEngine.setSpeed(speed);
                    
                    // Property: AI timing should be identical to manual gameplay timing
                    // The drop interval formula is: 1100 - speed * 100
                    const expectedInterval = 1100 - speed * 100;
                    
                    expect(gameEngine.dropInterval).toBe(expectedInterval);
                    expect(aiController.getDecisionInterval()).toBe(expectedInterval);
                }),
                { numRuns: 100 }
            );
        });
        
        test('AI canMakeDecision respects game speed timing', () => {
            fc.assert(
                fc.property(
                    speedLevelArb,
                    fc.integer({ min: 0, max: 2000 }),
                    (speed, elapsedTime) => {
                        const gameEngine = new GameEngine();
                        const aiController = new AIController();
                        
                        // Link AI controller to game engine
                        aiController.setGameEngine(gameEngine);
                        gameEngine.setSpeed(speed);
                        
                        const interval = aiController.getDecisionInterval();
                        const startTime = 1000; // Arbitrary start time
                        
                        // Set last decision time
                        aiController.updateDecisionTime(startTime);
                        
                        const currentTime = startTime + elapsedTime;
                        const canDecide = aiController.canMakeDecision(currentTime);
                        
                        // Property: canMakeDecision should return true only when
                        // elapsed time >= decision interval (which equals drop interval)
                        if (elapsedTime >= interval) {
                            expect(canDecide).toBe(true);
                        } else {
                            expect(canDecide).toBe(false);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        test('AI syncWithGameSpeed correctly updates decision interval', () => {
            fc.assert(
                fc.property(speedLevelArb, (speed) => {
                    const aiController = new AIController();
                    const dropInterval = SPEED_INTERVALS[speed];
                    
                    // Sync AI with game speed
                    aiController.syncWithGameSpeed(dropInterval);
                    
                    // Property: After sync, decision interval should match drop interval
                    // Note: When no game engine is linked, getDecisionInterval returns
                    // the internal decisionInterval which was set by syncWithGameSpeed
                    expect(aiController.decisionInterval).toBe(dropInterval);
                }),
                { numRuns: 100 }
            );
        });
        
        test('AI timing is consistent between linked and synced modes', () => {
            fc.assert(
                fc.property(speedLevelArb, (speed) => {
                    const gameEngine = new GameEngine();
                    const aiControllerLinked = new AIController();
                    const aiControllerSynced = new AIController();
                    
                    gameEngine.setSpeed(speed);
                    const dropInterval = gameEngine.dropInterval;
                    
                    // Method 1: Link to game engine
                    aiControllerLinked.setGameEngine(gameEngine);
                    
                    // Method 2: Sync with game speed
                    aiControllerSynced.syncWithGameSpeed(dropInterval);
                    
                    // Property: Both methods should result in same timing behavior
                    expect(aiControllerLinked.getDecisionInterval()).toBe(dropInterval);
                    expect(aiControllerSynced.decisionInterval).toBe(dropInterval);
                }),
                { numRuns: 100 }
            );
        });
        
        test('AI enabled state does not affect speed consistency', () => {
            fc.assert(
                fc.property(
                    speedLevelArb,
                    fc.boolean(),
                    (speed, aiEnabled) => {
                        const gameEngine = new GameEngine();
                        const aiController = new AIController();
                        
                        // Link AI controller to game engine
                        aiController.setGameEngine(gameEngine);
                        gameEngine.setSpeed(speed);
                        
                        // Enable or disable AI
                        if (aiEnabled) {
                            aiController.enable();
                        } else {
                            aiController.disable();
                        }
                        
                        // Property: AI decision interval should match game speed
                        // regardless of whether AI is enabled or disabled
                        expect(aiController.getDecisionInterval()).toBe(gameEngine.dropInterval);
                        expect(aiController.getDecisionInterval()).toBe(SPEED_INTERVALS[speed]);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        test('AI speed consistency holds across all valid speed levels', () => {
            // Test all 10 speed levels explicitly
            for (let speed = 1; speed <= 10; speed++) {
                const gameEngine = new GameEngine();
                const aiController = new AIController();
                
                aiController.setGameEngine(gameEngine);
                gameEngine.setSpeed(speed);
                
                const expectedInterval = SPEED_INTERVALS[speed];
                
                // Verify consistency
                expect(gameEngine.dropInterval).toBe(expectedInterval);
                expect(aiController.getDecisionInterval()).toBe(expectedInterval);
                
                // Verify the formula: interval = 1100 - speed * 100
                expect(expectedInterval).toBe(1100 - speed * 100);
            }
        });
        
        test('AI decision timing boundary conditions', () => {
            fc.assert(
                fc.property(speedLevelArb, (speed) => {
                    const gameEngine = new GameEngine();
                    const aiController = new AIController();
                    
                    aiController.setGameEngine(gameEngine);
                    gameEngine.setSpeed(speed);
                    
                    const interval = aiController.getDecisionInterval();
                    const startTime = 0;
                    
                    aiController.updateDecisionTime(startTime);
                    
                    // Property: At exactly interval time, should be able to make decision
                    expect(aiController.canMakeDecision(startTime + interval)).toBe(true);
                    
                    // Property: Just before interval time, should not be able to make decision
                    if (interval > 0) {
                        expect(aiController.canMakeDecision(startTime + interval - 1)).toBe(false);
                    }
                }),
                { numRuns: 100 }
            );
        });
    });
});
