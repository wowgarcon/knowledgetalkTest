document.addEventListener('DOMContentLoaded', function() {
    const inputId = document.getElementById('inputId');
    const inputPw = document.getElementById('inputPw');
    const loginBtn = document.getElementById('loginBtn');
    const joinBtn = document.getElementById('joinBtn');
    const localVideo = document.getElementById('localVideo');
    const remoteVideo = document.getElementById('remoteVideo');
    const whiteboard = document.getElementById('whiteboard');
   
    let reqNo = 1;
    let peerCon;
    let localStream;
    let roomId;
    let configuration;
    let penColor;
    let isDrawing = false;
    let context = whiteboard.getContext('2d');
   
    signalSocketIo.on('knowledgetalk', function(data) {
      tLogBox('receive', data);
   
      if (!data.eventOp && !data.signalOp) {
        tLogBox('error', 'eventOp undefined');
      }
   
      if (data.eventOp === 'Login' && data.code ==='200') {
        loginBtn.disabled = true;
        tTextbox('로그인 되었습니다.')
      } else if(data.eventOp === 'Login' && data.code !=='200') {
        tTextbox('아이디 비번을 다시 확인해주세요')
      }
   
      if (data.eventOp === 'Invite') {
        tTextbox(data.userId + '님이 통화를 요청하였습니다.')
        roomId = data.roomId;
        joinBtn.disabled = false;
      }
      
      if (data.eventOp === 'Join' && data.code === '200'){
        tTextbox('통화 연결이 되었습니다.')
      }  

      if (data.eventOp === 'Join') {
        joinBtn.disabled = true;
        navigator.mediaDevices
          .getUserMedia({ video: true, audio: false })
          .then(stream => {
            localStream = stream;
            localVideo.srcObject = localStream;
   
            roomId = data.roomId;
            peerCon = new RTCPeerConnection(configuration);
   
            peerCon.onicecandidate = onIceCandidateHandler;
            peerCon.onaddstream = onAddStreamHandler;
   
            peerCon.addStream(localStream);
            peerCon.createOffer().then(sdp => {
              peerCon.setLocalDescription(new RTCSessionDescription(sdp));
   
              let sdpData = {
                eventOp: 'SDP',
                sdp,
                useMediaSvr: 'N',
                userId: inputId.value,
                roomId,
                reqNo: reqNo++,
                reqDate: nowDate()
              };
   
              try {
                tLogBox('send', sdpData);
                signalSocketIo.emit('knowledgetalk', sdpData);
              } catch (err) {
                if (err instanceof SyntaxError) {
                  alert(
                    ' there was a syntaxError it and try again : ' + err.message
                  );
                } else {
                  throw err;
                }
              }
            });
          });
      }
   
      if (data.eventOp === 'SDP') {
        if (data.sdp.type === 'answer') {
          peerCon.setRemoteDescription(new RTCSessionDescription(data.sdp));
        }
      }
   
      if (data.eventOp === 'Candidate') {
        if (!data.candidate) return;
        peerCon.addIceCandidate(new RTCIceCandidate(data.candidate));
   
        let iceData = {
          eventOp: 'Candidate',
          roomId: data.roomId,
          reqNo: data.reqNo,
          resDate: nowDate(),
          code: '200'
        };
   
        try {
          tLogBox('send', iceData);
          signalSocketIo.emit('knowledgetalk', iceData);
        } catch (err) {
          if (err instanceof SyntaxError) {
            alert(' there was a syntaxError it and try again : ' + err.message);
          } else {
            throw err;
          }
        }
      }
   
      if (data.eventOp === 'WhiteBoardEndSvr') {
        context.clearRect(0, 0, whiteboard.width, whiteboard.height);
        whiteboard.style.display = 'none';
      }
   
      if (data.signalOp === 'Draw') {
        tTextbox('상대방이 화이트 보드 활성화 하였습니다.')
        setPen(penColor);
        whiteboard.style.display = 'inline-block';
   
        let canvasX;
        let canvasY;
   
        if (data.status === 'start') {
          isDrawing = true;
   
          canvasX = data.axisX * (whiteboard.width / data.boardWidth);
          canvasY = data.axisY * (whiteboard.height / data.boardHeight);
   
          context.beginPath();
          context.moveTo(canvasX, canvasY);
        }
        if (data.status === 'move') {
          if (isDrawing === false) return;
   
          canvasX = data.axisX * (whiteboard.width / data.boardWidth);
          canvasY = data.axisY * (whiteboard.height / data.boardHeight);
   
          context.lineTo(canvasX, canvasY);
          context.stroke();
        }
        if (data.status === 'end') {
          isDrawing = false;
   
          context.closePath();
        }
      }
   
      if (data.signalOp === 'Reset') {
        tTextbox('화이트 보드 내용을 지웠습니다.')
        context.clearRect(0, 0, whiteboard.width, whiteboard.height);
      }

      if (data.signalOp === 'Color'){
        penColor = data.color
      }
    });
   
    function onIceCandidateHandler(e) {
      if (!e.candidate) return;
   
      let iceData = {
        eventOp: 'Candidate',
        candidate: e.candidate,
        useMediaSvr: 'N',
        userId: inputId.value,
        roomId,
        reqNo: reqNo++,
        reqDate: nowDate()
      };
   
      try {
        tLogBox('send', iceData);
        signalSocketIo.emit('knowledgetalk', iceData);
      } catch (err) {
        if (err instanceof SyntaxError) {
          alert(' there was a syntaxError it and try again : ' + err.message);
        } else {
          throw err;
        }
      }
    }
   
    function onAddStreamHandler(e) {
      remoteVideo.srcObject = e.stream;
    }
   
    function setPen(color, width) {
      context.globalCompositeOperation = 'source-over';
      context.lineJoin = 'round';
      context.lineCap = 'round';
      context.strokeStyle = color;
      context.lineWidth = width || '5';
    }
   
    loginBtn.addEventListener('click', function(e) {
      let loginData = {
        eventOp: 'Login',
        reqNo: reqNo++,
        userId: inputId.value,
        userPw: passwordSHA256(inputPw.value),
        reqDate: nowDate(),
        deviceType: 'pc'
      };
   
      try {
        tLogBox('send', loginData);
        signalSocketIo.emit('knowledgetalk', loginData);
      } catch (err) {
        if (err instanceof SyntaxError) {
          alert(' there was a syntaxError it and try again : ' + err.message);
        } else {
          throw err;
        }
      }
    });
   
    joinBtn.addEventListener('click', function(e) {
      let joinData = {
        eventOp: 'Join',
        reqNo: reqNo++,
        reqDate: nowDate(),
        userId: inputId.value,
        roomId,
        status: 'accept'
      };
   
      try {
        tLogBox('send', joinData);
        signalSocketIo.emit('knowledgetalk', joinData);
      } catch (err) {
        if (err instanceof SyntaxError) {
          alert(' there was a syntaxError it and try again : ' + err.message);
        } else {
          throw err;
        }
      }
    });
  });