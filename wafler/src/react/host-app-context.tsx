import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { HostSystem } from "../host";
import { createSequencerTickDriver } from "../host/sequencer-tick-driver/sequencer-tick-driver";

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
  const sequencerTickDriver = useMemo(
    () => createSequencerTickDriver(hostSystem),
    [hostSystem],
  );
  // useEffect(hostSystem.setupLifecycle, []);
  useEffect(() => {
    if (masterGain !== undefined) {
      hostSystem.setMasterGain(masterGain);
    }
  }, [hostSystem, masterGain]);
  useEffect(() => {
    if (bpm) {
      sequencerTickDriver.setBpm(bpm);
    }
  }, [sequencerTickDriver, bpm]);
  useEffect(() => {
    if (playing) {
      sequencerTickDriver.start();
      return () => sequencerTickDriver.stop();
    } else {
      sequencerTickDriver.stop();
    }
  }, [sequencerTickDriver, playing]);
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
