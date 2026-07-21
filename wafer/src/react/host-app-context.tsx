import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { createSequencerTickDriver, HostSystem } from "../core";
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

export const HostAppProvider = ({
  hostSystem,
  playing = false,
  bpm,
  masterGain,
  children,
  manualClocking,
}: {
  hostSystem: HostSystem;
  playing?: boolean;
  bpm?: number;
  masterGain?: number;
  children: ReactNode;
  manualClocking?: boolean;
}) => {
  useEffect(() => {
    if (masterGain !== undefined) {
      hostSystem.setMasterGain(masterGain);
    }
  }, [hostSystem, masterGain]);
  const sequencerTickDriver = useMemo(
    () => (manualClocking ? undefined : createSequencerTickDriver(hostSystem)),
    [manualClocking, hostSystem],
  );
  useSequencerTickDriverRunner({ sequencerTickDriver, playing, bpm });
  return (
    <hostAppContext.Provider
      value={{ hostSystem, hostBpm: bpm, hostPlaying: playing, masterGain }}
    >
      {children}
    </hostAppContext.Provider>
  );
};
