import { useEffect, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export default function CVAnalyzer() {
  const [cvText, setCvText] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [atsScore, setAtsScore] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("cv-chat");
    if (saved) setMessages(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("cv-chat", JSON.stringify(messages));
  }, [messages]);

  const parsePDF = async (file) => {
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

    let text = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((i) => i.str).join(" ") + "\n";
    }

    return text;
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const text = await parsePDF(file);
    setCvText(text);
  };

  const calculateATS = (text) => {
    let score = 40;
    if (text.includes("React")) score += 15;
    if (text.includes("Node")) score += 10;
    if (text.includes("Python")) score += 10;
    if (text.includes("experience")) score += 10;
    if (text.length > 1500) score += 10;
    return Math.min(score, 100);
  };

  const analyze = async () => {
    if (!cvText.trim()) return;

    setLoading(true);
    setAtsScore(null);

    try {
      const userMsg = { role: "user", content: cvText };
      setMessages((prev) => [...prev, userMsg]);

      setAtsScore(calculateATS(cvText));

      const res = await fetch("/api/analyze-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvText }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Erreur backend");

      const words = data.result.split(" ");
      let current = "";

      for (let i = 0; i < words.length; i++) {
        await new Promise((r) => setTimeout(r, 10));
        current += words[i] + " ";

        setMessages((prev) => {
          const updated = [...prev];
          if (updated[updated.length - 1]?.role === "ai-stream") {
            updated[updated.length - 1].content = current;
          } else {
            updated.push({ role: "ai-stream", content: current });
          }
          return updated;
        });
      }

      setCvText("");
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: "❌ " + err.message },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className={darkMode ? "app dark" : "app light"}>
    
    <div className="container">

      {/* HEADER */}
      <div className="topbar">
        <h1>🤖 MARVEL AI CV ANALISEUR</h1>

        <button className="toggle" onClick={() => setDarkMode(!darkMode)}>
          {darkMode ? "☀️ Light" : "🌙 Dark"}
        </button>
      </div>

      {/* ATS */}
      {atsScore !== null && (
        <div className="ats">
          🎯 Notre Score : <b>{atsScore}/100</b>
        </div>
      )}

      {/* DROP */}
      <div
        className={`drop ${dragActive ? "active" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        📄 Glisse ton CV ici ou upload
      </div>

      <input
        type="file"
        accept="application/pdf"
        onChange={async (e) => {
          const text = await parsePDF(e.target.files[0]);
          setCvText(text);
        }}
      />

      {/* INPUT */}
      <div className="input">
        <textarea
          value={cvText}
          onChange={(e) => setCvText(e.target.value)}
          placeholder="Tout les détails de ton cv..."
        />

        <button onClick={analyze} disabled={loading}>
          {loading ? "Analyse..." : "Analyser"}
        </button>
      </div>

      {/* CHAT */}
      <div className="chat">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`bubble ${msg.role.includes("user") ? "user" : "ai"}`}
          >
            {msg.content}
          </div>
        ))}

        {loading && <div className="bubble ai">⏳ Analyse IA...</div>}
      </div>

      {/* FOOTER */}
      <div className="footer">
        © 2026 — NN GROUP Tous droits réservés.
      </div>

    </div>
  </div>
);
}