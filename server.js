"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
const http_1 = __importDefault(require("http"));
const httpServer = http_1.default.createServer(app);
const socket_io_1 = require("socket.io");
const io = new socket_io_1.Server(httpServer, { cors: { origin: "*" } });
;
let rooms = [];
const makeId = () => Math.random().toString();
const createRoom = (p, mode) => {
    const id = makeId();
    rooms.push({ id, mode, p1: p });
    return id;
};
const freeRooms = (mode) => rooms.filter(room => !room.p2 && room.mode === mode);
const getRoomIndexByRoomId = (id) => {
    for (let i = 0; i < rooms.length; i++)
        if (rooms[i].id == id)
            return i;
    return -1;
};
const getRoomIndexByPlayerId = (playerId) => {
    for (let i = 0; i < rooms.length; i++)
        if (rooms[i].p1.id == playerId || (rooms[i].p2 && rooms[i].p2.id == playerId))
            return i;
    return -1;
};
const updateRoom = (id, data) => {
    rooms[getRoomIndexByRoomId(id)] = Object.assign(Object.assign({}, rooms[getRoomIndexByRoomId(id)]), data);
};
const deleteRoom = (id) => {
    rooms = rooms.filter(room => room.id != id);
};
const join = (p, mode, socket) => {
    const freerooms = freeRooms(mode);
    if (freerooms.length > 0) {
        const { id, p1 } = freerooms[0];
        socket.join(id);
        updateRoom(id, { p2: p });
        io.to(id).emit("ready", { id, p1, p2: p });
        // console.log(p.name, "joined room", id); // <======
    }
    else {
        const id = createRoom(p);
        socket.join(id);
        // console.log(p.name, "opened room", id); // <======
    }
};
io.on("connection", socket => {
    // console.log(socket.id, "Connected"); 
    socket.on("join", ({name, mode}) => {
        join({ name, mode, id: socket.id }, socket);
        // console.log(freeRooms, rooms, 0); // <======
    });
    socket.on("move", ({ pos, id }) => {
        socket.broadcast.to(id).emit("updateGame", pos);
    });
    socket.on("disconnect", () => __awaiter(void 0, void 0, void 0, function* () {
        // console.log("before", rooms);
        const index = getRoomIndexByPlayerId(socket.id);
        if (index !== -1) {
            const userRoom = rooms[index];
            const user = userRoom.p1.id == socket.id ? userRoom.p2 : userRoom.p1;
            if (userRoom.p2) {
                const freerooms = freeRooms(userRoom.mood);
                if (freerooms.length > 0) {
                    const { id, p1 } = freerooms[0];
                    io.in(userRoom.id).socketsJoin(id);
                    io.socketsLeave(userRoom.id);
                    deleteRoom(userRoom.id);
                    updateRoom(id, { p2: user });
                    const sockets = yield io.in(id).fetchSockets();
                    const user1Socket = sockets.filter(s => s.id == p1.id)[0];
                    const user2Socket = sockets.filter(s => s.id == user.id)[0];
                    user1Socket.emit("ready", { id, p1, p2: user });
                    user2Socket.emit('re', { id, p1, p2: user, start: user.name == p1.name });
                }
                else {
                    updateRoom(userRoom.id, { p1: user, p2: undefined });
                    io.in(userRoom.id).emit('dis');
                }
            }
            else {
                deleteRoom(userRoom.id);
            }
            // console.log("after", rooms);
        }
    }));
});
const port = process.env.PORT || 5000;
httpServer.listen(port, () => console.log(`server started on port: ${port}`));
//# sourceMappingURL=server.js.map
