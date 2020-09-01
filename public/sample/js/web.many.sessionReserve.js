document.addEventListener('DOMContentLoaded', function() {
    const inputId = document.getElementById('inputId');
    const inputPw = document.getElementById('inputPw');
    const loginBtn = document.getElementById('loginBtn');
    const callBtn = document.getElementById('callBtn');
    const joinBtn = document.getElementById('joinBtn');
    const exitBtn = document.getElementById('exitBtn');
    let sessionBtn = document.getElementById('sessionBtn')
   
    let localStream;
    let reqNo = 1;
    let roomId;
    let kurentoPeer;
   
    signalSocketIo.on('knowledgetalk', function(data) {
   
      tLogBox('receive', data);
      
      if (!data.eventOp && !data.signalOp) {
        tLogBox('error', 'eventOp undefined');
      }
   
      if (data.eventOp === 'Login' && data.code === '200') {
        tTextbox('로그인 되었습니다.');
        loginBtn.disabled = true;
        callBtn.disabled = false;
      }
      
      //초대할때 RoomId가 시그널서버에서 브로드캐슬 이벤트
      if (data.eventOp === 'Invite') {
        roomId = data.roomId;
        tTextbox(data.userId+'님으로 부터 회의초대 요청이 들어 왔습니다.')
        callBtn.disabled = true;
        joinBtn.disabled = false;
      }

      //자료 공유 활성화
      if (data.eventOp === 'Join' && data.code === '200'){
        tTextbox('회의를 시작하셔도 됩니다.');
        sessionBtn.disabled = false;
      } else if(data.signalOp === 'Presence' && data.action === 'join'){    //응답
        tTextbox('회의를 시작하셔도 됩니다.');
        sessionBtn.disabled = false;
        callBtn.disabled = true;
      }
   
      if (data.eventOp === 'Call' && data.code === '200') {
        roomId = data.roomId;
        exitBtn.disabled = false;
      } else if (data.eventOp === 'Call' && data.code !== '200'){
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
      }
      
   
      if (data.eventOp === 'Join') {
        roomId = data.roomId;
   
        joinBtn.disabled = true;
        exitBtn.disabled = false;
      }
   
      if (data.eventOp === 'SDP') {
        if (data.sdp && data.sdp.type === 'answer' && kurentoPeer) {
        }
      }
      
      //공유 자원 예약 이벤트
      if(data.eventOp === 'SessionReserve' && data.code === '200'){
        tTextbox('공유자원이 예약 되었습니다')
      } 
      if(data.eventOp === 'SessionReserve' && data.code !== '200'){
        tTextbox('다른분이 먼저 공유자원을 예약 하셨습니다.')
      }

      //회의 종료시 response
      if(data.eventOp === 'ExitRoom' && data.message === 'OK'){
        tTextbox('회의를 종료합니다.')
        sessionBtn.disabled = true
      } 
      
      if(data.signalOp === 'Presence' && (data.action === 'exit' || data.action === 'end')){
        tTextbox('회의를 종료합니다.')
        sessionBtn.disabled = true
        exitBtn.disabled = true
        callBtn.disabled = false
        loginBtn.disabled = true
        joinBtn.disabled = true;
      }
   
      if (data.eventOp === 'Candidate') {
        if (!data.candidate) return;
   
        let iceData = {
          eventOp: 'Candidate',
          reqNo: reqNo++,
          resDate: nowDate(),
          userId: inputId.value,
          roomId: data.roomId,
          candidate: data.candidate,
          useMediaSvr: 'Y',
          usage: 'cam'
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
        userId: inputId.value,
        reqDate: nowDate(),
        reqDeviceType: 'pc',
        serviceType: 'multi',
        targetId: ['melon', 'apple']
      };

      try {
        tTextbox('회의에 초대 중입니다.')
        signalSocketIo.emit('knowledgetalk', callData);
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
   
    exitBtn.addEventListener('click', function(e) {
      loginBtn.disabled = true;
      callBtn.disabled = false;
      joinBtn.disabled = true;
      exitBtn.disabled = true;
      
      let callEndData = {
          eventOp: 'ExitRoom',
          reqNo: reqNo,
          userId: inputId.value,
          reqDate: nowDate(),
          roomId
      };

      try {
        tLogBox('send',callEndData);
        signalSocketIo.emit('knowledgetalk', callEndData);

      } catch (err) {
        if (err instanceof SyntaxError) {
            alert('there was a syntaxError it and try again:' + err.message);
        } else {
            throw err;
        }
      }
    });
   
   
   
    sessionBtn.addEventListener('click', function(e){
        let sessionData = {
            eventOp : 'SessionReserve',
            reqNo : reqNo ++,
            userId : inputId.value,
            reqDate : nowDate(),
            roomId
        }
        try {
          tLogBox('send', sessionData);
          signalSocketIo.emit('knowledgetalk', sessionData);
        } catch (err) {
          if (err instanceof SyntaxError) {
            alert(' there was a syntaxError it and try again : ' + err.message);
          } else {
            throw err;
          }
        }
    })
  });