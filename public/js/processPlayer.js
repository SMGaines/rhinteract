const GAME_NAME="INTERACT";
const GAME_VERSION="0.1";

const COOKIE_EXPIRY_MS = 60*60*1000;
const COOKIE_USER_PARAMETER = "username";
const COOKIE_CORRECT_PREFIX="rhquizcorrect";
const COOKIE_INCORRECT_PREFIX="rhquizincorrect";
const COOKIE_CORRECT_ANSWER = "correct";
const COOKIE_INCORRECT_ANSWER = "incorrect";
const COOKIE_COOKIE_SEPARATOR = "/";

// ******* Shared list of constants between server.js, processMainDisplay.js and processPlayer.js *******

const CMD_REGISTER="register";
const CMD_REGISTERED="registered";
const CMD_NEW_QUESTION = "newQuestion";
const CMD_QUESTION_TIMEOUT = "questionTimeout";
const CMD_QUIZ_READY = "quizReady";
const CMD_END_OF_QUIZ = "quizEnd";
const CMD_PLAYER_DATA = 'playerData';
const CMD_DUPLICATE_PLAYER = "duplicatePlayer";

// ******* End of shared list of constants between server.js, processMainDisplay.js and processPlayer.js *******

var liftMusic;
var myPlayerName;
var currentQuestion;
var amRegistered;

socket = io.connect();

socket.on(CMD_REGISTERED,function(data)
{
  var playerName=data.msg;
  if (playerName == myPlayerName)
  {
    if (amRegistered)
    {
      socket.emit(CMD_DUPLICATE_PLAYER,playerName);
      return;
    }
    amRegistered=true;
    setCookie(COOKIE_USER_PARAMETER,playerName);
    document.getElementById("gameTitle").innerHTML= GAME_NAME+" "+GAME_VERSION;
    closeRegistrationForm();
    openGameWaitForm(myPlayerName);
  }
});

socket.on(CMD_DUPLICATE_PLAYER,function(data)
{
  var playerName=data.msg;
  if (playerName == myPlayerName)
  {
    if (!amRegistered)
      document.getElementById("regStatus").innerHTML= "Name already in use";
  }
});

socket.on(CMD_QUIZ_READY,function(data)
{
  closeGameWaitForm();
});

socket.on(CMD_QUESTION_TIMEOUT,function(data)
{
  console.log("Question timed out");
  closeQuestionForm();
});

socket.on(CMD_NEW_QUESTION,function(data)
{
  currentQuestion = data.msg;
  closeGameWaitForm(); // For late joiners
  console.log("New question received: "+currentQuestion);
  openQuestionForm();
});

socket.on(CMD_END_OF_QUIZ,function(data)
{
  console.log("End of Quiz");
});

init = function()
{
    console.log("Init");
    openRegistrationForm();
};

// ********** START OF REGISTRATION FUNCTIONS **********

function openRegistrationForm()
{
  var storedPlayerName=getCookie(COOKIE_USER_PARAMETER);
 
  document.getElementById("regName").value= storedPlayerName;
  document.getElementById("registrationForm").style.display= "block";
}

function processRegistrationForm()
{
  console.log("Registering player: "+myPlayerName);
	myPlayerName=document.getElementById("regName").value;
  socket.emit(CMD_REGISTER,myPlayerName);
}

function closeRegistrationForm()
{
	document.getElementById("registrationForm").style.display= "none";
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
    var responseTime=new Date()-currentQuestion.getTimeAsked();
    var cookieName=COOKIE_QUIZ_PREFIX+currentQuestion.category+COOKIE_SEPARATOR+currentQuestion.index;
    setCookie(cookieName,currentQuestion.answerIndex==selectedAnswerIndex?COOKIE_CORRECT_ANSWER:COOKIE_INCORRECT_ANSWER+COOKIE_SEPARATOR+responseTime);
    socket.emit(CMD_PLAYER_DATA,getPlayerData());
}

getPlayerData=function()
{
  var allCookies = document.cookie.split(';');
  var answers=[];
  for (var i = 0 ; i <= allCookies.length; i++) 
  {
    if (allCookies[i].startsWith(COOKIE_QUIZ_PREFIX))
    {
      var category=allCookies[i].substring(COOKIE_QUIZ_PREFIX.length,allCookies[i].indexOf(COOKIE_SEPARATOR));
      var index=allCookies[i].substring(allCookies[i].indexOf(COOKIE_SEPARATOR)+1,allCookies[i].indexOf("="));
      var response=allCookies[i].substring(allCookies[i].indexOf("=")+1);
      var isCorrect=response.substring(0,response.indexOf(COOKIE_SEPARATOR))==COOKIE_CORRECT_ANSWER;
      var responseTime=response.substring(response.indexOf(COOKIE_SEPARATOR));
      answers.push(new AnswerEntry(category,index,isCorrect,responseTime));
    }
  }
  return new PlayerData(myPlayerName,answers);
}

function PlayerData(name,answers)
{
  this.name=name;
  this.answers=answers;
}

function AnswerEntry(category,index,isCorrect,responseTime)
{
  this.category=category;
  this.index=index;
  this.isCorrect=isCorrect;
  this.responseTime=responseTime;
}

function openQuestionForm()
{
  showQuestion();
  document.getElementById("questionForm").style.display= "block";
}

function showQuestion()
{
  var qTable = document.getElementById('questionTable');
  var newRow,newCell;
  qTable.innerHTML="";
  newRow=qTable.insertRow();
  newCell = newRow.insertCell();  
  newCell.innerHTML = createSpan(currentQuestion.text,"veryLargeText","red");

  for (var i=0;i<currentQuestion.answers.length;i++)
  {
      newRow=qTable.insertRow();
      newCell = newRow.insertCell();  
      newCell.innerHTML = createButton(currentQuestion.answers[i],"veryLargeButton",i);
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