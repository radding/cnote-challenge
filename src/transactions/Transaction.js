"use strict";
exports.__esModule = true;
exports.transactionObject = void 0;
var zod_1 = require("zod");
exports.transactionObject = zod_1["default"].object({
    id: zod_1["default"].string(),
    amount: zod_1["default"].number(),
    date: zod_1["default"].date(),
    description: zod_1["default"].string().optional(),
    userID: zod_1["default"].string()
});
