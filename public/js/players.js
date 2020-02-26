
// *** Shared between players.js & processPlayer.js
global.PLAYER_INVALID_NAME_LENGTH = -1;
global.PLAYER_INVALID_NAME = -2;
global.PLAYER_DUPLICATE=-3;
// ***

var player = require('./player.js');

players=[];

exports.registerPlayer=function(playerName)
{
    var newPlayer = new player.Player(playerName);
    players.push(newPlayer);
}

exports.validateNewPlayer=function(playerName)
{
    if (playerName.length < 3 || playerName.length > 8)
        return PLAYER_INVALID_NAME_LENGTH;
    if (!isAlphaNumeric(playerName))
        return PLAYER_INVALID_NAME;
    if (findPlayer(playerName) != null)
        return PLAYER_DUPLICATE; //Player shouldn't exist
    return 0;
}

exports.getPlayer=function(playerName)
{
    return findPlayer(playerName);
}

exports.getPlayers=function()
{
    return players;
}

exports.getNumPlayers=function()
{
    return players.length;
}

exports.playerHasAnswered=function(playerName,qIndex)
{
    return findPlayer(playerName).hasAnswered(qIndex);
}

exports.registerAnswer=function(playerName,questionIndex,isCorrect,responseTime)
{
    findPlayer(playerName).registerAnswer(questionIndex,isCorrect,responseTime);
}

exports.getWinnerName=function()
{
    var bestIndex=-1;
    var bestScore=-1;
    for (var i=0;i<players.length;i++)
    {
        if (players[i].correctAnswers > bestScore)
        {
            bestScore=players[i].correctAnswers;
            bestIndex=i;
        }
    }
    return players[bestIndex].name;
}

findPlayer = function(playerName)
{
    for (var i=0;i<players.length;i++)
    {
        if (playerName==players[i].name)
            return players[i];
    }
    return null;
}

isAlphaNumeric = function(str) 
{
  var code, i, len;

  for (i = 0, len = str.length; i < len; i++) 
  {
    code = str.charCodeAt(i);
    if (!(code > 47 && code < 58) && // numeric (0-9)
        !(code > 64 && code < 91) && // upper alpha (A-Z)
        !(code > 96 && code < 123)) { // lower alpha (a-z)
      return false;
    }
  }
  return true;
}