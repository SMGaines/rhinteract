const GAME_TITLE = "RH INTERACT v0.1";
const NONE = -1;

// ******* Shared list of constants between server.js, processMainDisplay.js and processPlayer.js *******

const CMD_REGISTER="register";
const CMD_REGISTERED="registered";
const CMD_NEW_QUESTION = "newQuestion";
const CMD_QUESTION_TIMEOUT = "questionTimeout";
const CMD_QUIZ_READY = "quizReady";
const CMD_END_OF_QUIZ = "quizEnd";
const CMD_PLAYER_SUMMARY = 'playerSummary';
const CMD_DUPLICATE_PLAYER = "duplicatePlayer";

// ******* End of shared list of constants between server.js, processMainDisplay.js and processPlayer.js *******

var players = [];
var currentQuestion;
var currentAnswers=[];

init = function()
{
    console.log("ProcessMainDisplay: Initialising");
};

socket = io.connect();

socket.on(CMD_PLAYER_SUMMARY,function(data)
{
    playerSummary=data.msg;
    playerData.push(extractData(playerSummary));
    var sortedPlayerData=sortScores(playerData);
    displayLeaderboard(sortedPlayerData);
});

socket.on(CMD_NEW_QUESTION,function(data)
{
    currentQuestion=data.msg;
    currentAnswers=[];
    displayCurrentQuestion(currentQuestion,NONE);
});

socket.on(CMD_QUIZ_READY,function(data)
{
    console.log("Quiz ready");
});

socket.on(CMD_QUESTION_TIMEOUT,function(data)
{
  displayCurrentQuestion(currentQuestion);
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
    
    var numShown=0;
    for (var i=0;i<playerData.length;i++)
    {
        if (playerData[i].numCorrect > 0)
        {
            numShown++;
            if (numShown > 5)
                break;
            newRow=tableLeaderboard.insertRow();
            newCell = newRow.insertCell();  
            newCell.innerHTML = createSpan(playerData[i].name,"mainText","black");
            newCell = newRow.insertCell();  
            newCell.innerHTML = createSpan(playerData[i].numCorrect,"mainText","black");
            newCell = newRow.insertCell();  
            newCell.innerHTML = createSpan(formatTime(playerData[i].totalResponseTime),"mainText","black");
        }
  };
}

formatTime=function(aTime)
{
    var t = aTime/1000;
    return t.toFixed(1)+"s";
}

displayCurrentQuestion=function(question)
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
      newCell.innerHTML = createSpan(question.answers[i],"mainText",i==question.answerIndex?"red":"black");
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
      newCell.innerHTML = createSpan(formatTime(currentQAnswers[i].responseTime),"mainText","black");
  };
}

function createSpan(text,cssClass,colour)
{
    return "<span class='"+cssClass+"' style='color:"+colour+"'>"+text+"</span>";
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

function extractData(playerSummary)
{
    var totalResponseTime=0;
    var numCorrect=0;
    for (var i=0;i<playerSummary.length;i++)
    {
        if (playerSummary[i].isCorrect)
        {
            totalResponseTime+=playerSummary[i].responseTime;
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