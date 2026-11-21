const nodemailer = require("nodemailer");
const config = require("../config");

function isConfigured() {
    return !!(config.mail.host && config.mail.user && config.mail.pass);
}

async function sendMail({ to, subject, text }) {
    if (!isConfigured()) {
        console.log("===== EMAIL (chưa cấu hình SMTP) =====");
        console.log("To:", to);
        console.log("Subject:", subject);
        console.log(text);
        console.log("=====================================");
        return;
    }
    const transporter = nodemailer.createTransport({
        host: config.mail.host,
        port: Number(config.mail.port) || 587,
        secure: Number(config.mail.port) === 465,
        auth: { user: config.mail.user, pass: config.mail.pass },
    });
    await transporter.sendMail({
        from: config.mail.from || config.mail.user,
        to,
        subject,
        text,
    });
}

module.exports = { sendMail, isConfigured };
