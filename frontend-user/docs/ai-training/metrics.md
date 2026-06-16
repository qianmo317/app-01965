# 性能指标文档

## 概述

本文档说明了俄罗斯方块 AI 系统的各项性能指标，以及如何解读这些指标来评估 AI 的学习效果和游戏表现。

## 统计指标

### 基础统计

| 指标 | 说明 | 获取方法 |
|------|------|----------|
| `gamesPlayed` | 已玩游戏次数 | `agent.getStatistics().gamesPlayed` |
| `totalScore` | 总分数 | `agent.getStatistics().totalScore` |
| `bestScore` | 最高分 | `agent.getStatistics().bestScore` |
| `totalLinesCleared` | 总消行数 | `agent.getStatistics().totalLinesCleared` |
| `averageScore` | 平均分 | `agent.getStatistics().averageScore` |

### 学习状态指标

| 指标 | 说明 | 获取方法 |
|------|------|----------|
| `epsilon` | 当前探索率 | `agent.getEpsilon()` |
| `learningRate` | 学习率 | `agent.getLearningRate()` |
| `recentAverageScore` | 最近N局平均分 | `agent.getRecentAverageScore(n)` |

### 代码示例

```javascript
// 获取完整状态
const status = agent.getStatus();

console.log('=== AI 性能报告 ===');
console.log(`已玩游戏: ${status.gamesPlayed} 局`);
console.log(`当前探索率: ${(status.epsilon * 100).toFixed(1)}%`);
console.log(`平均分: ${status.averageScore.toFixed(2)}`);
console.log(`最高分: ${status.bestScore}`);
console.log(`总消行数: ${status.totalLinesCleared}`);
console.log(`最近10局平均: ${status.recentAverageScore.toFixed(2)}`);
```

## 指标解读

### 1. 探索率 (Epsilon)

**含义**：AI 随机选择动作的概率

**解读指南**：

| 探索率范围 | 学习阶段 | 预期表现 |
|-----------|----------|----------|
| 0.8 - 1.0 | 初期探索 | 表现不稳定，分数波动大 |
| 0.3 - 0.8 | 中期学习 | 逐渐稳定，开始利用学到的知识 |
| 0.1 - 0.3 | 后期优化 | 表现稳定，偶尔探索 |
| 0.01 - 0.1 | 成熟阶段 | 主要利用最佳策略 |

**可视化**：
```
探索率与学习阶段

  1.0 ├────●
      │     ╲  初期探索
      │      ╲
  0.5 ├────────●
      │         ╲  中期学习
      │          ╲
  0.1 ├───────────●────  后期优化/成熟
      │
      └────────────────▶ 游戏局数
```

### 2. 平均分 (Average Score)

**含义**：所有游戏的平均得分

**解读指南**：

| 平均分范围 | 评价 | 建议 |
|-----------|------|------|
| < 500 | 初学者 | 继续训练，检查权重配置 |
| 500 - 1500 | 入门级 | 正常学习中，保持训练 |
| 1500 - 3000 | 中级 | 表现良好，可以微调参数 |
| 3000 - 5000 | 高级 | 优秀表现，接近最优 |
| > 5000 | 专家级 | 非常优秀的 AI |

**趋势分析**：
```
平均分趋势

分数
  │
5000├                    ●────  专家级
    │                   ╱
3000├              ●───╱        高级
    │             ╱
1500├        ●───╱              中级
    │       ╱
 500├   ●──╱                    入门级
    │  ╱
    └──────────────────────▶ 游戏局数
       100  200  300  400
```

### 3. 最高分 (Best Score)

**含义**：单局游戏的最高得分

**解读指南**：

- **最高分 >> 平均分**：AI 有潜力，但表现不稳定
- **最高分 ≈ 平均分**：AI 表现稳定
- **最高分长期不变**：可能陷入局部最优

**建议**：
```javascript
// 检查最高分与平均分的比例
const stats = agent.getStatistics();
const ratio = stats.bestScore / stats.averageScore;

if (ratio > 3) {
    console.log('表现不稳定，建议降低探索率');
} else if (ratio < 1.5) {
    console.log('表现稳定，可能需要更多探索');
} else {
    console.log('表现良好');
}
```

### 4. 最近平均分 (Recent Average Score)

**含义**：最近 N 局游戏的平均得分

**解读指南**：

| 比较 | 含义 | 建议 |
|------|------|------|
| 最近平均 > 总平均 | AI 在进步 | 继续当前策略 |
| 最近平均 ≈ 总平均 | AI 稳定 | 可以尝试微调 |
| 最近平均 < 总平均 | AI 可能退步 | 检查参数配置 |

**代码示例**：
```javascript
const stats = agent.getStatistics();
const recentAvg = agent.getRecentAverageScore(20);

const improvement = ((recentAvg - stats.averageScore) / stats.averageScore * 100).toFixed(1);

if (improvement > 10) {
    console.log(`AI 正在进步！最近表现提升 ${improvement}%`);
} else if (improvement < -10) {
    console.log(`AI 表现下降 ${Math.abs(improvement)}%，需要检查配置`);
} else {
    console.log('AI 表现稳定');
}
```

### 5. 总消行数 (Total Lines Cleared)

**含义**：所有游戏中消除的总行数

**衍生指标**：

```javascript
// 每局平均消行数
const avgLines = stats.totalLinesCleared / stats.gamesPlayed;

// 消行效率（每分对应的消行数）
const lineEfficiency = stats.totalLinesCleared / stats.totalScore;
```

**解读**：

| 每局平均消行 | 评价 |
|-------------|------|
| < 10 | 需要改进 |
| 10 - 20 | 一般 |
| 20 - 40 | 良好 |
| > 40 | 优秀 |

## 性能监控

### 实时监控面板

```javascript
function displayPerformancePanel(agent) {
    const status = agent.getStatus();
    const stats = agent.getStatistics();
    
    console.log('╔════════════════════════════════════════╗');
    console.log('║          AI 性能监控面板               ║');
    console.log('╠════════════════════════════════════════╣');
    console.log(`║ 探索率:     ${(status.epsilon * 100).toFixed(1).padStart(6)}%              ║`);
    console.log(`║ 已玩局数:   ${String(stats.gamesPlayed).padStart(6)} 局              ║`);
    console.log('╠════════════════════════════════════════╣');
    console.log(`║ 平均分:     ${String(Math.round(stats.averageScore)).padStart(6)}                 ║`);
    console.log(`║ 最高分:     ${String(stats.bestScore).padStart(6)}                 ║`);
    console.log(`║ 最近10局:   ${String(Math.round(status.recentAverageScore)).padStart(6)}                 ║`);
    console.log('╠════════════════════════════════════════╣');
    console.log(`║ 总消行:     ${String(stats.totalLinesCleared).padStart(6)} 行              ║`);
    console.log(`║ 每局消行:   ${(stats.totalLinesCleared / stats.gamesPlayed).toFixed(1).padStart(6)} 行              ║`);
    console.log('╚════════════════════════════════════════╝');
}
```

### 学习曲线分析

```javascript
function analyzeLearningCurve(agent) {
    const history = agent.getScoreHistory();
    
    if (history.length < 20) {
        console.log('数据不足，需要更多游戏记录');
        return;
    }
    
    // 计算不同阶段的平均分
    const early = history.slice(0, Math.floor(history.length / 3));
    const middle = history.slice(Math.floor(history.length / 3), Math.floor(history.length * 2 / 3));
    const recent = history.slice(Math.floor(history.length * 2 / 3));
    
    const earlyAvg = early.reduce((a, b) => a + b, 0) / early.length;
    const middleAvg = middle.reduce((a, b) => a + b, 0) / middle.length;
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    
    console.log('=== 学习曲线分析 ===');
    console.log(`早期平均分: ${earlyAvg.toFixed(0)}`);
    console.log(`中期平均分: ${middleAvg.toFixed(0)}`);
    console.log(`近期平均分: ${recentAvg.toFixed(0)}`);
    
    if (recentAvg > middleAvg && middleAvg > earlyAvg) {
        console.log('✓ 学习曲线正常上升');
    } else if (recentAvg < middleAvg) {
        console.log('⚠ 近期表现下降，建议检查参数');
    } else {
        console.log('→ 学习趋于稳定');
    }
}
```

## 性能基准

### 参考基准

| 指标 | 初学者 | 中级 | 高级 | 专家 |
|------|--------|------|------|------|
| 平均分 | < 500 | 500-1500 | 1500-3000 | > 3000 |
| 最高分 | < 1000 | 1000-3000 | 3000-8000 | > 8000 |
| 每局消行 | < 10 | 10-20 | 20-40 | > 40 |
| 训练局数 | 0-50 | 50-200 | 200-500 | > 500 |

### 性能评估函数

```javascript
function evaluatePerformance(agent) {
    const stats = agent.getStatistics();
    
    let level = '初学者';
    let score = 0;
    
    // 基于平均分评估
    if (stats.averageScore >= 3000) {
        level = '专家';
        score += 40;
    } else if (stats.averageScore >= 1500) {
        level = '高级';
        score += 30;
    } else if (stats.averageScore >= 500) {
        level = '中级';
        score += 20;
    } else {
        score += 10;
    }
    
    // 基于稳定性评估
    const stability = stats.averageScore / stats.bestScore;
    if (stability > 0.5) {
        score += 20;
    } else if (stability > 0.3) {
        score += 10;
    }
    
    // 基于消行效率评估
    const linesPerGame = stats.totalLinesCleared / stats.gamesPlayed;
    if (linesPerGame > 40) {
        score += 20;
    } else if (linesPerGame > 20) {
        score += 10;
    }
    
    // 基于训练量评估
    if (stats.gamesPlayed > 500) {
        score += 20;
    } else if (stats.gamesPlayed > 200) {
        score += 10;
    }
    
    return {
        level,
        score,
        maxScore: 100,
        details: {
            averageScore: stats.averageScore,
            stability: (stability * 100).toFixed(1) + '%',
            linesPerGame: linesPerGame.toFixed(1),
            gamesPlayed: stats.gamesPlayed
        }
    };
}
```

## 导出性能报告

```javascript
function generatePerformanceReport(agent) {
    const stats = agent.getStatistics();
    const status = agent.getStatus();
    const evaluation = evaluatePerformance(agent);
    
    const report = {
        generatedAt: new Date().toISOString(),
        summary: {
            level: evaluation.level,
            overallScore: `${evaluation.score}/${evaluation.maxScore}`
        },
        statistics: {
            gamesPlayed: stats.gamesPlayed,
            averageScore: Math.round(stats.averageScore),
            bestScore: stats.bestScore,
            totalLinesCleared: stats.totalLinesCleared,
            linesPerGame: (stats.totalLinesCleared / stats.gamesPlayed).toFixed(1)
        },
        learningState: {
            epsilon: status.epsilon,
            learningRate: status.learningRate,
            recentAverageScore: Math.round(status.recentAverageScore)
        },
        weights: agent.getWeights()
    };
    
    return JSON.stringify(report, null, 2);
}

// 使用示例
const report = generatePerformanceReport(agent);
console.log(report);
```

## 相关需求

本文档满足以下需求规范：

- **Requirement 6.4**: AI training documentation SHALL include performance metrics and how to interpret them

## 参考资料

- [tuning-guide.md](./tuning-guide.md) - 调优指南
- [algorithm.md](./algorithm.md) - 算法说明
- [weight-management.md](./weight-management.md) - 权重管理
