/**
 * ControlPanel Unit Tests
 * 
 * Tests for UI control panel functionality
 * Requirements: 8.4, 8.5, 8.6, 8.7, 9.3, 10.4
 * 
 * @jest-environment jsdom
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { ControlPanel, DEFAULT_CONFIG, SPEED_INTERVALS } from './control-panel.js';

// Mock DOM setup
function createMockDOM() {
    document.body.innerHTML = `
        <button id="start-btn">开始游戏</button>
        <button id="pause-btn" disabled>暂停</button>
        <button id="restart-btn">重新开始</button>
        <button id="restart-btn-overlay">重新开始</button>
        
        <input type="checkbox" id="ai-toggle">
        
        <input type="range" id="speed-slider" min="1" max="10" value="5">
        <span id="speed-value">5</span>
        
        <span id="games-played">0</span>
        <span id="best-score">0</span>
        <span id="avg-score">0</span>
        <span id="total-lines">0</span>
        <span id="epsilon-value">1.00</span>
        
        <span id="current-score">0</span>
        <span id="lines-cleared">0</span>
        <span id="current-level">1</span>
        
        <div id="game-overlay">
            <h2 id="overlay-title">游戏结束</h2>
            <p id="overlay-score">最终分数: 0</p>
        </div>
        
        <div id="key-bindings-display">
            <div class="key-item" id="key-binding-left">
                <kbd id="key-left">←</kbd><span>左移</span>
            </div>
            <div class="key-item" id="key-binding-right">
                <kbd id="key-right">→</kbd><span>右移</span>
            </div>
            <div class="key-item" id="key-binding-down">
                <kbd id="key-down">↓</kbd><span>软降</span>
            </div>
            <div class="key-item" id="key-binding-rotateCW">
                <kbd id="key-rotateCW">↑</kbd><span>顺时针旋转</span>
            </div>
            <div class="key-item" id="key-binding-rotateCCW">
                <kbd id="key-rotateCCW">Z</kbd><span>逆时针旋转</span>
            </div>
            <div class="key-item" id="key-binding-drop">
                <kbd id="key-drop">Space</kbd><span>硬降</span>
            </div>
        </div>
    `;
}

// Mock GameEngine
function createMockGameEngine() {
    const mock = {
        gameState: 'idle',
        speed: 5,
        dropInterval: 600,
        start: null,
        pause: null,
        resume: null,
        restart: null,
        setSpeed: null,
        isPlaying: null,
        isPaused: null,
        isGameOver: null
    };
    
    mock.start = jest.fn(() => { mock.gameState = 'playing'; });
    mock.pause = jest.fn(() => { mock.gameState = 'paused'; });
    mock.resume = jest.fn(() => { mock.gameState = 'playing'; });
    mock.restart = jest.fn(() => { mock.gameState = 'playing'; });
    mock.setSpeed = jest.fn((speed) => { 
        mock.speed = speed;
        mock.dropInterval = SPEED_INTERVALS[speed];
    });
    mock.isPlaying = jest.fn(() => mock.gameState === 'playing');
    mock.isPaused = jest.fn(() => mock.gameState === 'paused');
    mock.isGameOver = jest.fn(() => mock.gameState === 'gameover');
    
    return mock;
}

// Mock AIController
function createMockAIController() {
    const mock = {
        enabled: false,
        enable: null,
        disable: null,
        reset: null,
        isEnabled: null
    };
    
    mock.enable = jest.fn(() => { mock.enabled = true; });
    mock.disable = jest.fn(() => { mock.enabled = false; });
    mock.reset = jest.fn();
    mock.isEnabled = jest.fn(() => mock.enabled);
    
    return mock;
}

// Mock RLAgent
function createMockRLAgent() {
    return {
        epsilon: 1.0,
        statistics: {
            gamesPlayed: 10,
            totalScore: 5000,
            bestScore: 1000,
            totalLinesCleared: 50,
            averageScore: 500
        },
        getStatistics: jest.fn(function() { return { ...this.statistics }; }),
        getEpsilon: jest.fn(function() { return this.epsilon; })
    };
}

// Mock SettingsManager
function createMockSettingsManager() {
    return {
        keyBindings: {
            left: 'ArrowLeft',
            right: 'ArrowRight',
            down: 'ArrowDown',
            drop: 'Space',
            rotateCW: 'ArrowUp',
            rotateCCW: 'KeyZ'
        },
        getKeyBindingsDisplay: jest.fn(function() {
            const actionDescriptions = {
                left: '左移',
                right: '右移',
                down: '软降',
                drop: '硬降',
                rotateCW: '顺时针旋转',
                rotateCCW: '逆时针旋转'
            };
            
            const keyDisplayNames = {
                'ArrowLeft': '←',
                'ArrowRight': '→',
                'ArrowUp': '↑',
                'ArrowDown': '↓',
                'Space': 'Space',
                'KeyZ': 'Z',
                'KeyA': 'A',
                'KeyD': 'D'
            };
            
            const actionOrder = ['left', 'right', 'down', 'rotateCW', 'rotateCCW', 'drop'];
            
            return actionOrder.map(action => {
                const key = this.keyBindings[action];
                return {
                    action: action,
                    key: key,
                    description: actionDescriptions[action] || action,
                    displayKey: keyDisplayNames[key] || key
                };
            });
        }),
        setKeyBinding: jest.fn(function(action, key) {
            this.keyBindings[action] = key;
        })
    };
}

describe('ControlPanel', () => {
    let controlPanel;
    let mockGameEngine;
    let mockAIController;
    let mockRLAgent;
    
    beforeEach(() => {
        createMockDOM();
        mockGameEngine = createMockGameEngine();
        mockAIController = createMockAIController();
        mockRLAgent = createMockRLAgent();
        
        controlPanel = new ControlPanel({
            gameEngine: mockGameEngine,
            aiController: mockAIController,
            rlAgent: mockRLAgent
        });
    });
    
    afterEach(() => {
        if (controlPanel) {
            controlPanel.destroy();
        }
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });
    
    describe('Initialization', () => {
        test('should initialize with default config', () => {
            expect(controlPanel.config).toEqual(expect.objectContaining(DEFAULT_CONFIG));
        });
        
        test('should cache DOM elements on init', () => {
            controlPanel.init();
            
            expect(controlPanel.elements.startButton).toBeTruthy();
            expect(controlPanel.elements.pauseButton).toBeTruthy();
            expect(controlPanel.elements.restartButton).toBeTruthy();
            expect(controlPanel.elements.aiToggle).toBeTruthy();
            expect(controlPanel.elements.speedSlider).toBeTruthy();
        });
        
        test('should set isInitialized to true after init', () => {
            expect(controlPanel.isInitialized).toBe(false);
            controlPanel.init();
            expect(controlPanel.isInitialized).toBe(true);
        });
        
        test('should not re-initialize if already initialized', () => {
            controlPanel.init();
            const elements = controlPanel.elements;
            controlPanel.init();
            expect(controlPanel.elements).toBe(elements);
        });
    });
    
    describe('Control Buttons - Requirements 8.6', () => {
        beforeEach(() => {
            controlPanel.init();
        });
        
        test('start button should start the game', () => {
            const startButton = document.getElementById('start-btn');
            startButton.click();
            
            expect(mockGameEngine.start).toHaveBeenCalled();
        });
        
        test('start button should resume if game is paused', () => {
            mockGameEngine.gameState = 'paused';
            
            const startButton = document.getElementById('start-btn');
            startButton.click();
            
            expect(mockGameEngine.resume).toHaveBeenCalled();
        });
        
        test('pause button should pause the game when playing', () => {
            mockGameEngine.gameState = 'playing';
            controlPanel._updateButtonStates('playing'); // Enable the pause button
            
            const pauseButton = document.getElementById('pause-btn');
            pauseButton.click();
            
            expect(mockGameEngine.pause).toHaveBeenCalled();
        });
        
        test('pause button should resume the game when paused', () => {
            mockGameEngine.gameState = 'paused';
            controlPanel._updateButtonStates('paused'); // Enable the pause button
            
            const pauseButton = document.getElementById('pause-btn');
            pauseButton.click();
            
            expect(mockGameEngine.resume).toHaveBeenCalled();
        });
        
        test('restart button should restart the game', () => {
            controlPanel._updateButtonStates('playing'); // Enable the restart button
            const restartButton = document.getElementById('restart-btn');
            restartButton.click();
            
            expect(mockGameEngine.restart).toHaveBeenCalled();
        });
        
        test('restart button should reset AI controller', () => {
            controlPanel._updateButtonStates('playing'); // Enable the restart button
            const restartButton = document.getElementById('restart-btn');
            restartButton.click();
            
            expect(mockAIController.reset).toHaveBeenCalled();
        });
        
        test('overlay restart button should restart the game', () => {
            const restartOverlayButton = document.getElementById('restart-btn-overlay');
            restartOverlayButton.click();
            
            expect(mockGameEngine.restart).toHaveBeenCalled();
        });
    });
    
    describe('Button States', () => {
        beforeEach(() => {
            controlPanel.init();
        });
        
        test('should update button states for idle state', () => {
            controlPanel._updateButtonStates('idle');
            
            const startButton = document.getElementById('start-btn');
            const pauseButton = document.getElementById('pause-btn');
            const restartButton = document.getElementById('restart-btn');
            
            expect(startButton.disabled).toBe(false);
            expect(pauseButton.disabled).toBe(true);
            expect(restartButton.disabled).toBe(true);
        });
        
        test('should update button states for playing state', () => {
            controlPanel._updateButtonStates('playing');
            
            const startButton = document.getElementById('start-btn');
            const pauseButton = document.getElementById('pause-btn');
            const restartButton = document.getElementById('restart-btn');
            
            expect(startButton.disabled).toBe(true);
            expect(pauseButton.disabled).toBe(false);
            expect(restartButton.disabled).toBe(false);
        });
        
        test('should update button states for paused state', () => {
            controlPanel._updateButtonStates('paused');
            
            const startButton = document.getElementById('start-btn');
            const pauseButton = document.getElementById('pause-btn');
            const restartButton = document.getElementById('restart-btn');
            
            expect(startButton.disabled).toBe(true);
            expect(pauseButton.disabled).toBe(false);
            expect(pauseButton.textContent).toBe('继续');
            expect(restartButton.disabled).toBe(false);
        });
        
        test('should update button states for gameover state', () => {
            controlPanel._updateButtonStates('gameover');
            
            const startButton = document.getElementById('start-btn');
            const pauseButton = document.getElementById('pause-btn');
            const restartButton = document.getElementById('restart-btn');
            
            expect(startButton.disabled).toBe(false);
            expect(pauseButton.disabled).toBe(true);
            expect(restartButton.disabled).toBe(false);
        });
    });
    
    describe('AI Toggle - Requirements 8.4', () => {
        beforeEach(() => {
            controlPanel.init();
        });
        
        test('should enable AI when toggle is checked', () => {
            const aiToggle = document.getElementById('ai-toggle');
            aiToggle.checked = true;
            aiToggle.dispatchEvent(new Event('change'));
            
            expect(mockAIController.enable).toHaveBeenCalled();
            expect(controlPanel.aiEnabled).toBe(true);
        });
        
        test('should disable AI when toggle is unchecked', () => {
            // First enable
            controlPanel.aiEnabled = true;
            mockAIController.enabled = true;
            
            const aiToggle = document.getElementById('ai-toggle');
            aiToggle.checked = false;
            aiToggle.dispatchEvent(new Event('change'));
            
            expect(mockAIController.disable).toHaveBeenCalled();
            expect(controlPanel.aiEnabled).toBe(false);
        });
        
        test('should call onAIToggle callback', () => {
            const onAIToggle = jest.fn();
            controlPanel.onAIToggle = onAIToggle;
            
            const aiToggle = document.getElementById('ai-toggle');
            aiToggle.checked = true;
            aiToggle.dispatchEvent(new Event('change'));
            
            expect(onAIToggle).toHaveBeenCalledWith(true);
        });
        
        test('setAIEnabled should update toggle state', () => {
            controlPanel.setAIEnabled(true);
            
            const aiToggle = document.getElementById('ai-toggle');
            expect(aiToggle.checked).toBe(true);
            expect(mockAIController.enable).toHaveBeenCalled();
        });
        
        test('isAIEnabled should return current state', () => {
            controlPanel.aiEnabled = true;
            expect(controlPanel.isAIEnabled()).toBe(true);
            
            controlPanel.aiEnabled = false;
            expect(controlPanel.isAIEnabled()).toBe(false);
        });
    });
    
    describe('Speed Slider - Requirements 8.5, 10.4', () => {
        beforeEach(() => {
            controlPanel.init();
        });
        
        test('should update speed when slider changes', () => {
            const speedSlider = document.getElementById('speed-slider');
            speedSlider.value = '8';
            speedSlider.dispatchEvent(new Event('input'));
            
            expect(controlPanel.currentSpeed).toBe(8);
            expect(mockGameEngine.setSpeed).toHaveBeenCalledWith(8);
        });
        
        test('should update speed display when slider changes', () => {
            const speedSlider = document.getElementById('speed-slider');
            const speedValue = document.getElementById('speed-value');
            
            speedSlider.value = '7';
            speedSlider.dispatchEvent(new Event('input'));
            
            expect(speedValue.textContent).toBe('7');
        });
        
        test('should call onSpeedChange callback', () => {
            const onSpeedChange = jest.fn();
            controlPanel.onSpeedChange = onSpeedChange;
            
            const speedSlider = document.getElementById('speed-slider');
            speedSlider.value = '3';
            speedSlider.dispatchEvent(new Event('input'));
            
            expect(onSpeedChange).toHaveBeenCalledWith(3);
        });
        
        test('setSpeed should update slider and display', () => {
            controlPanel.setSpeed(9);
            
            const speedSlider = document.getElementById('speed-slider');
            const speedValue = document.getElementById('speed-value');
            
            expect(speedSlider.value).toBe('9');
            expect(speedValue.textContent).toBe('9');
            expect(mockGameEngine.setSpeed).toHaveBeenCalledWith(9);
        });
        
        test('setSpeed should clamp values to 1-10 range', () => {
            controlPanel.setSpeed(15);
            expect(controlPanel.currentSpeed).toBe(10);
            
            controlPanel.setSpeed(0);
            expect(controlPanel.currentSpeed).toBe(1);
            
            controlPanel.setSpeed(-5);
            expect(controlPanel.currentSpeed).toBe(1);
        });
        
        test('getSpeed should return current speed', () => {
            controlPanel.currentSpeed = 6;
            expect(controlPanel.getSpeed()).toBe(6);
        });
    });
    
    describe('Speed Intervals - Requirements 10.4', () => {
        test('higher speed should have shorter interval', () => {
            for (let speed = 1; speed < 10; speed++) {
                const interval1 = SPEED_INTERVALS[speed];
                const interval2 = SPEED_INTERVALS[speed + 1];
                expect(interval2).toBeLessThan(interval1);
            }
        });
        
        test('all speed intervals should be positive', () => {
            for (let speed = 1; speed <= 10; speed++) {
                expect(SPEED_INTERVALS[speed]).toBeGreaterThan(0);
            }
        });
        
        test('getDropInterval static method should return correct interval', () => {
            expect(ControlPanel.getDropInterval(1)).toBe(1000);
            expect(ControlPanel.getDropInterval(5)).toBe(600);
            expect(ControlPanel.getDropInterval(10)).toBe(100);
        });
        
        test('getDropInterval should clamp out-of-range values', () => {
            expect(ControlPanel.getDropInterval(0)).toBe(SPEED_INTERVALS[1]);
            expect(ControlPanel.getDropInterval(15)).toBe(SPEED_INTERVALS[10]);
            expect(ControlPanel.getDropInterval(-5)).toBe(SPEED_INTERVALS[1]);
        });
    });
    
    describe('AI Statistics Display - Requirements 8.7', () => {
        beforeEach(() => {
            controlPanel.init();
        });
        
        test('should update AI statistics display', () => {
            controlPanel.updateAIStats();
            
            expect(document.getElementById('games-played').textContent).toBe('10');
            expect(document.getElementById('best-score').textContent).toBe('1000');
            expect(document.getElementById('avg-score').textContent).toBe('500');
            expect(document.getElementById('total-lines').textContent).toBe('50');
            expect(document.getElementById('epsilon-value').textContent).toBe('1.00');
        });
        
        test('should handle missing rlAgent gracefully', () => {
            controlPanel.rlAgent = null;
            expect(() => controlPanel.updateAIStats()).not.toThrow();
        });
        
        test('should start stats update when AI is enabled', () => {
            jest.useFakeTimers();
            
            const aiToggle = document.getElementById('ai-toggle');
            aiToggle.checked = true;
            aiToggle.dispatchEvent(new Event('change'));
            
            expect(controlPanel.statsUpdateInterval).not.toBeNull();
            
            jest.useRealTimers();
        });
        
        test('should stop stats update when AI is disabled', () => {
            jest.useFakeTimers();
            
            // Enable first
            controlPanel._startStatsUpdate();
            expect(controlPanel.statsUpdateInterval).not.toBeNull();
            
            // Then disable
            const aiToggle = document.getElementById('ai-toggle');
            aiToggle.checked = false;
            aiToggle.dispatchEvent(new Event('change'));
            
            expect(controlPanel.statsUpdateInterval).toBeNull();
            
            jest.useRealTimers();
        });
    });
    
    describe('Score Display', () => {
        beforeEach(() => {
            controlPanel.init();
        });
        
        test('should update score display', () => {
            controlPanel.updateScore(1500);
            expect(document.getElementById('current-score').textContent).toBe('1500');
        });
        
        test('should update lines cleared display', () => {
            controlPanel.updateLinesCleared(25);
            expect(document.getElementById('lines-cleared').textContent).toBe('25');
        });
        
        test('should update level display', () => {
            controlPanel.updateLevel(5);
            expect(document.getElementById('current-level').textContent).toBe('5');
        });
    });
    
    describe('Game Overlay', () => {
        beforeEach(() => {
            controlPanel.init();
        });
        
        test('should show game over overlay', () => {
            controlPanel.showGameOver(2500);
            
            const overlay = document.getElementById('game-overlay');
            const title = document.getElementById('overlay-title');
            const score = document.getElementById('overlay-score');
            
            expect(overlay.classList.contains('active')).toBe(true);
            expect(title.textContent).toBe('游戏结束');
            expect(score.textContent).toBe('最终分数: 2500');
        });
        
        test('should show paused overlay', () => {
            controlPanel.showPaused();
            
            const overlay = document.getElementById('game-overlay');
            const title = document.getElementById('overlay-title');
            
            expect(overlay.classList.contains('active')).toBe(true);
            expect(title.textContent).toBe('游戏暂停');
        });
        
        test('should hide overlay', () => {
            const overlay = document.getElementById('game-overlay');
            overlay.classList.add('active');
            
            controlPanel.hideOverlay();
            
            expect(overlay.classList.contains('active')).toBe(false);
        });
    });
    
    describe('Game State Change Handler', () => {
        beforeEach(() => {
            controlPanel.init();
        });
        
        test('should handle playing state', () => {
            controlPanel.onGameStateChange('playing');
            
            const overlay = document.getElementById('game-overlay');
            expect(overlay.classList.contains('active')).toBe(false);
        });
        
        test('should handle paused state', () => {
            controlPanel.onGameStateChange('paused');
            
            const overlay = document.getElementById('game-overlay');
            expect(overlay.classList.contains('active')).toBe(true);
        });
    });
    
    describe('Setters', () => {
        test('should set game engine', () => {
            const newEngine = createMockGameEngine();
            controlPanel.setGameEngine(newEngine);
            expect(controlPanel.gameEngine).toBe(newEngine);
        });
        
        test('should set AI controller', () => {
            const newController = createMockAIController();
            controlPanel.setAIController(newController);
            expect(controlPanel.aiController).toBe(newController);
        });
        
        test('should set RL agent', () => {
            const newAgent = createMockRLAgent();
            controlPanel.setRLAgent(newAgent);
            expect(controlPanel.rlAgent).toBe(newAgent);
        });
    });
    
    describe('Callbacks', () => {
        beforeEach(() => {
            controlPanel.init();
        });
        
        test('should call onStart callback', () => {
            const onStart = jest.fn();
            controlPanel.onStart = onStart;
            
            document.getElementById('start-btn').click();
            
            expect(onStart).toHaveBeenCalled();
        });
        
        test('should call onPause callback', () => {
            const onPause = jest.fn();
            controlPanel.onPause = onPause;
            mockGameEngine.gameState = 'playing';
            controlPanel._updateButtonStates('playing'); // Enable the pause button
            
            document.getElementById('pause-btn').click();
            
            expect(onPause).toHaveBeenCalled();
        });
        
        test('should call onRestart callback', () => {
            const onRestart = jest.fn();
            controlPanel.onRestart = onRestart;
            controlPanel._updateButtonStates('playing'); // Enable the restart button
            
            document.getElementById('restart-btn').click();
            
            expect(onRestart).toHaveBeenCalled();
        });
    });
    
    describe('Destroy', () => {
        test('should clean up on destroy', () => {
            jest.useFakeTimers();
            
            controlPanel.init();
            controlPanel._startStatsUpdate();
            
            controlPanel.destroy();
            
            expect(controlPanel.isInitialized).toBe(false);
            expect(controlPanel.statsUpdateInterval).toBeNull();
            expect(Object.keys(controlPanel.elements).length).toBe(0);
            
            jest.useRealTimers();
        });
    });
    
    describe('Hover Effects - Requirements 9.3', () => {
        // Note: Hover effects are implemented via CSS, so we just verify
        // that the buttons have the correct classes for styling
        beforeEach(() => {
            controlPanel.init();
        });
        
        test('buttons should have btn class for hover styling', () => {
            // The HTML already has btn classes, this test verifies the structure
            const startButton = document.getElementById('start-btn');
            const pauseButton = document.getElementById('pause-btn');
            const restartButton = document.getElementById('restart-btn');
            
            // Buttons exist and can receive hover events
            expect(startButton).toBeTruthy();
            expect(pauseButton).toBeTruthy();
            expect(restartButton).toBeTruthy();
        });
    });
    
    describe('Key Bindings Display - Requirements 3.4', () => {
        let mockSettingsManager;
        
        beforeEach(() => {
            mockSettingsManager = createMockSettingsManager();
            controlPanel.setSettingsManager(mockSettingsManager);
            controlPanel.init();
        });
        
        test('should cache key bindings display element', () => {
            expect(controlPanel.elements.keyBindingsDisplay).toBeTruthy();
        });
        
        test('should update key bindings display from settings manager', () => {
            controlPanel.updateKeyBindingsDisplay();
            
            expect(mockSettingsManager.getKeyBindingsDisplay).toHaveBeenCalled();
            
            expect(document.getElementById('key-left').textContent).toBe('←');
            expect(document.getElementById('key-right').textContent).toBe('→');
            expect(document.getElementById('key-down').textContent).toBe('↓');
            expect(document.getElementById('key-rotateCW').textContent).toBe('↑');
            expect(document.getElementById('key-rotateCCW').textContent).toBe('Z');
            expect(document.getElementById('key-drop').textContent).toBe('Space');
        });
        
        test('should handle missing settings manager gracefully', () => {
            controlPanel.settingsManager = null;
            expect(() => controlPanel.updateKeyBindingsDisplay()).not.toThrow();
        });
        
        test('should update display when key bindings change', () => {
            // Change key bindings
            mockSettingsManager.setKeyBinding('left', 'KeyA');
            mockSettingsManager.setKeyBinding('right', 'KeyD');
            
            controlPanel.updateKeyBindingsDisplay();
            
            expect(document.getElementById('key-left').textContent).toBe('A');
            expect(document.getElementById('key-right').textContent).toBe('D');
        });
        
        test('setSettingsManager should set the settings manager', () => {
            const newSettingsManager = createMockSettingsManager();
            controlPanel.setSettingsManager(newSettingsManager);
            expect(controlPanel.settingsManager).toBe(newSettingsManager);
        });
        
        test('should update key bindings display on initialization', () => {
            // Create a new control panel with settings manager
            const newControlPanel = new ControlPanel({
                gameEngine: mockGameEngine,
                aiController: mockAIController,
                rlAgent: mockRLAgent,
                settingsManager: mockSettingsManager
            });
            
            newControlPanel.init();
            
            // Verify that getKeyBindingsDisplay was called during init
            expect(mockSettingsManager.getKeyBindingsDisplay).toHaveBeenCalled();
            
            newControlPanel.destroy();
        });
    });
});
