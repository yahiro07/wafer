import { createStore } from "snap-store";
import { createHostSystem } from "wafer-host/core";
import { HostAppProvider, UnitFrameScaled } from "wafer-host/react";
import catalog from "./unit-inventories.json";
import { createRoot } from "react-dom/client";
import "virtual:uno.css";
import "./app.css";
import clsx from "clsx";

const audioContext = new AudioContext();
const hostSystem = createHostSystem(audioContext);

type StoreState = {
  playing: boolean;
  bpm: number;
};

const store = createStore<StoreState>({
  playing: false,
  bpm: 100,
});

const ControlBar = () => {
  const { playing, bpm } = store.useSnapshot();
  return (
    <div className="flex-c gap-6 bg-gray-400 h-[70px]">
      <button
        className={clsx(
          "p-3 bd-none bg-gray-200 cursor-pointer",
          playing && "bg-green-500 text-white",
        )}
        onClick={store.togglePlaying}
      >
        Play/Pause
      </button>
      <div className="flex-h gap-2">
        <label>BPM</label>
        <input
          className="cursor-pointer"
          type="range"
          min={60}
          max={160}
          value={bpm}
          onInput={(e) => store.setBpm(Number(e.currentTarget.value))}
        />
        <span className="min-w-[36px] text-center">{bpm}</span>
      </div>
    </div>
  );
};

const UnitTiles = () => {
  return (
    <div
      className={clsx("grid grid-cols-2 grid-rows-2 gap-2 w-[1200px] h-[700px] overflow-hidden")}
    >
      <UnitFrameScaled
        className="bg-gray-400"
        unitId="effect1"
        destSpec="$output"
        unitUrl={catalog.sunsetDelay.loaderPageUrl}
      />
      <UnitFrameScaled
        className="bg-gray-400"
        unitId="synth1"
        destSpec="effect1"
        unitUrl={catalog.webaudioTinysynthMini.loaderPageUrl}
      />
      <UnitFrameScaled
        className="bg-gray-400"
        unitId="drum1"
        destSpec="$output"
        unitUrl={catalog.graphiteDrumMachine.loaderPageUrl}
      />
      <UnitFrameScaled
        className="bg-gray-400"
        unitId="sequencer1"
        destSpec="synth1"
        unitUrl={catalog.tonerioSequencer.loaderPageUrl}
      />
    </div>
  );
};

const PageRoot = () => {
  return (
    <div className="w-dvw h-dvh flex-c bg-gray-100">
      <div className="flex-v gap-2">
        <ControlBar />
        <UnitTiles />
      </div>
    </div>
  );
};

const App = () => {
  const { playing, bpm } = store.useSnapshot();
  return (
    <HostAppProvider hostSystem={hostSystem} playing={playing} bpm={bpm}>
      <PageRoot />
    </HostAppProvider>
  );
};

const root = createRoot(document.getElementById("app")!);
root.render(<App />);
