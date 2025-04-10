
from anthropic import Anthropic, RateLimitError, APIError
import time
import os
from dotenv import load_dotenv
load_dotenv()


def get_claude_response(prompt, model="claude-3-haiku-20240307", max_tokens=1000, retries=3):
    """
    Send a prompt to Claude API and get the text response.
    
    Args:
        prompt (str): The prompt to send to Claude
        model (str): The Claude model to use (default: "claude-3-haiku-20240307")
        max_tokens (int): Maximum number of tokens in the response (default: 1000)
        retries (int): Number of retries if the API call fails (default: 3)
        
    Returns:
        str: The text response from Claude
    """

    
    # Load API key from environment variables
    api_key = os.getenv("CLAUDE_API")
    if not api_key:
        raise ValueError("CLAUDE_API environment variable not set")
    
    client = Anthropic(api_key=api_key)
    
    attempt = 0
    while attempt < retries:
        try:
            response = client.messages.create(
                model=model,
                max_tokens=max_tokens,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            # Return the text content from the response
            return response.content[0].text
                
        except RateLimitError:
            # Handle rate limiting by waiting and retrying
            wait_time = 2 ** attempt  # Exponential backoff
            print(f"Rate limit exceeded. Retrying in {wait_time} seconds...")
            time.sleep(wait_time)
            attempt += 1
        except APIError as e:
            # Handle other API errors
            print(f"API error: {e}")
            attempt += 1
            time.sleep(1)
        except Exception as e:
            # Handle unexpected errors
            print(f"Unexpected error: {e}")
            attempt += 1
            time.sleep(1)
    
    # If all retries are exhausted
    raise Exception(f"Failed to get response from Claude after {retries} attempts")


# # Simple text response
# response = get_claude_response("Write a haiku about programming")
# print(response)

