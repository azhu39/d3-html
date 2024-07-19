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
          document.getElementById(`toggle${signal.user.charAt(0).toUpperCase() + signal.user.slice(1)}`).value = signal.hasControl ? 'Disable' : 'Enable';
          break;
        case "userOffer":
          webrtc.handleUserOffer(signal.user, signal.offer);
          break;
        case "userCandidate":
          webrtc.handleUserCandidate(signal.user, signal.candidate);
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
var adminVideo = document.getElementById("adminVideo");
var urlBox = document.getElementById("urlBox");
var user1Url = document.getElementById("user1Url");
var user2Url = document.getElementById("user2Url");
var robotAvailabilityBox = document.getElementById("robotAvailability");
var iceConfigTextarea = document.getElementById("iceConfig");

window.toggle = (viewID) => {
    var element = document.getElementById(viewID);
    if (element.style.display === "none") {
        element.style.display = "block";
    } else {
        element.style.display = "none";
    }
}

document.getElementById('toggleUser1').addEventListener('click', () => toggleUserControl('user1'));
document.getElementById('toggleUser2').addEventListener('click', () => toggleUserControl('user2'));

document.getElementById('send_iframe').addEventListener('click', () => {
 const getAddress = document.getElementById('addressInput').value;
  window.sendToServer({ type: 'send_iframe', address:getAddress  });
});


function toggleUserControl(user) {
  window.sendToServer({ type: 'toggleControl', user });
}

document.addEventListener("DOMContentLoaded", () => {
const buttons = document.querySelectorAll(".control-button");
let intervalId;

buttons.forEach(button => {
    button.addEventListener("mousedown", () => {
        const getThrottle = parseFloat(button.getAttribute("data-throttle"));
        const getTurn = parseFloat(button.getAttribute("data-turn"));
        intervalId = setInterval(() => {
            window.sendToServer({ type: 'navigateDrive', throttle: getThrottle, turn: getTurn });
        }, 200);
    });

    button.addEventListener("mouseup", () => {
        clearInterval(intervalId);
        window.sendToServer({ type: 'navigate', throttle: 0, turn: 0 }); // Stop the robot when the button is released
    });

    button.addEventListener("mouseleave", () => {
        clearInterval(intervalId);
        window.sendToServer({ type: 'navigate', throttle: 0, turn: 0 }); // Stop the robot when the cursor leaves the button
    });
  });
});

var robotVideoOverlay = document.getElementById('robotVideoOverlay');
robotVideoOverlay.addEventListener('click', function(event) {
    var rect = robotVideoOverlay.getBoundingClientRect();
    var getX = (event.clientX - rect.left) / rect.width;
    var getY = (event.clientY - rect.top) / rect.height;
        event.preventDefault(); 
        console.log(`Click coordinates: x=${getX}, y=${getY}`);
        window.sendToServer({ type: 'click2Drive', x: getX, y: getY });
});

if (window.location.host == "d3-webrtc-example.glitch.me") {
  urlBox.value = "Do step 1 first!";
} else {
  urlBox.value = "https://"+ window.location.host +"/robot";
  user1Url.value = "https://"+ window.location.host +"/user1";
  user2Url.value = "https://"+ window.location.host +"/user2";
  
}

window.listWebcams = () => {
  window.endAdminVideo();
  
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

      window.updateAdminVideo();
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

function stopAdminVideo() {
  if (adminVideo.srcObject) {
    adminVideo.pause();
    adminVideo.srcObject.getTracks().forEach(track => { track.stop(); });
    adminVideo.srcObject = null;
  }
}

window.endAdminVideo = () => {
  clearWebcams();
  stopAdminVideo();
}

window.updateAdminVideo = () => {
  navigator.mediaDevices.getUserMedia({
    audio: { deviceId: mics.value },
    video: { deviceId: cameras.value }
  })
  .then(function (stream) {
    stopAdminVideo();
    adminVideo.srcObject = stream;
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
  window.endAdminVideo();
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
