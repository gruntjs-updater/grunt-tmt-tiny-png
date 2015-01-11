/**
 * Created by funfungo on 15/1/10.
 */
var fs = require("fs");
function getKeyInfo(keyJson){
    var keys = {};
    keys.arr = [];
    keys.updateYear = keyJson[0].updateYear;
    keys.updateMonth = keyJson[0].updateMonth;
    for(var i = 0; i<keyJson.length; i++){
        if(keyJson[i].expire == "false"){
            keys.arr.push(keyJson[i].key);
        }
    }
    return keys;
}

function removeBadKey(keyIndex){
    keyJson[keyIndex + 1].expire = "true";
    fs.writeFile("key.json",JSON.stringify(keyJson));
}

function resetKeyFile(){
    var data;
    var startTime = new Date();
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
var keyJson = JSON.parse(fs.readFileSync("key.json"));
var keyInfo = getKeyInfo(keyJson);
removeBadKey(2);
resetKeyFile()
console.log(keyInfo);

