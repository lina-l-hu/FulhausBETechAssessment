//batch import for the original data


const { MongoClient, Db } = require("mongodb");
require("dotenv").config();
const { MONGO_URI } = process.env;

const options = { 
    useNewURLParser: true,
    useUnifiedTopology: true
}

const acronyms = require("./data/data.json");

const batchImport = async() => {
    
    const client = new MongoClient(MONGO_URI, options);

    try {
        await client.connect();
        const db = client.db("ACRONYMS");

        const result = await db.collection("acronyms").insertMany(acronyms);
    }

    catch (err) {
        console.log("Error during batch add:", err);
    }

    finally {
        client.close();
    }
}

batchImport();