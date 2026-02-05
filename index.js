import OpenAI from "openai";
import readline from "readline";

import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


// Setup command line input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log("Chatbot is ready! Type your message:");

rl.on("line", async (input) => {
  const response = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: "You are a helpful customer support chatbot." },
      { role: "user", content: input }
    ]
  });

  console.log("Bot:", response.choices[0].message.content);
});
