# FulhausBETechAssessment

REST API for common acronyms, built with Node.js/Express. Data is stored in MongoDB.


## Endpoints:

GET /acronym?page=1&limit=10&search=:search
  - returns a list of acronyms, pagination using query parameters 
  - response headers indicate if there are more results
  - returns all acronyms that fuzzy match against :search
  
POST /acronym
  - receives an acronym and definition string ○ adds the acronym definition to the db
  
PATCH /acronym/:acronymID
  - updates the acronym for :acronymID
  
DELETE /acronym/:acronymID
  - deletes the acronym for :acronymID
  

## Available Scripts

In the server directory, run 

### `yarn start`

to start the server in the development mode at [http://localhost:8000](http://localhost:8000).


## File Structure
```
├── server
│   ├── data
│   │   ├── data.json
│   ├── node_modules
│   ├── batchImport.js
│   ├── handlers.js
│   ├── index.js
│   ├── package-lock.json
│   ├── package.json
│   ├── yarn.lock
└── .gitignore
```
