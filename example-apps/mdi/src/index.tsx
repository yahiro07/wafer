import { createRoot } from "react-dom/client";
import "./setup-twind";
import { css, cx } from "@twind/core";
import catalog from "./unit-inventories.json";

type CatalogKey = keyof typeof catalog;

type UnitItem = {
  unitId: string;
  catalogKey: CatalogKey;
  destSpec: string;
};

const unitItems: UnitItem[] = [
  { unitId: "drum1", catalogKey: "graphiteDrumMachine", destSpec: "$output" },
  { unitId: "sequencer1", catalogKey: "tonerioSequencer", destSpec: "synth1" },
  { unitId: "synth1", catalogKey: "webaudioTinysynthMini", destSpec: "effect1" },
  { unitId: "effect1", catalogKey: "sunsetDelay", destSpec: "$output" },
];

const UnitLauncherIcon = ({ unitItem }: { unitItem: UnitItem }) => {
  const { catalogKey } = unitItem;
  const { thumbnailUrl } = catalog[catalogKey];
  return (
    <div className="w-[200px] h-[100px] bg-gray-500 cursor-pointer">
      <img className="w-full h-full object-contain" src={thumbnailUrl} alt={catalogKey} />
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

const App = () => {
  return (
    <div className={cx("flex-v", css({ height: "100dvh" }))}>
      <TopSection />
      <div className="bg-gray-200 grow" />
    </div>
  );
};

const rootElement = document.getElementById("app")!;
const root = createRoot(rootElement);
root.render(<App />);
