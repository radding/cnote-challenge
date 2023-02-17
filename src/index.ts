import { createPool } from "slonik";
import express, { query } from "express";
import bodyParser from "body-parser";
import { TransactionQuery, TransactionRepo } from "./transactions/Repository";
import { Transaction, transactionObject } from "./transactions/Transaction";
import { InterestService } from "./interest/Service";
import { InterestRepository } from "./interest/Repository";

const dbDetails = {
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
};

const app = express();

app.use(bodyParser.json());

const port = process.env.API_PORT || 3000;
let transactionsRepo: TransactionRepo;
let interestService: InterestService;
const interestRepo = new InterestRepository(.02);


app.get("/", (req, res) => {
    res.send("hello world!");
});

app.get("/transactions", async (req, res) => {
    try {
        const userID = req.query.userID as string; // TODO: get this from auth token
        console.log("Getting transactions for user");
        const transactionQ: TransactionQuery = {
            userID,
            pagination: {
                page_size: parseInt(req.query.page_size as string ?? "10", 10),
                page: parseInt(req.query.page as string ?? "0", 10),
            }
        }
        if (req.query.start !== undefined) {
            transactionQ.startDate = new Date(req.query.start as string);
        }
        if (req.query.end !== undefined) {
            transactionQ.endDate = new Date(req.query.end as string);
        }
        const transactions = await transactionsRepo.getTransactions(transactionQ);

        return res.status(200).json(transactions);
    } catch(e) {
        console.error("error getting transactions", e)
        res.status(500).json({msg: "something went wrong"})
    }
});

app.post("/transactions", async (req, res) => {
    try {
        console.log("body", req.body);
        const transaction = transactionObject.omit({id: true, date: true}).safeParse(req.body);
        if (!transaction.success) {
            res.status(400).json(transaction.error);
            return
        }
        const transactionID = await transactionsRepo.createTransaction(transaction.data);

        res.json({transaction_id: transactionID});

    } catch(e) {
        console.error("error getting transactions", e)
        res.status(500).json({msg: "something went wrong"})
    }
});

app.get("/interest", async (req, res) => {
    try {
        const userID = req.query.userID as string; // TODO: get this from auth token
        console.log(`getting interest for ${userID}`);
        const month = req.query.month !== undefined ? parseInt(req.query.month as string, 10) - 1 : (new Date()).getMonth(); 
        const interestOwed = await interestService.getApplicableInterestForMonth(month, userID);
        return res.json({
            interestOwed,
        });
    } catch(e) {
        console.error("error getting interest", e)
        res.status(500).json({msg: "something went wrong"})
    }
});

const start = async () => {
    const pool = await createPool(`postgresql://${dbDetails.user}:${dbDetails.password}@${dbDetails.host}:5432/${dbDetails.database}`);
    transactionsRepo = new TransactionRepo(pool);
    interestService = new InterestService(interestRepo, transactionsRepo);
    app.listen(port, () => {
        console.log(`Listening on ${port}`);
    });
};

start();