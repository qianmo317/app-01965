/**
 * RLAgent Property-Based Tests
 * 
 * Property 12: Epsilon-Greedy Behavior
 * Property 13: Learning Data Persistence Round-Trip
 * 
 * **Validates: Requirements 7.1, 7.4, 7.6**
 */

import { describe, test, expect, jest } from '@jest/globals';
import * as fc from 'fast-check';
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

// Arbitrary for generating placement scores
const scoreArb = fc.double({ min: -1000, max: 1000, noNaN: true, noDefaultInfinity: true });

// Arbitrary for generating a single placement
const placementArb = fc.record({
    x: fc.integer({ min: 0, max: 9 }),
    rotation: fc.integer({ min: 0, max: 3 }),
    score: scoreArb
});

// Arbitrary for generating an array of placements with at least 2 elements
const placementsArb = fc.array(placementArb, { minLength: 2, maxLength: 50 });

// Arbitrary for generating placements with distinct scores
const distinctScorePlacementsArb = fc.array(
    fc.integer({ min: 0, max: 9 }),
    { minLength: 2, maxLength: 20 }
).chain(xValues => {
    // Generate distinct scores
    return fc.uniqueArray(
        fc.double({ min: -1000, max: 1000, noNaN: true, noDefaultInfinity: true }),
        { minLength: xValues.length, maxLength: xValues.length }
    ).map(scores => {
        return xValues.map((x, i) => ({
            x,
            rotation: i % 4,
            score: scores[i]
        }));
    });
});

// Arbitrary for generating valid evaluation weights
const weightsArb = fc.record({
    aggregateHeight: fc.double({ min: -10, max: 10, noNaN: true, noDefaultInfinity: true }),
    completeLines: fc.double({ min: -10, max: 10, noNaN: true, noDefaultInfinity: true }),
    holes: fc.double({ min: -10, max: 10, noNaN: true, noDefaultInfinity: true }),
    bumpiness: fc.double({ min: -10, max: 10, noNaN: true, noDefaultInfinity: true })
});

// Arbitrary for generating valid epsilon values
const epsilonArb = fc.double({ min: 0, max: 1, noNaN: true });

// Arbitrary for generating valid statistics
const statisticsArb = fc.record({
    gamesPlayed: fc.integer({ min: 0, max: 10000 }),
    totalScore: fc.integer({ min: 0, max: 10000000 }),
    bestScore: fc.integer({ min: 0, max: 1000000 }),
    totalLinesCleared: fc.integer({ min: 0, max: 100000 }),
    averageScore: fc.double({ min: 0, max: 100000, noNaN: true, noDefaultInfinity: true })
});

// Arbitrary for generating score history
const scoreHistoryArb = fc.array(
    fc.integer({ min: 0, max: 100000 }),
    { minLength: 0, maxLength: 100 }
);

// Arbitrary for generating complete AI learning data
const learningDataArb = fc.record({
    weights: weightsArb,
    epsilon: epsilonArb,
    statistics: statisticsArb,
    scoreHistory: scoreHistoryArb,
    version: fc.constant('1.0.0'),
    lastUpdated: fc.date().map(d => d.toISOString())
});

describe('RLAgent Property Tests', () => {
    /**
     * Property 12: Epsilon-Greedy Behavior
     * 
     * For any set of placement options with different scores:
     * - When epsilon = 0, the agent SHALL always select the highest-scored placement
     * - When epsilon = 1, the agent SHALL select randomly with uniform distribution
     * 
     * **Validates: Requirements 7.1, 7.6**
     */
    describe('Property 12: Epsilon-Greedy Behavior', () => {
        test('when epsilon = 0, always selects highest-scored placement', () => {
            fc.assert(
                fc.property(distinctScorePlacementsArb, (placements) => {
                    // Skip if placements is empty or has only one element
                    if (placements.length < 2) return true;
                    
                    const mockStorage = createMockStorage();
                    const agent = new RLAgent({ epsilon: 0 }, mockStorage);
                    
                    // Find the expected best placement
                    const expectedBest = placements.reduce((best, p) => 
                        p.score > best.score ? p : best
                    );
                    
                    // Run multiple times to ensure consistency
                    for (let i = 0; i < 10; i++) {
                        const selected = agent.selectAction(placements);
                        
                        // Property: Selected placement must have the highest score
                        expect(selected.score).toBe(expectedBest.score);
                    }
                }),
                { numRuns: 100 }
            );
        });
        
        test('when epsilon = 0, selected placement is deterministic', () => {
            fc.assert(
                fc.property(placementsArb, (placements) => {
                    if (placements.length < 2) return true;
                    
                    const mockStorage = createMockStorage();
                    const agent = new RLAgent({ epsilon: 0 }, mockStorage);
                    
                    // Select multiple times
                    const selections = [];
                    for (let i = 0; i < 5; i++) {
                        selections.push(agent.selectAction(placements));
                    }
                    
                    // Property: All selections must be identical
                    const firstSelection = selections[0];
                    for (const selection of selections) {
                        expect(selection.score).toBe(firstSelection.score);
                        expect(selection.x).toBe(firstSelection.x);
                        expect(selection.rotation).toBe(firstSelection.rotation);
                    }
                }),
                { numRuns: 100 }
            );
        });
        
        test('when epsilon = 1, all placements can be selected (uniform distribution)', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 2, max: 10 }),
                    (numPlacements) => {
                        // Create placements with distinct indices
                        const placements = [];
                        for (let i = 0; i < numPlacements; i++) {
                            placements.push({
                                x: i,
                                rotation: 0,
                                score: i * 10
                            });
                        }
                        
                        const mockStorage = createMockStorage();
                        
                        // Track which placements were selected
                        const selectionCounts = new Map();
                        const numTrials = 1000;
                        
                        for (let trial = 0; trial < numTrials; trial++) {
                            // Create new agent with fresh random for each trial
                            const agent = new RLAgent({ epsilon: 1.0 }, mockStorage);
                            const selected = agent.selectAction(placements);
                            
                            const key = `${selected.x}-${selected.rotation}`;
                            selectionCounts.set(key, (selectionCounts.get(key) || 0) + 1);
                        }
                        
                        // Property: All placements should be selected at least once
                        // With 1000 trials and uniform distribution, probability of missing
                        // any placement is extremely low
                        expect(selectionCounts.size).toBe(numPlacements);
                        
                        // Property: Distribution should be roughly uniform
                        // Each placement should be selected approximately numTrials/numPlacements times
                        const expectedCount = numTrials / numPlacements;
                        const tolerance = expectedCount * 0.5; // 50% tolerance
                        
                        for (const count of selectionCounts.values()) {
                            expect(count).toBeGreaterThan(expectedCount - tolerance);
                            expect(count).toBeLessThan(expectedCount + tolerance);
                        }
                    }
                ),
                { numRuns: 20 }
            );
        });
        
        test('epsilon = 0 never selects non-optimal placement', () => {
            fc.assert(
                fc.property(distinctScorePlacementsArb, (placements) => {
                    if (placements.length < 2) return true;
                    
                    const mockStorage = createMockStorage();
                    const agent = new RLAgent({ epsilon: 0 }, mockStorage);
                    
                    // Find the maximum score
                    const maxScore = Math.max(...placements.map(p => p.score));
                    
                    // Run many times
                    for (let i = 0; i < 50; i++) {
                        const selected = agent.selectAction(placements);
                        
                        // Property: Selected score must equal max score
                        expect(selected.score).toBe(maxScore);
                    }
                }),
                { numRuns: 100 }
            );
        });
        
        test('selectAction returns valid placement from input array', () => {
            fc.assert(
                fc.property(placementsArb, epsilonArb, (placements, epsilon) => {
                    if (placements.length === 0) return true;
                    
                    const mockStorage = createMockStorage();
                    const agent = new RLAgent({ epsilon }, mockStorage);
                    
                    const selected = agent.selectAction(placements);
                    
                    // Property: Selected placement must be from the input array
                    const found = placements.some(p => 
                        p.x === selected.x && 
                        p.rotation === selected.rotation && 
                        p.score === selected.score
                    );
                    
                    expect(found).toBe(true);
                }),
                { numRuns: 100 }
            );
        });
        
        test('single placement is always returned regardless of epsilon', () => {
            fc.assert(
                fc.property(placementArb, epsilonArb, (placement, epsilon) => {
                    const mockStorage = createMockStorage();
                    const agent = new RLAgent({ epsilon }, mockStorage);
                    
                    const selected = agent.selectAction([placement]);
                    
                    // Property: Single placement must be returned
                    expect(selected).toEqual(placement);
                }),
                { numRuns: 100 }
            );
        });
        
        test('epsilon decay reduces exploration over time', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 100 }),
                    (numDecays) => {
                        const mockStorage = createMockStorage();
                        const agent = new RLAgent({ epsilon: 1.0 }, mockStorage);
                        
                        const initialEpsilon = agent.epsilon;
                        
                        for (let i = 0; i < numDecays; i++) {
                            agent.decayEpsilon();
                        }
                        
                        // Property: Epsilon must decrease (or stay at minimum)
                        expect(agent.epsilon).toBeLessThanOrEqual(initialEpsilon);
                        expect(agent.epsilon).toBeGreaterThanOrEqual(DEFAULT_CONFIG.epsilonMin);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    /**
     * Property 13: Learning Data Persistence Round-Trip
     * 
     * For any valid AI learning data object, saving to local storage and then
     * loading SHALL produce an equivalent object with identical weights, epsilon,
     * and statistics values.
     * 
     * **Validates: Requirements 7.4**
     */
    describe('Property 13: Learning Data Persistence Round-Trip', () => {
        test('save and load produces equivalent weights', () => {
            fc.assert(
                fc.property(weightsArb, (weights) => {
                    const mockStorage = createMockStorage();
                    const agent = new RLAgent({}, mockStorage);
                    
                    // Set custom weights
                    agent.setWeights(weights);
                    
                    // Save to storage
                    agent.saveToStorage();
                    
                    // Create new agent and load
                    const newAgent = new RLAgent({}, mockStorage);
                    newAgent.loadFromStorage();
                    
                    // Property: Weights must be identical after round-trip
                    expect(newAgent.weights.aggregateHeight).toBeCloseTo(weights.aggregateHeight, 10);
                    expect(newAgent.weights.completeLines).toBeCloseTo(weights.completeLines, 10);
                    expect(newAgent.weights.holes).toBeCloseTo(weights.holes, 10);
                    expect(newAgent.weights.bumpiness).toBeCloseTo(weights.bumpiness, 10);
                }),
                { numRuns: 100 }
            );
        });
        
        test('save and load produces equivalent epsilon', () => {
            fc.assert(
                fc.property(epsilonArb, (epsilon) => {
                    const mockStorage = createMockStorage();
                    const agent = new RLAgent({}, mockStorage);
                    
                    // Set custom epsilon
                    agent.setEpsilon(epsilon);
                    
                    // Save to storage
                    agent.saveToStorage();
                    
                    // Create new agent and load
                    const newAgent = new RLAgent({}, mockStorage);
                    newAgent.loadFromStorage();
                    
                    // Property: Epsilon must be identical after round-trip
                    expect(newAgent.epsilon).toBeCloseTo(epsilon, 10);
                }),
                { numRuns: 100 }
            );
        });
        
        test('save and load produces equivalent statistics', () => {
            fc.assert(
                fc.property(
                    fc.array(
                        fc.record({
                            score: fc.integer({ min: 0, max: 10000 }),
                            lines: fc.integer({ min: 0, max: 100 })
                        }),
                        { minLength: 1, maxLength: 50 }
                    ),
                    (games) => {
                        const mockStorage = createMockStorage();
                        const agent = new RLAgent({}, mockStorage);
                        
                        // Record games
                        for (const game of games) {
                            agent.recordGame(game.score, game.lines);
                        }
                        
                        // Capture statistics before save
                        const statsBefore = agent.getStatistics();
                        
                        // Save to storage
                        agent.saveToStorage();
                        
                        // Create new agent and load
                        const newAgent = new RLAgent({}, mockStorage);
                        newAgent.loadFromStorage();
                        
                        // Property: Statistics must be identical after round-trip
                        const statsAfter = newAgent.getStatistics();
                        
                        expect(statsAfter.gamesPlayed).toBe(statsBefore.gamesPlayed);
                        expect(statsAfter.totalScore).toBe(statsBefore.totalScore);
                        expect(statsAfter.bestScore).toBe(statsBefore.bestScore);
                        expect(statsAfter.totalLinesCleared).toBe(statsBefore.totalLinesCleared);
                        expect(statsAfter.averageScore).toBeCloseTo(statsBefore.averageScore, 10);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        test('save and load produces equivalent score history', () => {
            fc.assert(
                fc.property(scoreHistoryArb, (scores) => {
                    const mockStorage = createMockStorage();
                    const agent = new RLAgent({}, mockStorage);
                    
                    // Record games to build history
                    for (const score of scores) {
                        agent.recordGame(score, Math.floor(score / 100));
                    }
                    
                    // Capture history before save
                    const historyBefore = agent.getScoreHistory();
                    
                    // Save to storage
                    agent.saveToStorage();
                    
                    // Create new agent and load
                    const newAgent = new RLAgent({}, mockStorage);
                    newAgent.loadFromStorage();
                    
                    // Property: Score history must be identical after round-trip
                    const historyAfter = newAgent.getScoreHistory();
                    
                    expect(historyAfter.length).toBe(historyBefore.length);
                    for (let i = 0; i < historyBefore.length; i++) {
                        expect(historyAfter[i]).toBe(historyBefore[i]);
                    }
                }),
                { numRuns: 100 }
            );
        });
        
        test('complete learning data round-trip preserves all fields', () => {
            fc.assert(
                fc.property(learningDataArb, (data) => {
                    const mockStorage = createMockStorage();
                    const agent = new RLAgent({}, mockStorage);
                    
                    // Import the learning data
                    agent.importLearningData(data);
                    
                    // Save to storage
                    agent.saveToStorage();
                    
                    // Create new agent and load
                    const newAgent = new RLAgent({}, mockStorage);
                    newAgent.loadFromStorage();
                    
                    // Property: All fields must be preserved
                    expect(newAgent.weights.aggregateHeight).toBeCloseTo(data.weights.aggregateHeight, 10);
                    expect(newAgent.weights.completeLines).toBeCloseTo(data.weights.completeLines, 10);
                    expect(newAgent.weights.holes).toBeCloseTo(data.weights.holes, 10);
                    expect(newAgent.weights.bumpiness).toBeCloseTo(data.weights.bumpiness, 10);
                    
                    expect(newAgent.epsilon).toBeCloseTo(data.epsilon, 10);
                    
                    expect(newAgent.statistics.gamesPlayed).toBe(data.statistics.gamesPlayed);
                    expect(newAgent.statistics.totalScore).toBe(data.statistics.totalScore);
                    expect(newAgent.statistics.bestScore).toBe(data.statistics.bestScore);
                    expect(newAgent.statistics.totalLinesCleared).toBe(data.statistics.totalLinesCleared);
                    expect(newAgent.statistics.averageScore).toBeCloseTo(data.statistics.averageScore, 10);
                    
                    expect(newAgent.scoreHistory).toEqual(data.scoreHistory);
                }),
                { numRuns: 100 }
            );
        });
        
        test('getLearningData and importLearningData are inverse operations', () => {
            fc.assert(
                fc.property(
                    weightsArb,
                    epsilonArb,
                    fc.array(
                        fc.record({
                            score: fc.integer({ min: 0, max: 10000 }),
                            lines: fc.integer({ min: 0, max: 100 })
                        }),
                        { minLength: 0, maxLength: 20 }
                    ),
                    (weights, epsilon, games) => {
                        const mockStorage = createMockStorage();
                        const agent = new RLAgent({}, mockStorage);
                        
                        // Set up agent state
                        agent.setWeights(weights);
                        agent.setEpsilon(epsilon);
                        for (const game of games) {
                            agent.recordGame(game.score, game.lines);
                        }
                        
                        // Get learning data
                        const data = agent.getLearningData();
                        
                        // Create new agent and import
                        const newAgent = new RLAgent({}, mockStorage);
                        newAgent.importLearningData(data);
                        
                        // Property: Imported agent should have equivalent state
                        // Note: epsilon may have decayed during recordGame calls
                        expect(newAgent.weights.aggregateHeight).toBeCloseTo(agent.weights.aggregateHeight, 10);
                        expect(newAgent.weights.completeLines).toBeCloseTo(agent.weights.completeLines, 10);
                        expect(newAgent.weights.holes).toBeCloseTo(agent.weights.holes, 10);
                        expect(newAgent.weights.bumpiness).toBeCloseTo(agent.weights.bumpiness, 10);
                        
                        expect(newAgent.epsilon).toBeCloseTo(agent.epsilon, 10);
                        
                        expect(newAgent.statistics.gamesPlayed).toBe(agent.statistics.gamesPlayed);
                        expect(newAgent.statistics.totalScore).toBe(agent.statistics.totalScore);
                        expect(newAgent.statistics.bestScore).toBe(agent.statistics.bestScore);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        test('multiple save/load cycles preserve data integrity', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 5 }),
                    weightsArb,
                    epsilonArb,
                    (cycles, weights, epsilon) => {
                        const mockStorage = createMockStorage();
                        let agent = new RLAgent({}, mockStorage);
                        
                        // Set initial state
                        agent.setWeights(weights);
                        agent.setEpsilon(epsilon);
                        
                        // Perform multiple save/load cycles
                        for (let i = 0; i < cycles; i++) {
                            agent.saveToStorage();
                            agent = new RLAgent({}, mockStorage);
                            agent.loadFromStorage();
                        }
                        
                        // Property: Data should be preserved after multiple cycles
                        expect(agent.weights.aggregateHeight).toBeCloseTo(weights.aggregateHeight, 10);
                        expect(agent.weights.completeLines).toBeCloseTo(weights.completeLines, 10);
                        expect(agent.weights.holes).toBeCloseTo(weights.holes, 10);
                        expect(agent.weights.bumpiness).toBeCloseTo(weights.bumpiness, 10);
                        
                        expect(agent.epsilon).toBeCloseTo(epsilon, 10);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        test('loading from empty storage does not corrupt agent state', () => {
            fc.assert(
                fc.property(weightsArb, epsilonArb, (weights, epsilon) => {
                    const mockStorage = createMockStorage();
                    const agent = new RLAgent({}, mockStorage);
                    
                    // Set custom state
                    agent.setWeights(weights);
                    agent.setEpsilon(epsilon);
                    
                    // Capture state before load attempt
                    const weightsBefore = agent.getWeights();
                    const epsilonBefore = agent.getEpsilon();
                    
                    // Attempt to load from empty storage
                    const result = agent.loadFromStorage();
                    
                    // Property: Load should fail and state should be unchanged
                    expect(result).toBe(false);
                    expect(agent.weights.aggregateHeight).toBeCloseTo(weightsBefore.aggregateHeight, 10);
                    expect(agent.weights.completeLines).toBeCloseTo(weightsBefore.completeLines, 10);
                    expect(agent.epsilon).toBeCloseTo(epsilonBefore, 10);
                }),
                { numRuns: 100 }
            );
        });
        
        test('saved data contains all required fields', () => {
            fc.assert(
                fc.property(
                    weightsArb,
                    epsilonArb,
                    fc.array(fc.integer({ min: 0, max: 1000 }), { minLength: 0, maxLength: 10 }),
                    (weights, epsilon, scores) => {
                        const mockStorage = createMockStorage();
                        const agent = new RLAgent({}, mockStorage);
                        
                        agent.setWeights(weights);
                        agent.setEpsilon(epsilon);
                        for (const score of scores) {
                            agent.recordGame(score, Math.floor(score / 100));
                        }
                        
                        agent.saveToStorage();
                        
                        // Get the saved data
                        const savedDataStr = mockStorage._getStore()[STORAGE_KEY];
                        const savedData = JSON.parse(savedDataStr);
                        
                        // Property: Saved data must contain all required fields
                        expect(savedData).toHaveProperty('weights');
                        expect(savedData).toHaveProperty('epsilon');
                        expect(savedData).toHaveProperty('statistics');
                        expect(savedData).toHaveProperty('scoreHistory');
                        expect(savedData).toHaveProperty('version');
                        expect(savedData).toHaveProperty('lastUpdated');
                        
                        // Property: Weights must have all required fields
                        expect(savedData.weights).toHaveProperty('aggregateHeight');
                        expect(savedData.weights).toHaveProperty('completeLines');
                        expect(savedData.weights).toHaveProperty('holes');
                        expect(savedData.weights).toHaveProperty('bumpiness');
                        
                        // Property: Statistics must have all required fields
                        expect(savedData.statistics).toHaveProperty('gamesPlayed');
                        expect(savedData.statistics).toHaveProperty('totalScore');
                        expect(savedData.statistics).toHaveProperty('bestScore');
                        expect(savedData.statistics).toHaveProperty('totalLinesCleared');
                        expect(savedData.statistics).toHaveProperty('averageScore');
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});
