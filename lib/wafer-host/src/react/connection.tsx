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
    hostSystem.linkageApi.reserveConnection(source, destination, true);
    return () => {
      hostSystem.linkageApi.reserveConnection(source, destination, false);
    };
  }, [source, destination, hostSystem]);
  return null;
};
