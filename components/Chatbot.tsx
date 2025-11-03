
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Chat } from '@google/genai';
import { createChatSession, streamChatResponse, textToSpeech, playAudioBuffer } from '../services/geminiService';
import { ChatMessage, GroundingSource } from '../types';
import { Spinner } from './common/Spinner';

const VolumeIcon: React.FC<{onClick: () => void}> = ({onClick}) => (
    <svg onClick={onClick} xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 hover:text-white cursor-pointer" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.858 15.858a5 5 0 007.072 0M3.03 13.03a9 9 0 0012.728 0" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
    </svg>
);


export const Chatbot: React.FC = () => {
    const [chat, setChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [useGrounding, setUseGrounding] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setChat(createChatSession());
        setMessages([{
            sender: 'bot',
            text: "Hello! I'm your AI assistant. Ask me anything, or toggle 'Use Google Search' for up-to-date information."
        }]);
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSpeak = async (text: string) => {
        try {
            const audioBuffer = await textToSpeech(text);
            playAudioBuffer(audioBuffer);
        } catch (error) {
            console.error("TTS failed:", error);
        }
    };
    
    const sendMessage = async () => {
        if (!input.trim() || !chat) return;

        const userMessage: ChatMessage = { sender: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        const botMessage: ChatMessage = { sender: 'bot', text: '', sources: [] };
        setMessages(prev => [...prev, botMessage]);
        
        try {
            const stream = await streamChatResponse(chat, input, useGrounding);
            let fullText = '';
            let allSources: GroundingSource[] = [];

            for await (const chunk of stream) {
                const chunkText = chunk.text;
                fullText += chunkText;
                
                const sources = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks
                    ?.map((c: any) => ({
                        title: c.web?.title || c.maps?.title || "Source",
                        uri: c.web?.uri || c.maps?.uri,
                    }))
                    .filter(s => s.uri && !allSources.some(as => as.uri === s.uri));

                if (sources && sources.length > 0) {
                     allSources.push(...sources);
                }

                setMessages(prev => prev.map((msg, index) => 
                    index === prev.length - 1 
                        ? { ...msg, text: fullText, sources: allSources }
                        : msg
                ));
            }
        } catch (error) {
            console.error("Chat error:", error);
             setMessages(prev => prev.map((msg, index) => 
                index === prev.length - 1 
                    ? { ...msg, text: "Sorry, I encountered an error. Please try again." }
                    : msg
            ));
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="max-w-4xl mx-auto flex flex-col h-[80vh] bg-gray-800 rounded-lg shadow-xl">
             <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                <h2 className="text-xl font-bold text-indigo-400">AI Assistant Chat</h2>
                <label className="flex items-center cursor-pointer">
                    <span className="mr-3 text-sm font-medium text-gray-300">Use Google Search</span>
                    <div className="relative">
                        <input type="checkbox" checked={useGrounding} onChange={() => setUseGrounding(!useGrounding)} className="sr-only peer"/>
                        <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-4 peer-focus:ring-indigo-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </div>
                </label>
            </div>
            <div className="flex-grow p-4 overflow-y-auto space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-lg p-3 rounded-lg shadow ${msg.sender === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                            {msg.sender === 'bot' && !isLoading && msg.text && (
                                <div className="mt-2 flex items-center justify-end">
                                    <VolumeIcon onClick={() => handleSpeak(msg.text)} />
                                </div>
                            )}
                             {msg.sources && msg.sources.length > 0 && (
                                <div className="mt-2 border-t border-gray-600 pt-2">
                                    <h4 className="text-xs font-semibold text-gray-400 mb-1">Sources:</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {msg.sources.map((source, i) => (
                                            <a key={i} href={source.uri} target="_blank" rel="noopener noreferrer" className="text-xs bg-gray-600 hover:bg-gray-500 text-indigo-300 px-2 py-1 rounded-full truncate">
                                                {source.title}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && messages[messages.length - 1]?.sender === 'user' && (
                     <div className="flex justify-start">
                        <div className="max-w-lg p-3 rounded-lg shadow bg-gray-700 text-gray-200">
                           <Spinner />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-gray-700">
                <div className="flex items-center bg-gray-700 rounded-lg">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !isLoading && sendMessage()}
                        placeholder="Type your message..."
                        className="w-full bg-transparent p-3 text-white placeholder-gray-400 focus:outline-none"
                        disabled={isLoading}
                    />
                    <button onClick={sendMessage} disabled={isLoading || !input.trim()} className="p-3 text-indigo-400 disabled:text-gray-500 hover:text-indigo-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 12h14" /></svg>
                    </button>
                </div>
            </div>
        </div>
    );
};
