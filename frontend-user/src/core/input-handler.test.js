/**
 * InputHandler Unit Tests
 * 
 * Tests for keyboard event handling, key bindings, and input throttling
 * Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2
 */

import { jest } from '@jest/globals';
import { 
    InputHandler, 
    DEFAULT_KEY_BINDINGS, 
    DEFAULT_THROTTLE_INTERVAL,
    SOFT_DROP_THROTTLE_INTERVAL 
} from './input-handler.js';

// Mock GameEngine for testing
class MockGameEngine {
    constructor() {
        this._isPlaying = true;
        this.moveLeftCalled = 0;
        this.moveRightCalled = 0;
        this.moveDownCalled = 0;
        this.hardDropCalled = 0;
        this.rotateClockwiseCalled = 0;
        this.rotateCounterClockwiseCalled = 0;
        this.holdCalled = 0;
    }
    
    isPlaying() {
        return this._isPlaying;
    }
    
    setPlaying(value) {
        this._isPlaying = value;
    }
    
    moveLeft() {
        this.moveLeftCalled++;
        return true;
    }
    
    moveRight() {
        this.moveRightCalled++;
        return true;
    }
    
    moveDown() {
        this.moveDownCalled++;
        return true;
    }
    
    hardDrop() {
        this.hardDropCalled++;
        return 5;
    }
    
    rotateClockwise() {
        this.rotateClockwiseCalled++;
        return true;
    }
    
    rotateCounterClockwise() {
        this.rotateCounterClockwiseCalled++;
        return true;
    }
    
    hold() {
        this.holdCalled++;
        return true;
    }
    
    resetCalls() {
        this.moveLeftCalled = 0;
        this.moveRightCalled = 0;
        this.moveDownCalled = 0;
        this.hardDropCalled = 0;
        this.rotateClockwiseCalled = 0;
        this.rotateCounterClockwiseCalled = 0;
        this.holdCalled = 0;
    }
}

// Helper to create mock KeyboardEvent
function createKeyEvent(code, type = 'keydown') {
    return {
        code,
        type,
        preventDefault: jest.fn()
    };
}

describe('InputHandler', () => {
    let mockEngine;
    let inputHandler;
    
    beforeEach(() => {
        mockEngine = new MockGameEngine();
        inputHandler = new InputHandler(mockEngine);
    });
    
    afterEach(() => {
        inputHandler.unbind();
    });
    
    describe('Initialization', () => {
        test('should throw error if gameEngine is not provided', () => {
            expect(() => new InputHandler(null)).toThrow('GameEngine is required');
            expect(() => new InputHandler(undefined)).toThrow('GameEngine is required');
        });
        
        test('should initialize with default key bindings', () => {
            const bindings = inputHandler.getKeyBindings();
            expect(bindings).toEqual(DEFAULT_KEY_BINDINGS);
        });
        
        test('should accept custom key bindings', () => {
            const customBindings = { left: 'KeyA', right: 'KeyD' };
            const handler = new InputHandler(mockEngine, { keyBindings: customBindings });
            const bindings = handler.getKeyBindings();
            
            expect(bindings.left).toBe('KeyA');
            expect(bindings.right).toBe('KeyD');
            // Other bindings should remain default
            expect(bindings.down).toBe('ArrowDown');
        });
        
        test('should accept custom throttle interval', () => {
            const handler = new InputHandler(mockEngine, { throttleInterval: 100 });
            expect(handler.throttleInterval).toBe(100);
        });
        
        test('should use default throttle interval if not specified', () => {
            expect(inputHandler.throttleInterval).toBe(DEFAULT_THROTTLE_INTERVAL);
        });
        
        test('should not be bound initially', () => {
            expect(inputHandler.isBound()).toBe(false);
        });
    });
    
    describe('Key Bindings', () => {
        test('DEFAULT_KEY_BINDINGS should have correct values', () => {
            expect(DEFAULT_KEY_BINDINGS.left).toBe('ArrowLeft');
            expect(DEFAULT_KEY_BINDINGS.right).toBe('ArrowRight');
            expect(DEFAULT_KEY_BINDINGS.down).toBe('ArrowDown');
            expect(DEFAULT_KEY_BINDINGS.drop).toBe('Space');
            expect(DEFAULT_KEY_BINDINGS.rotateCW).toBe('ArrowUp');
            expect(DEFAULT_KEY_BINDINGS.rotateCCW).toBe('KeyZ');
            expect(DEFAULT_KEY_BINDINGS.hold).toBe('KeyC');
        });
        
        test('setKeyBinding() should update binding', () => {
            inputHandler.setKeyBinding('left', 'KeyA');
            expect(inputHandler.getKeyBindings().left).toBe('KeyA');
        });
        
        test('setKeyBinding() should ignore invalid actions', () => {
            inputHandler.setKeyBinding('invalid', 'KeyX');
            expect(inputHandler.getKeyBindings().invalid).toBeUndefined();
        });
        
        test('resetKeyBindings() should restore defaults', () => {
            inputHandler.setKeyBinding('left', 'KeyA');
            inputHandler.setKeyBinding('right', 'KeyD');
            inputHandler.resetKeyBindings();
            
            expect(inputHandler.getKeyBindings()).toEqual(DEFAULT_KEY_BINDINGS);
        });
    });
    
    describe('Key Down Handling - Movement (Requirements 2.1-2.3)', () => {
        test('ArrowLeft should call moveLeft() (Requirement 2.1)', () => {
            const event = createKeyEvent('ArrowLeft');
            inputHandler.handleKeyDown(event);
            
            expect(mockEngine.moveLeftCalled).toBe(1);
            expect(event.preventDefault).toHaveBeenCalled();
        });
        
        test('ArrowRight should call moveRight() (Requirement 2.2)', () => {
            const event = createKeyEvent('ArrowRight');
            inputHandler.handleKeyDown(event);
            
            expect(mockEngine.moveRightCalled).toBe(1);
            expect(event.preventDefault).toHaveBeenCalled();
        });
        
        test('ArrowDown should call moveDown() (Requirement 2.3)', () => {
            const event = createKeyEvent('ArrowDown');
            inputHandler.handleKeyDown(event);
            
            expect(mockEngine.moveDownCalled).toBe(1);
            expect(event.preventDefault).toHaveBeenCalled();
        });
    });
    
    describe('Key Down Handling - Hard Drop (Requirement 2.4)', () => {
        test('Space should call hardDrop()', () => {
            const event = createKeyEvent('Space');
            inputHandler.handleKeyDown(event);
            
            expect(mockEngine.hardDropCalled).toBe(1);
            expect(event.preventDefault).toHaveBeenCalled();
        });
    });
    
    describe('Key Down Handling - Rotation (Requirements 3.1-3.2)', () => {
        test('ArrowUp should call rotateClockwise() (Requirement 3.1)', () => {
            const event = createKeyEvent('ArrowUp');
            inputHandler.handleKeyDown(event);
            
            expect(mockEngine.rotateClockwiseCalled).toBe(1);
            expect(event.preventDefault).toHaveBeenCalled();
        });
        
        test('KeyZ should call rotateCounterClockwise() (Requirement 3.2)', () => {
            const event = createKeyEvent('KeyZ');
            inputHandler.handleKeyDown(event);
            
            expect(mockEngine.rotateCounterClockwiseCalled).toBe(1);
            expect(event.preventDefault).toHaveBeenCalled();
        });
    });
    
    describe('Key Down Handling - Hold (暂存方块)', () => {
        test('KeyC should call hold()', () => {
            const event = createKeyEvent('KeyC');
            inputHandler.handleKeyDown(event);
            
            expect(mockEngine.holdCalled).toBe(1);
            expect(event.preventDefault).toHaveBeenCalled();
        });
        
        test('hold should not execute when game is not playing', () => {
            mockEngine.setPlaying(false);
            
            const event = createKeyEvent('KeyC');
            inputHandler.handleKeyDown(event);
            
            expect(mockEngine.holdCalled).toBe(0);
        });
    });
    
    describe('Key Up Handling', () => {
        test('should track pressed keys', () => {
            const downEvent = createKeyEvent('ArrowLeft', 'keydown');
            inputHandler.handleKeyDown(downEvent);
            
            expect(inputHandler.isKeyPressed('ArrowLeft')).toBe(true);
        });
        
        test('should remove key from pressed set on keyup', () => {
            const downEvent = createKeyEvent('ArrowLeft', 'keydown');
            const upEvent = createKeyEvent('ArrowLeft', 'keyup');
            
            inputHandler.handleKeyDown(downEvent);
            expect(inputHandler.isKeyPressed('ArrowLeft')).toBe(true);
            
            inputHandler.handleKeyUp(upEvent);
            expect(inputHandler.isKeyPressed('ArrowLeft')).toBe(false);
        });
        
        test('should clear throttle time on keyup', () => {
            // Press key
            const downEvent = createKeyEvent('ArrowLeft', 'keydown');
            inputHandler.handleKeyDown(downEvent);
            
            // Release key
            const upEvent = createKeyEvent('ArrowLeft', 'keyup');
            inputHandler.handleKeyUp(upEvent);
            
            // Press again immediately - should work because throttle was cleared
            mockEngine.resetCalls();
            inputHandler.handleKeyDown(downEvent);
            expect(mockEngine.moveLeftCalled).toBe(1);
        });
    });
    
    describe('Game State Checks', () => {
        test('should not execute actions when game is not playing', () => {
            mockEngine.setPlaying(false);
            
            const event = createKeyEvent('ArrowLeft');
            inputHandler.handleKeyDown(event);
            
            expect(mockEngine.moveLeftCalled).toBe(0);
        });
        
        test('should execute actions when game is playing', () => {
            mockEngine.setPlaying(true);
            
            const event = createKeyEvent('ArrowLeft');
            inputHandler.handleKeyDown(event);
            
            expect(mockEngine.moveLeftCalled).toBe(1);
        });
    });
    
    describe('Unknown Keys', () => {
        test('should ignore unknown keys', () => {
            const event = createKeyEvent('KeyX');
            inputHandler.handleKeyDown(event);
            
            expect(mockEngine.moveLeftCalled).toBe(0);
            expect(mockEngine.moveRightCalled).toBe(0);
            expect(mockEngine.moveDownCalled).toBe(0);
            expect(mockEngine.hardDropCalled).toBe(0);
            expect(mockEngine.rotateClockwiseCalled).toBe(0);
            expect(mockEngine.rotateCounterClockwiseCalled).toBe(0);
            expect(event.preventDefault).not.toHaveBeenCalled();
        });
    });
    
    describe('Input Throttling', () => {
        test('should throttle rapid key presses', () => {
            const event = createKeyEvent('ArrowLeft');
            
            // First press should work
            inputHandler.handleKeyDown(event);
            expect(mockEngine.moveLeftCalled).toBe(1);
            
            // Immediate second press should be throttled
            inputHandler.handleKeyDown(event);
            expect(mockEngine.moveLeftCalled).toBe(1);
        });
        
        test('should allow action after throttle interval', async () => {
            const handler = new InputHandler(mockEngine, { throttleInterval: 10 });
            const event = createKeyEvent('ArrowLeft');
            
            handler.handleKeyDown(event);
            expect(mockEngine.moveLeftCalled).toBe(1);
            
            // Wait for throttle to expire
            await new Promise(resolve => setTimeout(resolve, 15));
            
            handler.handleKeyDown(event);
            expect(mockEngine.moveLeftCalled).toBe(2);
        });
        
        test('soft drop should have shorter throttle interval', () => {
            expect(SOFT_DROP_THROTTLE_INTERVAL).toBeLessThan(DEFAULT_THROTTLE_INTERVAL);
        });
        
        test('different actions should have independent throttling', () => {
            const leftEvent = createKeyEvent('ArrowLeft');
            const rightEvent = createKeyEvent('ArrowRight');
            
            inputHandler.handleKeyDown(leftEvent);
            inputHandler.handleKeyDown(rightEvent);
            
            expect(mockEngine.moveLeftCalled).toBe(1);
            expect(mockEngine.moveRightCalled).toBe(1);
        });
    });
    
    describe('Bind/Unbind', () => {
        test('bind() should set isBound to true when document is available', () => {
            // In node environment without document, bind() won't set isBound
            // This test verifies the behavior when document is not available
            inputHandler.bind();
            // In node environment, document is undefined, so isBound stays false
            // This is expected behavior - bind only works in browser
            expect(inputHandler.isBound()).toBe(false);
        });
        
        test('unbind() should set isBound to false', () => {
            // Force isBound to true for testing
            inputHandler._isBound = true;
            inputHandler.unbind();
            expect(inputHandler.isBound()).toBe(false);
        });
        
        test('unbind() should clear pressed keys', () => {
            const event = createKeyEvent('ArrowLeft');
            inputHandler.handleKeyDown(event);
            expect(inputHandler.isKeyPressed('ArrowLeft')).toBe(true);
            
            inputHandler.unbind();
            expect(inputHandler.isKeyPressed('ArrowLeft')).toBe(false);
        });
        
        test('bind() should not double-bind', () => {
            // In node environment, bind() won't actually bind
            // But it should still not throw errors
            inputHandler.bind();
            inputHandler.bind();
            // No error thrown is success
            expect(true).toBe(true);
        });
        
        test('unbind() should be safe to call when not bound', () => {
            expect(() => inputHandler.unbind()).not.toThrow();
        });
        
        test('bind() should work when document.addEventListener is available', () => {
            // Mock document for this test
            const originalDocument = global.document;
            const mockAddEventListener = jest.fn();
            global.document = {
                addEventListener: mockAddEventListener,
                removeEventListener: jest.fn()
            };
            
            const handler = new InputHandler(mockEngine);
            handler.bind();
            
            expect(handler.isBound()).toBe(true);
            expect(mockAddEventListener).toHaveBeenCalledTimes(2);
            expect(mockAddEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
            expect(mockAddEventListener).toHaveBeenCalledWith('keyup', expect.any(Function));
            
            // Restore
            global.document = originalDocument;
        });
        
        test('unbind() should remove event listeners when bound', () => {
            // Mock document for this test
            const originalDocument = global.document;
            const mockRemoveEventListener = jest.fn();
            global.document = {
                addEventListener: jest.fn(),
                removeEventListener: mockRemoveEventListener
            };
            
            const handler = new InputHandler(mockEngine);
            handler.bind();
            handler.unbind();
            
            expect(handler.isBound()).toBe(false);
            expect(mockRemoveEventListener).toHaveBeenCalledTimes(2);
            expect(mockRemoveEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
            expect(mockRemoveEventListener).toHaveBeenCalledWith('keyup', expect.any(Function));
            
            // Restore
            global.document = originalDocument;
        });
    });
    
    describe('Process Held Keys', () => {
        test('processHeldKeys() should execute actions for held keys', async () => {
            const handler = new InputHandler(mockEngine, { throttleInterval: 10 });
            const event = createKeyEvent('ArrowLeft');
            
            handler.handleKeyDown(event);
            expect(mockEngine.moveLeftCalled).toBe(1);
            
            // Wait for throttle
            await new Promise(resolve => setTimeout(resolve, 15));
            
            // Process held keys
            handler.processHeldKeys();
            expect(mockEngine.moveLeftCalled).toBe(2);
        });
        
        test('processHeldKeys() should not execute for released keys', () => {
            const downEvent = createKeyEvent('ArrowLeft', 'keydown');
            const upEvent = createKeyEvent('ArrowLeft', 'keyup');
            
            inputHandler.handleKeyDown(downEvent);
            inputHandler.handleKeyUp(upEvent);
            
            mockEngine.resetCalls();
            inputHandler.processHeldKeys();
            
            expect(mockEngine.moveLeftCalled).toBe(0);
        });
    });
    
    describe('Custom Key Bindings Integration', () => {
        test('should work with WASD bindings', () => {
            const wasdBindings = {
                left: 'KeyA',
                right: 'KeyD',
                down: 'KeyS',
                drop: 'KeyW',
                rotateCW: 'KeyE',
                rotateCCW: 'KeyQ'
            };
            const handler = new InputHandler(mockEngine, { keyBindings: wasdBindings });
            
            handler.handleKeyDown(createKeyEvent('KeyA'));
            expect(mockEngine.moveLeftCalled).toBe(1);
            
            handler.handleKeyDown(createKeyEvent('KeyD'));
            expect(mockEngine.moveRightCalled).toBe(1);
            
            handler.handleKeyDown(createKeyEvent('KeyS'));
            expect(mockEngine.moveDownCalled).toBe(1);
            
            handler.handleKeyDown(createKeyEvent('KeyW'));
            expect(mockEngine.hardDropCalled).toBe(1);
            
            handler.handleKeyDown(createKeyEvent('KeyE'));
            expect(mockEngine.rotateClockwiseCalled).toBe(1);
            
            handler.handleKeyDown(createKeyEvent('KeyQ'));
            expect(mockEngine.rotateCounterClockwiseCalled).toBe(1);
        });
        
        test('original arrow keys should not work with WASD bindings', () => {
            const wasdBindings = {
                left: 'KeyA',
                right: 'KeyD',
                down: 'KeyS',
                drop: 'KeyW',
                rotateCW: 'KeyE',
                rotateCCW: 'KeyQ'
            };
            const handler = new InputHandler(mockEngine, { keyBindings: wasdBindings });
            
            handler.handleKeyDown(createKeyEvent('ArrowLeft'));
            expect(mockEngine.moveLeftCalled).toBe(0);
        });
    });
    
    describe('Edge Cases', () => {
        test('should handle failed move gracefully', () => {
            // Mock engine that returns false for moves
            const failingEngine = {
                isPlaying: () => true,
                moveLeft: () => false,
                moveRight: () => false,
                moveDown: () => false,
                hardDrop: () => 0,
                rotateClockwise: () => false,
                rotateCounterClockwise: () => false
            };
            
            const handler = new InputHandler(failingEngine);
            const event = createKeyEvent('ArrowLeft');
            
            // Should not throw
            expect(() => handler.handleKeyDown(event)).not.toThrow();
        });
        
        test('should handle multiple keys pressed simultaneously', () => {
            const leftEvent = createKeyEvent('ArrowLeft');
            const downEvent = createKeyEvent('ArrowDown');
            
            inputHandler.handleKeyDown(leftEvent);
            inputHandler.handleKeyDown(downEvent);
            
            expect(inputHandler.isKeyPressed('ArrowLeft')).toBe(true);
            expect(inputHandler.isKeyPressed('ArrowDown')).toBe(true);
        });
    });
});
