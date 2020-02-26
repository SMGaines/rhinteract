exports.Player = function(name)
{
  this.name = name;
  this.answers=[];

  this.registerAnswer=function(index,isCorrect,responseTime)
  {
    this.answers.push(new Answer(index,isCorrect,responseTime));
  }

  this.getNumCorrectAnswers=function()
  {
    var score=0;
    this.answers.forEach(function(answer)
    {
      if (answer.isCorrect)
        score++;
    });
    return score;
  }

  this.hasAnswered=function(qIndex)
  {
    for (var i=0;i<this.answers.length;i++)
    {
      if (this.answers[i].index==qIndex)
        return true;
    }
    return false;
  }

  this.getTotalResponseTime=function()
  {
    var rTime=0;
    this.answers.forEach(function(answer)
    {
      if (answer.isCorrect)
        rTime+=answer.responseTime;
    });
    return rTime;
  }
}

Answer=function(index,isCorrect,responseTime)
{
  this.index=index;
  this.isCorrect = isCorrect;
  this.responseTime=responseTime;
}