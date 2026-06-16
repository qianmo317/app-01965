# AI 训练和调优文档

## 概述

本文档描述了俄罗斯方块 AI 系统的训练和调优方法。AI 系统使用强化学习技术，通过不断游戏来学习和优化游戏策略。

## AI 系统架构

AI 系统由三个核心模块组成：

```
┌─────────────────────────────────────────────────────────────┐
│                      AI 系统架构                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │   AIController  │───▶│  StateEvaluator │                │
│  │   (AI控制器)    │    │   (状态评估器)   │                │
│  └────────┬────────┘    └─────────────────┘                │
│           │                      ▲                          │
│           │                      │                          │
│           ▼                      │                          │
│  ┌─────────────────┐            │                          │
│  │    RLAgent      │────────────┘                          │
│  │ (强化学习代理)   │                                       │
│  └─────────────────┘                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 模块职责

| 模块 | 文件 | 职责 |
|------|------|------|
| **AIController** | `src/ai/ai-controller.js` | 评估所有可能的放置位置，生成移动序列，控制AI执行 |
| **StateEvaluator** | `src/ai/state-evaluator.js` | 评估棋盘状态，计算四个关键指标的加权分数 |
| **RLAgent** | `src/ai/rl-agent.js` | 实现 Epsilon-Greedy 策略，管理学习过程和数据持久化 |

## 核心功能

### 1. 智能决策

AI 通过以下步骤做出决策：

1. **位置枚举**：遍历所有可能的 X 坐标和旋转状态组合
2. **状态评估**：模拟放置并使用 StateEvaluator 评估结果棋盘
3. **动作选择**：使用 Epsilon-Greedy 策略选择最佳或随机动作
4. **移动生成**：计算从当前位置到目标位置的移动序列

### 2. 强化学习

AI 使用 Epsilon-Greedy 策略在探索和利用之间取得平衡：

- **探索 (Exploration)**：以概率 ε 随机选择动作，发现新的可能性
- **利用 (Exploitation)**：以概率 (1-ε) 选择当前已知最佳动作
- **ε 衰减**：随着学习进行，逐渐减少探索，增加利用

### 3. 数据持久化

学习数据自动保存到 Local Storage，包括：

- 评估权重
- 探索率
- 游戏统计数据
- 历史分数

## 文档目录

| 文档 | 描述 |
|------|------|
| [algorithm.md](./algorithm.md) | 强化学习算法原理和 Epsilon-Greedy 策略说明 |
| [state-evaluation.md](./state-evaluation.md) | 状态评估函数的四个指标和权重参数说明 |
| [tuning-guide.md](./tuning-guide.md) | Epsilon 参数和权重调优指南 |
| [metrics.md](./metrics.md) | 性能指标说明和解读指南 |
| [weight-management.md](./weight-management.md) | 权重重置、导出和导入操作指南 |

## 快速开始

### 启用 AI 模式

```javascript
import { AIController } from './ai/ai-controller.js';
import { RLAgent } from './ai/rl-agent.js';

// 创建 AI 控制器和强化学习代理
const rlAgent = new RLAgent();
const aiController = new AIController(null, rlAgent);

// 启用 AI
aiController.enable();

// 加载之前的学习数据（如果有）
rlAgent.loadFromStorage();
```

### 查看 AI 状态

```javascript
// 获取 AI 状态
const status = rlAgent.getStatus();
console.log(`探索率: ${(status.epsilon * 100).toFixed(1)}%`);
console.log(`已玩: ${status.gamesPlayed} 局`);
console.log(`最高分: ${status.bestScore}`);
console.log(`平均分: ${status.averageScore.toFixed(2)}`);
```

## 相关需求

本文档满足以下需求规范：

- **Requirement 6.1**: AI training documentation SHALL explain the reinforcement learning algorithm used
- **Requirement 6.2**: AI training documentation SHALL document the state evaluation function and its weight parameters
- **Requirement 6.3**: AI training documentation SHALL provide guidelines for tuning the epsilon-greedy parameters
- **Requirement 6.4**: AI training documentation SHALL include performance metrics and how to interpret them
- **Requirement 6.5**: AI training documentation SHALL describe how to reset or export/import learned weights
- **Requirement 6.6**: AI training documentation SHALL be located in docs/ai-training directory
