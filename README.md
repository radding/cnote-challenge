# Yoseph's Challeng

## Overview

This project is a full API with an endpoint to get and create transactions for a given user, and endpoint to calculate the interest at the end of a particular month in the current year. 

### Assumptions

1. Auth is handled outside of the scope
1. User IDs are unique and controlled by a different service.

## Running the project

To run the project, run:
```bash 
docker compose build
docker compose up -d
DB_HOST=127.0.0.1 DB_USER=postgres DB_DATABASE=postgres DB_PASSWORD=example npm run knex -- migrate:up
npm run build && DB_HOST=127.0.0.1 DB_USER=postgres DB_DATABASE=postgres DB_PASSWORD=example API_PORT=3001 npm run start
DB_HOST=127.0.0.1 DB_USER=postgres DB_DATABASE=postgres DB_PASSWORD=example API_URL=http://127.0.0.1:3000 npm run test:integ
```

Docker compose will create the API and the database for you. You can interact with the API at http://127.0.0.1:3000.

## API Methods

### GET /transactions

takes a query parameter of userID and optional start and end times and returns all transactions, the balance, and a link to the next page if there is one. 

```
interface Transaction {
    amount: number; // The value of the transation. A positive number means the money was deposited, a negative number means money was with drawn.
    userID: string; // The user ID the transaction belongs to
    description?: string; // Optional transaction description (IE user initiated deposit, or interest payment)
    date: Date;
    id: string;
}

{
    transactions: Transaction[];
    balance: number;
    nextPage: string | null;
}
```

### POST /transactions

Creates a transaction for the user:

Request Body:
```
{
    "userID": "1234",
    "amount": 100.00
}
```

### GET /interest?userID=userID&month=0

Gets the interest by the end of the month. 0 is January and 11 is december


returns: {

    interestOwed: number
}

## What I would do differently in production:

1. I would ensure authorization. 
2. I would use a structured logging tool like winston to improve logging.
3. I would integrate a metrics library
4. I would get the user ID from the authentication token rather than a query param.

I would also probably follow the Infrastructure and architecture in cnote.jpg. This is a good use case for event bridge and lambdas.

## The Database

I used a simple transaction log to keep track of how much money is in an account. I did this for two reasons:
1. Its easy to calculate the state at any given time.
2. We can leverage the SQL analytical functions like sum and group by to calculate anything we need on ranges and buckets rather than rely on our business logic.


If this database was part of a larger monolith, I would definitely have a foriegn key constraint on the user_uid column to ensure that user exists. 

See migrations/ for my migrations script. Here is the schema: 

```
    Column    |           Type           | Collation | Nullable | Default | Storage  | Compression | Stats target | Description
--------------+--------------------------+-----------+----------+---------+----------+-------------+--------------+-------------
 id           | uuid                     |           | not null |         | plain    |             |              |
 user_uid     | character varying(255)   |           | not null |         | extended |             |              |
 amount       | bigint                   |           | not null |         | plain    |             |              |
 created_time | timestamp with time zone |           | not null |         | plain    |             |              |
 description  | character varying(255)   |           |          |         | extended |             |              |
Indexes:
    "transactions_pkey" PRIMARY KEY, btree (id)
    "transactions_user_uid_created_time_index" btree (user_uid, created_time)
    
```