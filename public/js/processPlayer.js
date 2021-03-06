const COOKIE_EXPIRY_MS = 36*60*60*1000; // 36 hours - the length of the training
const COOKIE_USER_PARAMETER = "username";
const COOKIE_QUIZ_PREFIX = "rhquiz";
const COOKIE_CORRECT_ANSWER = "correct";
const COOKIE_INCORRECT_ANSWER = "incorrect";
const COOKIE_SEPARATOR = "/";

// ******* Shared list of constants between server.js, processMainDisplay.js, processAdmin.js and processPlayer.js *******

const CMD_REGISTER="register";
const CMD_REGISTERED="registered";
const CMD_NEW_QUESTION = "newQuestion";
const CMD_QUESTION_TIMEOUT = "questionTimeout";
const CMD_END_OF_QUIZ = "quizEnd";
const CMD_PLAYER_DATA = 'playerData';
const CMD_DUPLICATE_PLAYER = "duplicatePlayer";
const CMD_START_QUIZ = "startQuiz";
const CMD_OPEN_REGISTRATION = "openRegistration";
const CMD_ADMIN_STATUS = "adminStatus";
const CMD_LOGIN = "login";
const CMD_LOGIN_OK = "loginOK";
const CMD_LOGIN_FAIL = "loginFail";
const CMD_GET_CATEGORIES = "getCategories";
const CMD_TIME_LEFT = 'timeLeft';
const CMD_PAUSE_QUIZ = 'pauseQuiz';
const CMD_RESTART_QUIZ = 'restartQuiz';

// ******* End of shared list of constants between server.js, processMainDisplay.js, processAdmin.js and processPlayer.js *******

var liftMusic;
var myPlayerName;
var currentQuestion;
var amRegistered;
var timeQuestionAsked;
var pauseStartTime,totalPauseTime;

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
    clearQuizCookies();
    setCookie(COOKIE_USER_PARAMETER,playerName);
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

socket.on(CMD_START_QUIZ,function(data)
{
  console.log("Quiz: "+data.msg+" about to start");
  closeGameWaitForm();
  openStatusForm();
  showStatus("'"+data.msg+"' quiz about to start");
});

socket.on(CMD_RESTART_QUIZ,function(data)
{
  console.log("Quiz: "+data.msg+" restarting");
  totalPauseTime+=(new Date()-pauseStartTime);
  closeGameWaitForm();
  closeStatusForm();
  openQuestionForm();
});

socket.on(CMD_PAUSE_QUIZ,function(data)
{
  console.log("Quiz paused");
  pauseStartTime=new Date();
  closeQuestionForm();
  openStatusForm();
  showStatus("Quiz paused");
});

socket.on(CMD_QUESTION_TIMEOUT,function(data)
{
  console.log("Question timed out");
  closeQuestionForm();
  openStatusForm();
  showStatus("Question timeout");
  updatePlayerStats();
});

socket.on(CMD_NEW_QUESTION,function(data)
{
  currentQuestion = data.msg;
  timeQuestionAsked=new Date();
  totalPauseTime=0;
  closeGameWaitForm(); // For late joiners
  closeStatusForm();
  console.log("New question received: "+currentQuestion);
  openQuestionForm();
});

socket.on(CMD_END_OF_QUIZ,function(data)
{
  console.log("End of Quiz");
  openStatusForm();
  showStatus("Quiz finished");
});

init = function()
{
    console.log("Init");
    openTermsForm();
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

function openGameWaitForm(statusMsg)
{
  liftMusic = document.getElementById("liftMusic");
  liftMusic.play();
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
    var responseTime=new Date()-timeQuestionAsked-totalPauseTime;
    var cookieName=COOKIE_QUIZ_PREFIX+currentQuestion.category+COOKIE_SEPARATOR+currentQuestion.index;
    setCookie(cookieName,(currentQuestion.answerIndex==selectedAnswerIndex?COOKIE_CORRECT_ANSWER:COOKIE_INCORRECT_ANSWER)+COOKIE_SEPARATOR+responseTime);
    socket.emit(CMD_PLAYER_DATA,getPlayerData());
    openStatusForm();
    showStatus("Answer submitted");
}

updatePlayerStats=function()
{
  var playerSummary=createPlayerSummary(getPlayerData());
  document.getElementById('playerScore').innerHTML=playerSummary.numCorrect;
  document.getElementById('playerResponseTime').innerHTML=formatTime(playerSummary.totalResponseTime);
}

getPlayerData=function()
{
  var allCookies = document.cookie.split(';');
  var answers=[];
  for (var i = 0 ; i < allCookies.length; i++) 
  {
    var c=allCookies[i].substring(1);// Cookie contents start at position 1 of the cookie string
    if (c.startsWith(COOKIE_QUIZ_PREFIX)) 
    {
      console.log("getPlayerData: Found quiz cookie:["+c+"]");
      var category=c.substring(COOKIE_QUIZ_PREFIX.length,c.indexOf(COOKIE_SEPARATOR));
      var index=c.substring(c.indexOf(COOKIE_SEPARATOR)+1,c.indexOf("="));
      var response=c.substring(c.indexOf("=")+1);
      var isCorrect=response.substring(0,response.indexOf(COOKIE_SEPARATOR))==COOKIE_CORRECT_ANSWER;
      var responseTime=parseInt(response.substring(response.indexOf(COOKIE_SEPARATOR)+1));
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
  newRow.style.paddingBottom="10px";
  newCell = newRow.insertCell();  
  newCell.style.width='70&';
  newCell.innerHTML = createSpan(currentQuestion.text,"playerText","black");

  for (var i=0;i<currentQuestion.answers.length;i++)
  {
      newRow=qTable.insertRow();
      newRow.style.paddingBottom="50px";
      newCell = newRow.insertCell();  
      newCell.innerHTML = createButton(currentQuestion.answers[i],"playerButton",i);
  };
}

function closeQuestionForm()
{
	document.getElementById("questionForm").style.display= "none";
}

// ********** END OF QUESTION FUNCTION **********

openTermsForm=function()
{
  document.getElementById("termsForm").style.display= "block";
}

closeTermsForm=function()
{
  document.getElementById("termsForm").style.display= "none";
}

processYesButton=function()
{
  closeTermsForm();
  openRegistrationForm();
}

processNoButton=function()
{
  closeTermsForm();
}

openStatusForm=function()
{
  document.getElementById("statusForm").style.display= "block";
}

closeStatusForm=function()
{
  document.getElementById("statusForm").style.display= "none";
}

showStatus=function(msg)
{
  document.getElementById("quizStatus").innerHTML= msg;
}

formatTime=function(aTime)
{
    var t = aTime/1000;
    var s=t%60;
    var m=Math.floor(t/60);
    return (m>0?m+"m ":"")+s.toFixed(1)+"s";
}

clearQuizCookies=function()
{
  var allCookies = document.cookie.split(';');
  for (var i = 0 ; i < allCookies.length; i++) 
  {
    var c=allCookies[i].substring(1);// Cookie contents start at position 1 of the cookie string
    if (c.startsWith(COOKIE_QUIZ_PREFIX)) 
    {
      var cookieName=c.substring(0,c.indexOf("="));
      console.log("clearQuizCookies: Removing:["+cookieName+"]");
      document.cookie = cookieName + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }
  }
}

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

function createPlayerSummary(playerData)
{
    var totalResponseTime=0;
    var numCorrect=0;
    var previousAnswers=[];

    for (var i=0;i<playerData.answers.length;i++)
    {
        if (!questionAlreadyAnswered(playerData.answers[i],previousAnswers))
        {
            if (playerData.answers[i].isCorrect)
            {
                totalResponseTime+=playerData.answers[i].responseTime;
                numCorrect++;
            }
            previousAnswers.push(playerData.answers[i]);
        }   
    }
    console.log("CPS: "+playerData.name+"/"+numCorrect+"/"+totalResponseTime);
    return new PlayerSummary(playerData.name,numCorrect,totalResponseTime);
}

function questionAlreadyAnswered(answer,previousAnswers)
{
    for (var j=0;j<previousAnswers.length;j++)
    {
        if (answer.category == previousAnswers[j].category && answer.index == previousAnswers[j].index)
           return true;
    }
    return false;
}

PlayerSummary=function(name,numCorrect,totalTime)
{
    this.name=name;
    this.numCorrect=numCorrect;
    this.totalResponseTime=totalTime;
}