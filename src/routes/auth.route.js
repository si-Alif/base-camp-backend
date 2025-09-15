import { Router } from "express";
import { login_user, registerUser} from "../controller/auth.controller.js";
import {user_login_validator, user_register_validator} from "../validator/index.js"
import { validate } from "../middleware/validator.middleware.js";


const router = Router();

// what happens :
// whenever someone hits /api/v1/auth/register route , authority is handled to registerUser controller by app.use()
// But before the request flow reaches the controller , there's a validator that needs to be executed . This validator is user_register_validator()
// Yep , this is executed not referenced . What it does is it executes all the validation tests by extracting the data from the req.body and validate them
// Now , the validation results can either be that all the cases passed or some failed .
// Whatever happens , it's passed to the middleware validate , here it's references in between the validator and the controller .
// According to the logic on validate() , if the validation passed then the request flow reaches the controller via next()
// else in this case the middleware catches all the errors in an array and then throws an error to the user . So the flow stops and it never reaches to the controller
router.route("/register").post(user_register_validator() , validate , registerUser);
router.route("/login").post(user_login_validator() , validate ,login_user); // TODO : add validator


export {router as authRouter};