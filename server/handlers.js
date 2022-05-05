//handlers for the server endpoints


const { MongoClient } = require("mongodb");
require("dotenv").config();
const { MONGO_URI } = process.env;
const dbName = "ACRONYMS";

const options = { 
    useNewURLParser: true,
    useUnifiedTopology: true
}

//get acronyms by search term
//pagination parameters are required
//endpoint example: /acronym?page=1&limit=10&search=:search
const getAcronyms = async (req, res) => {

    const { page, limit, search } = req.query;
    
    //if pagination parameters are missing or are invalid
    if (!page || !limit || parseInt(page) < 1 || parseInt(limit) < 1) {
        return res.status(400).json({
            status: 400, 
            message: "Invalid pagination parameters -- both page and limit must be at least 1.", 
            data: {page, limit, search}
        })
    }

    //pagination parameters for aggregation pipeline
    const pageLimit = parseInt(limit);
    const skip = parseInt(limit) * (parseInt(page) - 1);

    const client = new MongoClient(MONGO_URI, options);

    try {

        await client.connect();
        const db = client.db(dbName);

        let acronymMatches = null;

        //if no search term provided, return all acronyms
        if (!search) {
            acronymMatches = await db.collection("acronyms").find().skip(skip).limit(pageLimit).toArray();
        }
        //else search for the term in both the acronym and definition fields of each document
        else {
            acronymMatches = await db.collection("acronyms").aggregate([
                {
                    $search: {
                        index: "default",
                        text: {
                            query: search,
                            path: [
                                "acronym", 
                                "definition"
                            ],
                            fuzzy: {
                                maxEdits: 2
                            }
                        }
                    }
                },
                { 
                    $project: {
                        _id: 0,
                        acronym: 1, 
                        definition: 1
                    }
                },
                {
                    $skip: skip 
                },
                { 
                    //to see if there are more results beyond the specified page limit, we allow the return of one extra element
                    $limit: pageLimit + 1 
                }
            ]).toArray();
        }

        //determine if there are results beyond those returned
        const isMoreResults = (acronymMatches.length > pageLimit);

        //return the above info in the header
        res.setHeader("More-Acronyms-Matched", `${isMoreResults}`);

        //respond with a maximum of the specified number of matches
        res.status(200).json({
            status: 200, 
            message: "Search for acronym complete.", 
            data: acronymMatches.slice(0, pageLimit)
        })
    }

    catch (err) {
        res.status(500).json({
            status: 500, 
            message: `Could not retrieve acronyms due to error: ${err}. Please try again.`, 
            data: {page, limit, search}
        });
    }

    finally {
        client.close();
    }

}

//add acronym to database
const addAcronym = async (req, res) => {

    const { acronym, definition } = req.body;

    const client = new MongoClient(MONGO_URI, options);

    //if any of the required data is missing, return error
    if (!acronym || !definition) {
        return res.status(400).json({
            status: 400, 
            message: "Bad request: both acronym and definition are required to create new entry.",
            data: { acronym, definition }
        });
    }

    try { 
        await client.connect();
        const db = client.db(dbName);

        //check if acronym/definition pair already exists in the database 
        const existingAcronym = await db.collection("acronyms").findOne({ acronym: acronym });

        //if the acronym exists, check if the existing definition is different from that in the request
        //if the definitions are the same, return error
        if (existingAcronym && (definition.toLowerCase() === existingAcronym.definition.toLowerCase())) {
            return res.status(409).json({
                status: 409, 
                message: "Bad request: entry already exists.",
                data: { acronym, definition }
            });
        }

        //insert new acronym/definition pair into the database 
        //note that if an acronym exists in the database with a different definition, we will treat this new definition as a new entry
        //will use the automatically generated mongoDB _id
        const newEntry = {
            acronym: acronym, 
            definition: definition
        }

        //insert acronym into database
        const result = await db.collection("acronyms").insertOne(newEntry);
        
        (result.acknowledged) ?
            res.status(201).json({
                status: 201, 
                message: "Acronym added successfully.", 
                data: {_id: result.insertedId}
            }) :
            res.status(500).json({
                status: 500, 
                message: "Acronym not added due to unknown server error.", 
                data: { acronym, definition }
            });
    }

    catch (err) {
        res.status(500).json({
            status: 500, 
            message: `Acronym not added due to error: ${err}. Please try again.`, 
            data: { acronym, definition }
        });
    }

    finally {
        client.close();
    }
}

//update either acronym or definition of an entry by acronym ID
const updateAcronym = async (req, res) => {

    const { acronymID } = req.params;
    const { acronym, definition } = req.body;

    //if no data to update is provided, return error
    if (!acronym && !definition) {
        return res.status(400).json({
            status: 400, 
            message: "Bad request: acronym or definition are required to update entry.",
            data :{ _id: acronymID, acronym, definition }
        });
    }

    //if attempting to update both acronym and definition, return error
    if (acronym && definition) {
        return res.status(400).json({
            status: 400, 
            message: "Bad request: cannot update both acronym and definition. Please add a new entry instead.",
            data :{ _id: acronymID, acronym, definition }
        });
    }

    const client = new MongoClient(MONGO_URI, options);

    try {
        await client.connect();
        const db = client.db(dbName);
        
        let updatedResult = null;

        //update the acronym
        if (acronym && !definition) {
            updatedResult = await db.collection("acronyms").updateOne({ _id: acronymID }, { $set: { acronym } });
        }
        //else update the definition
        else {
            updatedResult = await db.collection("acronyms").updateOne({ _id: acronymID }, { $set: { definition } });
        }
       
        if (updatedResult.matchedCount !== 1) {
            return res.status(404).json({
                status: 404, 
                message: "Could not find entry with the specified acronymID.", 
                data: { _id: acronymID, acronym, definition }
            });
        }

        if (updatedResult.modifiedCount !==1 ) {
            return res.status(500).json({
                status: 500, 
                message: "Could not update acronym due to unknown server error.", 
                data: { _id: acronymID, acronym, definition }
            });
        }

        //successfully updated acronym
        res.status(204).json({
            status: 204
        })

    }

    catch (err) {
        res.status(500).json({
            status: 500, 
            message: `Acronym not updated due to error: ${err}. Please try again.`, 
            data: { _id: acronymID, acronym, definition }
        });
    }

    finally {
        client.close();
    }
}

//delete acronym by ID
const deleteAcronym = async (req, res) => {

    const { acronymID } = req.params;

    const client = new MongoClient(MONGO_URI, options);

    try {
        await client.connect();
        const db = client.db(dbName);

        //check if acronym exists in the database -- if not, then we cannot delete it
        const existingAcronym = await db.collection("acronyms").findOne({ _id: acronymID });
        
        if (!existingAcronym) {
            return res.status(404).json({
                status: 404, 
                message: "Acronym not found.",
                data: acronymID
            })
        }

        //delete the acronym with the specified ID
        const result = await db.collection("acronyms").deleteOne({ _id: acronymID });

        (result.deletedCount === 1) ? (
            res.status(204).json({
                status: 204
            })
        ) : (
            res.status(500).json({
                status: 500, 
                message: "Acronym not deleted due to server error.", 
                data: { _id: acronymID }
            })
        )
    }

    catch (err) {
        res.status(500).json({
            status: 500, 
            message: `Acronym not deleted due to error: ${err}. Please try again.`, 
            data: { _id: acronymID }
        });
    }

    finally {
        client.close();
    }

}

module.exports = { getAcronyms, addAcronym, updateAcronym, deleteAcronym };