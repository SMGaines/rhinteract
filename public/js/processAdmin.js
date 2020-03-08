// ******* Shared list of constants between server.js, processMainDisplay.js and processPlayer.js *******

const CMD_REGISTER="register";
const CMD_REGISTERED="registered";
const CMD_NEW_QUESTION = "newQuestion";
const CMD_QUESTION_TIMEOUT = "questionTimeout";
const CMD_QUIZ_READY = "quizReady";
const CMD_END_OF_QUIZ = "quizEnd";
const CMD_PLAYER_DATA = 'playerData';
const CMD_DUPLICATE_PLAYER = "duplicatePlayer";
const CMD_START_QUIZ = "startQuiz";
const CMD_OPEN_REGISTRATION = "openRegistration";
const CMD_ADMIN_STATUS = "adminStatus";

// ******* End of shared list of constants between server.js, processMainDisplay.js and processPlayer.js *******

var players = [];

socket = io.connect();

socket.on(CMD_REGISTERED,function(data)
{
    var playerName=data.msg;
    if (!players.indexOf(playerName) > -1)
        players.push(playerName);
    playerDisplay();
});

socket.on(CMD_ADMIN_STATUS,function(data)
{
    console.log("CMD_ADMIN_STATUS: "+data.msg);
    document.getElementById('quizStatus').innerHTML=createSpan(data.msg);
});

init = function()
{
    console.log("Init");
};

function startQuiz(quizName)
{
    socket.emit(CMD_START_QUIZ,quizName);
}

function openRegistration()
{
    console.log("Opening registration");
    socket.emit(CMD_OPEN_REGISTRATION);
}

function playerDisplay()
{
    var regTable = document.getElementById('registrationTable');
    var newRow,newCell;
    regTable.innerHTML="";

    for (var i=0;i<players.length;i++)
    {
        if (i%3==0)
            newRow=regTable.insertRow();
        newCell = newRow.insertCell();  
        newCell.style.width="40%";   
        newCell.innerHTML = createSpan(players[i]);
    };
}

function createSpan(text)
{
    return "<span class='mainText'>"+text+"</span>";
}