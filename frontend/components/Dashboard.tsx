"use client";

import { useDemoEngine } from "@/lib/demoEngine";
import { PHASE_CLASS, PHASE_COLOR } from "@/lib/format";
import AdaptiveResult from "./AdaptiveResult";
import AdvancedPanel from "./AdvancedPanel";
import ConnectionPills from "./ConnectionPills";
import CurrentState from "./CurrentState";
import DemoControls from "./DemoControls";
import EventHistory from "./EventHistory";
import GaitSignal from "./GaitSignal";
import ResponsePanel from "./ResponsePanel";

export default function Dashboard() {
  const { state, cadence, samplesRef, startDemo, triggerFreeze, reset, armCue } = useDemoEngine();
  const phaseClass = PHASE_CLASS[state.phase];
  const color = PHASE_COLOR[state.phase];

  return (
    <div className={`stage ${phaseClass}`} data-phase={state.phase}>
      <div className="relative z-10 mx-auto max-w-[1680px] px-4 pb-32 pt-4 sm:px-6">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-black/30">
              <span className="h-3 w-3 rounded-full phase-bg shadow-[0_0_16px_var(--phase)]" />
            </div>
            <div>
              <h1 className="value-display text-2xl font-bold leading-none tracking-wide text-white">FoG CUEING LAB</h1>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.26em] text-white/45">
                HackMIT 2026 · Wearable freeze-like gait cueing · Demo mode
              </p>
            </div>
          </div>
          <ConnectionPills connections={state.connections} />
        </header>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-5">
            <CurrentState phase={state.phase} storyStep={state.storyStep} />
          </div>
          <div className="min-h-[320px] xl:col-span-7">
            <GaitSignal
              samplesRef={samplesRef}
              cadence={cadence}
              baseline={state.baseline_cadence_bpm}
              phase={state.phase}
              color={color}
              sensor={state.connections.esp32}
            />
          </div>

          <div className="flex flex-col gap-4 xl:col-span-7">
            <ResponsePanel state={state} />
            <EventHistory events={state.events} highlight={state.lastEpisodeId} />
          </div>
          <div className="xl:col-span-5">
            <AdaptiveResult analysis={state.analysis} phase={state.phase} cue={state.cue} onArm={armCue} />
          </div>

          <div className="xl:col-span-12">
            <AdvancedPanel state={state} />
          </div>
        </div>

        <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-white/35">
          Research / assistive-technology prototype. Not a medical device. Freeze-like events shown in demo mode are simulated.
        </p>
      </div>

      <DemoControls phase={state.phase} running={state.running} onStart={startDemo} onTrigger={triggerFreeze} onReset={reset} />
    </div>
  );
}
