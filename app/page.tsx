'use client';
import React, { useEffect, useRef, DragEvent } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { FaRegFileCode } from "react-icons/fa6";
import { useChat } from 'ai/react'
import { useRouter } from 'next/navigation';
import Image from 'next/image';

import type { Message } from 'ai';
import { Chat } from 'openai/resources/index.mjs';

// split contract content into chunks of 4000 char
function splitContractContent(content: string) {
  const chunks = [];
  const chunkSize = 4000;
  for (let i = 0; i < content.length; i += chunkSize) {
    chunks.push(content.slice(i, i + chunkSize));
  }

  return chunks;
}


function formatContractChunks(chunks: string[]): Message[] {
  return chunks.map((chunk, index) => {
    return { id: "contract_prompt" + index.toString(), role: 'user', content: chunk }
  })
}



export default function Home() {
  const [analysisOption, setAnalysisOption] = React.useState<'assistant' | 'trustbytes-assistant-demo'>('assistant');

  const [file, setFile] = React.useState<File | null>(null);
  const [fileContent, setFileContent] = React.useState<string | null>(null);

  const [uploadScreen, setUploadScreen] = React.useState(true);
  const [isDisabled, setIsDisabled] = React.useState(true);
  const [serverAnsweredFirst, setServerAnsweredFirst] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const contractChunks = splitContractContent(fileContent || '');
  const formattedContractChunks = formatContractChunks(contractChunks);


  const initialMessagesGPT: Message[] = [
    { id: 'tb_custom_prompt', role: 'user', content: `
          Assume the role of an expert smart contract auditor with a deep understanding of Solidity and EVM (Ethereum Virtual Machine) contracts. When I present you with a smart contract, follow these steps:

          Please conduct a thorough analysis of these contracts, focusing on standard tests for common vulnerabilities - only share the relevant ones where you have identified a vulnerability - always leave out the rest. 
          Here are the specific tests to perform:
          
          Reentrancy Attacks: Check if the contracts are susceptible to reentrancy attacks, particularly in functions that make external calls or transfer funds.
          
          Arithmetic Overflows and Underflows: Examine the contracts for arithmetic operations, especially those without safeguards like SafeMath, to spot potential overflows and underflows.
          
          Gas Limit and Loops: Review any loops and complex computations to assess their gas consumption and ensure they don't exceed block gas limits, risking transaction failures.
          
          Visibility of Functions and State Variables: Ensure that all functions and state variables have appropriate visibility set (public, private, internal, external) to prevent unintended access or modification.
          
          Delegatecall Vulnerability: Inspect the use of delegatecall to verify it's implemented securely and doesn't inadvertently allow malicious control over contract state.
          
          Timestamp Dependence: Check for any critical logic in the contract relying on block timestamps, which can be manipulated by miners to some extent.
          
          Unchecked External Calls: Look for external calls and ensure they are properly checked for their return values to handle failed calls effectively.
          
          Short Address/Parameter Attack: Ensure the contracts handle input lengths correctly to guard against short address or parameter attacks.
          
          Additional Common Vulnerabilities: Scan for any other standard vulnerabilities commonly found in Solidity contracts - only return a result if you found anything.
          
          Report back with a detailed analysis of each test, highlighting any vulnerabilities found or confirming the absence of these issues. Provide recommendations for improvements or fixes where vulnerabilities are identified.
          
          Also add additional vulnerabilities based on your expertise.
          
          With regards to the formatting of all vulnerabilities, first order after severity and start with critical first, then please output in the following format:
          [Title]
          Severity: [Critical, Medium, Low]
          Context: [name of the contract], [exact line of the contract code]
          Description: [Description of the issue can include POC]
          Recommendation: [How to fix - propose code changes]
          
          all responses should be formatted in html using h1,p,ul,li make sure not to use backticks indicating codeblocks. 
          
          Take a deep breath and do the analysis step by step at the best of your ability.` },
    ...formattedContractChunks
  ]


  const { messages, input, handleInputChange, handleSubmit } = useChat({
    onFinish: (message) => {
      // ~~pushToLocalStateAndReset()~~
      // Cannot call a callback from here, have to update some local state and have that useEffect to call a callback.
      setServerAnsweredFirst(true);
      setIsDisabled(false);
      setIsLoading(false);
    },
    onError: (error: Error) => {
      alert(error);
    },
    initialMessages: initialMessagesGPT,
    initialInput: '',
  });

  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const prevMessagesLength = useRef(messages.length);
  const scrollDown = () => {
    if (listRef.current) {
      const scrollAmount = 20; // The amount of pixels you want to scroll down
      listRef.current.scrollTop += scrollAmount;
    }
  };

  useEffect(() => {
    if (prevMessagesLength.current < messages.length) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      prevMessagesLength.current = messages.length;
    } else {
      scrollDown();
    }


  }, [messages]); // Assuming `messages` is an array of your chat messages


  function handleAnalysisOptionChange(e: React.ChangeEvent<HTMLInputElement>) {
    setAnalysisOption(e.target.value as any);
  }


  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    // router.push("/mock-reports", {
    //   body: e.target.files[0]
    // })
    const _file: File = e.target.files[0];
    setFile(_file);
    if (_file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFileContent(e.target?.result as string);
      }
      reader.readAsText(_file);
    }
  }

  function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    setIsDisabled(true);
    handleSubmit(e);
  }

  function handleFindVulnerabilitiesSubmit(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    //e.preventDefault(); // Prevent the default action of the button
    setUploadScreen(false);
    console.log("Button Handler clicked...");

    if (!serverAnsweredFirst) {
      setIsLoading(true);
    }
    // Update the input value
    handleInputChange({ target: { value: "please find vulnerabilities in this smart contract" } } as any);

    // Check if the form reference is available
    if (formRef.current) {
      // Directly trigger the form submission logic
      const event = new Event('submit', { bubbles: true, cancelable: true });
      formRef.current.dispatchEvent(event);
      console.log("Form submission handler called");
    }
  }


  function clearFile() {
    setFile(null);
    setFileContent(null);
  }


  return (
    <div className=" w-full items-center flex flex-col overflow-y-hidden h-screen ">
      <div className="flex flex-row w-full">

        <div className="flex flex-row  justify-between items-center w-full px-8 h-14">
          {
            <span className="text-xl">{analysisOption}</span>
          }
          <Image src="/tb-logo.svg" alt="trustbytes" width={240} height={300} onClick={clearFile} className="cursor-pointer" />
        </div>
      </div>
      <div className=" flex-grow overflow-auto w-full">
        <div className="flex  items-center justify-center w-full h-full ">
          {
            !file && (
              <form action="/upload" method="post" encType="multipart/form-data" className=" w-fit flex flex-col justify-center gap-4">
                <div className="hover:brightness-125 bg-dark duration-100 ease-out">
                  <label
                    className="flex justify-center w-full aspect-square h-64 px-4 transition   border-2 border-gray-500 border-dashed rounded-2xl appearance-none cursor-pointer hover:brightness-90 focus:outline-none">
                    <span className="flex items-center space-x-2">
                      <FaRegFileCode className="w-16 h-16" />
                    </span>
                    <input type="file" accept="application/sol" onChange={onFileChange} name="file_upload" className="hidden" />
                  </label>
                </div>

                <span className="font-medium text-gray-600 text-center text-lg w-full">
                  Upload a file to analyze</span>
                {/* <fieldset className="flex gap-4 m-auto">
                  <label htmlFor="gpt" className="flex gap-4 text-lg tracking-wide w-full text-center">
                    <input className="align-middle h-full" type="radio" value="assistant" name="assistant" checked={
                      analysisOption === 'assistant'
                    }
                      onChange={handleAnalysisOptionChange}

                     />
                    assistant
                  </label>
                </fieldset> */}
              </form>

            )
          }


          {(fileContent) && (
            <section className="flex flex-grow h-full w-full">
              <div className="w-1/2 overflow-y-scroll">
                <SyntaxHighlighter language="solidity" className="" style={atomDark}>
                  {fileContent}
                </SyntaxHighlighter>
              </div>
              <div className="w-1/2  h-full px-8   text-lg leading-relaxed flex flex-col justify-end     
             bg-dark 
                ">
                <style jsx>
                  {`
                    .chatContainer {
                      height: 300px;
                      overflow-y: auto;
                    }
                  `}
                </style>
                <ul className=" flex-grow overflow-y-auto  h-32 flex flex-col space-y-4 rounded-lg chat-container" ref={listRef} >
                  {(
                    messages.map(m => {
                      const isUser = m.role === 'user';
                      const isAI = m.role === 'assistant';
                      const isLastItem = Number(m.id) === messages.length - 1;
                      // visually hide the custom prompt
                      if (m.id === "tb_custom_prompt") return null;
                      // visually hide the contract content
                      if (m.id.includes("contract_prompt")) return null;
                      return (
                        (
                          <li key={m.id} className={`flex flex-col space-y-2 ${isUser ? 'items-end' : 'items-start'} ${isLastItem && "anchor"} `}  >
                            <span className="text-xs text-gray-400">{m.role}</span>
                            <span dangerouslySetInnerHTML={{ __html: m.content }} className={`p-4 rounded-lg ${isUser ? 'bg-blue-500 text-white' : 'custom-gradient text-white'} space-y-4 chat-item`} >

                            </span>

                          </li>


                        )
                      )
                    })
                  )}
                  <div ref={chatEndRef} />
                </ul>
                <style jsx>
                  {`
                    .loader {
                      border: 4px solid #f3f3f3;
                      border-top: 4px solid #3498db;
                      border-radius: 50%;
                      width: 40px;
                      height: 40px;
                      animation: spin 2s linear infinite;
                    }

                    @keyframes spin {
                      0% { transform: rotate(0deg); }
                      100% { transform: rotate(360deg); }
                    }
                  `}
                </style>
                <form onSubmit={handleFormSubmit} className="py-4 flex flex-row w-full justify-center items-center" ref={formRef}>
                  <button className={`bg-white text-black font-bold py-2 rounded-lg ${uploadScreen ? 'w-full px-4' : 'invisible w-0'}`} onClick={handleFindVulnerabilitiesSubmit}>find vulnerabilities</button>

                  {isLoading && <div className="loader"></div>}
                  <input
                    ref={inputRef}
                    value={input}
                    disabled={isDisabled}
                    onChange={handleInputChange}
                    placeholder="Ask questions about the vulnerabilities report..."
                    className={`bg-dark border rounded-lg ${input.length > 0 ? 'border-blue-500' : 'border-gray-500'} ${!serverAnsweredFirst ? 'invisible w-0' : 'w-full p-2'}`}
                  />
                </form>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}


const template = `
Prepared by: [Cyfrin](https://cyfrin.io)
Lead Auditors: 
- xxxxxxx

# Table of Contents
- [Table of Contents](#table-of-contents)
- [Protocol Summary](#protocol-summary)
- [Disclaimer](#disclaimer)
- [Risk Classification](#risk-classification)
- [Audit Details](#audit-details)
  - [Scope](#scope)
  - [Roles](#roles)
- [Executive Summary](#executive-summary)
  - [Issues found](#issues-found)
- [Findings](#findings)
- [High](#high)
- [Medium](#medium)
- [Low](#low)
- [Informational](#informational)
- [Gas](#gas)

# Protocol Summary

Protocol does X, Y, Z

# Disclaimer

The YOUR_NAME_HERE team makes all effort to find as many vulnerabilities in the code in the given time period, but holds no responsibilities for the findings provided in this document. A security audit by the team is not an endorsement of the underlying business or product. The audit was time-boxed and the review of the code was solely on the security aspects of the Solidity implementation of the contracts.

# Risk Classification

|            |        | Impact |        |     |
| ---------- | ------ | ------ | ------ | --- |
|            |        | High   | Medium | Low |
|            | High   | H      | H/M    | M   |
| Likelihood | Medium | H/M    | M      | M/L |
|            | Low    | M      | M/L    | L   |

We use the [CodeHawks](https://docs.codehawks.com/hawks-auditors/how-to-evaluate-a-finding-severity) severity matrix to determine severity. See the documentation for more details.

# Audit Details 
## Scope 
## Roles
# Executive Summary
## Issues found
# Findings
# High
# Medium
# Low 
# Informational
# Gas 

`



