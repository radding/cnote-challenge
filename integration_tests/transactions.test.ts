import { createPool, sql, DatabasePool } from "slonik";
import fetch from "node-fetch";
import {transactionObject} from "../src/transactions/Transaction"

// @ts-ignore
// const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const wait = (timeMS: number) => new Promise((res) => setTimeout(res, timeMS));

export const dbDetails = {
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
};

const waitForReady = async (): Promise<void> => {
    try {
        const body = await fetch(`${process.env.API_URL}`);
        if (!body.ok) {
            await wait(500);
            return waitForReady();
        }
        return;
    } catch (e) {
        await wait(500);
        return waitForReady();
    }
}

const insertTestTransactions = (amounts: number[], pool: DatabasePool): Promise<{amount: number, month: number}[]> => {
    return Promise.all(amounts.map(async (value) => {

        const randomMonth = Math.floor(Math.random() * 12);
        const date = new Date();
        date.setMonth(randomMonth);
        await pool.query(sql.unsafe`
       INSERT into transactions 
            (id, user_uid, amount, created_time, description) VALUES (
                gen_random_uuid(),
                'test-user',
                ${value},
                ${sql.date(date)},
                ${"created by integration tests"}
            )`);
        return {
            amount: value,
            month: randomMonth,
        };
    }));
}

describe("transactions", () => {
    let pool: DatabasePool;
    beforeAll(async () => {
        // await waitForReady();
        pool = await createPool(`postgresql://${dbDetails.user}:${dbDetails.password}@${dbDetails.host}:5432/${dbDetails.database}`);
        await pool.query(sql.unsafe`DELETE FROM transactions WHERE user_uid='test-user'`);
    });
    afterEach(async () => {
        await pool.query(sql.unsafe`DELETE FROM transactions WHERE user_uid='test-user'`);
    });
    it("saves transactions", async () => {
        const resp = await fetch(`${process.env.API_URL}/transactions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                userID: "test-user",
                amount: 1000,
            }),
        });
        console.log(resp.status);
        expect(resp.ok).toBeTruthy();
        const data = await resp.json() as any;

        expect(data.transaction_id).not.toBeUndefined();

        const transactionResponse = await pool.query(sql.type(transactionObject)`SELECT 
            id,
            amount,
            created_time as date,
            user_uid as userID,
            description
        FROM transactions WHERE id=${data.transaction_id}
        `);
        expect(transactionResponse).toBeDefined();
        expect(transactionResponse.rows[0].id).toEqual(data.transaction_id);
    });

    it ("gets all transactions for a user", async () => {
        const max = 10000000;
        const min = -max;
        let sum = 0;
        const ammounts: number[] = [];
        for (let i = 0; i< 100; i++) {
            const val = Math.round((Math.random() * (max - min) + min) * 100);
            sum += val;
            ammounts.push(val);
        }
        console.log(ammounts);
        const values = await insertTestTransactions(ammounts, pool);

        const resp = await fetch(`${process.env.API_URL}/transactions?userID=test-user`);
        expect(resp.ok).toBeTruthy();
    });
});