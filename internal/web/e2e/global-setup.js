import { startServers } from "./servers.js";

export default async function globalSetup() {
  return startServers();
}
