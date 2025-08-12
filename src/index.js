// // require('dotenv').config()

import dotenv from "dotenv";
dotenv.config({ path: "./.env" });
import connectDB from "./db/index.js";



connectDB()






// Approach 1:-
/*

import dotenv from "dotenv";
dotenv.config({ path: "./.env" });
import mongoose from "mongoose";
import { DB_NAME } from "./constants.js";
import express from "express";

const app = express();
(async () => {
  try {
    await mongoose.connect(`${process.env.MONGO_URL}/${DB_NAME}`);

    app.get("/", (req, res) => {
      res.send("connecteddd");
    });

    app.listen(process.env.PORT, () => {
      console.log(`App listening at http://localhost:${process.env.PORT}`);
    });
  } catch (error) {
    console.log("Error:", error);
  }
})();

*/