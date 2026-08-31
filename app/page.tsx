"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Atom,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  CircuitBoard,
  FlaskConical,
  Gauge,
  Lightbulb,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
  Settings2,
  Shuffle,
  Sparkles,
  Timer,
  Waves,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  buildMission,
  getMissionId,
  randomVariantSelection,
  roomBanks,
} from "@/app/question-bank";

type Level = "beginner" | "intermediate" | "advanced";
type Phase = "briefing" | "mission" | "final" | "escaped";
type GenerationMode = "random" | "teacher";

type NumericTask = {
  id: string;
  type: "number";
  prompt: string;
  unit: string;
  answer: number;
  tolerance: number;
  placeholder: string;
  guide: string;
};

type ChoiceTask = {
  id: string;
  type: "choice";
  prompt: string;
  answer: string;
  options: { value: string; label: string }[];
  guide: string;
};

type Task = NumericTask | ChoiceTask;

type Room = {
  id: string;
  variant?: number;
  variantName?: string;
  number: string;
  title: string;
  shortTitle: string;
  focus: string;
  brief: string;
  icon: LucideIcon;
  shard: string;
  accent: string;
  parameters?: { label: string; value: string }[];
  table?: {
    caption: string;
    headers: string[];
    rows: string[][];
  };
  formulae: string[];
  tasks: Task[];
  hints: string[];
};

const levels: Record<
  Level,
  {
    label: string;
    kicker: string;
    description: string;
    formulae: string;
    hints: number;
    guided: boolean;
  }
> = {
  beginner: {
    label: "Beginner",
    kicker: "Guided support",
    description:
      "Pinned formula cards, a method prompt beneath every lock, and one selectable hint for every lock.",
    formulae: "Formula cards begin open",
    hints: 3,
    guided: true,
  },
  intermediate: {
    label: "Intermediate",
    kicker: "Balanced support",
    description:
      "Formula cards are available on request, with two selectable lock-specific hints for each room.",
    formulae: "Formula cards on request",
    hints: 2,
    guided: false,
  },
  advanced: {
    label: "Advanced",
    kicker: "Independent challenge",
    description:
      "The same physics with no method prompts, formula cards on request, and one selectable lock-specific hint.",
    formulae: "Minimal scaffolding",
    hints: 1,
    guided: false,
  },
};

const rooms: Room[] = [
  {
    id: "motion",
    number: "01",
    title: "The Motion Array",
    shortTitle: "Motion",
    focus: "Mechanics · signed quantities · unit conversion",
    brief:
      "The station's guidance rail has lost its calibration. Reconstruct the probe's motion from the surviving position log.",
    icon: Gauge,
    shard: "8",
    accent: "cyan",
    table: {
      caption: "Surviving probe position log",
      headers: ["Time, t (s)", "Position, x (m)"],
      rows: [
        ["2.0", "−4.0"],
        ["5.0", "+5.0"],
        ["8.0", "+14.0"],
      ],
    },
    formulae: [
      "Δx = x_f − x_i",
      "v_av = Δx ÷ Δt",
      "km/h = (m/s) × 3.6",
    ],
    tasks: [
      {
        id: "motion-displacement",
        type: "number",
        prompt: "Determine the probe's displacement from 2.0 s to 8.0 s.",
        unit: "m",
        answer: 18,
        tolerance: 0.01,
        placeholder: "e.g. 12",
        guide: "Use final position minus initial position. Keep the negative sign on the initial position.",
      },
      {
        id: "motion-velocity",
        type: "number",
        prompt: "Calculate its average velocity during this interval.",
        unit: "m/s",
        answer: 3,
        tolerance: 0.01,
        placeholder: "e.g. 2.5",
        guide: "Divide displacement by elapsed time. The interval begins at 2.0 s, not 0 s.",
      },
      {
        id: "motion-convert",
        type: "number",
        prompt: "Convert that average velocity to kilometres per hour.",
        unit: "km/h",
        answer: 10.8,
        tolerance: 0.02,
        placeholder: "e.g. 9.0",
        guide: "To convert m/s to km/h, multiply by 3.6.",
      },
    ],
    hints: [
      "Use only the first and last entries for displacement; do not add the positions.",
      "The changes are Δx = 14 − (−4) and Δt = 8 − 2.",
      "The average velocity is 3.0 m/s. Now apply the ×3.6 conversion.",
    ],
  },
  {
    id: "forces",
    number: "02",
    title: "The Force Gate",
    shortTitle: "Forces",
    focus: "Newton's laws · algebra · multi-step motion",
    brief:
      "A jammed service sled blocks the next bulkhead. Its drive and braking forces are fighting each other.",
    icon: Zap,
    shard: "6",
    accent: "amber",
    parameters: [
      { label: "Mass", value: "12 kg" },
      { label: "Drive force", value: "54 N east" },
      { label: "Friction", value: "18 N west" },
      { label: "Initial speed", value: "0 m/s" },
    ],
    formulae: ["F_net = ΣF", "F_net = ma", "v = u + at"],
    tasks: [
      {
        id: "force-net",
        type: "number",
        prompt: "Find the magnitude of the net horizontal force on the sled.",
        unit: "N",
        answer: 36,
        tolerance: 0.01,
        placeholder: "e.g. 25",
        guide: "Choose east as positive, then combine the opposing forces with signs.",
      },
      {
        id: "force-acceleration",
        type: "number",
        prompt: "Calculate the magnitude of the sled's acceleration.",
        unit: "m/s²",
        answer: 3,
        tolerance: 0.01,
        placeholder: "e.g. 1.5",
        guide: "Rearrange F = ma to make acceleration the subject.",
      },
      {
        id: "force-speed",
        type: "number",
        prompt: "Starting from rest, what speed will it reach after 4.0 s?",
        unit: "m/s",
        answer: 12,
        tolerance: 0.02,
        placeholder: "e.g. 8.0",
        guide: "Use constant acceleration and remember that the initial speed is zero.",
      },
    ],
    hints: [
      "The two horizontal forces point in opposite directions, so subtract their magnitudes.",
      "Once you have the net force, divide by 12 kg to find acceleration.",
      "For the last lock, substitute u = 0, your acceleration, and t = 4.0 s into v = u + at.",
    ],
  },
  {
    id: "energy",
    number: "03",
    title: "The Energy Well",
    shortTitle: "Energy",
    focus: "Energy conservation · square roots · efficiency",
    brief:
      "A power cell hangs above the station's dormant core. Quantify its stored energy before releasing it into the recovery cradle.",
    icon: Atom,
    shard: "7",
    accent: "violet",
    parameters: [
      { label: "Cell mass", value: "4.0 kg" },
      { label: "Height", value: "3.0 m" },
      { label: "Gravity", value: "9.8 m/s²" },
      { label: "Useful output", value: "100 J" },
    ],
    formulae: [
      "E_p = mgh",
      "½mv² = mgh",
      "efficiency = useful ÷ input × 100%",
    ],
    tasks: [
      {
        id: "energy-gpe",
        type: "number",
        prompt: "Calculate the cell's gravitational potential energy.",
        unit: "J",
        answer: 117.6,
        tolerance: 0.05,
        placeholder: "e.g. 95",
        guide: "Multiply mass, gravitational field strength and vertical height.",
      },
      {
        id: "energy-speed",
        type: "number",
        prompt: "Ignoring air resistance, calculate its speed immediately before the cradle.",
        unit: "m/s",
        answer: 7.67,
        tolerance: 0.05,
        placeholder: "e.g. 6.2",
        guide: "Set lost gravitational energy equal to gained kinetic energy, cancel mass, then take the positive square root.",
      },
      {
        id: "energy-efficiency",
        type: "number",
        prompt: "If the system captures 100 J usefully, determine its efficiency.",
        unit: "%",
        answer: 85.03,
        tolerance: 0.12,
        placeholder: "e.g. 80",
        guide: "The calculated gravitational energy is the input; 100 J is the useful output.",
      },
    ],
    hints: [
      "The stored energy comes from mgh; keep the unrounded value for later calculations.",
      "Energy conservation gives v² = 2gh, so v is the positive square root of 2gh.",
      "Efficiency is a percentage: divide 100 J by the energy input, then multiply by 100.",
    ],
  },
  {
    id: "waves",
    number: "04",
    title: "The Resonance Archive",
    shortTitle: "Waves",
    focus: "Wave relationships · reciprocal reasoning · refraction",
    brief:
      "A repeating signal is trapped in the archive. Decode its timing and predict what happens when it crosses into a slower medium.",
    icon: Waves,
    shard: "2",
    accent: "cyan",
    parameters: [
      { label: "Frequency", value: "5.0 Hz" },
      { label: "Wavelength", value: "0.60 m" },
      { label: "New medium", value: "slower wave speed" },
    ],
    formulae: ["v = fλ", "T = 1 ÷ f", "frequency is fixed by the source"],
    tasks: [
      {
        id: "wave-speed",
        type: "number",
        prompt: "Calculate the wave speed in the original medium.",
        unit: "m/s",
        answer: 3,
        tolerance: 0.01,
        placeholder: "e.g. 4.2",
        guide: "Multiply frequency by wavelength.",
      },
      {
        id: "wave-period",
        type: "number",
        prompt: "Determine the period of one complete oscillation.",
        unit: "s",
        answer: 0.2,
        tolerance: 0.005,
        placeholder: "e.g. 0.50",
        guide: "Period and frequency are reciprocals.",
      },
      {
        id: "wave-medium",
        type: "choice",
        prompt:
          "The signal enters a medium where its speed is lower. Which combination must be correct?",
        answer: "same-lower",
        guide: "The source does not change, so frequency stays fixed. Use v = fλ to infer wavelength.",
        options: [
          { value: "lower-same", label: "Frequency decreases; wavelength stays the same" },
          { value: "same-lower", label: "Frequency stays the same; wavelength decreases" },
          { value: "same-higher", label: "Frequency stays the same; wavelength increases" },
          { value: "higher-lower", label: "Frequency increases; wavelength decreases" },
        ],
      },
    ],
    hints: [
      "Use the two wave equations separately: v = fλ and T = 1/f.",
      "A frequency of 5.0 cycles each second means each cycle takes one-fifth of a second.",
      "At a boundary, the source still sets frequency. If v decreases while f is constant, λ must decrease.",
    ],
  },
  {
    id: "circuits",
    number: "05",
    title: "The Circuit Console",
    shortTitle: "Circuits",
    focus: "Parallel circuits · inverse relationships · electrical power",
    brief:
      "Two cooling branches must share a 12 V supply. Find the load the restored circuit will place on the console.",
    icon: CircuitBoard,
    shard: "2",
    accent: "amber",
    parameters: [
      { label: "Supply", value: "12 V" },
      { label: "Branch 1", value: "6.0 Ω" },
      { label: "Branch 2", value: "3.0 Ω" },
      { label: "Connection", value: "parallel" },
    ],
    formulae: [
      "1/R_T = 1/R₁ + 1/R₂",
      "V = IR",
      "P = VI",
    ],
    tasks: [
      {
        id: "circuit-resistance",
        type: "number",
        prompt: "Calculate the equivalent resistance of the two branches.",
        unit: "Ω",
        answer: 2,
        tolerance: 0.01,
        placeholder: "e.g. 4.0",
        guide: "For parallel resistors, add reciprocals first, then invert the result.",
      },
      {
        id: "circuit-current",
        type: "number",
        prompt: "Calculate the total current drawn from the supply.",
        unit: "A",
        answer: 6,
        tolerance: 0.02,
        placeholder: "e.g. 3.5",
        guide: "Apply Ohm's law to the supply voltage and equivalent resistance.",
      },
      {
        id: "circuit-power",
        type: "number",
        prompt: "Determine the total power delivered by the supply.",
        unit: "W",
        answer: 72,
        tolerance: 0.05,
        placeholder: "e.g. 48",
        guide: "Multiply the supply voltage by the total current.",
      },
    ],
    hints: [
      "The equivalent resistance of a parallel network must be smaller than its smallest branch resistance.",
      "Here, 1/R_T = 1/6 + 1/3. Combine the fractions before taking the reciprocal.",
      "Use the full 12 V across the equivalent resistance, then use P = VI.",
    ],
  },
  {
    id: "evidence",
    number: "06",
    title: "The Evidence Chamber",
    shortTitle: "Evidence",
    focus: "Magnetism · gradients · evidence-based conclusions",
    brief:
      "The final lock accepts only a conclusion supported by data from a solenoid investigation. Recover the relationship hidden in the readings.",
    icon: FlaskConical,
    shard: "6",
    accent: "violet",
    table: {
      caption: "Magnetic field measured at the centre of a solenoid",
      headers: ["Current, I (A)", "Magnetic field, B (mT)"],
      rows: [
        ["0.50", "0.80"],
        ["1.00", "1.60"],
        ["1.50", "2.40"],
        ["2.00", "3.20"],
      ],
    },
    formulae: [
      "gradient = ΔB ÷ ΔI",
      "linear model: B = kI",
      "direct proportion: straight line through origin",
    ],
    tasks: [
      {
        id: "evidence-gradient",
        type: "number",
        prompt: "Calculate the gradient of the B–I relationship.",
        unit: "mT/A",
        answer: 1.6,
        tolerance: 0.02,
        placeholder: "e.g. 1.2",
        guide: "Choose two well-separated data points and divide the change in B by the change in I.",
      },
      {
        id: "evidence-predict",
        type: "number",
        prompt: "Use the pattern to predict B when the current is 2.50 A.",
        unit: "mT",
        answer: 4,
        tolerance: 0.03,
        placeholder: "e.g. 3.6",
        guide: "Treat the gradient as the proportionality constant k in B = kI.",
      },
      {
        id: "evidence-conclusion",
        type: "choice",
        prompt: "Which conclusion is best supported by these data?",
        answer: "direct",
        guide: "Compare equal changes in current with the resulting changes in magnetic field.",
        options: [
          { value: "constant", label: "Magnetic field remains constant as current increases" },
          { value: "inverse", label: "Magnetic field is inversely proportional to current" },
          { value: "direct", label: "Magnetic field is directly proportional to current over the tested range" },
          { value: "square", label: "Magnetic field is proportional to the square of current" },
        ],
      },
    ],
    hints: [
      "Look for how much B changes every time I increases by 0.50 A.",
      "The ratio B/I is the same in every row, so it can be used to predict the next value.",
      "A constant B/I ratio supports direct proportionality over the measured range; do not claim beyond the evidence.",
    ],
  },
];

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function numericValue(value: string) {
  const cleaned = value.trim().replace(",", ".");
  const match = cleaned.match(/^[-+]?\d*\.?\d+(?:e[-+]?\d+)?/i);
  return match ? Number(match[0]) : Number.NaN;
}

function isTaskCorrect(task: Task, value: string | undefined) {
  if (!value) return false;
  if (task.type === "choice") return value === task.answer;
  const entered = numericValue(value);
  return Number.isFinite(entered) && Math.abs(entered - task.answer) <= task.tolerance;
}

function MissionMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`mission-mark ${compact ? "mission-mark--compact" : ""}`} aria-label="Aether Lock mission mark">
      <span className="mission-mark__ring" />
      <Atom aria-hidden="true" />
    </div>
  );
}

export default function Home() {
  const [level, setLevel] = useState<Level>("intermediate");
  const [generationMode, setGenerationMode] = useState<GenerationMode>("random");
  const [teacherVariants, setTeacherVariants] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [variantIndices, setVariantIndices] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [missionRooms, setMissionRooms] = useState<Room[]>(rooms);
  const [phase, setPhase] = useState<Phase>("briefing");
  const [roomIndex, setRoomIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [invalidTasks, setInvalidTasks] = useState<string[]>([]);
  const [solvedRooms, setSolvedRooms] = useState<number[]>([]);
  const [revealedHintsByRoom, setRevealedHintsByRoom] = useState<Record<number, number[]>>({});
  const [formulaOpen, setFormulaOpen] = useState<Record<number, boolean>>({});
  const [attempts, setAttempts] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [roomSolvedNow, setRoomSolvedNow] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState(false);
  const startedAt = useRef<number | null>(null);

  const support = levels[level];
  const currentRoom = missionRooms[roomIndex];
  const missionId = getMissionId(variantIndices);
  const finalCode = useMemo(
    () => missionRooms.map((room) => room.shard).join(""),
    [missionRooms],
  );
  const hintsUsed = useMemo(
    () => Object.values(revealedHintsByRoom).reduce((sum, hints) => sum + hints.length, 0),
    [revealedHintsByRoom],
  );

  useEffect(() => {
    if (phase !== "mission" && phase !== "final") return;
    const update = () => {
      if (startedAt.current) {
        setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
      }
    };
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [phase]);

  function startMission() {
    const selection = generationMode === "random"
      ? randomVariantSelection()
      : [...teacherVariants];
    setVariantIndices(selection);
    setMissionRooms(buildMission(selection));
    setAnswers({});
    setInvalidTasks([]);
    setSolvedRooms([]);
    setRevealedHintsByRoom({});
    setFormulaOpen(level === "beginner" ? { 0: true } : {});
    setAttempts(0);
    setElapsed(0);
    setRoomIndex(0);
    setRoomSolvedNow(false);
    setCode("");
    setCodeError(false);
    startedAt.current = Date.now();
    setPhase("mission");
  }

  function updateTeacherVariant(room: number, value: string) {
    setTeacherVariants((current) =>
      current.map((variant, index) => index === room ? Number(value) : variant),
    );
  }

  function updateAnswer(taskId: string, value: string) {
    setAnswers((current) => ({ ...current, [taskId]: value }));
    setInvalidTasks((current) => current.filter((id) => id !== taskId));
  }

  function submitRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (roomSolvedNow) return;
    setAttempts((current) => current + 1);
    const wrong = currentRoom.tasks
      .filter((task) => !isTaskCorrect(task, answers[task.id]))
      .map((task) => task.id);

    if (wrong.length > 0) {
      setInvalidTasks(wrong);
      return;
    }

    setInvalidTasks([]);
    setSolvedRooms((current) =>
      current.includes(roomIndex) ? current : [...current, roomIndex],
    );
    setRoomSolvedNow(true);
  }

  function continueMission() {
    if (roomIndex === missionRooms.length - 1) {
      setPhase("final");
      return;
    }
    const next = roomIndex + 1;
    setRoomIndex(next);
    setRoomSolvedNow(false);
    setInvalidTasks([]);
    if (level === "beginner") {
      setFormulaOpen((current) => ({ ...current, [next]: true }));
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function revealHint(lockIndex: number) {
    const revealed = revealedHintsByRoom[roomIndex] ?? [];
    const allowed = Math.min(support.hints, currentRoom.hints.length);
    if (revealed.includes(lockIndex) || revealed.length >= allowed) return;
    setRevealedHintsByRoom((current) => ({
      ...current,
      [roomIndex]: [...(current[roomIndex] ?? []), lockIndex].sort((a, b) => a - b),
    }));
  }

  function submitFinalCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (code === finalCode) {
      setCodeError(false);
      setPhase("escaped");
      return;
    }
    setCodeError(true);
  }

  function restart() {
    startedAt.current = null;
    setPhase("briefing");
    setRoomIndex(0);
    setAnswers({});
    setInvalidTasks([]);
    setSolvedRooms([]);
    setRevealedHintsByRoom({});
    setFormulaOpen({});
    setAttempts(0);
    setElapsed(0);
    setRoomSolvedNow(false);
    setCode("");
    setCodeError(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (phase === "briefing") {
    return (
      <main className="escape-shell briefing-shell">
        <div className="ambient-grid" aria-hidden="true" />
        <header className="briefing-header">
          <div className="brand-lockup">
            <MissionMark compact />
            <div>
              <span className="eyebrow">Year 11 Physics revision</span>
              <span className="brand-name">The Aether Lock</span>
            </div>
          </div>
          <div className="mission-meta" aria-label="Activity information">
            <span><Timer aria-hidden="true" /> 30–40 min</span>
            <span><ShieldCheck aria-hidden="true" /> 6 systems</span>
            <span><Shuffle aria-hidden="true" /> 15,625 missions</span>
            <span><BookOpen aria-hidden="true" /> calculator ready</span>
          </div>
        </header>

        <section className="briefing-grid">
          <div className="briefing-copy">
            <div className="status-chip"><span /> A 30–40 minute team challenge</div>
            <h1>The Aether <em>Lock</em></h1>
            <p className="lead">
              Work through six connected rooms covering motion, forces, energy, waves, circuits and scientific evidence. Solve each one to unlock the exit.
            </p>
            <div className="mission-callout">
              <LockKeyhole aria-hidden="true" />
              <div>
                <strong>How it works</strong>
                <p>Each room has three short locks. Solve all three to collect one digit of the final escape code.</p>
              </div>
            </div>
            <ol className="room-preview" aria-label="Mission systems">
              {roomBanks.map((room) => {
                const Icon = room.icon;
                return (
                  <li key={room.id}>
                    <span>{room.number}</span>
                    <Icon aria-hidden="true" />
                    <div><strong>{room.shortTitle}</strong><small>{room.focus.split(" · ")[0]}</small></div>
                  </li>
                );
              })}
            </ol>
          </div>

          <aside className="support-console" aria-labelledby="support-title">
            <div className="console-topline"><span>Choose what works for you</span><span>Same questions, different support</span></div>
            <h2 id="support-title">Choose your level of support</h2>
            <p>Everyone completes the same physics content. The hints and formula help change to match the support you choose.</p>

            <RadioGroup
              value={level}
              onValueChange={(value) => setLevel(value as Level)}
              className="level-grid"
              aria-label="Choose support level"
            >
              {(Object.keys(levels) as Level[]).map((value) => {
                const option = levels[value];
                return (
                  <label key={value} className={`level-card ${level === value ? "is-selected" : ""}`}>
                    <RadioGroupItem value={value} aria-label={option.label} />
                    <span className="level-card__index">0{value === "beginner" ? 1 : value === "intermediate" ? 2 : 3}</span>
                    <span className="level-card__copy">
                      <small>{option.kicker}</small>
                      <strong>{option.label}</strong>
                      <span>{option.description}</span>
                    </span>
                  </label>
                );
              })}
            </RadioGroup>

            <section className="mission-generator" aria-labelledby="generator-title">
              <div className="mission-generator__heading">
                <div>
                  <span id="generator-title">Choose a question set</span>
                  <small>Five variants for every topic</small>
                </div>
                <Shuffle aria-hidden="true" />
              </div>

              <RadioGroup
                value={generationMode}
                onValueChange={(value) => setGenerationMode(value as GenerationMode)}
                className="mission-mode-grid"
                aria-label="Choose mission generation mode"
              >
                <label className={generationMode === "random" ? "is-selected" : ""}>
                  <RadioGroupItem value="random" />
                  <Shuffle aria-hidden="true" />
                  <span><strong>Surprise me</strong><small>A fresh mix each time</small></span>
                </label>
                <label className={generationMode === "teacher" ? "is-selected" : ""}>
                  <RadioGroupItem value="teacher" />
                  <Settings2 aria-hidden="true" />
                  <span><strong>Choose variants</strong><small>Pick a set for testing</small></span>
                </label>
              </RadioGroup>

              {generationMode === "teacher" ? (
                <div className="variant-selectors">
                  {roomBanks.map((room, index) => (
                    <label key={room.id}>
                      <span>{room.code} · {room.shortTitle}</span>
                      <Select
                        value={String(teacherVariants[index])}
                        onValueChange={(value) => updateTeacherVariant(index, value)}
                      >
                        <SelectTrigger aria-label={`${room.shortTitle} question variant`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {room.variants.map((variant, variantIndex) => (
                            <SelectItem key={variant.variant} value={String(variantIndex)}>
                              V{variant.variant} · {variant.variantName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </label>
                  ))}
                  <p>Testing mission <strong>{getMissionId(teacherVariants)}</strong></p>
                </div>
              ) : (
                <p className="random-summary">We’ll choose one of five scenarios for each topic when you begin.</p>
              )}
            </section>

            <div className="selected-support">
              <Sparkles aria-hidden="true" />
              <div><span>Your setup</span><strong>{support.label} · {support.formulae}</strong></div>
            </div>

            <Button type="button" size="lg" onClick={startMission} className="launch-button">
              Start the escape room <ArrowRight aria-hidden="true" />
            </Button>
            <p className="fine-print">Work individually or in pairs. Keep your rough working nearby; units are shown with each answer.</p>
          </aside>
        </section>

        <footer className="briefing-footer">
          <span>NSW Physics 11–12 Syllabus (2025) · Year 11 revision</span>
          <span>Built for classroom problem solving</span>
        </footer>
      </main>
    );
  }

  if (phase === "escaped") {
    return (
      <main className="escape-shell completion-shell">
        <div className="ambient-grid" aria-hidden="true" />
        <section className="completion-card" aria-labelledby="completion-title">
          <div className="completion-orbit" aria-hidden="true"><MissionMark /></div>
          <span className="eyebrow">All six rooms complete</span>
          <span className="mission-id-display">Mission {missionId}</span>
          <h1 id="completion-title">You <em>escaped.</em></h1>
          <p>You solved all six physics rooms and recovered the final code.</p>
          <div className="completion-stats">
            <div><Timer aria-hidden="true" /><span>Time</span><strong>{formatTime(elapsed)}</strong></div>
            <div><ShieldCheck aria-hidden="true" /><span>Support</span><strong>{support.label}</strong></div>
            <div><Lightbulb aria-hidden="true" /><span>Hints</span><strong>{hintsUsed}</strong></div>
            <div><RotateCcw aria-hidden="true" /><span>Checks</span><strong>{attempts}</strong></div>
          </div>
          <div className="systems-restored">
            <span>Systems restored</span>
            <ul>
              {missionRooms.map((room) => {
                const Icon = room.icon;
                return <li key={room.id}><Icon aria-hidden="true" />{room.shortTitle}<Check aria-hidden="true" /></li>;
              })}
            </ul>
          </div>
          <Button type="button" size="lg" onClick={restart} className="launch-button">
            <RotateCcw aria-hidden="true" /> Run the mission again
          </Button>
        </section>
      </main>
    );
  }

  if (phase === "final") {
    return (
      <main className="escape-shell final-shell">
        <div className="ambient-grid" aria-hidden="true" />
        <header className="mission-header">
          <div className="brand-lockup"><MissionMark compact /><div><span className="eyebrow">The Aether Lock</span><span className="brand-name">Final code</span></div></div>
          <div className="mission-header__right">
            <span className="mission-id-badge">{missionId}</span>
            <div className="timer-readout"><Timer aria-hidden="true" /><span>Elapsed</span><strong>{formatTime(elapsed)}</strong></div>
          </div>
        </header>
        <section className="final-card" aria-labelledby="final-title">
          <div className="final-icon"><LockKeyhole aria-hidden="true" /></div>
          <span className="eyebrow">Six rooms complete</span>
          <span className="mission-id-display">Mission {missionId}</span>
          <h1 id="final-title">Enter your escape code.</h1>
          <p>Put the six digits in room order, from Room 01 to Room 06.</p>
          <div className="shard-rack" aria-label="Recovered code fragments">
            {missionRooms.map((room) => <span key={room.id}><small>{room.number}</small><strong>{room.shard}</strong></span>)}
          </div>
          <form onSubmit={submitFinalCode} className="code-form">
            <label htmlFor="escape-code">Six-digit escape code</label>
            <InputOTP
              id="escape-code"
              maxLength={6}
              value={code}
              onChange={(value) => { setCode(value); setCodeError(false); }}
              inputMode="numeric"
              pattern="[0-9]*"
              aria-invalid={codeError}
              containerClassName="otp-container"
            >
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((index) => <InputOTPSlot key={index} index={index} className="otp-slot" />)}
              </InputOTPGroup>
            </InputOTP>
            {codeError && <p className="error-message" role="alert">Code rejected. Check that the fragments are in Room 01 → Room 06 order.</p>}
            <Button type="submit" size="lg" disabled={code.length !== 6} className="launch-button">
              Release the exit <ArrowRight aria-hidden="true" />
            </Button>
          </form>
        </section>
      </main>
    );
  }

  const revealedHints = revealedHintsByRoom[roomIndex] ?? [];
  const allowedHints = Math.min(support.hints, currentRoom.hints.length);
  const remainingHints = Math.max(allowedHints - revealedHints.length, 0);
  const isFormulaOpen = formulaOpen[roomIndex] ?? level === "beginner";
  const progress = (solvedRooms.length / missionRooms.length) * 100;
  const CurrentIcon = currentRoom.icon;

  return (
    <main className="escape-shell mission-shell">
      <div className="ambient-grid" aria-hidden="true" />
      <header className="mission-header">
        <div className="brand-lockup">
          <MissionMark compact />
          <div><span className="eyebrow">The Aether Lock</span><span className="brand-name">Year 11 Physics Escape Room</span></div>
        </div>
        <div className="mission-header__right">
          <span className="mission-id-badge">{missionId}</span>
          <span className="support-badge">{support.label} support</span>
          <div className="timer-readout"><Timer aria-hidden="true" /><span>Elapsed</span><strong>{formatTime(elapsed)}</strong></div>
        </div>
      </header>

      <section className="mission-progress" aria-label="Mission progress">
        <div className="progress-summary">
          <span>System {String(roomIndex + 1).padStart(2, "0")} / 06</span>
          <strong>{Math.round(progress)}% restored</strong>
        </div>
        <Progress value={progress} className="progress-bar" />
        <ol className="progress-nodes">
          {missionRooms.map((room, index) => {
            const Icon = room.icon;
            const solved = solvedRooms.includes(index);
            const active = index === roomIndex;
            return (
              <li key={room.id} className={`${solved ? "is-solved" : ""} ${active ? "is-active" : ""}`} aria-current={active ? "step" : undefined}>
                <span>{solved ? <Check aria-hidden="true" /> : <Icon aria-hidden="true" />}</span>
                <small>{room.shortTitle}</small>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="mission-layout">
        <section className={`room-console accent-${currentRoom.accent}`} aria-labelledby="room-title">
          <div className="room-heading">
            <div className="room-heading__icon"><CurrentIcon aria-hidden="true" /></div>
            <div>
              <span className="eyebrow">Room {currentRoom.number} · Variant {currentRoom.variant} · {currentRoom.focus}</span>
              <h1 id="room-title">{currentRoom.title}</h1>
              <span className="variant-tag">{currentRoom.variantName}</span>
              <p>{currentRoom.brief}</p>
            </div>
          </div>

          {currentRoom.parameters && (
            <dl className="parameter-grid">
              {currentRoom.parameters.map((parameter) => (
                <div key={parameter.label}><dt>{parameter.label}</dt><dd>{parameter.value}</dd></div>
              ))}
            </dl>
          )}

          {currentRoom.table && (
            <div className="data-table-wrap">
              <Table>
                <caption>{currentRoom.table.caption}</caption>
                <TableHeader><TableRow>{currentRoom.table.headers.map((header) => <TableHead key={header}>{header}</TableHead>)}</TableRow></TableHeader>
                <TableBody>
                  {currentRoom.table.rows.map((row, index) => <TableRow key={`${currentRoom.id}-${index}`}>{row.map((cell, cellIndex) => <TableCell key={`${cell}-${cellIndex}`}>{cell}</TableCell>)}</TableRow>)}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="formula-drawer">
            <button type="button" onClick={() => setFormulaOpen((current) => ({ ...current, [roomIndex]: !isFormulaOpen }))} aria-expanded={isFormulaOpen}>
              <span><BookOpen aria-hidden="true" /> Formula card {level === "beginner" && <small>opened for guided mode</small>}</span>
              {isFormulaOpen ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
            </button>
            {isFormulaOpen && <div className="formula-list">{currentRoom.formulae.map((formula) => <code key={formula}>{formula}</code>)}</div>}
          </div>

          <form onSubmit={submitRoom} className="lock-form" noValidate>
            <div className="lock-form__header"><span>Calibration locks</span><small>Enter numbers only; units are supplied.</small></div>
            {currentRoom.tasks.map((task, index) => {
              const invalid = invalidTasks.includes(task.id);
              return (
                <fieldset key={task.id} className={`task-card ${invalid ? "is-invalid" : ""}`}>
                  <legend><span>{index + 1}</span>{task.prompt}</legend>
                  {task.type === "number" ? (
                    <div className="answer-row">
                      <Input
                        id={task.id}
                        name={task.id}
                        inputMode="decimal"
                        value={answers[task.id] ?? ""}
                        onChange={(event) => updateAnswer(task.id, event.target.value)}
                        placeholder={task.placeholder}
                        aria-invalid={invalid}
                        aria-describedby={`${task.id}-support`}
                        autoComplete="off"
                      />
                      <span>{task.unit}</span>
                    </div>
                  ) : (
                    <RadioGroup value={answers[task.id] ?? ""} onValueChange={(value) => updateAnswer(task.id, value)} className="choice-grid" aria-invalid={invalid}>
                      {task.options.map((option) => (
                        <label key={option.value} className={answers[task.id] === option.value ? "is-selected" : ""}>
                          <RadioGroupItem value={option.value} />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </RadioGroup>
                  )}
                  <div id={`${task.id}-support`}>
                    {support.guided && <p className="method-guide"><Sparkles aria-hidden="true" /><span><strong>Method prompt</strong>{task.guide}</span></p>}
                    {invalid && <p className="field-error" role="alert">This lock is not aligned yet. Recheck the value, sign or selected relationship.</p>}
                  </div>
                </fieldset>
              );
            })}

            {invalidTasks.length > 0 && (
              <div className="submission-feedback" role="alert">
                <span>{currentRoom.tasks.length - invalidTasks.length}/{currentRoom.tasks.length}</span>
                <p><strong>Some locks aligned.</strong> Review the highlighted {invalidTasks.length === 1 ? "response" : "responses"}; correct entries have been kept.</p>
              </div>
            )}

            {!roomSolvedNow ? (
              <Button type="submit" size="lg" className="submit-locks">Test all three locks <ArrowRight aria-hidden="true" /></Button>
            ) : (
              <div className="room-success" role="status">
                <div><ShieldCheck aria-hidden="true" /><span><small>System restored</small><strong>Code fragment recovered</strong></span></div>
                <span className="recovered-shard">{currentRoom.shard}</span>
                <Button type="button" size="lg" onClick={continueMission}>{roomIndex === missionRooms.length - 1 ? "Open final lock" : "Enter next room"}<ArrowRight aria-hidden="true" /></Button>
              </div>
            )}
          </form>
        </section>

        <aside className="support-rail" aria-label="Mission support">
          <section className="support-panel">
            <div className="support-panel__heading"><Lightbulb aria-hidden="true" /><div><span>Lock-specific hints</span><small>{revealedHints.length} of {allowedHints} hint choices used</small></div></div>
            <div className="hint-stack">
              {currentRoom.hints.map((hint, index) => {
                const isRevealed = revealedHints.includes(index);
                const canReveal = !isRevealed && remainingHints > 0;
                return (
                  <div key={`${currentRoom.id}-hint-${index}`} className={`hint-choice ${isRevealed ? "is-revealed" : ""}`}>
                    <div className="hint-choice__label">
                      <span>Lock {index + 1}</span>
                      <small>{isRevealed ? "Hint opened" : "Choose if needed"}</small>
                    </div>
                    {isRevealed ? (
                      <p>{hint}</p>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => revealHint(index)}
                        disabled={!canReveal}
                        className="hint-button"
                        aria-label={`Reveal hint for lock ${index + 1}`}
                      >
                        <Lightbulb aria-hidden="true" /> {canReveal ? `Reveal Lock ${index + 1} hint` : "Hint allowance used"}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="hint-budget">{remainingHints > 0 ? `${remainingHints} hint ${remainingHints === 1 ? "choice" : "choices"} remaining in this room.` : "Hint allowance used for this room."}</p>
          </section>

          <section className="fragment-panel">
            <span>Recovered fragments</span>
            <div>
              {missionRooms.map((room, index) => <span key={room.id} className={solvedRooms.includes(index) ? "is-recovered" : ""}>{solvedRooms.includes(index) ? room.shard : "·"}</span>)}
            </div>
            <small>Keep these in room order. You will need all six.</small>
          </section>

          <section className="rules-panel">
            <strong>Calibration rules</strong>
            <ul>
              <li>Use unrounded values in later steps.</li>
              <li>Round final calculated values sensibly.</li>
              <li>Numeric tolerances accept normal rounding.</li>
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}
