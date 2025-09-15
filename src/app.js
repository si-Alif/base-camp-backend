import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();


app.use(express.json({limit: "16kb"})) // use is a middleware that stands between the request and the main controller function . All this does is pre-process the incoming data and some conditionals . Here by using express.json() we are able to access json request bodies from the request object

app.use(express.urlencoded({extended:true , limit: "16kb"})) // parse the url and retrieve data from it . Used extended true as
app.use(express.static("public"))

//cors conf.


app.use(cors(
  {
    origin: process.env.CORS_ORIGIN?.split(",") || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE" , "PATCH" , "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  }
));

app.use(cookieParser());

// healthCheck route setup
import healthCheckRoute from "./routes/healthCheck.route.js";
import { authRouter } from "./routes/auth.route.js";

app.use("/api/v1/healthcheck" , healthCheckRoute); // whenever someone hits /api/v1/healthcheck route , authority is handled to healthCheckRoute by app.use()
app.use("/api/v1/auth" , authRouter);
export default app;
