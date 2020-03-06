const GAME_TITLE = "RH INTERACT v0.1";
const NONE = -1;

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

var currentQuestion;
var currentAnswers=[];
var playerSummaries=[];

init = function()
{
    console.log("ProcessMainDisplay: Initialising");
};

socket = io.connect();

socket.on(CMD_PLAYER_DATA,function(data)
{
    playerData=data.msg;
    updatePlayerSummaries(playerData);
    updateCurrentAnswers(playerData);
    displayCurrentAnswers();
});

socket.on(CMD_NEW_QUESTION,function(data)
{
    currentQuestion=data.msg;
    currentAnswers=[];
    displayCurrentQuestion(currentQuestion,false);
});

socket.on(CMD_QUIZ_READY,function(data)
{
    console.log("Quiz ready");
});

socket.on(CMD_QUESTION_TIMEOUT,function(data)
{
  displayCurrentQuestion(currentQuestion,true);
  displayLeaderboard();
});

displayLeaderboard=function()
{
    console.log("displayLeaderboard: "+playerSummaries.length);
    var tableLeaderboard = document.getElementById('tableLeaderboard');
    var newRow,newCell;
    tableLeaderboard.innerHTML="";
    newRow=tableLeaderboard.insertRow();
    newCell = newRow.insertCell();  
    newCell.width = '10%';
    newCell.innerHTML = createLeaderBoardSpan("Position");
    newCell = newRow.insertCell();  
    newCell.width = '35%';
    newCell.innerHTML = createLeaderBoardSpan("Name");
    newCell = newRow.insertCell();  
    newCell.width = '20%';
    newCell.innerHTML = createLeaderBoardSpan("Correct");
    newCell = newRow.insertCell();  
    newCell.width = '25%';
    newCell.innerHTML = createLeaderBoardSpan("Time");
    
    var numShown=0;
    for (var i=0;i<playerSummaries.length;i++)
    {
        if (playerSummaries[i].numCorrect > 0)
        {
            numShown++;
            if (numShown > 5)
                break;
            newRow=tableLeaderboard.insertRow();
            newCell = newRow.insertCell();  
            newCell.innerHTML = createLeaderBoardSpan((i+1));
            newCell = newRow.insertCell();  
            newCell.innerHTML = createLeaderBoardSpan(playerSummaries[i].name);
            newCell = newRow.insertCell();  
            newCell.innerHTML = createLeaderBoardSpan(playerSummaries[i].numCorrect);
            newCell = newRow.insertCell();  
            newCell.innerHTML = createLeaderBoardSpan(formatTime(playerSummaries[i].totalResponseTime));
        }
  };
}

formatTime=function(aTime)
{
    var t = aTime/1000;
    return t.toFixed(1)+"s";
}

displayCurrentQuestion=function(question,showAnswer)
{
    var tableCurrentQuestion = document.getElementById('tableCurrentQuestion');
    var newRow,newCell;
    tableCurrentQuestion.innerHTML="";
    newRow=tableCurrentQuestion.insertRow();
    newCell = newRow.insertCell();  
    newCell.colSpan = 2;
    newCell.innerHTML = createSpan(question.text,"mainText","black");
    
  for (var i=0;i<question.answers.length;i++)
  {
      newRow=tableCurrentQuestion.insertRow();
      newCell = newRow.insertCell();  
      newCell.innerHTML = insertBullet();
      newCell = newRow.insertCell();  
      newCell.innerHTML = createSpan(question.answers[i],"mainText",showAnswer&&i==question.answerIndex?"red":"black");
  };
}

displayCurrentAnswers=function()
{
    var tableCurrentAnswers = document.getElementById('tableCurrentAnswers');
    var newRow,newCell;
    tableCurrentAnswers.innerHTML="";
    newRow=tableCurrentAnswers.insertRow();
    newCell = newRow.insertCell();  
    newCell.width = '30%';
    newCell.innerHTML = createSpan("Name","mainText","black");
    newCell = newRow.insertCell();  
    newCell.width = '10%';
    newCell.innerHTML = createSpan("Time","mainText","black");
    
    for (var i=0;i<Math.min(5,currentAnswers.length);i++)
    {
        newRow=tableCurrentAnswers.insertRow();
        newCell = newRow.insertCell();  
        newCell.innerHTML = createSpan(currentAnswers[i].name,"mainText","black");
        newCell = newRow.insertCell();  
        newCell.innerHTML = createSpan(formatTime(currentAnswers[i].responseTime),"mainText","black");
    };
}

function createLeaderBoardSpan(text)
{
    return createSpan(text,"leaderBoardText","black");
}

function createSpan(text,cssClass,colour)
{
    return "<span class='"+cssClass+"' style='color:"+colour+"'>"+text+"</span>";
}

function insertBullet()
{
    return "<img style='max-width: 20px; max-height: 20px' src='../images/redBullet.png'/>";
}

function updatePlayerSummaries(playerData)
{
   playerSummaries=removePlayerSummary(playerData.name);
   playerSummaries.push(createPlayerSummary(playerData));
   sortPlayerSummaries();
}

function removePlayerSummary(playerName)
{
    return playerSummaries.filter(function (e) 
    {
        return e.name !=playerName;
    });
}

function createPlayerSummary(playerData)
{
    var totalResponseTime=0;
    var numCorrect=0;
    var previousAnswers=[];

    for (var i=0;i<playerData.answers.length;i++)
    {
        if (playerData.answers[i].isCorrect && !questionAlreadyAnswered(playerData.answers[i],previousAnswers))
        {
            totalResponseTime+=playerData.answers[i].responseTime;
            numCorrect++;
            previousAnswers.push(playerData.answers[i]);
        }   
    }
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

// Sort based on correct answers, then response time
function sortPlayerSummaries()
{
    console.log("sortScores: "+playerSummaries.length);
    playerSummaries.sort(function (a, b) 
    {   
        return b.numCorrect - a.numCorrect || a.totalResponseTime - b.totalResponseTime;
    });
}

PlayerSummary=function(name,numCorrect,totalTime)
{
    this.name=name;
    this.numCorrect=numCorrect;
    this.totalResponseTime=totalTime;
}

function updateCurrentAnswers(playerData)
{
    if (!playerHasAlreadyAnsweredCurrentQuestion(playerData.name))
    {
        console.log("playerHasntAnsweredCurrentQuestion: "+playerData.name);
        var answer = getAnswerToCurrentQuestion(playerData);
        if (answer != null)
            currentAnswers.push(answer);
    }
}

function playerHasAlreadyAnsweredCurrentQuestion(playerName)
{
   for (var i=0;i<currentAnswers.length;i++)
    {
        if (currentAnswers[i].name == playerName && currentAnswers[i].category==currentQuestion.category && currentAnswers[i].index==currentQuestion.index)
            return true;
    }
    return false; 
}

function getAnswerToCurrentQuestion(playerData)
{
    for (var i=0;i<playerData.answers.length;i++)
    {
        if (playerData.answers[i].category==currentQuestion.category && playerData.answers[i].index==currentQuestion.index)
            return new PlayerAnswer(playerData.name,currentQuestion.category,currentQuestion.index,playerData.answers[i].isCorrect,playerData.answers[i].responseTime);
    }
    return null;
}

PlayerAnswer=function(name,category,index,isCorrect,responseTime)
{
    this.name=name;
    this.category=category;
    this.index=index;
    this.isCorrect=isCorrect;
    this.responseTime=responseTime;
}