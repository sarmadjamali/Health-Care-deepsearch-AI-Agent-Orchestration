import { Send, Search, Stethoscope, User, Sparkles, Bot, Copy, ThumbsUp, ThumbsDown, Telescope, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

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

interface MessageCardProps {
    message: Message;
    searchRole: string;
}

export default function MessageCard({message, searchRole} : MessageCardProps) {
    const [isAccordionOpen, setIsAccordionOpen] = useState(false);

    // Extract streaming status indicators from content
    const getStreamingIcon = (content: string) => {
        if (content.includes('🔄')) return <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />;
        if (content.includes('🤖')) return <Bot className="w-4 h-4 text-indigo-600" />;
        if (content.includes('🔧')) return <Search className="w-4 h-4 text-indigo-600" />;
        if (content.includes('⚡')) return <Sparkles className="w-4 h-4 text-indigo-600" />;
        if (content.includes('🔍')) return <Telescope className="w-4 h-4 text-indigo-600" />;
        return <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />;
    };

    const getStreamingLabel = (content: string) => {
        if (content.includes('🔄')) return 'Initializing...';
        if (content.includes('🤖')) return 'Agent Working...';
        if (content.includes('🔧')) return 'Using Tools...';
        if (content.includes('⚡')) return 'Processing...';
        if (content.includes('🔍')) return 'Searching...';
        return 'Processing...';
    };

    const getEventIcon = (iconEmoji: string) => {
        switch (iconEmoji) {
            case '🔄': return <Loader2 className="w-3 h-3 text-indigo-600 animate-spin" />;
            case '🤖': return <Bot className="w-3 h-3 text-indigo-600" />;
            case '🔧': return <Search className="w-3 h-3 text-indigo-600" />;
            case '⚡': return <Sparkles className="w-3 h-3 text-indigo-600" />;
            case '🔍': return <Telescope className="w-3 h-3 text-indigo-600" />;
            default: return <Loader2 className="w-3 h-3 text-indigo-600 animate-spin" />;
        }
    };

    const getEventLabel = (type: string) => {
        switch (type) {
            case 'agent_update': return 'Agent Working';
            case 'tool_call': return 'Using Tools';
            case 'intermediate': return 'Processing';
            case 'search': return 'Searching';
            case 'init': return 'Initializing';
            default: return 'Processing';
        }
    };

    // Clean content by removing emoji prefixes for display
    const cleanContent = (content: string) => {
        return content.replace(/^[🔄🤖🔧⚡🔍]\s*/, '');
    };

    return (
         <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-3xl ${message.isUser ? 'order-2' : 'order-1'}`}>
                <div
                  className={`rounded-2xl px-6 py-4 ${message.isUser
                    ? 'bg-blue-600 text-white ml-12'
                    : 'bg-white border border-gray-200 mr-12'
                    }`}
                >
                  {/* Streaming Status Header with Accordion Toggle */}
                  {message.isStreaming && !message.isUser && (
                    <div className="mb-3 pb-3 border-b border-gray-100">
                      <div 
                        className="flex items-center justify-between cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-1 rounded"
                        onClick={() => setIsAccordionOpen(!isAccordionOpen)}
                      >
                        <div className="flex items-center space-x-2">
                          {getStreamingIcon(message.content)}
                          <span className="text-sm font-medium text-indigo-600">
                            {getStreamingLabel(message.content)}
                          </span>
                          {/* Animated dots for streaming effect */}
                          <div className="flex space-x-1">
                            <div className="w-1 h-1 bg-indigo-600 rounded-full animate-pulse"></div>
                            <div className="w-1 h-1 bg-indigo-600 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                            <div className="w-1 h-1 bg-indigo-600 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                          </div>
                        </div>
                        
                        {/* Accordion Toggle Button - Always show for streaming messages */}
                        <div className="flex items-center space-x-1 text-indigo-600">
                          <span className="text-xs font-medium">
                            {message.streamingEvents ? message.streamingEvents.length : 0} events
                          </span>
                          {isAccordionOpen ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </div>

                      {/* Accordion Content - Event History */}
                      {isAccordionOpen && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {message.streamingEvents && message.streamingEvents.length > 0 ? (
                              message.streamingEvents.map((event) => (
                                <div key={event.id} className="flex items-center space-x-2 text-xs">
                                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                                    {getEventIcon(event.icon)}
                                    <span className="text-indigo-600 font-medium">
                                      {getEventLabel(event.type)}:
                                    </span>
                                    <span className="text-gray-600 truncate">
                                      {event.content}
                                    </span>
                                  </div>
                                  <span className="text-gray-400 whitespace-nowrap">
                                    {event.timestamp.toLocaleTimeString([], { 
                                      hour: '2-digit', 
                                      minute: '2-digit',
                                      second: '2-digit'
                                    })}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div className="text-xs text-gray-500 italic">No events yet...</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Deep Search Badge for completed deep searches */}
                  {message.isDeepSearch && !message.isStreaming && !message.isUser && (
                    <div className="flex items-center space-x-2 mb-3 pb-3 border-b border-gray-100">
                      <Search className="w-4 h-4 text-indigo-600" />
                      <span className="text-sm font-medium text-indigo-600">Deep Search Results</span>
                    </div>
                  )}

                  {/* Message Content */}
                  <div className={`${message.isUser ? 'text-white' : 'text-gray-800'} leading-relaxed`}>
                    {message.isStreaming && !message.isUser ? (
                      <div className="space-y-2">
                        {/* Current streaming status */}
                        <p className="text-gray-700">
                          {cleanContent(message.content)}
                        </p>
                        
                        {/* Typing indicator */}
                        <div className="flex items-center space-x-2 text-gray-500">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                          </div>
                          <span className="text-sm">Getting response...</span>
                        </div>
                      </div>
                    ) : (
                      <p>{message.content}</p>
                    )}
                  </div>

                  {/* Footer with timestamp and actions */}
                  <div className={`flex items-center justify-between mt-3 pt-2 ${message.isUser ? 'border-t border-blue-500' : 'border-t border-gray-100'
                    }`}>
                    <span className={`text-xs ${message.isUser ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                      {message.isStreaming && !message.isUser ? (
                        <span className="flex items-center space-x-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Live</span>
                        </span>
                      ) : (
                        message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      )}
                    </span>
                    
                    {/* Action buttons - only show for non-streaming assistant messages */}
                    {!message.isUser && !message.isStreaming && (
                      <div className="flex items-center space-x-2">
                        <button 
                          className="p-1 rounded hover:bg-gray-100 transition-colors duration-200"
                          onClick={() => navigator.clipboard.writeText(message.content)}
                          title="Copy message"
                        >
                          <Copy className="w-4 h-4 text-gray-500" />
                        </button>
                        <button 
                          className="p-1 rounded hover:bg-gray-100 transition-colors duration-200"
                          title="Like this response"
                        >
                          <ThumbsUp className="w-4 h-4 text-gray-500" />
                        </button>
                        <button 
                          className="p-1 rounded hover:bg-gray-100 transition-colors duration-200"
                          title="Dislike this response"
                        >
                          <ThumbsDown className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${message.isUser ? 'order-1 ml-3' : 'order-2 mr-3'
                }`}>
                {message.isUser ? (
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                    {searchRole === 'doctor' ? (
                      <Stethoscope className="w-5 h-5 text-white" />
                    ) : (
                      <User className="w-5 h-5 text-white" />
                    )}
                  </div>
                ) : (
                  <div className={`w-10 h-10 ${message.isStreaming 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 animate-pulse' 
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600'
                  } rounded-full flex items-center justify-center`}>
                    {message.isStreaming ? (
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    ) : (
                      <Bot className="w-5 h-5 text-white" />
                    )}
                  </div>
                )}
              </div>
            </div>
    )
}