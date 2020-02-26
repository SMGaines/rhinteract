const CMD_REGISTER="register";
const CMD_REGISTERED="registered";
const CMD_REGISTRATION_ERROR="registrationError";
const CMD_GET_GAME_ADDRESS="getGameAddress";
const CMD_GAME_ADDRESS="gameAddress";
const CMD_PLAYER_LIST="playerList";

var players = [];

socket = io.connect();

socket.on(CMD_PLAYER_LIST,function(data)
{
    players=data.msg;
    playerDisplay();
});

socket.on(CMD_GAME_ADDRESS,function(data)
{
    var serverIP=data.msg;
    document.getElementById('gameConnectDetails').innerHTML=createSpan("Connect to http://"+serverIP+":8081/player");
});

init = function()
{
    console.log("Init");
    socket.emit(CMD_GET_GAME_ADDRESS);
};

var playerDisplay = function()
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
        newCell.innerHTML = createSpan(players[i].name);
    };
}

function createSpan(text)
{
    return "<span class='regDisplayText' style='color:white'>"+text+"</span>";
}