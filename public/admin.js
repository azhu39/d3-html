import { AdminWebRTC } from './admin_webrtc.js';

var webrtc = null;
var iceConfig = null;

// WebSocket

var socket = null;
function connectWebsocket() {
  socket = new WebSocket("wss://" + window.location.hostname);
  socket.onopen = function(event) { log("Connected to server"); };

  socket.onclose = function() {
    log("Disconnected from server");
    window.endCall();
    socket = null;
    setTimeout(connectWebsocket, 1000);
  }

  socket.onmessage = function(event) {
    var signal = null;
    try {
      signal = JSON.parse(event.data);
    } catch (e) {
      log(event.data);
    }

    if (signal) {
      if (!signal.type && signal.candidate) {
        signal.type = "candidate";
      }
      switch (signal.type) {
        case "robotIsAvailable":
          robotAvailabilityBox.innerText = signal.message;
          break;
        case "offer":
          webrtc.handleVideoOffer(signal);
          break;
        case "candidate":
          webrtc.handleCandidate(signal);
          break;
        case 'userConnected':
          document.getElementById(`${signal.user}Status`).textContent = 'Connected';
          break;
        case 'userDisconnected':
          document.getElementById(`${signal.user}Status`).textContent = 'Disconnected';
          document.getElementById(`toggle${signal.user.charAt(0).toUpperCase() + signal.user.slice(1)}`).textContent = 'Enable';
          break;
        case 'controlStatus':
          document.getElementById(`toggle${signal.user.charAt(0).toUpperCase() + signal.user.slice(1)}`).textContent = signal.hasControl ? 'Disable' : 'Enable';
          break;
      }
    }
  };
}



window.sendToServer = (message) => {
  socket.send(JSON.stringify(message));
};

connectWebsocket();

// User Interface

var cameras = document.getElementById("cameras");
var mics = document.getElementById("mics");
var localVideo = document.getElementById("localVideo");
var urlBox = document.getElementById("urlBox");
var user1Url = document.getElementById("user1Url");
var user2Url = document.getElementById("user2Url");
var robotAvailabilityBox = document.getElementById("robotAvailability");
var iceConfigTextarea = document.getElementById("iceConfig");

if (window.location.host == "d3-webrtc-example.glitch.me") {
  urlBox.value = "Do step 1 first!";
} else {
  urlBox.value = "https://"+ window.location.host +"/robot";
  user1Url.value = "https://"+ window.location.host +"/user1";
  user2Url.value = "https://"+ window.location.host +"/user2";
  
}

window.listWebcams = () => {
  window.endLocalVideo();
  
  navigator.mediaDevices.getUserMedia({audio: true, video: true})
  .then(() => {
    navigator.mediaDevices.enumerateDevices()
    .then(function (devices) {
      devices.forEach(function(device) {
        var option = document.createElement("option");
        option.value = device.deviceId;
        option.innerText = device.label;
        if (device.kind == "videoinput") {
          cameras.appendChild(option);
        } else if (device.kind == "audioinput") {
          mics.appendChild(option);
        }
      });

      window.updateLocalVideo();
    })
    .catch(function(err) {
      console.log(err.name + ": " + err.message);
    });
  })
  .catch(function(err) {
    console.log(err.name + ": " + err.message);
  });
};

function clearWebcams() {
  cameras.innerHTML = "";
  mics.innerHTML = "";
}

function stopLocalVideo() {
  if (localVideo.srcObject) {
    localVideo.pause();
    localVideo.srcObject.getTracks().forEach(track => { track.stop(); });
    localVideo.srcObject = null;
  }
}

window.endLocalVideo = () => {
  clearWebcams();
  stopLocalVideo();
}

window.updateLocalVideo = () => {
  navigator.mediaDevices.getUserMedia({
    audio: { deviceId: mics.value },
    video: { deviceId: cameras.value }
  })
  .then(function (stream) {
    stopLocalVideo();
    localVideo.srcObject = stream;
  });
}

window.checkForRobot = () => {
  robotAvailabilityBox.innerText = "Checking...";
  window.sendToServer({ type: "isRobotAvailable" });
}

window.startCall = () => {
  try {
    iceConfig = JSON.parse(iceConfigTextarea.value.replace(/\n/g, ""));
  } catch (e) {
    alert("Error: Could not parse STUN/TURN servers as strict JSON.");
    return;
  }
  iceConfig.sdpSemantics = "unified-plan";
  
  webrtc = new AdminWebRTC(iceConfig, log, window.sendToServer, window.endCall);
  window.sendToServer({
    type: "startCall",
    servers: iceConfig.iceServers,
    transportPolicy: iceConfig.iceTransportPolicy
  });
  clearWebcams();
};

window.endCall = () => {
  webrtc.closeVideoCall();
  window.endLocalVideo();
  window.sendToServer({ type: "endCall" });
  webrtc = null;
};

// Log
var logs = document.querySelector("#logs");
function log(text) {
  if (text && text.name) {
    text = text.name;
  }
  console.log(text);
  logs.innerHTML += "<div>" + text + "</div>";
}

// Keep the websocket connection alive
window.setInterval(() => {
  window.sendToServer({ ping: 1 });
}, 1000);
