import { useState } from "react";

const COLUMNS = [
  { label: "B", range: [1, 15] },
  { label: "I", range: [16, 30] },
  { label: "N", range: [31, 45] },
  { label: "G", range: [46, 60] },
  { label: "O", range: [61, 75] },
];

const BALL_COLORS = {
  B: "#E53935", I: "#757575", N: "#43A047", G: "#43A047", O: "#E67E22",
};

const HEADER_COLORS = {
  B: "#E53935", I: "#1565C0", N: "#6A1B9A", G: "#2E7D32", O: "#E65100",
};

function getBallLetter(n) {
  if (n <= 15) return "B"; if (n <= 30) return "I";
  if (n <= 45) return "N"; if (n <= 60) return "G"; return "O";
}
function getBallColor(n) { return BALL_COLORS[getBallLetter(n)]; }

function emptyCard() {
  return Array.from({ length: 5 }, (_, col) =>
    Array.from({ length: 5 }, (_, row) => (col === 2 && row === 2 ? "FREE" : ""))
  );
}

function checkBingo(grid, calledSet) {
  const marked = (val) => val === "FREE" || (!isNaN(parseInt(val)) && calledSet.has(parseInt(val)));
  for (let r = 0; r < 5; r++) if (grid.every((col) => marked(col[r]))) return true;
  for (let c = 0; c < 5; c++) if (grid[c].every((v) => marked(v))) return true;
  if ([0,1,2,3,4].every((i) => marked(grid[i][i]))) return true;
  if ([0,1,2,3,4].every((i) => marked(grid[i][4-i]))) return true;
  return false;
}

function isCardFilled(grid) {
  return grid.every((col, ci) => col.every((val, ri) => (ci === 2 && ri === 2) || val !== ""));
}

// ── Default locked card (from screenshot) ──
// Grid is col-major: grid[col][row], 5 cols × 5 rows
// B(col0):1,4,6,9,11 | I(col1):16,20,29,30,25 | N(col2):31,36,FREE,32,45 | G(col3):47,49,56,51,50 | O(col4):66,69,65,71,75
const DEFAULT_CARD_GRID = [
  ["1","4","6","9","11"],      // B
  ["16","20","29","30","25"],  // I
  ["31","36","FREE","32","45"],// N
  ["47","49","56","51","50"],  // G
  ["66","69","65","71","75"],  // O
];

const DEFAULT_CARD = {
  name: "Card 1",
  grid: DEFAULT_CARD_GRID,
  mode: "play",
  locked: true, // cannot be edited, cleared, or removed
};

export default function BingoBallRecorder() {
  const [rounds, setRounds] = useState([[]]);
  const [currentRound, setCurrentRound] = useState(0);
  const [cards, setCards] = useState([DEFAULT_CARD]);
  const [editingCard, setEditingCard] = useState(null);
  const [errors, setErrors] = useState({});
  const [manualInput, setManualInput] = useState("");
  const [manualError, setManualError] = useState("");

  const calledNumbers = rounds[currentRound];
  const calledSet = new Set(calledNumbers);

  // How many rounds each number has been called across ALL rounds
  function getCallCount(n) {
    return rounds.filter((r) => r.includes(n)).length;
  }

  // ── Recorder ──
  function toggle(n) {
    setRounds((prev) => prev.map((r, i) => {
      if (i !== currentRound) return r;
      if (calledSet.has(n)) return r.filter((x) => x !== n);
      return [...r, n];
    }));
  }
  function clearRound() { setRounds((prev) => prev.map((r, i) => i === currentRound ? [] : r)); }
  function addRound() {
    setRounds((prev) => [...prev, []]);
    setCurrentRound((p) => p + 1);
    setManualInput(""); setManualError("");
  }
  const columnCounts = COLUMNS.map(({ range: [lo, hi] }) => calledNumbers.filter((n) => n >= lo && n <= hi).length);

  // ── Manual caller ──
  function handleManualCall() {
    const n = parseInt(manualInput, 10);
    if (isNaN(n) || n < 1 || n > 75) { setManualError("Enter a number between 1 and 75"); return; }
    if (calledSet.has(n)) { setManualError(`${n} is already called this round`); return; }
    setManualError(""); setManualInput("");
    setRounds((prev) => prev.map((r, i) => i === currentRound ? [...r, n] : r));
  }
  function handleManualKeyDown(e) { if (e.key === "Enter") handleManualCall(); }
  function handleManualRemove(n) {
    setRounds((prev) => prev.map((r, i) => i === currentRound ? r.filter((x) => x !== n) : r));
  }

  // ── Cards ──
  function addCard() {
    const idx = cards.length;
    const newNum = cards.filter((c) => !c.locked).length + 2;
    setCards((prev) => [...prev, { name: `Card ${newNum}`, grid: emptyCard(), mode: "edit", locked: false }]);
    setEditingCard(idx);
  }
  function removeCard(idx) {
    if (cards[idx]?.locked) return;
    if (cards.length === 1) return;
    setCards(cards.filter((_, i) => i !== idx));
    if (editingCard === idx) setEditingCard(null);
    else if (editingCard > idx) setEditingCard(editingCard - 1);
  }
  function updateCardName(idx, name) {
    if (cards[idx]?.locked) return;
    setCards((prev) => prev.map((c, i) => i === idx ? { ...c, name } : c));
  }
  function saveCard(idx) {
    setCards((prev) => prev.map((c, i) => i !== idx ? c : { ...c, mode: "play" }));
    setErrors({});
    setEditingCard(null);
  }
  function editCard(idx) {
    if (cards[idx]?.locked) return;
    setCards((prev) => prev.map((c, i) => i !== idx ? c : { ...c, mode: "edit" }));
    setEditingCard(idx);
  }
  function clearCard(idx) {
    if (cards[idx]?.locked) return;
    setCards((prev) => prev.map((c, i) => i !== idx ? c : { ...c, grid: emptyCard(), mode: "edit" }));
    setErrors({});
  }
  function handleCellInput(cardIdx, col, row, value) {
    const key = `${cardIdx}-${col}-${row}`;
    const card = cards[cardIdx];
    if (col === 2 && row === 2) return;
    const num = parseInt(value, 10);
    const { range } = COLUMNS[col];
    let err = "";
    if (value !== "" && (isNaN(num) || num < range[0] || num > range[1])) err = `${range[0]}–${range[1]}`;
    if (!err && value !== "") {
      const allNums = card.grid.flatMap((c, ci) => c.map((v, ri) => (ci !== col || ri !== row) ? v : null)).filter(Boolean);
      if (allNums.includes(value)) err = "Duplicate!";
    }
    setErrors((prev) => ({ ...prev, [key]: err }));
    setCards((prev) => prev.map((c, i) => {
      if (i !== cardIdx) return c;
      const newGrid = c.grid.map((colArr, ci) => ci !== col ? colArr : colArr.map((v, ri) => ri !== row ? v : value));
      return { ...c, grid: newGrid };
    }));
  }
  function isCalledNum(val) { const n = parseInt(val, 10); return !isNaN(n) && calledSet.has(n); }
  function hasErrors(cardIdx) { return Object.entries(errors).some(([k, v]) => k.startsWith(`${cardIdx}-`) && v !== ""); }
  function canSave(cardIdx) { return isCardFilled(cards[cardIdx].grid) && !hasErrors(cardIdx); }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .bingo-page {
          background: linear-gradient(135deg, #7B1212 0%, #C0392B 50%, #E67E22 100%);
          min-height: 100vh; padding: 20px 16px;
          font-family: 'Segoe UI', sans-serif;
          display: flex; flex-direction: column; gap: 16px; align-items: center;
        }
        .bingo-card, .numpad-card, .card-section {
          background: rgba(255,255,255,0.08); border-radius: 16px;
          padding: 20px 18px; width: 100%; max-width: 1100px;
        }
        .bingo-title { text-align: center; font-size: clamp(16px,4vw,22px); font-weight: 700; color: #FFD700; margin-bottom: 14px; }
        .section-title { text-align: center; font-size: clamp(14px,3vw,18px); font-weight: 700; color: #FFD700; margin-bottom: 14px; letter-spacing: 1px; }
        .bingo-controls { display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap; margin-bottom: 18px; }
        .bingo-controls label { color: #fff; font-size: clamp(12px,3vw,14px); }
        .bingo-controls select { padding: 6px 12px; border-radius: 20px; border: none; font-size: clamp(12px,3vw,14px); cursor: pointer; background: #fff; }
        .btn { border: none; border-radius: 20px; padding: 9px 18px; font-size: clamp(11px,2.5vw,14px); cursor: pointer; font-weight: 700; white-space: nowrap; transition: all 0.15s; }
        .btn:hover { filter: brightness(1.1); transform: scale(1.03); }
        .btn-purple { background: #5B2AD0; color: #fff; }
        .btn-green  { background: #1a7a3a; color: #fff; }
        .btn-red    { background: #c0392b; color: #fff; }
        .btn-gold   { background: #FFD700; color: #7B1212; }
        .btn-blue   { background: #1565C0; color: #fff; }
        .btn-gray   { background: rgba(255,255,255,0.18); color: rgba(255,255,255,0.45); cursor: not-allowed; }
        .btn-gray:hover { filter: none; transform: none; }

        /* Ball display board */
        .display-board { display: grid; grid-template-columns: repeat(15,1fr); gap: 5px; margin-bottom: 14px; }
        .display-ball { aspect-ratio: 1; border-radius: 8px; display: flex; align-items: center; justify-content: center; transition: background 0.15s; user-select: none; }
        .display-ball span { color: #fff; font-weight: 700; font-size: clamp(9px,1.5vw,15px); }
        .col-row { display: grid; grid-template-columns: repeat(5,1fr); text-align: center; margin-top: 6px; }
        .col-label { color: rgba(255,255,255,0.85); font-size: clamp(10px,2vw,13px); }
        .col-count { color: #fff; font-size: clamp(16px,3vw,22px); font-weight: 700; }

        /* Numpad — shows call count badges */
        .numpad { display: grid; grid-template-columns: repeat(15,1fr); gap: 5px; }
        .num-ball-wrap { position: relative; display: flex; flex-direction: column; align-items: center; }
        .num-ball {
          width: 100%; aspect-ratio: 1; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: clamp(10px,1.8vw,14px); user-select: none;
          transition: all 0.15s; cursor: pointer; font-weight: 700;
          position: relative;
        }
        .num-ball:hover { filter: brightness(1.12); transform: scale(1.06); }

        /* Count badge — shows how many rounds this number was called */
        .call-count-badge {
          position: absolute;
          top: -5px; right: -5px;
          min-width: 18px; height: 18px;
          background: #FFD700; color: #7B1212;
          border-radius: 10px; font-size: 10px; font-weight: 900;
          display: flex; align-items: center; justify-content: center;
          padding: 0 4px; line-height: 1;
          box-shadow: 0 1px 4px rgba(0,0,0,0.4);
          z-index: 2;
        }

        /* Manual Caller */
        .manual-caller { background: rgba(0,0,0,0.25); border-radius: 14px; padding: 14px 16px; margin-bottom: 16px; }
        .caller-top { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; }
        .caller-left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .caller-title { color: #FFD700; font-size: clamp(13px,2.5vw,15px); font-weight: 700; }
        .round-badge { background: rgba(255,215,0,0.18); border: 1.5px solid #FFD700; color: #FFD700; font-size: clamp(11px,2vw,13px); font-weight: 700; padding: 4px 12px; border-radius: 20px; }
        .round-select { padding: 5px 12px; border-radius: 20px; border: 1.5px solid rgba(255,255,255,0.3); background: rgba(255,255,255,0.1); color: #fff; font-size: clamp(11px,2vw,13px); font-weight: 600; cursor: pointer; outline: none; }
        .round-select option { background: #7B1212; color: #fff; }
        .caller-input-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
        .manual-num-input { width: 90px; padding: 9px 14px; border-radius: 20px; border: 2px solid rgba(255,255,255,0.3); background: rgba(255,255,255,0.12); color: #fff; font-size: clamp(14px,3vw,18px); font-weight: 700; outline: none; text-align: center; transition: border 0.15s; }
        .manual-num-input::placeholder { color: rgba(255,255,255,0.35); }
        .manual-num-input:focus { border-color: #FFD700; }
        .manual-num-input.input-error { border-color: #ff5252; }
        .manual-error { color: #ff5252; font-size: clamp(11px,2vw,12px); }
        .chips-label { color: rgba(255,255,255,0.55); font-size: clamp(10px,1.8vw,12px); margin-bottom: 6px; }
        .called-chips { display: flex; flex-wrap: wrap; gap: 6px; max-height: 130px; overflow-y: auto; }
        .called-chip { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 20px; font-size: clamp(11px,2vw,13px); font-weight: 700; color: #fff; user-select: none; }
        .chip-remove { background: none; border: none; color: rgba(255,255,255,0.6); cursor: pointer; font-size: 12px; padding: 0; line-height: 1; display: flex; align-items: center; }
        .chip-remove:hover { color: #fff; }
        .no-calls-hint { color: rgba(255,255,255,0.35); font-size: clamp(11px,2vw,12px); font-style: italic; }

        /* Cards Grid */
        .cards-grid { display: grid; grid-template-columns: repeat(5,1fr); gap: 14px; }
        .card-item { background: rgba(0,0,0,0.2); border-radius: 12px; padding: 10px 8px; display: flex; flex-direction: column; gap: 8px; border: 2px solid transparent; transition: border 0.2s, box-shadow 0.2s; position: relative; }
        .card-item.bingo-card-item { border-color: #4ade80; box-shadow: 0 0 14px rgba(74,222,128,0.3); }
        .card-item-header { display: flex; align-items: center; justify-content: space-between; gap: 4px; }
        .card-item-name { font-size: clamp(10px,1.8vw,13px); font-weight: 700; color: #FFD700; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .card-item-badge { font-size: 11px; padding: 2px 7px; border-radius: 10px; font-weight: 700; white-space: nowrap; }
        .badge-edit { background: rgba(255,165,0,0.25); color: #FFD700; }
        .badge-play { background: rgba(0,200,100,0.2); color: #4ade80; }
        .badge-bingo { background: #4ade80; color: #064e23; }
        .badge-locked { background: rgba(255,255,255,0.15); color: rgba(255,255,255,0.55); }
        .card-actions { display: flex; gap: 5px; flex-wrap: wrap; margin-top: 2px; }
        .card-action-btn { flex: 1; border: none; border-radius: 14px; padding: 5px 8px; font-size: clamp(10px,1.5vw,12px); font-weight: 700; cursor: pointer; white-space: nowrap; transition: all 0.15s; }
        .card-action-btn:hover { filter: brightness(1.1); }
        .cab-edit  { background: #E67E22; color: #fff; }
        .cab-save  { background: #FFD700; color: #7B1212; }
        .cab-clear { background: rgba(192,57,43,0.7); color: #fff; }
        .cab-remove { background: rgba(100,100,100,0.4); color: #fff; }
        .cab-gray  { background: rgba(255,255,255,0.15); color: rgba(255,255,255,0.35); cursor: not-allowed; }

        .mini-card-grid { display: grid; grid-template-columns: repeat(5,1fr); gap: 2px; border-radius: 6px; overflow: hidden; border: 1.5px solid rgba(255,255,255,0.2); }
        .mini-header { text-align: center; font-size: clamp(7px,1.2vw,11px); font-weight: 900; color: #fff; padding: 3px 1px; }
        .mini-cell { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: clamp(6px,1vw,10px); font-weight: 700; color: #fff; border: 0.5px solid rgba(255,255,255,0.1); transition: background 0.15s; }
        .mini-cell.mini-called { background: rgba(255,215,0,0.45); color: #FFD700; }
        .mini-cell.mini-free { background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.5); font-size: clamp(5px,0.9vw,8px); }
        .mini-cell.mini-empty { background: rgba(0,0,0,0.2); color: rgba(255,255,255,0.2); }
        .bingo-label { background: #4ade80; color: #064e23; font-size: clamp(10px,1.8vw,13px); font-weight: 800; text-align: center; padding: 4px; border-radius: 8px; letter-spacing: 1px; }

        .add-card-tile { background: rgba(0,0,0,0.1); border-radius: 12px; padding: 10px 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 80px; cursor: pointer; border: 2px dashed rgba(255,255,255,0.3); transition: border 0.2s; }
        .add-card-tile:hover { border-color: rgba(255,215,0,0.5); }

        /* Modal */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
        .modal-box { background: linear-gradient(135deg, #7B1212, #C0392B); border-radius: 18px; padding: 20px 18px; width: 100%; max-width: 480px; border: 2px solid #FFD700; max-height: 90vh; overflow-y: auto; }
        .modal-top { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
        .modal-name-input { flex: 1; min-width: 120px; padding: 7px 14px; border-radius: 20px; border: none; font-size: clamp(13px,3vw,15px); font-weight: 600; background: rgba(255,255,255,0.9); color: #333; }
        .modal-close { background: rgba(255,255,255,0.15); border: none; border-radius: 50%; width: 32px; height: 32px; color: #fff; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .modal-close:hover { background: rgba(255,255,255,0.3); }
        .save-hint { text-align: center; font-size: clamp(11px,2vw,12px); color: rgba(255,200,100,0.85); margin-bottom: 10px; }

        .full-card-grid { display: grid; grid-template-columns: repeat(5,1fr); border-radius: 10px; overflow: hidden; border: 2.5px solid rgba(255,255,255,0.3); }
        .card-header-cell { padding: clamp(7px,2vw,12px) 4px; text-align: center; font-size: clamp(16px,3.5vw,24px); font-weight: 900; color: #fff; }
        .card-cell { border: 1px solid rgba(255,255,255,0.15); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3px; min-height: clamp(44px,9vw,64px); position: relative; transition: background 0.2s; }
        .free-label { color: #FFD700; font-weight: 800; font-size: clamp(10px,2vw,14px); }
        .cell-input { width: 100%; text-align: center; background: transparent; border: none; border-bottom: 2px solid rgba(255,255,255,0.4); color: #fff; font-size: clamp(12px,2.5vw,18px); font-weight: 700; outline: none; padding: 2px 0; }
        .cell-input::placeholder { color: rgba(255,255,255,0.3); font-size: clamp(9px,1.5vw,11px); }
        .cell-input:focus { border-bottom-color: #FFD700; }
        .cell-input.error-input { border-bottom-color: #ff5252; color: #ff5252; }
        .cell-error { font-size: clamp(7px,1.2vw,9px); color: #ff5252; margin-top: 1px; }
        .range-hint { font-size: clamp(7px,1.2vw,9px); color: rgba(255,255,255,0.35); margin-top: 1px; }

        /* Numpad legend */
        .numpad-legend { display: flex; gap: 16px; flex-wrap: wrap; justify-content: center; margin-bottom: 10px; }
        .numpad-legend-item { display: flex; align-items: center; gap: 6px; color: rgba(255,255,255,0.75); font-size: clamp(10px,1.8vw,12px); }
        .legend-swatch { width: 14px; height: 14px; border-radius: 4px; }

        @media (max-width: 900px) { .cards-grid { grid-template-columns: repeat(3,1fr); } }
        @media (max-width: 768px) {
          .bingo-page { padding: 12px 8px; gap: 12px; }
          .bingo-card, .numpad-card, .card-section { padding: 14px 10px; border-radius: 12px; }
          .display-board { gap: 3px; }
          .numpad { grid-template-columns: repeat(10,1fr); gap: 4px; }
          .cards-grid { grid-template-columns: repeat(3,1fr); gap: 10px; }
        }
        @media (max-width: 540px) {
          .cards-grid { grid-template-columns: repeat(2,1fr); }
          .display-board { grid-template-columns: repeat(10,1fr); gap: 3px; }
          .numpad { grid-template-columns: repeat(8,1fr); gap: 3px; }
        }
      `}</style>

      <div className="bingo-page">

        {/* ── 1: Ball Display Board (SINGLE — no duplicate) ── */}
        <div className="bingo-card">
          <h1 className="bingo-title">🎯 Ball Recording — Round {currentRound + 1}</h1>
          <div className="bingo-controls">
            <label>View Round:</label>
            <select value={currentRound} onChange={(e) => setCurrentRound(Number(e.target.value))}>
              {rounds.map((_, i) => <option key={i} value={i}>Round {i + 1}</option>)}
            </select>
            <button onClick={clearRound} className="btn btn-purple">Clear Round</button>
            <button onClick={addRound} className="btn btn-green">+ New Round</button>
          </div>
          <div className="display-board">
            {Array.from({ length: 75 }).map((_, idx) => {
              const num = calledNumbers[idx] ?? null;
              const color = num ? getBallColor(num) : null;
              return (
                <div key={idx} onClick={() => num && toggle(num)} className="display-ball"
                  style={{ background: num ? color : "rgba(180,60,40,0.35)", border: num ? `2px solid ${color}` : "2px dashed rgba(255,255,255,0.25)", cursor: num ? "pointer" : "default" }}
                  title={num ? `Click to remove ${num}` : ""}
                >
                  <span>{num ?? ""}</span>
                </div>
              );
            })}
          </div>
          <div className="col-row">
            {COLUMNS.map(({ label, range: [lo, hi] }) => <div key={label} className="col-label">{label} ({lo}–{hi})</div>)}
          </div>
          <div className="col-row">
            {columnCounts.map((c, i) => <div key={i} className="col-count">{c}</div>)}
          </div>
        </div>

        {/* ── 2: Number Pad — with round call count badges ── */}
        <div className="numpad-card">
          {/* Legend */}
          <div className="numpad-legend">
            <div className="numpad-legend-item">
              <div className="legend-swatch" style={{ background: "#ADD8E6", border: "2px solid #90CAE8" }} />
              <span>Not called</span>
            </div>
            <div className="numpad-legend-item">
              <div className="legend-swatch" style={{ background: "#B0BEC5", opacity: 0.5 }} />
              <span>Called this round</span>
            </div>
            <div className="numpad-legend-item">
              <div className="legend-swatch" style={{ background: "#ADD8E6", border: "2px solid #90CAE8", position: "relative", display: "inline-block" }} />
              <div style={{ background: "#FFD700", color: "#7B1212", borderRadius: 8, fontSize: 9, fontWeight: 900, padding: "1px 4px" }}>2x</div>
              <span>Called in multiple rounds</span>
            </div>
          </div>

          <div className="numpad">
            {Array.from({ length: 75 }, (_, i) => i + 1).map((n) => {
              const isCalledThisRound = calledSet.has(n);
              const totalCount = getCallCount(n); // how many rounds called

              return (
                <div key={n} className="num-ball-wrap">
                  <div
                    onClick={() => toggle(n)}
                    className="num-ball"
                    style={{
                      background: isCalledThisRound ? "#B0BEC5" : "#ADD8E6",
                      border: isCalledThisRound ? "3px solid #78909C" : "2px solid #90CAE8",
                      color: "#000",
                      opacity: isCalledThisRound ? 0.55 : 1,
                    }}
                  >
                    {n}
                    {/* Show count badge if called in ANY round */}
                    {totalCount > 0 && (
                      <div className="call-count-badge">
                        {totalCount}x
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 3: Bingo Cards Section ── */}
        <div className="card-section">
          <div className="section-title">🃏 Bingo Cards</div>

          {/* Manual Caller */}
          <div className="manual-caller">
            <div className="caller-top">
              <div className="caller-left">
                <span className="caller-title">📢 Call a Number (1–75)</span>
                <span className="round-badge">Round {currentRound + 1}</span>
                {rounds.length > 1 && (
                  <select className="round-select" value={currentRound} onChange={(e) => setCurrentRound(Number(e.target.value))}>
                    {rounds.map((_, i) => <option key={i} value={i}>Round {i + 1} ({rounds[i].length} called)</option>)}
                  </select>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn btn-green" onClick={addRound}>+ New Round</button>
                <button className="btn btn-red" onClick={clearRound}>Clear Round</button>
              </div>
            </div>
            <div className="caller-input-row">
              <input
                className={`manual-num-input ${manualError ? "input-error" : ""}`}
                type="number" min={1} max={75} value={manualInput}
                onChange={(e) => { setManualInput(e.target.value); setManualError(""); }}
                onKeyDown={handleManualKeyDown}
                placeholder="1–75"
              />
              <button className="btn btn-gold" onClick={handleManualCall}>Call</button>
              {manualError && <span className="manual-error">{manualError}</span>}
            </div>
            {calledNumbers.length === 0 ? (
              <span className="no-calls-hint">No numbers called yet — type a number and press Call or Enter</span>
            ) : (
              <>
                <div className="chips-label">{calledNumbers.length} number{calledNumbers.length !== 1 ? "s" : ""} called this round:</div>
                <div className="called-chips">
                  {calledNumbers.map((n) => (
                    <div key={n} className="called-chip" style={{ background: getBallColor(n) }}>
                      <span>{getBallLetter(n)}{n}</span>
                      <button className="chip-remove" onClick={() => handleManualRemove(n)} title={`Remove ${n}`}>✕</button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Cards Grid */}
          <div className="cards-grid">
            {cards.map((card, idx) => {
              const bingo = card.mode === "play" && checkBingo(card.grid, calledSet);
              const saveable = canSave(idx);
              return (
                <div key={idx} className={`card-item ${bingo ? "bingo-card-item" : ""}`}>
                  <div className="card-item-header">
                    <span className="card-item-name" title={card.name}>{card.name}</span>
                    <span className={`card-item-badge ${card.locked ? (bingo ? "badge-bingo" : "badge-locked") : bingo ? "badge-bingo" : card.mode === "play" ? "badge-play" : "badge-edit"}`}>
                      {bingo ? "BINGO!" : card.locked ? "🔒 Default" : card.mode === "play" ? "▶ Play" : "✏ Edit"}
                    </span>
                  </div>
                  <div className="mini-card-grid">
                    {COLUMNS.map(({ label }) => (
                      <div key={label} className="mini-header" style={{ background: HEADER_COLORS[label] }}>{label}</div>
                    ))}
                    {Array.from({ length: 5 }, (_, row) =>
                      COLUMNS.map((_, col) => {
                        const val = card.grid[col][row];
                        const isFree = col === 2 && row === 2;
                        const called = !isFree && val !== "" && (() => { const n = parseInt(val); return !isNaN(n) && calledSet.has(n); })();
                        return (
                          <div key={`${col}-${row}`}
                            className={`mini-cell ${isFree ? "mini-free" : called ? "mini-called" : val ? "" : "mini-empty"}`}
                            style={{ background: isFree ? "rgba(255,255,255,0.12)" : called ? "rgba(255,215,0,0.4)" : val ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.2)" }}
                          >
                            {isFree ? "F" : val || "·"}
                          </div>
                        );
                      })
                    )}
                  </div>
                  {bingo && <div className="bingo-label">🎉 BINGO!</div>}
                  {card.locked ? (
                    <div className="card-actions">
                      <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "clamp(10px,1.6vw,12px)", display: "flex", alignItems: "center", gap: 4 }}>
                        🔒 Default card — read only
                      </span>
                    </div>
                  ) : (
                    <div className="card-actions">
                      <button className="card-action-btn cab-edit" onClick={() => { editCard(idx); setEditingCard(idx); }}>✏️ Edit</button>
                      {card.mode === "edit" && (
                        <button className={`card-action-btn ${saveable ? "cab-save" : "cab-gray"}`}
                          onClick={() => saveable && saveCard(idx)}>💾 Save</button>
                      )}
                      <button className="card-action-btn cab-clear" onClick={() => clearCard(idx)}>🗑</button>
                      {cards.length > 1 && (
                        <button className="card-action-btn cab-remove" onClick={() => removeCard(idx)}>✕</button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <div className="add-card-tile" onClick={addCard}>
              <span style={{ fontSize: 28, color: "rgba(255,255,255,0.5)", lineHeight: 1 }}>+</span>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 4 }}>Add Card</span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingCard !== null && cards[editingCard] && !cards[editingCard].locked && (() => {
        const card = cards[editingCard];
        const saveable = canSave(editingCard);
        return (
          <div className="modal-overlay" onClick={() => setEditingCard(null)}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()}>
              <div className="modal-top">
                <input
                  className="modal-name-input"
                  value={card.name}
                  onChange={(e) => updateCardName(editingCard, e.target.value)}
                  placeholder="Card name..."
                />
                <button className={`btn ${saveable ? "btn-gold" : "btn-gray"}`}
                  onClick={() => saveable && saveCard(editingCard)}>
                  💾 Save & Play
                </button>
                <button className="modal-close" onClick={() => setEditingCard(null)}>✕</button>
              </div>
              {!saveable && <p className="save-hint">⚠️ Fill all 24 cells with valid numbers to save</p>}
              <div className="full-card-grid">
                {COLUMNS.map(({ label }) => (
                  <div key={label} className="card-header-cell" style={{ background: HEADER_COLORS[label] }}>{label}</div>
                ))}
                {Array.from({ length: 5 }, (_, row) =>
                  COLUMNS.map(({ range: [lo, hi] }, col) => {
                    const val = card.grid[col][row];
                    const isFree = col === 2 && row === 2;
                    const key = `${editingCard}-${col}-${row}`;
                    const hasError = errors[key];
                    return (
                      <div key={key} className="card-cell"
                        style={{ background: isFree ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)" }}>
                        {isFree ? (
                          <span className="free-label">FREE</span>
                        ) : (
                          <>
                            <input
                              className={`cell-input ${hasError ? "error-input" : ""}`}
                              type="number" min={lo} max={hi} value={val}
                              onChange={(e) => handleCellInput(editingCard, col, row, e.target.value)}
                              placeholder={`${lo}-${hi}`}
                            />
                            {hasError
                              ? <span className="cell-error">{hasError}</span>
                              : <span className="range-hint">{lo}–{hi}</span>
                            }
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}

