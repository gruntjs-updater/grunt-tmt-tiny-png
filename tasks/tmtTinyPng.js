/*
 * tmtTinyPng
 * https://github.com/funfungo/myGrunt
 *
 * Copyright (c) 2014 
 * Licensed under the MIT license.
 */

"use strict";
var request = require("request");
var fs = require("fs");
var path = require("path");
var async = require("async");

module.exports = function (grunt) {
    // Please see the Grunt documentation for more information regarding task
    // creation: http://gruntjs.com/creating-tasks


    grunt.registerMultiTask("tmtTinyPng", "The best Grunt plugin ever.", function () {

        //read keys from key.json as an array
        function getKeyInfo(keyJson){
            var keyInfo = {};
            keyInfo.arr = [];
            keyInfo.updateYear = keyJson[0].updateYear;
            keyInfo.updateMonth = keyJson[0].updateMonth;
            for(var i = 0; i<keyJson.length; i++){
                if(keyJson[i].expire == "false"){
                    keyInfo.arr.push(keyJson[i].key);
                }
            }
            return keyInfo;
        }

        //Calculate the time gap
        function getTime(startTime){
            endTime = new Date();
            return (endTime-startTime)/1000;
        }

        //Get the Api key from tinypng.com
        //See https://tinypng.com/developers
        function getKey(arr){
            keyIndex = Math.floor(Math.random()*arr.length);
            console.log(arr[keyIndex]);
            return arr[keyIndex];
        }

        //Romove the useless api key from key file and draw a new key from it
        function removeBadKey(keyIndex){
            keyJson[keyIndex + 1].expire = "true";
            fs.writeFile("key.json",JSON.stringify(keyJson));
        }

        //reset the key file in the beginning of every month
        function resetKeyFile(){
            startTime = new Date();
            var month = startTime.getMonth() + 1;
            var year = startTime.getFullYear();
            var date = startTime.getDate();
            if((month > keyInfo.updateMonth || year > keyInfo.updateYear) && date >1 ){
                console.log("yes");
                keyJson[0].updateYear = year;
                keyJson[0].updateMonth = month;
                for(var i = 1; i<keyJson.length; i++){
                    keyJson[i].expire = "false";
                }
                fs.writeFile("key.json",JSON.stringify(keyJson));
            }

        }

        var q = async.queue(function(file,callback){

            var dir = path.dirname(file);
            var ext = path.extname(file);
            var base = path.basename(file,ext);
            var tempFile = path.join(dir + "\\" + base + "_temp" + ext);


            (function upload(file){

                localStart[file] = new Date();
                grunt.log.ok("uploading..." + file);
                timeData[file].uploadCount ++;

                fs.createReadStream(file).pipe(request(options,function(error,response){

                    if(!error){

                        if(response.statusCode == 201){
                            pressMessage = JSON.parse(response.body);
                            inputSize += pressMessage.input.size;
                            outputSize +=  pressMessage.output.size;
                            timeData[file].uploadTime = getTime(localStart[file]);
                            timeData[file].inputSize = pressMessage.input.size;
                            timeData[file].outputSize = pressMessage.output.size;
                            grunt.log.ok(file + " compressed OK");
                            (function getPng(file){
                                localStart[file] = new Date();
                                console.log(response.headers.location);
                                request({uri:response.headers.location,timeout:10000,Pool:false})
                                    .on("error",function(error){
                                        grunt.log.error("downloading ERROR " + error.message);
                                        getPng(file);
                                    })
                                    .on("end",function(){

                                        timeData[file].downloadTime = getTime(localStart[file]);
                                        grunt.log.ok(file + " downloaded");

                                        fs.stat(tempFile,function(err,stats){
                                            if(stats.size == 0){
                                                fs.unlink(tempFile);
                                            }else{
                                                fs.rename(tempFile,file);
                                            }
                                        });
                                        callback();
                                    })
                                    .pipe(fs.createWriteStream(tempFile));
                            })(file);
                        }else if(response.statusCode == 429){
                            removeBadKey(keyIndex);
                            console.log(apiKey);
                            grunt.log.error("key expires");
                            q.push(file);
                            callback();
                        }
                        else{
                            q.push(file);
                            grunt.log.error("error" + response.statusCode);
                            callback();
                        }
                    }else{
                        if(timeData[file].uploadCount <= 5){
                            q.push(file);
                            grunt.log.error("uploading ERROR " + error.message);
                            callback();
                        }else{
                            grunt.log.error("give up " + file);
                            callback();
                        }
                    }
                }));
            })(file);
        },200);

        q.drain = function(){
            timeData["inputSize"] = inputSize;
            timeData["outputSize"] = outputSize;
            timeData["ratio"] = outputSize/inputSize;
            timeData["total time"] = getTime(startTime);
            console.log(timeData);
            done();
        };


        var done = this.async();
        var timeData = {};
        var keyJson = JSON.parse(fs.readFileSync("key.json"));// parse key.json
        var keyInfo = getKeyInfo(keyJson);//get info from keyJson
        var apiKey = getKey(keyInfo.arr);//get a random api key for use
        var keyIndex;
        var startTime,endTime,localStart = {};
        var inputSize = 0,outputSize = 0;
        var pressMessage={};
        var options = {
            uri: "https://api.tinypng.com/shrink",
            method: "POST",
            auth: {
                user: "api",
                pass: apiKey
            },
            timeout: 15000
        };

        resetKeyFile();
        this.files.forEach(function(f){

            f.src.forEach(function(file){

                timeData[file] = {};
                timeData[file].uploadCount = 0;
                timeData[file].testTime = new Date();
                q.push(file);

            })
        });
    })
};
