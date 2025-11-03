
import React, { useState } from 'react';
import { analyzeResumeWithJd } from '../services/geminiService';
import { Spinner } from './common/Spinner';

interface AnalysisResult {
    score?: number;
    missingKeywords?: string[];
    summarySuggestion?: string;
    experienceAdvice?: string;
    error?: string;
}

const ATS_TEMPLATE = `
[Your Name]
[City, State, Zip Code] | [Phone Number] | [Email Address] | [LinkedIn URL]

SUMMARY
[A concise 2-3 sentence summary of your professional background, key skills, and career objectives. Tailor this to the specific job you are applying for.]

SKILLS
- Technical Skills: [List relevant programming languages, software, and tools, e.g., JavaScript, React, Python, AWS]
- Soft Skills: [List skills like Communication, Teamwork, Problem-Solving, Leadership]
- Certifications: [List any relevant certifications]

EXPERIENCE
[Job Title] | [Company Name], [City, State] | [Month, Year] – [Month, Year or Present]
- [Use action verbs to describe your accomplishments. Quantify your achievements with numbers and data wherever possible. e.g., "Developed and launched a new feature that increased user engagement by 15%."]
- [Focus on achievements that align with the keywords and requirements in the job description.]
- [List 3-5 bullet points per role.]

[Previous Job Title] | [Previous Company Name], [City, State] | [Month, Year] – [Month, Year]
- [Repeat the format above for previous relevant roles.]
- [Ensure consistency in formatting.]

EDUCATION
[Your Degree] | [University Name], [City, State] | [Year of Graduation]
- Relevant Coursework: [Optional: List a few key courses relevant to the job.]

PROJECTS
[Project Name] | [Link to Project if available]
- [Briefly describe a significant project you worked on. Explain the technology used and your role in the project.]
- [Highlight the outcome or success of the project.]
`;

export const ResumeHelper: React.FC = () => {
    const [resumeText, setResumeText] = useState('');
    const [jdText, setJdText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [activeTab, setActiveTab] = useState<'analyzer' | 'template'>('analyzer');

    const handleAnalyze = async () => {
        if (!resumeText.trim() || !jdText.trim()) {
            setAnalysis({ error: "Please paste both your resume and the job description." });
            return;
        }
        setIsLoading(true);
        setAnalysis(null);
        try {
            const resultString = await analyzeResumeWithJd(resumeText, jdText);
            const resultJson = JSON.parse(resultString);
            setAnalysis(resultJson);
        } catch (error) {
            console.error("Analysis failed:", error);
            setAnalysis({ error: "Failed to parse the analysis. The model may have returned an unexpected format." });
        } finally {
            setIsLoading(false);
        }
    };

    const renderAnalyzer = () => (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <textarea
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    placeholder="Paste your full resume text here..."
                    rows={15}
                    className="w-full bg-gray-700 text-white placeholder-gray-400 p-3 rounded-md border border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <textarea
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                    placeholder="Paste the target job description here..."
                    rows={15}
                    className="w-full bg-gray-700 text-white placeholder-gray-400 p-3 rounded-md border border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
            </div>
            <button
                onClick={handleAnalyze}
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-900 text-white font-bold py-3 px-4 rounded-md transition duration-300 flex items-center justify-center"
            >
                {isLoading ? <Spinner /> : "Analyze Resume for ATS Score"}
            </button>

            {analysis && (
                <div className="mt-8 bg-gray-800 p-6 rounded-lg">
                    <h3 className="text-xl font-bold text-indigo-400 mb-4">Analysis Result</h3>
                    {analysis.error && <p className="text-red-400">{analysis.error}</p>}
                    {analysis.score && (
                        <div className="mb-4">
                            <h4 className="font-semibold text-lg text-gray-300">ATS Score</h4>
                            <div className="w-full bg-gray-700 rounded-full h-4 mt-2">
                                <div className="bg-green-500 h-4 rounded-full" style={{ width: `${analysis.score}%` }}></div>
                            </div>
                            <p className="text-center font-bold text-xl mt-1">{analysis.score}/100</p>
                        </div>
                    )}
                    {analysis.missingKeywords && (
                        <div className="mb-4">
                            <h4 className="font-semibold text-lg text-gray-300">Missing Keywords</h4>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {analysis.missingKeywords.map((kw, i) => <span key={i} className="bg-yellow-600 text-yellow-100 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded">{kw}</span>)}
                            </div>
                        </div>
                    )}
                    {analysis.summarySuggestion && (
                        <div className="mb-4">
                            <h4 className="font-semibold text-lg text-gray-300">Summary Suggestion</h4>
                            <p className="bg-gray-700 p-3 rounded-md mt-2 text-gray-200">{analysis.summarySuggestion}</p>
                        </div>
                    )}
                    {analysis.experienceAdvice && (
                        <div>
                            <h4 className="font-semibold text-lg text-gray-300">Experience Section Advice</h4>
                            <p className="bg-gray-700 p-3 rounded-md mt-2 text-gray-200">{analysis.experienceAdvice}</p>
                        </div>
                    )}
                </div>
            )}
        </>
    );

    const renderTemplate = () => (
        <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-xl font-bold text-indigo-400 mb-4">ATS-Friendly Resume Template</h3>
            <p className="text-gray-400 mb-4">This template is designed to be easily parsed by Applicant Tracking Systems. Copy the text below and fill in your details.</p>
            <pre className="whitespace-pre-wrap bg-gray-900 text-gray-200 p-4 rounded-md text-sm overflow-x-auto">
                <code>{ATS_TEMPLATE}</code>
            </pre>
             <button
                onClick={() => navigator.clipboard.writeText(ATS_TEMPLATE)}
                className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition duration-300"
            >
                Copy Template
            </button>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-2">Resume & Cover Letter Tools</h2>
            <p className="text-center text-gray-400 mb-8">Optimize your application materials with AI-powered insights.</p>
            
            <div className="flex justify-center border-b border-gray-700 mb-6">
                <button onClick={() => setActiveTab('analyzer')} className={`px-4 py-2 font-semibold ${activeTab === 'analyzer' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400'}`}>Resume Analyzer</button>
                <button onClick={() => setActiveTab('template')} className={`px-4 py-2 font-semibold ${activeTab === 'template' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400'}`}>ATS Template</button>
            </div>

            {activeTab === 'analyzer' ? renderAnalyzer() : renderTemplate()}
        </div>
    );
};
