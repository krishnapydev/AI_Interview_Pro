import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob as GenaiBlob } from "@google/genai";
import { decode, decodeAudioData, encode } from '../utils';
import { TranscriptEntry } from '../types';

type InterviewState = 'setup' | 'in_progress' | 'finished' | 'error';

const MicIcon: React.FC<{ talking: boolean }> = ({ talking }) => (
  <svg className={`h-8 w-8 transition-colors ${talking ? 'text-red-500' : 'text-gray-400'}`} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"></path>
    <path d="M17 11h-1c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92z"></path>
  </svg>
);


export const Interview: React.FC = () => {
    const [interviewState, setInterviewState] = useState<InterviewState>('setup');
    const [jobRole, setJobRole] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
    const [isTalking, setIsTalking] = useState(false);

    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null); // For input
    const outputAudioContextRef = useRef<AudioContext | null>(null); // For output
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    
    // Fix: Use refs for mutable variables in callbacks to prevent stale closures.
    const currentInputTranscriptionRef = useRef('');
    const currentOutputTranscriptionRef = useRef('');
    const nextStartTimeRef = useRef(0);
    const sourcesRef = useRef(new Set<AudioBufferSourceNode>());

    const stopAudioProcessing = useCallback(() => {
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        // Fix: Clean up output audio context and sources.
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            outputAudioContextRef.current.close();
            outputAudioContextRef.current = null;
        }
        for (const source of sourcesRef.current.values()) {
          source.stop();
        }
        sourcesRef.current.clear();
    }, []);
    
    const startInterview = async () => {
        if (!jobRole.trim() || !jobDescription.trim()) {
            setError("Please fill in both job role and description.");
            return;
        }
        setError(null);
        setTranscripts([]);
        setInterviewState('in_progress');

        // Fix: Reset refs for new session.
        currentInputTranscriptionRef.current = '';
        currentOutputTranscriptionRef.current = '';
        nextStartTimeRef.current = 0;
        sourcesRef.current.clear();

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            
            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' }}},
                    systemInstruction: `You are a professional interviewer conducting an interview for a '${jobRole}' position. The job description is: '${jobDescription}'. Ask relevant behavioral and technical questions. Keep your responses concise and conversational. Start by introducing yourself and then ask the first question.`,
                },
                callbacks: {
                    onopen: () => {
                        console.log('Session opened.');
                        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                        // Fix: Initialize output audio context once per session.
                        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                        const source = audioContextRef.current.createMediaStreamSource(stream);
                        processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
                        
                        processorRef.current.onaudioprocess = (e) => {
                            const inputData = e.inputBuffer.getChannelData(0);
                            // Fix: Use a more efficient method to create the PCM blob as per guidelines.
                            const l = inputData.length;
                            const int16 = new Int16Array(l);
                            for (let i = 0; i < l; i++) {
                                int16[i] = inputData[i] * 32767; // Clamp to Int16 range
                            }
                            const pcmBlob: GenaiBlob = {
                                data: encode(new Uint8Array(int16.buffer)),
                                mimeType: 'audio/pcm;rate=16000',
                            };
                            sessionPromiseRef.current?.then((session) => session.sendRealtimeInput({ media: pcmBlob }));
                        };
                        source.connect(processorRef.current);
                        processorRef.current.connect(audioContextRef.current.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        handleLiveMessage(message);
                    },
                    onerror: (e) => {
                        console.error("Session error:", e);
                        setError("An error occurred during the interview.");
                        setInterviewState('error');
                        stopAudioProcessing();
                    },
                    onclose: () => {
                        console.log("Session closed.");
                        stopAudioProcessing();
                    }
                }
            });

        } catch (err) {
            console.error("Failed to start interview:", err);
            setError("Could not access microphone. Please check permissions.");
            setInterviewState('error');
        }
    };

    const handleLiveMessage = async (message: LiveServerMessage) => {
        if (message.serverContent?.inputTranscription) {
            const text = message.serverContent.inputTranscription.text;
            currentInputTranscriptionRef.current += text;
            setIsTalking(true);
        }
        if (message.serverContent?.outputTranscription) {
            const text = message.serverContent.outputTranscription.text;
            currentOutputTranscriptionRef.current += text;
        }

        if (message.serverContent?.turnComplete) {
            if (currentInputTranscriptionRef.current.trim()) {
                setTranscripts(prev => [...prev, { speaker: 'user', text: currentInputTranscriptionRef.current.trim() }]);
            }
            if (currentOutputTranscriptionRef.current.trim()) {
                setTranscripts(prev => [...prev, { speaker: 'model', text: currentOutputTranscriptionRef.current.trim() }]);
            }
            currentInputTranscriptionRef.current = '';
            currentOutputTranscriptionRef.current = '';
            setIsTalking(false);
        }

        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
        const outputAudioContext = outputAudioContextRef.current;
        
        // Fix: Implement gapless audio playback and interruption handling.
        if (base64Audio && outputAudioContext) {
            nextStartTimeRef.current = Math.max(
                nextStartTimeRef.current,
                outputAudioContext.currentTime,
            );
            const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
            const source = outputAudioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputAudioContext.destination);
            
            source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
            });

            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += audioBuffer.duration;
            sourcesRef.current.add(source);
        }

        const interrupted = message.serverContent?.interrupted;
        if (interrupted) {
            for (const source of sourcesRef.current.values()) {
                source.stop();
            }
            sourcesRef.current.clear();
            nextStartTimeRef.current = 0;
        }
    }
    
    const endInterview = () => {
        sessionPromiseRef.current?.then(session => session.close());
        sessionPromiseRef.current = null;
        stopAudioProcessing();
        setInterviewState('finished');
        setIsTalking(false);
    };

    useEffect(() => {
        // Cleanup on component unmount
        return () => {
            endInterview();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const renderSetup = () => (
        <div className="max-w-xl mx-auto bg-gray-800 p-8 rounded-lg shadow-xl">
            <h2 className="text-2xl font-bold text-center mb-6 text-indigo-400">Interview Setup</h2>
            <p className="text-center text-gray-400 mb-8">Enter the details of the job you're preparing for.</p>
            <div className="space-y-6">
                <input
                    type="text"
                    value={jobRole}
                    onChange={(e) => setJobRole(e.target.value)}
                    placeholder="Job Role (e.g., Senior Frontend Engineer)"
                    className="w-full bg-gray-700 text-white placeholder-gray-400 p-3 rounded-md border border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste Job Description Here..."
                    rows={8}
                    className="w-full bg-gray-700 text-white placeholder-gray-400 p-3 rounded-md border border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
            </div>
            {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
            <button
                onClick={startInterview}
                disabled={!jobRole.trim() || !jobDescription.trim()}
                className="w-full mt-8 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-900 disabled:text-gray-400 text-white font-bold py-3 px-4 rounded-md transition duration-300"
            >
                Start Mock Interview
            </button>
        </div>
    );
    
    const renderInProgress = () => (
        <div className="flex flex-col h-[70vh] max-w-4xl mx-auto bg-gray-800 p-6 rounded-lg shadow-xl">
            <div className="flex justify-between items-center mb-4">
                 <h2 className="text-xl font-bold text-indigo-400">Interview in Progress...</h2>
                 <MicIcon talking={isTalking} />
            </div>
            <div className="flex-grow bg-gray-900 rounded-md p-4 overflow-y-auto space-y-4">
                {transcripts.map((entry, index) => (
                    <div key={index} className={`flex ${entry.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-lg p-3 rounded-lg ${entry.speaker === 'user' ? 'bg-indigo-600' : 'bg-gray-700'}`}>
                            <p className="text-sm">{entry.text}</p>
                        </div>
                    </div>
                ))}
            </div>
            <button
                onClick={endInterview}
                className="w-full mt-6 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-md transition duration-300"
            >
                End Interview
            </button>
        </div>
    );

    const renderFinished = () => (
        <div className="max-w-4xl mx-auto bg-gray-800 p-8 rounded-lg shadow-xl text-center">
             <h2 className="text-2xl font-bold text-green-400 mb-4">Interview Complete!</h2>
             <p className="text-gray-300 mb-6">Here is the transcript of your interview. You can use this to analyze your performance.</p>
             <div className="text-left bg-gray-900 rounded-md p-4 overflow-y-auto max-h-96 space-y-4 mb-6">
                {transcripts.map((entry, index) => (
                    <div key={index}>
                        <p className={`font-bold ${entry.speaker === 'user' ? 'text-indigo-400' : 'text-gray-400'}`}>{entry.speaker === 'user' ? 'You' : 'Interviewer'}:</p>
                        <p className="text-gray-200 ml-2">{entry.text}</p>
                    </div>
                ))}
            </div>
             <button
                onClick={() => setInterviewState('setup')}
                className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-md transition duration-300"
            >
                Start Another Interview
            </button>
        </div>
    );


    switch (interviewState) {
        case 'in_progress':
            return renderInProgress();
        case 'finished':
        case 'error': // Show finished view even on error to let user see transcript
            return renderFinished();
        case 'setup':
        default:
            return renderSetup();
    }
};
