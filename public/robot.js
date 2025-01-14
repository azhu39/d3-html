var logs = document.querySelector("#logs");
function log(text) {
  console.log(text);
  logs.innerHTML += "<div>" + text + "</div>";
}

var socket = null;
function connectWebsocket() {
  socket = new WebSocket("wss://" + window.location.hostname);
  socket.onopen = function(event) { log("Connected to server"); };

  socket.onclose = function() {
    log("Disconnected from server");
    endCall();
    socket = null;
    setTimeout(connectWebsocket, 1000);
  }

  socket.onmessage = function(event) {
    var signal = null;
    try {
      signal = JSON.parse(event.data);
      // log(signal);
    } catch (e) {
      log(event.data);
    }

    if (signal) {
      // Note: DO NOT pass DRDoubleSDK commands directy from your driver or you will be opening a massive security hole to your robot. You should use your own command structure for your signaling server, then hard-code commands for the DRDoubleSDK on the robot side - just like we're doing right here.
      switch (signal.type) {

        case "isRobotAvailable":
          sendToServer({ type: "robotIsAvailable", message: "Robot is here!" });
          log("Received availability check");
          break;

        case "preheat":
          DRDoubleSDK.sendCommand("camera.enable", { template: "preheat" });
          break;
          
        case "startCall":
          log("startCall");
          DRDoubleSDK.sendCommand("camera.enable", { template: "h264ForWebRTC" });
          DRDoubleSDK.sendCommand("webrtc.enable", {
            servers: signal.servers,
            transportPolicy: signal.transportPolicy || "all",
            manageCamera: true
          });
          
          DRDoubleSDK.sendCommand("camera.output", { template: ["h264ForWebRTC", "v4l2" ] });
          
          break;

        case "endCall":
          endCall();
          break;

        case "answer":
        case "candidate":
          log("Received signal");
          DRDoubleSDK.sendCommand("webrtc.signal", signal);
          break;

        case "poleStand":
          DRDoubleSDK.sendCommand("base.pole.stand");
          break;

        case "poleSit":
          DRDoubleSDK.sendCommand("base.pole.sit");
          break;

        case "poleStop":
          DRDoubleSDK.sendCommand("base.pole.stop");
          break;
          
        case "enableNavigation":
          DRDoubleSDK.sendCommand("navigate.enable");
          break;
        
        case "deployKickstand":
          DRDoubleSDK.sendCommand("base.kickstand.deploy");
          break;
        
        case "retractKickstand":
          DRDoubleSDK.sendCommand("base.kickstand.retract");
          break;

        case "relativeTarget":
          if (signal.hasOwnProperty("x") && signal.hasOwnProperty("y")) {
            DRDoubleSDK.sendCommand("navigate.target", { relative: true, x: signal.x, y: signal.y });
          }
          break;
        
        case "navigateDrive":
          if (signal.hasOwnProperty("throttle") && signal.hasOwnProperty("turn")) {
            DRDoubleSDK.sendCommand("navigate.enable");
            DRDoubleSDK.sendCommand("navigate.drive", { throttle: signal.throttle, turn: signal.turn });
          }
          break;
        
        case "click2Drive":
          if (signal.hasOwnProperty("x") && signal.hasOwnProperty("y")) {
            DRDoubleSDK.sendCommand("navigate.enable");
            DRDoubleSDK.sendCommand("camera.hitTest", { x: signal.x, y: signal.y, highlight: true, passToNavigate:true});
          }
          break;
        
      }
    }
  };
}
connectWebsocket();

function sendToServer(message) {
  socket.send(JSON.stringify(message));
}

function endCall() {
  log("endCall");
  DRDoubleSDK.sendCommand("webrtc.disable");
  DRDoubleSDK.sendCommand("navigate.disable");
}

// DRDoubleSDK is preloaded in the web view on the robot, so it will show errors on the Glitch.com editor
if (typeof DRDoubleSDK === 'undefined' || DRDoubleSDK === null) {
  var DRDoubleSDK = {};
}

// Make sure the camera and webrtc modules are off, so we can use them.
DRDoubleSDK.sendCommand("camera.disable");
DRDoubleSDK.sendCommand("webrtc.disable");

// We must reset the watchdog faster than every 3 seconds, so D3 knows that our pages is still running ok.
DRDoubleSDK.resetWatchdog();
window.setInterval(() => {
  DRDoubleSDK.resetWatchdog();
  DRDoubleSDK.sendCommand("screensaver.nudge");
}, 2000);

DRDoubleSDK.sendCommand("events.subscribe", {
  events: [
    "DRWebRTC.signal"
  ]
});

// Subscribe to events that we want to receive.
DRDoubleSDK.on("event", (message) => {

  // Event messages include: { class: "DRNetwork", key: "info", data: {...} }
	switch (message.class + "." + message.key) {

    case "DRWebRTC.signal":
      sendToServer(message.data);
      break;
  }
});

// Keep the websocket connection alive
window.setInterval(() => {
  window.sendToServer({ ping: 1 });
}, 1000);
