import { createStore } from "snap-store";
import { createHostSystem, HsUnitInstance } from "wafer-host/core";
import { HostAppProvider, UnitFrame } from "wafer-host/react";
import catalog from "./unit-inventories.json";
import { createRoot } from "react-dom/client";
import "virtual:uno.css";
import "./app.css";
import { useState } from "react";
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

const UnitFrameEx = ({
  unitId,
  unitUrl,
  destSpec,
}: {
  unitId: string;
  unitUrl: string;
  destSpec: string;
}) => {
  const outerW = 600;
  const outerH = 350;
  const frameAspectRatio = outerW / outerH;
  const [scale, setScale] = useState(1);
  const onUnitInstanceLoaded = (unit: HsUnitInstance) => {
    const [w, h] = unit.viewSize;
    setScale(Math.min(outerW / w, outerH / h));
  };
  return (
    <div className="bg-gray-400 flex-c" style={{ width: `${outerW}px`, height: `${outerH}px` }}>
      <div className="flex-c" style={{ transform: `scale(${scale})` }}>
        <UnitFrame
          unitId={unitId}
          unitUrl={unitUrl}
          destSpec={destSpec}
          onUnitInstanceLoaded={onUnitInstanceLoaded}
          frameAspectRatio={frameAspectRatio}
        />
      </div>
    </div>
  );
};

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
    <div className="grid grid-cols-2 gap-2">
      <UnitFrameEx
        unitId="drum1"
        destSpec="$output"
        unitUrl={catalog.graphiteDrumMachine.loaderPageUrl}
      />
      <UnitFrameEx
        unitId="effect1"
        destSpec="$output"
        unitUrl={catalog.sunsetDelay.loaderPageUrl}
      />
      <UnitFrameEx
        unitId="sequencer1"
        destSpec="synth1"
        unitUrl={catalog.tonerioSequencer.loaderPageUrl}
      />
      <UnitFrameEx
        unitId="synth1"
        destSpec="effect1"
        unitUrl={catalog.webaudioTinysynthMini.loaderPageUrl}
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
