import express from "express";
const app = express();
import http from "http";
const httpServer = http.createServer(app);
import { Server, Socket } from 'socket.io';
import { DefaultEventsMap } from "socket.io/dist/typed-events";

const io = new Server(httpServer, { cors: { origin: "*" } })

interface player { name: string; id: string };
interface room {
  id: string;
  p1: player;
  p2?: player;
  private?: boolean;
}

let rooms: room[] = []

const makeId = () => Math.random().toString();
const createRoom = (p: player) => {
  const id = makeId();
  rooms.push({ id, p1:p });
  return id;
}
const freeRooms = () => rooms.filter(room => !room.p2);
const getRoomIndexByRoomId = (id: string) => {
  for (let i = 0; i < rooms.length; i++) if(rooms[i].id == id) return i;
  return -1;
}
const getRoomIndexByPlayerId = (playerId: string) => {
  for (let i = 0; i < rooms.length; i++) if(rooms[i].p1.id == playerId || (rooms[i].p2 && rooms[i].p2.id == playerId)) return i;
  return -1;
}
const updateRoom = (id: string, data: {p1?: player; p2?: player; private?: boolean}) => {
  rooms[getRoomIndexByRoomId(id)] = { ...rooms[getRoomIndexByRoomId(id)], ...data};
}
const deleteRoom = (id: string) => {
  rooms = rooms.filter(room => room.id != id);
}

const join = (p: player, socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>) => {
  const freerooms = freeRooms();
  if(freerooms.length > 0){
    const { id, p1 } = freerooms[0];
    socket.join(id);
    updateRoom(id, { p2: p });
    io.to(id).emit("ready", { id, p1, p2: p });
    // console.log(p.name, "joined room", id); // <======
  }else{
    const id = createRoom(p);
    socket.join(id);
    // console.log(p.name, "opened room", id); // <======
  }
}

io.on("connection", socket => {
  // console.log(socket.id, "Connected"); 

  socket.on("join", name => {
    join({ name, id: socket.id}, socket);
    // console.log(freeRooms, rooms, 0); // <======
  });

  socket.on("move", ({ pos, id }) => {
    socket.broadcast.to(id).emit("updateGame", pos);
  });

  socket.on("disconnect", async () => {
    // console.log("before", rooms);
    const index = getRoomIndexByPlayerId(socket.id);
    if(index !== -1){
      const userRoom = rooms[index];
      const user = userRoom.p1.id == socket.id ? userRoom.p2 : userRoom.p1;
      if(userRoom.p2){
        const freerooms = freeRooms();
        if(freerooms.length > 0){
          const { id, p1 } = freerooms[0];
          io.in(userRoom.id).socketsJoin(id);
          io.socketsLeave(userRoom.id);
          deleteRoom(userRoom.id);
          updateRoom(id, { p2: user });
          const sockets = await io.in(id).fetchSockets();
          const user1Socket = sockets.filter(s => s.id == p1.id)[0];
          const user2Socket = sockets.filter(s => s.id == user.id)[0];
          user1Socket.emit("ready", { id, p1, p2: user });
          user2Socket.emit('re', { id, p1, p2: user, start: user.name == p1.name });
        }else{
          updateRoom(userRoom.id, { p1: user, p2: undefined });
          io.in(userRoom.id).emit('dis');
        }
      }else{
        deleteRoom(userRoom.id);
      }
      // console.log("after", rooms);
    }
  });
});

const port = process.env.PORT || 5000;

httpServer.listen(port, () => console.log(`server started on port: ${port}`));