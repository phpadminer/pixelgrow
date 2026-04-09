# PixelGrow

> 孩子人生的数字孪生 - 成长型现实RPG

PixelGrow 将孩子的真实日常生活映射为像素风虚拟世界中的冒险旅程。通过 AI 驱动的游戏化机制、ESP32 硬件交互、3D 打印和社交系统，让孩子在"玩"的过程中自然养成良好习惯。

## 核心特性

- **3D 数字分身** - 像素风角色，随习惯养成多维度成长
- **四维任务系统** - 学习 / 生活 / 社交 / 惊喜，多种验证方式
- **AI 知识场景** - 同步课本进度，"教分身知识"的费曼学习法
- **作文变动漫** - AI 将孩子作文转为动漫短片
- **GPS 现实冒险** - 去拿快递 = 护送宝箱任务，路上有随机事件
- **圆号 / 画画** - 专属职业线，练琴检测、画作融入虚拟世界
- **ESP32 硬件** - 宠物机、NFC 打卡、扭蛋机、魔法底座
- **3D 打印** - 角色手办、宠物、成就徽章，实体社交货币
- **家庭社交** - Boss 战、家庭信箱；好友系统、班级世界共建

## 项目结构

```
pixelgrow/
├── client/                     # 客户端
│   ├── miniprogram/            # 微信小程序（孩子端+家长端）
│   │   ├── pages/              # 页面
│   │   │   ├── home/           # 首页（宠物+今日任务）
│   │   │   ├── world/          # 像素虚拟世界
│   │   │   ├── tasks/          # 任务系统
│   │   │   ├── character/      # 角色/分身管理
│   │   │   ├── map/            # GPS地图冒险
│   │   │   ├── creative/       # 创作系统（作文/画画/音乐）
│   │   │   ├── social/         # 社交系统
│   │   │   └── parent/         # 家长端
│   │   ├── components/         # 公共组件
│   │   ├── utils/              # 工具函数
│   │   ├── assets/             # 静态资源
│   │   └── styles/             # 全局样式
│   └── shared/                 # 客户端共享代码
│
├── server/                     # 后端服务
│   ├── src/
│   │   ├── modules/            # 业务模块
│   │   │   ├── user/           # 用户服务
│   │   │   ├── family/         # 家庭服务
│   │   │   ├── task/           # 任务服务
│   │   │   ├── character/      # 角色服务
│   │   │   ├── world/          # 虚拟世界服务
│   │   │   ├── knowledge/      # AI知识场景引擎
│   │   │   ├── social/         # 社交服务
│   │   │   ├── achievement/    # 成就服务
│   │   │   ├── map/            # 地图/GPS服务
│   │   │   └── creative/       # 创作服务（作文动漫/画作/音乐）
│   │   ├── common/             # 公共模块
│   │   └── config/             # 配置
│   ├── prisma/                 # 数据库schema
│   └── scripts/                # 脚本
│
├── hardware/                   # 硬件代码
│   ├── esp32-pet/              # 宠物机
│   │   ├── src/                # 固件源码
│   │   ├── lib/                # 依赖库
│   │   └── models/             # 3D打印外壳模型
│   ├── esp32-gacha/            # 扭蛋机
│   ├── esp32-base/             # 魔法底座
│   ├── esp32-band/             # 定位手环
│   └── shared/                 # 硬件共享库
│
├── docs/                       # 文档
│   ├── PRD.md                  # 产品需求文档
│   ├── design/                 # 设计稿
│   └── api/                    # API文档
│
├── assets/                     # 全局资源
│   ├── pixel-art/              # 像素美术资源
│   ├── 3d-models/              # 3D打印模型
│   └── sounds/                 # 音效资源
│
└── scripts/                    # 项目脚本
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 孩子端 | 微信小程序 + PixiJS |
| 后端 | Node.js (NestJS) |
| 数据库 | MySQL + Redis + MongoDB |
| 地图 | 腾讯地图 SDK |
| AI | 通义千问 / 豆包 (LLM), 可灵 / 即梦 (视频) |
| 硬件 | ESP32-S3 + PlatformIO |
| 3D | Three.js / MagicaVoxel |

## 开发路线

- **Phase 0** (W1-2): 基础框架 + 角色创建
- **Phase 1** (W3-4): 任务系统 + NFC + 宠物机
- **Phase 2** (W5-6): AI 知识引擎 + 知识树
- **Phase 3** (W7-8): GPS 地图冒险
- **Phase 4** (W9-10): 作文动漫 + 音乐画画
- **Phase 5** (W11-12): 社交 + 更多硬件

## 快速开始

```bash
# 后端
cd server && npm install && npm run dev

# 小程序
# 用微信开发者工具打开 client/miniprogram

# 硬件（需要 PlatformIO）
cd hardware/esp32-pet && pio run --target upload
```

## License

MIT
