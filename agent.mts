import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";

// 1. Set your API keys (replace with your own keys)
process.env.OPENAI_API_KEY = "xxxxxxxxxxxxxxxxxx";   // Get from OpenAI
process.env.TAVILY_API_KEY = "xxxxxxxxxxxxxxxxxx"; // Get from Tavily

async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 4️⃣ Define tools (robot’s hands)
const agentTools = [new TavilySearchResults({ maxResults: 3 })];

// 5️⃣ Define model (robot’s brain) with retries
const agentModel = new ChatOpenAI({
  model: "gpt-3.5-turbo", // smaller/faster model
  temperature: 0,
  maxRetries: 3,
});

// 6️⃣ Memory (robot’s notebook)
const agentCheckpointer = new MemorySaver();

// 7️⃣ Create agent
const agent = createReactAgent({
  llm: agentModel,
  tools: agentTools,
  checkpointSaver: agentCheckpointer,
});

// 8️⃣ Safe invoke function with retries & fallback
async function safeInvoke(message: string, threadId: string) {
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    try {
      const result = await agent.invoke(
        { messages: [new HumanMessage(message)] },
        { configurable: { thread_id: threadId } }
      );
      // Return last message from agent
      return result.messages[result.messages.length - 1].content;
    } catch (error: any) {
      if (error.message.includes("MODEL_RATE_LIMIT")) {
        attempts++;
        console.log(`Rate limit hit. Waiting before retrying... attempt ${attempts}`);
        // Longer exponential backoff: 5s, 10s, 15s...
        await wait(5000 * attempts);
      } else {
        // Any other error, return fallback
        console.log("Error occurred, returning fallback answer.");
        return "Sorry, I cannot fetch the answer right now. 🌤️";
      }
    }
  }

  // Fallback after max retries
  console.log("Max retries reached. Returning fallback answer.");
  return "Sorry, API is busy. Weather info is temporarily unavailable. 🌤️";
}

// 9️⃣ Run example queries (one at a time)
const run = async () => {
  console.log("Asking about Azamgarh weather...");
  const azamgarhWeather = await safeInvoke("What is the current weather in Azamgarh?", "42");
  console.log("Azamgarh Weather:", azamgarhWeather);

  console.log("\nAsking about Dubai weather...");
  const nyWeather = await safeInvoke("What about Dubai ?", "42");
  console.log("Dubai Weather:", nyWeather);
};

run();