import { useState, useEffect, useRef } from 'react';
import { Bot, Send, User, Sparkles, Trash2, RefreshCw, Download, Settings, Zap, FileText, BarChart2, Beaker, Scale, Wand2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const quickActions = [
  { id: 'overview', icon: <BarChart2 className="w-4 h-4" />, label: 'Data Overview', prompt: 'Give me an overview of my dataset including data quality issues' },
  { id: 'cleaning', icon: <Wand2 className="w-4 h-4" />, label: 'Cleaning Plan', prompt: 'Create a step-by-step cleaning plan for my dataset' },
  { id: 'hypothesis', icon: <Beaker className="w-4 h-4" />, label: 'Suggest Tests', prompt: 'What statistical tests should I run on my data?' },
  { id: 'balance', icon: <Scale className="w-4 h-4" />, label: 'Balance Check', prompt: 'Is my dataset imbalanced? If so, what should I do?' },
  { id: 'report', icon: <FileText className="w-4 h-4" />, label: 'Summary Report', prompt: 'Generate a summary report of my data cleaning progress' },
];

const contextModes = [
  { id: 'general', label: 'General Assistant', desc: 'General data cleaning advice' },
  { id: 'column', label: 'Column Focus', desc: 'Focus on a specific column' },
  { id: 'method', label: 'Method Expert', desc: 'Deep dive into cleaning methods' },
  { id: 'stats', label: 'Statistics Guide', desc: 'Statistical analysis guidance' },
];

const suggestedQuestions = {
  general: [
    "What cleaning methods should I use for the columns with most missing values?",
    "How do I interpret the outlier analysis results for my data?",
    "What does the data quality score mean for my dataset?",
    "How can I improve my dataset for machine learning?",
    "Can you explain the difference between mean and median imputation?",
  ],
  column: [
    "What's the best way to handle missing values in this column?",
    "Are there any outliers I should be concerned about?",
    "What type of distribution does this column have?",
    "Should I transform this column before analysis?",
  ],
  method: [
    "When should I use SMOTE vs random oversampling?",
    "What's the difference between winsorization and capping?",
    "How does KNN imputation work?",
    "When is deletion better than imputation?",
  ],
  stats: [
    "Which hypothesis test should I use based on my column types?",
    "How do I interpret p-values correctly?",
    "What assumptions should I check before running ANOVA?",
    "How do I test for normality?",
  ],
};

export default function AIAssistantPage() {
  const { sessionId, dataset, columnAnalysis, stats, columnInfo, columnTypes } = useApp();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState(null);
  const [contextMode, setContextMode] = useState('general');
  const [showSettings, setShowSettings] = useState(false);
  const [maxTokens, setMaxTokens] = useState(500);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const initialMessage = getInitialMessage();
    setMessages([{ role: 'assistant', content: initialMessage }]);
  }, [dataset, stats, columnAnalysis]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getInitialMessage = () => {
    if (!dataset) {
      return `Hello! I'm your AI Data Cleaning Assistant. Upload a dataset to get started with personalized, AI-powered guidance for your data cleaning tasks.

In the meantime, feel free to ask me general questions about:
- Data cleaning best practices
- Statistical concepts
- Handling missing values and outliers
- Survey data methodology`;
    }

    const analyzedCount = Object.keys(columnAnalysis || {}).length;
    const missingCols = columnInfo.filter(c => c.missing_percentage > 0).length;
    
    return `Hello! I'm your AI Data Cleaning Assistant. I can see you have a dataset loaded with ${stats?.total_rows?.toLocaleString()} rows and ${stats?.total_columns} columns.

**Quick Stats:**
- Analyzed columns: ${analyzedCount}/${stats?.total_columns}
- Columns with missing data: ${missingCols}
- Overall missing: ${stats?.missing_values?.toLocaleString() || 0} values

I can help you with:
- Analyzing specific columns and recommending cleaning strategies
- Explaining statistical concepts and methods
- Suggesting the best approaches for your data quality issues
- Answering questions about hypothesis testing and data balancing

How can I help you today?`;
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    const question = input;
    setInput('');
    setLoading(true);

    try {
      const context = {
        mode: contextMode,
        column: selectedColumn,
        max_tokens: maxTokens
      };
      
      const result = await api.askAI(sessionId, question, selectedColumn, context);
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: result.response || 'I apologize, but I was unable to process your question. Please try again.'
      }]);
    } catch (error) {
      console.error('AI request failed:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `I'm having trouble connecting to the AI service. This might be because the AI service requires an API key.

In the meantime, here's some general guidance:

1. Start with **Column Analysis** to understand each column's characteristics
2. Use **Anomaly Detection** to identify data quality issues  
3. Apply appropriate methods in the **Cleaning Wizard**
4. Visualize your results to validate the cleaning

Feel free to ask more specific questions!`
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = async (action) => {
    setInput(action.prompt);
    await new Promise(r => setTimeout(r, 100));
    const userMessage = { role: 'user', content: action.prompt };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const result = await api.askAI(sessionId, action.prompt, selectedColumn);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: result.response || 'Unable to get response'
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Failed to get AI response. Please check your API key configuration.'
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
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: result.recommendation || `Unable to generate recommendations for "${column}". Please ensure column analysis has been run.`
      }]);
    } catch (error) {
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
      const initialMessage = getInitialMessage();
      setMessages([{ role: 'assistant', content: initialMessage }]);
      toast.success('Conversation cleared');
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  };

  const exportConversation = () => {
    const text = messages.map(m => `${m.role.toUpperCase()}:\n${m.content}\n`).join('\n---\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai_conversation.txt';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Conversation exported');
  };

  const currentQuestions = suggestedQuestions[contextMode] || suggestedQuestions.general;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            🤖 AI Data Cleaning Assistant
          </h1>
          <p className="text-gray-600">Get AI-powered advice and explanations for your data cleaning tasks</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={exportConversation}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={handleClearHistory}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">AI Settings</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Response Length: {maxTokens} tokens
              </label>
              <input
                type="range"
                min="100"
                max="1000"
                step="100"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Context Mode
              </label>
              <select
                className="select-field"
                value={contextMode}
                onChange={(e) => setContextMode(e.target.value)}
              >
                {contextModes.map(mode => (
                  <option key={mode.id} value={mode.id}>{mode.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {dataset && (
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary-600" />
            Quick Actions
          </h3>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action)}
                disabled={loading}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="card h-[600px] flex flex-col">
            <div className="flex items-center gap-2 mb-4 pb-4 border-b">
              {contextModes.map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setContextMode(mode.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    contextMode === mode.id
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title={mode.desc}
                >
                  {mode.label}
                </button>
              ))}
            </div>

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
              {dataset && columnInfo.length > 0 && contextMode === 'column' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Column focus:</span>
                  <select
                    className="select-field py-1 text-sm w-48"
                    value={selectedColumn || ''}
                    onChange={(e) => setSelectedColumn(e.target.value || null)}
                  >
                    <option value="">Select column...</option>
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
                  placeholder={
                    contextMode === 'column' && selectedColumn 
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
              {currentQuestions.map((question, idx) => (
                <button
                  key={idx}
                  onClick={() => setInput(question)}
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
                Click a column to get AI-powered cleaning recommendations
              </p>
              <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin">
                {columnInfo.slice(0, 10).map((col) => (
                  <button
                    key={col.name}
                    onClick={() => {
                      setSelectedColumn(col.name);
                      setContextMode('column');
                      handleGetRecommendation(col.name);
                    }}
                    disabled={loading}
                    className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-primary-50 transition-colors flex justify-between items-center"
                  >
                    <span className="truncate">{col.name}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-400">
                        {columnTypes[col.name] || col.detected_type}
                      </span>
                      {col.missing_percentage > 0 && (
                        <span className={`text-xs ${col.missing_percentage > 20 ? 'text-red-500' : 'text-yellow-500'}`}>
                          {col.missing_percentage.toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              {columnInfo.length > 10 && (
                <p className="text-xs text-gray-400 mt-2">... and {columnInfo.length - 10} more</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
