import { Router } from "express";
import { forgot_password_request, forgot_password_reset_handler, get_current_user, login_user, logout_user, refresh_access_token, registerUser , resend_email_verification, reset_password, verify_email} from "../controller/auth.controller.js";
import {forgot_password_request_validator, forgot_password_reset_validator, user_change_current_password_validator, user_login_validator, user_register_validator} from "../validator/index.js"
import { validate } from "../middleware/validator.middleware.js";
import { verify_jwt } from "../middleware/auth.middleware.js";


const router = Router();

// what happens :
// whenever someone hits /api/v1/auth/register route , authority is handled to registerUser controller by app.use()
// But before the request flow reaches the controller , there's a validator that needs to be executed . This validator is user_register_validator()
// Yep , this is executed not referenced . What it does is it executes all the validation tests by extracting the data from the req.body and validate them
// Now , the validation results can either be that all the cases passed or some failed .
// Whatever happens , it's passed to the middleware validate , here it's references in between the validator and the controller cause the request flow will be handled by next() if validation is confirmed  .
// According to the logic on validate() , if the validation passed then the request flow reaches the controller via next()
// else in this case the middleware catches all the errors in an array and then throws an error to the user . So the flow stops and it never reaches to the controller

// 💀 unsecured routes
router.route("/register").post(user_register_validator() , validate , registerUser);
router.route("/login").post(user_login_validator() , validate ,login_user); // TODO : add validator

// params placeholder : "/api/v1/auth/endpoint/:<param_name>"
// The param name you give here will be used in the controller as req.params.<param_name> for retrieval
router.route("/verify-email/:email_verification_token").get(verify_email);
router.route("/forgot-password-request").post(forgot_password_request_validator() , validate , forgot_password_request);
router.route("/forgot-password-reset/:token").post(forgot_password_reset_validator() , validate , forgot_password_reset_handler);

//✅ secure routes
router.route("/logout").post(verify_jwt , logout_user); // TODO : add validator
router.route("/get-current-user").get(verify_jwt , get_current_user)
router.route("/change-password").post(verify_jwt , user_change_current_password_validator() , validate , reset_password);
router.route("/refresh-access-token").post(verify_jwt , refresh_access_token);
router.route("/resend-email-verification").post(verify_jwt  , resend_email_verification);


export {router as authRouter};