import { DatabaseConnection, sql } from "slonik";
import * as Zod from "zod";
import { Transaction, transactionObject } from "./Transaction";


export interface TransactionQuery {
    userID: string;
    startDate?: Date;
    endDate?: Date;
    pagination?: {
        page: number;
        page_size: number;
    }
}

/**
 * Manages writing the transactions to the database. This class is only responsible for inserting and retrieving transactions.
 */
export class TransactionRepo {
    constructor(private readonly connection: DatabaseConnection) {}

    async getDailyBalanceForUser(userID: string, endDate?: Date, startDate?: Date) {
        const balanceObject = Zod.object({
            day: Zod.date(),
            balance: Zod.number(),
            userID: Zod.string(),
        });

        const start = startDate ?? new Date(0);
        const end = endDate ?? new Date();

       const whereClause = sql.unsafe`user_uid=${userID} AND 
            created_time BETWEEN ${sql.timestamp(start)} and ${sql.timestamp(end)}`;
        const data = await this.connection.query(sql.type(balanceObject)`
            SELECT
                cast(created_time as date) as day,
                SUM(amount) as balance
            FROM transactions
            WHERE ${whereClause}
            GROUP BY cast(created_time as date)
            ORDER BY day;
        `);
        let lastBalance = 0;
        return data.rows.map((val) => {
            lastBalance += val.balance / 100;
            return {
                ...val,
                balance: lastBalance,
            }
        });
    }

    async createTransaction(transaction: Omit<Transaction, "id" | "date">): Promise<string> {
        const respObject = Zod.object({
            id: Zod.string(),
        })
        const resp = await this.connection.oneFirst(sql.type(respObject)`INSERT into transactions 
            (id, user_uid, amount, created_time, description) VALUES (
                gen_random_uuid(),
                ${transaction.userID},
                ${transaction.amount * 100},
                now(),
                ${transaction.description ?? null}
            ) RETURNING id;`);
            console.log(`transaction id: ${resp}`)
            return resp;
    }

    async getTransactions(query: TransactionQuery): Promise<{transactions: readonly Transaction[], balance: number, nextPage: string | null}> {
    
        const paginationInfo = {
            size: query.pagination?.page_size ?? 10,
            page: query.pagination?.page ?? 0,
        };
        const start = query.startDate ?? new Date(0);
        const end = query.endDate ?? new Date();

        const balanceObject = Zod.object({
            user_uid: Zod.string(),
            balance: Zod.number(),
            total: Zod.number(),
       });

       const whereClause = sql.type(transactionObject)`user_uid=${query.userID} AND 
            created_time BETWEEN ${sql.timestamp(start)} and ${sql.timestamp(end)}`;
       const transactionsQuery = sql.type(transactionObject)`SELECT 
            id,
            user_uid AS userID,
            created_time AS date,
            amount,
            description
        FROM transactions
        WHERE ${whereClause} ORDER BY date LIMIT ${paginationInfo.size} OFFSET ${paginationInfo.size * paginationInfo.page};
       `;

        const balanceQuery = sql.type(balanceObject)`SELECT user_uid, sum(amount) as balance, count(amount) as total FROM transactions WHERE ${whereClause} GROUP BY user_uid`;
        const [transactionResult, balanceResult] = await Promise.all([
            this.connection.query(transactionsQuery),
            this.connection.query(balanceQuery),
        ]);
        
        if (transactionResult.rowCount === 0) {
            return {
                transactions: [],
                balance: 0,
                nextPage: null,
            };
        }

        let nextPage = null;
        if (balanceResult.rows[0].total > (paginationInfo.page + 1) * paginationInfo.size) {
            nextPage = `/transactions?start=${start.toISOString()}&end=${end.toISOString()}&page=${paginationInfo.page + 1}&page_size=${paginationInfo.size}`
        }

        return {
            transactions: transactionResult.rows.map(res => ({
                ...res,
                amount: res.amount / 100,
            })),
            balance: balanceResult.rows[0].balance / 100,
            nextPage,
        }
    }
}