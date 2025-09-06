from datetime import datetime
from agents import Agent ,ModelSettings, RunContextWrapper
from dotenv import load_dotenv, find_dotenv
from tools import web_search, extract_url, UserInfo
from clients import llm_model

__ : bool = load_dotenv(find_dotenv())




def search_agent_instructions(user_context : RunContextWrapper[UserInfo], agent: Agent[UserInfo]) -> str:
    enable_deepsearch = user_context.context.enable_deepsearch
    print("Deep search value => ", enable_deepsearch)
    if enable_deepsearch:
        return f"""You are a DeepSearch Agent that searches for medical information online.
            Provides detailed responses if deepsearch is enabled. You have to provide a minimum 400 words response.
            Always use use web search tool and then extract those urls which granted access
            to retrieve content from the url, provide a summary of the content extracted from the urls.
            Use simpler language if the user is a patient, and more technical terms if the user is a doctor.
            Currently, the user is a { 'doctor' if user_context.context.doctor else 'patient' }.
            Currently deepsearch is enabled. When you find conflicting information, 
            highlight it clearly: "Source A says X, but Source B says Y" and let users know there's disagreement."""
    else:
        return f"""You are a helpful medical assistant that provides short and concise responses. 
            You have to provide a response in minimum 5 bullet points.Always use use web search tool and 
            then extract those urls which granted access to retrieve content from the url.
            Use simpler language if the user is a patient, and more technical terms if the user is a doctor.
            Currently, the user is a { 'doctor' if user_context.context.doctor else 'patient' }..""" 
            



search_agent: Agent = Agent(
    name="Search Agent",
    model=llm_model,
    instructions=search_agent_instructions,
    tools=[web_search, extract_url],
    model_settings=ModelSettings(
        temperature=1.5,
        tool_choice="required", 
    )
)

synthesis_agent: Agent = Agent(
    name="Synthesis Agent",
    model=llm_model,
    instructions="""Synthesis Agent that takes all research findings and organizes them into clear sections with themes, trends, and key insights
    rather than just listing facts.""",
    model_settings=ModelSettings(
        max_tokens=4000
    )
)

citation_agent: Agent = Agent(
    name="Citation Agent",
    model=llm_model,
    instructions="You are a Citation Agent that provides citations for the information",
    tools=[web_search],
       model_settings=ModelSettings(
            max_tokens=4000
        )    
)

reflection_agent: Agent = Agent(
    name="Reflection Agent",
    model=llm_model,
    instructions="""Reflect the given information to check is it the correct info or not.Rates sources as: 
    High (.edu, .gov, major news), Medium (Wikipedia, industry sites), or Low (blogs, forums) and warns users about questionable information.""",
    tools=[web_search],
    model_settings=ModelSettings(
        max_tokens=4000
    )
)


planning_agent: Agent = Agent(
    name="Planning Agent",
    model=llm_model,
    instructions="""You are the Planning Agent. Your responsibility is to take the user’s question or request 
    and break it down into smaller, well-defined research tasks. 
    You do not perform the research yourself— you only generate a structured plan.""",
    model_settings=ModelSettings(
        temperature=1.5,
    )
)

def dynamic_instructions(user_context: RunContextWrapper[UserInfo], agent: Agent[UserInfo]) -> str:
    print("Doctor => ", user_context.context.doctor)
    current_time = datetime.now().strftime("%Y-%m-%d")
    if user_context.context.enable_deepsearch:
        return f"""
    You are an Orchestration Agent that orchestrates the workflow of agents for medical related queries.
    Your main goal is to deep search for each user query.
    We follow the structured process for each deep search task:
    1. Use planning agent to create a plan for the research.
    2. Use search agent to search for multiple web pages.
    3. Use synthesis agent to compile the findings into a coherent summary.
    4. Use reflection agent to evaluate the quality and relevance of the information.
    5. Use citation agent to cite the sources of the information.
    
    You can call these tools multiple times if needed. Good researchers explore multiple angles simultaneously.
    Use simpler language if the user is a patient, and more technical terms if the user is a doctor.
    Currently, the user is a { 'doctor' if user_context.context.doctor else 'patient' }.
    Allways use the latest information available as of {current_time} for your responses.
    ."""
    else: 
        return f"""You are simple medical agent. Answer the user query in minimum 5 bullet points.
        Do not use any other agent.Use only searcch agent to search the web for information to answer the user's query."""
    
lead_research_agent: Agent = Agent(
    name="Lead Research Agent",
    model=llm_model,
    instructions=dynamic_instructions,
    tools=[
        planning_agent.as_tool(
            tool_name="Planning_Agent",
            tool_description="This agent will plane the next steps for searching of the medical related information."
        ),
        search_agent.as_tool(
            tool_name="Search_Agent",
            tool_description="Useful for when you need to search the web for information to answer the user's query."
        ),
        synthesis_agent.as_tool(
            tool_name="Synthesis_Agent",
            tool_description="A synthesis agent that takes all research findings and organizes them into clear sections with themes, trends, and key insights."
        ),
        reflection_agent.as_tool(
            tool_name="Reflection_Agent",
            tool_description="A reflective agent that reflects on the best approach to take."
        ),
        citation_agent.as_tool(
            tool_name="Citation_Agent",
            tool_description="A citation agent to provide citations for the information."
        ),
        ],
    model_settings=ModelSettings(
        temperature=1.5,
        tool_choice="required",
        max_tokens=4000 
    )
)
