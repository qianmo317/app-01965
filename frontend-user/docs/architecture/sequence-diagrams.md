# 序列图文档

本文档包含 Tetris AI 游戏关键操作的序列图，帮助理解系统的运行时行为。

## 1. 游戏循环序列图

游戏循环是系统的核心，每帧执行一次，负责更新游戏状态和渲染画面。

### 1.1 完整游戏循环

```mermaid
sequenceDiagram
    autonumber
    participant RAF as requestAnimationFrame
    participant Renderer as CanvasRenderer
    participant Main as TetrisApp
    participant Engine as GameEngine
    participant Input as InputHandler
    participant AI as AIController
    participant Board as BoardManager
    
    Note over RAF,Board: 游戏循环开始
    
    RAF->>Renderer: callback(currentTime)
    Renderer->>Renderer: 计算 deltaTime
    Renderer->>Renderer: 更新 FPS 计数
    Renderer->>Main: updateCallback(deltaTime)
    
    alt 游戏状态 === PLAYING
        %% 游戏引擎更新
        Main->>Engine: update(deltaTime)
        Engine->>Engine: accumulatedTime += deltaTime
        
        alt accumulatedTime >= dropInterval
            Engine->>Engine: accumulatedTime -= dropInterval
            Engine->>Engine: moveDown()
            
            alt 无法下移
                Engine->>Engine: _lockTetromino()
                Engine->>Board: placeTetromino(tetromino)
                Engine->>Board: clearLines()
                Board-->>Engine: linesCleared
                
                alt linesCleared > 0
                    Engine->>Engine: _addScore(linesCleared)
                    Engine->>Engine: 触发 onLinesCleared
                end
                
                Engine->>Engine: _spawnTetromino()
                
                alt 新方块无法放置
                    Engine->>Engine: _triggerGameOver()
                end
            end
        end
        
        %% 处理持续按键
        Main->>Input: processHeldKeys()
        
        loop 每个按下的键
            Input->>Input: _getActionForKey(code)
            Input->>Input: _isThrottled(action)
            
            alt 未被节流
                Input->>Engine: 执行对应动作
            end
        end
        
        %% AI 更新
        alt AI 模式启用
            Main->>AI: update(board, tetromino, time, callback)
            
            alt canMakeDecision(time)
                alt 移动队列为空
                    AI->>AI: planMoves(board, tetromino)
                end
                
                AI->>AI: executeNextMove()
                AI->>Main: callback(move)
                Main->>Engine: 执行 AI 移动
            end
        end
    end
    
    %% 渲染
    Main->>Engine: getState()
    Engine-->>Main: gameState
    Main->>Engine: getGhostY()
    Engine-->>Main: ghostY
    Main->>Renderer: render(gameState)
    
    Renderer->>Renderer: _clearCanvas()
    Renderer->>Renderer: _renderBackground()
    Renderer->>Renderer: renderBoard(board)
    
    alt ghostPieceEnabled && PLAYING
        Renderer->>Renderer: renderGhostPiece(tetromino, ghostY)
    end
    
    Renderer->>Renderer: renderTetromino(currentTetromino)
    
    alt gridLinesEnabled
        Renderer->>Renderer: _renderGridLines()
    end
    
    Renderer->>Renderer: renderNextPiece(nextTetromino)
    
    alt gameState === GAMEOVER
        Renderer->>Renderer: renderGameOver()
    end
    
    %% 请求下一帧
    Renderer->>RAF: requestAnimationFrame(loop)
    
    Note over RAF,Board: 游戏循环结束，等待下一帧
```

### 1.2 简化的游戏循环流程

```mermaid
flowchart TB
    Start([开始帧]) --> CalcDelta[计算 deltaTime]
    CalcDelta --> CheckPlaying{游戏进行中?}
    
    CheckPlaying -->|是| UpdateEngine[更新游戏引擎]
    CheckPlaying -->|否| Render[渲染画面]
    
    UpdateEngine --> CheckDrop{达到下落时间?}
    CheckDrop -->|是| AutoDrop[自动下落]
    CheckDrop -->|否| ProcessInput[处理输入]
    
    AutoDrop --> CheckLock{需要锁定?}
    CheckLock -->|是| LockPiece[锁定方块]
    CheckLock -->|否| ProcessInput
    
    LockPiece --> ClearLines[消除完整行]
    ClearLines --> SpawnNew[生成新方块]
    SpawnNew --> CheckGameOver{游戏结束?}
    CheckGameOver -->|是| GameOver[触发游戏结束]
    CheckGameOver -->|否| ProcessInput
    
    ProcessInput --> CheckAI{AI 启用?}
    CheckAI -->|是| AIUpdate[AI 更新]
    CheckAI -->|否| Render
    
    AIUpdate --> Render
    GameOver --> Render
    
    Render --> RequestNext[请求下一帧]
    RequestNext --> End([结束帧])
```

## 2. AI 决策序列图

AI 决策过程包括位置评估、最佳位置选择和移动序列生成。

### 2.1 完整 AI 决策流程

```mermaid
sequenceDiagram
    autonumber
    participant Main as TetrisApp
    participant AI as AIController
    participant Eval as StateEvaluator
    participant RL as RLAgent
    participant Board as BoardManager
    participant Engine as GameEngine
    
    Note over Main,Engine: AI 决策开始
    
    Main->>AI: update(board, tetromino, currentTime, executeMove)
    
    AI->>AI: 检查 enabled
    alt AI 未启用
        AI-->>Main: false
    end
    
    AI->>AI: canMakeDecision(currentTime)
    Note right of AI: 检查是否达到决策间隔
    
    alt 未达到决策时间
        AI-->>Main: false
    end
    
    alt 移动队列为空
        AI->>AI: planMoves(board, tetromino)
        AI->>AI: findBestPlacement(board, tetromino)
        AI->>AI: evaluateAllPlacements(board, tetromino)
        
        Note over AI,Board: 遍历所有可能的放置位置
        
        loop 每个旋转状态 (0 到 rotationCount-1)
            AI->>AI: 获取旋转后的形状
            AI->>AI: 计算有效 X 坐标范围
            
            loop 每个有效 X 坐标
                AI->>AI: _evaluatePlacement(board, tetromino, x, rotation)
                AI->>Board: isValidShapePosition(shape, x, 0)
                
                alt 初始位置有效
                    loop 模拟下落
                        AI->>Board: isValidShapePosition(shape, x, y+1)
                    end
                    
                    AI->>AI: _simulateAndEvaluate(board, shape, x, y, type)
                    Note right of AI: 创建棋盘副本
                    AI->>AI: 放置方块到副本
                    AI->>AI: _simulateClearLines(gridCopy)
                    AI->>Eval: evaluate(gridCopy)
                    
                    Eval->>Eval: calculateAggregateHeight(board)
                    Eval->>Eval: calculateCompleteLines(board)
                    Eval->>Eval: calculateHoles(board)
                    Eval->>Eval: calculateBumpiness(board)
                    Eval->>Eval: 加权求和
                    Eval-->>AI: score
                    
                    AI->>AI: 添加到 placements 数组
                end
            end
        end
        
        Note over AI,RL: 选择最佳放置位置
        
        alt 有 RLAgent
            AI->>RL: selectAction(placements)
            RL->>RL: 生成随机数
            
            alt random < epsilon (探索)
                RL->>RL: 随机选择一个放置位置
            else random >= epsilon (利用)
                RL->>RL: 选择分数最高的放置位置
            end
            
            RL-->>AI: selectedPlacement
        else 无 RLAgent
            AI->>AI: 选择分数最高的放置位置
        end
        
        AI->>AI: generateMoveSequence(tetromino, placement)
        Note right of AI: 生成移动序列
        
        AI->>AI: 计算旋转次数
        loop 需要的旋转次数
            AI->>AI: 添加 {type: 'rotate'}
        end
        
        AI->>AI: 计算水平移动
        alt 需要向左移动
            loop 移动距离
                AI->>AI: 添加 {type: 'left'}
            end
        else 需要向右移动
            loop 移动距离
                AI->>AI: 添加 {type: 'right'}
            end
        end
        
        AI->>AI: 添加 {type: 'drop'}
    end
    
    AI->>AI: executeNextMove()
    AI->>AI: 从队列取出第一个移动
    AI->>Main: executeMove(move)
    
    Main->>Engine: 执行对应动作
    Note right of Main: left/right/rotate/drop
    
    AI->>AI: updateDecisionTime(currentTime)
    AI-->>Main: true
    
    Note over Main,Engine: AI 决策完成
```

### 2.2 状态评估详细流程

```mermaid
sequenceDiagram
    autonumber
    participant AI as AIController
    participant Eval as StateEvaluator
    
    Note over AI,Eval: 状态评估开始
    
    AI->>Eval: evaluate(board)
    
    %% 计算聚合高度
    Eval->>Eval: calculateAggregateHeight(board)
    Eval->>Eval: _getColumnHeights(board)
    Note right of Eval: 遍历每列，找到最高的填充单元格
    Eval->>Eval: 求和所有列高度
    
    %% 计算完整行数
    Eval->>Eval: calculateCompleteLines(board)
    Note right of Eval: 遍历每行，检查是否全部填充
    
    %% 计算空洞数
    Eval->>Eval: calculateHoles(board)
    Note right of Eval: 遍历每列，统计上方有方块的空单元格
    
    %% 计算凹凸度
    Eval->>Eval: calculateBumpiness(board)
    Note right of Eval: 计算相邻列高度差的绝对值之和
    
    %% 加权求和
    Eval->>Eval: score = w1*height + w2*lines + w3*holes + w4*bump
    Note right of Eval: w1=-0.510066, w2=0.760666, w3=-0.35663, w4=-0.184483
    
    Eval-->>AI: score
    
    Note over AI,Eval: 状态评估完成
```

## 3. 行消除序列图

行消除是游戏的核心机制之一，包括检测、消除和计分。

### 3.1 完整行消除流程

```mermaid
sequenceDiagram
    autonumber
    participant Engine as GameEngine
    participant Board as BoardManager
    participant Renderer as CanvasRenderer
    participant Panel as ControlPanel
    
    Note over Engine,Panel: 行消除流程开始
    
    Engine->>Engine: _lockTetromino()
    
    %% 放置方块
    Engine->>Board: placeTetromino(tetromino)
    Board->>Board: isValidPosition(tetromino)
    
    alt 位置有效
        Board->>Board: 获取方块形状
        Board->>Board: 获取方块类型索引
        
        loop 方块的每个单元格
            alt 单元格已填充
                Board->>Board: grid[boardY][boardX] = typeIndex
            end
        end
        
        Board-->>Engine: true
    else 位置无效
        Board-->>Engine: false
    end
    
    %% 消除行
    Engine->>Board: clearLines()
    Board->>Board: linesCleared = 0
    Board->>Board: y = height - 1 (从底部开始)
    
    loop y >= 0
        Board->>Board: _isLineFull(y)
        
        loop x = 0 to width-1
            Board->>Board: 检查 grid[y][x]
            alt 有空单元格
                Board->>Board: isComplete = false
                Board->>Board: break
            end
        end
        
        alt 行完整
            Board->>Board: _removeLine(y)
            Board->>Board: grid.splice(y, 1)
            Board->>Board: grid.unshift(新空行)
            Board->>Board: linesCleared++
            Note right of Board: 不递减 y，继续检查同一位置
        else 行不完整
            Board->>Board: y--
        end
    end
    
    Board-->>Engine: linesCleared
    
    %% 计分和通知
    alt linesCleared > 0
        Engine->>Engine: _addScore(linesCleared)
        
        Note right of Engine: 计分规则
        Note right of Engine: 1行=100, 2行=300, 3行=500, 4行=800
        
        Engine->>Engine: score += SCORING_RULES[linesCleared]
        Engine->>Engine: onScoreChange(score, points)
        
        Engine->>Engine: linesCleared += cleared
        Engine->>Engine: onLinesCleared(cleared, totalLines)
        
        %% 可选：行消除动画
        opt 启用动画
            Engine->>Renderer: animateLineClear(lines)
            Renderer->>Renderer: 设置动画状态
            
            loop 动画进行中
                Renderer->>Renderer: 计算进度
                Renderer->>Renderer: 闪烁效果
                Renderer->>Renderer: requestAnimationFrame
            end
            
            Renderer-->>Engine: 动画完成
        end
    end
    
    %% 生成新方块
    Engine->>Engine: _spawnTetromino()
    
    Note over Engine,Panel: 行消除流程完成
```

### 3.2 行消除算法可视化

```mermaid
flowchart TB
    subgraph Before["消除前"]
        B1["行 17: □□□□□□□□□□"]
        B2["行 18: ■■■■■■■■■■ ← 完整"]
        B3["行 19: ■■■■■■■■■■ ← 完整"]
    end
    
    subgraph Process["处理过程"]
        P1["检测行 19: 完整 → 移除"]
        P2["检测行 19: 完整 → 移除"]
        P3["检测行 19: 不完整 → 继续"]
    end
    
    subgraph After["消除后"]
        A1["行 17: □□□□□□□□□□ ← 新空行"]
        A2["行 18: □□□□□□□□□□ ← 新空行"]
        A3["行 19: □□□□□□□□□□ ← 原行17下移"]
    end
    
    Before --> Process --> After
```

## 4. 游戏启动序列图

### 4.1 应用初始化流程

```mermaid
sequenceDiagram
    autonumber
    participant DOM as DOMContentLoaded
    participant App as TetrisApp
    participant Engine as GameEngine
    participant Renderer as CanvasRenderer
    participant Input as InputHandler
    participant AI as AIController
    participant RL as RLAgent
    participant Panel as ControlPanel
    
    Note over DOM,Panel: 应用初始化开始
    
    DOM->>App: new TetrisApp()
    App->>App: 初始化属性
    
    DOM->>App: init()
    
    %% 获取 Canvas
    App->>App: getElementById('game-canvas')
    App->>App: getElementById('next-piece-canvas')
    
    %% 初始化游戏引擎
    App->>Engine: new GameEngine(options)
    Engine->>Engine: 创建 BoardManager
    Engine->>Engine: 创建 TetrominoFactory
    Engine->>Engine: 创建 WallKickSystem
    Engine->>Engine: 设置回调函数
    
    %% 初始化渲染器
    App->>Renderer: new CanvasRenderer(canvas, nextCanvas)
    Renderer->>Renderer: 获取 2D 上下文
    Renderer->>Renderer: 设置 Canvas 尺寸
    Renderer->>Renderer: 初始化渲染选项
    
    %% 初始化输入处理器
    App->>Input: new InputHandler(gameEngine)
    Input->>Input: 设置按键绑定
    App->>Input: bind()
    Input->>Input: 添加 keydown 监听器
    Input->>Input: 添加 keyup 监听器
    
    %% 初始化 AI 组件
    App->>App: new StateEvaluator()
    App->>RL: new RLAgent()
    App->>RL: loadFromStorage()
    RL->>RL: 从 LocalStorage 加载数据
    App->>AI: new AIController(evaluator, rlAgent)
    
    %% 初始化控制面板
    App->>Panel: new ControlPanel(options)
    App->>Panel: init()
    Panel->>Panel: _cacheElements()
    Panel->>Panel: _bindEvents()
    Panel->>Panel: _initializeState()
    Panel->>Panel: updateAIStats()
    Panel->>Panel: updateKeyBindingsDisplay()
    
    %% 初始渲染
    App->>App: _render()
    App->>Engine: getState()
    App->>Renderer: render(state)
    
    Note over DOM,Panel: 应用初始化完成
```

### 4.2 游戏开始流程

```mermaid
sequenceDiagram
    autonumber
    participant User as 用户
    participant Panel as ControlPanel
    participant Engine as GameEngine
    participant Board as BoardManager
    participant Factory as TetrominoFactory
    participant App as TetrisApp
    participant Renderer as CanvasRenderer
    
    Note over User,Renderer: 游戏开始流程
    
    User->>Panel: 点击"开始游戏"按钮
    Panel->>Panel: _handleStart()
    
    alt 游戏已暂停
        Panel->>Engine: resume()
        Engine->>Engine: gameState = PLAYING
        Engine->>Engine: 重置 lastDropTime
        Engine->>Engine: onStateChange(PLAYING)
    else 游戏未在进行
        Panel->>Engine: start()
        
        alt 是新游戏
            Engine->>Board: reset()
            Board->>Board: 创建空网格
            
            Engine->>Factory: reset()
            Factory->>Factory: 重置 7-bag
            
            Engine->>Engine: 重置分数和状态
        end
        
        Engine->>Engine: gameState = PLAYING
        Engine->>Engine: onStateChange(PLAYING)
        
        alt 没有当前方块
            Engine->>Engine: _spawnTetromino()
            Engine->>Factory: createRandom()
            Factory-->>Engine: nextTetromino
            Engine->>Engine: currentTetromino = nextTetromino
            Engine->>Factory: createRandom()
            Factory-->>Engine: nextTetromino
            Engine->>Engine: onPieceSpawned(current, next)
        end
    end
    
    Panel->>Panel: _updateButtonStates('playing')
    Panel->>Panel: hideOverlay()
    Panel->>App: onStart()
    
    App->>App: _startGameLoop()
    App->>Renderer: startGameLoop(updateCallback)
    Renderer->>Renderer: requestAnimationFrame(loop)
    
    Note over User,Renderer: 游戏循环开始
```

## 5. 方块旋转序列图

### 5.1 带墙踢的旋转流程

```mermaid
sequenceDiagram
    autonumber
    participant User as 用户输入
    participant Engine as GameEngine
    participant WallKick as WallKickSystem
    participant Board as BoardManager
    participant Tetromino as Tetromino
    
    Note over User,Tetromino: 旋转流程开始
    
    User->>Engine: rotateClockwise() / rotateCounterClockwise()
    
    Engine->>Engine: 检查游戏状态
    alt 游戏未进行或无当前方块
        Engine-->>User: false
    end
    
    Engine->>WallKick: rotateClockwise(tetromino) / rotateCounterClockwise(tetromino)
    WallKick->>WallKick: rotate(tetromino, direction)
    WallKick->>WallKick: tryRotate(tetromino, direction)
    
    %% 计算目标旋转状态
    WallKick->>Tetromino: getRotationCount()
    Tetromino-->>WallKick: totalRotations
    
    alt direction === 1 (顺时针)
        WallKick->>WallKick: toRotation = (from + 1) % total
    else direction === -1 (逆时针)
        WallKick->>WallKick: toRotation = (from - 1 + total) % total
    end
    
    %% 获取旋转后的形状
    WallKick->>Tetromino: getShapeAtRotation(toRotation)
    Tetromino-->>WallKick: rotatedShape
    
    %% 获取墙踢数据
    WallKick->>WallKick: getWallKickData(type, from, to)
    
    alt type === 'O'
        WallKick->>WallKick: return [[0, 0]]
    else type === 'I'
        WallKick->>WallKick: return WALL_KICK_DATA_I[key]
    else J/L/S/T/Z
        WallKick->>WallKick: return WALL_KICK_DATA_JLSTZ[key]
    end
    
    %% 尝试每个偏移量
    loop 每个 [offsetX, offsetY]
        WallKick->>WallKick: newX = tetromino.x + offsetX
        WallKick->>WallKick: newY = tetromino.y + offsetY
        WallKick->>Board: isValidShapePosition(rotatedShape, newX, newY)
        
        Board->>Board: 检查边界
        Board->>Board: 检查碰撞
        Board-->>WallKick: boolean
        
        alt 位置有效
            WallKick->>Tetromino: x += offsetX
            WallKick->>Tetromino: y += offsetY
            WallKick->>Tetromino: setRotationIndex(toRotation)
            WallKick-->>Engine: true
            Engine-->>User: true
            Note over User,Tetromino: 旋转成功
        end
    end
    
    %% 所有尝试失败
    WallKick-->>Engine: false
    Engine-->>User: false
    Note over User,Tetromino: 旋转失败，保持原状态
```

### 5.2 旋转状态转换图

```mermaid
stateDiagram-v2
    [*] --> State0: 初始状态
    
    State0 --> State1: 顺时针 (CW)
    State1 --> State2: 顺时针 (CW)
    State2 --> State3: 顺时针 (CW)
    State3 --> State0: 顺时针 (CW)
    
    State0 --> State3: 逆时针 (CCW)
    State3 --> State2: 逆时针 (CCW)
    State2 --> State1: 逆时针 (CCW)
    State1 --> State0: 逆时针 (CCW)
    
    note right of State0: 旋转索引 0
    note right of State1: 旋转索引 1
    note right of State2: 旋转索引 2
    note right of State3: 旋转索引 3
```

## 6. 设置变更序列图

### 6.1 设置即时应用流程

```mermaid
sequenceDiagram
    autonumber
    participant User as 用户
    participant UI as UI控件
    participant Settings as SettingsManager
    participant Storage as LocalStorage
    participant Renderer as CanvasRenderer
    participant Engine as GameEngine
    
    Note over User,Engine: 设置变更流程
    
    User->>UI: 切换 Ghost Piece 开关
    UI->>Settings: setGhostPieceEnabled(enabled)
    
    Settings->>Settings: settings.display.ghostPieceEnabled = enabled
    Settings->>Storage: saveSettings()
    Storage->>Storage: setItem('tetris-settings', JSON.stringify(settings))
    
    Settings->>Renderer: setGhostPieceEnabled(enabled)
    Renderer->>Renderer: renderOptions.ghostPieceEnabled = enabled
    
    Note over Renderer: 下一帧渲染时立即生效
    
    User->>UI: 调整速度滑块
    UI->>Settings: setSetting('speed', value)
    
    Settings->>Settings: settings.gameplay.speed = value
    Settings->>Storage: saveSettings()
    
    Settings->>Engine: setSpeed(value)
    Engine->>Engine: speed = clamp(value, 1, 10)
    Engine->>Engine: dropInterval = SPEED_INTERVALS[speed]
    Engine->>Engine: resetAccumulatedTime()
    
    Note over Engine: 速度变化立即生效
```

## 7. 游戏结束序列图

### 7.1 游戏结束流程

```mermaid
sequenceDiagram
    autonumber
    participant Engine as GameEngine
    participant Board as BoardManager
    participant Factory as TetrominoFactory
    participant Panel as ControlPanel
    participant AI as AIController
    participant RL as RLAgent
    participant Storage as LocalStorage
    
    Note over Engine,Storage: 游戏结束流程
    
    Engine->>Engine: _spawnTetromino()
    Engine->>Factory: createRandom()
    Factory-->>Engine: newTetromino
    
    Engine->>Board: isGameOver(newTetromino)
    Board->>Board: isValidPosition(tetromino)
    Board-->>Engine: true (无法放置)
    
    Engine->>Engine: _triggerGameOver()
    Engine->>Engine: gameState = GAMEOVER
    Engine->>Engine: onStateChange(GAMEOVER)
    Engine->>Engine: onGameOver(score, linesCleared)
    
    Panel->>Panel: onGameStateChange('gameover')
    Panel->>Panel: _updateButtonStates('gameover')
    Panel->>Panel: showGameOver(finalScore)
    
    alt AI 模式启用
        Panel->>RL: recordGame(score, lines)
        RL->>RL: 更新统计数据
        RL->>RL: gamesPlayed++
        RL->>RL: totalScore += score
        RL->>RL: totalLinesCleared += lines
        
        alt score > bestScore
            RL->>RL: bestScore = score
        end
        
        RL->>RL: 衰减 epsilon
        RL->>RL: epsilon = max(minEpsilon, epsilon * decay)
        
        Panel->>RL: saveToStorage()
        RL->>Storage: setItem('tetris-rl-data', data)
        
        Panel->>Panel: updateAIStats()
    end
    
    Note over Engine,Storage: 游戏结束处理完成
```

## 总结

本文档涵盖了 Tetris AI 游戏的主要操作序列：

1. **游戏循环** - 系统的核心，每帧执行更新和渲染
2. **AI 决策** - 评估所有放置位置并选择最佳策略
3. **行消除** - 检测、消除完整行并计分
4. **游戏启动** - 应用初始化和游戏开始流程
5. **方块旋转** - 带墙踢机制的旋转处理
6. **设置变更** - 设置的即时应用和持久化
7. **游戏结束** - 游戏结束检测和数据保存

这些序列图帮助开发者理解系统的运行时行为，便于调试和扩展功能。
