# 权重管理文档

## 概述

本文档说明如何管理俄罗斯方块 AI 的学习数据，包括重置学习数据、导出权重和导入权重等操作。

## 数据存储结构

### 存储位置

AI 学习数据存储在浏览器的 **Local Storage** 中，使用键名 `tetris-ai-learning-data`。

### 数据结构

```javascript
{
    "weights": {
        "aggregateHeight": -0.510066,
        "completeLines": 0.760666,
        "holes": -0.35663,
        "bumpiness": -0.184483
    },
    "epsilon": 0.5,
    "statistics": {
        "gamesPlayed": 100,
        "totalScore": 150000,
        "bestScore": 5000,
        "totalLinesCleared": 2500,
        "averageScore": 1500
    },
    "scoreHistory": [1200, 1500, 1800, ...],
    "version": "1.0.0",
    "lastUpdated": "2024-01-15T10:30:00.000Z"
}
```

## 重置学习数据

### 方法 1: 完全重置（推荐）

重置所有学习数据到初始状态：

```javascript
import { RLAgent } from './ai/rl-agent.js';

const agent = new RLAgent();

// 清除存储的数据
agent.clearStorage();

// 重置内存中的状态
agent.reset();

console.log('学习数据已完全重置');
console.log(`探索率: ${agent.getEpsilon()}`);  // 1.0
console.log(`已玩局数: ${agent.getStatistics().gamesPlayed}`);  // 0
```


### 方法 2: 仅重置权重

保留统计数据，只重置权重到默认值：

```javascript
import { DEFAULT_WEIGHTS } from './ai/state-evaluator.js';

// 重置权重到默认值
agent.setWeights(DEFAULT_WEIGHTS);

// 可选：重置探索率
agent.setEpsilon(1.0);

// 保存更改
agent.saveToStorage();

console.log('权重已重置，统计数据保留');
```

### 方法 3: 仅清除存储

清除 Local Storage 中的数据，但保留当前内存中的状态：

```javascript
// 仅清除存储
agent.clearStorage();

// 内存中的状态保持不变
console.log(`当前探索率: ${agent.getEpsilon()}`);
```

### 方法 4: 通过浏览器开发者工具

1. 打开浏览器开发者工具 (F12)
2. 切换到 "Application" 或 "存储" 标签
3. 在左侧找到 "Local Storage"
4. 找到并删除 `tetris-ai-learning-data` 键

## 导出学习数据

### 导出到 JSON 文件

```javascript
function exportLearningData(agent) {
    // 获取学习数据
    const data = agent.getLearningData();
    
    // 转换为 JSON 字符串
    const jsonString = JSON.stringify(data, null, 2);
    
    // 创建下载链接
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // 创建下载元素
    const a = document.createElement('a');
    a.href = url;
    a.download = `tetris-ai-weights-${new Date().toISOString().slice(0, 10)}.json`;
    
    // 触发下载
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // 清理 URL
    URL.revokeObjectURL(url);
    
    console.log('学习数据已导出');
}

// 使用示例
exportLearningData(agent);
```


### 导出到剪贴板

```javascript
async function exportToClipboard(agent) {
    const data = agent.getLearningData();
    const jsonString = JSON.stringify(data, null, 2);
    
    try {
        await navigator.clipboard.writeText(jsonString);
        console.log('学习数据已复制到剪贴板');
    } catch (err) {
        console.error('复制失败:', err);
    }
}
```

### 仅导出权重

如果只需要导出权重配置：

```javascript
function exportWeightsOnly(agent) {
    const weights = agent.getWeights();
    const jsonString = JSON.stringify(weights, null, 2);
    
    console.log('当前权重配置:');
    console.log(jsonString);
    
    return jsonString;
}

// 输出示例:
// {
//   "aggregateHeight": -0.510066,
//   "completeLines": 0.760666,
//   "holes": -0.35663,
//   "bumpiness": -0.184483
// }
```

## 导入学习数据

### 从 JSON 文件导入

```javascript
function importLearningData(agent, fileInput) {
    const file = fileInput.files[0];
    
    if (!file) {
        console.error('请选择文件');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            // 导入数据
            if (agent.importLearningData(data)) {
                // 保存到存储
                agent.saveToStorage();
                console.log('学习数据导入成功');
                
                // 显示导入的数据摘要
                const stats = agent.getStatistics();
                console.log(`已玩局数: ${stats.gamesPlayed}`);
                console.log(`平均分: ${stats.averageScore.toFixed(2)}`);
            } else {
                console.error('数据格式无效');
            }
        } catch (err) {
            console.error('解析文件失败:', err);
        }
    };
    
    reader.readAsText(file);
}

// HTML 示例
// <input type="file" id="importFile" accept=".json" />
// <button onclick="importLearningData(agent, document.getElementById('importFile'))">导入</button>
```


### 从剪贴板导入

```javascript
async function importFromClipboard(agent) {
    try {
        const jsonString = await navigator.clipboard.readText();
        const data = JSON.parse(jsonString);
        
        if (agent.importLearningData(data)) {
            agent.saveToStorage();
            console.log('从剪贴板导入成功');
        } else {
            console.error('数据格式无效');
        }
    } catch (err) {
        console.error('导入失败:', err);
    }
}
```

### 仅导入权重

```javascript
function importWeightsOnly(agent, weightsJson) {
    try {
        const weights = JSON.parse(weightsJson);
        
        // 验证权重格式
        const requiredKeys = ['aggregateHeight', 'completeLines', 'holes', 'bumpiness'];
        for (const key of requiredKeys) {
            if (typeof weights[key] !== 'number') {
                throw new Error(`缺少或无效的权重: ${key}`);
            }
        }
        
        // 设置权重
        agent.setWeights(weights);
        agent.saveToStorage();
        
        console.log('权重导入成功');
        console.log(agent.getWeights());
    } catch (err) {
        console.error('导入权重失败:', err);
    }
}

// 使用示例
const weightsJson = `{
    "aggregateHeight": -0.6,
    "completeLines": 1.0,
    "holes": -0.5,
    "bumpiness": -0.2
}`;
importWeightsOnly(agent, weightsJson);
```

## 预设权重配置

### 内置预设

```javascript
const WEIGHT_PRESETS = {
    // 默认配置
    default: {
        aggregateHeight: -0.510066,
        completeLines: 0.760666,
        holes: -0.35663,
        bumpiness: -0.184483
    },
    
    // 激进消行
    aggressive: {
        aggregateHeight: -0.4,
        completeLines: 1.2,
        holes: -0.2,
        bumpiness: -0.1
    },
    
    // 保守稳定
    conservative: {
        aggregateHeight: -0.6,
        completeLines: 0.5,
        holes: -0.8,
        bumpiness: -0.3
    },
    
    // 平衡型
    balanced: {
        aggregateHeight: -0.5,
        completeLines: 0.8,
        holes: -0.4,
        bumpiness: -0.2
    },
    
    // 低高度优先
    lowHeight: {
        aggregateHeight: -0.9,
        completeLines: 0.6,
        holes: -0.3,
        bumpiness: -0.2
    }
};

// 应用预设
function applyPreset(agent, presetName) {
    const preset = WEIGHT_PRESETS[presetName];
    
    if (!preset) {
        console.error(`未知预设: ${presetName}`);
        return false;
    }
    
    agent.setWeights(preset);
    agent.saveToStorage();
    
    console.log(`已应用预设: ${presetName}`);
    return true;
}

// 使用示例
applyPreset(agent, 'aggressive');
```


## 数据备份策略

### 自动备份

```javascript
class AutoBackup {
    constructor(agent, backupInterval = 10) {
        this.agent = agent;
        this.backupInterval = backupInterval;  // 每N局备份一次
        this.backupKey = 'tetris-ai-backup';
    }
    
    // 检查是否需要备份
    shouldBackup() {
        const stats = this.agent.getStatistics();
        return stats.gamesPlayed % this.backupInterval === 0;
    }
    
    // 执行备份
    backup() {
        const data = this.agent.getLearningData();
        const backup = {
            data,
            timestamp: new Date().toISOString()
        };
        
        try {
            localStorage.setItem(this.backupKey, JSON.stringify(backup));
            console.log('自动备份完成');
            return true;
        } catch (err) {
            console.error('备份失败:', err);
            return false;
        }
    }
    
    // 从备份恢复
    restore() {
        try {
            const backupStr = localStorage.getItem(this.backupKey);
            if (!backupStr) {
                console.log('没有找到备份');
                return false;
            }
            
            const backup = JSON.parse(backupStr);
            if (this.agent.importLearningData(backup.data)) {
                console.log(`从备份恢复成功 (${backup.timestamp})`);
                return true;
            }
        } catch (err) {
            console.error('恢复失败:', err);
        }
        return false;
    }
}

// 使用示例
const autoBackup = new AutoBackup(agent, 10);

// 在游戏结束时检查并备份
function onGameOver() {
    agent.recordGame(score, linesCleared);
    
    if (autoBackup.shouldBackup()) {
        autoBackup.backup();
    }
}
```

## 数据迁移

### 版本迁移

当数据格式更新时，可能需要迁移旧数据：

```javascript
function migrateData(oldData) {
    // 检查版本
    const version = oldData.version || '0.0.0';
    
    // 版本 0.x.x -> 1.0.0 迁移
    if (version.startsWith('0.')) {
        // 添加新字段
        if (!oldData.statistics.totalLinesCleared) {
            oldData.statistics.totalLinesCleared = 0;
        }
        
        // 更新版本号
        oldData.version = '1.0.0';
    }
    
    return oldData;
}
```

## 故障排除

### 常见问题

#### Q1: 数据无法保存

**可能原因**：
- Local Storage 已满
- 浏览器隐私模式
- 浏览器设置禁用了 Local Storage

**解决方案**：
```javascript
// 检查 Local Storage 是否可用
function isStorageAvailable() {
    try {
        const test = '__storage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch (e) {
        return false;
    }
}

if (!isStorageAvailable()) {
    console.warn('Local Storage 不可用，数据将不会被保存');
}
```

#### Q2: 导入的数据无效

**解决方案**：
```javascript
// 验证数据格式
function validateLearningData(data) {
    const errors = [];
    
    if (!data.weights) {
        errors.push('缺少 weights 字段');
    }
    
    if (typeof data.epsilon !== 'number') {
        errors.push('epsilon 必须是数字');
    }
    
    if (!data.statistics) {
        errors.push('缺少 statistics 字段');
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}
```

#### Q3: 数据损坏

**解决方案**：
```javascript
// 尝试修复损坏的数据
function repairData(agent) {
    // 重置到默认值
    agent.reset();
    
    // 清除损坏的存储
    agent.clearStorage();
    
    console.log('数据已重置');
}
```

## 相关需求

本文档满足以下需求规范：

- **Requirement 6.5**: AI training documentation SHALL describe how to reset or export/import learned weights

## 参考资料

- [metrics.md](./metrics.md) - 性能指标说明
- [tuning-guide.md](./tuning-guide.md) - 调优指南
- [MDN: Window.localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
