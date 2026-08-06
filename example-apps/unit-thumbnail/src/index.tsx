import { useState } from "react";
import { createStore } from "snap-store";
import { createHostSystem, HsUnitInstance } from "wafer-host/core";
import { HostAppProvider, UnitFrame } from "wafer-host/react";
import catalog from "./unit-inventories.json";
import { createRoot } from "react-dom/client";
import "virtual:uno.css";
import "./app.css";

type CatalogKey = keyof typeof catalog;

type StoreState = {
  catalogKey: CatalogKey;
};

const audioContext = new AudioContext();
const hostSystem = createHostSystem(audioContext);

const store = createStore<StoreState>({
  catalogKey: Object.keys(catalog)[0] as CatalogKey,
});

const PageRoot = () => {
  const { catalogKey } = store.useSnapshot();
  const catalogItem = catalog[catalogKey];

  const dpr = window.devicePixelRatio;
  const captureSizeWidth = 400 / dpr;
  const captureSizeHeight = 270 / dpr;

  const [frameSize, setFrameSize] = useState<{ width: number; height: number }>({
    width: captureSizeWidth,
    height: captureSizeHeight,
  });

  const scaling = Math.min(
    captureSizeWidth / frameSize.width,
    captureSizeHeight / frameSize.height,
  );

  const onUnitLoaded = (unit: HsUnitInstance) => {
    if (unit.viewSize) {
      setFrameSize({ width: unit.viewSize[0], height: unit.viewSize[1] });
    }
  };

  return (
    <div className="w-dvw h-dvh flex-c">
      <div className="flex-v gap-6 w-[600px]">
        <select
          value={catalogKey}
          onChange={(e) => store.setCatalogKey(e.target.value as CatalogKey)}
          className="border border-gray-400 px-1 py-2"
        >
          {Object.entries(catalog).map(([key, info]) => (
            <option key={key} value={key}>
              {info.name}
            </option>
          ))}
        </select>
        <div className="border border-solid border-gray-400 flex-c h-[400px]">
          <div
            id="screenshot-target-container"
            style={{
              width: `${frameSize.width * scaling}px`,
              height: `${frameSize.height * scaling}px`,
            }}
          >
            <div
              style={{
                transform: `scale(${scaling})`,
                transformOrigin: "top left",
              }}
            >
              <div style={{ width: frameSize.width, height: frameSize.height }}>
                <UnitFrame
                  unitId="unit1"
                  unitUrl={catalogItem.loaderPageUrl}
                  onUnitInstanceLoaded={onUnitLoaded}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="text-gray-500">
          To capture thumbnail screenshot of the unit, open devtool and select div with id
          "screenshot-target-container" element (not the inner iframe itself), then right click and
          choose "Capture node screenshot".
        </div>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <HostAppProvider hostSystem={hostSystem}>
      <PageRoot />
    </HostAppProvider>
  );
};

const root = createRoot(document.getElementById("app")!);
root.render(<App />);
