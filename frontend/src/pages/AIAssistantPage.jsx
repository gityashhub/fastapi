import { useState, useEffect, useRef } from 'react';
import { Bot, Send, User, Sparkles, Trash2, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const suggestedQuestions = [
  "What cleaning methods should I use for the columns with most missing values?",
  "How do I interpret the outlier analysis results for my data?",
  "What does the data quality score mean for my dataset?",
  "Which hypothesis test should I use based on my column types?",
  "How can I improve my dataset for machine learning?",
  "Can you explain the difference between mean and median imputation?",
  "What's the best way to handle outliers in survey data?",
];

export default function AIAssistantPage() {
  const { sessionId, dataset, columnAnalysis, stats, columnInfo } = useApp();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const initialMessage = {
      role: 'assistant',
      content: dataset 
        ? `Hello! I'm your AI Data Cleaning Assistant powered by advanced language models. I can see you have a dataset loaded with ${stats?.total_rows?.toLocaleString()} rows and ${stats?.total_columns} columns.

I can help you with:
- Analyzing specific columns and recommending cleaning strategies
- Explaining statistical concepts and methods
- Suggesting the best approaches for your data quality issues
- Answering questions about hypothesis testing and data balancing

${Object.keys(columnAnalysis || {}).length > 0 
  ? `I see you've already analyzed ${Object.keys(columnAnalysis).length} columns. Ask me about any specific column for tailored recommendations.` 
  : 'Run column analysis first to get more personalized recommendations.'}

How can I help you today?`
        : `Hello! I'm your AI Data Cleaning Assistant. Upload a dataset to get started with personalized, AI-powered guidance for your data cleaning tasks.

In the meantime, feel free to ask me general questions about:
- Data cleaning best practices
- Statistical concepts
- Handling missing values and outliers
- Survey data methodology`
    };
    setMessages([initialMessage]);
  }, [dataset, stats, columnAnalysis]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    const question = input;
    setInput('');
    setLoading(true);

    try {
      const result = await api.askAI(sessionId, question, selectedColumn);
      
      if (result.success && result.response) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: result.response 
        }]);
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: result.response || 'I apologize, but I was unable to process your question. Please try again or rephrase your question.'
        }]);
      }
    } catch (error) {
      console.error('AI request failed:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `I'm having trouble connecting to the AI service. This might be because the AI service requires an API key. Please check that GROQ_API_KEY is configured in the environment.

In the meantime, here's some general guidance based on your question:

For data cleaning tasks, I recommend:
1. Start with Column Analysis to understand each column's characteristics
2. Use Anomaly Detection to identify data quality issues  
3. Apply appropriate methods in the Cleaning Wizard
4. Visualize your results to validate the cleaning

Feel free to ask more specific questions!`
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleGetRecommendation = async (column) => {
    if (!column || loading) return;

    setMessages(prev => [...prev, { 
      role: 'user', 
      content: `Get cleaning recommendations for column "${column}"` 
    }]);
    setLoading(true);

    try {
      const result = await api.getAIRecommendation(sessionId, column);
      
      if (result.success && result.recommendation) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: result.recommendation 
        }]);
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `I couldn't generate specific recommendations for "${column}". Please make sure column analysis has been run first.`
        }]);
      }
    } catch (error) {
      console.error('Recommendation request failed:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Unable to get recommendations for "${column}". Please ensure column analysis has been run.`
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      await api.clearAIHistory(sessionId);
      setMessages([{
        role: 'assistant',
        content: 'Conversation cleared. How can I help you today?'
      }]);
      toast.success('Conversation cleared');
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  };

  const handleSuggestion = (question) => {
    setInput(question);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Assistant</h1>
          <p className="text-gray-600">Get AI-powered advice and explanations for your data cleaning tasks</p>
        </div>
        <button
          onClick={handleClearHistory}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <Trash2 className="w-4 h-4" />
          Clear Chat
        </button>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="card h-[600px] flex flex-col">
            <div className="flex-1 overflow-y-auto scrollbar-thin space-y-4 mb-4 pr-2">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'user' ? 'bg-primary-100' : 'bg-gradient-to-br from-primary-500 to-primary-700'
                  }`}>
                    {msg.role === 'user' ? (
                      <User className="w-4 h-4 text-primary-600" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div className={`max-w-[80%] p-4 rounded-xl ${
                    msg.role === 'user' 
                      ? 'bg-primary-100 text-primary-900' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-gray-100 p-4 rounded-xl">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-primary-600 animate-spin" />
                      <span className="text-sm text-gray-600">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="space-y-3">
              {dataset && columnInfo.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Context column:</span>
                  <select
                    className="select-field py-1 text-sm w-48"
                    value={selectedColumn || ''}
                    onChange={(e) => setSelectedColumn(e.target.value || null)}
                  >
                    <option value="">None (general)</option>
                    {columnInfo.map((col) => (
                      <option key={col.name} value={col.name}>
                        {col.name}
                      </option>
                    ))}
                  </select>
                  {selectedColumn && (
                    <button
                      onClick={() => handleGetRecommendation(selectedColumn)}
                      disabled={loading}
                      className="btn-secondary text-sm py-1 px-3"
                    >
                      Get Recommendations
                    </button>
                  )}
                </div>
              )}
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder={selectedColumn 
                    ? `Ask about "${selectedColumn}"...` 
                    : "Ask me anything about data cleaning..."
                  }
                  className="input-field flex-1"
                  disabled={loading}
                />
                <button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className="btn-primary px-4"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-4">
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary-600" />
              Suggested Questions
            </h3>
            <div className="space-y-2">
              {suggestedQuestions.map((question, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestion(question)}
                  className="w-full text-left p-3 text-sm rounded-lg bg-gray-50 hover:bg-primary-50 hover:text-primary-700 transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>

          {dataset && columnInfo.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-3">Quick Column Analysis</h3>
              <p className="text-xs text-gray-500 mb-3">
                Select a column to get AI-powered cleaning recommendations
              </p>
              <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin">
                {columnInfo.slice(0, 10).map((col) => (
                  <button
                    key={col.name}
                    onClick={() => {
                      setSelectedColumn(col.name);
                      handleGetRecommendation(col.name);
                    }}
                    disabled={loading}
                    className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-primary-50 transition-colors flex justify-between items-center"
                  >
                    <span className="truncate">{col.name}</span>
                    {col.missing_percentage > 0 && (
                      <span className={`text-xs ${col.missing_percentage > 20 ? 'text-red-500' : 'text-yellow-500'}`}>
                        {col.missing_percentage.toFixed(0)}%
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
