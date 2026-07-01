import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { HostSystem } from "../core";
import { createSequencerTickDriver } from "../core/sequencer-tick-driver/sequencer-tick-driver";
import {
  createSequencerTickDriverDummy,
  useSequencerTickDriverRunner,
} from "./sequencer-tick-driver-runner";

type HostAppContextValue = {
  hostSystem: HostSystem;
  hostBpm?: number;
  hostPlaying: boolean;
  masterGain?: number;
};

const hostAppContext = createContext<HostAppContextValue>(undefined!);

export function useHostAppContext() {
  return useContext(hostAppContext);
}

/*
usage for manual clocking (for advanced host):
const audioContext = new AudioContext();
const hostSystem = createHostSystem(audioContext)
const sequencerTickDriver = createSequencerTickDriver(hostSystem)
<HostAppPlainProvider hostSystem={hostSystem}>
  <SequencerTickDriverRunner sequencerTickDriver={sequencerTickDriver} />
  <UnitFrame unitId="unit1" pageUrl="/path/to/unit.html" />
</HostAppPlainProvider>
*/
export const HostAppPlainProvider = ({
  hostSystem,
  playing = false,
  bpm,
  masterGain,
  children,
}: {
  hostSystem: HostSystem;
  playing?: boolean;
  bpm?: number;
  masterGain?: number;
  children: ReactNode;
}) => {
  useEffect(() => {
    if (masterGain !== undefined) {
      hostSystem.setMasterGain(masterGain);
    }
  }, [hostSystem, masterGain]);
  return (
    <hostAppContext.Provider
      value={{ hostSystem, hostBpm: bpm, hostPlaying: playing, masterGain }}
    >
      {children}
    </hostAppContext.Provider>
  );
};

/*
usage for default clocking (for simple host):
const audioContext = new AudioContext();
const hostSystem = createHostSystem(audioContext)
<HostAppPlainProvider hostSystem={hostSystem} defaultClocking>
  <UnitFrame unitId="unit1" pageUrl="/path/to/unit.html" />
</HostAppPlainProvider>
*/
export const HostAppProvider = ({
  hostSystem,
  playing = false,
  bpm,
  masterGain,
  children,
  defaultClocking,
}: {
  hostSystem: HostSystem;
  playing?: boolean;
  bpm?: number;
  masterGain?: number;
  children: ReactNode;
  defaultClocking: boolean;
}) => {
  const sequencerTickDriver = useMemo(() => {
    return defaultClocking
      ? createSequencerTickDriver(hostSystem)
      : createSequencerTickDriverDummy();
  }, [hostSystem, defaultClocking]);

  useSequencerTickDriverRunner({
    sequencerTickDriver,
    playing,
    bpm,
  });

  return (
    <HostAppPlainProvider
      hostSystem={hostSystem}
      playing={playing}
      bpm={bpm}
      masterGain={masterGain}
    >
      {children}
    </HostAppPlainProvider>
  );
};
