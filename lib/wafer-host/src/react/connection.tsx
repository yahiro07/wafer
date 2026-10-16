import { useEffect } from "react";
import { useHostAppContext } from "./host-app-context";

type Props = {
  //unitId
  //OR
  //${unitId}.${portId}, portId: primaryInput, primaryOutput, or any ids for additional ports
  source: string;
  destination: string;
};
export const Connection = ({ source, destination }: Props) => {
  const { hostSystem } = useHostAppContext();
  useEffect(() => {
    if (!source.includes(".")) {
      source = `${source}.primaryOutput`;
    }
    if (!destination.includes(".")) {
      destination = `${destination}.primaryInput`;
    }
    hostSystem.linkageApi.reserveConnection(source, destination, true);
    return () => {
      hostSystem.linkageApi.reserveConnection(source, destination, false);
    };
  }, [source, destination, hostSystem]);
  return null;
};
