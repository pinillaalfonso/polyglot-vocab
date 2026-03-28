import React, { useState, useEffect } from "react";
import {
  Book,
  Brain,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Search,
  X,
  Sparkles,
  Loader2,
  Share2,
  ArrowRightLeft,
  VolumeX,
  Copy,
  Clipboard,
  Check,
} from "lucide-react";

// URL del backend — se configura en Vercel como variable de entorno
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function App() {
  const [activeTab, setActiveTab] = useState("add");

  const [entries, setEntries] = useState(() => {
    try {
      const saved = localStorage.getItem("vocabEntries");
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((item) => ({
          ...item,
          source: item.source || item.es || "",
          target: item.target || item.en || "",
          fromLang: item.fromLang || "es",
          toLang: item.toLang || "en",
        }));
      }
      return [];
    } catch {
      return [];
    }
  });

  const [sourceLang, setSourceLang] = useState("es");
  const [targetLang, setTargetLang] = useState("en");
  const [availableSystemVoices, setAvailableSystemVoices] = useState([]);
  const [inputState, setInputState] = useState({ source: "", target: "" });
  const [filter, setFilter] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    localStorage.setItem("vocabEntries", JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    const loadVoices = () => {
      setAvailableSystemVoices(window.speechSynthesis.getVoices());
    };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const languages = [
    { code: "es", label: "🇪🇸 Español" },
    { code: "en", label: "🇺🇸 Inglés" },
    { code: "fr-CA", label: "🇨🇦 Francés (Canadá)" },
    { code: "fr-FR", label: "🇫🇷 Francés (Francia)" },
  ];

  // --- TRADUCCIÓN VIA BACKEND PROXY ---
  const handleTranslate = async () => {
    if (!inputState.source.trim()) return;
    setIsTranslating(true);
    try {
      const res = await fetch(`${API_URL}/api/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: inputState.source,
          sourceLang,
          targetLang,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Error ${res.status}`);
      }

      const { translation } = await res.json();
      if (translation) {
        setInputState((prev) => ({ ...prev, target: translation }));
      }
    } catch (error) {
      alert(`Error de traducción:\n${error.message}`);
    } finally {
      setIsTranslating(false);
    }
  };

  // --- AUDIO NATIVO (SISTEMA) ---
  const speakSystem = (text, gender = "female") => {
    if (!text) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const langMap = { en: "en-US", es: "es-MX", "fr-CA": "fr-CA", "fr-FR": "fr-FR" };
    utterance.lang = langMap[targetLang] || "en-US";

    if (availableSystemVoices.length > 0) {
      const langPrefix = targetLang.split("-")[0];
      const matchingVoices = availableSystemVoices.filter((v) =>
        v.lang.startsWith(langPrefix)
      );

      let selectedVoice = null;
      if (gender === "male") {
        selectedVoice = matchingVoices.find((v) =>
          /male|david|daniel|jorge|nicolas/i.test(v.name)
        );
      } else {
        selectedVoice = matchingVoices.find((v) =>
          /female|samantha|monica|paulina|amelie/i.test(v.name)
        );
      }
      if (!selectedVoice && matchingVoices.length > 0) selectedVoice = matchingVoices[0];
      if (selectedVoice) utterance.voice = selectedVoice;
    }

    utterance.pitch = gender === "male" ? 0.8 : 1.1;
    utterance.rate = gender === "male" ? 0.95 : 1;
    window.speechSynthesis.speak(utterance);
  };

  // --- PORTAPAPELES ---
  const handleCopy = async (text, id = "temp") => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setInputState((prev) => ({ ...prev, source: text }));
    } catch {
      alert("Permiso de pegar denegado. Pega manualmente.");
    }
  };

  const addEntry = () => {
    if (!inputState.source.trim() || !inputState.target.trim()) return;
    setEntries([
      {
        id: Date.now(),
        fromLang: sourceLang,
        toLang: targetLang,
        source: inputState.source.trim(),
        target: inputState.target.trim(),
        createdAt: new Date().toISOString(),
      },
      ...entries,
    ]);
    setInputState({ source: "", target: "" });
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const deleteEntry = (id) => {
    if (window.confirm("¿Borrar esta traducción?"))
      setEntries(entries.filter((e) => e.id !== id));
  };

  const swapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setInputState({ source: inputState.target, target: inputState.source });
  };

  const safeText = (txt) => txt || "";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-800 pb-safe">
      <header className="bg-indigo-600 text-white p-4 shadow-md sticky top-0 z-20 flex justify-between items-center">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Book className="w-6 h-6" />
          Polyglot Vocab
        </h1>
        <button
          onClick={async () => {
            if (navigator.share)
              await navigator.share({ url: window.location.href, title: "Polyglot Vocab" });
            else handleCopy(window.location.href, "share");
          }}
          className="p-2 bg-indigo-500 rounded-full hover:bg-indigo-400 active:scale-95"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 p-4 max-w-md mx-auto w-full pb-24 overflow-y-auto">
        <div className="bg-yellow-50 p-2 text-xs text-yellow-800 text-center mb-2 rounded flex items-center justify-center gap-2">
          <VolumeX className="w-3 h-3" />
          <span>
            Si no escuchas el audio, asegúrate de tener el <strong>volumen activado</strong>.
          </span>
        </div>

        {activeTab === "add" && (
          <div className="space-y-6 pt-2">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between gap-2 mb-4 bg-gray-50 p-2 rounded-xl">
                <select
                  value={sourceLang}
                  onChange={(e) => setSourceLang(e.target.value)}
                  className="bg-transparent text-sm font-bold text-gray-700 outline-none w-1/2 cursor-pointer"
                >
                  {languages.map((l) => (
                    <option key={l.code} value={l.code}>{l.label}</option>
                  ))}
                </select>
                <button onClick={swapLanguages} className="text-indigo-600 p-1 hover:bg-indigo-100 rounded-full">
                  <ArrowRightLeft className="w-4 h-4" />
                </button>
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="bg-transparent text-sm font-bold text-indigo-700 outline-none w-1/2 text-right cursor-pointer"
                >
                  {languages.map((l) => (
                    <option key={l.code} value={l.code}>{l.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <textarea
                    value={inputState.source}
                    onChange={(e) => setInputState({ ...inputState, source: e.target.value })}
                    placeholder={`Escribe en ${languages.find((l) => l.code === sourceLang)?.label.split(" ")[1]}...`}
                    className="w-full p-3 pr-10 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none h-24 bg-gray-50 resize-none"
                  />
                  <div className="absolute top-2 right-2 flex gap-1">
                    {inputState.source && (
                      <>
                        <button onClick={() => handleCopy(inputState.source, "main_source")} className="text-gray-400 p-1 hover:bg-gray-100 rounded">
                          {copiedId === "main_source" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <button onClick={() => setInputState({ ...inputState, source: "" })} className="text-gray-400 p-1 hover:bg-gray-100 rounded">
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {!inputState.source && (
                      <button onClick={handlePaste} className="text-indigo-500 p-1 hover:bg-indigo-50 rounded" title="Pegar">
                        <Clipboard className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex justify-center -my-3 relative z-10">
                  <button
                    onClick={handleTranslate}
                    disabled={!inputState.source.trim() || isTranslating}
                    className="bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white text-sm px-4 py-2 rounded-full shadow-md flex items-center gap-2 transition-all active:scale-95"
                  >
                    {isTranslating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {isTranslating ? "Interpretando..." : "Traducir Nativo"}
                  </button>
                </div>

                <div className="relative">
                  <textarea
                    value={inputState.target}
                    onChange={(e) => setInputState({ ...inputState, target: e.target.value })}
                    placeholder="Traducción..."
                    className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none h-24 bg-indigo-50 text-indigo-900 font-medium resize-none"
                  />
                  {inputState.target && (
                    <button
                      onClick={() => handleCopy(inputState.target, "main_target")}
                      className="absolute top-2 right-2 text-indigo-400 p-1 hover:bg-indigo-100 rounded"
                    >
                      {copiedId === "main_target" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  )}
                  {inputState.target && (
                    <div className="flex gap-2 mt-2 justify-end">
                      <button onClick={() => speakSystem(inputState.target, "female")} className="flex items-center gap-1 border px-3 py-1.5 rounded-lg text-xs font-bold active:scale-95 shadow-sm bg-white text-gray-700 border-gray-200 hover:bg-gray-50">
                        🔊 👩
                      </button>
                      <button onClick={() => speakSystem(inputState.target, "male")} className="flex items-center gap-1 border px-3 py-1.5 rounded-lg text-xs font-bold active:scale-95 shadow-sm bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100">
                        🔊 👨
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={addEntry}
                  disabled={!inputState.target}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white rounded-xl font-bold shadow-sm flex items-center justify-center gap-2 mt-2"
                >
                  <Save className="w-5 h-5" /> Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "list" && (
          <div className="space-y-4 pt-4">
            <div className="sticky top-0 z-10 bg-gray-50 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                />
                {filter && (
                  <button onClick={() => setFilter("")} className="absolute right-3 top-3 text-gray-400">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
            {entries.length === 0 ? (
              <div className="text-center py-10 text-gray-400"><p>Lista vacía.</p></div>
            ) : (
              entries
                .filter((e) =>
                  safeText(e.source).toLowerCase().includes(filter.toLowerCase()) ||
                  safeText(e.target).toLowerCase().includes(filter.toLowerCase())
                )
                .map((entry) => (
                  <div key={entry.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-2 relative">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span className="uppercase font-bold">{entry.fromLang || "?"}</span>
                      <button onClick={() => deleteEntry(entry.id)} className="text-gray-300 hover:text-red-500">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex justify-between items-start">
                      <p className="text-gray-800 font-medium text-lg leading-snug flex-1 pr-6">{entry.source}</p>
                      <button onClick={() => handleCopy(entry.source, entry.id + "_source")} className="text-gray-300 hover:text-gray-600 p-1">
                        {copiedId === entry.id + "_source" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="h-px bg-gray-100 my-1" />
                    <div className="flex justify-between items-start">
                      <span className="uppercase font-bold text-xs text-indigo-400">{entry.toLang || "?"}</span>
                      <div className="flex gap-2">
                        <button onClick={() => speakSystem(entry.target, "female")} className="text-gray-400 hover:text-indigo-600 p-1">👩</button>
                        <button onClick={() => speakSystem(entry.target, "male")} className="text-gray-400 hover:text-indigo-600 p-1">👨</button>
                      </div>
                    </div>
                    <div className="flex justify-between items-start mt-1">
                      <p className="text-indigo-900 font-medium text-lg leading-snug flex-1 pr-6">{entry.target}</p>
                      <button onClick={() => handleCopy(entry.target, entry.id + "_target")} className="text-indigo-300 hover:text-indigo-600 p-1">
                        {copiedId === entry.id + "_target" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        )}

        {activeTab === "practice" && <PracticeMode entries={entries} speakSystem={speakSystem} />}
      </main>

      <nav className="bg-white border-t border-gray-200 fixed bottom-0 w-full pb-safe z-30">
        <div className="flex justify-around max-w-md mx-auto">
          <NavBtn active={activeTab === "add"} onClick={() => setActiveTab("add")} icon={<Plus size={24} />} label="Añadir" />
          <NavBtn active={activeTab === "list"} onClick={() => setActiveTab("list")} icon={<Book size={24} />} label="Lista" />
          <NavBtn active={activeTab === "practice"} onClick={() => setActiveTab("practice")} icon={<Brain size={24} />} label="Repasar" />
        </div>
      </nav>
    </div>
  );
}

function NavBtn({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-3 w-full transition-colors ${
        active ? "text-indigo-600 bg-indigo-50" : "text-gray-400 hover:bg-gray-50"
      }`}
    >
      {icon} <span className="text-xs font-medium mt-1">{label}</span>
    </button>
  );
}

function PracticeMode({ entries, speakSystem }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [shuffled, setShuffled] = useState([]);

  useEffect(() => {
    setShuffled([...entries].sort(() => Math.random() - 0.5));
  }, [entries]);

  if (entries.length === 0)
    return (
      <div className="text-center py-20 px-6 text-gray-500">
        <Brain className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>Añade frases primero.</p>
      </div>
    );

  const handleNext = () => {
    setShowBack(false);
    setTimeout(() => setCurrentIndex((prev) => (prev + 1) % shuffled.length), 200);
  };
  const currentCard = shuffled[currentIndex];

  return (
    <div className="flex flex-col h-full justify-center py-4">
      <div className="text-center mb-4 text-xs text-gray-400 uppercase tracking-widest">
        Tarjeta {currentIndex + 1} / {shuffled.length}
      </div>
      <div
        onClick={() => setShowBack(!showBack)}
        className="bg-white rounded-3xl shadow-lg border border-gray-200 p-8 min-h-[300px] flex flex-col items-center justify-center text-center cursor-pointer relative overflow-hidden select-none active:scale-[0.98] transition-transform"
      >
        <div className={`absolute top-0 left-0 w-full h-2 ${showBack ? "bg-teal-500" : "bg-indigo-500"}`} />
        <span className={`absolute top-4 right-4 text-[10px] font-bold px-2 py-1 rounded-full uppercase ${showBack ? "bg-teal-100 text-teal-700" : "bg-indigo-100 text-indigo-700"}`}>
          {showBack ? currentCard?.toLang : currentCard?.fromLang}
        </span>
        <h3 className={`text-2xl font-bold ${showBack ? "text-teal-700" : "text-indigo-900"}`}>
          {showBack ? currentCard?.target : currentCard?.source}
        </h3>
        {!showBack && <p className="absolute bottom-6 text-xs text-gray-400 animate-pulse">Toca para ver respuesta</p>}
        {showBack && (
          <div className="absolute bottom-6 flex gap-4" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => speakSystem(currentCard.target, "female")} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">👩</button>
            <button onClick={() => speakSystem(currentCard.target, "male")} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">👨</button>
          </div>
        )}
      </div>
      <div className="flex gap-4 mt-8">
        <button
          onClick={() => { setShuffled([...entries].sort(() => Math.random() - 0.5)); setCurrentIndex(0); setShowBack(false); }}
          className="flex-1 py-3 bg-white text-gray-700 border border-gray-200 rounded-xl font-medium shadow-sm active:bg-gray-50 flex justify-center items-center gap-2"
        >
          <RotateCcw size={16} /> Barajar
        </button>
        <button onClick={handleNext} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-md hover:bg-indigo-700 active:bg-indigo-800">
          Siguiente
        </button>
      </div>
    </div>
  );
}
