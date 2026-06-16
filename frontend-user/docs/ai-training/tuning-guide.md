# AI 调优指南

## 概述

本指南提供了调优俄罗斯方块 AI 的详细建议，包括 Epsilon-Greedy 参数调优和评估权重调整。通过合理的参数调优，可以显著提升 AI 的游戏表现。

## Epsilon 参数调优

### 参数说明

| 参数 | 默认值 | 范围 | 说明 |
|------|--------|------|------|
| `epsilon` | 1.0 | [0, 1] | 初始探索率 |
| `epsilonMin` | 0.01 | [0, 1] | 最小探索率 |
| `epsilonDecay` | 0.995 | (0, 1) | 衰减系数 |

### 探索率 (epsilon) 调优

#### 高探索率 (ε > 0.5)

**特点**：
- 大量随机尝试
- 发现新策略的机会多
- 短期表现不稳定

**适用场景**：
- 学习初期
- 需要跳出局部最优
- 测试新的权重配置

**配置示例**：
```javascript
const agent = new RLAgent({
    epsilon: 0.8,      // 80% 探索
    epsilonMin: 0.1,   // 最低保持 10% 探索
    epsilonDecay: 0.99 // 较慢衰减
});
```

#### 低探索率 (ε < 0.2)

**特点**：
- 主要利用已知最佳策略
- 表现稳定
- 可能陷入局部最优

**适用场景**：
- 学习后期
- 需要稳定表现
- 展示 AI 能力

**配置示例**：
```javascript
const agent = new RLAgent({
    epsilon: 0.1,       // 10% 探索
    epsilonMin: 0.01,   // 最低 1% 探索
    epsilonDecay: 0.999 // 非常慢的衰减
});
```

### 衰减系数 (epsilonDecay) 调优

衰减系数决定了从探索到利用的过渡速度。

#### 快速衰减 (decay < 0.99)

```
探索率
  1.0 ├────●
      │     ╲
      │      ╲
      │       ╲
  0.5 ├────────●
      │         ╲
      │          ╲
  0.1 ├───────────●────
      │
      └────────────────▶ 游戏局数
           50   100  150
```

**特点**：
- 快速收敛到利用模式
- 学习时间短
- 可能错过更好的策略

**配置**：
```javascript
epsilonDecay: 0.98  // 约 100 局后 ε ≈ 0.13
```

#### 慢速衰减 (decay > 0.995)

```
探索率
  1.0 ├────●
      │     ╲
      │      ╲
      │       ╲
  0.5 ├────────────●
      │             ╲
      │              ╲
  0.1 ├───────────────────●
      │
      └────────────────────▶ 游戏局数
          100  200  300  400
```

**特点**：
- 长时间保持探索
- 更全面地搜索策略空间
- 需要更多训练时间

**配置**：
```javascript
epsilonDecay: 0.998  // 约 500 局后 ε ≈ 0.37
```

### 推荐配置

| 场景 | epsilon | epsilonMin | epsilonDecay |
|------|---------|------------|--------------|
| **快速学习** | 1.0 | 0.05 | 0.98 |
| **平衡学习** | 1.0 | 0.01 | 0.995 |
| **深度学习** | 1.0 | 0.01 | 0.999 |
| **微调模式** | 0.2 | 0.01 | 0.99 |
| **展示模式** | 0.05 | 0.01 | 1.0 |

## 权重调优

### 权重参数说明

| 权重 | 默认值 | 建议范围 | 影响 |
|------|--------|----------|------|
| `aggregateHeight` | -0.510066 | [-1.0, 0] | 控制高度敏感度 |
| `completeLines` | 0.760666 | [0, 2.0] | 控制消行积极性 |
| `holes` | -0.35663 | [-1.0, 0] | 控制空洞惩罚 |
| `bumpiness` | -0.184483 | [-0.5, 0] | 控制平整度偏好 |

### 调优策略

#### 策略 1: 激进消行

**目标**：优先消除行，即使产生一些空洞

**权重配置**：
```javascript
const aggressiveWeights = {
    aggregateHeight: -0.4,
    completeLines: 1.2,    // 大幅增加
    holes: -0.2,           // 降低惩罚
    bumpiness: -0.1
};
```

**效果**：
- 更频繁地消行
- 可能产生更多空洞
- 适合追求高分的场景

#### 策略 2: 保守稳定

**目标**：避免空洞，保持棋盘整洁

**权重配置**：
```javascript
const conservativeWeights = {
    aggregateHeight: -0.6,
    completeLines: 0.5,
    holes: -0.8,           // 大幅增加惩罚
    bumpiness: -0.3
};
```

**效果**：
- 很少产生空洞
- 消行频率降低
- 游戏持续时间更长

#### 策略 3: 平衡型

**目标**：在消行和稳定之间取得平衡

**权重配置**：
```javascript
const balancedWeights = {
    aggregateHeight: -0.5,
    completeLines: 0.8,
    holes: -0.4,
    bumpiness: -0.2
};
```

**效果**：
- 适度消行
- 控制空洞数量
- 综合表现良好

#### 策略 4: 低高度优先

**目标**：保持尽可能低的高度

**权重配置**：
```javascript
const lowHeightWeights = {
    aggregateHeight: -0.9,  // 大幅增加
    completeLines: 0.6,
    holes: -0.3,
    bumpiness: -0.2
};
```

**效果**：
- 棋盘高度保持很低
- 游戏更安全
- 可能错过一些消行机会

### 权重调优流程

```
┌─────────────────────────────────────────────────────────────┐
│                    权重调优流程                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 确定优化目标                                            │
│     │                                                       │
│     ├──▶ 高分？ → 增加 completeLines                        │
│     ├──▶ 稳定？ → 增加 holes 惩罚                           │
│     └──▶ 安全？ → 增加 aggregateHeight 惩罚                 │
│     │                                                       │
│     ▼                                                       │
│  2. 调整权重                                                │
│     │                                                       │
│     ▼                                                       │
│  3. 运行测试（至少 50 局）                                   │
│     │                                                       │
│     ▼                                                       │
│  4. 分析结果                                                │
│     │                                                       │
│     ├──▶ 满意？ → 保存权重                                  │
│     │                                                       │
│     └──▶ 不满意？ → 返回步骤 2                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 调优代码示例

```javascript
import { RLAgent } from './ai/rl-agent.js';
import { StateEvaluator } from './ai/state-evaluator.js';
import { AIController } from './ai/ai-controller.js';

// 创建自定义权重的评估器
const customWeights = {
    aggregateHeight: -0.6,
    completeLines: 1.0,
    holes: -0.5,
    bumpiness: -0.2
};

const evaluator = new StateEvaluator(customWeights);
const rlAgent = new RLAgent({
    epsilon: 0.3,
    epsilonDecay: 0.99
});

// 同步权重到 RLAgent
rlAgent.setWeights(customWeights);

const aiController = new AIController(evaluator, rlAgent);
aiController.enable();
```

## 调优实验记录

### 实验模板

建议使用以下模板记录调优实验：

```markdown
## 实验 #N

**日期**: YYYY-MM-DD

**目标**: [描述优化目标]

**配置**:
- epsilon: X.XX
- epsilonDecay: X.XXX
- weights:
  - aggregateHeight: -X.XX
  - completeLines: X.XX
  - holes: -X.XX
  - bumpiness: -X.XX

**测试局数**: XX

**结果**:
- 平均分: XXXX
- 最高分: XXXX
- 平均消行: XX
- 平均空洞: X.X

**结论**: [分析和下一步计划]
```

### 示例实验记录

```markdown
## 实验 #1

**日期**: 2024-01-15

**目标**: 测试激进消行策略

**配置**:
- epsilon: 0.1
- epsilonDecay: 0.995
- weights:
  - aggregateHeight: -0.4
  - completeLines: 1.2
  - holes: -0.2
  - bumpiness: -0.1

**测试局数**: 100

**结果**:
- 平均分: 2500
- 最高分: 8000
- 平均消行: 25
- 平均空洞: 4.2

**结论**: 消行频率提高，但空洞过多导致游戏提前结束。
下一步：增加 holes 惩罚到 -0.4
```

## 常见问题

### Q1: AI 总是产生很多空洞

**原因**：`holes` 权重的绝对值太小

**解决方案**：
```javascript
// 增加空洞惩罚
weights.holes = -0.6;  // 从 -0.35 增加到 -0.6
```

### Q2: AI 不积极消行

**原因**：`completeLines` 权重太小

**解决方案**：
```javascript
// 增加消行奖励
weights.completeLines = 1.0;  // 从 0.76 增加到 1.0
```

### Q3: AI 表现不稳定

**原因**：探索率太高或衰减太慢

**解决方案**：
```javascript
// 降低探索率
agent.setEpsilon(0.1);
// 或加快衰减
epsilonDecay: 0.98;
```

### Q4: AI 陷入局部最优

**原因**：探索率太低

**解决方案**：
```javascript
// 重置探索率
agent.setEpsilon(0.5);
// 或增加最小探索率
epsilonMin: 0.05;
```

## 相关需求

本文档满足以下需求规范：

- **Requirement 6.3**: AI training documentation SHALL provide guidelines for tuning the epsilon-greedy parameters

## 参考资料

- [state-evaluation.md](./state-evaluation.md) - 状态评估函数详解
- [algorithm.md](./algorithm.md) - 强化学习算法说明
- [metrics.md](./metrics.md) - 性能指标解读
