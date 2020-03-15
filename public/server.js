const QUESTIONS_FILE_NAME = "questions.txt";

const QUESTION_TIME = 20; // How long for people to answer a question
const QUESTION_INTERVAL=5000; // Time between questions
const ANSWER_REVEAL_INTERVAL=5000;

const NUM_BOTS = 30;
const BOT_PREFIX="BOT";
const BOT_INTERVAL = 500;
const MIN_BOT_RESPONSE_TIME = 10000;
const ONE_SECOND = 1000;

const PASSWORD_NOT_SET = "NOT_SET";


const STATE_NOT_STARTED = 0;
const STATE_STARTED=1;
const STATE_PAUSED=2;
const STATE_ENDED=3;

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

app.get('/',function(req,res)
{
    res.sendFile(__dirname+'/admin.html');
});

app.get('/main',function(req,res)
{
    res.sendFile(__dirname+'/mainDisplay.html');
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
var password;
var quizState;
var secondsLeft;

function init()
{
    currentQuestion=null;
    quizState=STATE_NOT_STARTED;
    password=PASSWORD_NOT_SET;
    questions.loadQuestions(__dirname+"/"+QUESTIONS_FILE_NAME);
}

io.on('connection',function(socket)
{
    // Admin functions
    socket.on(CMD_LOGIN,function(aPassword)
    {
        if (password==PASSWORD_NOT_SET)
        {
            password=aPassword;
            sendToClient(CMD_LOGIN_OK,"");
        }
        else
            sendToClient(CMD_LOGIN_FAIL,"");
    });    

    socket.on(CMD_GET_CATEGORIES,function(adminData)
    {
        if (adminData.password==password)
            sendToClient(CMD_GET_CATEGORIES,questions.getCategories());
        else
            sendToClient(CMD_LOGIN_FAIL,"Invalid password");
    });   

    socket.on(CMD_START_QUIZ,function(adminData)
    {
        if (adminData.password==password)
        {
            if (quizState==STATE_STARTED)
                sendToClient(CMD_ADMIN_STATUS,"Quiz already in progress");
                else if (quizState==STATE_PAUSED)
                    restartQuiz();
                else
                    startQuiz(adminData.arg0,adminData.arg1-1);// -1 since first question array is zero-indexed i.e. Question 1 has index 0
        }
        else
            sendToClient(CMD_LOGIN_FAIL,"Invalid password");
    });   

    socket.on(CMD_PAUSE_QUIZ,function(adminData)
    {
        if (adminData.password==password)
        {
            if (quizState==STATE_STARTED)
                pauseQuiz();
            else
                sendToClient(CMD_ADMIN_STATUS,"Quiz not in progress");
        }
        else
            sendToClient(CMD_LOGIN_FAIL,"Invalid password");
    });

    socket.on(CMD_OPEN_REGISTRATION,function(adminData)
    {
        if (adminData.password==password)
        {
            console.log("Server: Opening Registration");
            registerBots();
            sendToClient(CMD_OPEN_REGISTRATION,"Registration now open");
        }
        else
            sendToClient(CMD_LOGIN_FAIL,"Invalid password");
    });    

    // Other functions
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
        console.log("CMD_PLAYER_DATA: Name: "+playerData.name);
        for (var j=0;j<playerData.answers.length;j++)
        {
            console.log("--> "+playerData.answers[j].category+"/"+playerData.answers[j].index+"/"+playerData.answers[j].isCorrect+"/"+playerData.answers[j].responseTime);
        }         
        sendToClient(CMD_PLAYER_DATA,playerData);
    });
});

restartQuiz=function()
{
    console.log("restartQuiz: category: "+currentCategory);
    quizState=STATE_STARTED;
    sendToClient(CMD_ADMIN_STATUS,"Quiz restarting for category: "+currentCategory);
    sendToClient(CMD_RESTART_QUIZ,currentCategory);
}

startQuiz=function(category,index)
{
    if (questions.isValidCategory(category))
    {
        console.log("startQuiz: category: "+category);
        quizState=STATE_STARTED;
        currentCategory=category;
        questionIndex=(typeof index == 'undefined')?0:index; 
        setTimeout(askQuestion,QUESTION_INTERVAL);
        sendToClient(CMD_START_QUIZ,currentCategory);
        sendToClient(CMD_ADMIN_STATUS,"Quiz starting for category: "+category);
    }
    else
    {
        console.log("startQuiz: No such quiz: "+category);
        sendToClient(CMD_ADMIN_STATUS,"No such quiz for category: "+category);
    }
}

function pauseQuiz()
{
    sendToClient(CMD_PAUSE_QUIZ,"");
    quizState=STATE_PAUSED;
}

function askQuestion()
{
    currentQuestion=questions.getQuestion(currentCategory,questionIndex);
    questionIndex++;
    if (currentQuestion == null)
    {
        console.log("End of quiz: category: "+currentCategory);
        quizState=STATE_NOT_STARTED;
        sendToClient(CMD_END_OF_QUIZ);
    }  
    else
    {
        currentQuestion.setTimeAsked(new Date());
        sendToClient(CMD_NEW_QUESTION,currentQuestion);
        botTimer=setInterval(processBots,BOT_INTERVAL);
        secondsLeft=QUESTION_TIME;
        secondTimer();
    }
}

function secondTimer()
{
    sendToClient(CMD_TIME_LEFT,secondsLeft);
    if (secondsLeft > 0)
        setTimeout(secondTimer,ONE_SECOND);
    else
        questionTimeout();
    if (quizState == STATE_STARTED)
        secondsLeft--;
}

function questionTimeout()
{
    console.log("Question timed out");
    clearInterval(botTimer);
    setTimeout(answerReveal,ANSWER_REVEAL_INTERVAL);
}

function answerReveal()
{
    sendToClient(CMD_QUESTION_TIMEOUT);
    setTimeout(askQuestion,QUESTION_INTERVAL);
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
        if (quizState==STATE_STARTED &&(new Date()-currentQuestion.getTimeAsked() > MIN_BOT_RESPONSE_TIME) && Math.random() > .97)
        {
            botAnswers[i].push(new AnswerEntry(currentQuestion.getCategory(),currentQuestion.getIndex(),Math.random()>.5,new Date()-currentQuestion.getTimeAsked()));
            console.log("CMD_PLAYER_DATA: Name: "+BOT_PREFIX+i);
            for (var j=0;j<botAnswers[i].length;j++)
            {
                console.log("--> "+botAnswers[i][j].category+"/"+botAnswers[i][j].index+"/"+botAnswers[i][j].isCorrect+"/"+botAnswers[i][j].responseTime);
            }         
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