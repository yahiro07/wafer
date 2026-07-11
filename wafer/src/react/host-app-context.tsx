import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { HostSystem } from "../core";
import { createSequencerTickDriver } from "../core/sequencer-tick-driver/sequencer-tick-driver";
import { useSequencerTickDriverRunner } from "./sequencer-tick-driver-runner";

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
usage with manual clocking (for advanced host):
const audioContext = new AudioContext();
const hostSystem = createHostSystem(audioContext)
const sequencerTickDriver = createSequencerTickDriver(hostSystem)
//in component:
useSequencerTickDriverRunner({ sequencerTickDriver, playing, bpm });
<HostAppPlainProvider hostSystem={hostSystem}>
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
usage with built-in clocking (for simple host):
const audioContext = new AudioContext();
const hostSystem = createHostSystem(audioContext)
//in component:
<HostAppPlainProvider hostSystem={hostSystem} playing={playing} bpm={bpm}>
  <UnitFrame unitId="unit1" pageUrl="/path/to/unit.html" />
</HostAppPlainProvider>
*/
export const HostAppProvider = ({
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
  const sequencerTickDriver = useMemo(
    () => createSequencerTickDriver(hostSystem),
    [hostSystem],
  );
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
