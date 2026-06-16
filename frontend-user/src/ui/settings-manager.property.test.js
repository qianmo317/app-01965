/**
 * SettingsManager 属性测试
 * 
 * 游戏设置管理的属性测试
 * 使用 fast-check 进行属性测试
 * 
 * @jest-environment jsdom
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import * as fc from 'fast-check';
import { SettingsManager, STORAGE_KEY } from './settings-manager.js';

/**
 * 创建模拟 localStorage 的存储对象
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

describe('SettingsManager 属性测试', () => {
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
    
    /**
     * 属性 7：设置即时应用
     * 
     * 对于任何设置更改（幽灵方块、网格线、声音），更改应在同一帧或下一个
     * 渲染周期内反映在游戏的行为/渲染中，无需重启游戏。
     * 
     * **验证：需求 3.5**
     */
    describe('属性 7：设置即时应用', () => {
        test('幽灵方块设置更改立即生效', () => {
            fc.assert(
                fc.property(
                    fc.boolean(),
                    (enabled) => {
                        settingsManager.setGhostPieceEnabled(enabled);
                        // 设置应立即生效
                        expect(settingsManager.getGhostPieceEnabled()).toBe(enabled);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        test('网格线设置更改立即生效', () => {
            fc.assert(
                fc.property(
                    fc.boolean(),
                    (enabled) => {
                        settingsManager.setGridLinesEnabled(enabled);
                        // 设置应立即生效
                        expect(settingsManager.getGridLinesEnabled()).toBe(enabled);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        test('声音设置更改立即生效', () => {
            fc.assert(
                fc.property(
                    fc.boolean(),
                    (enabled) => {
                        settingsManager.setSoundEnabled(enabled);
                        // 设置应立即生效
                        expect(settingsManager.getSoundEnabled()).toBe(enabled);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        test('速度设置更改立即生效', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 10 }),
                    (speed) => {
                        settingsManager.setSpeed(speed);
                        // 设置应立即生效
                        expect(settingsManager.getSpeed()).toBe(speed);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        test('音量设置更改立即生效', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 100 }),
                    (volume) => {
                        settingsManager.setVolume(volume);
                        // 设置应立即生效
                        expect(settingsManager.getVolume()).toBe(volume);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        test('AI 启用设置更改立即生效', () => {
            fc.assert(
                fc.property(
                    fc.boolean(),
                    (enabled) => {
                        settingsManager.setAIEnabled(enabled);
                        // 设置应立即生效
                        expect(settingsManager.getAIEnabled()).toBe(enabled);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        test('显示下一个方块设置更改立即生效', () => {
            fc.assert(
                fc.property(
                    fc.boolean(),
                    (enabled) => {
                        settingsManager.setShowNextPiece(enabled);
                        // 设置应立即生效
                        expect(settingsManager.getShowNextPiece()).toBe(enabled);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        test('任何设置更改时 onSettingsChange 回调立即被调用', () => {
            const onSettingsChange = jest.fn();
            settingsManager.onSettingsChange = onSettingsChange;
            
            fc.assert(
                fc.property(
                    fc.boolean(),
                    fc.boolean(),
                    fc.boolean(),
                    fc.integer({ min: 1, max: 10 }),
                    (ghostPiece, gridLines, sound, speed) => {
                        onSettingsChange.mockClear();
                        
                        settingsManager.setGhostPieceEnabled(ghostPiece);
                        expect(onSettingsChange).toHaveBeenCalledTimes(1);
                        
                        onSettingsChange.mockClear();
                        settingsManager.setGridLinesEnabled(gridLines);
                        expect(onSettingsChange).toHaveBeenCalledTimes(1);
                        
                        onSettingsChange.mockClear();
                        settingsManager.setSoundEnabled(sound);
                        expect(onSettingsChange).toHaveBeenCalledTimes(1);
                        
                        onSettingsChange.mockClear();
                        settingsManager.setSpeed(speed);
                        expect(onSettingsChange).toHaveBeenCalledTimes(1);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
    
    /**
     * 属性 8：设置持久化往返
     * 
     * 对于任何有效的设置配置，保存到本地存储然后加载应产生具有所有属性
     * 相同值的等效设置对象。
     * 
     * **验证：需求 3.6, 3.7**
     */
    describe('属性 8：设置持久化往返', () => {
        test('显示设置往返保留所有值', () => {
            fc.assert(
                fc.property(
                    fc.boolean(),
                    fc.boolean(),
                    fc.boolean(),
                    (ghostPiece, gridLines, showNextPiece) => {
                        // 设置值
                        settingsManager.setGhostPieceEnabled(ghostPiece);
                        settingsManager.setGridLinesEnabled(gridLines);
                        settingsManager.setShowNextPiece(showNextPiece);
                        
                        // 保存设置
                        settingsManager.saveSettings();
                        
                        // 创建新管理器并加载设置
                        const newManager = new SettingsManager({
                            storage: mockStorage,
                            storageKey: STORAGE_KEY
                        });
                        newManager.loadSettings();
                        
                        // 验证往返
                        expect(newManager.getGhostPieceEnabled()).toBe(ghostPiece);
                        expect(newManager.getGridLinesEnabled()).toBe(gridLines);
                        expect(newManager.getShowNextPiece()).toBe(showNextPiece);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        test('游戏设置往返保留所有值', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 10 }),
                    fc.boolean(),
                    (speed, aiEnabled) => {
                        // 设置值
                        settingsManager.setSpeed(speed);
                        settingsManager.setAIEnabled(aiEnabled);
                        
                        // 保存设置
                        settingsManager.saveSettings();
                        
                        // 创建新管理器并加载设置
                        const newManager = new SettingsManager({
                            storage: mockStorage,
                            storageKey: STORAGE_KEY
                        });
                        newManager.loadSettings();
                        
                        // 验证往返
                        expect(newManager.getSpeed()).toBe(speed);
                        expect(newManager.getAIEnabled()).toBe(aiEnabled);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        test('音频设置往返保留所有值', () => {
            fc.assert(
                fc.property(
                    fc.boolean(),
                    fc.integer({ min: 0, max: 100 }),
                    (soundEnabled, volume) => {
                        // 设置值
                        settingsManager.setSoundEnabled(soundEnabled);
                        settingsManager.setVolume(volume);
                        
                        // 保存设置
                        settingsManager.saveSettings();
                        
                        // 创建新管理器并加载设置
                        const newManager = new SettingsManager({
                            storage: mockStorage,
                            storageKey: STORAGE_KEY
                        });
                        newManager.loadSettings();
                        
                        // 验证往返
                        expect(newManager.getSoundEnabled()).toBe(soundEnabled);
                        expect(newManager.getVolume()).toBe(volume);
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('完整设置往返保留所有值', () => {
            fc.assert(
                fc.property(
                    fc.boolean(),
                    fc.boolean(),
                    fc.boolean(),
                    fc.integer({ min: 1, max: 10 }),
                    fc.boolean(),
                    fc.boolean(),
                    fc.integer({ min: 0, max: 100 }),
                    (ghostPiece, gridLines, showNextPiece, speed, aiEnabled, soundEnabled, volume) => {
                        // 设置所有值
                        settingsManager.setGhostPieceEnabled(ghostPiece);
                        settingsManager.setGridLinesEnabled(gridLines);
                        settingsManager.setShowNextPiece(showNextPiece);
                        settingsManager.setSpeed(speed);
                        settingsManager.setAIEnabled(aiEnabled);
                        settingsManager.setSoundEnabled(soundEnabled);
                        settingsManager.setVolume(volume);
                        
                        // 保存设置
                        settingsManager.saveSettings();
                        
                        // 创建新管理器并加载设置
                        const newManager = new SettingsManager({
                            storage: mockStorage,
                            storageKey: STORAGE_KEY
                        });
                        newManager.loadSettings();
                        
                        // 验证完整往返
                        expect(newManager.getGhostPieceEnabled()).toBe(ghostPiece);
                        expect(newManager.getGridLinesEnabled()).toBe(gridLines);
                        expect(newManager.getShowNextPiece()).toBe(showNextPiece);
                        expect(newManager.getSpeed()).toBe(speed);
                        expect(newManager.getAIEnabled()).toBe(aiEnabled);
                        expect(newManager.getSoundEnabled()).toBe(soundEnabled);
                        expect(newManager.getVolume()).toBe(volume);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        test('按键绑定往返保留所有值', () => {
            const validKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 
                              'KeyA', 'KeyD', 'KeyS', 'KeyW', 'KeyQ', 'KeyE', 'KeyZ'];
            
            fc.assert(
                fc.property(
                    fc.constantFrom(...validKeys),
                    fc.constantFrom(...validKeys),
                    fc.constantFrom(...validKeys),
                    fc.constantFrom(...validKeys),
                    fc.constantFrom(...validKeys),
                    fc.constantFrom(...validKeys),
                    (left, right, down, drop, rotateCW, rotateCCW) => {
                        const keyBindings = { left, right, down, drop, rotateCW, rotateCCW };
                        
                        // 设置按键绑定
                        settingsManager.setKeyBindings(keyBindings);
                        
                        // 保存设置
                        settingsManager.saveSettings();
                        
                        // 创建新管理器并加载设置
                        const newManager = new SettingsManager({
                            storage: mockStorage,
                            storageKey: STORAGE_KEY
                        });
                        newManager.loadSettings();
                        
                        // 验证往返
                        const loadedBindings = newManager.getKeyBindings();
                        expect(loadedBindings.left).toBe(left);
                        expect(loadedBindings.right).toBe(right);
                        expect(loadedBindings.down).toBe(down);
                        expect(loadedBindings.drop).toBe(drop);
                        expect(loadedBindings.rotateCW).toBe(rotateCW);
                        expect(loadedBindings.rotateCCW).toBe(rotateCCW);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        test('导出/导入往返保留所有值', () => {
            fc.assert(
                fc.property(
                    fc.boolean(),
                    fc.boolean(),
                    fc.integer({ min: 1, max: 10 }),
                    fc.boolean(),
                    fc.integer({ min: 0, max: 100 }),
                    (ghostPiece, gridLines, speed, soundEnabled, volume) => {
                        // 设置值
                        settingsManager.setGhostPieceEnabled(ghostPiece);
                        settingsManager.setGridLinesEnabled(gridLines);
                        settingsManager.setSpeed(speed);
                        settingsManager.setSoundEnabled(soundEnabled);
                        settingsManager.setVolume(volume);
                        
                        // 导出设置
                        const exported = settingsManager.exportSettings();
                        
                        // 创建新管理器并导入设置
                        const newManager = new SettingsManager({
                            storage: mockStorage,
                            storageKey: STORAGE_KEY + '_import'
                        });
                        newManager.importSettings(exported);
                        
                        // 验证往返
                        expect(newManager.getGhostPieceEnabled()).toBe(ghostPiece);
                        expect(newManager.getGridLinesEnabled()).toBe(gridLines);
                        expect(newManager.getSpeed()).toBe(speed);
                        expect(newManager.getSoundEnabled()).toBe(soundEnabled);
                        expect(newManager.getVolume()).toBe(volume);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});
