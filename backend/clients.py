from tavily import AsyncTavilyClient
import os
from agents import OpenAIChatCompletionsModel, AsyncOpenAI
from dotenv import load_dotenv, find_dotenv 

__ : bool = load_dotenv(find_dotenv())

tavily_api_key: str | None = os.getenv("TAVILY_API_KEY")
gemini_api_key: str | None = os.getenv("GEMINI_API_KEY")


tavily_client : AsyncTavilyClient = AsyncTavilyClient(
    api_key=tavily_api_key,
)

external_client: AsyncOpenAI = AsyncOpenAI(
    api_key=gemini_api_key,
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
)

# defining which llm model to use
llm_model: OpenAIChatCompletionsModel = OpenAIChatCompletionsModel(
    model="gemini-2.5-flash",
    openai_client=external_client,
)
