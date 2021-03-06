const express = require("express");
const router = express.Router();
let jwt = require("jsonwebtoken");
const config = require("../../middleware/config.json"); // refresh
let tokenChecker = require("../../middleware/tockenchecker");
const tokenList = {};
const db = require("./db");
const _response = require('../common/middleware/api-response')
const responsemsg = require('../common/middleware/response-msg')
const commonStrings = require('../common/middleware/common-strings')
const responsecode = require('../common/middleware/response-code')
const response = require('../common/middleware/api-response')
const Joi = require('@hapi/joi')
const bcrypt = require('bcrypt');
const commonServe = require('../common/services/commonServices')
const validateAuthUser = require('../common/middleware/validateAuthorizeUser')
const isMaintenence = require('../common/middleware/isMaintenence')
const nodemailer = require("nodemailer");
const multer = require('multer');


module.exports = function (router) {
    router.post('/match',validateAuthUser, create)
    router.get('/match',validateAuthUser, match_list)
}


async function create(req,res){
    if (req.user.type !== 1){
        return _response.apiFailed(res, "Permission denied!")
    }

    if (!req.files) {
        return _response.apiWarning(res,"")
    } else {
        let avatar = req.files.cover;
        await avatar.mv('./gallery/' + avatar.name);
        req.body.cover = "https://api.android-developers-hub.xyz/gallery/"+ avatar.name

        console.log(req.body)
        try{
            await db.awaitQuery("INSERT INTO `match` SET ? ",req.body)
            return _response.apiSuccess(res,responsemsg.saveSuccess)
        }catch (e) {
            console.log(e)
            return _response.apiFailed(res,e)
        }
    }
}



async function match_list(req,res){

    if (!req.query.game_status){
        return _response.apiFailed(res, "Please select status")
    }
    if (!req.query.game_name){
        return _response.apiFailed(res, "Please select game name")
    }


    let limit = 500;
    let page = 1;
    let totalDocs = 0;
    if (req.query.page) {
        page = req.query.page
    }
    if (req.query.limit) {
        limit = req.query.limit
    }
    let offset = (page - 1) * limit

    try{
        let count = await db.awaitQuery("SELECT COUNT(*) AS total FROM `match` WHERE game_status = "+parseInt(req.query.game_status)+"  AND game_name = '"+req.query.game_name+"'  ");
        totalDocs = count[0].total
    }catch (e) {
        return _response.apiFailed(res, e)
    }

    let project= "*"
    if (req.user.type === 0){
        project = "id,title,cover,total_player,type,map,per_kill,entry_fee,game_name,game_status,createdAt,prize"
    }

    //Search by String
    if (req.query.search_string && req.query.search_string !== '') {

        let a = "%"+req.query.search_string+"%"
        try{
            let result = await db.awaitQuery("SELECT "+project+" FROM `match` WHERE CONCAT(title) LIKE '" + a + "' AND game_status = "+req.query.game_status+"  AND game_name = '"+req.query.game_name+"'  ORDER BY match.id DESC LIMIT " + limit + " OFFSET " + offset + " ")
            if (result.length > 0) {
                return _response.apiSuccess(res, result.length + " " + responsemsg.userFound, result, {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalDocs: totalDocs
                })
            } else {
                return _response.apiFailed(res, responsemsg.userListIsEmpty)
            }
        }catch (e) {
            return _response.apiFailed(res, e)
        }
    } else {
        try{
            let result = await db.awaitQuery("SELECT "+project+" FROM `match` WHERE game_status = "+parseInt(req.query.game_status)+"  AND game_name = '"+req.query.game_name+"'  ORDER BY match.id DESC LIMIT " + limit + " OFFSET " + offset + "")
            if (result.length > 0) {
                return _response.apiSuccess(res, result.length + " " + responsemsg.userFound, result, {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalDocs: totalDocs
                })
            } else {
                return _response.apiFailed(res, responsemsg.userListIsEmpty)
            }
        }catch (e) {
            return _response.apiFailed(res, e)
        }
    }
}





