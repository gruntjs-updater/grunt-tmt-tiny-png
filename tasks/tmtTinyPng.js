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
var KEY = ["DCW-nZpuisKWg5iZV8rH0k335X7z_Bjb","eEamUCpDZYQ7zaj-frcAycqaKsB4Bou5","3zdVSHVOGk6xnn71-3JfOh1-l-BROnKQ",
    "pVOpSrHyzPyTLqWrqkRJHAptvThQI9VU","FpzjI6viK9Q1hhFoZqXmpMzNj6VFkYMO","2lADPJQnfA3g8R1n6ObMuedbWh2ggxNq","pRLOxoMPpkLbFyAly7sRGoIWeVcQWt_i","uIS21F7vsXXZhJ599Wb3MsriVxgt5JYz"];

module.exports = function (grunt) {
    // Please see the Grunt documentation for more information regarding task
    // creation: http://gruntjs.com/creating-tasks


    grunt.registerMultiTask("tmtTinyPng", "The best Grunt plugin ever.", function () {
        var done = this.async();
        var timeData = {};
        var keyarr = fs.readFileSync("key.txt","utf-8").split(",");
        var apiKey = getKey();
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
        //Calculate the time gap
        function getTime(startTime){
            endTime = new Date();
            return (endTime-startTime)/1000;
        }
        //Get the Api key from tinypng.com
        //See https://tinypng.com/developers
        function getKey(){
            keyIndex = Math.floor(Math.random()*keyarr.length);
            console.log(keyarr[keyIndex]);
            return keyarr[keyIndex];
        }
        //Romove the useless api key from key file and draw a new key from it
        function removeBadKey(keyIndex){
            if(keyarr.indexOf(apiKey) != -1){
                keyarr.splice(keyIndex,1);
            }
            apiKey = getKey();
            options.auth.pass = apiKey;
            fs.writeFileSync("key.txt",keyarr.join(","),"utf-8");
        }
        //reset the key file in the beginning of every month
        function resetKeyFile(){
            startTime = new Date();
            var date = startTime.getDate();
            if(date >= 2 && date < 10){
                fs.writeFileSync("key.txt",KEY.join(","),"utf-8");
            }
        }
        //
        function writeData(data,file){
            var readFile = fs.createReadStream(file);
            var writeFile = fs.createWriteStream(file);
            var content = "";
            readFile.on("data",function(chunk){
                writeFile.write(chunk);
            });
            readFile.on("end",function(){
                writeFile.write("\n");
                for(var key in data){
                    console.log(key);
                    if(key !== inputSize && key !== outputSize && key != ratio && key !== "total time");
                    {
                        writeFile.write(key+"\t"+data[key].inputSize+"\t"+data[key].outputSize+"\t"+data[key].uploadTime+"\t"+data[key].downloadTime+"\n");
                    }
                }
            });
        }


        var q = async.queue(function(file,callback){
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
                                request({uri:response.headers.location,timeout:2000,Pool:false})
                                    .on("error",function(error){
                                        grunt.log.error("downloading ERROR " + error.message);
                                        getPng(file);
                                    })
                                    .on("end",function(){
                                        timeData[file].downloadTime = getTime(localStart[file]);
                                        grunt.log.ok(file + " downloaded");
                                        callback();
                                    })
                                    .pipe(fs.createWriteStream(file));
                            })(file);
                        }else if(response.statusCode == 429){
                            removeBadKey(keyIndex);
                            console.log(apiKey);
                            grunt.log.error("key expires");
                            q.push(file);
                            callback();
                        }
                        else{
                            if(timeData[file].uploadCount <= 5) {
                                q.push(file);
                            }
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
//            writeData(timeData,"test.xlsx");
            done();
        };

        //begin
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
