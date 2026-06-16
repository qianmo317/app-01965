/**
 * RLAgent Unit Tests
 * 
 * Tests for the Reinforcement Learning Agent
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { RLAgent, STORAGE_KEY, DEFAULT_CONFIG } from './rl-agent.js';
import { DEFAULT_WEIGHTS } from './state-evaluator.js';

// Mock localStorage for testing
const createMockStorage = () => {
    let store = {};
    return {
        getItem: jest.fn((key) => store[key] || null),
        setItem: jest.fn((key, value) => { store[key] = value; }),
        removeItem: jest.fn((key) => { delete store[key]; }),
        clear: jest.fn(() => { store = {}; }),
        _getStore: () => store
    };
};

describe('RLAgent', () => {
    let agent;
    let mockStorage;
    
    beforeEach(() => {
        mockStorage = createMockStorage();
        agent = new RLAgent({}, mockStorage);
    });
    
    describe('Constructor', () => {
        test('should initialize with default values', () => {
            expect(agent.epsilon).toBe(DEFAULT_CONFIG.epsilon);
            expect(agent.learningRate).toBe(DEFAULT_CONFIG.learningRate);
            expect(agent.weights).toEqual(DEFAULT_WEIGHTS);
            expect(agent.statistics.gamesPlayed).toBe(0);
            expect(agent.statistics.totalScore).toBe(0);
            expect(agent.statistics.bestScore).toBe(0);
            expect(agent.statistics.totalLinesCleared).toBe(0);
            expect(agent.statistics.averageScore).toBe(0);
        });
        
        test('should accept custom configuration', () => {
            const customAgent = new RLAgent({
                epsilon: 0.5,
                learningRate: 0.05
            }, mockStorage);
            
            expect(customAgent.epsilon).toBe(0.5);
            expect(customAgent.learningRate).toBe(0.05);
        });
    });
    
    describe('selectAction - Epsilon-Greedy Strategy', () => {
        test('should return null for empty placements array', () => {
            const result = agent.selectAction([]);
            expect(result).toBeNull();
        });
        
        test('should return null for null placements', () => {
            const result = agent.selectAction(null);
            expect(result).toBeNull();
        });
        
        test('should return the only placement when array has one element', () => {
            const placements = [{ x: 0, rotation: 0, score: 100 }];
            const result = agent.selectAction(placements);
            expect(result).toEqual(placements[0]);
        });
        
        test('should always select best placement when epsilon = 0', () => {
            agent.setEpsilon(0);
            
            const placements = [
                { x: 0, rotation: 0, score: 50 },
                { x: 1, rotation: 0, score: 100 },
                { x: 2, rotation: 0, score: 75 }
            ];
            
            // Run multiple times to ensure consistency
            for (let i = 0; i < 10; i++) {
                const result = agent.selectAction(placements);
                expect(result.score).toBe(100);
            }
        });
        
        test('should select randomly when epsilon = 1', () => {
            // Use a deterministic random for testing
            let callCount = 0;
            const deterministicRandom = () => {
                callCount++;
                // First call determines explore/exploit, second determines index
                if (callCount % 2 === 1) return 0.5; // Always explore (< 1.0)
                return 0.5; // Select middle index
            };
            
            const testAgent = new RLAgent({ 
                epsilon: 1.0,
                random: deterministicRandom 
            }, mockStorage);
            
            const placements = [
                { x: 0, rotation: 0, score: 50 },
                { x: 1, rotation: 0, score: 100 },
                { x: 2, rotation: 0, score: 75 }
            ];
            
            const result = testAgent.selectAction(placements);
            // With random = 0.5, floor(0.5 * 3) = 1, so should select index 1
            expect(result).toEqual(placements[1]);
        });
        
        test('should exploit when random value >= epsilon', () => {
            // Random returns 0.6, epsilon is 0.5, so should exploit
            const testAgent = new RLAgent({ 
                epsilon: 0.5,
                random: () => 0.6 
            }, mockStorage);
            
            const placements = [
                { x: 0, rotation: 0, score: 50 },
                { x: 1, rotation: 0, score: 100 },
                { x: 2, rotation: 0, score: 75 }
            ];
            
            const result = testAgent.selectAction(placements);
            expect(result.score).toBe(100); // Should select best
        });
        
        test('should explore when random value < epsilon', () => {
            let callCount = 0;
            const testAgent = new RLAgent({ 
                epsilon: 0.5,
                random: () => {
                    callCount++;
                    if (callCount === 1) return 0.3; // < 0.5, explore
                    return 0; // Select first index
                }
            }, mockStorage);
            
            const placements = [
                { x: 0, rotation: 0, score: 50 },
                { x: 1, rotation: 0, score: 100 },
                { x: 2, rotation: 0, score: 75 }
            ];
            
            const result = testAgent.selectAction(placements);
            expect(result).toEqual(placements[0]); // Random selection
        });
    });
    
    describe('decayEpsilon', () => {
        test('should decay epsilon by decay factor', () => {
            agent.setEpsilon(1.0);
            const initialEpsilon = agent.epsilon;
            
            agent.decayEpsilon();
            
            expect(agent.epsilon).toBe(initialEpsilon * DEFAULT_CONFIG.epsilonDecay);
        });
        
        test('should not decay below minimum epsilon', () => {
            agent.setEpsilon(0.01);
            
            agent.decayEpsilon();
            
            expect(agent.epsilon).toBe(DEFAULT_CONFIG.epsilonMin);
        });
        
        test('should approach minimum over many decays', () => {
            agent.setEpsilon(1.0);
            
            // Decay many times
            for (let i = 0; i < 1000; i++) {
                agent.decayEpsilon();
            }
            
            expect(agent.epsilon).toBeCloseTo(DEFAULT_CONFIG.epsilonMin, 5);
        });
    });
    
    describe('recordGame', () => {
        test('should increment games played', () => {
            agent.recordGame(100, 5);
            expect(agent.statistics.gamesPlayed).toBe(1);
            
            agent.recordGame(200, 10);
            expect(agent.statistics.gamesPlayed).toBe(2);
        });
        
        test('should update total score', () => {
            agent.recordGame(100, 5);
            expect(agent.statistics.totalScore).toBe(100);
            
            agent.recordGame(200, 10);
            expect(agent.statistics.totalScore).toBe(300);
        });
        
        test('should update best score', () => {
            agent.recordGame(100, 5);
            expect(agent.statistics.bestScore).toBe(100);
            
            agent.recordGame(50, 2);
            expect(agent.statistics.bestScore).toBe(100); // Should not decrease
            
            agent.recordGame(200, 10);
            expect(agent.statistics.bestScore).toBe(200);
        });
        
        test('should update total lines cleared', () => {
            agent.recordGame(100, 5);
            expect(agent.statistics.totalLinesCleared).toBe(5);
            
            agent.recordGame(200, 10);
            expect(agent.statistics.totalLinesCleared).toBe(15);
        });
        
        test('should calculate average score', () => {
            agent.recordGame(100, 5);
            expect(agent.statistics.averageScore).toBe(100);
            
            agent.recordGame(200, 10);
            expect(agent.statistics.averageScore).toBe(150);
        });
        
        test('should add score to history', () => {
            agent.recordGame(100, 5);
            agent.recordGame(200, 10);
            
            expect(agent.scoreHistory).toEqual([100, 200]);
        });
        
        test('should limit score history size', () => {
            const historySize = DEFAULT_CONFIG.scoreHistorySize;
            
            for (let i = 0; i < historySize + 10; i++) {
                agent.recordGame(i * 10, i);
            }
            
            expect(agent.scoreHistory.length).toBe(historySize);
            // Should have removed oldest entries
            expect(agent.scoreHistory[0]).toBe(100); // 10 * 10
        });
        
        test('should decay epsilon after recording game', () => {
            const initialEpsilon = agent.epsilon;
            agent.recordGame(100, 5);
            
            expect(agent.epsilon).toBeLessThan(initialEpsilon);
        });
    });
    
    describe('updateWeights', () => {
        test('should handle null game result', () => {
            const initialWeights = { ...agent.weights };
            agent.updateWeights(null);
            
            // Weights should remain unchanged (or only have minor noise)
            expect(agent.weights.aggregateHeight).toBeCloseTo(initialWeights.aggregateHeight, 1);
        });
        
        test('should update weights based on game result', () => {
            // First record some games to establish baseline
            agent.recordGame(100, 5);
            agent.recordGame(100, 5);
            
            const initialWeights = { ...agent.weights };
            
            // Good performance should adjust weights
            agent.updateWeights({
                score: 500,
                linesCleared: 20,
                finalBoardMetrics: {
                    aggregateHeight: 10,
                    completeLines: 2,
                    holes: 0,
                    bumpiness: 5
                }
            });
            
            // Weights should have changed
            const weightsChanged = 
                agent.weights.aggregateHeight !== initialWeights.aggregateHeight ||
                agent.weights.completeLines !== initialWeights.completeLines ||
                agent.weights.holes !== initialWeights.holes ||
                agent.weights.bumpiness !== initialWeights.bumpiness;
            
            expect(weightsChanged).toBe(true);
        });
    });

    describe('saveToStorage and loadFromStorage', () => {
        test('should save learning data to storage', () => {
            agent.recordGame(100, 5);
            agent.recordGame(200, 10);
            
            const result = agent.saveToStorage();
            
            expect(result).toBe(true);
            expect(mockStorage.setItem).toHaveBeenCalledWith(
                STORAGE_KEY,
                expect.any(String)
            );
        });
        
        test('should load learning data from storage', () => {
            // Save some data first
            agent.recordGame(100, 5);
            agent.recordGame(200, 10);
            agent.setEpsilon(0.5);
            agent.saveToStorage();
            
            // Create new agent and load
            const newAgent = new RLAgent({}, mockStorage);
            const result = newAgent.loadFromStorage();
            
            expect(result).toBe(true);
            expect(newAgent.statistics.gamesPlayed).toBe(2);
            expect(newAgent.statistics.totalScore).toBe(300);
            expect(newAgent.epsilon).toBeCloseTo(0.5, 2);
        });
        
        test('should return false when storage is not available', () => {
            const agentNoStorage = new RLAgent({}, null);
            
            expect(agentNoStorage.saveToStorage()).toBe(false);
            expect(agentNoStorage.loadFromStorage()).toBe(false);
        });
        
        test('should return false when no data in storage', () => {
            const result = agent.loadFromStorage();
            expect(result).toBe(false);
        });
        
        test('should handle corrupted data gracefully', () => {
            mockStorage.getItem = jest.fn(() => 'invalid json{');
            
            const result = agent.loadFromStorage();
            expect(result).toBe(false);
        });
        
        test('should preserve weights through save/load cycle', () => {
            const customWeights = {
                aggregateHeight: -0.6,
                completeLines: 0.9,
                holes: -0.4,
                bumpiness: -0.2
            };
            
            agent.setWeights(customWeights);
            agent.saveToStorage();
            
            const newAgent = new RLAgent({}, mockStorage);
            newAgent.loadFromStorage();
            
            expect(newAgent.weights).toEqual(customWeights);
        });
        
        test('should preserve statistics through save/load cycle', () => {
            agent.recordGame(100, 5);
            agent.recordGame(200, 10);
            agent.recordGame(150, 8);
            agent.saveToStorage();
            
            const newAgent = new RLAgent({}, mockStorage);
            newAgent.loadFromStorage();
            
            expect(newAgent.statistics.gamesPlayed).toBe(3);
            expect(newAgent.statistics.totalScore).toBe(450);
            expect(newAgent.statistics.bestScore).toBe(200);
            expect(newAgent.statistics.totalLinesCleared).toBe(23);
            expect(newAgent.statistics.averageScore).toBe(150);
        });
        
        test('should preserve epsilon through save/load cycle', () => {
            agent.setEpsilon(0.42);
            agent.saveToStorage();
            
            const newAgent = new RLAgent({}, mockStorage);
            newAgent.loadFromStorage();
            
            expect(newAgent.epsilon).toBe(0.42);
        });
        
        test('should preserve score history through save/load cycle', () => {
            agent.recordGame(100, 5);
            agent.recordGame(200, 10);
            agent.recordGame(150, 8);
            agent.saveToStorage();
            
            const newAgent = new RLAgent({}, mockStorage);
            newAgent.loadFromStorage();
            
            // Note: epsilon decays after each recordGame, so we compare the history
            expect(newAgent.scoreHistory).toEqual([100, 200, 150]);
        });
    });
    
    describe('clearStorage', () => {
        test('should remove data from storage', () => {
            agent.recordGame(100, 5);
            agent.saveToStorage();
            
            const result = agent.clearStorage();
            
            expect(result).toBe(true);
            expect(mockStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
        });
        
        test('should return false when storage is not available', () => {
            const agentNoStorage = new RLAgent({}, null);
            expect(agentNoStorage.clearStorage()).toBe(false);
        });
    });
    
    describe('reset', () => {
        test('should reset agent to initial state', () => {
            agent.recordGame(100, 5);
            agent.recordGame(200, 10);
            agent.setEpsilon(0.3);
            
            agent.reset();
            
            expect(agent.epsilon).toBe(DEFAULT_CONFIG.epsilon);
            expect(agent.weights).toEqual(DEFAULT_WEIGHTS);
            expect(agent.statistics.gamesPlayed).toBe(0);
            expect(agent.statistics.totalScore).toBe(0);
            expect(agent.statistics.bestScore).toBe(0);
            expect(agent.scoreHistory).toEqual([]);
        });
    });
    
    describe('Getters and Setters', () => {
        test('getEpsilon should return current epsilon', () => {
            agent.setEpsilon(0.5);
            expect(agent.getEpsilon()).toBe(0.5);
        });
        
        test('setEpsilon should clamp value to 0-1 range', () => {
            agent.setEpsilon(-0.5);
            expect(agent.epsilon).toBe(0);
            
            agent.setEpsilon(1.5);
            expect(agent.epsilon).toBe(1);
        });
        
        test('getLearningRate should return current learning rate', () => {
            expect(agent.getLearningRate()).toBe(DEFAULT_CONFIG.learningRate);
        });
        
        test('setLearningRate should update learning rate', () => {
            agent.setLearningRate(0.05);
            expect(agent.learningRate).toBe(0.05);
        });
        
        test('setLearningRate should not allow negative values', () => {
            agent.setLearningRate(-0.1);
            expect(agent.learningRate).toBe(0);
        });
        
        test('getWeights should return a copy of weights', () => {
            const weights = agent.getWeights();
            weights.aggregateHeight = 999;
            
            expect(agent.weights.aggregateHeight).not.toBe(999);
        });
        
        test('setWeights should update weights', () => {
            const newWeights = {
                aggregateHeight: -0.7,
                completeLines: 0.8,
                holes: -0.5,
                bumpiness: -0.3
            };
            
            agent.setWeights(newWeights);
            expect(agent.weights).toEqual(newWeights);
        });
        
        test('setWeights should reject invalid weights', () => {
            const initialWeights = { ...agent.weights };
            
            agent.setWeights({ aggregateHeight: 'invalid' });
            expect(agent.weights).toEqual(initialWeights);
            
            agent.setWeights({ aggregateHeight: NaN });
            expect(agent.weights).toEqual(initialWeights);
        });
        
        test('getStatistics should return a copy of statistics', () => {
            agent.recordGame(100, 5);
            const stats = agent.getStatistics();
            stats.gamesPlayed = 999;
            
            expect(agent.statistics.gamesPlayed).toBe(1);
        });
        
        test('getScoreHistory should return a copy of history', () => {
            agent.recordGame(100, 5);
            const history = agent.getScoreHistory();
            history.push(999);
            
            expect(agent.scoreHistory.length).toBe(1);
        });
    });
    
    describe('getRecentAverageScore', () => {
        test('should return 0 for empty history', () => {
            expect(agent.getRecentAverageScore()).toBe(0);
        });
        
        test('should calculate average of recent scores', () => {
            agent.recordGame(100, 5);
            agent.recordGame(200, 10);
            agent.recordGame(300, 15);
            
            expect(agent.getRecentAverageScore(3)).toBe(200);
        });
        
        test('should use all scores if less than n available', () => {
            agent.recordGame(100, 5);
            agent.recordGame(200, 10);
            
            expect(agent.getRecentAverageScore(10)).toBe(150);
        });
        
        test('should only use last n scores', () => {
            agent.recordGame(100, 5);
            agent.recordGame(200, 10);
            agent.recordGame(300, 15);
            agent.recordGame(400, 20);
            
            expect(agent.getRecentAverageScore(2)).toBe(350);
        });
    });
    
    describe('getLearningData and importLearningData', () => {
        test('getLearningData should return complete learning data', () => {
            agent.recordGame(100, 5);
            agent.setEpsilon(0.5);
            
            const data = agent.getLearningData();
            
            expect(data).toHaveProperty('weights');
            expect(data).toHaveProperty('epsilon');
            expect(data).toHaveProperty('statistics');
            expect(data).toHaveProperty('scoreHistory');
            expect(data).toHaveProperty('version');
            expect(data).toHaveProperty('lastUpdated');
        });
        
        test('importLearningData should restore agent state', () => {
            const data = {
                weights: {
                    aggregateHeight: -0.6,
                    completeLines: 0.9,
                    holes: -0.4,
                    bumpiness: -0.2
                },
                epsilon: 0.42,
                statistics: {
                    gamesPlayed: 10,
                    totalScore: 1000,
                    bestScore: 200,
                    totalLinesCleared: 50,
                    averageScore: 100
                },
                scoreHistory: [80, 90, 100, 110, 120],
                version: '1.0.0'
            };
            
            const result = agent.importLearningData(data);
            
            expect(result).toBe(true);
            expect(agent.weights).toEqual(data.weights);
            expect(agent.epsilon).toBe(data.epsilon);
            expect(agent.statistics).toEqual(data.statistics);
            expect(agent.scoreHistory).toEqual(data.scoreHistory);
        });
        
        test('importLearningData should handle invalid data', () => {
            expect(agent.importLearningData(null)).toBe(false);
            expect(agent.importLearningData('invalid')).toBe(false);
        });
    });
    
    describe('getStatus', () => {
        test('should return status summary', () => {
            agent.recordGame(100, 5);
            agent.recordGame(200, 10);
            
            const status = agent.getStatus();
            
            expect(status).toHaveProperty('epsilon');
            expect(status).toHaveProperty('learningRate');
            expect(status).toHaveProperty('gamesPlayed');
            expect(status).toHaveProperty('averageScore');
            expect(status).toHaveProperty('bestScore');
            expect(status).toHaveProperty('totalLinesCleared');
            expect(status).toHaveProperty('recentAverageScore');
            
            expect(status.gamesPlayed).toBe(2);
            expect(status.bestScore).toBe(200);
        });
    });
});
