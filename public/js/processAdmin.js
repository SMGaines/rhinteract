const COOKIE_PASSWORD_PARAMETER = "password";
const COOKIE_EXPIRY_MS = 36*60*60*1000; // 36 hours - the length of the training

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
const CMD_LOGIN = "login";
const CMD_LOGIN_OK = "loginOK";
const CMD_LOGIN_FAIL = "loginFail";
const CMD_GET_CATEGORIES = "getCategories";

// ******* End of shared list of constants between server.js, processMainDisplay.js and processPlayer.js *******

var players = [];
var myPassword;

init=function()
{
    openPasswordForm();
}

socket = io.connect();

socket.on(CMD_REGISTERED,function(data)
{
    var playerName=data.msg;
    if (!players.indexOf(playerName) > -1)
        players.push(playerName);
    playerDisplay();
});

socket.on(CMD_OPEN_REGISTRATION,function(data)
{
    socket.emit(CMD_GET_CATEGORIES,new AdminData(myPassword,""));
    showAdminStatus(data.msg);
});

socket.on(CMD_GET_CATEGORIES,function(data)
{
    buildQuizList(data.msg);
});

socket.on(CMD_ADMIN_STATUS,function(data)
{
    console.log("CMD_ADMIN_STATUS: "+data.msg);
    showAdminStatus(data.msg);
});

socket.on(CMD_LOGIN_FAIL,function(data)
{
    console.log("CMD_LOGIN_FAIL: "+data.msg);
    openPasswordForm();
});

socket.on(CMD_LOGIN_OK,function(data)
{
    console.log("CMD_LOGIN_OK: "+data.msg);
    closePasswordForm();
});

function startQuiz(quizName)
{
    socket.emit(CMD_START_QUIZ,new AdminData(myPassword,quizName));
}

function openRegistration()
{
    console.log("Opening registration");
    socket.emit(CMD_OPEN_REGISTRATION,new AdminData(myPassword,""));
}

function buildQuizList(categories)
{
  var regTable = document.getElementById('quizTable');
  var newRow,newCell;
  regTable.innerHTML="";

  for (var i=0;i<categories.length;i++)
  {
      newRow=regTable.insertRow();
      newCell = newRow.insertCell();  
      newCell.innerHTML = createQuizButton(categories[i]);
  };
}

function showAdminStatus(msg)
{
  document.getElementById('quizStatus').innerHTML=createSpan(msg);
}

function createQuizButton(text)
{
  return "<button class='adminButton' type='button' onclick='startQuiz(&quot;"+text+"&quot;)'>Start Quiz: "+text+"</button>";
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

function openPasswordForm()
{
  var password=getCookie(COOKIE_PASSWORD_PARAMETER);
 
  document.getElementById("password").value = password;
  document.getElementById("loginForm").style.display = "block";
}

function processLoginForm()
{
  console.log("Logging in");
  myPassword=document.getElementById("password").value;
  setCookie(COOKIE_PASSWORD_PARAMETER,myPassword);
  socket.emit(CMD_LOGIN,myPassword);
}

function closePasswordForm()
{
	document.getElementById("loginForm").style.display= "none";
}

AdminData=function(aPassword,arg0,arg1)
{
    this.password=aPassword;
    this.arg0=arg0;
    this.arg1=arg1;
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

function setCookie(name,value) 
{
  var d = new Date();
  d.setTime(d.getTime() + COOKIE_EXPIRY_MS);
  var expires = "expires="+d.toUTCString();
  document.cookie = name + "=" + value + ";" + expires + ";path=/";
}