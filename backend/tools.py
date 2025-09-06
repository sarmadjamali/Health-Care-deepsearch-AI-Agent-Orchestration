from agents import function_tool, RunContextWrapper
from dataclasses import dataclass
from clients import tavily_client
from pydantic import BaseModel

class UserQuerie(BaseModel):
    email: str
    query: str
    enable_deepsearch: bool
    is_doctor: bool

@dataclass
class UserInfo:
    name: str
    doctor: bool
    enable_deepsearch: bool
    
    
class Login_Class(BaseModel):
    email: str
    password: str   
    
class Signup_Class(Login_Class):
    name: str
    isDoctor: bool = False

class UserAnswer(BaseModel):
    email: str
    answer: str
    
    
@function_tool
def get_premium_user(userContext: RunContextWrapper[UserInfo]) -> str:
    print(f"User context: {userContext.context}")
    if userContext.context.location == "Pakistan":
        return "You are a premium user from Pakistan"
    elif userContext.context.location == "India":
        return "You are a premium user from India"
    else:
        return "You are a free user"

@function_tool
async def web_search(query: str) -> str:
    print(f"Searching the web for: {query}")
    response = await tavily_client.search(query=query, max_results=5)
    return response 


@function_tool
async def extract_url(urls: list) -> dict:
    print(f"Extracting URLs from: {urls}")
    response = await tavily_client.extract(urls)
    return response 


@function_tool(description_override="This tool is  used for asking questions from the user.")
def question_from_user(question: str) -> str:
    print(f"Question for user: {question}")
    # answer = input(f"{question}\t")
    return {    
        "type": "ask_user",
        "question": question
    }