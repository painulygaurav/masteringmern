import express from "express";
import nodemailer from "nodemailer";

const app = express();
app.use(express.json());

// Setting up transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "abc@gmail.com",
    pass: "placeholder password",
  },
});

const mailOptions = {
  from: "example@gmail.com",
  to: "abc@gmail.com",
  subject: "test subject",
  text: "test text",
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) throw error;
  console.log("email sent" + info.response);
});

app.listen(3000, () => {
  console.log("Server is running");
});

/**
 * It's time to mail the user that order has been received.
 * Nodemailer use SMTP which uses UDP as a protocol
 */
