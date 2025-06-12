import OpenAI from 'openai';
import type { ChatCompletionTool } from 'openai/resources';

import type { TwitterPost } from './twitter.js';
import type { GoogleNewsPost } from './google.js';
import type { Entity, Source } from './common.js';

type ScrapedData = {
    google: GoogleNewsPost[] | null;
    twitter: TwitterPost[] | null;
}

type ToolParameters = {
    type: 'object';
    properties: Partial<Record<Source, unknown>>;
    required: Source[];
};

export async function processPrompt(entity: Entity, persona: string, data: ScrapedData) {
    const tools = getTools(data);

    if (tools == null) return null;

    const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await client.chat.completions.create({
        model: 'gpt-4o',
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

                        For each dataset consider different evaluation and importance:
                        - google
                            - post index, source, date
                            - more serious and reputable sources
                        - twitter
                            - tweet index, author (if available), impressions, date
                            - lot of noise, less serious but can generate momentum

                        Always respond using function calls to return structured JSON output.
                    `,
            },
            {
                role: 'user',
                content:
                    `
                        You will be conducting recommandation for ${entity.ticker} ${entity.type}.
                        You might encounter various sources of data, ignore those that don't refer to given ${entity.type}.
                        ${entity.priceChart.length > 0 ? `Here is the financial dataset: \n${JSON.stringify(entity.priceChart, null, 2)}` : ''}
                        Here is the news dataset: \n${JSON.stringify(data, null, 2)}
                        The user persona is: ${persona}
                
                        Provide an analysis in the requested format.
                        You must always call all ${tools.length} functions: ${tools.map((tool) => tool.function.name).join(', ')}.
                    `,
            },
        ],
        tools,
    });

    const output: Record<string, unknown> = {
        type: entity.type,
        ticker: entity.ticker,
    };

    for (const tool of response.choices[0].message.tool_calls ?? []) {
        output[tool.function.name] = JSON.parse(tool.function.arguments);
    }

    return output;
}

function getTools(data: ScrapedData): ChatCompletionTool[] | null {
    const parameters: ToolParameters = {
        type: 'object',
        properties: {},
        required: [],
    };

    const sentiment: ChatCompletionTool = {
        type: 'function',
        function: {
            name: 'sentiment_analysis',
            description: 'Analyze sentiment for the given ticker based on market data for each dataset separately.',
            parameters: {
                type: 'object',
                properties: {},
                required: [],
            },
        },
    };

    Object.keys(data).forEach((key) => {
        const source = key as Source;

        if (data[source] != null) {
            parameters.properties[source] = analysis;
            parameters.required.push(source);

            // @ts-expect-error: mute TypeScript error about dynamic property assignment
            sentiment.function.parameters.properties[source] = analysis;
            // @ts-expect-error: mute TypeScript error about dynamic property assignment
            sentiment.function.parameters.required.push(source);
        }
    });

    if (parameters.required.length === 0) {
        return null;
    }

    return [
        sentiment,
        {
            type: 'function',
            function: {
                name: 'market_summary',
                description: `
                Provide a market summary of the given ticker.
                Prioritize those resources based on user's persona and usecase.
                Also if market price data is available, include price specifics in the summary.
                `,
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
                description: `
                    Provide a personalized investment recommendation based on the user persona and usecase.
                    Do not focus on generic information, be as actionable and specific as possible.
                    If price data is available, include it in the recommendation.
                    Also adjust your language and reasoning so it corresponds with user's persona.
                `,
                parameters: {
                    type: 'object',
                    properties: {
                        persona_analysis: { type: 'string', description: "Analysis of user's investment style and risk profile" },
                        action: {
                            type: 'string',
                            enum: ['Buy', 'Hold', 'Sell'],
                            description: 'Actionable recommandation based on sentiment and market analysis and user\'persona and usecase',
                        },
                        summary: { type: 'string', description: 'Tailored stock recommendation summary based on sentiment and market analysis' },
                        reasoning: { type: 'string', description: 'Explain why you have chosen recommandation for given persona and usecase' },
                        potential_risks: { type: 'array', items: { type: 'string' }, description: 'Possible risks the user should consider' },
                    },
                    required: ['persona_analysis', 'recommendation', 'potential_risks'],
                },
            },
        },
    ];
}

const analysis = {
    type: 'object',
    properties: {
        category: { type: 'string', enum: ['Positive', 'Neutral', 'Negative'], description: 'Sentiment category' },
        confidence: { type: 'number', description: 'Confidence score (0-100%)' },
        sentiment_score: { type: 'number', description: 'Sentiment score from 0 (negative) to 10 (positive)' },
        reasoning: { type: 'string', description: 'Explanation of sentiment' },
    },
    required: ['category', 'confidence', 'sentiment_score', 'reasoning'],
};
