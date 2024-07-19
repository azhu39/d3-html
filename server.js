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
webSocketServer.on("connection", (socket, req) => {
  console.info("Total connected clients:", webSocketServer.clients.size);
  app.locals.clients = webSocketServer.clients;

  let userType;
  if (req.url === '/') userType = 'admin';
  else if (req.url === '/user1') userType = 'user1';
  else if (req.url === '/user2') userType = 'user2';
  else if (req.url === '/robot') userType = 'robot';
  else {
    socket.close();
    return;
  }
  
  socket.userType = userType;
  
  if (userType === 'user1') user1Connected = true;
  if (userType === 'user2') user2Connected = true;
  
  if (userType === 'user1' || userType === 'user2') {
    notifyAdmin('userConnected', { user: userType });
  }
  
  // Send all messages to all other clients
  socket.on("message", message => {
    const signal = JSON.parse(message);

    if (signal.type === "toggleControl") {
      if (activeUser === signal.user) {
        activeUser = null;
      } else {
        activeUser = signal.user;
      }
      notifyAdmin('controlStatus', { user: signal.user, hasControl: activeUser === signal.user });
      notifyUser(signal.user, 'controlStatus', { hasControl: activeUser === signal.user });
    } 
    else if (signal.type === "send_iframe") {
      notifyUser('user1', 'send_iframe', { address: signal.address });
      notifyUser('user2', 'send_iframe', { address: signal.address });
      console.info("The iframe src: "+ signal.address);
    
    }
    else {
      // Only forward messages from admin or active user to robot
      if (socket.userType === 'admin' || socket.userType === activeUser || socket.userType === 'robot') {
        webSocketServer.clients.forEach(client => {
          if (client != socket && client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
      }
    }
  });

  // End call when any client disconnects
  socket.on("close", () => {
      if (socket.userType === 'user1') user1Connected = false;
      if (socket.userType === 'user2') user2Connected = false;
      if (activeUser === socket.userType) activeUser = null;

      if (socket.userType === 'user1' || socket.userType === 'user2') {
        notifyAdmin('userDisconnected', { user: socket.userType });
      }
      if (socket.userType === 'admin') {
        webSocketServer.clients.forEach(client => {
          if (client != socket && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: "endCall" }));
          }
        });
      }
      
  });
  
  socket.send("Hello from server");
});

function notifyAdmin(type, data) {
  webSocketServer.clients.forEach(client => {
    if (client.userType === 'admin' && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type, ...data }));
    }
  });
}

function notifyUser(userType, type, data) {
  webSocketServer.clients.forEach(client => {
    if (client.userType === userType && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type, ...data }));
    }
  });
}
