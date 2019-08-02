/* 
Handler for Alexa skill Drippy Dip from the Deep.
AWS Lambda function

Provides interesting facts about the deep sea, through the eyes of Drippy - a deep sea inhabitant just visiting the surface. 
Sends multiple facts to Alexa, one at a time, selected randomly from content stored in DynampDB

*/

'use strict';
//import AWS
const awsSDK = require('aws-sdk');

//import ask-sdk-core
const Alexa = require('ask-sdk-core');

//skill name

const appName = 'Drippy Dip from the Deep';

// character voice 

//const drippyVoice = "Ivy"; 

//DynamoDB table
const deepFactsTable = 'thedeepfacts'
const docClient = new awsSDK.DynamoDB.DocumentClient();

// Global to track  total facts
// this is the number that will always be availble, new facts will replace old ones - keeping total to 14 always
const totalFacts = 14;

//code for the launch handler
const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    handle(handlerInput) {
        //welcome message
        let speechText = '';
        speechText = ` <voice name="Ivy"> Hi - I am drippy dip from the deep.
        I am just visiting the surface and getting to know nice humans like you. 
        Do you want to know some cool things about where I come from?  </voice> `;
        
        
        let repromptText = '<voice name= "Ivy"> There is a lot to know about the deep sea. Are you ready for a cool fact? </voice>';
        //welcome screen message - not handling screen yet, will implement in next version
        let displayText = 'Hi I am Drippy Dip. Nice meeting you!'
      
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(repromptText)
            .withSimpleCard(appName, displayText)
            .getResponse();
    }
};


// custom intent handlers
// the main function - get deep fact handler

const getNextDeepSeaFactIntentHandler = {
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'getNextDeepSeaFact'
    },
    async handle(handlerInput) {
      let speechText = '';
      let repromptText = 'Are you ready for a cool new deep sea fact?';
      let displayText = 'Hi I am Drippy Dip, Nice to meet you';
      let speechPrefix = '';
      let speechSuffix = '';
      let speechContinue = '';
      let fullDescription = '';
      let factKeyNumber = 0
      let factsToSay =[];
      let factCount = 0;
      let endSession = true;
      let suffixArray = ['Wow', '<break strength="x-strong"/> How cool is that? ', ' <break strength="x-strong"/> Is that not awesome?', '<break strength="x-strong"/> Interesting huh? ', ' <break strength="x-strong"/> that is super duper cool, right?']

      //let endSession = true;
      let intent = handlerInput.requestEnvelope.request.intent;
      //session attribute to store array of facts 
      const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
      if (typeof sessionAttributes.inSessionfactsToSay === 'undefined') {        
        // populate the array with keys to use
        let factIndex = 1;
        while(factIndex < totalFacts+1){
             factsToSay.push(factIndex++);
        }
        // sort the array randomly
        factsToSay.sort(() => Math.random() - 0.5);
     } else {
          factsToSay = sessionAttributes.inSessionfactsToSay;
          factCount = sessionAttributes.factCount;
          
     }  
    
    // take the next factsToSay 
    factKeyNumber = factsToSay.pop();
    //console.log('factKeyNumber ' + factKeyNumber);

      // read DynamoDB
      let params = {
        TableName: deepFactsTable,
        Key: {
          factnumber: factKeyNumber.toString()
        }
      };
      
       await docClient.get(params).promise().then(data => {

        //form the fact description
        //console.log('data ' + ' ' + data.Item);
        fullDescription = data.Item.factdetail;
        // form the full speech 
        if (factCount == 0) {
            speechPrefix = `<voice name="Ivy"> let me put on my teacher voice </voice> Here goes ...`;
        } else if (factCount === 1 || factCount === 4 || factCount === 8) {
            speechPrefix = ` <voice name="Ivy">   <say-as interpret-as="interjection">Yippee!</say-as>. you want to know more! you deserve a happy dance </voice> 
            <audio src="soundbank://soundlibrary/musical/amzn_sfx_trumpet_bugle_03"/>
            <audio src="soundbank://soundlibrary/musical/amzn_sfx_drum_comedy_01"/>`;
        }     
        
        speechSuffix = suffixArray[Math.floor((Math.random() * 4) + 1)];
        if (factsToSay.length == 0) {
            speechContinue = '  <voice name="Ivy"> ok, that was a lot of facts - and I want to go play now. You learned so much about the deep, come back soon and I will have some new facts for you, bye! </voice>';
            endSession = true;
        } else {
            speechContinue = '<break strength="x-strong"/> Are you ready for one more? ';
            endSession = false;    
        }
        speechText = speechPrefix + fullDescription + speechSuffix + speechContinue;
       
        // Add to fact count
        factCount++;
         })
         .catch(_err =>
            {
                speechText = `looks like I am having some problems - I will go back deep and come up in a few minutes `;
                
                console.log("Error reading data");
             return;
           });
           //console.log("endSession "+ endSession);
        //set session attributes
        sessionAttributes.speechText =speechText;
        sessionAttributes.inSessionfactsToSay = factsToSay;
        sessionAttributes.factCount = factCount;
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
       
        
       //Perform operation
       
  
        return handlerInput.responseBuilder
        .speak(speechText)
        .reprompt(repromptText)
        .withSimpleCard(appName, displayText)    
        .withShouldEndSession(endSession)
        .getResponse();
  
        }
  };
  

//end Custom handlers

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        //help text 
        let speechText = '<voice name="Ivy">I am drippy dip from the deep - I am here to tell you some cool things about the place I come from,  deep under the Ocean. Just let me know if you are ready to hear some mind blowing facts </voice>'
        let displayText = 'Say yes and I will tell you some mind blowing things about the place I come from'
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .withSimpleCard(appName, displayText)
            .getResponse();
    }
};
// repeat intent - to repeat what was said
const RepeatIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.RepeatIntent';
    },
    handle(handlerInput) {
        //help text for your skill
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        let speechText = '';
        if (typeof sessionAttributes.inSessionfactsToSay === 'undefined') {        

            speechText = ` <voice name="Ivy"> Hi - I am drippy dip from the deep.
         I am just visiting the surface and getting to know nice humans like you. 
            Do you want to know some cool things about where I come from?  </voice> `;
         }
        else { 
            speechText = 'Sure, '+ sessionAttributes.speechText;
        }
       
        let displayText = 'Hi I am Drippy Dip. Nice meeting you!'

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .withSimpleCard(appName, displayText)
            .getResponse();
    }
};

// Another fact? Yes
const YesIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.YesIntent';
    },
    handle(handlerInput) {
         let speechText = 'Ok, here goes ';
        return handlerInput.responseBuilder
        .speak(speechText)
        .withShouldEndSession(false)
        .getResponse();
        
    }
};

// No intent - to stop 
const NoIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.NoIntent';
    },
    handle(handlerInput) {
        //signing off
         let speechText = '<voice name="Ivy"> Ok bye, hope to see you soon </voice>';
         let displayText = 'Goodbye';
        return handlerInput.responseBuilder
        .speak(speechText)
        .withSimpleCard(appName, displayText)
        .withShouldEndSession(true)
        .getResponse();
        
    }
};
const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
                || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        let speechText = '<voice name="Ivy"> Goodbye </voice> ';
        let displayText = 'Goodbye';
        return handlerInput.responseBuilder
            .speak(speechText)
            .withSimpleCard(appName, displayText)
            .getResponse();
    }
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder.getResponse();
    }
};


const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        //help text 
        let speechText = '<voice name="Ivy"> I am Sorry, I did not understand that. Just say yes if you are ready to hear some mind blowing facts </voice>'
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

//Lambda handler function
exports.handler = Alexa.SkillBuilders.custom()
     .addRequestHandlers(LaunchRequestHandler,
                         getNextDeepSeaFactIntentHandler,
                         HelpIntentHandler,
                         RepeatIntentHandler,
                         YesIntentHandler,
                         NoIntentHandler,
                         CancelAndStopIntentHandler,
                         FallbackIntentHandler,
                         SessionEndedRequestHandler).lambda();
