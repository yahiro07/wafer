import { useEffect } from "react";
import { useHostAppContext } from "./host-app-context";

type Props = {
  //${unitId}.${portId}, portId: primaryInput, primaryOutput, or any ids for additional ports
  source: string;
  destination: string;
};
export const Connection = ({ source, destination }: Props) => {
  const { hostSystem } = useHostAppContext();
  useEffect(() => {
    // When multiple UnitFrames and Connections are recreated together,
    // such as while loading a scene asynchronously, old Connections are removed immediately,
    // while new Connections are established after all units have finished loading.
    // This prevents old and new scenes from interfering with each other when
    // they contain units or connections with the same IDs.

    // The actual connection is performed after all units have finished loading.
    hostSystem.linkageApi.reserveConnection(source, destination, true);
    return () => {
      // Remove the connection immediately.
      hostSystem.linkageApi.reserveConnection(source, destination, false);
    };
  }, [source, destination, hostSystem]);
  return null;
};
