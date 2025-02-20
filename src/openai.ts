import OpenAI from 'openai';
import { ChatCompletionTool } from 'openai/resources';

import type { TwitterPost } from './twitter.js';

type ScrapedData = {
    twitter: TwitterPost[];
}

const tools: ChatCompletionTool[] = [
    {
        type: 'function',
        function: {
            name: 'sentiment_analysis',
            description: 'Analyze sentiment for the given ticker based on market data.',
            parameters: {
                type: 'object',
                properties: {
                    category: { type: 'string', enum: ['Positive', 'Neutral', 'Negative'], description: 'Sentiment category' },
                    confidence: { type: 'number', description: 'Confidence score (0-100%)' },
                    sentiment_score: { type: 'number', description: 'Sentiment score from 0 (negative) to 10 (positive)' },
                    reasoning: { type: 'string', description: 'Explanation of sentiment' },
                },
                required: ['category', 'confidence', 'sentiment_score', 'reasoning'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'market_summary',
            description: 'Provide a market summary of the given ticker.',
            parameters: {
                type: 'object',
                properties: {
                    current_situation: { type: 'string', description: 'Current market situation' },
                    top_discussed_topics: { type: 'array', items: { type: 'string' }, description: 'Most discussed topics' },
                    recent_information: { type: 'array', items: { type: 'string' }, description: 'Recent news or relevant information' },
                    investor_interest: { type: 'string', description: 'What investors are most interested in' },
                },
                required: ['current_situation', 'top_discussed_topics', 'recent_information', 'investor_interest'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'personalized_recommendation',
            description: 'Provide a personalized investment recommendation based on the user persona.',
            parameters: {
                type: 'object',
                properties: {
                    persona_analysis: { type: 'string', description: "Analysis of user's investment style and risk profile" },
                    recommendation: { type: 'string', description: 'Tailored stock recommendation based on sentiment and market analysis' },
                    potential_risks: { type: 'array', items: { type: 'string' }, description: 'Possible risks the user should consider' },
                },
                required: ['persona_analysis', 'recommendation', 'potential_risks'],
            },
        },
    },
];

export async function processPrompt(apiKey: string, ticker: string, persona: string, data: ScrapedData) {
    const client = new OpenAI({
        apiKey,
    });

    const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            {
                role: 'system',
                content:
                    `
                        You are a financial AI assistant. Your task is to analyze financial data for a given stock ticker.
                        Use function calls to return structured responses for:
                        1) Sentiment Analysis
                        2) Market Summary
                        3) Personalized Recommendation based on the user persona.

                        Always respond using function calls to return structured JSON output.
                    `,
            },
            {
                role: 'user',
                content:
                    `
                        You will be conducting recommandation for ${ticker}.
                        Here is the financial dataset:\n${JSON.stringify(data, null, 2)}
                        The user persona is: ${persona}
                
                        Provide an analysis in the requested format.
                    `,
            },
        ],
        tools,
    });

    const output: Record<string, unknown> = {};

    for (const tool of response.choices[0].message.tool_calls ?? []) {
        output[tool.function.name] = JSON.parse(tool.function.arguments);
    }

    return output;
}
