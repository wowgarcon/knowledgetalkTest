document.addEventListener('DOMContentLoaded', function () {
    const inputId = document.getElementById('inputId');
    const inputPw = document.getElementById('inputPw');
    const loginBtn = document.getElementById('loginBtn');
    const joinBtn = document.getElementById('joinBtn');
    const exitBtn = document.getElementById('exitBtn');
    const localVideo = document.getElementById('localVideo');
    const remoteVideo = document.getElementById('remoteVideo');

    let reqNo = 1;
    let localStream;
    let remoteStream;
    let peerCon;
    let configuration = [];

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
                alert(' there was a syntaxError it and try again : ' + err.message);
            } else {
                throw err;
            }
        }
    });

    joinBtn.addEventListener('click', function (e) {
        let joinData = {
            eventOp: 'Join',
            reqNo: reqNo++,
            reqDate: nowDate(),
            userId: inputId.value,
            roomId,
            status: 'accept'
        };

        try {
            tLogBox('send(join)', joinData);
            signalSocketIo.emit('knowledgetalk', joinData);
        } catch (err) {
            if (err instanceof SyntaxError) {
                alert(' there was a syntaxError it and try again : ' + err.message);
            } else {
                throw err;
            }
        }
    });

    //
    exitBtn.addEventListener('click', function (e) {
        localStream.getTracks()[0].stop();
        localStream.getTracks()[1].stop();
        localStream = null;
        peerCon.close();
        peerCon = null;

        localVideo.srcObject = null;
        remoteVideo.srcObject = null;

        joinBtn.disabled = false;
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
            if (window.roomId) {
                window.roomId = null;
            }
        } catch (err) {
            if (err instanceof SyntaxError) {
                alert('there was a syntaxError it and try again:' + err.message);
            } else {
                throw err;
            }
        }
    });

    function onIceCandidateHandler(e) {
        if (!e.candidate) return;

        let iceData = {
            eventOp: 'Candidate',
            candidate: e.candidate,
            useMediaSvr: 'N',
            usage: 'cam',
            userId: inputId.value,
            roomId,
            reqNo: reqNo++,
            reqDate: nowDate()
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
            tTextbox('로그인 되었습니다');
        } else if(data.eventOp === 'Login' && data.code !== '200') {
            tTextbox('아이디 비밀번호를 다시 확인해주세요')
        }

        if (data.eventOp === 'Invite') {
            tTextbox(`${data.userId}님에게 전화가 왔습니다.`)
            roomId = data.roomId;
            joinBtn.disabled = false;

            configuration.push({
                urls: data.serverInfo['_j'].turn_url,
                credential: data.serverInfo['_j'].turn_credential,
                username: data.serverInfo['_j'].turn_username
            });
        }

        if (data.eventOp === 'Join') {
            joinBtn.disabled = true;
            exitBtn.disabled = false;

            navigator.mediaDevices
                .getUserMedia({
                    video: true,
                    audio: true
                })
                .then(stream => {
                    localStream = stream;
                    localVideo.srcObject = localStream;

                    roomId = data.roomId;
                    peerCon = new RTCPeerConnection(configuration);
                    peerCon.onicecandidate = onIceCandidateHandler;

                    peerCon.ontrack = onAddStreamHandler;
                    localStream.getTracks().forEach(function (track) {
                        peerCon.addTrack(track, localStream);
                    });


                    peerCon.createOffer().then(sdp => {
                        peerCon.setLocalDescription(new RTCSessionDescription(sdp));

                        let sdpData = {
                            eventOp: 'SDP',
                            sdp,
                            useMediaSvr: 'N',
                            usage: 'cam',
                            userId: inputId.value,
                            roomId,
                            reqNo: reqNo++,
                            reqDate: nowDate()
                        };

                        try {
                            tLogBox('send(offerdata)', sdpData);
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
                    })
                })
        }

        if (data.eventOp === 'SDP' && data.sdp && data.sdp.type === 'answer') {
            peerCon.setRemoteDescription(data.sdp);
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
                tLogBox('send(icedata)', iceData);
                signalSocketIo.emit('knowledgetalk', iceData);
            } catch (err) {
                if (err instanceof SyntaxError) {
                    alert(' there was a syntaxError it and try again : ' + err.message);
                } else {
                    throw err;
                }
            }
        }
        
        //
        if (data.signalOp === 'Presence' && data.action === 'end') {
            localStream.getTracks()[0].stop();
            localStream.getTracks()[1].stop();
            localStream = null;
            
            peerCon.close();
            peerCon = null;

            localVideo.srcObject = null;
            remoteVideo.srcObject = null;
            
            joinBtn.disabled = true;
            exitBtn.disabled = true;

            tTextbox('통화 종료 되었습니다.');
        }

        //내가 통화 종료시 이벤트
        if(data.eventOp === 'ExitRoom' && data.code ==='200'){
            joinBtn.disabled = true;
            tTextbox('통화 종료 되었습니다.');
        }

    })

})