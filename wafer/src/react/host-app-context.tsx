import { createContext, ReactNode, useContext, useEffect } from "react";
import { HostSystem } from "../core";
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
  useSequencerTickDriverRunner({
    sequencerTickDriver: hostSystem.sequencerTickDriver,
    playing,
    bpm,
  });
  return (
    <hostAppContext.Provider
      value={{ hostSystem, hostBpm: bpm, hostPlaying: playing, masterGain }}
    >
      {children}
    </hostAppContext.Provider>
  );
};
