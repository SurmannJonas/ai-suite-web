// import OpenAI from "openai";
//
// const openai = new OpenAI({
// 	apiKey: process.env.OPENAI_API_KEY,
// });

import { OpenAIStream, StreamingTextResponse } from 'ai'
import { Configuration } from 'openai-edge'
import type { CreateChatCompletionRequest } from 'openai-edge'
import OpenAI from 'openai';

// Create an OpenAI API client (that's edge friendly!)
const config = {
	apiKey: process.env.OPENAI_API_KEY
}
const openai = new OpenAI(config)

// IMPORTANT! Set the runtime to edge
export const runtime = 'edge'

const functions = [
				 {
					"name": "analyseContract",
					"description": "Analyzes a smart contract to provide an initial overview, function analysis, and code logic explanation.",
					"parameters": {
						"type": "object",
						"properties": {
							"contractCode": {
								"type": "string",
								"description": "The full Solidity code of the smart contract"
							}
						},
						"required": [
							"contractCode"
						]
					}
				},
				{
					"name": "findVulnerabilities",
					"description": "Conducts a detailed security analysis of a smart contract, identifying vulnerabilities and providing a comprehensive assessment.",
					"parameters": {
					  "type": "object",
					  "properties": {
						"contractCode": {
						  "type": "string",
						  "description": "The full Solidity code of the smart contract"
						}
					  },
					  "required": [
						"contractCode"
					  ]
					}
				  }
			]



export const dynamic = 'force-dynamic' // defaults to force-static

export async function POST(request: Request) {

	// Extract the `messages` from the body of the request
	const { messages } = await request.json()
	let lastMessage = messages[messages.length-1].content;
	if(lastMessage.includes(".format.") || lastMessage.length > 100 && lastMessage.includes(".")){
		messages[messages.length-1].content= messages[messages.length-1].content + ", all responses should be formatted in html using h1,p,ul,li make sure not to use backticks indicating codeblocks.";
	}
	console.log(messages);

	// Ask OpenAI for a streaming chat completion given the prompt
	try {
		// using docs https://platform.openai.com/docs/guides/function-calling
		const response = await openai.chat.completions.create({
			model: 'gpt-4-1106-preview',
			messages,
			stream: true,
			functions: functions,
		})
		
		const stream = OpenAIStream(response, {
			experimental_onFunctionCall: async ({ name, arguments: args}, createFunctionCallMessages) => {
				const newMessages = createFunctionCallMessages(
					{
						contractCode: args.contractCode as string
					}

				)
				if (name === 'analyseContract') {
					const response =  openai.chat.completions.create({
						model: 'gpt-4-1106-preview',
						messages: [...messages, ...newMessages],
						stream: true,
						functions
							
					})
					console.log("inside analyseContract");
					return response
				}

				if (name === 'findVulnerabilities') {
					const response =  openai.chat.completions.create({
						model: 'gpt-4-1106-preview',
						messages: [...messages, ...newMessages],
						stream: true,
						functions
							
					})
					console.log("inside findVulnerabilities");
					return response
				}
			

			}
		})
		return new StreamingTextResponse(stream)




	} catch (e) {
		console.log(e)
		return new Response("internal server error", { status: 500 })
	}
}

