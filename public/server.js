const SIMULATION = true;
const SIMUL_INTERVAL=5000;

const STATE_INITIALISING = 0;
const STATE_REGISTRATION=1;
const STATE_WAITING_FOR_QUESTION=2;
const STATE_QUESTION_IN_PROGRESS=3;
const STATE_GAME_OVER=4;

const QUESTION_TIME = 10000; // How long for people to answer a question

const NUM_BOTS = 8;
const BOT_PREFIX="BOT";
const BOT_INTERVAL = 100;

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

var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);

var question=require("./js/question.js");
var players=require("./js/players.js");

app.use('/css',express.static(__dirname + '/css'));
app.use('/js',express.static(__dirname + '/js'));
app.use('/images',express.static(__dirname + '/images'));
app.use('/audio',express.static(__dirname + '/audio'));

app.get('/player',function(req,res)
{
    res.sendFile(__dirname+'/playerDisplay.html');
});

app.get('/registrationComplete',function(req,res)
{
    closeRegistration();
    res.sendFile(__dirname+'/mainDisplay.html');
});

app.get('/adminResponse',function(req,res)
{
    state=STATE_REGISTRATION;
    registerBots();
    res.sendFile(__dirname+'/registration.html');
});

app.get('/question',function(req,res)
{
    if (state!=STATE_WAITING_FOR_QUESTION)
        res.sendFile(__dirname+'/questionError.html');
     else
     {
        var q = parseURL(req.query);
        processQuestion(q);
        state=STATE_QUESTION_IN_PROGRESS;
        res.sendFile(__dirname+'/mainDisplay.html');
    }
});

app.get('/',function(req,res)
{
     res.sendFile(__dirname+'/admin.html');
});

server.listen(process.env.PORT || 8080,function()
{
    init();
    console.log('Listening on '+server.address().port);
});

var state;
var currentQuestion;
var questionIndex;
var botTimer;

function init()
{
    state=STATE_INITIALISING;
    currentQuestion=null;
    questionIndex=0;
}

io.on('connection',function(socket)
{
    socket.on(CMD_PLAYER_ANSWER,function(playerName,answerIndex)
    {
        processPlayerAnswer(playerName,answerIndex);
    });

    socket.on(CMD_REGISTER,function(playerName)
    {
        processRegistration(playerName);
    });
});

function closeRegistration()
{
    state=STATE_WAITING_FOR_QUESTION;
    sendToClient(CMD_QUIZ_READY);
    if (SIMULATION)
        setTimeout(simulAskQuestion,SIMUL_INTERVAL);
}

function simulAskQuestion()
{
    state=STATE_QUESTION_IN_PROGRESS;
    var simulQ = new question.Question("True or False: The Openshift Community Project is called Origin");
    simulQ.addAnswer("True",false);
    simulQ.addAnswer("False",true);
    processQuestion(simulQ);
}

function parseURL(params)
{
    var qText=params.text;
    var q = new question.Question(qText);
    var ci=params.ci;
    if (params.a0 !=null)
        q.addAnswer(params.a0,ci==0);
    if (params.a1 !=null)
        q.addAnswer(params.a1,ci==1);
    if (params.a2 !=null)
        q.addAnswer(params.a2,ci==2);
    if (params.a3 !=null)
        q.addAnswer(params.a3,ci==3);
    return q;
}

function processQuestion(question)
{
    currentQuestion=question;
    currentQuestion.setIndex(questionIndex++);
    currentQuestion.setTimeAsked(new Date());
    console.log("Sending question to clients: "+currentQuestion.answers.length);
    sendToClient(CMD_NEW_QUESTION,currentQuestion);
    botTimer=setInterval(processBots,BOT_INTERVAL);
    setTimeout(questionTimeout,QUESTION_TIME); 
}

function questionTimeout()
{
    console.log("Question timed out");
    clearInterval(botTimer);
    sendToClient(CMD_QUESTION_TIMEOUT,currentQuestion.getCorrectAnswerIndex());
    sendToClient(CMD_PLAYER_LIST,players.getPlayers());
    state=STATE_WAITING_FOR_QUESTION;
    if (SIMULATION)
        setTimeout(simulAskQuestion,SIMUL_INTERVAL);
}

processRegistration=function(playerName)
{
    var regStatus = players.validateNewPlayer(playerName);
    switch(regStatus)
    {
        case PLAYER_INVALID_NAME_LENGTH:
        case PLAYER_INVALID_NAME:
           sendToClient(CMD_REGISTRATION_ERROR,regStatus);
            break;
        case PLAYER_DUPLICATE:
            console.log("Duplicate player - ignoring");
        case 0:
            console.log("Server: New player registered: "+playerName);
            players.registerPlayer(playerName);
            sendToClient(CMD_REGISTERED);
            sendToClient(CMD_PLAYER_LIST,players.getPlayers());
            break;
        }
}

processPlayerAnswer=function(playerName,answerIndex)
{
    if (state != STATE_QUESTION_IN_PROGRESS)
    {
        console.log("Player response ignored: Question not in progress");
        return;
    }
        
    if (!players.playerHasAnswered(playerName,currentQuestion.getIndex()))
    {
        console.log("Answer of "+answerIndex+" received for question "+currentQuestion.getIndex()+" from "+playerName);
        var responseTime=new Date()-currentQuestion.getTimeAsked();
        players.registerAnswer(playerName,currentQuestion.getIndex(),currentQuestion.getCorrectAnswerIndex() == answerIndex,responseTime);
        sendToClient(CMD_PLAYER_UPDATE,new PlayerUpdate(playerName,responseTime,answerIndex));
    }
    else
        console.log("Player response ignored: player has already answered this question");
}

PlayerUpdate=function(playerName,responseTime,answerIndex)
{
    this.playerName=playerName;
    this.responseTime=responseTime;
    this.answerIndex=answerIndex;
}

function sendToClient(cmd,info)
{
    io.sockets.emit(cmd,{msg:info});
}

function registerBots()
{
    for (var i=0;i<NUM_BOTS;i++)
    {
        processRegistration(BOT_PREFIX+i);
    }
}

function processBots()
{
    for (var i=0;i<NUM_BOTS;i++)
    {
        if (Math.random() > .98)
        {
            processPlayerAnswer(BOT_PREFIX+i,Math.floor(Math.random()*currentQuestion.getNumAnswers()));
        }
    }
}