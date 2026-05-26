import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { HelpCircle, Loader2 } from 'lucide-react';

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType
} from 'docx';

import { saveAs } from 'file-saver';

// =========================
// ENV CONFIG (IMPORTANT)
// =========================
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL;

// =========================
// SUPABASE CLIENT
// =========================
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function App() {

  const [file, setFile] = useState(null);
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [mcqList, setMcqList] = useState([]);

  // =========================
  // SAFE CONVERTER
  // =========================
  const safe = (v) => {
    if (v === null || v === undefined) return "";

    if (typeof v === "string") return v;
    if (typeof v === "number" || typeof v === "boolean") return String(v);

    if (Array.isArray(v)) return v.map(safe).join(", ");

    if (typeof v === "object") {
      try {
        return JSON.stringify(v);
      } catch {
        return "";
      }
    }

    return "";
  };

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  // =========================
  // MCQ PARSER (ROBUST)
  // =========================
  const extractMCQs = (data) => {
    if (!data) return [];

    let raw = data.mcqs || data.questions || data;

    if (raw?.output) raw = raw.output;

    if (typeof raw === "string") {
      raw = raw.replace(/```json|```/g, "").trim();

      try {
        raw = JSON.parse(raw);
      } catch {
        throw new Error("Invalid JSON from backend");
      }
    }

    const questions = raw?.questions ?? raw;

    return Array.isArray(questions) ? questions : [];
  };

  // =========================
  // GENERATE MCQs
  // =========================
  const generateMCQs = async (e) => {
    e.preventDefault();

    if (!file) {
      alert("Select a PDF first");
      return;
    }

    setLoading(true);
    setStatusMessage("Uploading PDF...");

    try {

      const fileName = `${Date.now()}.pdf`;

      const { error } = await supabase.storage
        .from("pdfs")
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } =
        supabase.storage.from("pdfs").getPublicUrl(fileName);

      setStatusMessage("Generating MCQs...");

      const res = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileUrl: publicUrl,
          instructions
        })
      });

      const text = await res.text();

      let json;
      try {
        json = JSON.parse(text);
      } catch {
        json = { output: text };
      }

      console.log("RAW RESPONSE:", json);

      const questions = extractMCQs(json);

      if (!questions.length) {
        throw new Error("No MCQs generated from PDF");
      }

      const cleaned = questions.map(item => ({
        question: safe(item.question),
        options: Array.isArray(item.options) ? item.options.map(safe) : [],
        correct_answer: safe(item.answer || item.correct_answer),
        explanation: safe(item.explanation || "")
      }))
      .filter(q => q.question && q.options.length);

      setMcqList(cleaned);
      setStatusMessage(`Generated ${cleaned.length} MCQs`);

    } catch (err) {
      console.error(err);
      alert(err.message);
      setStatusMessage("");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // DOWNLOAD DOCX
  // =========================
  const handleDownloadDocx = async () => {
    if (!mcqList.length) return;

    const children = [
      new Paragraph({
        text: "MCQ Report",
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER
      })
    ];

    mcqList.forEach((item, i) => {

      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Q${i + 1}. `, bold: true }),
            new TextRun({ text: item.question })
          ]
        })
      );

      item.options.forEach((opt, j) => {
        children.push(
          new Paragraph({
            text: `${String.fromCharCode(65 + j)}. ${opt}`,
            indent: { left: 720 }
          })
        );
      });

      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Answer: ", bold: true }),
            new TextRun({ text: item.correct_answer })
          ]
        })
      );

      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Explanation: ", bold: true }),
            new TextRun({ text: item.explanation })
          ]
        })
      );

      children.push(new Paragraph({ text: "" }));
    });

    const doc = new Document({ sections: [{ children }] });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `MCQ_${Date.now()}.docx`);
  };

  // =========================
  // UI
  // =========================
  return (
    <div className="app-container">

      <section className="panel">

        <form onSubmit={generateMCQs}>

          <input type="file" accept=".pdf" onChange={handleFileChange} />

          <textarea
            placeholder="Instructions..."
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />

          <button type="submit" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : "Generate MCQs"}
          </button>

        </form>

        {statusMessage && <p>{statusMessage}</p>}

        {mcqList.length > 0 && (
          <button onClick={handleDownloadDocx}>
            Download DOCX
          </button>
        )}

      </section>

      <section className="results-section">

        {mcqList.length === 0 ? (
          <div className="empty-state">
            <HelpCircle size={50} />
            <p>No MCQs generated yet</p>
          </div>
        ) : (
          mcqList.map((item, i) => (
            <article key={i} className="mcq-card">

              <h3>{item.question}</h3>

              {item.options.map((opt, j) => (
                <div key={j}>
                  <b>{String.fromCharCode(65 + j)}.</b> {opt}
                </div>
              ))}

              <p><b>Answer:</b> {item.correct_answer}</p>
              <p><b>Explanation:</b> {item.explanation}</p>

            </article>
          ))
        )}

      </section>

    </div>
  );
}