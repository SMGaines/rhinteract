const QUESTIONS_FILE_NAME = "questions.txt";

const QUESTION_TIME = 10000; // How long for people to answer a question
const QUESTION_INTERVAL=5000; // Time between questions

const NUM_BOTS = 8;
const BOT_PREFIX="BOT";
const BOT_INTERVAL = 100;

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

var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);

var question=require("./js/question.js");
var questions=require("./js/questions.js");

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
    registerBots();
    res.sendFile(__dirname+'/registration.html');
});

app.get('/quiz',function(req,res)
{
    startQuiz(req.query.category);
    res.sendFile(__dirname+'/mainDisplay.html');
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

var currentQuestion;
var currentCategory;
var botTimer;
var botAnswers=[];
var questionIndex;

function init()
{
    currentQuestion=null;
    questionIndex=0;
    currentCategory="";
    questions.loadQuestions(__dirname+"/"+QUESTIONS_FILE_NAME);
}

io.on('connection',function(socket)
{
    socket.on(CMD_REGISTER,function(playerName)
    {
        sendToClient(CMD_REGISTERED,playerName);
    });    
    
    socket.on(CMD_DUPLICATE_PLAYER,function(playerName)
    {
        sendToClient(CMD_DUPLICATE_PLAYER,playerName);
    });

    socket.on(CMD_PLAYER_DATA,function(playerData)
    {
        sendToClient(CMD_PLAYER_DATA,playerData);
    });
});

startQuiz=function(category)
{
    console.log("Starting quiz for category: "+category);
    currentCategory=category;
    askQuestion();
}

function askQuestion()
{
    currentQuestion=questions.getQuestion(currentCategory,questionIndex++);
    if (currentQuestion == null)
    {
        console.log("End of quiz: category: "+currentCategory);
        sendToClient(CMD_END_OF_QUIZ);
    }  
    else
    {
        currentQuestion.setTimeAsked(new Date());
        sendToClient(CMD_NEW_QUESTION,currentQuestion);
        botTimer=setInterval(processBots,BOT_INTERVAL);
        setTimeout(questionTimeout,QUESTION_TIME); 
    }
}

function questionTimeout()
{
    console.log("Question timed out");
    clearInterval(botTimer);
    sendToClient(CMD_QUESTION_TIMEOUT);
    setTimeout(askQuestion,QUESTION_INTERVAL);
}

function closeRegistration()
{
    sendToClient(CMD_QUIZ_READY);
}

PlayerAnswer=function(playerName,responseTime,answerIndex)
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
        botAnswers[i]=new Array();
        sendToClient(CMD_REGISTERED,BOT_PREFIX+i);
    }
}

function processBots()
{
    for (var i=0;i<NUM_BOTS;i++)
    {
        if (Math.random() > .98)
        {
            console.log("Bot "+i+" answering the question");
            botAnswers[i].push(new AnswerEntry(currentQuestion.getCategory(),currentQuestion.getIndex(),Math.random()>.5,new Date()-currentQuestion.getTimeAsked()));
            sendToClient(CMD_PLAYER_DATA,new PlayerData(BOT_PREFIX+i,botAnswers[i]));
        }
    }
}

PlayerData=function(name,answers)
{
    this.name=name;
    this.answers=answers;
}

AnswerEntry=function(category,index,isCorrect,responseTime)
{
  this.category=category;
  this.index=index;
  this.isCorrect=isCorrect;
  this.responseTime=responseTime;
}