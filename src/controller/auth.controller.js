import { User } from "../models/user.models.js";
import { API_response } from "../utils/API_response.js";
import { API_error } from "../utils/API_error.js";
import { asyncHandler } from "../utils/async_handlers.js";
import { sendmail , email_verification_template } from "../utils/mail.js";

const generate_ST_RT = async (user_id) =>{
  try {
    const user = await User.findById(user_id);
    const AT = user.generate_access_token();
    const RT = user.generate_refresh_token();
    user.refresh_token = RT;
    await user.save({validateBeforeSave : false});
    return {AT , RT};
  } catch (error) {
    throw new API_error(500 , "Internal Server Error while generating ST and RT" );
  }
}

const registerUser = asyncHandler(async (req , res)=>{
  // destructure the req.body json
  const {email , username , password , role , avatar} = req.body

  const user_exists = await User.findOne({
    $or : [
      {email : email},
      {username : username}
    ]
  })

  if(user_exists) {
    throw new API_error(409 , "User already exists with this email or username" , []);
  }

  try {
    const new_user = await User.create({
      avatar : avatar,
      email : email,
      username : username,
      password : password,
      role : role,
      is_email_verified : false,
    })

    const {
      unhashed_token,
      hashed_token,
      token_expiry
    } = new_user.generate_temporary_token();

    new_user.email_verification_token = hashed_token;
    new_user.email_verification_token_expiry = token_expiry;
    // No need to validate before saving as it is a new user and I know what I'm doing
    await new_user.save({validateBeforeSave : false});

    await sendmail({
      email : new_user?.email,
      subject : "Email Verification",
      mailgen_content : email_verification_template(new_user.username ,  `${req.protocol}://${req.get("host")}/api/v1/users/auth/verify-email/${unhashed_token}`)

    })

    const created_user = await User.findById(new_user._id).select(
      "-password -email_verification_token -email_verification_token_expiry"
    );

    if(!created_user) throw new API_error(500 , "Internal Server Error while searching for the created user");

    return res
              .status(201)
              .json(
                new API_response(201 , {user : created_user} , "User registered successfully and sent verification email")
              )
  }
  catch(err) {
    console.log(err);
    throw new API_error(500 , "Internal Server Error while registering a new user");
  }

})

const login_user = asyncHandler(async (req , res)=>{
  const {email , password , username} = req.body

  // if(!username || !email) throw new API_error(400 , "Username or email is required");
  if(!email) throw new API_error(400 , "Email is required");
  const user = await User.findOne({email : email});

  if(!user) throw new API_error(404 , "User not found");

  const is_pass_correct = await user.is_password_correct(password);

  if(!is_pass_correct) throw new API_error(401 , "Password is incorrect");

  const {AT , RT} = await generate_ST_RT(user._id);

  const logged_in_user = await User.findById(user._id).select(
    "-password -email_verification_token -email_verification_token_expiry"
  );

  if(!logged_in_user) throw new API_error(500 , "Internal Server Error while searching for the created user");

  const options = {
    httpOnly :true ,
    secure : true
  }

  return res
            .status(200)
            .cookie("access_token" ,AT , options)
            .cookie("refresh_token" , RT , options)
            .json(
              new API_response(200 , {user : logged_in_user , access_token :AT} , "User logged in successfully")
            )
  }
)


export {registerUser , generate_ST_RT , login_user}