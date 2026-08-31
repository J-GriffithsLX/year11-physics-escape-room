import type { LucideIcon } from "lucide-react";
import { Atom, CircuitBoard, FlaskConical, Gauge, Waves, Zap } from "lucide-react";

export type NumericTask = {
  id: string;
  type: "number";
  prompt: string;
  unit: string;
  answer: number;
  tolerance: number;
  placeholder: string;
  guide: string;
};

export type ChoiceTask = {
  id: string;
  type: "choice";
  prompt: string;
  answer: string;
  options: { value: string; label: string }[];
  guide: string;
};

export type Task = NumericTask | ChoiceTask;

export type Scenario = {
  variant: number;
  variantName: string;
  brief: string;
  shard: string;
  parameters?: { label: string; value: string }[];
  table?: {
    caption: string;
    headers: string[];
    rows: string[][];
  };
  tasks: Task[];
  hints: string[];
};

export type RoomBank = {
  id: string;
  code: string;
  number: string;
  title: string;
  shortTitle: string;
  focus: string;
  icon: LucideIcon;
  accent: string;
  formulae: string[];
  variants: Scenario[];
};

export type MissionRoom = Omit<RoomBank, "code" | "variants"> & Scenario;

function compactNumber(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("en-AU", {
    maximumFractionDigits,
    useGrouping: false,
  }).format(value);
}

function signedNumber(value: number) {
  if (value > 0) return `+${compactNumber(value)}`;
  if (value < 0) return `−${compactNumber(Math.abs(value))}`;
  return "0";
}

function motionScenario(config: {
  variant: number;
  variantName: string;
  shard: string;
  startTime: number;
  middleTime: number;
  endTime: number;
  startPosition: number;
  middlePosition: number;
  endPosition: number;
}): Scenario {
  const displacement = config.endPosition - config.startPosition;
  const elapsed = config.endTime - config.startTime;
  const velocity = displacement / elapsed;
  const converted = velocity * 3.6;
  const prefix = `m${config.variant}`;

  return {
    variant: config.variant,
    variantName: config.variantName,
    shard: config.shard,
    brief: `The ${config.variantName.toLowerCase()} position log survived the guidance failure. Recover its signed motion quantities to recalibrate the rail.`,
    table: {
      caption: `${config.variantName} probe position log`,
      headers: ["Time, t (s)", "Position, x (m)"],
      rows: [
        [compactNumber(config.startTime), signedNumber(config.startPosition)],
        [compactNumber(config.middleTime), signedNumber(config.middlePosition)],
        [compactNumber(config.endTime), signedNumber(config.endPosition)],
      ],
    },
    tasks: [
      {
        id: `${prefix}-displacement`,
        type: "number",
        prompt: `Determine the signed displacement from ${compactNumber(config.startTime)} s to ${compactNumber(config.endTime)} s.`,
        unit: "m",
        answer: displacement,
        tolerance: 0.02,
        placeholder: "signed value",
        guide: "Use final position minus initial position. Preserve the signs shown in the table.",
      },
      {
        id: `${prefix}-velocity`,
        type: "number",
        prompt: "Calculate the signed average velocity during this interval.",
        unit: "m/s",
        answer: velocity,
        tolerance: 0.02,
        placeholder: "signed value",
        guide: "Divide the signed displacement by elapsed time, not by the final clock reading.",
      },
      {
        id: `${prefix}-convert`,
        type: "number",
        prompt: "Convert that signed average velocity to kilometres per hour.",
        unit: "km/h",
        answer: converted,
        tolerance: 0.05,
        placeholder: "signed value",
        guide: "Multiply the velocity in m/s by 3.6 and retain its direction sign.",
      },
    ],
    hints: [
      "Use only the first and last entries for displacement; the middle reading is a consistency check.",
      `The interval is Δt = ${compactNumber(config.endTime)} − ${compactNumber(config.startTime)} s and Δx = ${signedNumber(config.endPosition)} − (${signedNumber(config.startPosition)}) m.`,
      `After finding ${compactNumber(velocity)} m/s, multiply by 3.6. A negative result represents motion in the negative direction.`,
    ],
  };
}

function forceScenario(config: {
  variant: number;
  variantName: string;
  shard: string;
  object: string;
  mass: number;
  drive: number;
  friction: number;
  initialSpeed: number;
  time: number;
}): Scenario {
  const netForce = config.drive - config.friction;
  const acceleration = netForce / config.mass;
  const finalSpeed = config.initialSpeed + acceleration * config.time;
  const prefix = `f${config.variant}`;

  return {
    variant: config.variant,
    variantName: config.variantName,
    shard: config.shard,
    brief: `A ${config.object} blocks the force gate. Its drive acts east while friction acts west; determine whether the control system can clear it.`,
    parameters: [
      { label: "Mass", value: `${compactNumber(config.mass)} kg` },
      { label: "Drive force", value: `${compactNumber(config.drive)} N east` },
      { label: "Friction", value: `${compactNumber(config.friction)} N west` },
      { label: "Initial speed", value: `${compactNumber(config.initialSpeed)} m/s east` },
      { label: "Drive time", value: `${compactNumber(config.time)} s` },
    ],
    tasks: [
      {
        id: `${prefix}-net`,
        type: "number",
        prompt: "Find the magnitude of the net horizontal force.",
        unit: "N",
        answer: netForce,
        tolerance: 0.02,
        placeholder: "e.g. 25",
        guide: "Choose east as positive and subtract the opposing friction force.",
      },
      {
        id: `${prefix}-acceleration`,
        type: "number",
        prompt: "Calculate the magnitude of the resulting acceleration.",
        unit: "m/s²",
        answer: acceleration,
        tolerance: 0.03,
        placeholder: "e.g. 2.5",
        guide: "Rearrange F = ma to make acceleration the subject.",
      },
      {
        id: `${prefix}-speed`,
        type: "number",
        prompt: `Calculate the speed after ${compactNumber(config.time)} s of constant acceleration.`,
        unit: "m/s",
        answer: finalSpeed,
        tolerance: 0.05,
        placeholder: "e.g. 12",
        guide: "Use v = u + at with the stated initial speed.",
      },
    ],
    hints: [
      "The applied force and friction point in opposite directions, so their magnitudes do not add.",
      `Find F_net = ${compactNumber(config.drive)} − ${compactNumber(config.friction)} N, then divide by ${compactNumber(config.mass)} kg.`,
      `For the last lock, substitute u = ${compactNumber(config.initialSpeed)} m/s, your acceleration and t = ${compactNumber(config.time)} s into v = u + at.`,
    ],
  };
}

function energyScenario(config: {
  variant: number;
  variantName: string;
  shard: string;
  object: string;
  mass: number;
  height: number;
  usefulOutput: number;
}): Scenario {
  const gravity = 9.8;
  const potentialEnergy = config.mass * gravity * config.height;
  const impactSpeed = Math.sqrt(2 * gravity * config.height);
  const efficiency = (config.usefulOutput / potentialEnergy) * 100;
  const prefix = `e${config.variant}`;

  return {
    variant: config.variant,
    variantName: config.variantName,
    shard: config.shard,
    brief: `A ${config.object} hangs above the dormant core. Quantify its stored energy, release speed and useful recovery before lowering the barrier.`,
    parameters: [
      { label: "Mass", value: `${compactNumber(config.mass)} kg` },
      { label: "Height", value: `${compactNumber(config.height)} m` },
      { label: "Gravity", value: "9.8 m/s²" },
      { label: "Useful output", value: `${compactNumber(config.usefulOutput)} J` },
    ],
    tasks: [
      {
        id: `${prefix}-gpe`,
        type: "number",
        prompt: "Calculate the object's gravitational potential energy.",
        unit: "J",
        answer: potentialEnergy,
        tolerance: 0.08,
        placeholder: "e.g. 120",
        guide: "Multiply mass, gravitational field strength and vertical height.",
      },
      {
        id: `${prefix}-speed`,
        type: "number",
        prompt: "Ignoring air resistance, calculate its speed immediately before the cradle.",
        unit: "m/s",
        answer: impactSpeed,
        tolerance: 0.06,
        placeholder: "e.g. 7.5",
        guide: "Set lost gravitational energy equal to gained kinetic energy, cancel mass and take the positive square root.",
      },
      {
        id: `${prefix}-efficiency`,
        type: "number",
        prompt: `If ${compactNumber(config.usefulOutput)} J is captured usefully, determine the recovery efficiency.`,
        unit: "%",
        answer: efficiency,
        tolerance: 0.15,
        placeholder: "e.g. 82",
        guide: "Divide useful energy output by the calculated energy input, then multiply by 100.",
      },
    ],
    hints: [
      `Use E_p = mgh with m = ${compactNumber(config.mass)} kg and h = ${compactNumber(config.height)} m. Keep this unrounded result.`,
      `Energy conservation reduces to v = √(2gh); use the physically meaningful positive square root.`,
      `Efficiency = ${compactNumber(config.usefulOutput)} J ÷ energy input × 100%.`,
    ],
  };
}

const waveOptions = [
  { value: "lower-same", label: "Frequency decreases; wavelength stays the same" },
  { value: "same-lower", label: "Frequency stays the same; wavelength decreases" },
  { value: "same-higher", label: "Frequency stays the same; wavelength increases" },
  { value: "higher-lower", label: "Frequency increases; wavelength decreases" },
];

function waveScenario(config: {
  variant: number;
  variantName: string;
  shard: string;
  frequency: number;
  wavelength: number;
  newMedium: "slower" | "faster";
}): Scenario {
  const speed = config.frequency * config.wavelength;
  const period = 1 / config.frequency;
  const correctChoice = config.newMedium === "slower" ? "same-lower" : "same-higher";
  const prefix = `w${config.variant}`;

  return {
    variant: config.variant,
    variantName: config.variantName,
    shard: config.shard,
    brief: `The ${config.variantName.toLowerCase()} signal is trapped in the archive. Decode its timing and predict its behaviour in a ${config.newMedium} medium.`,
    parameters: [
      { label: "Frequency", value: `${compactNumber(config.frequency)} Hz` },
      { label: "Wavelength", value: `${compactNumber(config.wavelength)} m` },
      { label: "New medium", value: `${config.newMedium} wave speed` },
    ],
    tasks: [
      {
        id: `${prefix}-speed`,
        type: "number",
        prompt: "Calculate the wave speed in the original medium.",
        unit: "m/s",
        answer: speed,
        tolerance: 0.03,
        placeholder: "e.g. 4.2",
        guide: "Multiply frequency by wavelength.",
      },
      {
        id: `${prefix}-period`,
        type: "number",
        prompt: "Determine the period of one complete oscillation.",
        unit: "s",
        answer: period,
        tolerance: 0.005,
        placeholder: "e.g. 0.25",
        guide: "Period and frequency are reciprocals.",
      },
      {
        id: `${prefix}-medium`,
        type: "choice",
        prompt: `The signal enters a medium where its speed is ${config.newMedium}. Which combination must be correct?`,
        answer: correctChoice,
        guide: "The source does not change, so frequency remains fixed. Use v = fλ to infer wavelength.",
        options: waveOptions,
      },
    ],
    hints: [
      "Use v = fλ for wave speed and T = 1/f for period; these are separate calculations.",
      `A frequency of ${compactNumber(config.frequency)} Hz means each cycle takes 1 ÷ ${compactNumber(config.frequency)} seconds.`,
      `At the boundary, frequency remains fixed by the source. A ${config.newMedium} wave speed therefore requires a ${config.newMedium === "slower" ? "shorter" : "longer"} wavelength.`,
    ],
  };
}

function circuitScenario(config: {
  variant: number;
  variantName: string;
  shard: string;
  voltage: number;
  resistanceOne: number;
  resistanceTwo: number;
}): Scenario {
  const equivalentResistance =
    (config.resistanceOne * config.resistanceTwo) /
    (config.resistanceOne + config.resistanceTwo);
  const totalCurrent = config.voltage / equivalentResistance;
  const totalPower = config.voltage * totalCurrent;
  const prefix = `c${config.variant}`;

  return {
    variant: config.variant,
    variantName: config.variantName,
    shard: config.shard,
    brief: `The ${config.variantName.toLowerCase()} branches must share one supply in parallel. Find the total load before the console reconnects them.`,
    parameters: [
      { label: "Supply", value: `${compactNumber(config.voltage)} V` },
      { label: "Branch 1", value: `${compactNumber(config.resistanceOne)} Ω` },
      { label: "Branch 2", value: `${compactNumber(config.resistanceTwo)} Ω` },
      { label: "Connection", value: "parallel" },
    ],
    tasks: [
      {
        id: `${prefix}-resistance`,
        type: "number",
        prompt: "Calculate the equivalent resistance of the two parallel branches.",
        unit: "Ω",
        answer: equivalentResistance,
        tolerance: 0.03,
        placeholder: "e.g. 4.0",
        guide: "Add the reciprocals of the branch resistances, then invert the result.",
      },
      {
        id: `${prefix}-current`,
        type: "number",
        prompt: "Calculate the total current drawn from the supply.",
        unit: "A",
        answer: totalCurrent,
        tolerance: 0.04,
        placeholder: "e.g. 3.5",
        guide: "Apply Ohm's law using the supply voltage and equivalent resistance.",
      },
      {
        id: `${prefix}-power`,
        type: "number",
        prompt: "Determine the total power delivered by the supply.",
        unit: "W",
        answer: totalPower,
        tolerance: 0.08,
        placeholder: "e.g. 60",
        guide: "Multiply the supply voltage by the total current.",
      },
    ],
    hints: [
      "The equivalent resistance of a parallel network must be smaller than its smallest branch resistance.",
      `Start with 1/R_T = 1/${compactNumber(config.resistanceOne)} + 1/${compactNumber(config.resistanceTwo)}. Combine, then take the reciprocal.`,
      `Use the full ${compactNumber(config.voltage)} V across the equivalent resistance, then calculate power using P = VI.`,
    ],
  };
}

function evidenceScenario(config: {
  variant: number;
  variantName: string;
  shard: string;
  currents: number[];
  gradient: number;
  predictionCurrent: number;
}): Scenario {
  const predictedField = config.gradient * config.predictionCurrent;
  const prefix = `d${config.variant}`;

  return {
    variant: config.variant,
    variantName: config.variantName,
    shard: config.shard,
    brief: `The ${config.variantName.toLowerCase()} solenoid trial is the final surviving dataset. Extract its model and support only the conclusion justified by the evidence.`,
    table: {
      caption: `${config.variantName}: magnetic field at the solenoid centre`,
      headers: ["Current, I (A)", "Magnetic field, B (mT)"],
      rows: config.currents.map((current) => [
        compactNumber(current, 2),
        compactNumber(current * config.gradient, 2),
      ]),
    },
    tasks: [
      {
        id: `${prefix}-gradient`,
        type: "number",
        prompt: "Calculate the gradient of the B–I relationship.",
        unit: "mT/A",
        answer: config.gradient,
        tolerance: 0.03,
        placeholder: "e.g. 1.5",
        guide: "Choose two well-separated rows and divide the change in B by the change in I.",
      },
      {
        id: `${prefix}-predict`,
        type: "number",
        prompt: `Use the pattern to predict B when the current is ${compactNumber(config.predictionCurrent)} A.`,
        unit: "mT",
        answer: predictedField,
        tolerance: 0.04,
        placeholder: "e.g. 4.0",
        guide: "Treat the gradient as the proportionality constant k in B = kI.",
      },
      {
        id: `${prefix}-conclusion`,
        type: "choice",
        prompt: "Which conclusion is best supported by these data?",
        answer: "direct",
        guide: "Compare equal proportional changes in current and field, and limit the claim to the tested range.",
        options: [
          { value: "constant", label: "Magnetic field remains constant as current increases" },
          { value: "inverse", label: "Magnetic field is inversely proportional to current" },
          { value: "direct", label: "Magnetic field is directly proportional to current over the tested range" },
          { value: "square", label: "Magnetic field is proportional to the square of current" },
        ],
      },
    ],
    hints: [
      "Look for the change in magnetic field produced by each equal increase in current.",
      `The ratio B/I is ${compactNumber(config.gradient)} mT/A in every row, so use B = ${compactNumber(config.gradient)}I for the prediction.`,
      "A constant B/I ratio supports direct proportionality over the measured range; do not extend the claim beyond the evidence.",
    ],
  };
}

export const roomBanks: RoomBank[] = [
  {
    id: "motion",
    code: "M",
    number: "01",
    title: "The Motion Array",
    shortTitle: "Motion",
    focus: "Mechanics · signed quantities · unit conversion",
    icon: Gauge,
    accent: "cyan",
    formulae: ["Δx = x_f − x_i", "v_av = Δx ÷ Δt", "km/h = (m/s) × 3.6"],
    variants: [
      motionScenario({ variant: 1, variantName: "Guidance Rail", shard: "8", startTime: 2, middleTime: 5, endTime: 8, startPosition: -4, middlePosition: 5, endPosition: 14 }),
      motionScenario({ variant: 2, variantName: "Reverse Transit", shard: "3", startTime: 1.5, middleTime: 4.5, endTime: 7.5, startPosition: 12, middlePosition: 0, endPosition: -18 }),
      motionScenario({ variant: 3, variantName: "Calibration Sprint", shard: "5", startTime: 0, middleTime: 3, endTime: 6, startPosition: -10, middlePosition: 2, endPosition: 14 }),
      motionScenario({ variant: 4, variantName: "Return Sweep", shard: "9", startTime: 2, middleTime: 6, endTime: 10, startPosition: 20, middlePosition: 8, endPosition: -4 }),
      motionScenario({ variant: 5, variantName: "Extended Survey", shard: "1", startTime: 1, middleTime: 5, endTime: 9, startPosition: -6, middlePosition: 10, endPosition: 30 }),
    ],
  },
  {
    id: "forces",
    code: "F",
    number: "02",
    title: "The Force Gate",
    shortTitle: "Forces",
    focus: "Newton's laws · algebra · multi-step motion",
    icon: Zap,
    accent: "amber",
    formulae: ["F_net = ΣF", "F_net = ma", "v = u + at"],
    variants: [
      forceScenario({ variant: 1, variantName: "Service Sled", shard: "6", object: "service sled", mass: 12, drive: 54, friction: 18, initialSpeed: 0, time: 4 }),
      forceScenario({ variant: 2, variantName: "Cargo Pod", shard: "2", object: "cargo pod", mass: 8, drive: 50, friction: 14, initialSpeed: 2, time: 3 }),
      forceScenario({ variant: 3, variantName: "Repair Trolley", shard: "7", object: "repair trolley", mass: 15, drive: 75, friction: 30, initialSpeed: 1.5, time: 4 }),
      forceScenario({ variant: 4, variantName: "Battery Cart", shard: "4", object: "battery cart", mass: 20, drive: 92, friction: 32, initialSpeed: 4, time: 5 }),
      forceScenario({ variant: 5, variantName: "Survey Rig", shard: "8", object: "survey rig", mass: 10, drive: 68, friction: 18, initialSpeed: 3, time: 2.5 }),
    ],
  },
  {
    id: "energy",
    code: "E",
    number: "03",
    title: "The Energy Well",
    shortTitle: "Energy",
    focus: "Energy conservation · square roots · efficiency",
    icon: Atom,
    accent: "violet",
    formulae: ["E_p = mgh", "½mv² = mgh", "efficiency = useful ÷ input × 100%"],
    variants: [
      energyScenario({ variant: 1, variantName: "Power Cell", shard: "7", object: "power cell", mass: 4, height: 3, usefulOutput: 100 }),
      energyScenario({ variant: 2, variantName: "Sensor Capsule", shard: "5", object: "sensor capsule", mass: 3.5, height: 4, usefulOutput: 110 }),
      energyScenario({ variant: 3, variantName: "Coolant Canister", shard: "2", object: "coolant canister", mass: 6, height: 2.5, usefulOutput: 120 }),
      energyScenario({ variant: 4, variantName: "Relay Core", shard: "9", object: "relay core", mass: 2.5, height: 5, usefulOutput: 105 }),
      energyScenario({ variant: 5, variantName: "Containment Module", shard: "3", object: "containment module", mass: 8, height: 1.8, usefulOutput: 115 }),
    ],
  },
  {
    id: "waves",
    code: "W",
    number: "04",
    title: "The Resonance Archive",
    shortTitle: "Waves",
    focus: "Wave relationships · reciprocal reasoning · refraction",
    icon: Waves,
    accent: "cyan",
    formulae: ["v = fλ", "T = 1 ÷ f", "frequency is fixed by the source"],
    variants: [
      waveScenario({ variant: 1, variantName: "Archive Signal", shard: "2", frequency: 5, wavelength: 0.6, newMedium: "slower" }),
      waveScenario({ variant: 2, variantName: "Sonar Pulse", shard: "8", frequency: 8, wavelength: 0.75, newMedium: "faster" }),
      waveScenario({ variant: 3, variantName: "Tether Oscillation", shard: "4", frequency: 2.5, wavelength: 1.2, newMedium: "slower" }),
      waveScenario({ variant: 4, variantName: "Maintenance Tone", shard: "6", frequency: 12, wavelength: 0.25, newMedium: "faster" }),
      waveScenario({ variant: 5, variantName: "Diagnostic Wave", shard: "1", frequency: 4, wavelength: 1.5, newMedium: "slower" }),
    ],
  },
  {
    id: "circuits",
    code: "C",
    number: "05",
    title: "The Circuit Console",
    shortTitle: "Circuits",
    focus: "Parallel circuits · inverse relationships · electrical power",
    icon: CircuitBoard,
    accent: "amber",
    formulae: ["1/R_T = 1/R₁ + 1/R₂", "V = IR", "P = VI"],
    variants: [
      circuitScenario({ variant: 1, variantName: "Cooling Network", shard: "2", voltage: 12, resistanceOne: 6, resistanceTwo: 3 }),
      circuitScenario({ variant: 2, variantName: "Sensor Network", shard: "9", voltage: 18, resistanceOne: 9, resistanceTwo: 18 }),
      circuitScenario({ variant: 3, variantName: "Lighting Network", shard: "5", voltage: 24, resistanceOne: 8, resistanceTwo: 8 }),
      circuitScenario({ variant: 4, variantName: "Relay Network", shard: "3", voltage: 10, resistanceOne: 5, resistanceTwo: 20 }),
      circuitScenario({ variant: 5, variantName: "Control Network", shard: "7", voltage: 15, resistanceOne: 10, resistanceTwo: 15 }),
    ],
  },
  {
    id: "evidence",
    code: "D",
    number: "06",
    title: "The Evidence Chamber",
    shortTitle: "Evidence",
    focus: "Magnetism · gradients · evidence-based conclusions",
    icon: FlaskConical,
    accent: "violet",
    formulae: ["gradient = ΔB ÷ ΔI", "linear model: B = kI", "direct proportion: straight line through origin"],
    variants: [
      evidenceScenario({ variant: 1, variantName: "Solenoid Trial Alpha", shard: "6", currents: [0.5, 1, 1.5, 2], gradient: 1.6, predictionCurrent: 2.5 }),
      evidenceScenario({ variant: 2, variantName: "Solenoid Trial Beta", shard: "1", currents: [0.4, 0.8, 1.2, 1.6], gradient: 1.5, predictionCurrent: 2 }),
      evidenceScenario({ variant: 3, variantName: "Solenoid Trial Gamma", shard: "8", currents: [0.25, 0.5, 0.75, 1], gradient: 2, predictionCurrent: 1.25 }),
      evidenceScenario({ variant: 4, variantName: "Solenoid Trial Delta", shard: "4", currents: [0.5, 1, 1.5, 2], gradient: 2.2, predictionCurrent: 2.5 }),
      evidenceScenario({ variant: 5, variantName: "Solenoid Trial Epsilon", shard: "9", currents: [0.2, 0.4, 0.6, 0.8], gradient: 3.5, predictionCurrent: 1 }),
    ],
  },
];

export function randomVariantSelection() {
  return roomBanks.map(() => Math.floor(Math.random() * 5));
}

export function buildMission(selection: number[]): MissionRoom[] {
  return roomBanks.map((bank, index) => {
    const requested = Number.isFinite(selection[index]) ? selection[index] : 0;
    const safeIndex = Math.max(0, Math.min(bank.variants.length - 1, requested));
    const scenario = bank.variants[safeIndex];
    return {
      id: bank.id,
      number: bank.number,
      title: bank.title,
      shortTitle: bank.shortTitle,
      focus: bank.focus,
      icon: bank.icon,
      accent: bank.accent,
      formulae: bank.formulae,
      ...scenario,
    };
  });
}

export function getMissionId(selection: number[]) {
  return roomBanks
    .map((bank, index) => `${bank.code}${(selection[index] ?? 0) + 1}`)
    .join("-");
}
