// export function AdminWebRTC(iceConfig, log, sendToServer, hangUpCall) {

//   var pc = null;
//   var adminVideo = document.getElementById("adminVideo");
//   var robotVideo = document.getElementById("robotVideo");

  
//   this.handleVideoOffer = async (msg) => {
//     log("Received call offer");

//     pc = new RTCPeerConnection(iceConfig);
//     pc.onicecandidate = (event) => this.onicecandidate(event);
//     pc.oniceconnectionstatechange = () => this.oniceconnectionstatechange();
//     pc.onicegatheringstatechange = () => this.onicegatheringstatechange();
//     pc.onsignalingstatechange = () => this.onsignalingstatechange();
//     pc.ontrack = (event) => this.ontrack(event);

//     var desc = new RTCSessionDescription(msg);
//     await pc.setRemoteDescription(desc);

//     if (!adminVideo.srcObject) {
//       adminVideo.srcObject = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
//     }

//     adminVideo.srcObject.getTracks().forEach(track => pc.addTrack(track, adminVideo.srcObject));

//     await pc.setLocalDescription(await pc.createAnswer());
//     sendToServer(pc.localDescription);

//     log("Sending SDP answer");
//   }

//   this.handleCandidate = (candidate) => {
//     var candidate = new RTCIceCandidate(candidate);
//     log("Adding received ICE candidate: " + JSON.stringify(candidate));
//     pc.addIceCandidate(candidate);
//   }

//   this.closeVideoCall = () => {
//     log("Closing the call");

//     if (pc) {
//       log("Closing the peer connection");

//       pc.onicecandidate = null;
//       pc.oniceconnectionstatechange = null;
//       pc.onicegatheringstatechange = null;
//       pc.onsignalingstatechange = null;
//       pc.ontrack = null;

//       pc.getSenders().forEach(track => { pc.removeTrack(track); });
      
//       if (robotVideo) {
//         robotVideo.srcObject = null;
//         robotVideo.controls = false;
//       }
      
//       pc.close();
//       pc = null;
//     }
//   }

//   this.onicecandidate = (event) => {
//     if (event.candidate) {
//       log("Outgoing ICE candidate: " + event.candidate.candidate);
//       sendToServer({
//         type: "candidate",
//         sdpMLineIndex: event.candidate.sdpMLineIndex,
//         sdpMid: event.candidate.sdpMid,
//         candidate: event.candidate.candidate
//       });
//     }
//   };

//   this.oniceconnectionstatechange = () => {
//     log("ICE connection state changed to " + pc.iceConnectionState);
//     switch(pc.iceConnectionState) {
//       case "closed":
//       case "failed":
//       case "disconnected":
//         hangUpCall();
//         break;
//     }
//   };

//   this.onicegatheringstatechange = () => {
//     log("ICE gathering state changed to " + pc.iceGatheringState);
//   };

//   this.onsignalingstatechange = () => {
//     log("WebRTC signaling state changed to: " + pc.signalingState);
//     switch(pc.signalingState) {
//       case "closed":
//         hangUpCall();
//         break;
//     }
//   };

//   this.ontrack = (event) => {
//     log("Track event");
//     robotVideo.srcObject = event.streams[0];
//     robotVideo.controls = true;
//   };
  
// };

// export default AdminWebRTC;

export function AdminWebRTC(iceConfig, log, sendToServer, hangUpCall) {

  var pc = null;
  var adminVideo = document.getElementById("adminVideo");
  var robotVideo = document.getElementById("robotVideo");

  
  this.handleVideoOffer = async (msg) => {
    log("Received call offer");

    pc = new RTCPeerConnection(iceConfig);
    pc.onicecandidate = (event) => this.onicecandidate(event);
    pc.oniceconnectionstatechange = () => this.oniceconnectionstatechange();
    pc.onicegatheringstatechange = () => this.onicegatheringstatechange();
    pc.onsignalingstatechange = () => this.onsignalingstatechange();
    pc.ontrack = (event) => this.ontrack(event);

    var desc = new RTCSessionDescription(msg);
    await pc.setRemoteDescription(desc);

    if (!adminVideo.srcObject) {
      adminVideo.srcObject = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    }

    adminVideo.srcObject.getTracks().forEach(track => pc.addTrack(track, adminVideo.srcObject));

    await pc.setLocalDescription(await pc.createAnswer());
    sendToServer(pc.localDescription);

    log("Sending SDP answer");
  }

  this.handleCandidate = (candidate) => {
    var candidate = new RTCIceCandidate(candidate);
    log("Adding received ICE candidate: " + JSON.stringify(candidate));
    pc.addIceCandidate(candidate);
  }

  this.closeVideoCall = () => {
    log("Closing the call");

    if (pc) {
      log("Closing the peer connection");

      pc.onicecandidate = null;
      pc.oniceconnectionstatechange = null;
      pc.onicegatheringstatechange = null;
      pc.onsignalingstatechange = null;
      pc.ontrack = null;

      pc.getSenders().forEach(track => { pc.removeTrack(track); });
      
      if (robotVideo) {
        robotVideo.srcObject = null;
        robotVideo.controls = false;
      }
      
      pc.close();
      pc = null;
    }
  }

  this.onicecandidate = (event) => {
    if (event.candidate) {
      log("Outgoing ICE candidate: " + event.candidate.candidate);
      sendToServer({
        type: "candidate",
        sdpMLineIndex: event.candidate.sdpMLineIndex,
        sdpMid: event.candidate.sdpMid,
        candidate: event.candidate.candidate
      });
    }
  };

  this.oniceconnectionstatechange = () => {
    log("ICE connection state changed to " + pc.iceConnectionState);
    switch(pc.iceConnectionState) {
      case "closed":
      case "failed":
      case "disconnected":
        hangUpCall();
        break;
    }
  };

  this.onicegatheringstatechange = () => {
    log("ICE gathering state changed to " + pc.iceGatheringState);
  };

  this.onsignalingstatechange = () => {
    log("WebRTC signaling state changed to: " + pc.signalingState);
    switch(pc.signalingState) {
      case "closed":
        hangUpCall();
        break;
    }
  };
  
  var userConnections = {};

  this.createUserConnection = (user) => {
    const userPC = new RTCPeerConnection(iceConfig);
    userPC.onicecandidate = (event) => {
      if (event.candidate) {
        sendToServer({
          type: "candidate",
          target: user,
          candidate: event.candidate
        });
      }
    };
    if (robotVideo.srcObject) {
      robotVideo.srcObject.getTracks().forEach(track => userPC.addTrack(track, robotVideo.srcObject));
    }
    userConnections[user] = userPC;
    return userPC;
  };

  this.handleUserOffer = async (user, offer) => {
    const userPC = this.createUserConnection(user);
    await userPC.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await userPC.createAnswer();
    await userPC.setLocalDescription(answer);
    sendToServer({
      type: "answer",
      target: user,
      sdp: userPC.localDescription
    });
  };

  this.handleUserCandidate = (user, candidate) => {
    const userPC = userConnections[user];
    if (userPC) {
      userPC.addIceCandidate(new RTCIceCandidate(candidate));
    }
  };

  // Modify the ontrack method to forward the stream to users
  this.ontrack = (event) => {
    log("Track event");
    robotVideo.srcObject = event.streams[0];
    robotVideo.controls = true;

    // Forward stream to connected users
    Object.values(userConnections).forEach(userPC => {
      event.streams[0].getTracks().forEach(track => {
        userPC.getSenders().forEach(sender => {
          if (sender.track && sender.track.kind === track.kind) {
            sender.replaceTrack(track);
          }
        });
      });
    });
  };
  
};

export default AdminWebRTC;
