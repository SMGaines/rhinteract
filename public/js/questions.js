const CATEGORY_PREFIX = "c:";
const QUESTION_PREFIX = "q:";
const CORRECT_ANSWER_PREFIX = "A:";
const WRONG_ANSWER_PREFIX = "a:";

var question=require("./question.js");

var questions=[];
var categories=[];

/*
    Question is of form: 
    c:Cloud-Native Development
    q:True or False?: The community project name for OpenShift is Origin
    a:True
    A:False  (Capital A means this is the correct answer)
*/

exports.loadQuestions=function(questionsFile)
{
    var lineReader = require('readline').createInterface({ input: require('fs').createReadStream(questionsFile)});
    var aQuestion;
    var category="";
    var questionIndex;
    lineReader.on('line', function (line) 
    {
        if (line.startsWith(CATEGORY_PREFIX))
        {
            category=line.substring(CATEGORY_PREFIX.length);
            categories.push(category);
            questionIndex=0;
        }
        else if (line.startsWith(QUESTION_PREFIX))
        {
            var q=line.substring(QUESTION_PREFIX.length);
            aQuestion=new question.Question(q,category,questionIndex);
            questions.push(aQuestion);
            questionIndex++;
        }
        else if (line.startsWith(CORRECT_ANSWER_PREFIX))
            aQuestion.addAnswer(line.substring(QUESTION_PREFIX.length),true);
        else if (line.startsWith(WRONG_ANSWER_PREFIX))
            aQuestion.addAnswer(line.substring(QUESTION_PREFIX.length),false);
        else 
            console.log("Ignoring line: "+line);
    });

    lineReader.on('close', function (line) 
    {
        console.log("loadQuestions: Read in "+questions.length+" questions");
    });
}

exports.getCategories=function()
{
    return categories;
}

exports.getQuestion=function(category,index)
{
    for (var i=0;i<questions.length;i++)
    {
        if (questions[i].category==category && questions[i].index==index)
        return questions[i];
    }
    return null;
}

exports.getNumQuestions=function()
{
    return questions.length;
}

exports.isValidCategory=function(category)
{
    for (var i=0;i<questions.length;i++)
    {
        if (questions[i].category==category)
            return true;
    }
    return false;
}