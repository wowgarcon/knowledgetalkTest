const inputId = document.getElementById('inputId');
const inputPw = document.getElementById('inputPw');
const loginBtn = document.getElementById('loginBtn');
 

loginBtn.addEventListener('click', function (e) {
    let loginData = {
        eventOp: 'Login',
        reqNo: reqNumber(),
        userId: inputId.value,
        userPw: passwordSHA256(inputPw.value),
        reqDate: nowDate(),
        deviceType: 'pc'
    };
 
    try {

        tLogBox('send',loginData)
        signalSocketIo.emit('knowledgetalk', loginData);
    } catch (err) {
        if (err instanceof SyntaxError) {
            tLogBox(' there was a syntaxError it and try again : ' + err.message);
        } else {
            throw err;
        }
    }
});
 
signalSocketIo.on('knowledgetalk', function (data) {
    tLogBox('receive', data);
    if (!data.eventOp && !data.signalOp) { 
        tLogBox('error', 'eventOp undefined');
    }

    if(data.code === '200'){
        tTextbox('로그인 되었습니다.')
        loginBtn.disabled = true
    } else if(data.code === '111'){
        tTextbox('현재 로그인 되어 있습니다.')
        loginBtn.disabled = true
    } else if(data.code !== 200) {
        tTextbox('아이디, 비밀번호가 맞지 않습니다')
        loginBtn.disabled = false
    }
});