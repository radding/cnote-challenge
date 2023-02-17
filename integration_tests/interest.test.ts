import { createPool, sql, DatabasePool } from "slonik";
import fetch from "node-fetch";
import {transactionObject} from "../src/transactions/Transaction"
import { dbDetails } from "./transactions.test";

const insertTestTransactions = async (amount: number, pool: DatabasePool, date: Date): Promise<void> => {
        await pool.query(sql.unsafe`
       INSERT into transactions 
            (id, user_uid, amount, created_time, description) VALUES (
                gen_random_uuid(),
                'test-user',
                ${amount},
                ${sql.date(date)},
                ${"created by integration tests"}
            )`);
        
}

describe("interest", () => {
    let pool: DatabasePool;
    beforeAll(async () => {
        // await waitForReady();
        pool = await createPool(`postgresql://${dbDetails.user}:${dbDetails.password}@${dbDetails.host}:5432/${dbDetails.database}`);
        await pool.query(sql.unsafe`DELETE FROM transactions WHERE user_uid='test-user'`);
    });
    afterEach(async () => {
        await pool.query(sql.unsafe`DELETE FROM transactions WHERE user_uid='test-user'`);
    });

    it("accrues 16.99 in interest on january 31st", async () => {
        const janFirst = new Date(2023, 0, 1);
        await insertTestTransactions(1000000, pool, janFirst);
        const resp = await fetch(`${process.env.API_URL}/interest?userID=test-user&month=1`);
        expect(resp.ok).toBeTruthy();

        const data = await resp.json() as any;
        console.log(data);
        expect(data.interestOwed).toBe(16.99);
    });

    it("accrues 24.38 in interest",async () => {
        const janFirst = new Date(2023, 0, 1);
        await insertTestTransactions(1000000, pool, janFirst);

        const janFifth = new Date(2023, 0, 5);
        await insertTestTransactions(500000, pool, janFifth);

        const resp = await fetch(`${process.env.API_URL}/interest?userID=test-user&month=1`);
        expect(resp.ok).toBeTruthy();

        const data = await resp.json() as any;
        console.log(data);
        expect(data.interestOwed).toBe(24.38);
        
    });

    it("accrues 9.59 of interest on jan 31st",async () => {
        const janFirst = new Date(2023, 0, 1);
        await insertTestTransactions(1000000, pool, janFirst);

        const janFifth = new Date(2023, 0, 5);
        await insertTestTransactions(-500000, pool, janFifth);

        const resp = await fetch(`${process.env.API_URL}/interest?userID=test-user&month=1`);
        expect(resp.ok).toBeTruthy();

        const data = await resp.json() as any;
        console.log(data);
        expect(data.interestOwed).toBe(9.59);
    });

    it("accrues 20.27 of interest on jan 31st", async() => {
        const janFirst = new Date(2023, 0, 1);
        await insertTestTransactions(1000000, pool, janFirst);

        const janFifteenth = new Date(2023, 0, 15);
        await insertTestTransactions(500000, pool, janFifteenth);
 
        const jan27 = new Date(2023, 0, 27);
        await insertTestTransactions(-500000, pool, jan27);

        const resp = await fetch(`${process.env.API_URL}/interest?userID=test-user&month=1`);
        expect(resp.ok).toBeTruthy();

        const data = await resp.json() as any;
        console.log(data);
        expect(data.interestOwed).toBe(20.27);
    });
})