/**
 * Created by Administrator on 2018/3/6.
 */
const _ = require('lodash');
const expandResources = require('./lib/expand');
const pickResource = require('./lib/pick');


function  expandResourceWithPick(resourceJSON, expand='', pick='') {
    let expandKeys = [];
    return expandResources(resourceJSON,expand,expandKeys).then(retJson=>{
        return pickResource(retJson, pick, expandKeys);
    });
}

module.exports = {
    expandResource: expandResources,
    pickResource: pickResource,
    expandResourceWithPick: expandResourceWithPick,
    routerPlugin: async (ctx, next) => {
        let {expand='',pick=''} = ctx.query;
        ctx.query = _.omit(ctx.query,['expand','pick']);
        await next();
        if(/^2/.test(`${ctx.status}`)){
            let retJson = ctx.body || {};
            retJson = await expandResourceWithPick(retJson,expand,pick);
            ctx.body = retJson;
        }
    }
};