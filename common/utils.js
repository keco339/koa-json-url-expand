/**
 * Created by Administrator on 2018/3/6.
 */
const uuid = require('uuid');
const crypto = require('crypto');

// UUID操作工具集
exports.createUUID = ()=>{
    let uuid_md5 = null;
    do{
        let md5 = crypto.createHash('md5');
        uuid_md5 = md5.update(`${uuid.v1()}-${uuid.v4()}`).digest('base64');
    }while( uuid_md5.indexOf('/') != -1 || uuid_md5.indexOf('+') != -1);
    return uuid_md5.substr(0, uuid_md5.length-2);
};
