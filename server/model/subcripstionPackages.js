const mongoose = require("mongoose");

const subscriptionPackagesSchema =  new mongoose.Schema({
    packageType:{
        type:String,
        require:true,
    },
    duration:{
        type: Number,
    },
    shortDescription:{
        type:String,
        require:true
    },
    finalPrice:{
        type:Number,
        require:true
    },
    cutPrice:{
        type:Number,
    }


})


module.exports = mongoose.model('subscriptionPackages',subscriptionPackagesSchema)