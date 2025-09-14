# PDF Chatbot - AI驱动的PDF文档聊天系统

一个基于Next.js的智能PDF文档聊天系统，支持PDF上传、文本提取、语义搜索和AI对话功能。

## 🚀 功能特性

- **PDF文档管理**: 上传、存储和管理PDF文件
- **智能文本提取**: 自动提取PDF文本内容
- **语义搜索**: 基于AI的PDF内容搜索
- **AI对话**: 与PDF内容进行智能对话
- **用户认证**: 基于NextAuth.js的用户认证系统
- **响应式设计**: 支持桌面和移动设备

## 📁 项目结构

```
chatbot-main/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # 认证相关路由组
│   │   ├── auth.ts              # NextAuth配置
│   │   ├── login/page.tsx       # 登录页面
│   │   └── register/page.tsx    # 注册页面
│   ├── (chat)/                   # 聊天相关路由组
│   │   ├── page.tsx             # 主聊天页面
│   │   ├── chat/[id]/page.tsx   # 聊天详情页面
│   │   └── api/                 # API路由
│   │       ├── chat/enhanced/   # 增强聊天API
│   │       └── pdf/             # PDF相关API
│   └── globals.css              # 全局样式
├── components/                   # React组件
│   ├── custom/                  # 自定义组件
│   │   ├── split-chat.tsx      # 主聊天界面
│   │   ├── message.tsx         # 消息组件
│   │   └── multimodal-input.tsx # 多模态输入组件
│   ├── pdf/                    # PDF相关组件
│   │   ├── simple-ai-pdf-viewer.tsx # PDF查看器
│   │   ├── pdf-upload.tsx      # PDF上传组件
│   │   └── pdf-list.tsx        # PDF列表组件
│   └── ui/                     # UI基础组件
├── db/                         # 数据库相关
│   ├── prisma-queries.ts       # Prisma查询函数
│   └── context-manager.ts      # 上下文管理
├── lib/                        # 工具库
│   ├── prisma.ts              # Prisma客户端
│   ├── pdf-search.ts          # PDF搜索功能
│   └── utils.ts               # 通用工具函数
└── prisma/                     # 数据库模式
    └── schema.prisma          # Prisma模式定义
```

## 📖 代码阅读顺序

### 1. 项目配置和入口 (开始阅读)
```
📄 package.json                 # 项目依赖和脚本
📄 next.config.mjs             # Next.js配置
📄 tailwind.config.ts          # Tailwind CSS配置
📄 prisma/schema.prisma        # 数据库模式定义
```

### 2. 认证系统 (用户管理)
```
📄 app/(auth)/auth.ts          # NextAuth.js配置
📄 app/(auth)/auth.config.ts   # 认证配置
📄 app/(auth)/login/page.tsx   # 登录页面
📄 app/(auth)/register/page.tsx # 注册页面
```

### 3. 数据库层 (数据管理)
```
📄 lib/prisma.ts               # Prisma客户端配置
📄 db/prisma-queries.ts        # 数据库查询函数
📄 db/context-manager.ts       # 对话上下文管理
```

### 4. 核心工具库 (基础功能)
```
📄 lib/utils.ts                # 通用工具函数
📄 lib/pdf-search.ts           # PDF搜索功能
📄 ai/index.ts                 # AI模型配置
```

### 5. UI基础组件 (界面基础)
```
📄 components/ui/              # 基础UI组件
│   ├── button.tsx
│   ├── input.tsx
│   ├── textarea.tsx
│   └── ...
```

### 6. PDF相关组件 (PDF功能)
```
📄 components/pdf/
│   ├── simple-ai-pdf-viewer.tsx # PDF查看器 (核心)
│   ├── pdf-upload.tsx          # PDF上传组件
│   └── pdf-list.tsx            # PDF列表组件
```

### 7. 聊天核心组件 (主要功能)
```
📄 components/custom/
│   ├── split-chat.tsx          # 主聊天界面 (核心)
│   ├── message.tsx             # 消息显示组件
│   ├── multimodal-input.tsx    # 输入组件
│   ├── markdown.tsx            # Markdown渲染
│   └── icons.tsx               # 图标组件
```

### 8. API路由 (后端逻辑)
```
📄 app/(chat)/api/
│   ├── chat/enhanced/route.ts  # 增强聊天API (核心)
│   ├── pdf/upload/route.ts     # PDF上传API
│   ├── pdf/extract-text/route.ts # PDF文本提取API
│   ├── pdf/search/route.ts     # PDF搜索API
│   └── pdf/associate/route.ts  # PDF关联API
```

### 9. 页面组件 (用户界面)
```
📄 app/(chat)/page.tsx          # 主聊天页面
📄 app/(chat)/chat/[id]/page.tsx # 聊天详情页面
📄 app/layout.tsx               # 根布局
```

## 🔧 技术栈

- **前端框架**: Next.js 14 (App Router)
- **UI框架**: React 18 + TypeScript
- **样式**: Tailwind CSS
- **数据库**: PostgreSQL + Prisma ORM
- **认证**: NextAuth.js
- **AI**: OpenAI API
- **PDF处理**: pdf-parse, pdf-lib
- **状态管理**: React Hooks + SWR

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 环境配置
```bash
cp .env.example .env.local
# 配置必要的环境变量
```

### 3. 数据库设置
```bash
npx prisma generate
npx prisma db push
```

### 4. 启动开发服务器
```bash
npm run dev
```

## 📝 核心功能说明

### PDF处理流程
1. **上传**: 用户上传PDF文件
2. **存储**: 文件保存到服务器和数据库
3. **提取**: 使用pdf-parse提取文本内容
4. **搜索**: 基于语义搜索查找相关内容
5. **对话**: AI基于PDF内容回答问题

### 聊天系统架构
1. **前端**: React组件处理用户交互
2. **API**: Next.js API路由处理请求
3. **AI**: OpenAI API生成智能回复
4. **数据库**: Prisma管理数据持久化

## 🎯 关键文件说明

- **`split-chat.tsx`**: 主聊天界面，整合PDF查看和对话功能
- **`enhanced/route.ts`**: 核心聊天API，处理AI对话逻辑
- **`simple-ai-pdf-viewer.tsx`**: PDF查看器，支持页面导航
- **`pdf-search.ts`**: PDF搜索算法，支持语义搜索
- **`prisma-queries.ts`**: 数据库操作，管理用户和聊天数据

## 🔍 调试建议

1. **查看控制台日志**: 所有API都有详细的日志输出
2. **检查数据库**: 使用Prisma Studio查看数据状态
3. **测试API**: 使用浏览器开发者工具测试API端点
4. **PDF处理**: 检查文件路径和权限设置

## 📚 扩展功能

- 支持更多文件格式
- 添加文档标注功能
- 实现多语言支持
- 添加用户权限管理
- 集成更多AI模型

---

**注意**: 这是一个学习项目，展示了现代Web应用的全栈开发技术。代码结构清晰，适合学习和扩展。