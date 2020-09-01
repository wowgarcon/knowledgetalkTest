document.addEventListener('DOMContentLoaded', function() {
    const inputId = document.getElementById('inputId');
    const inputPw = document.getElementById('inputPw');
    const inputTarget = document.getElementById('inputTarget');
    const loginBtn = document.getElementById('loginBtn');
    const callBtn = document.getElementById('callBtn');
    const localVideo = document.getElementById('localVideo');
    const remoteVideo = document.getElementById('remoteVideo');
    const whiteboardBtn = document.getElementById('whiteboardBtn');
    const whiteboard = document.getElementById('whiteboard');
   
    let reqNo = 1;
    let peerCon;
    let localStream;
    let roomId;
    let configuration;
   
    signalSocketIo.on('knowledgetalk', function(data) {
      tLogBox('receive', data);
      
      if (!data.eventOp && !data.signalOp) {
        tLogBox('error', 'eventOp undefined');
      }
   
      if (data.eventOp === 'Login' && data.code ==='200' ) {
        loginBtn.disabled = true;
        callBtn.disabled = false;
        tTextbox('로그인 되었습니다.')
      } else if(data.eventOp === 'Login' && data.code !=='200') {
        tTextbox('아이디와 비밀번호를 다시 확인해주세요')
      }

      if (data.eventOp === 'Invite'){
        tTextbox(data.userId + '님으로 부터 통화 요청이 왔습니다.')
      }
      
      if (data.eventOp === 'Call' && data.code !== '200'){
        tTextbox('상대방이 로그인 되어 있지 않습니다.');
        roomId = data.roomId;
        let sendData = {
          eventOp: 'ExitRoom',
          reqNo: reqNo++,
          userId: inputId.value,
          userName : inputId.value,
          reqDate: nowDate(),
          roomId: roomId
        };
        try {
          tLogBox('send', sendData);
          signalSocketIo.emit('knowledgetalk', sendData);
  
        } catch (err) {
          if (err instanceof SyntaxError) {
            alert(' there was a syntaxError it and try again : ' + err.message);
          } else {
            throw err;
          }
        }
      } else if (data.eventOp === 'Call') {
        tTextbox('전화 연결중입니다...')
        callBtn.disabled = true;
        navigator.mediaDevices  //연결된 카메라, 마이크에 접근가능한 객체 반환
          .getUserMedia({ video: true, audio: false })
          .then(stream => {
            localStream = stream;
            localVideo.srcObject = stream;
          });
      }
      
      if(data.signalOp === 'Presence' && data.action === 'join'){
        whiteboardBtn.disabled = false;
        whiteboardClearBtn.disabled = false;
        tTextbox('통화 연결이 되었습니다.')

        blackPen.disabled = false;
        redPen.disabled = false;
        bluePen.disabled = false;

      }

      if (data.eventOp === 'SDP') {
        if (data.sdp.type === 'offer') {
          roomId = data.roomId;
          peerCon = new RTCPeerConnection(configuration);
   
          peerCon.onicecandidate = onIceCandidateHandler;
          peerCon.onaddstream = onAddStreamHandler;
   
          peerCon.addStream(localStream);
   
          peerCon.setRemoteDescription(new RTCSessionDescription(data.sdp));
          peerCon.createAnswer().then(sdp => {
            peerCon.setLocalDescription(new RTCSessionDescription(sdp));
   
            let ansData = {
              eventOp: 'SDP',
              sdp,
              useMediaSvr: 'N',   //1:1 통신
              userId: inputId.value,
              roomId,
              reqNo: reqNo++,
              reqDate: nowDate()
            };
   
            try {
              tLogBox('send', ansData);
              signalSocketIo.emit('knowledgetalk', ansData);
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
        }
      }

      
      //화이트 보드 한번 더 클릭 했을때 이벤트 (발생안함)
      if(data.eventOp === 'WhiteBoardEnd' && data.code === '481'){
        context.clearRect(0, 0, whiteboard.width, whiteboard.height);
        
        let clearData = {
          signalOp: 'Reset',
          reqNo: reqNo++,
          reqDate: nowDate(),
          roomId
        };
    
        try {
          tLogBox('send', clearData);
          signalSocketIo.emit('knowledgetalk', clearData);
        } catch (err) {
          if (err instanceof SyntaxError) {
            alert(' there was a syntaxError it and try again : ' + err.message);
          } else {
            throw err;
          }
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
   
    callBtn.addEventListener('click', function(e) {
      let callData = {
        eventOp: 'Call',
        reqNo: reqNo++,
        reqDate: nowDate(),
        userId: inputId.value,
        targetId: [inputTarget.value],
        serviceType: 'call',
        reqDeviceType: 'pc'
      };
   
      try {
        tLogBox('send', callData);
        signalSocketIo.emit('knowledgetalk', callData);
      } catch (err) {
        if (err instanceof SyntaxError) {
          alert(' there was a syntaxError it and try again : ' + err.message);
        } else {
          throw err;
        }
      }
    });
   
    whiteboardBtn.addEventListener('click', function(e) {
      whiteboardBtn.disabled = true
      tTextbox('화이트 보드가 활성화 되었습니다.')
      if (whiteboard.style.display === 'none') {
        whiteboard.style.display = 'inline-block';
        setPen();
      }
    });
   
    whiteboardClearBtn.addEventListener('click', function(e) {
      tTextbox('화이트 보드 내용을 지웠습니다.')
      context.clearRect(0, 0, whiteboard.width, whiteboard.height);
   
      let clearData = {
        signalOp: 'Reset',
        reqNo: reqNo++,
        reqDate: nowDate(),
        roomId
      };
   
      try {
        tLogBox('send', clearData);
        signalSocketIo.emit('knowledgetalk', clearData);
      } catch (err) {
        if (err instanceof SyntaxError) {
          alert(' there was a syntaxError it and try again : ' + err.message);
        } else {
          throw err;
        }
      }
    });
   
    let isDrawing = false;
    let context = whiteboard.getContext('2d');
   
    if (whiteboard) {
      let canvasX;
      let canvasY;
   
      whiteboard.addEventListener('mousedown', function(e) {
        isDrawing = true;
        canvasX = e.pageX - whiteboard.offsetLeft;
        canvasY = e.pageY - whiteboard.offsetTop;
   
        drawing('start', canvasX, canvasY);
   
        context.beginPath();
        context.moveTo(canvasX, canvasY);
      });
      whiteboard.addEventListener('mousemove', function(e) {
        if (isDrawing === false) return;
   
        drawing('move', canvasX, canvasY);
   
        canvasX = e.pageX - whiteboard.offsetLeft;
        canvasY = e.pageY - whiteboard.offsetTop;
        context.lineTo(canvasX, canvasY);
        context.stroke();
      });
      whiteboard.addEventListener('mouseup', function(e) {
        isDrawing = false;
   
        drawing('end', canvasX, canvasY);
   
        context.closePath();
      });
    }

    blackPen.addEventListener('click', e => {
      tTextbox('검정색을 선택하셨습니다.')
      blackPen.disabled = true;
      redPen.disabled = false;
      bluePen.disabled = false;
  
      context.strokeStyle = 'black';
  
      let colorData = {
        signalOp:	"Color",
        reqNo:	"1234567",
        color:	"#000000"
      }
  
      signalSocketIo.emit('knowledgetalk', colorData);
      tLogBox('knowledgetalk', colorData);
  
    })
  
    redPen.addEventListener('click', e => {
      tTextbox('빨간색을 선택하셨습니다.')
      blackPen.disabled = false;
      redPen.disabled = true;
      bluePen.disabled = false;
      context.strokeStyle = 'red';
  
      let colorData = {
        signalOp:	"Color",
        reqNo:	"1234567",
        color:	"#ff0000"
      }
  
      signalSocketIo.emit('knowledgetalk', colorData);
      tLogBox('knowledgetalk', colorData);
    })
  
    bluePen.addEventListener('click', e => {
      tTextbox('파란색을 선택하셨습니다.')
      blackPen.disabled = false;
      redPen.disabled = false;
      bluePen.disabled = true
      context.strokeStyle = 'blue';
  
      let colorData = {
        signalOp:	"Color",
        reqNo:	"1234567",
        color:	"#0000ff"
      }
  
      signalSocketIo.emit('knowledgetalk', colorData);
      tLogBox('knowledgetalk', colorData);
  
    })
   
    function setPen() {
      context.globalCompositeOperation = 'source-over';
      context.lineJoin = 'round';
      context.lineCap = 'round';
      context.strokeStyle = 'black';
      context.lineWidth = '5';
    }
   
    function drawing(status, axisX, axisY) {
      let drawData = {
        signalOp: 'Draw',
        axisX,
        axisY,
        boardWidth: whiteboard.width,
        boardHeight: whiteboard.height,
        status,
        roomId
      };
   
      try {
        tLogBox('send', drawData);
        signalSocketIo.emit('knowledgetalk', drawData);
      } catch (err) {
        if (err instanceof SyntaxError) {
          alert(' there was a syntaxError it and try again : ' + err.message);
        } else {
          throw err;
        }
      }
    }
  });