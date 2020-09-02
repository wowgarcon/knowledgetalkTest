document.addEventListener('DOMContentLoaded', function () {
    const inputId = document.getElementById('inputid');
    const inputPw = document.getElementById('inputpw');
    const inputTarget = document.getElementById('inputTarget');
    const loginBtn = document.getElementById('loginBtn');
    const callBtn = document.getElementById('callBtn');
    const exitBtn = document.getElementById('exitBtn');
    const localVideo = document.getElementById('localVideo');
    const remoteVideo = document.getElementById('remoteVideo');

    let reqNo = 1;
    let localStream;
    let peerCon;
    let configuration = [];
    let roomId;


    loginBtn.addEventListener('click', function (e) {
        let loginData = {
            eventOp: 'Login',
            reqNo: reqNo++,
            userId: inputId.value,
            userPw: passwordSHA256(inputPw.value),
            reqDate: nowDate(),
            deviceType: 'pc'
        };

        try {
            tLogBox('send(login)', loginData);
            signalSocketIo.emit('knowledgetalk', loginData);
        } catch (err) {
            if (err instanceof SyntaxError) {
                alert('there was a syntaxError it and try again : ' + err.message);
            } else {
                throw err;
            }
        }
    });

    callBtn.addEventListener('click', function (e) {

        let callData = {
            eventOp: 'Call',
            reqNo: reqNo++,
            reqDate: nowDate(),
            userId: inputId.value,
            targetId: [inputTarget.value],
            reqDeviceType: 'pc'
        };

        try {
            tLogBox('send(call)', callData);
            signalSocketIo.emit('knowledgetalk', callData);
        } catch (err) {
            if (err instanceof SyntaxError) {
                alert('there was a syntaxError it and try again : ' + err.message);
            } else {
                throw err;
            }
        }

    });

    exitBtn.addEventListener('click', function (e) {
        localStream.getTracks()[0].stop();
        localStream.getTracks()[1].stop();
        localStream = null;
        peerCon.close();
        peerCon = null;

        localVideo.srcObject = null;
        remoteVideo.srcObject = null;

        callBtn.disabled = false;
        exitBtn.disabled = true;

        let callEndData = {
            eventOp: 'ExitRoom',
            reqNo: reqNo,
            userId: inputId.value,
            reqDate: nowDate(),
            roomId
        };

        try {
            tLogBox('send', callEndData);
            signalSocketIo.emit('knowledgetalk', callEndData);
        } catch (err) {
            if (err instanceof SyntaxError) {
                alert('there was a syntaxError it and try again:' + err.message);
            } else {
                throw err;
            }
        }
    });

    //네트워크 정보 교환
    function onIceCandidateHandler(e) {
        if (!e.candidate) return;

        let iceData = {
            eventOp: 'Candidate',
            reqNo: reqNo++,
            userId: inputId.value,
            reqDate: nowDate(),
            candidate: e.candidate,
            roomId,
            usage: 'cam',
            useMediaSvr: 'N'
        };

        try {
            tLogBox('send(onIceCandidateHandler)', iceData);
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
        remoteVideo.srcObject = e.streams[0];
    }

    signalSocketIo.on('knowledgetalk', function (data) {
        tLogBox('receive', data);

        if (!data.eventOp && !data.signalOp) {
            tLogBox('error', 'eventOp undefined');
        }

        if (data.eventOp === 'Login' && data.code === '200') {
            loginBtn.disabled = true;
            callBtn.disabled = false;
            tTextbox('로그인 되었습니다');
        } else if(data.eventOp === 'Login' && data.code !== '200') {
            tTextbox('아이디 비밀번호를 다시 확인해주세요')
        }

        if (data.eventOp === 'Call') {
            
            
            if (data.code === '200') {
                tTextbox(`${inputTarget.value}님에게 통화 연결 중`);

                configuration.push({
                    urls: data.serverInfo['_j'].turn_url,
                    credential: data.serverInfo['_j'].turn_credential,
                    username: data.serverInfo['_j'].turn_username
                });
    
                callBtn.disabled = true;
                exitBtn.disabled = false;
                navigator.mediaDevices.getUserMedia({   // streaming video, audio (video: true, audio: true).
                    video: true,
                    audio: true
                })
                .then(stream => {       // Handles success by adding the MediaStream to the video element.
                    localStream = stream;
                    localVideo.srcObject = stream;
                });

            } else {
                callBtn.disabled = true;
                exitBtn.disabled = true;
                loginBtn.disabled = false;
                tTextbox(`(${inputTarget.value})님이 로그인 되어 있지 않습니다!`)
                
                let logoutData = {
                    eventOp: 'Logout',
                    reqNo: reqNo++,
                    userId: inputId.value,
                    reqDate: nowDate()
                  };
                  try {
                    tLogBox('send', logoutData);
                    signalSocketIo.emit('knowledgetalk', logoutData);
                  } catch (err) {
                    if (err instanceof SyntaxError) {
                        alert('there was a syntaxError it and try again:' + err.message);
                    } else {
                        throw err;
                    }
                  }
            }

        }

        if (data.eventOp == 'SDP') {
            if (data.sdp && data.sdp.type === 'offer') {

                roomId = data.roomId;
                peerCon = new RTCPeerConnection(configuration);
                peerCon.onicecandidate = onIceCandidateHandler;

                peerCon.ontrack = onAddStreamHandler;
                localStream.getTracks().forEach(function (track) {
                    peerCon.addTrack(track, localStream);
                    //addTrack 다른 유저에게 전송될 트랙들 묶음을 신규 미디어 트랜을 추가
                });

                peerCon.setRemoteDescription(new RTCSessionDescription(data.sdp));
                peerCon.createAnswer().then(sdp => {
                    peerCon.setLocalDescription(new RTCSessionDescription(sdp));
                    //setLocalDescription 로컬 설명은 미디어 형식을 포함하는 연결의 로컬 엔드에 대한 속성을 명시

                    let ansData = {
                        eventOp: 'SDP',
                        reqNo: reqNo++,
                        userId: inputId.value,
                        reqDate: nowDate(),
                        sdp,
                        roomId,
                        usage: 'cam',
                        useMediaSvr: 'N'
                    };

                    try {
                        tLogBox('sdp answer data ', ansData);
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

        if (data.eventOp === 'Candidate') {
            if (data.candidate) peerCon.addIceCandidate(new RTCIceCandidate(data.candidate));

            let iceData = {
                eventOp: 'Candidate',
                roomId: data.roomId,
                reqNo: data.reqNo,
                resDate: nowDate(),
                code: '200'
            };

            try {
                tTextbox('전화 연결이 되었습니다.');
                tLogBox('send(candidate)', iceData);
                signalSocketIo.emit('knowledgetalk', iceData);
            } catch (err) {
                if (err instanceof SyntaxError) {
                    alert(' there was a syntaxError it and try again : ' + err.message);
                } else {
                    throw err;
                }
            }
        }

        if(data.eventOp === 'ExitRoom'){
            tTextbox('통화 종료 되었습니다.');
        }

        if (data.signalOp === 'Presence' && data.action === 'exit') {
            tTextbox('통화 종료 되었습니다.')
            localStream.getTracks()[0].stop();
            localStream.getTracks()[1].stop();
            localStream = null;
            peerCon.close();
            peerCon = null;

            localVideo.srcObject = null;
            remoteVideo.srcObject = null;

            callBtn.disabled = false;
            exitBtn.disabled = true;

            let callEndData = {
                eventOp: 'ExitRoom',
                reqNo: reqNo,
                userId: inputId.value,
                reqDate: nowDate(),
                roomId
            };

            try {
                tLogBox('send', callEndData);
                signalSocketIo.emit('knowledgetalk', callEndData);
            } catch (err) {
                if (err instanceof SyntaxError) {
                    alert('there was a syntaxError it and try again:' + err.message);
                } else {
                    throw err;
                }
            }
        }

    });

})