import { body } from "express-validator";


const user_register_validator = () => {
  console.log("hello")
  return [
    body("email")
        .trim()
        //part 1
        .notEmpty()
        .withMessage("Email is required")
        // this works as : "Hey execute .notEmpty() , if somehow it fails then execute .withMessage() and terminate the flow right there"
        //part : 2
        .isEmail()
        .withMessage("Please enter a valid email address"),
        // again this works as : "Hey execute .isEmail() , if somehow it fails then execute .withMessage() and terminate the flow right there"

    // another validation check
    body("username")
        .trim()
        .isEmpty()
        .withMessage("Username is required")
        .isLowercase()
        .withMessage("Username must be lowercase")
        .isLength({min : 4 , max : 20})
        .withMessage("Username must be between 4 and 20 characters long"),

    body("password")
        .trim()
        .isEmpty()
        .withMessage("Password is required")
        .isLength({min : 6})
        .withMessage("Password must be at least 6 characters long"),
    body("full_name")
        .optional() // saying , "Hey there acn be a field called full_name . If it's there go ahead and validate it . If not terminate this checkpoint"
        .trim()
        .isEmpty()
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
        .isLength({min: 4 , max : 20})
        .withMessage("Password must be between 4 and 20 characters long")
  ]
}

export {user_register_validator , user_login_validator};