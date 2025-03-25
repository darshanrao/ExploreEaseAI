import os
from dotenv import load_dotenv
from uagents_core.crypto import Identity
from fetchai.registration import register_with_agentverse

# Load environment variables from .env file
load_dotenv()

# Store your Agentverse API Key in the environment variables. 
AGENTVERSE_KEY = os.getenv("AGENTVERSE_KEY")

# Your Agent's unique key for generating an address on Agentverse
ai_identity = Identity.from_seed(os.getenv("AGENT_SECRET_KEY"), 0)

# Give your Agent a name. This allows you to easily identify one
# of your Agents from other agents on Agentverse.
name = "My AI's Name"

# This is how you optimize your Agent's search engine performance
readme = """
![domain:innovation-lab](https://img.shields.io/badge/innovation--lab-3D8BD3)
domain:domain-of-your-agent
<description>My AI's description of capabilities and offerings</description>
<use_cases>
    <use_case>An example of one of your AI's use cases.</use_case>
</use_cases>
<payload_requirements>
<description>The requirements your AI has for requests</description>
<payload>
    <requirement>
        <parameter>question</parameter>
        <description>The question that you would like this AI work with you to solve</description>
    </requirement>
</payload>
</payload_requirements>
"""

# The webhook that your AI receives messages on.
ai_webhook = "https://api.sampleurl.com/webhook"

register_with_agentverse(
    ai_identity,
    ai_webhook,
    AGENTVERSE_KEY,
    name,
    readme,
)