"""
Toile Compute Savings Validation
Measures actual token usage for AI agent coordination
with and without Toile infrastructure
"""

import anthropic
import os
import json
from datetime import datetime

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

def test_without_toile():
    """Measure tokens for current approach (web scraping)"""
    
    messages = [
        {"role": "user", "content": """
        I need a makeup artist for my wedding in San Francisco on June 15, 2026.
        
        Please:
        1. Search for qualified bridal makeup artists in SF
        2. Find their pricing, portfolio quality, and reviews
        3. Verify they're available for my date
        4. Recommend the top 3 most reliable options
        5. Draft a booking inquiry message
        
        I want natural glam aesthetic and need someone highly reliable.
        """}
    ]
    
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4000,
        messages=messages,
        tools=[{"type": "web_search_20250305", "name": "web_search"}]
    )
    
    return {
        'tokens': response.usage.input_tokens + response.usage.output_tokens,
        'input_tokens': response.usage.input_tokens,
        'output_tokens': response.usage.output_tokens
    }

def test_with_toile():
    """Measure tokens for Toile approach (structured API)"""
    
    messages = [
        {"role": "user", "content": """
        User query: "I need a makeup artist for my wedding in San Francisco on June 15, 2026. Natural glam aesthetic."
        
        Toile API returned:
        {
          "providers": [
            {
              "name": "Violet Herod",
              "cdi_score": 98,
              "available": true,
              "price": "$8500",
              "aesthetic_match": 94,
              "booking_url": "https://beauvette.app/book/violet"
            },
            {
              "name": "Sarah Chen",
              "cdi_score": 92,
              "available": true,
              "price": "$7200",
              "aesthetic_match": 89,
              "booking_url": "https://beauvette.app/book/sarah"
            }
          ]
        }
        
        Present these options to the user and recommend booking the highest-rated provider.
        """}
    ]
    
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        messages=messages
    )
    
    return {
        'tokens': response.usage.input_tokens + response.usage.output_tokens,
        'input_tokens': response.usage.input_tokens,
        'output_tokens': response.usage.output_tokens
    }

# Run tests
print("Running compute savings validation...\n")

print("=" * 70)
print("TEST 1: WITHOUT TOILE (Current state - web scraping)")
print("=" * 70)
without = test_without_toile()
print(f"Input tokens: {without['input_tokens']:,}")
print(f"Output tokens: {without['output_tokens']:,}")
print(f"TOTAL: {without['tokens']:,} tokens\n")

print("=" * 70)
print("TEST 2: WITH TOILE (Future state - structured API)")
print("=" * 70)
with_toile = test_with_toile()
print(f"Input tokens: {with_toile['input_tokens']:,}")
print(f"Output tokens: {with_toile['output_tokens']:,}")
print(f"TOTAL: {with_toile['tokens']:,} tokens\n")

# Calculate savings
tokens_saved = without['tokens'] - with_toile['tokens']
percent_saved = (tokens_saved / without['tokens']) * 100

print("=" * 70)
print("RESULTS")
print("=" * 70)
print(f"Without Toile: {without['tokens']:,} tokens")
print(f"With Toile: {with_toile['tokens']:,} tokens")
print(f"Tokens saved: {tokens_saved:,}")
print(f"Reduction: {percent_saved:.1f}%\n")

# Cost analysis
cost_per_million = 15  # Claude Sonnet 4.5 pricing
cost_without = (without['tokens'] / 1_000_000) * cost_per_million
cost_with = (with_toile['tokens'] / 1_000_000) * cost_per_million
cost_saved = cost_without - cost_with

print("COST ANALYSIS (per booking):")
print(f"Without Toile: ${cost_without:.6f}")
print(f"With Toile: ${cost_with:.6f}")
print(f"Cost saved: ${cost_saved:.6f}\n")

# Scale projections
annual_bookings = 800_000_000  # Conservative estimate for 2030
annual_cost_without = (annual_bookings * cost_without)
annual_cost_with = (annual_bookings * cost_with)
annual_savings = annual_cost_without - annual_cost_with

print("SCALE PROJECTIONS (800M annual bookings by 2030):")
print(f"Annual cost without Toile: ${annual_cost_without:,.0f}")
print(f"Annual cost with Toile: ${annual_cost_with:,.0f}")
print(f"Annual savings: ${annual_savings:,.0f}")

# Save results
results = {
    'timestamp': datetime.now().isoformat(),
    'without_toile': without,
    'with_toile': with_toile,
    'savings': {
        'tokens': tokens_saved,
        'percent': percent_saved,
        'cost_per_booking': cost_saved,
        'annual_savings': annual_savings
    }
}

with open('compute_savings_validation.json', 'w') as f:
    json.dump(results, f, indent=2)

print(f"\nResults saved to compute_savings_validation.json")
