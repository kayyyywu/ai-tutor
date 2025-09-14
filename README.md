# AI Tutor - PDF Document Chat System

An intelligent PDF document chat system based on Next.js, supporting PDF upload, text extraction, semantic search, and AI-powered conversations.

## 🚀 Features

- **PDF Document Management**: Upload, store, and manage PDF files
- **Intelligent Text Extraction**: Automatically extract PDF text content
- **Semantic Search**: AI-based PDF content search
- **AI Chat**: Intelligent conversations with PDF content
- **User Authentication**: NextAuth.js-based user authentication system
- **Responsive Design**: Support for desktop and mobile devices

## 📁 Project Structure

```
chatbot-main/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Authentication route group
│   │   ├── auth.ts              # NextAuth configuration
│   │   ├── login/page.tsx       # Login page
│   │   └── register/page.tsx    # Registration page
│   ├── (chat)/                   # Chat route group
│   │   ├── page.tsx             # Main chat page
│   │   ├── chat/[id]/page.tsx   # Chat detail page
│   │   └── api/                 # API routes
│   │       ├── chat/enhanced/   # Enhanced chat API
│   │       └── pdf/             # PDF-related APIs
│   └── globals.css              # Global styles
├── components/                   # React components
│   ├── custom/                  # Custom components
│   │   ├── split-chat.tsx      # Main chat interface
│   │   ├── message.tsx         # Message component
│   │   └── multimodal-input.tsx # Multimodal input component
│   ├── pdf/                    # PDF-related components
│   │   ├── simple-ai-pdf-viewer.tsx # PDF viewer
│   │   ├── pdf-upload.tsx      # PDF upload component
│   │   └── pdf-list.tsx        # PDF list component
│   └── ui/                     # UI base components
├── db/                         # Database related
│   ├── prisma-queries.ts       # Prisma query functions
│   └── context-manager.ts      # Context management
├── lib/                        # Utility libraries
│   ├── prisma.ts              # Prisma client
│   ├── pdf-search.ts          # PDF search functionality
│   └── utils.ts               # Common utility functions
└── prisma/                     # Database schema
    └── schema.prisma          # Prisma schema definition
```

## 📖 Code Reading Order

### 1. Project Configuration and Entry Points (Start Here)
```
📄 package.json                 # Project dependencies and scripts
📄 next.config.mjs             # Next.js configuration
📄 tailwind.config.ts          # Tailwind CSS configuration
📄 prisma/schema.prisma        # Database schema definition
```

### 2. Authentication System (User Management)
```
📄 app/(auth)/auth.ts          # NextAuth.js configuration
📄 app/(auth)/auth.config.ts   # Authentication configuration
📄 app/(auth)/login/page.tsx   # Login page
📄 app/(auth)/register/page.tsx # Registration page
```

### 3. Database Layer (Data Management)
```
📄 lib/prisma.ts               # Prisma client configuration
📄 db/prisma-queries.ts        # Database query functions
📄 db/context-manager.ts       # Conversation context management
```

### 4. Core Utility Libraries (Basic Functions)
```
📄 lib/utils.ts                # Common utility functions
📄 lib/pdf-search.ts           # PDF search functionality
📄 ai/index.ts                 # AI model configuration
```

### 5. UI Base Components (Interface Foundation)
```
📄 components/ui/              # Base UI components
│   ├── button.tsx
│   ├── input.tsx
│   ├── textarea.tsx
│   └── ...
```

### 6. PDF-Related Components (PDF Functionality)
```
📄 components/pdf/
│   ├── simple-ai-pdf-viewer.tsx # PDF viewer (core)
│   ├── pdf-upload.tsx          # PDF upload component
│   └── pdf-list.tsx            # PDF list component
```

### 7. Chat Core Components (Main Functionality)
```
📄 components/custom/
│   ├── split-chat.tsx          # Main chat interface (core)
│   ├── message.tsx             # Message display component
│   ├── multimodal-input.tsx    # Input component
│   ├── markdown.tsx            # Markdown rendering
│   └── icons.tsx               # Icon components
```

### 8. API Routes (Backend Logic)
```
📄 app/(chat)/api/
│   ├── chat/enhanced/route.ts  # Enhanced chat API (core)
│   ├── pdf/upload/route.ts     # PDF upload API
│   ├── pdf/extract-text/route.ts # PDF text extraction API
│   ├── pdf/search/route.ts     # PDF search API
│   └── pdf/associate/route.ts  # PDF association API
```

### 9. Page Components (User Interface)
```
📄 app/(chat)/page.tsx          # Main chat page
📄 app/(chat)/chat/[id]/page.tsx # Chat detail page
📄 app/layout.tsx               # Root layout
```

## 🔧 Tech Stack

- **Frontend Framework**: Next.js 14 (App Router)
- **UI Framework**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: NextAuth.js
- **AI**: OpenAI API (GPT-4o-mini)
- **PDF Processing**: pdf-parse, pdf-lib
- **State Management**: React Hooks + SWR

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
```bash
cp .env.example .env.local
# Configure necessary environment variables
```

### 3. Database Setup
```bash
npx prisma generate
npx prisma db push
```

### 4. Start Development Server
```bash
npm run dev
```

## 📝 Core Functionality

### PDF Processing Flow
1. **Upload**: User uploads PDF files
2. **Storage**: Files saved to server and database
3. **Extraction**: Extract text content using pdf-parse
4. **Search**: Find relevant content using semantic search
5. **Chat**: AI answers questions based on PDF content

### Chat System Architecture
1. **Frontend**: React components handle user interactions
2. **API**: Next.js API routes process requests
3. **AI**: OpenAI API generates intelligent responses
4. **Database**: Prisma manages data persistence

## 🎯 Key Files

- **`split-chat.tsx`**: Main chat interface, integrates PDF viewing and conversation
- **`enhanced/route.ts`**: Core chat API, handles AI conversation logic
- **`simple-ai-pdf-viewer.tsx`**: PDF viewer with page navigation support
- **`pdf-search.ts`**: PDF search algorithm with semantic search
- **`prisma-queries.ts`**: Database operations, manages user and chat data

## 🔍 Debugging Tips

1. **Check Console Logs**: All APIs have detailed log output
2. **Database Inspection**: Use Prisma Studio to view data state
3. **API Testing**: Use browser developer tools to test API endpoints
4. **PDF Processing**: Check file paths and permission settings

## 📚 Extension Features

- Support for more file formats
- Add document annotation functionality
- Implement multi-language support
- Add user permission management
- Integrate more AI models

---

**Note**: This is a learning project that demonstrates modern full-stack web development techniques. The code structure is clear and suitable for learning and extension.
