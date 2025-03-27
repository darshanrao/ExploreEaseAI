# test_llm.py
from llm_utils import get_claude_response
import json

def call_llm_test():
    prompt = """
    You are planning a trip to Paris from 2025-03-27 06:00 to 2025-03-27 22:00.
    
    You are given with following information.
    
    You have the following preferences:
    - Travel style: cultural
    - Food preference: local cuisine
    - Budget: medium
    - Transport mode: public transport
    - Time preference: morning
    - Activity intensity: moderate
    - Interests: museums, food, history
    - Custom preferences: I prefer indoor activities if it rains
    
    User Prompt: 
    I want to explore local cuisine and visit museums
    
    Formulate a Google Nearby Search API query to find top places to visit, ensuring the city name is not included since latitude and longitude will be provided.

    You MUST answer in the following JSON format for keywords to search and also set the budget for each category:
    
    {
      "attractions": [["attraction1 query", "attraction2 query"], min_budget, max_budget],
      "events": [["event1 query", "event2 query"], min_budget, max_budget],
      "lunch": ["specific type restaurant query", min_budget, max_budget],
      "dinner": ["specific type restaurant query", min_budget, max_budget]
    }
    
    where min_budget and max_budget are the minimum and maximum budget for the category.
    
    IMPORTANT: Ensure your response is a valid JSON object with the exact structure shown above.
    Do not include any explanations or text outside the JSON object.
    """
    
    response = get_claude_response(prompt)
    print("Raw response:")
    print(response)
    
    # Try to extract JSON
    try:
        start_idx = response.find('{')
        end_idx = response.rfind('}')
        if start_idx != -1 and end_idx != -1:
            json_str = response[start_idx:end_idx+1]
            parsed = json.loads(json_str)
            print("\nParsed JSON:")
            print(json.dumps(parsed, indent=2))
            
            # Check the structure
            print("\nStructure validation:")
            for key in ['attractions', 'events', 'lunch', 'dinner']:
                if key not in parsed:
                    print(f"Missing key: {key}")
                else:
                    value = parsed[key]
                    if not isinstance(value, (list, tuple)):
                        print(f"Invalid type for {key}: {type(value)}")
                    elif len(value) != 3:
                        print(f"Invalid length for {key}: {len(value)}")
                    else:
                        print(f"{key}: Valid format")
        else:
            print("Could not find JSON in response")
    except Exception as e:
        print(f"Error parsing JSON: {e}")

if __name__ == "__main__":
    call_llm_test()