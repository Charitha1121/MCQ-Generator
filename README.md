# 📚 MCQ Generator AI

An AI-powered web application that converts PDF documents into Multiple Choice Questions (MCQs) using n8n automation, Supabase storage, and a React frontend.

---

## 🚀 Features

- Upload PDF files
- AI-generated MCQs from content
- Options (A, B, C, D)
- Correct answers with explanations
- Supabase file storage
- n8n workflow automation
- Download MCQs as DOCX
- Clean UI with live status updates

---

## 🛠️ Tech Stack

- React.js (Frontend)
- n8n (Automation workflow)
- Supabase (Storage)
- docx + file-saver (Export)
- lucide-react (Icons)

---

## 📂 Project Structure

mcq-generator/
│── src/
│   ├── App.jsx
│   ├── components/
│   ├── styles/
│
│── public/
│── .env
│── package.json
│── README.md

---

## ⚙️ Environment Variables

Create a `.env` file:

REACT_APP_SUPABASE_URL=your_supabase_url  
REACT_APP_SUPABASE_ANON_KEY=your_supabase_key  
REACT_APP_N8N_WEBHOOK_URL=your_n8n_webhook  

---

## 🔥 How It Works

1. Upload PDF
2. File stored in Supabase
3. Public URL sent to n8n webhook
4. n8n extracts text + sends to AI
5. AI generates MCQs in JSON format
6. React parses and displays MCQs
7. Download as DOCX

---

## ▶️ Setup

### 1. Clone repo
```bash
git clone https://github.com/your-username/mcq-generator.git
cd mcq-generator
