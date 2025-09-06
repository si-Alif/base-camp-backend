import { Router } from "express";

import { healthCheck } from "../controller/healthCheck.controller.js";

const router = Router();

router.route('/').get(healthCheck); // as app.use() handles the authority there to this route , it comes to this route to do what it is supposed to do . In this case it calls the healthCheck controller 


export default healthCheck ;