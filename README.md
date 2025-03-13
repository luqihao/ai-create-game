# AI 制作游戏集合 (Game Collection)

这是一个使用现代 Web 技术构建的游戏集合项目，目前包含孔明棋（Peg Solitaire）、消消乐（Match Three）和红包雨（Red Packet Rain）等经典游戏。

## 技术栈

-   React
-   TypeScript
-   Vite
-   Three.js
-   HTML5 Canvas

## 功能特点

-   3D 孔明棋游戏实现
    -   完整的 3D 棋盘和棋子
    -   炫酷的跳跃和爆炸动画
    -   智能移动提示系统
-   经典消消乐游戏
    -   计时挑战模式
    -   流畅的消除动画
    -   分数统计系统
-   红包雨游戏
    -   60 秒倒计时
    -   红包分为大中小和炸弹红包，点击大红包+5 分，点击中红包+3 分，点击小红包+1 分，点击炸弹-3 分
    -   点击红包有爆炸效果，并在爆炸位置显示加分
    -   红包掉落速度随着倒计时加快，分为 3 个阶段
-   响应式设计
-   现代化的用户界面
-   游戏卡片展示系统

## 开始使用

### 环境要求

-   Node.js (14.x 或更高版本)
-   npm 或 yarn

### 安装

1. 克隆项目到本地：

```bash
git clone [你的仓库URL]
cd kongmingqi
```

2. 安装依赖：

```bash
npm install
# 或
yarn install
```

3. 启动开发服务器：

```bash
npm run dev
# 或
yarn dev
```

4. 在浏览器中访问 `http://localhost:3000`

### 构建

```bash
npm run build
# 或
yarn build
```

## 项目结构

```
src/
├── components/     # 可重用组件
│   └── GameNavigation/  # 游戏导航组件
├── games/         # 游戏实现
│   ├── peg-solitaire/  # 孔明棋游戏
│   └── MatchThree/     # 消消乐游戏
├── pages/         # 页面组件
│   └── HomePage/  # 首页组件
├── assets/        # 静态资源和工具函数
└── styles/        # 全局样式定义
```

## 已实现的游戏

-   孔明棋 (Peg Solitaire)
    -   经典的单人智力游戏
    -   3D 游戏效果
    -   智能移动提示
-   消消乐 (Match Three)
    -   限时三消游戏
    -   流畅的动画效果
    -   计分系统
-   红包雨 (Red Packet Rain)
    -   60 秒倒计时
    -   红包分为大中小和炸弹红包，点击大红包+5 分，点击中红包+3 分，点击小红包+1 分，点击炸弹-3 分
    -   点击红包有爆炸效果，并在爆炸位置显示加分
    -   红包掉落速度随着倒计时加快，分为 3 个阶段
-   大转盘抽奖 (Wheel of Fortune)
    -   炫酷的转盘旋转动画效果
    -   可自定义奖品和概率
    -   带有指针指示器
    -   抽奖结果展示
-   更多游戏正在开发中...

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

[MIT License](LICENSE)
