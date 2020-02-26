const GAME_NAME="INTERACT";
const GAME_VERSION="0.1";

const COOKIE_EXPIRY_MS = 60*60*1000;
const COOKIE_USER_PARAMETER = "username";

// *** Shared between players.js & processPlayer.js
const PLAYER_INVALID_NAME_LENGTH = -1;
const PLAYER_INVALID_NAME = -2;
const PLAYER_DUPLICATE=-3;
// ***

// ******* Shared list of constants between server.js, processMainDisplay.js and processPlayer.js *******

const CMD_REGISTER="register";
const CMD_REGISTERED="registered";
const CMD_REGISTRATION_ERROR="registrationError";
const CMD_PLAYER_LIST="playerList";
const CMD_NEW_QUESTION = "newQuestion";
const CMD_PLAYER_ANSWER = "playerAnswer";
const CMD_QUESTION_TIMEOUT = "questionTimeout";
const CMD_QUIZ_READY = "quizReady";

// ******* End of shared list of constants between server.js, processMainDisplay.js and processPlayer.js *******

var liftMusic;
var myPlayerName;

socket = io.connect();

socket.on(CMD_REGISTERED,function(data)
{
  document.getElementById("gameTitle").innerHTML= GAME_NAME+" "+GAME_VERSION;
  closeRegistrationForm();
  openGameWaitForm(myPlayerName);
});

socket.on(CMD_QUIZ_READY,function(data)
{
  closeGameWaitForm();
});

socket.on(CMD_QUESTION_TIMEOUT,function(data)
{
  console.log("Question timed out")
  closeQuestionForm();
});

socket.on(CMD_REGISTRATION_ERROR,function(data)
{
  var regError = data.msg;
  console.log("Error in registration: "+regError);
  showRegistrationError(regError);
});

socket.on(CMD_NEW_QUESTION,function(data)
{
  var question = data.msg;
  closeGameWaitForm(); // For late joiners
  console.log("New question received: "+question);
  openQuestionForm(question);
});

init = function()
{
    console.log("Init");
    openRegistrationForm();
};

// ********** START OF REGISTRATION FUNCTIONS **********

registerPlayer = function(playerName)
{
  if (playerName != "" && playerName != null) 
  {
    setCookie(COOKIE_USER_PARAMETER,playerName);
    myPlayerName=playerName;
    console.log("Registering player: "+playerName);
    socket.emit(CMD_REGISTER,playerName);
  }
};

function openRegistrationForm()
{
  var storedPlayerName=getCookie(COOKIE_USER_PARAMETER);
 
  document.getElementById("regName").value= storedPlayerName;
  document.getElementById("registrationForm").style.display= "block";
}

function processRegistrationForm()
{
  var nameInput=document.getElementById("regName").value;
	registerPlayer(nameInput);
}

function closeRegistrationForm()
{
	document.getElementById("registrationForm").style.display= "none";
}

function showRegistrationError(error)
{
	if (error == PLAYER_DUPLICATE)
		document.getElementById("regStatus").innerHTML="Player name in use";
	else if (error == PLAYER_INVALID_NAME_LENGTH)
    document.getElementById("regStatus").innerHTML=("Name must be between 3 and 8 chars");
  else if (error == PLAYER_INVALID_NAME)
    document.getElementById("regStatus").innerHTML=("Name must be alphanumeric");
}

// ********** END OF REGISTRATION FORM FUNCTIONS **********

// ********** START OF GAME WAIT FORM FUNCTIONS **********

function openGameWaitForm(pName)
{
  liftMusic = document.getElementById("liftMusic");
  liftMusic.play();
  document.getElementById('gameWaitStatus').innerHTML=pName+" registered for Game";
  document.getElementById('gameWaitForm').style.display= "block";
}

function closeGameWaitForm()
{
  liftMusic.pause();
	document.getElementById("gameWaitForm").style.display= "none";
}

// ********** END OF GAME WAIT FORM FUNCTIONS **********

// ********** START OF QUESTION FUNCTION ********** 

answer = function(selectedAnswerIndex)
{
    closeQuestionForm();
    socket.emit(CMD_PLAYER_ANSWER,myPlayerName,selectedAnswerIndex);
}

function openQuestionForm(question)
{
  console.log("a"+question.answers);
  showQuestion(question);
  document.getElementById("questionForm").style.display= "block";
}

function showQuestion(question)
{
  var qTable = document.getElementById('questionTable');
  var newRow,newCell;
  qTable.innerHTML="";
  newRow=qTable.insertRow();
  newCell = newRow.insertCell();  
  newCell.innerHTML = createSpan(question.text,"veryLargeText","red");

  for (var i=0;i<question.answers.length;i++)
  {
      newRow=qTable.insertRow();
      newCell = newRow.insertCell();  
      newCell.innerHTML = createButton(question.answers[i],"veryLargeButton",i);
  };
}

function closeQuestionForm()
{
	document.getElementById("questionForm").style.display= "none";
}

// ********** END OF QUESTION FUNCTION **********

function setCookie(name,value) 
{
  var d = new Date();
  d.setTime(d.getTime() + COOKIE_EXPIRY_MS);
  var expires = "expires="+d.toUTCString();
  document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

function getCookie(name) 
{
  var name = name + "=";
  var ca = document.cookie.split(';');
  for(var i = 0; i < ca.length; i++) 
  {
    var c = ca[i];
    while (c.charAt(0) == ' ') 
    {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) 
    {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

function createSpan(text,cssClass,colour)
{
    return "<span class='"+cssClass+"' style='color:"+colour+"'>"+text+"</span>";
}

function createButton(text,cssClass,onClickIndex)
{
    return "<button class='"+cssClass+"' onclick='answer("+onClickIndex+")'>"+text+"</button>";
}