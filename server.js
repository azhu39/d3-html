const { createServer } = require("http");
const express = require("express");
const WebSocket = require("ws");

let user1Connected = false;
let user2Connected = false;
let activeUser = null; // 'admin', 'user1', or 'user2'

// Configure express for serving files
const app = express();
app.use(express.json({ extended: false }));
app.use(express.static("public"));
app.get("/", (request, response) => {
  response.sendFile(__dirname + "/public/admin.html");
});
app.get("/robot", (request, response) => {
  response.sendFile(__dirname + "/public/robot.html");
});
app.get("/user1", (request, response) => {
  response.sendFile(__dirname + "/public/user1.html");
});
app.get("/user2", (request, response) => {
  response.sendFile(__dirname + "/public/user2.html");
});

// Launch express server
const server = createServer(app);
server.listen(process.env.PORT, () => {
  console.info(`Server running on port: ${process.env.PORT}`);
});

// Launch websocket server
const webSocketServer = new WebSocket.Server({ server });
webSocketServer.on("connection", socket => {
  console.info("Total connected clients:", webSocketServer.clients.size);
  app.locals.clients = webSocketServer.clients;

  // Send all messages to all other clients
  socket.on("message", message => {
    webSocketServer.clients.forEach(client => {
      if (client != socket && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  // End call when any client disconnects
  socket.on("close", () => {
    webSocketServer.clients.forEach(client => {
      if (client != socket && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: "endCall" }));
      }
    });
  });
  
  socket.send("Hello from server");
});
