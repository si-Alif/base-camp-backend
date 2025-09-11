import mongoose , {Schema} from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const default_avatar = ["https://static.vecteezy.com/system/resources/previews/020/168/486/non_2x/cheerful-neat-man-flat-avatar-icon-with-green-dot-editable-default-persona-for-ux-ui-design-profile-character-picture-with-online-status-indicator-color-messaging-app-user-badge-vector.jpg", "https://static.vecteezy.com/system/resources/previews/020/168/716/non_2x/woman-with-bun-hairstyle-flat-avatar-icon-with-green-dot-editable-default-persona-for-ux-ui-design-profile-character-picture-with-online-status-indicator-colorful-messaging-app-user-badge-vector.jpg", "https://img.freepik.com/premium-vector/avatar-icon-illustration-woman_1031929-3.jpg", "https://img.freepik.com/premium-vector/avatar-icon-illustration-woman_1031929-1.jpg?w=360", "https://img.freepik.com/premium-vector/person-with-blue-shirt-that-says-name-person_1029948-7040.jpg?semt=ais_hybrid&w=740&q=80" ];

const user_schema = new Schema(
  {
    avatar:{
      type:{
        url : String,
        localPath : String,
      },
      default :{
        url : default_avatar.at(Math.random() * default_avatar.length),
        localPath  : ""
      }
    },
    username :{
      type : String,
      required :[true , "Username is required"] ,
      unique : [true , "Username already exists"] ,
      lowercase : true,
      trim: true ,
      index : true ,
    },
    email :{
      type : String,
      required :[true , "Email is required"] ,
      unique : [true , "User with same email already exists"] ,
      lowercase : true,
      trim: true ,
      index : true ,
    },
    full_name:{
      type : String,
      required :false ,
      trim : true
    },
    last_name :{
      type : String,
      required :false ,
      trim : true
    },
    password :{
      type : String,
      // required is true by default . If someone forgets to provide a password this error 2nd element in the array will be thrown
      required :[true , "Password is required"]
    },
    is_email_verified:{
      type :Boolean ,
      default : true
    },
    refresh_token:{
      type : String,
    },
    forgot_password :{
      type :String,
    },
    forgot_password_expiry:{
      type :Date
    },
    email_verification_token :{
      type :String
    },
    email_verification_token_expiry :{
      type :Date
    },
    role :{
      type : String,
      enum : ["admin" , "project_admin" , "member"] ,
      default : "member"
    }
  },
  {
    // To add createdAt and updatedAt
    timestamps : true
  }
);

// pre-hook to hash the password
user_schema.pre(
  "save" ,
  async function(next) {
    // The pre-hook executes each time the schema object is manipulated or in this case saved as the property suggests which can lead to password mismatch as the hashed password will be hashed again which will lead to mismatch of password with user one and the stored one when decrypted
    if(!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password , 10);
    next();
  }
);

user_schema.methods.is_password_correct = async function (password){
  return await bcrypt.compare(password , this.password)
};

user_schema.methods.generate_access_token = function (){
  return jwt.sign(
    {
      _id: this._id,
      email : this.email,
      username : this.username,
    },
    process.env.ACCESS_tOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_tOKEN_EXPIRY,
    },
  )
}

user_schema.methods.generate_refresh_token = function (){
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    },
  )
}

user_schema.methods.generate_temporary_token = function (){
  const unhashed_token = crypto.randomBytes(32).toString("hex");
  const hashed_token = crypto.createHash("sha256").update(unhashed_token).digest("hex");

  const token_expiry = Date.now() + (5*60*1000);

  return {
    unhashed_token ,
    hashed_token ,
    token_expiry
  };

}

export const User = mongoose.model("User" , user_schema );
