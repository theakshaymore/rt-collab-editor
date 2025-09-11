import { io } from "socket.io-client";

let socket = null;

export function getSocket(apiUrl, auth) {
  if (socket && socket.connected) return socket;
  socket = io(apiUrl, { auth });
  return socket;
}
