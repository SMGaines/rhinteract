const GAME_TITLE = "RH INTERACT v0.1";
const NONE = -1;

// ******* Shared list of constants between server.js, processMainDisplay.js and processPlayer.js *******

const CMD_REGISTER="register";
const CMD_REGISTERED="registered";
const CMD_REGISTRATION_ERROR="registrationError";
const CMD_PLAYER_LIST="playerList";
const CMD_NEW_QUESTION = "newQuestion";
const CMD_PLAYER_ANSWER = "playerAnswer";
const CMD_QUESTION_TIMEOUT = "questionTimeout";
const CMD_QUIZ_READY = "quizReady";
const CMD_PLAYER_UPDATE = 'playerUpdate';

// ******* End of shared list of constants between server.js, processMainDisplay.js and processPlayer.js *******

var players = [];
var currentQuestion;
var currentAnswers=[];

init = function()
{
    console.log("ProcessMainDisplay: Initialising");
};

socket = io.connect();

socket.on(CMD_PLAYER_LIST,function(data)
{
    players=data.msg;
    var playerData=getPlayerData(players);
    var sortedPlayerData=sortScores(playerData);
    displayLeaderboard(sortedPlayerData);
});

socket.on(CMD_NEW_QUESTION,function(data)
{
    currentQuestion=data.msg;
    currentAnswers=[];
    displayCurrentQuestion(currentQuestion,NONE);
});

socket.on(CMD_PLAYER_UPDATE,function(data)
{
    var update=data.msg;
    currentAnswers.push(update);
    displayCurrentAnswers(currentAnswers);
});

socket.on(CMD_QUIZ_READY,function(data)
{
    console.log("Quiz ready");
});

socket.on(CMD_QUESTION_TIMEOUT,function(data)
{
  var correctAnswerindex=data.msg;
  displayCurrentQuestion(currentQuestion,correctAnswerindex);
});

displayLeaderboard=function(playerData)
{
    console.log("displayLeaderboard: "+playerData.length);
    var tableLeaderboard = document.getElementById('tableLeaderboard');
    var newRow,newCell;
    tableLeaderboard.innerHTML="";
    newRow=tableLeaderboard.insertRow();
    newCell = newRow.insertCell();  
    newCell.innerHTML = createSpan("Name","mainText","black");
    newCell = newRow.insertCell();  
    newCell.innerHTML = createSpan("Correct","mainText","black");
    newCell = newRow.insertCell();  
    newCell.innerHTML = createSpan("Time","mainText","black");
    
  for (var i=0;i<Math.min(5,playerData.length);i++)
  {
      newRow=tableLeaderboard.insertRow();
      newCell = newRow.insertCell();  
      newCell.innerHTML = createSpan(playerData[i].name,"mainText","black");
      newCell = newRow.insertCell();  
      newCell.innerHTML = createSpan(playerData[i].numCorrect,"mainText","black");
      newCell = newRow.insertCell();  
      newCell.innerHTML = createSpan(playerData[i].totalResponseTime,"mainText","black");
  };
}

displayCurrentQuestion=function(question,correctAnswerindex)
{
    var tableCurrentQuestion = document.getElementById('tableCurrentQuestion');
    var newRow,newCell;
    tableCurrentQuestion.innerHTML="";
    newRow=tableCurrentQuestion.insertRow();
    newCell = newRow.insertCell();  
    newCell.innerHTML = createSpan(question.text,"mainText","black");
    
  for (var i=0;i<question.answers.length;i++)
  {
      newRow=tableCurrentQuestion.insertRow();
      newCell = newRow.insertCell();  
      newCell.innerHTML = createSpan(question.answers[i],"mainText",i==correctAnswerindex?"red":"black");
  };
}

displayCurrentAnswers=function(currentQAnswers)
{
    var tableCurrentAnswers = document.getElementById('tableCurrentAnswers');
    var newRow,newCell;
    tableCurrentAnswers.innerHTML="";
    newRow=tableCurrentAnswers.insertRow();
    newCell = newRow.insertCell();  
    newCell.innerHTML = createSpan("Name","mainText","black");
    newCell = newRow.insertCell();  
    newCell.innerHTML = createSpan("Time","mainText","black");
    
  for (var i=0;i<Math.min(5,currentQAnswers.length);i++)
  {
      newRow=tableCurrentAnswers.insertRow();
      newCell = newRow.insertCell();  
      newCell.innerHTML = createSpan(currentQAnswers[i].playerName,"mainText","black");
      newCell = newRow.insertCell();  
      newCell.innerHTML = createSpan(currentQAnswers[i].responseTime,"mainText","black");
  };
}

function createSpan(text,cssClass,colour)
{
    return "<span class='"+cssClass+"' style='color:"+colour+"'>"+text+"</span>";
}

// Extract name,num correct answers and total response time from the player list
function getPlayerData(players)
{
    var playerData=[];
    players.forEach(function(player)
    {
        playerData.push(extractData(player));
    });
    return playerData;
}

// Sort based on correct answers, then response time
function sortScores(playerData)
{
    console.log("sortScores: "+playerData.length);
    var sortedPlayerData=[];
    for (var j=0;j<playerData.length;j++)
    {
        var bestScore=-1;
        var bestIndex=-1;
        for (var i=0;i<playerData.length;i++)
        {
            var score=10000*(1+playerData[i].numCorrect)-playerData[i].totalResponseTime/100;
            if (!playerData[i].sorted && score > bestScore)
            {
                bestScore=score;
                bestIndex=i;
            }
        }
        sortedPlayerData.push(playerData[bestIndex]);
        playerData[bestIndex].sorted=true;
    }
    return sortedPlayerData;
}

function extractData(player)
{
    var totalResponseTime=0;
    var numCorrect=0;
    for (var i=0;i<player.answers.length;i++)
    {
        if (player.answers[i].isCorrect)
        {
            totalResponseTime+=player.answers[i].responseTime;
            numCorrect++;
        }   
    }
    return new PlayerData(player.name,numCorrect,totalResponseTime);
}

PlayerData=function(name,numCorrect,totalTime)
{
    this.name=name;
    this.numCorrect=numCorrect;
    this.totalResponseTime=totalTime;
    this.sorted=false;
}

PlayerUpdate=function(playerName,responseTime,answerIndex)
{
    this.playerName=playerName;
    this.responseTime=responseTime;
    this.answerIndex=answerIndex;
}