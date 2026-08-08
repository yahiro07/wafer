import { createRoot } from "react-dom/client";
import "./setup-twind";
import { css, cx } from "@twind/core";
import catalog from "./unit-inventories.json";
import { createStore } from "snap-store";
import { createHostSystem } from "wafer-host/core";
import { HostAppProvider, UnitFrameScaled } from "wafer-host/react";
const audioContext = new AudioContext();
const hostSystem = createHostSystem(audioContext);

const npx = (value: number) => `${value}px`;

type CatalogKey = keyof typeof catalog;

type UnitItem = {
  unitId: string;
  catalogKey: CatalogKey;
  destSpec: string;
  posX: number;
  posY: number;
};

const unitItems: UnitItem[] = [
  { unitId: "drum1", catalogKey: "graphiteDrumMachine", destSpec: "$output", posX: 0, posY: 0 },
  {
    unitId: "sequencer1",
    catalogKey: "tonerioSequencer",
    destSpec: "synth1",
    posX: 100,
    posY: 100,
  },
  {
    unitId: "synth1",
    catalogKey: "webaudioTinysynthMini",
    destSpec: "effect1",
    posX: 200,
    posY: 200,
  },
  { unitId: "effect1", catalogKey: "sunsetDelay", destSpec: "$output", posX: 300, posY: 300 },
];

type StoreState = {
  activeUnitId: string;
};

const store = createStore<StoreState>({
  activeUnitId: "drum1",
});

const actions = {
  setActiveUnit(unitId: string) {
    store.setActiveUnitId(unitId);
  },
};

const UnitTaskButton = ({ unitItem }: { unitItem: UnitItem }) => {
  const { activeUnitId } = store.useSnapshot();
  const active = activeUnitId === unitItem.unitId;
  const catalogItem = catalog[unitItem.catalogKey];
  return (
    <div
      className={cx(
        "flex-ha gap-2 p-2 w-[200px] overflow-hidden whitespace-nowrap",
        "cursor-pointer",
        css({ border: active ? "inset 2px #888" : "outset 2px #ccc" }),
      )}
      onClick={() => actions.setActiveUnit(unitItem.unitId)}
    >
      <div className="w-[48px] h-[32px] shrink-0">
        <img className="w-full h-full object-contain" src={catalogItem.thumbnailUrl} />
      </div>
      <div className="overflow-hidden text-ellipsis whitespace-nowrap">{catalogItem.name}</div>
    </div>
  );
};

const UnitWindow = ({ unitItem: unit }: { unitItem: UnitItem }) => {
  const catalogItem = catalog[unit.catalogKey];
  return (
    <div
      className={cx(
        "absolute top-0 left-0 bg-white w-[450px] h-[300px] flex-v",
        "bd-blue-500 border-[3px] ",
      )}
      style={{
        left: npx(unit.posX),
        top: npx(unit.posY),
      }}
    >
      <div
        className={cx(
          "flex-h h-[30px] bg-blue-500 shrink-0 text-white px-2",
          "justify-between cursor-pointer",
        )}
      >
        <div>{catalogItem.name}</div>
        <div>x</div>
      </div>
      <div className="grow flex-c overflow-hidden">
        <UnitFrameScaled
          unitId={unit.unitId}
          unitUrl={catalog[unit.catalogKey].loaderPageUrl}
          destSpec={unit.destSpec}
        />
      </div>
    </div>
  );
};

const DeskSection = () => {
  return (
    <div className="bg-sky-300 grow relative">
      {unitItems.map((item) => (
        <UnitWindow key={item.unitId} unitItem={item} />
      ))}
    </div>
  );
};

const BottomBar = () => {
  return (
    <div className="bg-gray-400 flex-c gap-4 p-4">
      {unitItems.map((item) => (
        <UnitTaskButton key={item.unitId} unitItem={item} />
      ))}
    </div>
  );
};

const App = () => {
  return (
    <HostAppProvider hostSystem={hostSystem}>
      <div className={cx("flex-v select-none", css({ height: "100dvh" }))}>
        <DeskSection />
        <BottomBar />
      </div>
    </HostAppProvider>
  );
};

const rootElement = document.getElementById("app")!;
const root = createRoot(rootElement);
root.render(<App />);
