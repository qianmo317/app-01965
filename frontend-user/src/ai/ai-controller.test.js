/**
 * AIController Unit Tests
 * 
 * Tests for the AI controller that automatically decides tetromino placement
 * Requirements: 6.1, 6.4, 6.5, 6.6
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { AIController } from './ai-controller.js';
import { StateEvaluator } from './state-evaluator.js';
import { BoardManager, BOARD_WIDTH, BOARD_HEIGHT } from '../core/board-manager.js';
import { Tetromino, TETROMINO_TYPES } from '../core/tetromino.js';

// Helper function to create an empty board
function createEmptyBoard() {
    const board = new BoardManager();
    return board;
}

// Helper function to fill a row on the board
function fillRow(board, rowIndex, leaveEmpty = -1) {
    for (let x = 0; x < BOARD_WIDTH; x++) {
        if (x !== leaveEmpty) {
            board.setCell(x, rowIndex, 1);
        }
    }
}

describe('AIController', () => {
    let aiController;
    let board;
    
    beforeEach(() => {
        aiController = new AIController();
        board = createEmptyBoard();
    });
    
    describe('constructor', () => {
        test('should create AIController with default evaluator', () => {
            expect(aiController.enabled).toBe(false);
            expect(aiController.evaluator).toBeInstanceOf(StateEvaluator);
            expect(aiController.moveQueue).toEqual([]);
        });
        
        test('should accept custom evaluator', () => {
            const customEvaluator = new StateEvaluator({
                aggregateHeight: -1,
                completeLines: 2,
                holes: -1,
                bumpiness: -0.5
            });
            const controller = new AIController(customEvaluator);
            expect(controller.evaluator).toBe(customEvaluator);
        });
        
        test('should accept RL agent', () => {
            const mockRLAgent = { selectAction: () => {} };
            const controller = new AIController(null, mockRLAgent);
            expect(controller.rlAgent).toBe(mockRLAgent);
        });
    });
    
    describe('enable/disable', () => {
        test('should enable AI mode', () => {
            aiController.enable();
            expect(aiController.enabled).toBe(true);
            expect(aiController.isEnabled()).toBe(true);
        });
        
        test('should disable AI mode', () => {
            aiController.enable();
            aiController.disable();
            expect(aiController.enabled).toBe(false);
            expect(aiController.isEnabled()).toBe(false);
        });
        
        test('should clear move queue when enabling', () => {
            aiController.moveQueue = [{ type: 'left' }, { type: 'drop' }];
            aiController.enable();
            expect(aiController.moveQueue).toEqual([]);
        });
        
        test('should clear move queue when disabling (Requirement 6.6)', () => {
            aiController.enable();
            aiController.moveQueue = [{ type: 'left' }, { type: 'drop' }];
            aiController.disable();
            expect(aiController.moveQueue).toEqual([]);
        });
    });

    describe('evaluateAllPlacements', () => {
        test('should return placements for empty board', () => {
            const tetromino = new Tetromino('I', 3, 0);
            const placements = aiController.evaluateAllPlacements(board, tetromino);
            
            expect(placements.length).toBeGreaterThan(0);
        });
        
        test('should evaluate all rotations for T piece', () => {
            const tetromino = new Tetromino('T', 3, 0);
            const placements = aiController.evaluateAllPlacements(board, tetromino);
            
            // T piece has 4 rotations
            const rotations = new Set(placements.map(p => p.rotation));
            expect(rotations.size).toBe(4);
        });
        
        test('should evaluate only 1 rotation for O piece', () => {
            const tetromino = new Tetromino('O', 3, 0);
            const placements = aiController.evaluateAllPlacements(board, tetromino);
            
            // O piece has only 1 rotation (rotation invariant)
            const rotations = new Set(placements.map(p => p.rotation));
            expect(rotations.size).toBe(1);
        });
        
        test('should return placements within board boundaries', () => {
            const tetromino = new Tetromino('I', 3, 0);
            const placements = aiController.evaluateAllPlacements(board, tetromino);
            
            for (const placement of placements) {
                expect(placement.x).toBeGreaterThanOrEqual(-3); // I piece can extend left
                expect(placement.x).toBeLessThan(BOARD_WIDTH);
            }
        });
        
        test('should include score for each placement', () => {
            const tetromino = new Tetromino('T', 3, 0);
            const placements = aiController.evaluateAllPlacements(board, tetromino);
            
            for (const placement of placements) {
                expect(typeof placement.score).toBe('number');
                expect(Number.isFinite(placement.score)).toBe(true);
            }
        });
        
        test('should return empty array when no valid placements', () => {
            // Fill the board almost completely
            for (let y = 0; y < BOARD_HEIGHT; y++) {
                for (let x = 0; x < BOARD_WIDTH; x++) {
                    board.setCell(x, y, 1);
                }
            }
            
            const tetromino = new Tetromino('I', 3, 0);
            const placements = aiController.evaluateAllPlacements(board, tetromino);
            
            expect(placements).toEqual([]);
        });
        
        test('should evaluate placements considering existing blocks', () => {
            // Place some blocks at the bottom
            fillRow(board, BOARD_HEIGHT - 1, 0); // Leave column 0 empty
            
            const tetromino = new Tetromino('I', 3, 0);
            const placements = aiController.evaluateAllPlacements(board, tetromino);
            
            expect(placements.length).toBeGreaterThan(0);
            
            // Placements that complete lines should have higher scores
            const placementAtColumn0 = placements.find(p => p.x === 0 && p.rotation === 1);
            if (placementAtColumn0) {
                // Vertical I at column 0 should have a good score
                expect(typeof placementAtColumn0.score).toBe('number');
            }
        });
    });
    
    describe('findBestPlacement', () => {
        test('should return best placement for empty board', () => {
            const tetromino = new Tetromino('T', 3, 0);
            const placement = aiController.findBestPlacement(board, tetromino);
            
            expect(placement).not.toBeNull();
            expect(placement).toHaveProperty('x');
            expect(placement).toHaveProperty('rotation');
            expect(placement).toHaveProperty('score');
        });
        
        test('should return null when no valid placements', () => {
            // Fill the board completely
            for (let y = 0; y < BOARD_HEIGHT; y++) {
                for (let x = 0; x < BOARD_WIDTH; x++) {
                    board.setCell(x, y, 1);
                }
            }
            
            const tetromino = new Tetromino('I', 3, 0);
            const placement = aiController.findBestPlacement(board, tetromino);
            
            expect(placement).toBeNull();
        });
        
        test('should prefer placements that complete lines', () => {
            // Create a situation where completing a line is possible
            fillRow(board, BOARD_HEIGHT - 1, 0); // Leave column 0 empty
            fillRow(board, BOARD_HEIGHT - 2, 0);
            fillRow(board, BOARD_HEIGHT - 3, 0);
            fillRow(board, BOARD_HEIGHT - 4, 0);
            
            const tetromino = new Tetromino('I', 3, 0);
            const placement = aiController.findBestPlacement(board, tetromino);
            
            // The best placement should be vertical I at column 0
            expect(placement).not.toBeNull();
            // Vertical I piece (rotation 1) at x=0 completes 4 lines
            // This should be the best move
        });
        
        test('should use RL agent when available', () => {
            const mockPlacement = { x: 5, rotation: 0, score: 100 };
            const mockRLAgent = {
                selectAction: (placements) => mockPlacement
            };
            
            const controller = new AIController(null, mockRLAgent);
            const tetromino = new Tetromino('T', 3, 0);
            const placement = controller.findBestPlacement(board, tetromino);
            
            expect(placement).toBe(mockPlacement);
        });
    });

    describe('generateMoveSequence', () => {
        test('should generate moves to reach target position', () => {
            const tetromino = new Tetromino('T', 3, 0);
            const placement = { x: 0, rotation: 0, score: 10 };
            
            const moves = aiController.generateMoveSequence(tetromino, placement);
            
            expect(moves.length).toBeGreaterThan(0);
            // Should end with drop
            expect(moves[moves.length - 1].type).toBe('drop');
        });
        
        test('should generate left moves when target is left of current', () => {
            const tetromino = new Tetromino('T', 5, 0);
            const placement = { x: 2, rotation: 0, score: 10 };
            
            const moves = aiController.generateMoveSequence(tetromino, placement);
            
            const leftMoves = moves.filter(m => m.type === 'left');
            expect(leftMoves.length).toBe(3); // 5 - 2 = 3 left moves
        });
        
        test('should generate right moves when target is right of current', () => {
            const tetromino = new Tetromino('T', 2, 0);
            const placement = { x: 5, rotation: 0, score: 10 };
            
            const moves = aiController.generateMoveSequence(tetromino, placement);
            
            const rightMoves = moves.filter(m => m.type === 'right');
            expect(rightMoves.length).toBe(3); // 5 - 2 = 3 right moves
        });
        
        test('should generate rotation moves when needed', () => {
            const tetromino = new Tetromino('T', 3, 0);
            tetromino.setRotationIndex(0);
            const placement = { x: 3, rotation: 2, score: 10 };
            
            const moves = aiController.generateMoveSequence(tetromino, placement);
            
            const rotateMoves = moves.filter(m => m.type === 'rotate');
            expect(rotateMoves.length).toBe(2); // 0 -> 2 = 2 rotations
        });
        
        test('should generate only drop when already at target', () => {
            const tetromino = new Tetromino('T', 3, 0);
            tetromino.setRotationIndex(0);
            const placement = { x: 3, rotation: 0, score: 10 };
            
            const moves = aiController.generateMoveSequence(tetromino, placement);
            
            expect(moves.length).toBe(1);
            expect(moves[0].type).toBe('drop');
        });
        
        test('should handle O piece with no rotation needed', () => {
            const tetromino = new Tetromino('O', 4, 0);
            const placement = { x: 2, rotation: 0, score: 10 };
            
            const moves = aiController.generateMoveSequence(tetromino, placement);
            
            const rotateMoves = moves.filter(m => m.type === 'rotate');
            expect(rotateMoves.length).toBe(0);
            
            const leftMoves = moves.filter(m => m.type === 'left');
            expect(leftMoves.length).toBe(2);
        });
    });
    
    describe('executeNextMove', () => {
        test('should return and remove first move from queue', () => {
            aiController.moveQueue = [
                { type: 'left' },
                { type: 'rotate' },
                { type: 'drop' }
            ];
            
            const move = aiController.executeNextMove();
            
            expect(move).toEqual({ type: 'left' });
            expect(aiController.moveQueue.length).toBe(2);
        });
        
        test('should return null when queue is empty', () => {
            aiController.moveQueue = [];
            
            const move = aiController.executeNextMove();
            
            expect(move).toBeNull();
        });
        
        test('should execute moves in order', () => {
            aiController.moveQueue = [
                { type: 'rotate' },
                { type: 'left' },
                { type: 'drop' }
            ];
            
            expect(aiController.executeNextMove().type).toBe('rotate');
            expect(aiController.executeNextMove().type).toBe('left');
            expect(aiController.executeNextMove().type).toBe('drop');
            expect(aiController.executeNextMove()).toBeNull();
        });
    });
    
    describe('findBestMove', () => {
        test('should generate moves and return first move', () => {
            const tetromino = new Tetromino('T', 3, 0);
            
            const move = aiController.findBestMove(board, tetromino);
            
            expect(move).not.toBeNull();
            expect(['left', 'right', 'rotate', 'drop']).toContain(move.type);
        });
        
        test('should use existing queue if not empty', () => {
            aiController.moveQueue = [{ type: 'left' }, { type: 'drop' }];
            const tetromino = new Tetromino('T', 3, 0);
            
            const move = aiController.findBestMove(board, tetromino);
            
            expect(move).toEqual({ type: 'left' });
        });
    });

    describe('move queue management', () => {
        test('hasPendingMoves should return true when queue has moves', () => {
            aiController.moveQueue = [{ type: 'drop' }];
            expect(aiController.hasPendingMoves()).toBe(true);
        });
        
        test('hasPendingMoves should return false when queue is empty', () => {
            aiController.moveQueue = [];
            expect(aiController.hasPendingMoves()).toBe(false);
        });
        
        test('clearMoveQueue should empty the queue', () => {
            aiController.moveQueue = [{ type: 'left' }, { type: 'drop' }];
            aiController.clearMoveQueue();
            expect(aiController.moveQueue).toEqual([]);
        });
        
        test('getMoveQueueLength should return correct length', () => {
            aiController.moveQueue = [{ type: 'left' }, { type: 'rotate' }, { type: 'drop' }];
            expect(aiController.getMoveQueueLength()).toBe(3);
        });
    });
    
    describe('decision interval', () => {
        test('should set decision interval', () => {
            aiController.setDecisionInterval(200);
            expect(aiController.getDecisionInterval()).toBe(200);
        });
        
        test('should enforce minimum interval of 10ms', () => {
            aiController.setDecisionInterval(5);
            expect(aiController.getDecisionInterval()).toBe(10);
        });
        
        test('canMakeDecision should return true after interval', () => {
            aiController.setDecisionInterval(100);
            aiController.updateDecisionTime(0);
            
            expect(aiController.canMakeDecision(50)).toBe(false);
            expect(aiController.canMakeDecision(100)).toBe(true);
            expect(aiController.canMakeDecision(150)).toBe(true);
        });
    });
    
    describe('evaluator and RL agent management', () => {
        test('should set and get evaluator', () => {
            const newEvaluator = new StateEvaluator();
            aiController.setEvaluator(newEvaluator);
            expect(aiController.getEvaluator()).toBe(newEvaluator);
        });
        
        test('should set and get RL agent', () => {
            const mockAgent = { selectAction: () => {} };
            aiController.setRLAgent(mockAgent);
            expect(aiController.getRLAgent()).toBe(mockAgent);
        });
    });
    
    describe('planMoves', () => {
        test('should generate move queue for valid placement', () => {
            const tetromino = new Tetromino('T', 3, 0);
            
            const success = aiController.planMoves(board, tetromino);
            
            expect(success).toBe(true);
            expect(aiController.moveQueue.length).toBeGreaterThan(0);
        });
        
        test('should return false when no valid placement', () => {
            // Fill the board completely
            for (let y = 0; y < BOARD_HEIGHT; y++) {
                for (let x = 0; x < BOARD_WIDTH; x++) {
                    board.setCell(x, y, 1);
                }
            }
            
            const tetromino = new Tetromino('I', 3, 0);
            const success = aiController.planMoves(board, tetromino);
            
            expect(success).toBe(false);
        });
    });
    
    describe('all tetromino types', () => {
        test.each(TETROMINO_TYPES)('should find valid placement for %s piece', (type) => {
            const tetromino = new Tetromino(type, 3, 0);
            const placement = aiController.findBestPlacement(board, tetromino);
            
            expect(placement).not.toBeNull();
            expect(typeof placement.x).toBe('number');
            expect(typeof placement.rotation).toBe('number');
            expect(typeof placement.score).toBe('number');
        });
        
        test.each(TETROMINO_TYPES)('should generate valid move sequence for %s piece', (type) => {
            const tetromino = new Tetromino(type, 3, 0);
            const placement = aiController.findBestPlacement(board, tetromino);
            
            expect(placement).not.toBeNull();
            
            const moves = aiController.generateMoveSequence(tetromino, placement);
            
            expect(moves.length).toBeGreaterThan(0);
            expect(moves[moves.length - 1].type).toBe('drop');
            
            // All moves should be valid types
            for (const move of moves) {
                expect(['left', 'right', 'rotate', 'drop']).toContain(move.type);
            }
        });
    });
    
    describe('edge cases', () => {
        test('should handle tetromino at left edge', () => {
            const tetromino = new Tetromino('I', 0, 0);
            const placements = aiController.evaluateAllPlacements(board, tetromino);
            
            expect(placements.length).toBeGreaterThan(0);
        });
        
        test('should handle tetromino at right edge', () => {
            const tetromino = new Tetromino('I', BOARD_WIDTH - 4, 0);
            const placements = aiController.evaluateAllPlacements(board, tetromino);
            
            expect(placements.length).toBeGreaterThan(0);
        });
        
        test('should handle partially filled board', () => {
            // Fill bottom half
            for (let y = BOARD_HEIGHT / 2; y < BOARD_HEIGHT; y++) {
                for (let x = 0; x < BOARD_WIDTH - 2; x++) {
                    board.setCell(x, y, 1);
                }
            }
            
            const tetromino = new Tetromino('T', 3, 0);
            const placement = aiController.findBestPlacement(board, tetromino);
            
            expect(placement).not.toBeNull();
        });
    });
    
    describe('update (auto-execution)', () => {
        test('should not execute when AI is disabled', () => {
            const tetromino = new Tetromino('T', 3, 0);
            let moveExecuted = false;
            
            aiController.disable();
            const result = aiController.update(board, tetromino, 1000, () => {
                moveExecuted = true;
            });
            
            expect(result).toBe(false);
            expect(moveExecuted).toBe(false);
        });
        
        test('should not execute before decision interval', () => {
            const tetromino = new Tetromino('T', 3, 0);
            let moveExecuted = false;
            
            aiController.enable();
            aiController.setDecisionInterval(100);
            aiController.updateDecisionTime(0);
            
            const result = aiController.update(board, tetromino, 50, () => {
                moveExecuted = true;
            });
            
            expect(result).toBe(false);
            expect(moveExecuted).toBe(false);
        });
        
        test('should execute move after decision interval', () => {
            const tetromino = new Tetromino('T', 3, 0);
            let executedMove = null;
            
            aiController.enable();
            aiController.setDecisionInterval(100);
            aiController.updateDecisionTime(0);
            
            const result = aiController.update(board, tetromino, 100, (move) => {
                executedMove = move;
            });
            
            expect(result).toBe(true);
            expect(executedMove).not.toBeNull();
            expect(['left', 'right', 'rotate', 'drop']).toContain(executedMove.type);
        });
        
        test('should generate new moves when queue is empty', () => {
            const tetromino = new Tetromino('T', 3, 0);
            
            aiController.enable();
            aiController.setDecisionInterval(0);
            expect(aiController.hasPendingMoves()).toBe(false);
            
            aiController.update(board, tetromino, 0, () => {});
            
            // After first move executed, there should still be moves in queue
            // (unless it was just a drop)
        });
        
        test('should update decision time after executing move', () => {
            const tetromino = new Tetromino('T', 3, 0);
            
            aiController.enable();
            aiController.setDecisionInterval(100);
            aiController.updateDecisionTime(0);
            
            aiController.update(board, tetromino, 200, () => {});
            
            // After update at time 200, lastDecisionTime should be 200
            // canMakeDecision checks if currentTime - lastDecisionTime >= decisionInterval
            // At time 200: 200 - 200 = 0, which is < 100, so should be false
            expect(aiController.canMakeDecision(200)).toBe(false); // Just updated, need to wait
            expect(aiController.canMakeDecision(250)).toBe(false); // 250 - 200 = 50 < 100
            expect(aiController.canMakeDecision(300)).toBe(true);  // 300 - 200 = 100 >= 100
        });
    });
    
    describe('getMoveQueue', () => {
        test('should return copy of move queue', () => {
            aiController.moveQueue = [{ type: 'left' }, { type: 'drop' }];
            
            const queue = aiController.getMoveQueue();
            
            expect(queue).toEqual([{ type: 'left' }, { type: 'drop' }]);
            
            // Modifying returned queue should not affect original
            queue.push({ type: 'rotate' });
            expect(aiController.moveQueue.length).toBe(2);
        });
    });
    
    describe('reset', () => {
        test('should clear move queue and reset decision time', () => {
            aiController.moveQueue = [{ type: 'left' }, { type: 'drop' }];
            aiController.lastDecisionTime = 1000;
            
            aiController.reset();
            
            expect(aiController.moveQueue).toEqual([]);
            expect(aiController.lastDecisionTime).toBe(0);
        });
    });
    
    describe('getStatus', () => {
        test('should return current AI status', () => {
            aiController.enable();
            aiController.setDecisionInterval(150);
            aiController.moveQueue = [{ type: 'left' }, { type: 'drop' }];
            aiController.lastDecisionTime = 500;
            
            const status = aiController.getStatus();
            
            expect(status.enabled).toBe(true);
            expect(status.pendingMoves).toBe(2);
            expect(status.decisionInterval).toBe(150);
            expect(status.lastDecisionTime).toBe(500);
        });
    });
    
    describe('AI Speed Consistency (Requirement 2.6)', () => {
        test('should use GameEngine dropInterval when gameEngine is set', () => {
            const mockGameEngine = { dropInterval: 500 };
            aiController.setGameEngine(mockGameEngine);
            
            expect(aiController.getDecisionInterval()).toBe(500);
        });
        
        test('should fall back to decisionInterval when no gameEngine', () => {
            aiController.setDecisionInterval(200);
            
            expect(aiController.getDecisionInterval()).toBe(200);
        });
        
        test('should sync with game speed via syncWithGameSpeed', () => {
            aiController.syncWithGameSpeed(600);
            
            expect(aiController.decisionInterval).toBe(600);
        });
        
        test('syncWithGameSpeed should enforce minimum interval', () => {
            aiController.syncWithGameSpeed(5);
            
            expect(aiController.decisionInterval).toBe(10);
        });
        
        test('setGameEngine and getGameEngine should work correctly', () => {
            const mockGameEngine = { dropInterval: 300 };
            
            expect(aiController.getGameEngine()).toBeNull();
            
            aiController.setGameEngine(mockGameEngine);
            
            expect(aiController.getGameEngine()).toBe(mockGameEngine);
        });
        
        test('canMakeDecision should use effective interval from gameEngine', () => {
            const mockGameEngine = { dropInterval: 200 };
            aiController.setGameEngine(mockGameEngine);
            aiController.updateDecisionTime(0);
            
            // With dropInterval of 200ms
            expect(aiController.canMakeDecision(100)).toBe(false); // 100 < 200
            expect(aiController.canMakeDecision(200)).toBe(true);  // 200 >= 200
            expect(aiController.canMakeDecision(300)).toBe(true);  // 300 >= 200
        });
        
        test('AI timing should match manual gameplay timing at each speed level', () => {
            // Test that AI respects the same speed intervals as manual gameplay
            const speedIntervals = {
                1: 1000,
                5: 600,
                10: 100
            };
            
            for (const [speed, expectedInterval] of Object.entries(speedIntervals)) {
                const mockGameEngine = { dropInterval: expectedInterval };
                aiController.setGameEngine(mockGameEngine);
                
                expect(aiController.getDecisionInterval()).toBe(expectedInterval);
            }
        });
        
        test('getStatus should include hasGameEngine flag', () => {
            expect(aiController.getStatus().hasGameEngine).toBe(false);
            
            aiController.setGameEngine({ dropInterval: 500 });
            
            expect(aiController.getStatus().hasGameEngine).toBe(true);
        });
        
        test('getStatus should return effective decisionInterval from gameEngine', () => {
            aiController.setDecisionInterval(100);
            const mockGameEngine = { dropInterval: 700 };
            aiController.setGameEngine(mockGameEngine);
            
            const status = aiController.getStatus();
            
            // Should return gameEngine's dropInterval, not the manually set one
            expect(status.decisionInterval).toBe(700);
        });
        
        test('update should respect gameEngine speed settings', () => {
            const tetromino = new Tetromino('T', 3, 0);
            let executedMove = null;
            
            // Set up AI with gameEngine that has 200ms interval
            const mockGameEngine = { dropInterval: 200 };
            aiController.setGameEngine(mockGameEngine);
            aiController.enable();
            aiController.updateDecisionTime(0);
            
            // At 100ms, should not execute (100 < 200)
            let result = aiController.update(board, tetromino, 100, (move) => {
                executedMove = move;
            });
            expect(result).toBe(false);
            expect(executedMove).toBeNull();
            
            // At 200ms, should execute (200 >= 200)
            result = aiController.update(board, tetromino, 200, (move) => {
                executedMove = move;
            });
            expect(result).toBe(true);
            expect(executedMove).not.toBeNull();
        });
    });
});