//express server


"use strict";

//imports
const express = require("express");
const morgan = require("morgan");

//batch import for the original data
// const batchImport = require("./batchImport");

//import handlers
const { getAcronyms, addAcronym, updateAcronym, deleteAcronym } = require("./handlers");

//server port
const PORT = 8000;

express()
    .use(function (req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept'
        );
        next();
    })
    .use(morgan("tiny"))
    .use(express.json())
    .use(express.static("public"))

    //endpoints
    .get("/acronym", getAcronyms)
    .post("/acronym", addAcronym)
    .patch("/acronym/:acronymID", updateAcronym)
    .delete("/acronym/:acronymID", deleteAcronym)

    //catch-all endpoint
    .get("*", (req, res) => {
        res.status(404).json({
            status: 404, 
            message: "We couldn't find what you were looking for."
        });
    })

    .listen(PORT, () => console.info(`Listening on port ${PORT}`));
    