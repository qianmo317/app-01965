# 强化学习算法说明

## 概述

俄罗斯方块 AI 使用**强化学习 (Reinforcement Learning)** 技术，通过与游戏环境的交互来学习最优策略。核心算法是 **Epsilon-Greedy 策略**，它在探索新策略和利用已知最佳策略之间取得平衡。

## 强化学习基础

### 什么是强化学习？

强化学习是一种机器学习方法，智能体（Agent）通过与环境交互来学习：

```
┌─────────────────────────────────────────────────────────────┐
│                    强化学习循环                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│    ┌─────────┐     动作 (Action)      ┌─────────┐          │
│    │         │ ─────────────────────▶ │         │          │
│    │  Agent  │                        │  环境   │          │
│    │  (AI)   │ ◀───────────────────── │ (游戏)  │          │
│    │         │   状态 (State) + 奖励   │         │          │
│    └─────────┘                        └─────────┘          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 在俄罗斯方块中的应用

| 概念 | 在游戏中的对应 |
|------|---------------|
| **状态 (State)** | 当前棋盘状态（方块分布、高度、空洞等） |
| **动作 (Action)** | 方块的放置位置和旋转角度 |
| **奖励 (Reward)** | 游戏分数、消除的行数 |
| **策略 (Policy)** | 如何选择放置位置的决策规则 |

## Epsilon-Greedy 策略

### 核心思想

Epsilon-Greedy 是一种简单而有效的策略，用于解决**探索-利用困境 (Exploration-Exploitation Dilemma)**：

- **探索 (Exploration)**：尝试新的、未知的动作，可能发现更好的策略
- **利用 (Exploitation)**：使用当前已知的最佳动作，获得稳定的收益

### 算法描述

```
对于每次决策：
    生成随机数 r ∈ [0, 1)
    
    如果 r < ε (探索):
        随机选择一个放置位置
    否则 (利用):
        选择评估分数最高的放置位置
```

### 代码实现

```javascript
// RLAgent.selectAction() 方法
selectAction(placements) {
    if (!placements || placements.length === 0) {
        return null;
    }
    
    // 生成随机数决定是探索还是利用
    const randomValue = Math.random();
    
    if (randomValue < this.epsilon) {
        // 探索：随机选择（均匀分布）
        const randomIndex = Math.floor(Math.random() * placements.length);
        return placements[randomIndex];
    } else {
        // 利用：选择最高分的放置位置
        return this._selectBestPlacement(placements);
    }
}
```

### 参数说明

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `epsilon` | 1.0 | 探索率，范围 [0, 1]。1.0 表示 100% 探索 |
| `epsilonMin` | 0.01 | 最小探索率，探索率不会低于此值 |
| `epsilonDecay` | 0.995 | 衰减系数，每局游戏后 ε = ε × decay |

## Epsilon 衰减机制

### 为什么需要衰减？

学习过程分为三个阶段：

```
探索率 (ε)
    │
1.0 ├────●
    │     ╲
    │      ╲  初期：大量探索
    │       ╲
0.5 ├────────●
    │         ╲
    │          ╲  中期：平衡探索和利用
    │           ╲
0.1 ├────────────●────────
    │                      最小探索率
    │
    └────────────────────────▶ 游戏局数
         100    200    300
```

### 衰减公式

```
ε_new = max(ε_min, ε_current × decay)
```

### 衰减示例

假设初始 ε = 1.0，衰减系数 = 0.995：

| 游戏局数 | 探索率 (ε) | 探索概率 |
|----------|-----------|----------|
| 0 | 1.000 | 100% |
| 50 | 0.778 | 77.8% |
| 100 | 0.606 | 60.6% |
| 200 | 0.367 | 36.7% |
| 300 | 0.223 | 22.3% |
| 500 | 0.082 | 8.2% |
| 1000 | 0.010 | 1.0% (最小值) |

## 学习过程

### 完整学习流程

```
┌─────────────────────────────────────────────────────────────┐
│                      学习流程                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 游戏开始                                                │
│     │                                                       │
│     ▼                                                       │
│  2. 评估所有可能的放置位置                                   │
│     │                                                       │
│     ▼                                                       │
│  3. 使用 Epsilon-Greedy 选择动作                            │
│     │                                                       │
│     ├──▶ 探索 (概率 ε): 随机选择                            │
│     │                                                       │
│     └──▶ 利用 (概率 1-ε): 选择最高分                        │
│     │                                                       │
│     ▼                                                       │
│  4. 执行动作，观察结果                                       │
│     │                                                       │
│     ▼                                                       │
│  5. 游戏结束？                                              │
│     │                                                       │
│     ├──▶ 否: 返回步骤 2                                     │
│     │                                                       │
│     └──▶ 是: 继续                                           │
│     │                                                       │
│     ▼                                                       │
│  6. 记录游戏结果                                            │
│     │                                                       │
│     ▼                                                       │
│  7. 衰减探索率 (ε = ε × decay)                              │
│     │                                                       │
│     ▼                                                       │
│  8. 保存学习数据                                            │
│     │                                                       │
│     ▼                                                       │
│  9. 开始新游戏 (返回步骤 1)                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 代码示例

```javascript
// 游戏循环中的 AI 决策
function gameLoop() {
    if (aiController.isEnabled()) {
        // 获取所有可能的放置位置
        const placements = aiController.evaluateAllPlacements(board, tetromino);
        
        // 使用 Epsilon-Greedy 选择动作
        const selectedPlacement = rlAgent.selectAction(placements);
        
        // 生成并执行移动序列
        const moves = aiController.generateMoveSequence(tetromino, selectedPlacement);
        // ... 执行移动
    }
}

// 游戏结束时
function onGameOver() {
    // 记录游戏结果
    rlAgent.recordGame(score, linesCleared);
    
    // 保存学习数据
    rlAgent.saveToStorage();
}
```

## 与其他算法的比较

| 算法 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| **Epsilon-Greedy** | 简单、易实现、计算开销小 | 探索效率不是最优 | 实时游戏、资源受限环境 |
| **UCB** | 更智能的探索 | 计算复杂度较高 | 需要更精确探索的场景 |
| **Thompson Sampling** | 理论最优 | 需要概率模型 | 有先验知识的场景 |
| **Deep Q-Learning** | 可处理复杂状态空间 | 需要大量训练数据和计算资源 | 复杂游戏、有GPU支持 |

## 为什么选择 Epsilon-Greedy？

1. **简单高效**：实现简单，计算开销小，适合浏览器环境
2. **实时性好**：决策速度快，不影响游戏体验
3. **可解释性强**：参数含义直观，易于调优
4. **效果良好**：在俄罗斯方块这类游戏中表现优秀

## 相关需求

本文档满足以下需求规范：

- **Requirement 6.1**: AI training documentation SHALL explain the reinforcement learning algorithm used

## 参考资料

- [Reinforcement Learning: An Introduction](http://incompleteideas.net/book/the-book-2nd.html) - Sutton & Barto
- [Multi-Armed Bandit Problem](https://en.wikipedia.org/wiki/Multi-armed_bandit)
- [Epsilon-Greedy Algorithm](https://en.wikipedia.org/wiki/Multi-armed_bandit#Semi-uniform_strategies)
