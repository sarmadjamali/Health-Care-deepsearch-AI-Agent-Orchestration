"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Send, Search, Stethoscope, User, Sparkles, Bot, Copy, ThumbsUp, ThumbsDown, Telescope } from 'lucide-react';
import axios from 'axios';
import { userContext } from '@/context/context';
import MessageCard from '@/components/message_box';

interface StreamingEvent {
  id: string;
  type: string;
  content: string;
  timestamp: Date;
  icon: string;
}

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  isDeepSearch?: boolean;
  isStreaming?: boolean;
  streamingEvents?: StreamingEvent[];
}

function ChatAssistant() {
  const { checkUser } = userContext()!;
  const [messages, setMessages] = useState<Message[]>([]);
  const [active, setActive] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [searchRole, setSearchRole] = useState<'patient' | 'doctor'>('patient');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [waitingForUserResponse, setWaitingForUserResponse] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<Message | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // WebSocket management
  const wsRef = useRef<WebSocket | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  let messageIdCounter = 0;
  const generateUniqueId = () => {
    return `${Date.now()}-${++messageIdCounter}`;
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputValue]);

  // Helper function to add streaming event
  const addStreamingEvent = (type: string, content: string, icon: string) => {
    if (streamingMessage) {
      const newEvent: StreamingEvent = {
        id: generateUniqueId(),
        type,
        content,
        timestamp: new Date(),
        icon
      };

      setStreamingMessage(prev => prev ? {
        ...prev,
        streamingEvents: [...(prev.streamingEvents || []), newEvent]
      } : null);
    }
  };

  const connectWebSocket = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    const ws = new WebSocket(`ws://127.0.0.1:8000/ws/${encodeURIComponent(checkUser)}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data);

        if (data.type === "agent_update") {
          // Add event to history and update current status
          addStreamingEvent('agent_update', data.output, '🤖');
          
          setStreamingMessage(prev => prev ? {
            ...prev,
            content: `🤖 ${data.output}`,
            timestamp: new Date(),
            isStreaming: true,
          } : null);
          
        } else if (data.type === "tool_call") {
          // Add event to history and update current status
          console.log("Tool was called");
          addStreamingEvent('tool_call', data.output, '🔧');
          
          setStreamingMessage(prev => prev ? {
            ...prev,
            content: `🔧 ${data.output}`,
            timestamp: new Date(),
            isStreaming: true,
          } : null);
          
        } else if (data.type === "intermediate") {
          // Add event to history and update current status
          addStreamingEvent('intermediate', data.output, '⚡');
          
          setStreamingMessage(prev => prev ? {
            ...prev,
            content: `⚡ Processing: ${data.output}`,
            timestamp: new Date()
          } : null);
          
        } else if (data.type === "answer") {
          // Final answer received - convert streaming message to final
          if (streamingMessage) {
            const finalMessage: Message = {
              ...streamingMessage,
              content: data.output,
              isStreaming: false,
              streamingEvents: undefined // Remove events from final message
            };

            // Replace streaming message with final answer
            setMessages(prev => {
              const filtered = prev.filter(msg => msg.id !== streamingMessage.id);
              return [...filtered, finalMessage];
            });
          } else {
            // Fallback if no streaming message exists
            const finalMessage: Message = {
              id: generateUniqueId(),
              content: data.output,
              isUser: false,
              timestamp: new Date(),
              isDeepSearch: false,
              isStreaming: false
            };
            setMessages(prev => [...prev, finalMessage]);
          }
          
          setStreamingMessage(null);
          setIsTyping(false);
          setWaitingForUserResponse(false);
          
        } else if (data.type === "ask_user") {
          // Agent is asking a question - convert streaming to question
          if (streamingMessage) {
            const questionMessage: Message = {
              ...streamingMessage,
              content: data.question,
              isStreaming: false,
              streamingEvents: undefined // Remove events from question message
            };

            // Replace streaming message with question
            setMessages(prev => {
              const filtered = prev.filter(msg => msg.id !== streamingMessage.id);
              return [...filtered, questionMessage];
            });
          } else {
            // Fallback if no streaming message exists
            const questionMessage: Message = {
              id: generateUniqueId(),
              content: data.question,
              isUser: false,
              timestamp: new Date(),
              isDeepSearch: false,
              isStreaming: false
            };
            setMessages(prev => [...prev, questionMessage]);
          }
          
          setStreamingMessage(null);
          setWaitingForUserResponse(true);
          setIsTyping(false);
          
        } else if (data.type === "error") {
          // Handle errors - convert streaming to error
          if (streamingMessage) {
            const errorMessage: Message = {
              ...streamingMessage,
              content: `❌ Error: ${data.output}`,
              isStreaming: false,
              streamingEvents: undefined // Remove events from error message
            };

            setMessages(prev => {
              const filtered = prev.filter(msg => msg.id !== streamingMessage.id);
              return [...filtered, errorMessage];
            });
          } else {
            // Fallback if no streaming message exists
            const errorMessage: Message = {
              id: generateUniqueId(),
              content: `❌ Error: ${data.output}`,
              isUser: false,
              timestamp: new Date(),
              isDeepSearch: false,
              isStreaming: false
            };
            setMessages(prev => [...prev, errorMessage]);
          }
          
          setStreamingMessage(null);
          setIsTyping(false);
          setWaitingForUserResponse(false);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsTyping(false);
      setStreamingMessage(null);
      setWaitingForUserResponse(false);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsTyping(false);
      setStreamingMessage(null);
      // Attempt to reconnect after 3 seconds
      setTimeout(connectWebSocket, 3000);
    };
  };

  // Send message via WebSocket
  const sendWebSocketMessage = (messageType: 'query' | 'answer', content: string, isDeepSearch = false) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = {
        type: messageType,
        [messageType === 'query' ? 'query' : 'answer']: content,
        enable_deepsearch: isDeepSearch,
        is_doctor: searchRole === 'doctor'
      };
      
      wsRef.current.send(JSON.stringify(message));
      return true;
    } else {
      console.error('WebSocket is not connected');
      // Try to reconnect
      connectWebSocket();
      return false;
    }
  };

  const simulateResponse = async (isDeepSearch: boolean) => {
    setIsTyping(true);

    let is_doctor = searchRole === 'doctor';
    const payload = { 
      email: checkUser,
      enable_deepsearch: isDeepSearch,
      is_doctor,
      query: inputValue
    };  
    console.log(`Request Payload => ${payload.enable_deepsearch}`)
    let newMessage: Message;
    try {
      const response = await axios.post('http://127.0.0.1:8000/chatendpoint', payload);
      console.log(`Response data => ${response.data.question} ${response.data.output}`)

      if (response.data.type === "answer") {
        // Agent gave intermediate output
        newMessage = {
          id: generateUniqueId(),
          content: response.data.output,
          isUser: false,
          timestamp: new Date(),
          isDeepSearch
        };
        console.log("Intermediate response")
        setMessages(prev => [...prev, newMessage]);
        setIsTyping(false);

      } else if (response.data.type === "ask_user") {
        // Agent wants a reply from the frontend
        newMessage = {
          id: generateUniqueId(),
          content: response.data.question,
          isUser: false,
          timestamp: new Date(),
          isDeepSearch
        };

        setMessages(prev => [...prev, newMessage]);
        setIsTyping(false);
        setWaitingForUserResponse(true);
      }

    } catch (err) {
      newMessage = {
          id: generateUniqueId(),
          content: "Error occurred",
          isUser: false,
          timestamp: new Date(),
          isDeepSearch
        };
      setMessages(prev => [...prev, newMessage]);
      console.error("There was error ", err);
      setIsTyping(false);
    }
  };

  const handleUserAnswer = async (isDeepSearch: boolean) => { 
    if (!inputValue.trim()) return; 
    setIsTyping(true);
    
    // Add user's answer to chat 
    const userMessage: Message = { 
      id: generateUniqueId(), 
      content: inputValue, 
      isUser: true, 
      timestamp: new Date(), 
      isDeepSearch 
    }; 
    setMessages(prev => [...prev, userMessage]); 
   
    try {
      // Send answer back to backend 
      const reply = await axios.post("http://127.0.0.1:8000/answer_user", { 
        email: checkUser, 
        answer: inputValue 
      }); 
      
      // Handle backend reply 
      if (reply.data.type === "answer") { 
        const agentMessage: Message = { 
          id: generateUniqueId(), 
          content: reply.data.output, 
          isUser: false, 
          timestamp: new Date(), 
          isDeepSearch
        }; 
        setMessages(prev => [...prev, agentMessage]); 
        setIsTyping(false);
        setWaitingForUserResponse(false);

      }else if (reply.data.type === "ask_user") {
        const followUpMessage: Message = {
          id: generateUniqueId(),
          content: reply.data.question,
          isUser: false,
          timestamp: new Date(),
          isDeepSearch
        };
        setMessages(prev => [...prev, followUpMessage]);
        setIsTyping(false);
      }
      
    } catch (err) {
       let newMessage = {
          id: generateUniqueId(),
          content: "Error occurred",
          isUser: false,
          timestamp: new Date(),
          isDeepSearch
        };
      setMessages(prev => [...prev, newMessage]);
      console.error("Error sending user answer:", err);
      setIsTyping(false);
      setWaitingForUserResponse(false); // Clear waiting 
    }
   
    setInputValue(""); 
  };

  const handleSubmit = async (e: React.FormEvent, isDeepSearch: boolean) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      id: generateUniqueId(),
      content: inputValue,
      isUser: true,
      timestamp: new Date(),
      isDeepSearch
    };

    setMessages(prev => [...prev, newMessage]);
    let currentInput = inputValue;
    setInputValue('');
    setIsTyping(true);

    // Connect WebSocket if not connected
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      connectWebSocket();
    }

    // Create or reuse streaming message for continuous conversation
    let streamingMsg: Message;
    
    if (waitingForUserResponse && streamingMessage) {
      // Reuse existing streaming message for follow-up
      streamingMsg = {
        ...streamingMessage,
        content: "🤔 Processing your answer...",
        timestamp: new Date(),
        isStreaming: true,
        streamingEvents: streamingMessage.streamingEvents || []
      };
      setStreamingMessage(streamingMsg);
    } else {
      // Create new streaming message for new query
      streamingMsg = {
        id: generateUniqueId(),
        content: "🔄 Starting search...",
        isUser: false,
        timestamp: new Date(),
        isDeepSearch,
        isStreaming: true,
        streamingEvents: [{
          id: generateUniqueId(),
          type: 'init',
          content: 'Starting search...',
          timestamp: new Date(),
          icon: '🔄'
        }]
      };
      setStreamingMessage(streamingMsg);
      setMessages(prev => [...prev, streamingMsg]);
    }

    // Wait a bit for WebSocket to connect if needed
    setTimeout(() => {
      const messageType = waitingForUserResponse ? 'answer' : 'query';
      const success = sendWebSocketMessage(messageType, currentInput, isDeepSearch);

      if (!success) {
        // Fallback handling if WebSocket fails
        console.error('WebSocket message failed to send');
        setStreamingMessage(null);
        setMessages(prev => prev.filter(msg => msg.id !== streamingMsg.id));
        setIsTyping(false);
      }
    }, 100);
  };

  useEffect(() => {
    connectWebSocket();
    
    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [checkUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  useEffect(() => {
    if (streamingMessage) {
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== streamingMessage.id);
        return [...filtered, streamingMessage];
      });
    }
  }, [streamingMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e, active);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">MedAssist AI</h1>
                <p className="text-sm text-gray-600">Your intelligent healthcare companion</p>
              </div>
            </div>

            {/* Role Selector */}
            <div className="flex items-center space-x-2 bg-gray-100 rounded-full p-1">
              <button
                onClick={() => setSearchRole('patient')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${searchRole === 'patient'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
                  }`}
              >
                <User className="w-4 h-4" />
                <span>Patient</span>
              </button>
              <button
                onClick={() => setSearchRole('doctor')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${searchRole === 'doctor'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
                  }`}
              >
                <Stethoscope className="w-4 h-4" />
                <span>Doctor</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Messages */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Welcome to MedAssist AI
            </h2>
            <p className="text-gray-600 max-w-md mx-auto mb-8">
              Ask me anything about health, medical conditions, or treatments.
              I'm here to help {searchRole === 'doctor' ? 'healthcare professionals' : 'patients'} with reliable information.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              <div className="bg-white rounded-xl p-4 border border-gray-200 hover:border-blue-300 transition-colors duration-200">
                <h3 className="font-semibold text-gray-900 mb-2">Quick Search</h3>
                <p className="text-sm text-gray-600">Get instant answers to your medical questions</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200 hover:border-indigo-300 transition-colors duration-200">
                <h3 className="font-semibold text-gray-900 mb-2">Deep Search</h3>
                <p className="text-sm text-gray-600">Comprehensive research with detailed analysis</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((message) => (
              <MessageCard key={message.id} message={message} searchRole={searchRole}/>
            ))}
            {isTyping && !streamingMessage && (
              <div className="flex justify-start">
                <div className="max-w-3xl order-1">
                  <div className="bg-white border border-gray-200 rounded-2xl px-6 py-4 mr-12">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm text-gray-500">AI is thinking...</span>
                    </div>
                  </div>
                </div>
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center order-2 mr-3">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* Input Area */}
      <footer className="bg-white/80 backdrop-blur-sm border-t border-gray-200 sticky bottom-0">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <form onSubmit={(e) => handleSubmit(e, active)} className="space-y-4">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask me anything as a ${searchRole}...`}
                className="w-full resize-none rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 pr-32 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 outline-none transition-all duration-200 text-gray-900 placeholder-gray-500"
                rows={1}
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />

              {/* Action Buttons */}
              <div className="absolute right-5 bottom-4 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setActive(!active)}
                  disabled={!inputValue.trim() || isTyping}
                  className={`${active ? "bg-indigo-600" : "bg-gray-400"} p-2 rounded-xl disabled:bg-gray-300 disabled:cursor-not-allowed text-white transition-all duration-200 transform hover:scale-105 active:scale-95 group`}
                  title="Deep Search"
                >
                  <Telescope className="w-4 h-4 group-hover:rotate-12 transition-transform duration-200" />
                </button>
                <button
                  type="submit"
                  onClick={(e) => handleSubmit(e, false)}
                  disabled={!inputValue.trim() || isTyping}
                  className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white transition-all duration-200 transform hover:scale-105 active:scale-95 group"
                  title="Send Message"
                >
                  <Send className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
                </button>
              </div>
            </div>

            {/* Role Indicator */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>Searching as:</span>
                <div className="flex items-center space-x-1 bg-gray-100 rounded-full px-3 py-1">
                  {searchRole === 'doctor' ? (
                    <Stethoscope className="w-4 h-4 text-blue-600" />
                  ) : (
                    <User className="w-4 h-4 text-blue-600" />
                  )}
                  <span className="font-medium text-blue-600 capitalize">{searchRole}</span>
                </div>
              </div>

              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <div className="flex items-center space-x-1">
                  <Send className="w-3 h-3" />
                  <span>Enter to send</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Search className="w-3 h-3" />
                  <span>Deep search available</span>
                </div>
              </div>
            </div>
          </form>
        </div>
      </footer>
    </div>
  );
}

export default ChatAssistant;