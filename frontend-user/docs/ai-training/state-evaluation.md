# 状态评估函数文档

## 概述

状态评估函数是 AI 决策系统的核心组件，负责评估棋盘状态的质量。通过分析棋盘的多个特征，计算一个综合分数，用于比较不同放置位置的优劣。

## 评估指标

状态评估器使用**四个关键指标**来评估棋盘状态：

```
┌─────────────────────────────────────────────────────────────┐
│                    四个评估指标                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │  聚合高度        │    │  完整行数        │                │
│  │  Aggregate      │    │  Complete       │                │
│  │  Height         │    │  Lines          │                │
│  │  (越低越好)      │    │  (越多越好)      │                │
│  └─────────────────┘    └─────────────────┘                │
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │  空洞数          │    │  凹凸度          │                │
│  │  Holes          │    │  Bumpiness      │                │
│  │  (越少越好)      │    │  (越小越好)      │                │
│  └─────────────────┘    └─────────────────┘                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1. 聚合高度 (Aggregate Height)

**定义**：所有列高度的总和。

**计算方法**：
```
聚合高度 = Σ(每列的高度)
```

**示例**：
```
列:    0  1  2  3  4  5  6  7  8  9
高度:  3  1  2  0  5  4  2  1  0  3

聚合高度 = 3 + 1 + 2 + 0 + 5 + 4 + 2 + 1 + 0 + 3 = 21
```

**影响**：
- 聚合高度越低，棋盘越"干净"
- 高聚合高度意味着游戏接近结束
- **权重为负值**：高度越高，分数越低

**代码实现**：
```javascript
calculateAggregateHeight(board) {
    const heights = this._getColumnHeights(board);
    return heights.reduce((sum, height) => sum + height, 0);
}
```

### 2. 完整行数 (Complete Lines)

**定义**：完全填满的行数。

**计算方法**：
```
完整行数 = 所有单元格都被填充的行的数量
```

**示例**：
```
行 19: [■][■][■][■][■][■][■][■][■][■]  ← 完整行
行 18: [■][■][■][■][□][■][■][■][■][■]  ← 不完整（有空格）
行 17: [■][■][■][■][■][■][■][■][■][■]  ← 完整行

完整行数 = 2
```

**影响**：
- 完整行会被消除并得分
- 消除多行可获得更高分数（连消奖励）
- **权重为正值**：完整行越多，分数越高

**代码实现**：
```javascript
calculateCompleteLines(board) {
    let completeLines = 0;
    for (let y = 0; y < board.length; y++) {
        let isComplete = true;
        for (let x = 0; x < board[y].length; x++) {
            if (board[y][x] === 0) {
                isComplete = false;
                break;
            }
        }
        if (isComplete) {
            completeLines++;
        }
    }
    return completeLines;
}
```

### 3. 空洞数 (Holes)

**定义**：上方有方块覆盖的空单元格数量。

**计算方法**：
```
对于每一列：
    从上到下扫描
    找到第一个填充的单元格后
    之后遇到的每个空单元格都计为一个空洞
```

**示例**：
```
列 0:
  行 0-16: □ (空)
  行 17:   ■ (填充) ← 第一个方块
  行 18:   □ (空)   ← 空洞！
  行 19:   ■ (填充)

该列有 1 个空洞
```

**可视化**：
```
     0 1 2 3 4 5 6 7 8 9
  ┌─────────────────────┐
17│ ■ □ □ □ ■ □ □ □ □ □ │
18│ ○ □ □ □ ■ □ □ □ □ □ │  ○ = 空洞
19│ ■ □ □ □ ■ □ □ □ □ □ │
  └─────────────────────┘

空洞数 = 1
```

**影响**：
- 空洞会阻碍行消除
- 必须先填充空洞才能消除包含空洞的行
- 空洞越多，游戏越难进行
- **权重为负值**：空洞越多，分数越低

**代码实现**：
```javascript
calculateHoles(board) {
    let holes = 0;
    for (let x = 0; x < board[0].length; x++) {
        let foundBlock = false;
        for (let y = 0; y < board.length; y++) {
            if (board[y][x] !== 0) {
                foundBlock = true;
            } else if (foundBlock) {
                holes++;
            }
        }
    }
    return holes;
}
```

### 4. 凹凸度 (Bumpiness)

**定义**：相邻列高度差的绝对值之和。

**计算公式**：
```
凹凸度 = |h[0] - h[1]| + |h[1] - h[2]| + ... + |h[8] - h[9]|
```

**示例**：
```
列:    0  1  2  3  4  5  6  7  8  9
高度:  3  1  2  2  5  4  2  1  0  3

凹凸度 = |3-1| + |1-2| + |2-2| + |2-5| + |5-4| + |4-2| + |2-1| + |1-0| + |0-3|
       = 2 + 1 + 0 + 3 + 1 + 2 + 1 + 1 + 3
       = 14
```

**可视化**：
```
高度
  5 │       ■
  4 │       ■ ■
  3 │ ■           ■               ■
  2 │ ■   ■ ■     ■ ■
  1 │ ■ ■ ■ ■     ■ ■ ■
  0 │ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■
    └─────────────────────────
      0 1 2 3 4 5 6 7 8 9

凹凸度高 = 表面不平整
```

**影响**：
- 凹凸度反映棋盘表面的平整程度
- 平整的表面更容易放置方块
- 不平整的表面会产生更多空洞
- **权重为负值**：凹凸度越大，分数越低

**代码实现**：
```javascript
calculateBumpiness(board) {
    const heights = this._getColumnHeights(board);
    let bumpiness = 0;
    for (let i = 0; i < heights.length - 1; i++) {
        bumpiness += Math.abs(heights[i] - heights[i + 1]);
    }
    return bumpiness;
}
```

## 权重参数

### 默认权重

```javascript
const DEFAULT_WEIGHTS = {
    aggregateHeight: -0.510066,  // 负值：高度越高越不好
    completeLines:    0.760666,  // 正值：完整行越多越好
    holes:           -0.35663,   // 负值：空洞越多越不好
    bumpiness:       -0.184483   // 负值：凹凸度越大越不好
};
```

### 权重含义

| 权重 | 值 | 符号 | 含义 |
|------|-----|------|------|
| `aggregateHeight` | -0.510066 | 负 | 每增加1单位高度，分数降低约0.51 |
| `completeLines` | 0.760666 | 正 | 每增加1个完整行，分数增加约0.76 |
| `holes` | -0.35663 | 负 | 每增加1个空洞，分数降低约0.36 |
| `bumpiness` | -0.184483 | 负 | 每增加1单位凹凸度，分数降低约0.18 |

### 权重的相对重要性

```
重要性排序（绝对值）：

完整行数    ████████████████████████████████  0.76
聚合高度    ██████████████████████████        0.51
空洞数      ██████████████████                0.36
凹凸度      ██████████████                    0.18
```

这意味着：
1. **完整行数**最重要 - AI 优先考虑消行
2. **聚合高度**次之 - AI 尽量保持低高度
3. **空洞数**第三 - AI 避免产生空洞
4. **凹凸度**最后 - AI 倾向于平整表面

## 评估分数计算

### 计算公式

```
分数 = w₁ × 聚合高度 + w₂ × 完整行数 + w₃ × 空洞数 + w₄ × 凹凸度
```

### 计算示例

假设棋盘状态：
- 聚合高度 = 30
- 完整行数 = 2
- 空洞数 = 3
- 凹凸度 = 8

```
分数 = (-0.510066 × 30) + (0.760666 × 2) + (-0.35663 × 3) + (-0.184483 × 8)
     = -15.30198 + 1.521332 + (-1.06989) + (-1.475864)
     = -16.326402
```

### 代码实现

```javascript
evaluate(board) {
    const aggregateHeight = this.calculateAggregateHeight(board);
    const completeLines = this.calculateCompleteLines(board);
    const holes = this.calculateHoles(board);
    const bumpiness = this.calculateBumpiness(board);
    
    const score = 
        this.weights.aggregateHeight * aggregateHeight +
        this.weights.completeLines * completeLines +
        this.weights.holes * holes +
        this.weights.bumpiness * bumpiness;
    
    return isNaN(score) ? 0 : score;
}
```

## 使用示例

### 基本使用

```javascript
import { StateEvaluator } from './ai/state-evaluator.js';

const evaluator = new StateEvaluator();

// 评估棋盘状态
const score = evaluator.evaluate(board);
console.log(`评估分数: ${score}`);

// 获取详细指标
const metrics = evaluator.getAllMetrics(board);
console.log(`聚合高度: ${metrics.aggregateHeight}`);
console.log(`完整行数: ${metrics.completeLines}`);
console.log(`空洞数: ${metrics.holes}`);
console.log(`凹凸度: ${metrics.bumpiness}`);
```

### 自定义权重

```javascript
// 创建更重视消行的评估器
const aggressiveEvaluator = new StateEvaluator({
    aggregateHeight: -0.4,
    completeLines: 1.0,    // 增加完整行权重
    holes: -0.3,
    bumpiness: -0.15
});

// 创建更保守的评估器（避免空洞）
const conservativeEvaluator = new StateEvaluator({
    aggregateHeight: -0.6,
    completeLines: 0.6,
    holes: -0.6,           // 增加空洞惩罚
    bumpiness: -0.3
});
```

### 动态调整权重

```javascript
// 获取当前权重
const currentWeights = evaluator.getWeights();

// 修改权重
currentWeights.completeLines = 0.9;
evaluator.setWeights(currentWeights);
```

## 权重调优建议

详细的调优指南请参考 [tuning-guide.md](./tuning-guide.md)。

### 快速参考

| 目标 | 调整建议 |
|------|----------|
| 更积极消行 | 增加 `completeLines` 权重 |
| 避免空洞 | 增加 `holes` 权重的绝对值 |
| 保持低高度 | 增加 `aggregateHeight` 权重的绝对值 |
| 平整表面 | 增加 `bumpiness` 权重的绝对值 |

## 相关需求

本文档满足以下需求规范：

- **Requirement 6.2**: AI training documentation SHALL document the state evaluation function and its weight parameters

## 参考资料

- [Tetris AI - The (Near) Perfect Bot](https://codemyroad.wordpress.com/2013/04/14/tetris-ai-the-near-perfect-player/)
- [Building a Tetris AI](https://www.youtube.com/watch?v=xLnSUxP9YjA)
