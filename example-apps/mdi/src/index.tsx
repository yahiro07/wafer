import { createRoot } from "react-dom/client";
import "./setup-twind";
import { css, cx } from "@twind/core";
import catalog from "./unit-inventories.json";
import { createStore } from "snap-store";

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

type StoreState = {};

const store = createStore<StoreState>({});

const actions = {
  showUnitWindow(unitId: string) {},
};

const UnitLauncherIcon = ({ unitItem }: { unitItem: UnitItem }) => {
  const { catalogKey } = unitItem;
  const { thumbnailUrl } = catalog[catalogKey];
  return (
    <div className="w-[200px] h-[100px] bg-gray-500 cursor-pointer">
      <img
        className="w-full h-full object-contain"
        src={thumbnailUrl}
        alt={catalogKey}
        onClick={() => actions.showUnitWindow(unitItem.unitId)}
      />
    </div>
  );
};

const TopSection = () => {
  return (
    <div className="bg-gray-400 flex-c gap-4 p-4">
      {unitItems.map((item) => (
        <UnitLauncherIcon key={item.unitId} unitItem={item} />
      ))}
    </div>
  );
};

const UnitWindow = ({ unitItem }: { unitItem: UnitItem }) => {
  return (
    <div
      className={cx(
        "absolute top-0 left-0 bg-white w-[450px] h-[300px] flex-v",
        "bd-teal-500 border-2",
      )}
      style={{
        left: npx(unitItem.posX),
        top: npx(unitItem.posY),
      }}
    >
      <div className="flex-h h-[30px] bg-teal-500"></div>
    </div>
  );
};

const DeskSection = () => {
  return (
    <div className="bg-gray-200 grow relative">
      {unitItems.map((item) => (
        <UnitWindow key={item.unitId} unitItem={item} />
      ))}
    </div>
  );
};

const App = () => {
  return (
    <div className={cx("flex-v", css({ height: "100dvh" }))}>
      <TopSection />
      <DeskSection />
    </div>
  );
};

const rootElement = document.getElementById("app")!;
const root = createRoot(rootElement);
root.render(<App />);
