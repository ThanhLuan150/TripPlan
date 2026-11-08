import express from "express";
import { configDotenv } from "dotenv";
import cors from "cors";
import connect from "./config/db/mongoose.js";
import route from "./routers/index.js";
import bodyParser from "body-parser";
import morgan from "morgan";
configDotenv();
connect();

const server = express();
server.use(bodyParser.json())
server.use(cors())
server.use(morgan());

route(server)
server.listen(process.env.PORT, () => {
    console.log(`Listening at ${process.env.PORT}`);
})
