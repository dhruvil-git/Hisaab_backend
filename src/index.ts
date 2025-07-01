import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from "bcrypt";
import jwt from 'jsonwebtoken';
import nodemailer from "nodemailer";
import { PrismaClient } from '@prisma/client';
import { CheckUsername, CheckEmail, CreateUser, ValidateUser, GenerateToken } from "./lib/auth";
import { AddTransaction, LendTrans } from "./lib/addTransaction";
import db from "./lib/db";


dotenv.config();
const app = express();
const prisma = new PrismaClient();
app.use(cors());
app.use(express.json());

const SECRET_KEY = process.env.JWT_SECRET || "Secret_of_JWT";
const saltRounds = 11;

app.get('/', (req, res) => {
  res.send("Hisaab API running!");
});

app.get('/settlement', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Missing token" });
  }

  try {
    const payload = jwt.verify(token, SECRET_KEY);
    const username = typeof payload === "object" && (payload as jwt.JwtPayload)?.username;

    if (!username) {
      return res.status(403).json({ error: "Invalid token payload" });
    }

    const data = await prisma.others.findMany({
      where: {
        userId: username,
        balance: {
          not: 0,
        },
      },
    });

    return res.status(200).json(data);
  } catch (err) {
    console.error("JWT error:", err);
    return res.status(403).json({ error: "Invalid token" });
  }
});



app.post('/login', async (req, res) => {
  const { email, username, password } = req.body;

  try {
    const user = await ValidateUser(password, email, username);

    if (!user) {
      return res.status(401).json({ error: "Invalid Credentials" });
    }

    const token = GenerateToken(user);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



app.post('/logout', async (req, res) => {
  try {

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });

  } catch (error) {
    console.error("Logout Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});



app.patch('/profile/password', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Missing token" });
  }

  try {
    const payload = jwt.verify(token, SECRET_KEY) as { username?: string };

    const username = payload?.username;
    if (!username) {
      return res.status(403).json({ error: "Invalid token" });
    }

    const { oldPass, newPass } = req.body;

    if (!oldPass || !newPass) {
      return res.status(400).json({ error: "Both passwords are required" });
    }

    const user = await prisma.user.findFirst({ where: { username } });

    if (!user || !(await bcrypt.compare(oldPass, user.password))) {
      return res.status(403).json({ error: "Incorrect current password" });
    }

    const hashedPassword = await bcrypt.hash(newPass, saltRounds);

    await prisma.user.update({
      where: { username },
      data: { password: hashedPassword },
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Password change error:", err);
    return res.status(500).json({ error: "Internal error" });
  }

});



app.patch('/profile/name', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Missing token" });
  }

  try {
    const payload = jwt.verify(token, SECRET_KEY) as { username?: string };
    const username = payload?.username;

    if (!username) {
      return res.status(403).json({ error: "Invalid token" });
    }

    const { newName } = req.body;

    if (!newName || typeof newName !== "string") {
      return res.status(400).json({ error: "Invalid name" });
    }

    const updatedUser = await prisma.user.update({
      where: { username },
      data: { name: newName },
    });

    return res.status(200).json({ success: true, name: updatedUser.name });
  } catch (err) {
    console.error("Name update error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
});



app.get('/profile', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Missing token" });
  }

  try {
    const payload = jwt.verify(token, SECRET_KEY) as { username?: string };
    const username = payload?.username;

    if (!username) {
      return res.status(403).json({ error: "Invalid token" });
    }

    const user = await prisma.user.findFirst({
      where: { username },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
      },
    });

    return res.status(200).json(user);
  } catch (err) {
    console.error("Token verification error:", err);
    return res.status(403).json({ error: "Invalid token" });
  }
});



app.post('/sendotp', async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ success: false, error: "Missing fields" });
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"Hisaab Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your OTP Code",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9fafb; color: #111; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #e67e22;">🔐 Email Verification</h2>
        <p>Hello,</p>
        <p>Thank you for signing up! Please use the following OTP to verify your email address:</p>
        <div style="font-size: 24px; font-weight: bold; color: #2ecc71; margin: 20px 0;">${otp}</div>
        <p>This code will expire in 10 minutes. Do not share it with anyone.</p>
        <hr style="margin-top: 30px;" />
        <p style="font-size: 12px; color: #666;">If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Email sending error:", error);
    return res.status(500).json({ success: false, error: "Email send failed" });
  }
});



app.post('/signup', async (req, res) => {
  const { name, email, username, password } = req.body;

  try {
    if (await CheckUsername(username)) {
      return res.status(401).json({ error: "Username not available" });
    }

    if (await CheckEmail(email)) {
      return res.status(401).json({ error: "Email Id already registered" });
    }

    await CreateUser(name, email, username, password);

    const user = await ValidateUser(password, email, username);

    if (!user) {
      return res.status(401).json({ error: "Auto-login failed after registration" });
    }

    const token = GenerateToken(user);

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }

});



app.post('/trans', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ success: false, error: "No auth token provided" });
    }

    let username: string | undefined;
    try {
      const payload = jwt.verify(token, SECRET_KEY);
      if (typeof payload === "object" && payload !== null && "username" in payload) {
        username = (payload as jwt.JwtPayload).username as string;
      }
    } catch {
      return res.status(403).json({ success: false, error: "Invalid or expired token" });
    }

    if (!username) {
      return res.status(400).json({ success: false, error: "Username not found in token" });
    }

    const { trans, From, to, amt, desc } = req.body;

    if (!to || !amt || isNaN(Number(amt))) {
      return res.status(400).json({ success: false, error: "Missing or invalid parameters" });
    }

    if (trans) {
      await AddTransaction(username, to, amt, desc || "");
    } else {
      if (!From) {
        return res.status(400).json({ success: false, error: "Missing 'From' in lend transaction" });
      }
      await LendTrans(From, username, to, amt, desc || "");
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Transaction error:", err);
    return res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});



app.get('/transactions', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Missing token" });
  }

  try {
    const payload = jwt.verify(token, SECRET_KEY);
    const username = typeof payload === "object" && (payload as jwt.JwtPayload)?.username;

    if (!username) {
      return res.status(403).json({ error: "Invalid token payload" });
    }

    const data = await prisma.transaction.findMany({
      where: { userId: username },
      orderBy: { Time: "desc" },
    });

    return res.status(200).json(data);
  } catch (err) {
    console.error("JWT error:", err);
    return res.status(403).json({ error: "Invalid token" });
  }
});



app.get('/users', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Missing token" });
  }

  try {
    const payload = jwt.verify(token, SECRET_KEY) as jwt.JwtPayload;
    const username = payload.username as string | undefined;

    if (!username) {
      return res.status(403).json({ error: "Username not found in token" });
    }

    const users = await db(username);
    return res.status(200).json(users);
  } catch (e) {
    console.error("JWT verification failed:", e);
    return res.status(403).json({ error: "Invalid or expired token" });
  }
})

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend running at http://localhost:${PORT}`));
