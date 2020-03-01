
exports.Question = function(text,category,index)
{
    this.index=index;
    this.category=category;
    this.text = text;
    this.answers=[];
    this.answerIndex=-1;
    this.timeAsked=0;

    this.getNumAnswers = function()
    {
        return this.answers.length;
    }

    this.getCategory=function()
    {
        return this.category;
    }

    this.setTimeAsked=function(timeAsked)
    {
        this.timeAsked=timeAsked;
    }

    this.getTimeAsked=function()
    {
        return this.timeAsked;
    }

    this.getIndex=function()
    {
        return this.index;
    }

    this.getCorrectAnswerIndex = function()
    {
        return this.answerIndex;
    }

    this.addAnswer = function(answer,isCorrect)
    {
        if (isCorrect)
            this.answerIndex=this.answers.length;
        this.answers.push(answer);
    }
}