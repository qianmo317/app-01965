/**
 * @module ui/settings-manager
 * @description SettingsManager - 游戏设置管理器模块
 * 
 * 本模块负责管理游戏设置的持久化存储和读取，使用 Local Storage 保存用户偏好设置。
 * 
 * ## 功能特性
 * 
 * - **显示设置**: Ghost Piece、网格线、下一个方块预览
 * - **游戏设置**: 速度级别、AI模式
 * - **音频设置**: 音效开关、音量（预留功能）
 * - **按键绑定**: 自定义控制按键
 * 
 * ## 数据持久化
 * 
 * 设置数据以 JSON 格式存储在 Local Storage 中：
 * - 键名: 'tetris-game-settings'
 * - 包含版本号用于处理格式升级
 * - 自动验证加载的数据有效性
 * 
 * ## 错误处理
 * 
 * - Local Storage 不可用时使用内存存储
 * - 数据格式无效时重置为默认值
 * - 部分设置缺失时使用默认值填充
 * 
 * ## 实现的需求
 * - Requirements 3.6: THE Settings_Panel SHALL persist user preferences to local storage
 * - Requirements 3.7: WHEN the game loads, THE Settings_Panel SHALL restore previously saved preferences
 * - Requirements 3.4: THE Settings_Panel SHALL provide a key bindings display showing current control mappings
 * 
 * @example
 * import { SettingsManager } from './settings-manager.js';
 * 
 * const settings = new SettingsManager({
 *     onSettingsChange: (newSettings) => {
 *         console.log('设置已更新:', newSettings);
 *     }
 * });
 * 
 * // 初始化（加载保存的设置）
 * settings.init();
 * 
 * // 获取和设置
 * console.log(settings.getGhostPieceEnabled()); // true
 * settings.setSpeed(8);
 * 
 * // 获取按键绑定显示
 * const bindings = settings.getKeyBindingsDisplay();
 */

/**
 * Local Storage 键名
 * @constant {string}
 */
const STORAGE_KEY = 'tetris-game-settings';

/**
 * 设置版本号
 * 用于处理设置格式升级
 * @constant {string}
 */
const SETTINGS_VERSION = '1.0.0';

/**
 * 默认设置
 * 当没有保存的设置或设置无效时使用
 * @constant {Object}
 */
const DEFAULT_SETTINGS = {
    version: SETTINGS_VERSION,
    lastUpdated: '',
    
    // 显示设置
    display: {
        ghostPieceEnabled: true,
        gridLinesEnabled: true,
        showNextPiece: true
    },
    
    // 游戏设置
    gameplay: {
        speed: 5,
        aiEnabled: false
    },
    
    // 音频设置（预留）
    audio: {
        soundEnabled: false,
        volume: 50
    },
    
    // 按键绑定
    keyBindings: {
        left: 'ArrowLeft',
        right: 'ArrowRight',
        down: 'ArrowDown',
        drop: 'Space',
        rotateCW: 'ArrowUp',
        rotateCCW: 'KeyZ'
    }
};

/**
 * SettingsManager 类
 * 游戏设置管理器，负责设置的存储、读取和管理
 */
class SettingsManager {
    /**
     * 创建设置管理器
     * @param {Object} options - 配置选项
     * @param {Storage} options.storage - 存储对象（默认为 localStorage）
     * @param {string} options.storageKey - 存储键名
     * @param {Function} options.onSettingsChange - 设置变化回调
     */
    constructor(options = {}) {
        // 如果显式传入 storage（包括 null），使用传入的值；否则使用 localStorage
        if (Object.prototype.hasOwnProperty.call(options, 'storage')) {
            this.storage = options.storage;
        } else {
            this.storage = typeof localStorage !== 'undefined' ? localStorage : null;
        }
        this.storageKey = options.storageKey || STORAGE_KEY;
        this.onSettingsChange = options.onSettingsChange || (() => {});
        
        // 当前设置（深拷贝默认设置）
        this.settings = this._deepClone(DEFAULT_SETTINGS);
        
        // 存储是否可用
        this.storageAvailable = this._checkStorageAvailable();
    }
    
    /**
     * 初始化设置管理器
     * 从 Local Storage 加载保存的设置
     * 
     * Requirements: 3.7
     */
    init() {
        this.loadSettings();
    }
    
    /**
     * 检查存储是否可用
     * @returns {boolean} - 存储是否可用
     * @private
     */
    _checkStorageAvailable() {
        if (!this.storage) {
            return false;
        }
        
        try {
            const testKey = '__storage_test__';
            this.storage.setItem(testKey, 'test');
            this.storage.removeItem(testKey);
            return true;
        } catch (e) {
            return false;
        }
    }
    
    /**
     * 深拷贝对象
     * @param {Object} obj - 要拷贝的对象
     * @returns {Object} - 拷贝后的对象
     * @private
     */
    _deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }
    
    /**
     * 合并设置对象
     * 将源对象的值合并到目标对象，保留目标对象中源对象没有的属性
     * @param {Object} target - 目标对象
     * @param {Object} source - 源对象
     * @returns {Object} - 合并后的对象
     * @private
     */
    _mergeSettings(target, source) {
        const result = this._deepClone(target);
        
        for (const key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    if (typeof result[key] === 'object' && result[key] !== null) {
                        result[key] = this._mergeSettings(result[key], source[key]);
                    } else {
                        result[key] = this._deepClone(source[key]);
                    }
                } else {
                    result[key] = source[key];
                }
            }
        }
        
        return result;
    }
    
    /**
     * 验证设置对象
     * 检查设置对象是否有效
     * @param {Object} settings - 要验证的设置对象
     * @returns {boolean} - 设置是否有效
     * @private
     */
    _validateSettings(settings) {
        if (!settings || typeof settings !== 'object') {
            return false;
        }
        
        // 检查必需的顶级属性
        if (!settings.display || !settings.gameplay || !settings.audio || !settings.keyBindings) {
            return false;
        }
        
        // 验证显示设置
        if (typeof settings.display.ghostPieceEnabled !== 'boolean' ||
            typeof settings.display.gridLinesEnabled !== 'boolean' ||
            typeof settings.display.showNextPiece !== 'boolean') {
            return false;
        }
        
        // 验证游戏设置
        if (typeof settings.gameplay.speed !== 'number' ||
            settings.gameplay.speed < 1 || settings.gameplay.speed > 10 ||
            typeof settings.gameplay.aiEnabled !== 'boolean') {
            return false;
        }
        
        // 验证音频设置
        if (typeof settings.audio.soundEnabled !== 'boolean' ||
            typeof settings.audio.volume !== 'number' ||
            settings.audio.volume < 0 || settings.audio.volume > 100) {
            return false;
        }
        
        // 验证按键绑定
        const requiredKeys = ['left', 'right', 'down', 'drop', 'rotateCW', 'rotateCCW'];
        for (const key of requiredKeys) {
            if (typeof settings.keyBindings[key] !== 'string') {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * 保存设置到 Local Storage
     * 
     * Requirements: 3.6
     * @returns {boolean} - 是否保存成功
     */
    saveSettings() {
        if (!this.storageAvailable) {
            return false;
        }
        
        try {
            // 更新最后更新时间
            this.settings.lastUpdated = new Date().toISOString();
            
            const settingsJson = JSON.stringify(this.settings);
            this.storage.setItem(this.storageKey, settingsJson);
            return true;
        } catch (e) {
            console.error('Failed to save settings:', e);
            return false;
        }
    }
    
    /**
     * 从 Local Storage 加载设置
     * 
     * Requirements: 3.7
     * @returns {boolean} - 是否加载成功
     */
    loadSettings() {
        if (!this.storageAvailable) {
            return false;
        }
        
        try {
            const settingsJson = this.storage.getItem(this.storageKey);
            
            if (!settingsJson) {
                // 没有保存的设置，使用默认值
                return false;
            }
            
            const loadedSettings = JSON.parse(settingsJson);
            
            // 验证加载的设置
            if (!this._validateSettings(loadedSettings)) {
                // 设置无效，重置为默认值
                console.warn('Invalid settings found, using defaults');
                this.resetToDefaults();
                return false;
            }
            
            // 合并设置（处理版本升级时新增的设置项）
            this.settings = this._mergeSettings(DEFAULT_SETTINGS, loadedSettings);
            this.settings.version = SETTINGS_VERSION;
            
            return true;
        } catch (e) {
            console.error('Failed to load settings:', e);
            this.resetToDefaults();
            return false;
        }
    }
    
    /**
     * 重置为默认设置
     */
    resetToDefaults() {
        this.settings = this._deepClone(DEFAULT_SETTINGS);
        this.saveSettings();
    }
    
    /**
     * 清除保存的设置
     * @returns {boolean} - 是否清除成功
     */
    clearSettings() {
        if (!this.storageAvailable) {
            return false;
        }
        
        try {
            this.storage.removeItem(this.storageKey);
            this.settings = this._deepClone(DEFAULT_SETTINGS);
            return true;
        } catch (e) {
            console.error('Failed to clear settings:', e);
            return false;
        }
    }
    
    /**
     * 获取所有设置
     * @returns {Object} - 当前设置的深拷贝
     */
    getAllSettings() {
        return this._deepClone(this.settings);
    }
    
    /**
     * 设置所有设置
     * @param {Object} newSettings - 新的设置对象
     * @returns {boolean} - 是否设置成功
     */
    setAllSettings(newSettings) {
        if (!this._validateSettings(newSettings)) {
            return false;
        }
        
        this.settings = this._mergeSettings(DEFAULT_SETTINGS, newSettings);
        this.settings.version = SETTINGS_VERSION;
        this.saveSettings();
        this.onSettingsChange(this.settings);
        return true;
    }
    
    // ==================== 显示设置 ====================
    
    /**
     * 获取 Ghost Piece 是否启用
     * @returns {boolean} - Ghost Piece 是否启用
     */
    getGhostPieceEnabled() {
        return this.settings.display.ghostPieceEnabled;
    }
    
    /**
     * 设置 Ghost Piece 是否启用
     * @param {boolean} enabled - 是否启用
     */
    setGhostPieceEnabled(enabled) {
        this.settings.display.ghostPieceEnabled = Boolean(enabled);
        this.saveSettings();
        this.onSettingsChange(this.settings);
    }
    
    /**
     * 获取网格线是否启用
     * @returns {boolean} - 网格线是否启用
     */
    getGridLinesEnabled() {
        return this.settings.display.gridLinesEnabled;
    }
    
    /**
     * 设置网格线是否启用
     * @param {boolean} enabled - 是否启用
     */
    setGridLinesEnabled(enabled) {
        this.settings.display.gridLinesEnabled = Boolean(enabled);
        this.saveSettings();
        this.onSettingsChange(this.settings);
    }
    
    /**
     * 获取是否显示下一个方块
     * @returns {boolean} - 是否显示下一个方块
     */
    getShowNextPiece() {
        return this.settings.display.showNextPiece;
    }
    
    /**
     * 设置是否显示下一个方块
     * @param {boolean} enabled - 是否显示
     */
    setShowNextPiece(enabled) {
        this.settings.display.showNextPiece = Boolean(enabled);
        this.saveSettings();
        this.onSettingsChange(this.settings);
    }
    
    // ==================== 游戏设置 ====================
    
    /**
     * 获取游戏速度
     * @returns {number} - 速度级别 (1-10)
     */
    getSpeed() {
        return this.settings.gameplay.speed;
    }
    
    /**
     * 设置游戏速度
     * @param {number} speed - 速度级别 (1-10)
     */
    setSpeed(speed) {
        // 钳制到有效范围
        const clampedSpeed = Math.max(1, Math.min(10, Math.floor(speed)));
        this.settings.gameplay.speed = clampedSpeed;
        this.saveSettings();
        this.onSettingsChange(this.settings);
    }
    
    /**
     * 获取 AI 是否启用
     * @returns {boolean} - AI 是否启用
     */
    getAIEnabled() {
        return this.settings.gameplay.aiEnabled;
    }
    
    /**
     * 设置 AI 是否启用
     * @param {boolean} enabled - 是否启用
     */
    setAIEnabled(enabled) {
        this.settings.gameplay.aiEnabled = Boolean(enabled);
        this.saveSettings();
        this.onSettingsChange(this.settings);
    }
    
    // ==================== 音频设置 ====================
    
    /**
     * 获取音效是否启用
     * @returns {boolean} - 音效是否启用
     */
    getSoundEnabled() {
        return this.settings.audio.soundEnabled;
    }
    
    /**
     * 设置音效是否启用
     * @param {boolean} enabled - 是否启用
     */
    setSoundEnabled(enabled) {
        this.settings.audio.soundEnabled = Boolean(enabled);
        this.saveSettings();
        this.onSettingsChange(this.settings);
    }
    
    /**
     * 获取音量
     * @returns {number} - 音量 (0-100)
     */
    getVolume() {
        return this.settings.audio.volume;
    }
    
    /**
     * 设置音量
     * @param {number} volume - 音量 (0-100)
     */
    setVolume(volume) {
        // 钳制到有效范围
        const clampedVolume = Math.max(0, Math.min(100, Math.floor(volume)));
        this.settings.audio.volume = clampedVolume;
        this.saveSettings();
        this.onSettingsChange(this.settings);
    }
    
    // ==================== 按键绑定 ====================
    
    /**
     * 获取所有按键绑定
     * @returns {Object} - 按键绑定对象的深拷贝
     */
    getKeyBindings() {
        return this._deepClone(this.settings.keyBindings);
    }
    
    /**
     * 获取指定动作的按键绑定
     * @param {string} action - 动作名称 (left, right, down, drop, rotateCW, rotateCCW)
     * @returns {string|null} - 按键名称，如果动作不存在则返回 null
     */
    getKeyBinding(action) {
        if (Object.prototype.hasOwnProperty.call(this.settings.keyBindings, action)) {
            return this.settings.keyBindings[action];
        }
        return null;
    }
    
    /**
     * 设置指定动作的按键绑定
     * @param {string} action - 动作名称
     * @param {string} key - 按键名称
     * @returns {boolean} - 是否设置成功
     */
    setKeyBinding(action, key) {
        if (!Object.prototype.hasOwnProperty.call(this.settings.keyBindings, action)) {
            return false;
        }
        
        if (typeof key !== 'string' || key.length === 0) {
            return false;
        }
        
        this.settings.keyBindings[action] = key;
        this.saveSettings();
        this.onSettingsChange(this.settings);
        return true;
    }
    
    /**
     * 设置所有按键绑定
     * @param {Object} keyBindings - 按键绑定对象
     * @returns {boolean} - 是否设置成功
     */
    setKeyBindings(keyBindings) {
        const requiredKeys = ['left', 'right', 'down', 'drop', 'rotateCW', 'rotateCCW'];
        
        // 验证所有必需的按键都存在
        for (const key of requiredKeys) {
            if (typeof keyBindings[key] !== 'string' || keyBindings[key].length === 0) {
                return false;
            }
        }
        
        this.settings.keyBindings = this._deepClone(keyBindings);
        this.saveSettings();
        this.onSettingsChange(this.settings);
        return true;
    }
    
    /**
     * 重置按键绑定为默认值
     */
    resetKeyBindings() {
        this.settings.keyBindings = this._deepClone(DEFAULT_SETTINGS.keyBindings);
        this.saveSettings();
        this.onSettingsChange(this.settings);
    }
    
    /**
     * 获取按键绑定显示信息
     * 返回用于UI显示的按键绑定列表
     * 
     * Requirements: 3.4
     * - THE Settings_Panel SHALL provide a key bindings display showing current control mappings
     * 
     * @returns {Array<{action: string, key: string, description: string, displayKey: string}>} - 按键绑定显示列表
     */
    getKeyBindingsDisplay() {
        const keyBindings = this.settings.keyBindings;
        
        // 动作描述映射
        const actionDescriptions = {
            left: '左移',
            right: '右移',
            down: '软降',
            drop: '硬降',
            rotateCW: '顺时针旋转',
            rotateCCW: '逆时针旋转'
        };
        
        // 按键显示名称映射（将键码转换为用户友好的显示名称）
        const keyDisplayNames = {
            'ArrowLeft': '←',
            'ArrowRight': '→',
            'ArrowUp': '↑',
            'ArrowDown': '↓',
            'Space': 'Space',
            'KeyZ': 'Z',
            'KeyA': 'A',
            'KeyD': 'D',
            'KeyS': 'S',
            'KeyW': 'W',
            'KeyQ': 'Q',
            'KeyE': 'E'
        };
        
        // 按照固定顺序返回按键绑定
        const actionOrder = ['left', 'right', 'down', 'rotateCW', 'rotateCCW', 'drop'];
        
        return actionOrder.map(action => {
            const key = keyBindings[action];
            return {
                action: action,
                key: key,
                description: actionDescriptions[action] || action,
                displayKey: keyDisplayNames[key] || key
            };
        });
    }
    
    // ==================== 工具方法 ====================
    
    /**
     * 检查存储是否可用
     * @returns {boolean} - 存储是否可用
     */
    isStorageAvailable() {
        return this.storageAvailable;
    }
    
    /**
     * 获取设置版本
     * @returns {string} - 设置版本号
     */
    getVersion() {
        return this.settings.version;
    }
    
    /**
     * 获取最后更新时间
     * @returns {string} - ISO 格式的时间字符串
     */
    getLastUpdated() {
        return this.settings.lastUpdated;
    }
    
    /**
     * 导出设置为 JSON 字符串
     * @returns {string} - JSON 格式的设置
     */
    exportSettings() {
        return JSON.stringify(this.settings, null, 2);
    }
    
    /**
     * 从 JSON 字符串导入设置
     * @param {string} jsonString - JSON 格式的设置
     * @returns {boolean} - 是否导入成功
     */
    importSettings(jsonString) {
        try {
            const importedSettings = JSON.parse(jsonString);
            return this.setAllSettings(importedSettings);
        } catch (e) {
            console.error('Failed to import settings:', e);
            return false;
        }
    }
}

// 导出模块
export { SettingsManager, DEFAULT_SETTINGS, STORAGE_KEY, SETTINGS_VERSION };
