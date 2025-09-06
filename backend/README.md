questions:
How has artificial intelligence changed healthcare from 2020 to 2024, including both benefits and concerns from medical professionals?

what are the reasons of having paralysis attack and treatment ? 

🧑‍⚕️ MedAssistant – Deep Search Agentic System

MedAssistant is an AI-powered medical research assistant that answers queries related to the healthcare and medical industry.
It is built with:

Backend: Python (FastAPI)

Frontend: Next.js (React + WebSocket for streaming responses)

The system uses a multi-agent workflow where each specialized agent collaborates to provide accurate, well-structured answers.

1. Backend (Python – FastAPI)
# Clone the repository
git clone https://github.com/jamaliumair/MedAssistant_Backend
cd MedAssistant_Backend-main

# Create virtual environment
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the FastAPI server
uvicorn main:app --reload


Backend will run on: http://localhost:8000

2. Frontend (Next.js)
cd ../frontend

# Install dependencies
npm install

# Run the Next.js app
npm run dev


Frontend will run on: http://localhost:3000


📝 Example Research Questions

Here are some example queries MedAssistant can handle:

🧬 What are the latest treatments for Type 2 Diabetes?

💊 Compare the side effects of different COVID-19 vaccines.

🩺 How does AI help in diagnosing lung cancer?

⚕️ What are the recommended guidelines for managing hypertension in adults?


🧩 Agents and Their Roles
🔹 Requirement Gathering Agent

Interacts with the user.

Collects the research question in detail.

Passes it to the Lead Research Agent.

🔹 Planning Agent

Breaks down the query into smaller research tasks.

Suggests the best approach for searching, synthesizing, and validating information.

🔹 Search Agent

Performs deep searches (including web search).

Collects relevant raw information.

🔹 Synthesis Agent

Organizes and structures search results.

Summarizes key points.

🔹 Reflection Agent

Double-checks answers.

Ensures correctness, clarity, and medical relevance.

🔹 Citation Agent

Adds references, citations, or sources for credibility.

🔹 Lead Research Agent (Orchestrator)

Coordinates the team of agents.

Ensures smooth hand-offs between agents.

Delivers the final response back to the user.

🤝 Team Coordination Flow

User asks a medical question.

Requirement Gathering Agent captures the query.

Lead Research Agent orchestrates the workflow:

Sends the task to Planning Agent → returns plan.

Sends to Search Agent → gathers data.

Sends to Synthesis Agent → organizes data.

Sends to Reflection Agent → validates quality.

Sends to Citation Agent → attaches references.

Lead Research Agent compiles everything.

Final Response is streamed back to the frontend via WebSocket for real-time display.


⚡ This agentic workflow ensures accurate, well-researched, and medically relevant answers with supporting citations.