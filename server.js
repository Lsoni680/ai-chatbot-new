import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import OpenAI from "openai";

// 1️⃣ Initialize Express app
const app = express();
const port = 3000;

// 2️⃣ Initialize OpenAI client
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 3️⃣ Middleware
app.use(cors({ origin: "*" }));
app.use(bodyParser.json());

// 4️⃣ Test GET route
app.get("/", (req, res) => {
  res.send("Server is working!");
});

// 5️⃣ Chat POST route
app.post("/chat", async (req, res) => {
  const { message } = req.body;

  if (!message) return res.json({ reply: "No message received" });

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: "You are a helpful chatbot." },
        { role: "user", content: message }
      ]
    });

    res.json({ reply: response.choices[0].message.content });
  } catch (err) {
    console.log("OpenAI API Error:", err);
    res.status(500).json({ reply: "Error from AI" });
  }
});

// 6️⃣ Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
