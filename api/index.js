const express = require("express");
const app = express();
const { KiteConnect } = require("kiteconnect");
const { ceilToTick, roundToTick } = require("../utils");

app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("API Online!");
});

// to test post back:
// https://kite.trade/forum/discussion/9857/how-do-i-test-zerodha-postback-after-market-hours
app.post("/api", async (req, res, next) => {
  let { api_key, access_token } = req.query;
  const kite = new KiteConnect({ api_key, access_token });
  let position;

  try {
    position = JSON.parse(Object.keys(req.body)?.[0]);
  } catch (err) {
    throw Error("Unable to parse received order!");
  }

  // stop loss specs
  const stopType = position["transaction_type"] === "BUY" ? "SELL" : "BUY";
  const orderType = stopType === "BUY" ? "LIMIT" : "SL";
  const stopPercentage = parseFloat(req.query.stopPercentage || "0.03");
  const price =
    stopType === "SELL"
      ? position["average_price"] * (1 - stopPercentage)
      : position["average_price"] * (1 + stopPercentage);
  const priceTick =
    stopType === "SELL" ? roundToTick(price) : ceilToTick(price);

  const orderParams = {
    exchange: position["exchange"],
    tradingsymbol: position["tradingsymbol"],
    transaction_type: stopType,
    quantity: Math.abs(position["filled_quantity"]),
    product: position["product"],
    validity: position["validity"],
    order_type: orderType,
    price: priceTick,
    trigger_price: priceTick,
    variety: position["variety"],
  };

  let response;

  try {
    // place order
    response = await kite.placeOrder(position["variety"], orderParams);
  } catch (err) {
    response = err;
  }

  const result = { response, orderParams };

  console.log("Placing SL for:", result);

  res.json(result);
});

// for deploying as several function
if (process.env.NODE_ENV !== "production") {
  app.listen(8081, () => {
    console.log(`Example app listening on port`);
  });
}

module.exports = app;

// order placed notification: https://kite.trade/docs/connect/v3/postbacks/
// {
//     "user_id": "AB1234",
//     "unfilled_quantity": 0,
//     "app_id": 1234,
//     "checksum": "2011845d9348bd6795151bf4258102a03431e3bb12a79c0df73fcb4b7fde4b5d",
//     "placed_by": "AB1234",
//     "order_id": "220303000308932",
//     "exchange_order_id": "1000000001482421",
//     "parent_order_id": null,
//     "status": "COMPLETE",
//     "status_message": null,
//     "status_message_raw": null,
//     "order_timestamp": "2022-03-03 09:24:25",
//     "exchange_update_timestamp": "2022-03-03 09:24:25",
//     "exchange_timestamp": "2022-03-03 09:24:25",
//     "variety": "regular",
//     "exchange": "NSE",
//     "tradingsymbol": "SBIN",
//     "instrument_token": 779521,
//     "order_type": "MARKET",
//     "transaction_type": "BUY",
//     "validity": "DAY",
//     "product": "CNC",
//     "quantity": 1,
//     "disclosed_quantity": 0,
//     "price": 0,
//     "trigger_price": 0,
//     "average_price": 470,
//     "filled_quantity": 1,
//     "pending_quantity": 0,
//     "cancelled_quantity": 0,
//     "market_protection": 0,
//     "meta": {},
//     "tag": null,
//     "guid": "XXXXXX"
// }
