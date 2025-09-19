import { body } from "express-validator";


const user_register_validator = () => {
  return [
    body("email")
        .trim()
        //part 1
        .notEmpty() // not empty then proceed otherwise terminate along with "withMessage()"
        .withMessage("Email is required")
        // this works as : "Hey execute .notEmpty() , if somehow it fails then execute .withMessage() and terminate the flow right there"
        //part : 2
        .isEmail()
        .withMessage("Please enter a valid email address"),
        // again this works as : "Hey execute .isEmail() , if somehow it fails then execute .withMessage() and terminate the flow right there"

    // another validation check
    body("username")
        .trim()
      // .isEmpty() --> ❌checks if the value IS empty and returns error if it's NOT empty
        .notEmpty()
        .withMessage("Username is required")
        .isLowercase()
        .withMessage("Username must be lowercase")
        .isLength({min : 4 , max : 20})
        .withMessage("Username must be between 4 and 20 characters long"),

    body("password")
        .trim()
        .notEmpty()
        .withMessage("Password is required")
        .isLength({min : 6})
        .withMessage("Password must be at least 6 characters long"),
    body("full_name")
        .optional() // saying , "Hey there acn be a field called full_name . If it's there go ahead and validate it . If not terminate this checkpoint"
        .trim()
        .notEmpty()
        .withMessage("Can't instantiate with an empty full name field")
  ]
};

const user_login_validator = () =>{
  return [
    body("email")
        .optional()
        .trim()
        .isEmail()
        .withMessage("Please enter a valid email"),
    body("password")
        .trim()
        .notEmpty()
        .withMessage("Password is required")
        .isLength({min: 6 })
        .withMessage("Password must be between 4 and 20 characters long")
  ]
}

const user_change_current_password_validator = () =>{
  return [
    body("old_pass")
        .trim()
        .notEmpty()
        .withMessage("Old Password is required")
        .isLength({min: 6 })
        .withMessage("Password must be between 4 and 20 characters long"),

    body("new_pass")
        .trim()
        .notEmpty()
        .withMessage("New Password is required")
        .isLength({min: 6 })
        .withMessage("Password must be between 4 and 20 characters long"),
  ]
}

const forgot_password_request_validator = () =>{
  return [
    body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Please enter a valid email address"),
  ]
}

const forgot_password_reset_validator = () =>{
  return [
    body("password")
        .trim()
        .notEmpty()
        .withMessage("Password is required")
        .isLength({min: 6 })
        .withMessage("Password must be between 6 and 20 characters long"),
  ]
}


export {
  user_register_validator ,
  user_login_validator ,
  user_change_current_password_validator ,
  forgot_password_request_validator ,
  forgot_password_reset_validator

};