import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import OpenAI from "openai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

// ES module fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Temporary in-memory storage
const users = [];

// Serve frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// OpenAI setup
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

//////////////////////////////////////////////////////
// AUTH MIDDLEWARE
//////////////////////////////////////////////////////
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader)
    return res.status(401).json({ message: "Unauthorized" });

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(403).json({ message: "Invalid token" });
  }
}

//////////////////////////////////////////////////////
// REGISTER
//////////////////////////////////////////////////////
app.post("/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: "Missing fields" });

  const existingUser = users.find(u => u.email === email);
  if (existingUser)
    return res.status(400).json({ message: "User already exists" });

  const hashedPassword = await bcrypt.hash(password, 10);

  users.push({
    email,
    password: hashedPassword,
    chats: []
  });

  res.json({ message: "User registered successfully" });
});

//////////////////////////////////////////////////////
// LOGIN
//////////////////////////////////////////////////////
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = users.find(u => u.email === email);
  if (!user)
    return res.status(400).json({ message: "Invalid credentials" });

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword)
    return res.status(400).json({ message: "Invalid credentials" });

  const token = jwt.sign(
    { email: user.email },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ token });
});

//////////////////////////////////////////////////////
// LOAD CHAT HISTORY (Your frontend needs this!)
//////////////////////////////////////////////////////
app.get("/history", authenticate, (req, res) => {
  const user = users.find(u => u.email === req.user.email);
  if (!user) return res.json([]);

  res.json(user.chats || []);
});

//////////////////////////////////////////////////////
// CHAT (STREAMING)
//////////////////////////////////////////////////////
app.post("/chat", authenticate, async (req, res) => {
  const { message } = req.body;

  if (!message)
    return res.status(400).json({ message: "Message missing" });

  let fullReply = "";

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: "You are a helpful chatbot." },
        { role: "user", content: message }
      ],
      stream: true,
    });

    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Transfer-Encoding", "chunked");

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullReply += content;
        res.write(content);
      }
    }

    // Save chat
    const user = users.find(u => u.email === req.user.email);
    if (user) {
      user.chats.push({ message, reply: fullReply });
    }

    res.end();

  } catch (err) {
    console.error("OpenAI Error:", err);
    res.status(500).end("OpenAI error");
  }
});

//////////////////////////////////////////////////////
// IMPORTANT FOR RENDER
//////////////////////////////////////////////////////
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});
