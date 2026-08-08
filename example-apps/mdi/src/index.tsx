import { createRoot } from "react-dom/client";
import "./setup-twind";
import { css, cx } from "@twind/core";
import catalog from "./unit-inventories.json";
import { createStore } from "snap-store";
import { createHostSystem } from "wafer-host/core";
import { HostAppProvider, UnitFrameScaled } from "wafer-host/react";
import { ReactNode } from "react";
import { startDragSession } from "./drag-session";
const audioContext = new AudioContext();
const hostSystem = createHostSystem(audioContext);

const npx = (value: number) => `${value}px`;

type CatalogKey = keyof typeof catalog;

type Point = { x: number; y: number };

type UnitItem = {
  unitId: string;
  catalogKey: CatalogKey;
  destSpec: string;
  position: Point;
};

const initialUnitItems: UnitItem[] = [
  {
    unitId: "drum1",
    catalogKey: "graphiteDrumMachine",
    destSpec: "$output",
    position: { x: 0, y: 0 },
  },
  {
    unitId: "sequencer1",
    catalogKey: "tonerioSequencer",
    destSpec: "synth1",
    position: { x: 100, y: 100 },
  },
  {
    unitId: "synth1",
    catalogKey: "webaudioTinysynthMini",
    destSpec: "effect1",
    position: { x: 200, y: 200 },
  },
  {
    unitId: "effect1",
    catalogKey: "sunsetDelay",
    destSpec: "$output",
    position: { x: 300, y: 300 },
  },
];

type StoreState = {
  unitItems: UnitItem[];
  activeUnitId: string;
};

const store = createStore<StoreState>({
  unitItems: initialUnitItems,
  activeUnitId: "drum1",
});

const actionsInternal = {
  patchUnitAttrs(unitId: string, attrs: Partial<UnitItem>) {
    store.produceUnitItems((draft) => {
      const unit = draft.find((item) => item.unitId === unitId);
      if (unit) {
        Object.assign(unit, attrs);
      }
    });
  },
};

const actions = {
  setActiveUnit(unitId: string) {
    store.setActiveUnitId(unitId);
  },
  moveUnitWindow(unitId: string, newPos: Point) {
    actionsInternal.patchUnitAttrs(unitId, { position: newPos });
  },
};

const TitleBarGrip = ({
  className,
  children,
  unitItem,
}: {
  className?: string;
  children: ReactNode;
  unitItem: UnitItem;
}) => {
  const onPointerDown = (e0: React.PointerEvent<HTMLDivElement>) => {
    const unitOriginalPos = unitItem.position;

    startDragSession(e0.nativeEvent, {
      onMove(e) {
        const deltaX = e.position.x - e.originalPosition.x;
        const deltaY = e.position.y - e.originalPosition.y;
        const newPos = { x: unitOriginalPos.x + deltaX, y: unitOriginalPos.y + deltaY };
        actions.moveUnitWindow(unitItem.unitId, newPos);
      },
    });
  };

  return (
    <div className={className} onPointerDown={onPointerDown}>
      {children}
    </div>
  );
};

const WindowCloseButton = () => {
  return <div className="w-[24px] h-[24px] flex-c bg-orange-400 shrink-0 mb-0.5">x</div>;
};

const UnitWindow = ({ unitItem }: { unitItem: UnitItem }) => {
  const catalogItem = catalog[unitItem.catalogKey];
  return (
    <div
      className={cx(
        "absolute top-0 left-0 bg-white w-[450px] h-[300px] flex-v",
        "bd-blue-500 border-[3px] ",
      )}
      style={{
        left: npx(unitItem.position.x),
        top: npx(unitItem.position.y),
      }}
    >
      <div
        className={cx(
          "flex-ha h-[32px] bg-blue-500 shrink-0 text-white font-[600]",
          "justify-between cursor-pointer px-1",
        )}
      >
        <TitleBarGrip className="h-full grow flex-ha pb-1" unitItem={unitItem}>
          {catalogItem.name}
        </TitleBarGrip>
        <WindowCloseButton />
      </div>
      <div className="grow flex-c overflow-hidden">
        <UnitFrameScaled
          unitId={unitItem.unitId}
          unitUrl={catalog[unitItem.catalogKey].loaderPageUrl}
          destSpec={unitItem.destSpec}
        />
      </div>
    </div>
  );
};

const DeskSection = () => {
  const { unitItems } = store.useSnapshot();
  return (
    <div className="bg-sky-300 grow relative">
      {unitItems.map((item) => (
        <UnitWindow key={item.unitId} unitItem={item} />
      ))}
    </div>
  );
};

const UnitTaskButton = ({ unitItem }: { unitItem: UnitItem }) => {
  const { activeUnitId } = store.useSnapshot();
  const active = activeUnitId === unitItem.unitId;
  const catalogItem = catalog[unitItem.catalogKey];
  return (
    <div
      className={cx(
        "flex-ha gap-2 p-2 w-[200px] overflow-hidden whitespace-nowrap",
        "cursor-pointer text-gray-800",
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

const BottomBar = () => {
  const { unitItems } = store.useSnapshot();
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
