/**
 * SettingsManager Unit Tests
 * 
 * Tests for game settings management and persistence
 * Requirements: 3.6, 3.7
 * - 3.6: THE Settings_Panel SHALL persist user preferences to local storage
 * - 3.7: WHEN the game loads, THE Settings_Panel SHALL restore previously saved preferences
 * 
 * @jest-environment jsdom
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { SettingsManager, DEFAULT_SETTINGS, STORAGE_KEY, SETTINGS_VERSION } from './settings-manager.js';

/**
 * Create a mock storage object that mimics localStorage
 */
function createMockStorage() {
    let store = {};
    return {
        getItem: jest.fn((key) => store[key] || null),
        setItem: jest.fn((key, value) => { store[key] = value; }),
        removeItem: jest.fn((key) => { delete store[key]; }),
        clear: jest.fn(() => { store = {}; }),
        get length() { return Object.keys(store).length; },
        key: jest.fn((index) => Object.keys(store)[index] || null),
        _getStore: () => store
    };
}

describe('SettingsManager', () => {
    let settingsManager;
    let mockStorage;
    
    beforeEach(() => {
        mockStorage = createMockStorage();
        settingsManager = new SettingsManager({
            storage: mockStorage,
            storageKey: STORAGE_KEY
        });
    });
    
    afterEach(() => {
        jest.clearAllMocks();
    });
    
    describe('Initialization', () => {
        test('should initialize with default settings', () => {
            const settings = settingsManager.getAllSettings();
            
            expect(settings.display.ghostPieceEnabled).toBe(true);
            expect(settings.display.gridLinesEnabled).toBe(true);
            expect(settings.display.showNextPiece).toBe(true);
            expect(settings.gameplay.speed).toBe(5);
            expect(settings.gameplay.aiEnabled).toBe(false);
            expect(settings.audio.soundEnabled).toBe(false);
            expect(settings.audio.volume).toBe(50);
        });
        
        test('should have correct default key bindings', () => {
            const keyBindings = settingsManager.getKeyBindings();
            
            expect(keyBindings.left).toBe('ArrowLeft');
            expect(keyBindings.right).toBe('ArrowRight');
            expect(keyBindings.down).toBe('ArrowDown');
            expect(keyBindings.drop).toBe('Space');
            expect(keyBindings.rotateCW).toBe('ArrowUp');
            expect(keyBindings.rotateCCW).toBe('KeyZ');
        });
        
        test('should detect storage availability', () => {
            expect(settingsManager.isStorageAvailable()).toBe(true);
        });
        
        test('should handle unavailable storage gracefully', () => {
            const managerWithoutStorage = new SettingsManager({
                storage: null
            });
            
            expect(managerWithoutStorage.isStorageAvailable()).toBe(false);
        });
        
        test('should handle storage that throws errors', () => {
            const brokenStorage = {
                setItem: () => { throw new Error('Storage full'); },
                getItem: () => null,
                removeItem: () => {}
            };
            
            const managerWithBrokenStorage = new SettingsManager({
                storage: brokenStorage
            });
            
            expect(managerWithBrokenStorage.isStorageAvailable()).toBe(false);
        });
    });
    
    describe('Save Settings - Requirements 3.6', () => {
        test('should save settings to storage', () => {
            settingsManager.setGhostPieceEnabled(false);
            
            expect(mockStorage.setItem).toHaveBeenCalledWith(
                STORAGE_KEY,
                expect.any(String)
            );
        });
        
        test('should update lastUpdated timestamp on save', () => {
            const beforeSave = new Date().toISOString();
            settingsManager.saveSettings();
            const afterSave = new Date().toISOString();
            
            const lastUpdated = settingsManager.getLastUpdated();
            expect(lastUpdated >= beforeSave).toBe(true);
            expect(lastUpdated <= afterSave).toBe(true);
        });
        
        test('should return true on successful save', () => {
            const result = settingsManager.saveSettings();
            expect(result).toBe(true);
        });
        
        test('should return false when storage is unavailable', () => {
            const managerWithoutStorage = new SettingsManager({
                storage: null
            });
            
            const result = managerWithoutStorage.saveSettings();
            expect(result).toBe(false);
        });
        
        test('should persist all setting categories', () => {
            settingsManager.setGhostPieceEnabled(false);
            settingsManager.setSpeed(8);
            settingsManager.setSoundEnabled(true);
            settingsManager.setKeyBinding('left', 'KeyA');
            
            const savedJson = mockStorage._getStore()[STORAGE_KEY];
            const savedSettings = JSON.parse(savedJson);
            
            expect(savedSettings.display.ghostPieceEnabled).toBe(false);
            expect(savedSettings.gameplay.speed).toBe(8);
            expect(savedSettings.audio.soundEnabled).toBe(true);
            expect(savedSettings.keyBindings.left).toBe('KeyA');
        });
    });
    
    describe('Load Settings - Requirements 3.7', () => {
        test('should load settings from storage', () => {
            const savedSettings = {
                ...DEFAULT_SETTINGS,
                display: {
                    ...DEFAULT_SETTINGS.display,
                    ghostPieceEnabled: false
                },
                gameplay: {
                    ...DEFAULT_SETTINGS.gameplay,
                    speed: 8
                }
            };
            
            mockStorage.setItem(STORAGE_KEY, JSON.stringify(savedSettings));
            
            const result = settingsManager.loadSettings();
            
            expect(result).toBe(true);
            expect(settingsManager.getGhostPieceEnabled()).toBe(false);
            expect(settingsManager.getSpeed()).toBe(8);
        });
        
        test('should return false when no saved settings exist', () => {
            const result = settingsManager.loadSettings();
            expect(result).toBe(false);
        });
        
        test('should use defaults when saved settings are invalid', () => {
            mockStorage.setItem(STORAGE_KEY, 'invalid json');
            
            const result = settingsManager.loadSettings();
            
            expect(result).toBe(false);
            expect(settingsManager.getGhostPieceEnabled()).toBe(DEFAULT_SETTINGS.display.ghostPieceEnabled);
        });
        
        test('should merge with defaults for missing properties', () => {
            // Simulate old version settings missing some properties
            const partialSettings = {
                version: '0.9.0',
                display: {
                    ghostPieceEnabled: false,
                    gridLinesEnabled: false,
                    showNextPiece: true
                },
                gameplay: {
                    speed: 7,
                    aiEnabled: true
                },
                audio: {
                    soundEnabled: true,
                    volume: 75
                },
                keyBindings: {
                    left: 'KeyA',
                    right: 'KeyD',
                    down: 'KeyS',
                    drop: 'Space',
                    rotateCW: 'KeyW',
                    rotateCCW: 'KeyQ'
                }
            };
            
            mockStorage.setItem(STORAGE_KEY, JSON.stringify(partialSettings));
            
            settingsManager.loadSettings();
            
            // Should have loaded values
            expect(settingsManager.getGhostPieceEnabled()).toBe(false);
            expect(settingsManager.getSpeed()).toBe(7);
            
            // Version should be updated
            expect(settingsManager.getVersion()).toBe(SETTINGS_VERSION);
        });
        
        test('should restore settings on init', () => {
            const savedSettings = {
                ...DEFAULT_SETTINGS,
                gameplay: {
                    ...DEFAULT_SETTINGS.gameplay,
                    speed: 3
                }
            };
            
            mockStorage.setItem(STORAGE_KEY, JSON.stringify(savedSettings));
            
            const newManager = new SettingsManager({
                storage: mockStorage
            });
            newManager.init();
            
            expect(newManager.getSpeed()).toBe(3);
        });
    });
    
    describe('Display Settings', () => {
        test('should get and set ghost piece enabled', () => {
            expect(settingsManager.getGhostPieceEnabled()).toBe(true);
            
            settingsManager.setGhostPieceEnabled(false);
            expect(settingsManager.getGhostPieceEnabled()).toBe(false);
            
            settingsManager.setGhostPieceEnabled(true);
            expect(settingsManager.getGhostPieceEnabled()).toBe(true);
        });
        
        test('should get and set grid lines enabled', () => {
            expect(settingsManager.getGridLinesEnabled()).toBe(true);
            
            settingsManager.setGridLinesEnabled(false);
            expect(settingsManager.getGridLinesEnabled()).toBe(false);
        });
        
        test('should get and set show next piece', () => {
            expect(settingsManager.getShowNextPiece()).toBe(true);
            
            settingsManager.setShowNextPiece(false);
            expect(settingsManager.getShowNextPiece()).toBe(false);
        });
        
        test('should coerce non-boolean values to boolean', () => {
            settingsManager.setGhostPieceEnabled(1);
            expect(settingsManager.getGhostPieceEnabled()).toBe(true);
            
            settingsManager.setGhostPieceEnabled(0);
            expect(settingsManager.getGhostPieceEnabled()).toBe(false);
            
            settingsManager.setGhostPieceEnabled('');
            expect(settingsManager.getGhostPieceEnabled()).toBe(false);
            
            settingsManager.setGhostPieceEnabled('true');
            expect(settingsManager.getGhostPieceEnabled()).toBe(true);
        });
    });
    
    describe('Gameplay Settings', () => {
        test('should get and set speed', () => {
            expect(settingsManager.getSpeed()).toBe(5);
            
            settingsManager.setSpeed(8);
            expect(settingsManager.getSpeed()).toBe(8);
        });
        
        test('should clamp speed to valid range (1-10)', () => {
            settingsManager.setSpeed(0);
            expect(settingsManager.getSpeed()).toBe(1);
            
            settingsManager.setSpeed(-5);
            expect(settingsManager.getSpeed()).toBe(1);
            
            settingsManager.setSpeed(15);
            expect(settingsManager.getSpeed()).toBe(10);
            
            settingsManager.setSpeed(100);
            expect(settingsManager.getSpeed()).toBe(10);
        });
        
        test('should floor decimal speed values', () => {
            settingsManager.setSpeed(5.7);
            expect(settingsManager.getSpeed()).toBe(5);
            
            settingsManager.setSpeed(3.2);
            expect(settingsManager.getSpeed()).toBe(3);
        });
        
        test('should get and set AI enabled', () => {
            expect(settingsManager.getAIEnabled()).toBe(false);
            
            settingsManager.setAIEnabled(true);
            expect(settingsManager.getAIEnabled()).toBe(true);
        });
    });
    
    describe('Audio Settings', () => {
        test('should get and set sound enabled', () => {
            expect(settingsManager.getSoundEnabled()).toBe(false);
            
            settingsManager.setSoundEnabled(true);
            expect(settingsManager.getSoundEnabled()).toBe(true);
        });
        
        test('should get and set volume', () => {
            expect(settingsManager.getVolume()).toBe(50);
            
            settingsManager.setVolume(75);
            expect(settingsManager.getVolume()).toBe(75);
        });
        
        test('should clamp volume to valid range (0-100)', () => {
            settingsManager.setVolume(-10);
            expect(settingsManager.getVolume()).toBe(0);
            
            settingsManager.setVolume(150);
            expect(settingsManager.getVolume()).toBe(100);
        });
        
        test('should floor decimal volume values', () => {
            settingsManager.setVolume(75.8);
            expect(settingsManager.getVolume()).toBe(75);
        });
    });
    
    describe('Key Bindings', () => {
        test('should get all key bindings', () => {
            const keyBindings = settingsManager.getKeyBindings();
            
            expect(keyBindings).toEqual(DEFAULT_SETTINGS.keyBindings);
        });
        
        test('should get individual key binding', () => {
            expect(settingsManager.getKeyBinding('left')).toBe('ArrowLeft');
            expect(settingsManager.getKeyBinding('rotateCCW')).toBe('KeyZ');
        });
        
        test('should return null for invalid action', () => {
            expect(settingsManager.getKeyBinding('invalid')).toBeNull();
        });
        
        test('should set individual key binding', () => {
            const result = settingsManager.setKeyBinding('left', 'KeyA');
            
            expect(result).toBe(true);
            expect(settingsManager.getKeyBinding('left')).toBe('KeyA');
        });
        
        test('should reject invalid action for setKeyBinding', () => {
            const result = settingsManager.setKeyBinding('invalid', 'KeyX');
            expect(result).toBe(false);
        });
        
        test('should reject empty key for setKeyBinding', () => {
            const result = settingsManager.setKeyBinding('left', '');
            expect(result).toBe(false);
            expect(settingsManager.getKeyBinding('left')).toBe('ArrowLeft');
        });
        
        test('should reject non-string key for setKeyBinding', () => {
            const result = settingsManager.setKeyBinding('left', 123);
            expect(result).toBe(false);
        });
        
        test('should set all key bindings', () => {
            const newBindings = {
                left: 'KeyA',
                right: 'KeyD',
                down: 'KeyS',
                drop: 'KeyW',
                rotateCW: 'KeyE',
                rotateCCW: 'KeyQ'
            };
            
            const result = settingsManager.setKeyBindings(newBindings);
            
            expect(result).toBe(true);
            expect(settingsManager.getKeyBindings()).toEqual(newBindings);
        });
        
        test('should reject incomplete key bindings', () => {
            const incompleteBindings = {
                left: 'KeyA',
                right: 'KeyD'
                // Missing other keys
            };
            
            const result = settingsManager.setKeyBindings(incompleteBindings);
            expect(result).toBe(false);
        });
        
        test('should reset key bindings to defaults', () => {
            settingsManager.setKeyBinding('left', 'KeyA');
            settingsManager.resetKeyBindings();
            
            expect(settingsManager.getKeyBinding('left')).toBe('ArrowLeft');
        });
        
        test('getKeyBindings should return a copy, not reference', () => {
            const bindings1 = settingsManager.getKeyBindings();
            bindings1.left = 'Modified';
            
            const bindings2 = settingsManager.getKeyBindings();
            expect(bindings2.left).toBe('ArrowLeft');
        });
    });
    
    describe('Key Bindings Display - Requirements 3.4', () => {
        test('should return key bindings display array', () => {
            const display = settingsManager.getKeyBindingsDisplay();
            
            expect(Array.isArray(display)).toBe(true);
            expect(display.length).toBe(6);
        });
        
        test('should return correct structure for each binding', () => {
            const display = settingsManager.getKeyBindingsDisplay();
            
            for (const binding of display) {
                expect(binding).toHaveProperty('action');
                expect(binding).toHaveProperty('key');
                expect(binding).toHaveProperty('description');
                expect(binding).toHaveProperty('displayKey');
            }
        });
        
        test('should return bindings in correct order', () => {
            const display = settingsManager.getKeyBindingsDisplay();
            const expectedOrder = ['left', 'right', 'down', 'rotateCW', 'rotateCCW', 'drop'];
            
            const actualOrder = display.map(b => b.action);
            expect(actualOrder).toEqual(expectedOrder);
        });
        
        test('should return correct descriptions for default bindings', () => {
            const display = settingsManager.getKeyBindingsDisplay();
            
            const leftBinding = display.find(b => b.action === 'left');
            expect(leftBinding.description).toBe('左移');
            expect(leftBinding.key).toBe('ArrowLeft');
            expect(leftBinding.displayKey).toBe('←');
            
            const dropBinding = display.find(b => b.action === 'drop');
            expect(dropBinding.description).toBe('硬降');
            expect(dropBinding.key).toBe('Space');
            expect(dropBinding.displayKey).toBe('Space');
            
            const rotateCCWBinding = display.find(b => b.action === 'rotateCCW');
            expect(rotateCCWBinding.description).toBe('逆时针旋转');
            expect(rotateCCWBinding.key).toBe('KeyZ');
            expect(rotateCCWBinding.displayKey).toBe('Z');
        });
        
        test('should reflect custom key bindings', () => {
            settingsManager.setKeyBinding('left', 'KeyA');
            settingsManager.setKeyBinding('right', 'KeyD');
            
            const display = settingsManager.getKeyBindingsDisplay();
            
            const leftBinding = display.find(b => b.action === 'left');
            expect(leftBinding.key).toBe('KeyA');
            expect(leftBinding.displayKey).toBe('A');
            
            const rightBinding = display.find(b => b.action === 'right');
            expect(rightBinding.key).toBe('KeyD');
            expect(rightBinding.displayKey).toBe('D');
        });
        
        test('should use key code as display name for unknown keys', () => {
            settingsManager.setKeyBinding('left', 'KeyX');
            
            const display = settingsManager.getKeyBindingsDisplay();
            const leftBinding = display.find(b => b.action === 'left');
            
            expect(leftBinding.key).toBe('KeyX');
            expect(leftBinding.displayKey).toBe('KeyX');
        });
        
        test('should return arrow key display names correctly', () => {
            const display = settingsManager.getKeyBindingsDisplay();
            
            const leftBinding = display.find(b => b.action === 'left');
            expect(leftBinding.displayKey).toBe('←');
            
            const rightBinding = display.find(b => b.action === 'right');
            expect(rightBinding.displayKey).toBe('→');
            
            const downBinding = display.find(b => b.action === 'down');
            expect(downBinding.displayKey).toBe('↓');
            
            const rotateCWBinding = display.find(b => b.action === 'rotateCW');
            expect(rotateCWBinding.displayKey).toBe('↑');
        });
    });
    
    describe('Reset and Clear', () => {
        test('should reset to defaults', () => {
            settingsManager.setGhostPieceEnabled(false);
            settingsManager.setSpeed(10);
            settingsManager.setSoundEnabled(true);
            
            settingsManager.resetToDefaults();
            
            expect(settingsManager.getGhostPieceEnabled()).toBe(true);
            expect(settingsManager.getSpeed()).toBe(5);
            expect(settingsManager.getSoundEnabled()).toBe(false);
        });
        
        test('should clear settings from storage', () => {
            settingsManager.saveSettings();
            
            const result = settingsManager.clearSettings();
            
            expect(result).toBe(true);
            expect(mockStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
        });
        
        test('should reset to defaults after clear', () => {
            settingsManager.setSpeed(10);
            settingsManager.clearSettings();
            
            expect(settingsManager.getSpeed()).toBe(5);
        });
    });
    
    describe('Settings Change Callback', () => {
        test('should call onSettingsChange when setting changes', () => {
            const onSettingsChange = jest.fn();
            settingsManager.onSettingsChange = onSettingsChange;
            
            settingsManager.setGhostPieceEnabled(false);
            
            expect(onSettingsChange).toHaveBeenCalledWith(
                expect.objectContaining({
                    display: expect.objectContaining({
                        ghostPieceEnabled: false
                    })
                })
            );
        });
        
        test('should call onSettingsChange for each setting type', () => {
            const onSettingsChange = jest.fn();
            settingsManager.onSettingsChange = onSettingsChange;
            
            settingsManager.setSpeed(8);
            expect(onSettingsChange).toHaveBeenCalled();
            
            onSettingsChange.mockClear();
            settingsManager.setSoundEnabled(true);
            expect(onSettingsChange).toHaveBeenCalled();
            
            onSettingsChange.mockClear();
            settingsManager.setKeyBinding('left', 'KeyA');
            expect(onSettingsChange).toHaveBeenCalled();
        });
    });
    
    describe('Export and Import', () => {
        test('should export settings as JSON string', () => {
            settingsManager.setSpeed(8);
            
            const exported = settingsManager.exportSettings();
            const parsed = JSON.parse(exported);
            
            expect(parsed.gameplay.speed).toBe(8);
        });
        
        test('should import settings from JSON string', () => {
            const settingsToImport = {
                ...DEFAULT_SETTINGS,
                gameplay: {
                    ...DEFAULT_SETTINGS.gameplay,
                    speed: 9
                }
            };
            
            const result = settingsManager.importSettings(JSON.stringify(settingsToImport));
            
            expect(result).toBe(true);
            expect(settingsManager.getSpeed()).toBe(9);
        });
        
        test('should reject invalid JSON on import', () => {
            const result = settingsManager.importSettings('invalid json');
            expect(result).toBe(false);
        });
        
        test('should reject invalid settings on import', () => {
            const invalidSettings = {
                display: {
                    ghostPieceEnabled: 'not a boolean'
                }
            };
            
            const result = settingsManager.importSettings(JSON.stringify(invalidSettings));
            expect(result).toBe(false);
        });
    });
    
    describe('Set All Settings', () => {
        test('should set all settings at once', () => {
            const newSettings = {
                ...DEFAULT_SETTINGS,
                display: {
                    ghostPieceEnabled: false,
                    gridLinesEnabled: false,
                    showNextPiece: false
                },
                gameplay: {
                    speed: 10,
                    aiEnabled: true
                }
            };
            
            const result = settingsManager.setAllSettings(newSettings);
            
            expect(result).toBe(true);
            expect(settingsManager.getGhostPieceEnabled()).toBe(false);
            expect(settingsManager.getGridLinesEnabled()).toBe(false);
            expect(settingsManager.getSpeed()).toBe(10);
            expect(settingsManager.getAIEnabled()).toBe(true);
        });
        
        test('should reject invalid settings object', () => {
            const result = settingsManager.setAllSettings(null);
            expect(result).toBe(false);
        });
        
        test('should reject settings with invalid speed', () => {
            const invalidSettings = {
                ...DEFAULT_SETTINGS,
                gameplay: {
                    speed: 15, // Out of range
                    aiEnabled: false
                }
            };
            
            const result = settingsManager.setAllSettings(invalidSettings);
            expect(result).toBe(false);
        });
        
        test('should reject settings with invalid volume', () => {
            const invalidSettings = {
                ...DEFAULT_SETTINGS,
                audio: {
                    soundEnabled: false,
                    volume: 150 // Out of range
                }
            };
            
            const result = settingsManager.setAllSettings(invalidSettings);
            expect(result).toBe(false);
        });
    });
    
    describe('Get All Settings', () => {
        test('should return a deep copy of settings', () => {
            const settings1 = settingsManager.getAllSettings();
            settings1.display.ghostPieceEnabled = false;
            
            const settings2 = settingsManager.getAllSettings();
            expect(settings2.display.ghostPieceEnabled).toBe(true);
        });
    });
    
    describe('Version and Metadata', () => {
        test('should return correct version', () => {
            expect(settingsManager.getVersion()).toBe(SETTINGS_VERSION);
        });
        
        test('should return lastUpdated after save', () => {
            expect(settingsManager.getLastUpdated()).toBe('');
            
            settingsManager.saveSettings();
            
            expect(settingsManager.getLastUpdated()).not.toBe('');
        });
    });
    
    describe('Validation', () => {
        test('should reject settings with missing display section', () => {
            const invalidSettings = {
                gameplay: DEFAULT_SETTINGS.gameplay,
                audio: DEFAULT_SETTINGS.audio,
                keyBindings: DEFAULT_SETTINGS.keyBindings
            };
            
            mockStorage.setItem(STORAGE_KEY, JSON.stringify(invalidSettings));
            
            const result = settingsManager.loadSettings();
            expect(result).toBe(false);
        });
        
        test('should reject settings with wrong type for boolean', () => {
            const invalidSettings = {
                ...DEFAULT_SETTINGS,
                display: {
                    ghostPieceEnabled: 'true', // Should be boolean
                    gridLinesEnabled: true,
                    showNextPiece: true
                }
            };
            
            mockStorage.setItem(STORAGE_KEY, JSON.stringify(invalidSettings));
            
            const result = settingsManager.loadSettings();
            expect(result).toBe(false);
        });
        
        test('should reject settings with missing key bindings', () => {
            const invalidSettings = {
                ...DEFAULT_SETTINGS,
                keyBindings: {
                    left: 'ArrowLeft',
                    right: 'ArrowRight'
                    // Missing other keys
                }
            };
            
            mockStorage.setItem(STORAGE_KEY, JSON.stringify(invalidSettings));
            
            const result = settingsManager.loadSettings();
            expect(result).toBe(false);
        });
    });
});
