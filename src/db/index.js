import mongoose from "mongoose";

const connectDB = async() => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅MongoDB connected...");
  } catch (error) {
    console.error("❌MongoDB connection error...\n\t" , error);
    process.exit(1);
  }
}

export {connectDB}
