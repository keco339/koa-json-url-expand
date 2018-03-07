/**
 * Created by Administrator on 2017/09/17.
 */
const _ = require('lodash');


module.exports = function pickResource(resourceObj, pickString, customKeys=[]){
    // console.log('[Pick Resources] --> pickString',JSON.stringify(pickString));

    if(_.isEmpty(pickString)){return resourceObj;}

    let keys = pickString.split(/[\|,;}]/g).map(key=>key.trim());
    // let pickKeys = _.union(['href'], keys, customKeys);
    let pickKeys = _.union(keys, customKeys);
    // console.log('[Pick Resources] --> pickKeys:',pickKeys);

    // 判断是否是REST列表资源对象
    if(    _.has(resourceObj,'items') && _.has(resourceObj,'limit')
        && resourceObj.items.length==resourceObj.limit){
        let omitKeys = ['items']
        if(!_.find(pickKeys,key=>key=='listHref')){ omitKeys.push('href');}
        let pickResourceObj = _.omit(resourceObj,omitKeys);
        pickResourceObj.items = resourceObj.items.map(obj=>_.pick(obj,pickKeys));
        return pickResourceObj;
    }
    else if( _.isArray(resourceObj) ){ // 是否是数组对象
        return resourceObj.map(obj=>_.pick(obj,pickKeys));
    }
    else { // 一般性普通资源对象
        let pickResourceObj = _.pick(resourceObj,pickKeys);
        return pickResourceObj;
    }

};
