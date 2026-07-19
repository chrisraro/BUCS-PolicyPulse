# BUCS PolicyPulse 🏛️

**A Multi-Agent Retrieval-Augmented Generation Architecture with ReAct Reasoning and Semantic Memory**

## 📖 Project Overview
**BUCS PolicyPulse** is an advanced, AI-driven web application designed to act as an intelligent policy assistant. By leveraging a Multi-Agent RAG architecture combined with ReAct (Reasoning and Acting) methodologies and Semantic Memory, the application provides users with highly accurate, context-aware answers based strictly on uploaded institutional documents and policies. 

## 🏗️ Architectural Core & Tech Stack
The platform is built on a modern, full-stack JavaScript/TypeScript architecture to ensure seamless integration between the frontend and the AI orchestration layer.

*   **Frontend (UI & Chat Experience):** **Next.js & React**. Utilizes React Server Components and Next.js App Router for a highly responsive, ChatGPT-style interface with real-time UI streaming.
*   **Backend (API & Orchestration):** **Node.js**. Hosted via Next.js API routes (Node runtime) or a standalone Node/Express server to handle file processing, embedding generation, and secure AI routing.
*   **AI Framework:** **LlamaIndex.TS**. Handles the heavy lifting of the Multi-Agent architecture. It parses documents, chunks text, and powers the ReAct agent, which allows the LLM to "think," use retrieval tools, and synthesize answers logically.
*   **Database, Auth, & Vector Store:** **Supabase**. 
    *   **PostgreSQL + `pgvector`:** Acts as the semantic memory and vector database for our RAG setup.
    *   **Supabase Storage:** Securely hosts the uploaded PDF and document files.
    *   **Supabase Auth:** Manages secure login and Role-Based Access Control (RBAC) for Admins vs. Users.

---

## ✨ Core Features

### 🔒 Admin Features (Restricted Access)
*   **Admin Panel / Dashboard (React/Next.js):** A centralized hub for administrators to monitor app usage, system health, and manage configurations.
*   **Document & Knowledge Base Management:**
    *   Secure file uploading for policies and guidelines directly to **Supabase Storage**.
    *   Automated text extraction, chunking, and indexing powered by **LlamaIndex**.
*   **RAG & Embedding Configuration:**
    *   GUI to trigger LlamaIndex ingestion pipelines that convert uploaded documents into embeddings stored in **Supabase `pgvector`**.
    *   Tools to tweak RAG parameters (chunk size, overlap, retrieval threshold) within the LlamaIndex configuration.

### 💬 User Features (Public / End-User)
*   **Conversational Interface (ChatGPT-style):**
    *   **Welcome Screen:** Features a clean, inviting React UI with suggested prompt buttons (e.g., "What is the grading policy?", "How do I apply for a leave of absence?").
    *   **Chat Interface:** Real-time streaming responses, markdown support for formatted text, and a responsive layout for mobile and desktop.
*   **Feedback & QA Loop:**
    *   In-chat thumbs up/down icons for immediate response rating.
    *   A popup review/feedback modal to collect detailed user suggestions or report inaccurate AI responses, logging this data directly to standard Supabase Postgres tables.

---

## 🚀 Suggested Additional Features

To elevate **BUCS PolicyPulse** from a standard RAG app to a comprehensive platform, consider implementing the following:

### 1. Citation & Source Transparency
*   **Feature:** LlamaIndex can return the source nodes used to generate an answer. The UI appends clickable citations to its responses.
*   **Benefit:** Users can click a footnote to view the exact snippet of the uploaded policy where the AI found the answer, building trust and verifying accuracy.

### 2. Role-Based Access Control (RBAC) Filtering
*   **Feature:** Utilizing **Supabase Auth**, distinguish between Students, Faculty, and Admins.
*   **Benefit:** The LlamaIndex retriever can use metadata filters during the vector search to ensure students only retrieve answers from student handbooks, while faculty can retrieve answers from faculty-only HR policies.

### 3. Semantic Session Memory
*   **Feature:** A sidebar displaying past chat sessions, stored in Supabase Postgres.
*   **Benefit:** Users can return to previous queries without losing context. The LlamaIndex ReAct agent can pull from this chat history to provide historically consistent and personalized responses.

### 4. Fallback & Escalation Mechanism
*   **Feature:** If the LlamaIndex ReAct agent determines the answer is not in the vector database, it refuses to hallucinate. Instead, it offers a form to escalate the question to a human administrator.
*   **Benefit:** Prevents AI hallucinations and ensures institutional compliance.