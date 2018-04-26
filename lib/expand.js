/**
 * Created by Administrator on 2016/9/7.
 */

const querystring = require('querystring');
const _ = require('lodash');
const URL = require('url');
const request = require('request-promise');

//通过 key ==find==> url
function findExpandResources(resourceJSON, expands) {
    let resourceSet = new Array();

  //  console.log('findExpandResources start  resourceJSON:'+  JSON.stringify(resourceJSON) );

    if(_.isArray(resourceJSON))
    {
        resourceJSON.map(items=>
        {
          //  console.log('findExpandResources list element  items:'+  JSON.stringify(items) );
             let singleResourceSet = findExpandResources(items,expands);
             singleResourceSet.map(singleResource =>
             {
                 if (!_.find(resourceSet, item => _.isEqual(item, singleResource))) {
                     resourceSet.push(singleResource);
                    // console.log('findExpandResources list element push url:'+singleResource.url );
                 }
             });

        });

        return resourceSet;
    }

    expands.map(({key,qs})=> {

        if (resourceJSON[key] && resourceJSON[key].href) {
            //console.log('findExpandResources 1 exist   key:'+key + "" );
            let temp = {'url': resourceJSON[key].href, 'qs': qs};
            if (!_.find(resourceSet, item => _.isEqual(item, temp))) {
                resourceSet.push(temp);
              //  console.log('findExpandResources 1 push url:'+temp.url );
            }
        }
    });


    _.keys(resourceJSON).map((item)=> {

        if (_.isObject(resourceJSON[item])) {

            //console.log(' findExpandResources 2 isobject  item: ' + item  + " obj:" + JSON.stringify(resourceJSON[item]));

            findExpandResources(resourceJSON[item], expands).map(obj => {
                if (!_.find(resourceSet, item => _.isEqual(item, obj))) {
                    resourceSet.push(obj);
                   // console.log('findExpandResources 2 push url:'+obj.url );
                }
            });
        }
    });
    return resourceSet;
};

// 通过 key url body == graft ==>> resourceJSON
// todo：需进一步处理资源存在DAG 循环情况（目前只处理第一层）
function graftExpandResources(resourceJSON, expands, expandResourcesMap) {
   // console.log('graftExpandResources start  resourceJSON:'+  JSON.stringify(resourceJSON) );

    if(_.isArray(resourceJSON))
    {
        resourceJSON.map((items,index)=>
        {
           // console.log('graftExpandResources list element  items:'+  JSON.stringify(items) );
            graftExpandResources(resourceJSON[index],expands,expandResourcesMap);
        });
        return;
    }

    _.keys(resourceJSON).map((item)=> {
        if (_.isObject(resourceJSON[item])) {
          //  console.log('graftExpandResources object element  items:'+  JSON.stringify(resourceJSON[item]) );
            graftExpandResources(resourceJSON[item], expands, expandResourcesMap);
        }
    });
    expands.map(({key,qs})=> {
        if (resourceJSON[key] && resourceJSON[key].href) {
            let resourceUrl = resourceJSON[key].href;
          //  console.log('resourceJSON replace url to obj resourceUrl:' + resourceUrl);
            resourceJSON[key] = expandResourcesMap.get(resourceUrl);
        }
    });
};

function graftListExpandResources(resourceJSON, expands, expandResourcesMap)
{
    var retResource = [];
     resourceJSON.map(item =>{
        graftExpandResources(item,expands,expandResourcesMap);
         retResource.push(item);
    });

    return retResource;

}


function findListExpandResources(resourceJSON, expands) {
    var allResourceList = [];
    resourceJSON.map(item => {
        let singleResultResource = findExpandResources(item, expands);

        singleResultResource.map(obj => {
            if (!_.find(allResourceList, item => _.isEqual(item, obj))) {
                allResourceList.push(obj);
                // console.log('findListExpandResources a push url:'+obj.url );
            }
        });
    });
    return allResourceList;
}

function getStringInBracket(string){
    let begin = string.indexOf( '(' );
    let end = string.lastIndexOf( ')' );
    let subString = '';
    if( begin != -1 && end != -1 && begin < end){
        subString = string.substring(begin+1,end);
    }
    return subString
}

function getExpandKeyValue (string){
    let begin = string.indexOf('(');
    if(begin == -1){
        return [string, undefined];
    }
    else{
        let key = string.substring(0,begin);
       // if(key[0]==='{'){ key +='}';}
        let value = getStringInBracket(string);
        return [key,value];
    }
}

function  findStrCnt(str,Goal,start,end)
{
   var foundIndexArray = [];
    for(let i = start;i < end;i++)
    {
        if(str[i] == Goal)
        {
            foundIndexArray.push(i);
        }
    }

    return foundIndexArray;
}

function  replaceExpandMultOptions(str,oldStr,newStr)
{
    let begin = string.indexOf('(');
    let leftKuoCnt  =0;
    if(begin == -1){
        return str.replace(oldStr,newStr);
    }
    else
    {
      let foundIndexArray = findStrCnt(str,oldStr,0,begin);
      leftKuoCnt++;
    }

}

module.exports = function expandResources (resourceRetJSON, expandStr, expandKeys = []) {
    if( !expandStr || expandStr=='') return Promise.resolve(resourceRetJSON);
    //切分expand string
  //  let expandArray = expandStr.split(';').map(item=>item.trim());

    let _startx = process.hrtime();

    let expandArray = splitFirstLevel(expandStr);

    let _endAtx = process.hrtime();
    let splitMs = ((_endAtx[0] - _startx[0]) * 1e3 + (_endAtx[1] - _startx[1]) * 1e-6).toFixed(3);
    // console.log(`[splitFirstLevel] time: ${splitMs} ms`);

    let expands = expandArray.map(item=> {
        let kv = getExpandKeyValue(item);
        //let qs = querystring.parse(kv[1], ',', ':');
        let qs = kv[1]?splitFirstLevel(kv[1], /,/g).reduce((result,item)=>{
            let index = item.indexOf(':'),key = item,value=null;
            if( index != -1){key = item.substring(0,index); value = item.substring(index+1);}
            result[key] = value;
            return result;
        },{}):{};
        const reg = /^\{\w*\}\d*$/;
        if( reg.test(kv[0]) ){
            let sp = kv[0].split(/[\{\}]/g), expandString = `{${sp[1]}}`; //默认为：无限展开
            if(sp[2]){  //有限展开
                let expandLevel = _.toNumber(sp[2]);
                expandString = (expandLevel>2)?`{${sp[1]}}${expandLevel-1}`:((expandLevel==2)?`${sp[1]}`:'');
            }

            if(!_.isEmpty(expandString)){
                expandString += kv[1]?`(${kv[1]})`:''; //保持与上一级展开参数一致
                let tempV = [expandString];
                if(qs.expand){ tempV.push(qs.expand);}
                qs.expand = tempV.join(';');
            }
            kv[0] = kv[0].substring(1,kv[0].indexOf('}'));
        }

        return { key: kv[0], qs:qs };
    });

    expands.map(({key})=>expandKeys.push(key));
    // console.log('expandKeys: ',expandKeys);
    //this. redirect();
    let _startAt0 = process.hrtime();
    //查找需要扩展的资源
    var resources = findExpandResources(resourceRetJSON, expands);

    let _endAt0 = process.hrtime();
    let ms = ((_endAt0[0] - _startAt0[0]) * 1e3 + (_endAt0[1] - _startAt0[1]) * 1e-6).toFixed(3);
    // console.log(`[findExpandResources] time: ${ms} ms`);
    //console.log('resources',resources);

    let _startAt3 = process.hrtime();
    let requestResults = resources.map(({url,qs})=> {
        let options = {qs: qs, json: true, simple: false, resolveWithFullResponse: true};
        return request.get(url, options).then((response)=>_.pick(response,['statusCode','body']));
    });
    return Promise.all(requestResults).then((rs) => {
        let ss = rs.map(({statusCode,body}, index)=>{
            //展开如果失败，返回原有href
            return [resources[index].url, (statusCode==200)?body:{href:resources[index].url}]
        });
        let resourcesMap = new Map(ss);

         graftExpandResources(resourceRetJSON, expands, resourcesMap);

        //results.others = rs;
        let _endAt3 = process.hrtime();
        let ms = ((_endAt3[0] - _startAt3[0]) * 1e3 + (_endAt3[1] - _startAt3[1]) * 1e-6).toFixed(3);
        // console.log(`[graftExpandResources] time: ${ms} ms`);
        return resourceRetJSON;
    });
};


const utils = require('../common/utils');


const reg = /\(([^()]+)\)/g;
test = 'role(expand:role(expand:{permissions}(expand:{menu};operator1));menu);{TEST}(ContinueExpand);merchant(expand:menu;widget)';
test = '{TEST}5(expand:EABC(i:10,j:20),a:1,b:2)';
test = '{TEST}(expand:EABC(i:10,j:20),a:1,b:2)';

function splitFirstLevel (string,separator=/;/g) {
    //从最里面取"()"内容
    // console.log(' string:' , string);
    let innermosts = string.match(reg);
    let uuid_kvs = [];
    while ( innermosts ){
        innermosts.map( str =>{
            //使用UUID做整体替换，保证内容的唯一整体性,
            //注意，前缀加入"&"(url特殊字符)，排除前后重叠误差
            let replace_uuid = `&${utils.createUUID()}`;
            uuid_kvs.push({key:replace_uuid, value:str});
            string = string.replace(str,replace_uuid);
            //console.log(`${str}-->${string}`);
        });
        //继续向外层替换，至到最外层
        innermosts = string.match(reg);
    }
    //替换对最外层分隔符separator“;”（分号）为“&”（url特殊）
    //console.log(string);
    string = string.replace(separator,'&');
   // console.log(string);
    //反向整体替换回去 注：有前后层次关系，不易并发推进
    for(let i=0;i<uuid_kvs.length;i++){
        const kv = uuid_kvs[uuid_kvs.length-i-1];

        string = string.replace(kv.key,kv.value);
        //console.log(string);
    }
    //切分最上层参数，并返回
    return string.split('&').map(item=>item.trim());
}
//console.log(splitFirstLevel(test));



