import React, { useState, useRef, useEffect } from 'react';
import { generateImage, editImage, generateVideo } from '../services/geminiService';
import { Spinner } from './common/Spinner';

// Fix: Removed `declare global` block for `window.aistudio`.
// The type definition for `window.aistudio` was conflicting with a global
// definition, causing a TypeScript error. Assuming it's globally defined elsewhere.

const ImageGenerator: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [imageUrl, setImageUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt) return;
        setIsLoading(true);
        setImageUrl('');
        setError('');
        try {
            const url = await generateImage(prompt, aspectRatio);
            setImageUrl(url);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., A photorealistic image of a futuristic city at sunset"
                    className="w-full bg-gray-700 p-3 rounded-md border border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    rows={3}
                />
                <div className="flex items-center gap-4">
                    <label htmlFor="aspectRatio" className="text-gray-300">Aspect Ratio:</label>
                    <select id="aspectRatio" value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="bg-gray-700 p-2 rounded-md border border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                        <option value="1:1">1:1 (Square)</option>
                        <option value="16:9">16:9 (Widescreen)</option>
                        <option value="9:16">9:16 (Vertical)</option>
                        <option value="4:3">4:3 (Standard)</option>
                        <option value="3:4">3:4 (Portrait)</option>
                    </select>
                </div>
                <button type="submit" disabled={isLoading || !prompt} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition duration-300 flex items-center justify-center">
                    {isLoading ? <Spinner /> : 'Generate Image'}
                </button>
            </form>
            {error && <p className="text-red-400 text-center">{error}</p>}
            {imageUrl && (
                <div className="mt-4 bg-gray-900 p-2 rounded-lg">
                    <img src={imageUrl} alt="Generated" className="rounded-md mx-auto max-h-96" />
                </div>
            )}
        </div>
    );
};

const ImageEditor: React.FC = () => {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [prompt, setPrompt] = useState('');
    const [originalUrl, setOriginalUrl] = useState('');
    const [editedUrl, setEditedUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setOriginalUrl(URL.createObjectURL(file));
            setEditedUrl('');
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt || !imageFile) return;
        setIsLoading(true);
        setEditedUrl('');
        setError('');
        try {
            const url = await editImage(imageFile, prompt);
            setEditedUrl(url);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-4">
             <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" ref={fileInputRef}/>
             <button onClick={() => fileInputRef.current?.click()} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md">
                {imageFile ? `Selected: ${imageFile.name}` : 'Select Image'}
            </button>
            
            {originalUrl && <img src={originalUrl} alt="Original" className="rounded-md mx-auto max-h-60 mt-2" />}

            <form onSubmit={handleSubmit} className="space-y-4">
                 <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., Add a retro filter, remove the person in the background"
                    className="w-full bg-gray-700 p-3 rounded-md border border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    rows={2}
                    disabled={!imageFile}
                />
                 <button type="submit" disabled={isLoading || !prompt || !imageFile} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition duration-300 flex items-center justify-center">
                    {isLoading ? <Spinner /> : 'Edit Image'}
                </button>
            </form>
            {error && <p className="text-red-400 text-center">{error}</p>}
            {editedUrl && (
                <div className="mt-4 bg-gray-900 p-2 rounded-lg">
                    <h4 className="font-semibold text-center mb-2">Edited Image</h4>
                    <img src={editedUrl} alt="Edited" className="rounded-md mx-auto max-h-96" />
                </div>
            )}
        </div>
    );
};

const VideoGenerator: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [startImageFile, setStartImageFile] = useState<File | null>(null);
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
    const [videoUrl, setVideoUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [apiKeySelected, setApiKeySelected] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        window.aistudio?.hasSelectedApiKey().then(setApiKeySelected);
    }, []);

    const handleSelectKey = async () => {
        await window.aistudio?.openSelectKey();
        setApiKeySelected(true); // Assume success to avoid race condition
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setStartImageFile(file);
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt && !startImageFile) return;
        setIsLoading(true);
        setVideoUrl('');
        setError('');
        try {
            const url = await generateVideo(prompt, aspectRatio, startImageFile ?? undefined);
            setVideoUrl(url);
        } catch (err) {
            let message = err instanceof Error ? err.message : 'An unknown error occurred';
            if (message.includes("Requested entity was not found")) {
                message = "API Key not valid. Please select a valid API key.";
                setApiKeySelected(false);
            }
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!apiKeySelected) {
        return (
            <div className="text-center p-6 bg-gray-800 rounded-lg">
                <h3 className="text-xl font-bold text-yellow-400 mb-2">API Key Required</h3>
                <p className="mb-4 text-gray-300">Video generation requires you to select a Google AI Studio API key. This allows us to track usage and ensure service availability.</p>
                <p className="text-sm text-gray-400 mb-4">For more information on billing, visit <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline">Google AI Billing Documentation</a>.</p>
                <button onClick={handleSelectKey} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded">
                    Select API Key
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
             <form onSubmit={handleSubmit} className="space-y-4">
                 <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="A cinematic shot of a hummingbird flying in slow motion..."
                    className="w-full bg-gray-700 p-3 rounded-md border border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    rows={3}
                />
                 <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" ref={fileInputRef}/>
                 <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full text-sm bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md">
                    {startImageFile ? `Start Image: ${startImageFile.name}` : 'Upload Start Image (Optional)'}
                </button>

                 <div className="flex items-center gap-4">
                    <span className="text-gray-300">Aspect Ratio:</span>
                    <label className="flex items-center gap-2">
                        <input type="radio" value="16:9" checked={aspectRatio === '16:9'} onChange={() => setAspectRatio('16:9')} className="form-radio text-indigo-500"/>
                        Landscape (16:9)
                    </label>
                    <label className="flex items-center gap-2">
                        <input type="radio" value="9:16" checked={aspectRatio === '9:16'} onChange={() => setAspectRatio('9:16')} className="form-radio text-indigo-500"/>
                        Portrait (9:16)
                    </label>
                </div>

                 <button type="submit" disabled={isLoading || (!prompt && !startImageFile)} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition duration-300 flex items-center justify-center">
                    {isLoading ? <><Spinner /> <span className="ml-2">Generating Video (may take a few minutes)...</span></> : 'Generate Video'}
                </button>
            </form>
             {error && <p className="text-red-400 text-center">{error}</p>}
             {videoUrl && (
                <div className="mt-4 bg-gray-900 p-2 rounded-lg">
                    <video src={videoUrl} controls autoPlay loop className="rounded-md mx-auto max-h-[60vh]"></video>
                </div>
            )}
        </div>
    );
};


export const CreativeSuite: React.FC = () => {
    const [activeTool, setActiveTool] = useState<'imageGen' | 'imageEdit' | 'videoGen'>('imageGen');

    const renderTool = () => {
        switch (activeTool) {
            case 'imageGen': return <ImageGenerator />;
            case 'imageEdit': return <ImageEditor />;
            case 'videoGen': return <VideoGenerator />;
            default: return null;
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-2">Creative Suite</h2>
            <p className="text-center text-gray-400 mb-8">Bring your ideas to life with AI-powered image and video generation.</p>
            
            <div className="flex justify-center border-b border-gray-700 mb-6">
                <button onClick={() => setActiveTool('imageGen')} className={`px-4 py-2 font-semibold ${activeTool === 'imageGen' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400'}`}>Image Generation</button>
                <button onClick={() => setActiveTool('imageEdit')} className={`px-4 py-2 font-semibold ${activeTool === 'imageEdit' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400'}`}>Image Editing</button>
                <button onClick={() => setActiveTool('videoGen')} className={`px-4 py-2 font-semibold ${activeTool === 'videoGen' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400'}`}>Video Generation</button>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
                 {renderTool()}
            </div>
        </div>
    );
};
