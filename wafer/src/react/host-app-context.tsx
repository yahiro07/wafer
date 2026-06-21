import { createContext, ReactNode, useContext, useEffect } from "react";
import { HostSystem } from "../core";

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

function useHostAppDrivers({
  hostSystem,
  playing = false,
  bpm,
  masterGain,
}: {
  hostSystem: HostSystem;
  playing?: boolean;
  bpm?: number;
  masterGain?: number;
}) {
  useEffect(() => {
    if (masterGain !== undefined) {
      hostSystem.setMasterGain(masterGain);
    }
  }, [hostSystem, masterGain]);
  useEffect(() => {
    if (bpm) {
      hostSystem.setBpm(bpm);
    }
  }, [hostSystem, bpm]);
  useEffect(() => {
    if (playing) {
      hostSystem.startSequencer();
      return () => hostSystem.stopSequencer();
    } else {
      hostSystem.stopSequencer();
    }
  }, [hostSystem, playing]);
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
  useHostAppDrivers({ hostSystem, playing, bpm, masterGain });
  return (
    <hostAppContext.Provider
      value={{ hostSystem, hostBpm: bpm, hostPlaying: playing, masterGain }}
    >
      {children}
    </hostAppContext.Provider>
  );
};
