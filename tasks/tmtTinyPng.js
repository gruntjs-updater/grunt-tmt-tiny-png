/*
 * tmtTinyPng
 * https://github.com/funfungo/myGrunt
 *
 * Copyright (c) 2014 
 * Licensed under the MIT license.
 */

'use strict';
var request = require('request');
var fs = require('fs');
var path = require('path');
var async = require('async');
var KEY = ['DCW-nZpuisKWg5iZV8rH0k335X7z_Bjb','eEamUCpDZYQ7zaj-frcAycqaKsB4Bou5','pVOpSrHyzPyTLqWrqkRJHAptvThQI9VU'];

module.exports = function (grunt) {
    // Please see the Grunt documentation for more information regarding task
    // creation: http://gruntjs.com/creating-tasks


    grunt.registerMultiTask('tmtTinyPng', 'The best Grunt plugin ever.', function () {

        var done = this.async();
        var timeData = {};
        var keyarr = fs.readFileSync('key.txt','utf-8').split(",");
        var apiKey = getKey();
        console.log(apiKey);
        var index;
        var startTime,endTime,localStart = {};
        var inputSize = 0,outputSize = 0;
        var pressMessage={};
        var options = {
            uri: 'https://api.tinypng.com/shrink',
            method: 'POST',
            auth: {
                user: 'api',
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
            index = Math.floor(Math.random()*keyarr.length);
            return keyarr[index];
        }
        //Romove the useless api key from key file and draw a new key from it
        function removeBadKey(index){
            keyarr.splice(index,1);
            apiKey = getKey();
            options.auth.pass = apiKey;
            fs.writeFileSync('key.txt',keyarr.join(','),'utf-8');
        }
        //reset the key file in the beginning of every month
        function resetKeyFile(){
            startTime = new Date();
            var date = startTime.getDate();
            if(date === 2){
                fs.writeFileSync('key.txt',KEY.join(','),'utf-8');
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
                        writeFile.write(key+"\t"+data[key].inputSize+"\t"+data[key].outputSize+'\t'+data[key].uploadTime+"\t"+data[key].downloadTime+"\n");
                    }
                }
            });

        }


        var q = async.queue(function(file,callback){
            (function upload(file){
                localStart[index] = new Date();
                grunt.log.ok("uploading..." + file);
                timeData[file].uploadCount ++;
                fs.createReadStream(file).pipe(request(options,function(error,response){
                    if(!error){
                        if(response.statusCode == 201){
                            pressMessage = JSON.parse(response.body);
                            inputSize += pressMessage.input.size;
                            outputSize +=  pressMessage.output.size;
                            timeData[file].uploadTime = getTime(localStart[index]);
                            timeData[file].inputSize = pressMessage.input.size;
                            timeData[file].outputSize = pressMessage.output.size;
                            grunt.log.ok(file + " compressed OK");
                            (function getPng(file){
                                localStart[index] = new Date();
                                request({uri:response.headers.location,timeout:20000})
                                    .on('error',function(error){
                                        grunt.log.error("downloading ERROR " + error.message);
                                        getPng(file);
                                    })
                                    .on('end',function(){
                                        timeData[file].downloadTime = getTime(localStart[index]);
                                        grunt.log.ok(file + " downloaded");
                                        callback();
                                    })
                                    .pipe(fs.createWriteStream(file));
                            })(file);
                        }else if(response.statusCode == 429){
                            removeBadKey(index);
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
