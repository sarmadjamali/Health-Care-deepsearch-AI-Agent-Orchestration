from agents import Agent, Runner, ItemHelpers, RunContextWrapper, handoff, SQLiteSession
import os
from dotenv import load_dotenv, find_dotenv
from openai.types.responses import ResponseTextDeltaEvent
import json
import sys
from lead_agent import lead_research_agent
from tools import UserInfo, question_from_user, web_search
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from tools import UserQuerie, Login_Class, Signup_Class, UserAnswer
from clients import llm_model
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict
import asyncio

app = FastAPI()
origins = [
    "http://localhost:3000",   # React/Next.js local dev
    "http://127.0.0.1:3000",
    "https://your-frontend-domain.com"  # production domain
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

__: bool = load_dotenv(find_dotenv())
os.environ['OPENAI_API_KEY'] = os.getenv("OPENAI_API_KEY")


def load_users():
    if os.path.exists("user_settings.json"):
        with open("user_settings.json", "r") as file:
            return json.load(file)
    return []


def save_users(users):
    with open("user_settings.json", "w") as file:
        json.dump(users, file, indent=4)


def match_user_by_email(email: str):
    users = load_users()
    for user in users:
        try:
            if user["email"].strip().lower() == email.strip().lower():
                return user
        except KeyError as e:
            print(f"Key error: {e}. Please check the user settings file.")
            sys.exit(1)
            break
    return None


@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.post("/signup")
def save_user(user_data: Signup_Class):
    print(user_data.name, user_data.isDoctor,
          user_data.email, user_data.password)
    if not user_data.email or not user_data.password:
        raise HTTPException(
            status_code=400, detail="Email and password required")
    users = load_users()

    for user in users:
        try:
            if user["email"].strip().lower() == user_data.email:
                return {"message": "User already exists!"}
        except KeyError as e:
            print(f"Key error: {e}. Please check the user settings file.")
            sys.exit(1)
            break

    users.append(user_data.dict())
    save_users(users)
    print("User saved successfully.")
    return {"message": "User saved successfully!", "status": 200}


@app.post("/login")
def login_user(user_data: Login_Class):

    if not user_data.email or not user_data.password:
        raise HTTPException(
            status_code=400, detail="Email and password required")

    users = load_users()

    for user in users:
        try:
            if user["email"].strip().lower() == user_data.email and user["password"] == user_data.password:
                return {"message": "User logged in successfully!", "user_found": True, "status": 200}
        except KeyError as e:
            print(f"Key error: {e}. Please check the user settings file.")
            sys.exit(1)
            break

    print("User logged in successfully.")
    return {"message": "No user found with that email.", "user_found": False}


def instructions_for_requirement_agent(userContext: RunContextWrapper[UserInfo], agent: Agent[UserInfo]) -> str:
    print(f"user search settings {userContext.context}")
    if userContext.context.enable_deepsearch:
        return f""""You are requirement gathering agent for medical industry, Your job is to collect clear,
    complete, and structured requirements from the user for their querie,
    then delegate to the Planning Agent to create a plan to fulfill those requirements.
    User name is {userContext.context.name} and he is {'doctor' if userContext.context.doctor else 'patient'}."""
    else:
        return f"""You are simple medical agent. Answer the user query in minimum 5 bullet points.
        Do not use any other agent.Use only web search for searching purpose and
        question_from_user tool for asking question from user."""


class CustomerSupportBot:
    def __init__(self):
        self.agent = Agent(
            name="Requirement Gathering Agent",
            model=llm_model,
            instructions=instructions_for_requirement_agent,
            tools=[question_from_user, web_search],
            handoffs=[handoff(
                agent=lead_research_agent,
                tool_name_override="Lead_Research_Agent",
                tool_description_override="This agent will take the requirements gathered by the Requirement Gathering Agent and will deep search for the information."
            )]
        )
        self.user_sessions: Dict[str, SQLiteSession] = {}
        # Store pending questions per user
        self.pending_questions: Dict[str, str] = {}

    def get_customer_session(self, user_email: str):
        """Get or create a unique session for a specific customer"""
        if user_email not in self.user_sessions:
            # Create unique session ID for each user
            session_id = f"user_{user_email.replace('@', '_').replace('.', '_')}"
            # session_id = user_email
            self.user_sessions[user_email] = SQLiteSession(
                session_id, "test.db")
        return self.user_sessions[user_email]

    def clear_user_session(self, user_email: str):
        """Completely clear and recreate session for user"""
        if user_email in self.user_sessions:
            try:
                # Clear the session
                session = self.user_sessions[user_email]
                asyncio.create_task(session.clear_session())
                # Remove from our tracking
                del self.user_sessions[user_email]
                print(f"Session cleared and removed for user: {user_email}")
            except Exception as e:
                print(f"Error clearing session for {user_email}: {e}")

    async def run_agent(self, user_query: str, enable_deepsearch: bool, is_doctor: bool, name: str, user_email: str):

        session = self.get_customer_session(user_email)
        user_info = UserInfo(name=name, doctor=is_doctor,
                             enable_deepsearch=enable_deepsearch)
        try:
            result = Runner.run_streamed(
                starting_agent=self.agent,
                input=user_query,
                context=user_info,
                max_turns=20,
                session=session
            )

            if result.final_output:
                # Clear session after final output
                self.clear_user_session(user_email)
                yield {"type": "answer", "output": result.final_output}
                return

            print("Agent Streaming Started...")
            print(f"Searching Started for {name} on topic: {user_query}\n\n")
            async for event in result.stream_events():
                # print(f"\n\nEvent Type: {event}\n\n")
                # # We'll ignore the raw responses event deltas
                if event.type == "raw_response_event":
                    continue

                elif event.type == "agent_updated_stream_event":
                    print(f"Agent updated: {event.new_agent.name}")
                    yield {
                        "type": "agent_update",
                        "output": f"Handing over to : {event.new_agent.name}",
                        "agent_name": event.new_agent.name
                    }
                    continue
            # When items are generated, print them
                elif event.type == "run_item_stream_event":

                    if event.item.type == "tool_call_item":
                        try:

                            tool_name = event.item.raw_item.name
                            tool_args = event.item.raw_item.arguments
                            print(f"-- Tool was called: {tool_name}")
                            print(f"-- Tool arguments: {tool_args}")

                            try:
                                parsed_args = json.loads(tool_args)
                                if tool_name == "web_search" and "query" in parsed_args:
                                    output_message = f"🔍 Searching for: {parsed_args['query']}"
                                elif tool_name == "question_from_user" and "question" in parsed_args:
                                    output_message = f"❓ Asking: {parsed_args['question']}"
                                else:
                                    output_message = f"🔧 Using tool: {tool_name}"
                            except json.JSONDecodeError:
                                output_message = f"🔧 Using tool: {tool_name}"
                        # print(event.item, '/n/n')
                            print(f"-- {output_message}")
                            yield {
                                "type": "tool_call",
                                "output": output_message,
                                "tool_name": tool_name
                            }
                        except AttributeError as e:
                            print(f"Error accessing tool info: {e}")
                            yield {
                                "type": "tool_call",
                                "output": "Tool is being used",
                                "tool_name": "unknown"
                            }

                    elif event.item.type == "tool_call_output_item":
                        # print(f"-- Tool output: {event.item.output}")

                        output_data = None
                        if isinstance(event.item.output, dict):
                            output_data = event.item.output
                        elif isinstance(event.item.output, str):
                            try:
                                output_data = json.loads(event.item.output)
                            except json.JSONDecodeError:
                                pass

                        if output_data and output_data.get("type") == "ask_user":
                            question = output_data.get('question', '')
                            self.pending_questions[user_email] = question
                            yield {"type": "ask_user", "question": question}
                            return
                        # else:
                        #     # Send intermediate tool output
                        #     print(str(event.item.output))
                        #     yield { 
                        #         "type": "intermediate",
                        #         "output": f"Tool completed: {str(event.item.output)[:200]}..."
                        #     }

                    elif event.item.type == "message_output_item":
                        output_text = ItemHelpers.text_message_output(
                            event.item)
                        print(f"\n-- Agent output:\n {output_text}")
                        self.clear_user_session(user_email)
                        yield {"type": "answer", "output": output_text}
                        return
                    else:
                        pass  # Ignore other event types
            print("Stream Completed")
            print(f"last agent: {result.last_agent.name}")

        except Exception as e:
            print(f"Error in agent stream: {e}")
            # Clear session on error too
            self.clear_user_session(user_email)
            yield {"type": "error", "output": f"Error occurred: {str(e)}"}


# Example usage
support_bot = CustomerSupportBot()


@app.websocket("/ws/{user_email}")
async def websocket_endpoint(websocket: WebSocket, user_email: str):
    await websocket.accept()

    try:
        while True:
            # Receive message from frontend
            data = await websocket.receive_text()
            message_data = json.loads(data)

            if message_data["type"] == "query":
                # New query from user
                query = message_data["query"]
                enable_deepsearch = message_data.get(
                    "enable_deepsearch", False)
                is_doctor = message_data.get("is_doctor", False)

                user = match_user_by_email(user_email)
                name = user["name"]

                # Stream the agent response
                async for chunk in support_bot.run_agent(
                    query, enable_deepsearch, is_doctor, name, user_email
                ):
                    await websocket.send_text(json.dumps(chunk))

            elif message_data["type"] == "answer":
                # User answering a question
                answer = message_data["answer"]

                user = match_user_by_email(user_email)
                name = user["name"]

                # Get previous context from pending questions if needed
                enable_deepsearch = message_data.get(
                    "enable_deepsearch", False)
                is_doctor = message_data.get("is_doctor", False)

                # Continue with the answer
                async for chunk in support_bot.run_agent(
                    answer, enable_deepsearch, is_doctor, name, user_email
                ):
                    await websocket.send_text(json.dumps(chunk))

    except WebSocketDisconnect:
        print(f"WebSocket disconnected for user: {user_email}")
        # Clean up session when user disconnects
        support_bot.clear_user_session(user_email)
    except Exception as e:
        print(f"WebSocket error: {e}")
        await websocket.close()


@app.post("/chatendpoint")  # should be POST
async def getting_user_query(user_query: UserQuerie):
    # return {"type": "intermediate", "output": "Agent still running..."}
    support_bot.clear_user_session(user_query.email)
    print("User Query Received:", user_query)
    user = match_user_by_email(user_query.email)
    query = user_query.query
    global enable_deepsearch, is_doctor, name
    enable_deepsearch = user_query.enable_deepsearch
    is_doctor = user_query.is_doctor
    name = user["name"]   # remove the quotes

    final_result = None
    async for chunk in support_bot.run_agent(
        query,
        enable_deepsearch,
        is_doctor,
        name,
        user_query.email
    ):
        if chunk["type"] in ["answer", "ask_user"]:
            final_result = chunk
            break

    return final_result or {"type": "error", "output": "No response received"}


@app.post("/answer_user")
async def answer_user(data: UserAnswer):
    answer = data.answer
    email = data.email
    if not data:
        raise HTTPException(
            status_code=400, detail="No active session for this user")

    user = match_user_by_email(email)
    name = user["name"]

    final_result = None
    async for chunk in support_bot.run_agent(
        answer,
        False,  # You might want to pass these from the request
        False,
        name,
        email
    ):
        if chunk["type"] in ["answer", "ask_user"]:
            final_result = chunk
            break

    return final_result or {"type": "error", "output": "No response received"}
