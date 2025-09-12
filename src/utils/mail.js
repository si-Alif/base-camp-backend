import Mailgen from "mailgen";
import nodemailer from "nodemailer";

const sendmail = async (options)=>{
  const mail_generator_instance = new Mailgen({
    theme : "default",
    product : {
      name : "Task manager",
      link : "https://project-camp.netlify.app"
    }
  })

  const text_format_email = mail_generator_instance.generatePlaintext(options.mailgen_content);
  const HTML_format_email = mail_generator_instance.generate(options.mailgen_content);

  const email_transporter_instance = nodemailer.createTransport({
    host: process.env.MAILTRAP_SMTP_HOST,
    port: process.env.MAILTRAP_SMTP_PORT ,
    auth :{
      user:process.env.MAILTRAP_SMTP_USER,
      pass: process.env.MAILTRAP_SMTP_PASSWORD,
    }
  });

  const mail_instance = {
    from : "mail.basecamp@example.com",
    to : options.email,
    subject : options.subject,
    text : text_format_email,
    html : HTML_format_email,
  }

  try {
    await email_transporter_instance.sendMail(mail_instance);
  }
  catch(err){
    console.error("Email service failed . Make sure you have provided the correct SMTP credentials . \n Error : \n\t" , err);
  }

}

const email_verification_template = (username , verification_url) =>({
    body :{
      name : username,
      intro : "Welcome to Project Camp",
      action : {
        instructions : "To Verify your account, please the following button:",
        button :{
          color :"#22BC66",
          text : "Verify e-mail",
          link : verification_url
        }
      },
      outro : "Need help, or have questions? Just reply to this email, we'd love to help."
    }
}
)

const email_reset_password_template = (username , reset_password_url) =>({
  body :{
    name : username,
    intro : "You have requested to reset your password . Please click the button below to reset your password \n If you did not request this, please ignore this email and don't click the link",
    action : {
      instructions : "To reset your password, please the following button:",
      button :{
        color :"#22BC66",
        text : "Reset Password",
        link : reset_password_url
      }
    },
    outro : "Need help, or have questions? Just reply to this email, we'd love to help."
  }
}
)


export {email_verification_template , email_reset_password_template , sendmail}