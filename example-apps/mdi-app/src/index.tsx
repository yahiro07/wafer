import { createRoot } from "react-dom/client";
import { css, cx } from "@twind/core";
import catalog from "./unit-inventories.json";
import { createStore } from "snap-store";
import { createHostSystem } from "wafer-host/core";
import { HostAppProvider, UnitFrameScaled } from "wafer-host/react";
import { ReactNode } from "react";
import { startDragSession } from "./drag-session";
import { install } from "@twind/core";
import config from "./twind.config";
install(config);

const hostSystem = createHostSystem();

const npx = (value: number) => `${value}px`;

type CatalogKey = keyof typeof catalog;

type Point = { x: number; y: number };
type Size = { width: number; height: number };

const gray350 = "#b7bcc5";

type UnitItem = {
  unitId: string;
  catalogKey: CatalogKey;
  destSpec: string;
  position: Point;
  size: Size;
  zIndex: number;
  visible: boolean;
};

const defaultWindowSize: Size = { width: 450, height: 300 };

const ox = 100;
const oy = 40;
const initialUnitItems: UnitItem[] = [
  {
    unitId: "drum1",
    catalogKey: "graphiteDrumMachine",
    destSpec: "$output",
    position: { x: ox, y: oy },
    size: defaultWindowSize,
    zIndex: 0,
    visible: true,
  },
  {
    unitId: "sequencer1",
    catalogKey: "tonerioSequencer",
    destSpec: "synth1",
    position: { x: ox, y: oy + 350 },
    size: defaultWindowSize,
    zIndex: 0,
    visible: true,
  },
  {
    unitId: "synth1",
    catalogKey: "webaudioTinysynthMini",
    destSpec: "effect1",
    position: { x: ox + 500, y: oy + 350 },
    size: defaultWindowSize,
    zIndex: 0,
    visible: true,
  },
  {
    unitId: "effect1",
    catalogKey: "sunsetDelay",
    destSpec: "$output",
    position: { x: ox + 500, y: oy },
    size: defaultWindowSize,
    zIndex: 0,
    visible: true,
  },
];

type StoreState = {
  unitItems: UnitItem[];
  activeUnitId: string;
  playing: boolean;
};

const store = createStore<StoreState>({
  unitItems: initialUnitItems,
  activeUnitId: "drum1",
  playing: false,
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
  setActiveWindow(unitId: string) {
    store.setActiveUnitId(unitId);
    const nextZIndex =
      Math.max(...store.state.unitItems.map((item) => item.zIndex)) + 1;
    actionsInternal.patchUnitAttrs(unitId, {
      zIndex: nextZIndex,
      visible: true,
    });
  },
  setWindowPosition(unitId: string, newPos: Point) {
    actionsInternal.patchUnitAttrs(unitId, { position: newPos });
  },
  setWindowSize(unitId: string, newSize: Size) {
    actionsInternal.patchUnitAttrs(unitId, { size: newSize });
  },
  setWindowVisibility(unitId: string, visible: boolean) {
    actionsInternal.patchUnitAttrs(unitId, { visible });
  },
  closeWindow(unitId: string) {
    actions.setWindowVisibility(unitId, false);
    const nextActiveUnitId = store.state.unitItems
      .filter((item) => item.visible)
      .sort((a, b) => a.zIndex - b.zIndex)
      .at(-1)?.unitId;
    if (nextActiveUnitId) {
      actions.setActiveWindow(nextActiveUnitId);
    }
  },
  togglePlayState() {
    store.togglePlaying();
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
    actions.setActiveWindow(unitItem.unitId);
    startDragSession(e0.nativeEvent, {
      onMove(e) {
        const deltaX = e.position.x - e.originalPosition.x;
        const deltaY = e.position.y - e.originalPosition.y;
        const newPos = {
          x: unitOriginalPos.x + deltaX,
          y: unitOriginalPos.y + deltaY,
        };
        actions.setWindowPosition(unitItem.unitId, newPos);
      },
    });
  };
  return (
    <div className={cx("cursor-move", className)} onPointerDown={onPointerDown}>
      {children}
    </div>
  );
};

const WindowCloseButton = ({
  className,
  unitId,
}: {
  className?: string;
  unitId: string;
}) => {
  return (
    <button
      className={cx("w-[30px] h-[24px] flex-c shrink-0 mb-0.5", className)}
      onClick={() => actions.closeWindow(unitId)}
    >
      x
    </button>
  );
};

const WindowResizeAnchor = ({ unitItem }: { unitItem: UnitItem }) => {
  const onPointerDown = (e0: React.PointerEvent<HTMLDivElement>) => {
    const unitOriginalSize = unitItem.size;
    startDragSession(e0.nativeEvent, {
      onMove(e) {
        const deltaX = e.position.x - e.originalPosition.x;
        const deltaY = e.position.y - e.originalPosition.y;
        const newSize = {
          width: unitOriginalSize.width + deltaX,
          height: unitOriginalSize.height + deltaY,
        };
        actions.setWindowSize(unitItem.unitId, newSize);
      },
    });
  };
  return (
    <div
      className="w-[20px] h-[20px] cursor-se-resize"
      style={{ transform: "translate(30%, 30%)" }}
      onPointerDown={onPointerDown}
    />
  );
};

const UnitWindow = ({ unitItem }: { unitItem: UnitItem }) => {
  const { activeUnitId } = store.useSnapshot();
  const active = activeUnitId === unitItem.unitId;
  const catalogItem = catalog[unitItem.catalogKey];
  return (
    <div
      className={"absolute"}
      style={{
        left: npx(unitItem.position.x),
        top: npx(unitItem.position.y),
        width: npx(unitItem.size.width),
        height: npx(unitItem.size.height),
        zIndex: unitItem.zIndex,
        display: unitItem.visible ? "block" : "none",
      }}
    >
      <div
        className={cx(
          "relative w-full h-full bg-white flex-v border-[3px]",
          active ? "border-blue-500" : `border-[${gray350}]`,
        )}
      >
        <div
          className={cx(
            "flex-ha h-[32px] shrink-0 text-white font-[600]",
            "justify-between pl-1 pr-0.5",
            active ? "bg-blue-500" : `bg-[${gray350}]`,
          )}
        >
          <TitleBarGrip
            className="h-full grow flex-ha pb-1"
            unitItem={unitItem}
          >
            {catalogItem.name}
          </TitleBarGrip>
          <WindowCloseButton
            unitId={unitItem.unitId}
            className={active ? "bg-orange-400" : "bg-orange-200"}
          />
        </div>
        <div className="grow flex-c overflow-hidden">
          <UnitFrameScaled
            unitId={unitItem.unitId}
            unitUrl={catalog[unitItem.catalogKey].loaderPageUrl}
            destSpec={unitItem.destSpec}
          />
        </div>
      </div>
      <div className="absolute bottom-0 right-0">
        <WindowResizeAnchor unitItem={unitItem} />
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
      onClick={() => actions.setActiveWindow(unitItem.unitId)}
    >
      <div className="w-[48px] h-[32px] shrink-0">
        <img
          className="w-full h-full object-contain"
          src={catalogItem.thumbnailUrl}
        />
      </div>
      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
        {catalogItem.name}
      </div>
    </div>
  );
};

const PlayButton = () => {
  const { playing } = store.useSnapshot();
  return (
    <button
      className={cx(
        "w-[64px] h-[48px] flex-c shrink-0 text-white text-2xl",
        playing ? "bg-sky-500" : `bg-[${gray350}]`,
        css({ border: playing ? "outset 1px #6ac" : "outset 1px #ddd" }),
      )}
      onClick={() => actions.togglePlayState()}
    >
      ▶
    </button>
  );
};

const BottomBar = () => {
  const { unitItems } = store.useSnapshot();
  return (
    <div className="bg-gray-400 flex-c gap-6 p-3 z-[100]">
      <PlayButton />
      <div className="flex-ha gap-3">
        {unitItems.map((item) => (
          <UnitTaskButton key={item.unitId} unitItem={item} />
        ))}
      </div>
    </div>
  );
};

const App = () => {
  const { playing } = store.useSnapshot();
  return (
    <HostAppProvider hostSystem={hostSystem} playing={playing}>
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
