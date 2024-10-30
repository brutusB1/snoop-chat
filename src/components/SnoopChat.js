// src/components/SnoopChat.js

import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Upload } from 'lucide-react';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import Message from './Message';

const SnoopChat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [apiKey, setApiKey] = useState(process.env.REACT_APP_OPENAI_API_KEY || '');
  const [loading, setLoading] = useState(false);
  const [assistant, setAssistant] = useState(null);
  const [thread, setThread] = useState(null);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const messagesEndRef = useRef(null);

  // Auto-scroll to the latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // File upload handling
  const uploadFile = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('purpose', 'assistants');

      const response = await fetch('https://api.openai.com/v1/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.id;
    } catch (error) {
      console.error('File upload error:', error);
      return null;
    }
  };

  // Initialize assistant and thread
  useEffect(() => {
    if (!apiKey) return;

    const init = async () => {
      setLoading(true);
      try {
        // Create assistant
        const assistantResponse = await fetch('https://api.openai.com/v1/assistants', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'OpenAI-Beta': 'assistants=v1',
          },
          body: JSON.stringify({
            name: 'Snoop SaaS',
            instructions:
              'You are a laid-back but Snoop Dogg-esque professional working at a SaaS company. Help analyze files and provide insights in a casual but informative wayAs an AI assistant specializing in sales engagement for senior living facilities, your task is to analyze video engagement data and provide sales representatives with personalized, actionable next steps for each prospect. When appropriate, you should also act as a Sales Development Representative (SDR), assisting the sales rep by doing any legwork and analysis possible. Your ultimate goal is to facilitate move-ins by assisting in the process of moving seniors and their adult children into senior living.',

            model: 'gpt-4-turbo-preview',
            tools: [{ type: 'retrieval' }],
          }),
        });

        if (!assistantResponse.ok) {
          throw new Error(`Assistant creation failed: ${assistantResponse.statusText}`);
        }

        const assistantData = await assistantResponse.json();
        setAssistant(assistantData);

        // Create thread
        const threadResponse = await fetch('https://api.openai.com/v1/threads', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'OpenAI-Beta': 'assistants=v1',
          },
        });

        if (!threadResponse.ok) {
          throw new Error(`Thread creation failed: ${threadResponse.statusText}`);
        }

        const threadData = await threadResponse.json();
        setThread(threadData);

        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Yo! I’m ready to help. Upload some files or ask me anything!',
            timestamp: new Date(),
          },
        ]);
      } catch (error) {
        console.error('Init error:', error);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Yo, failed to initialize the assistant. Check your API key.',
            timestamp: new Date(),
          },
        ]);
      }
      setLoading(false);
    };

    init();
  }, [apiKey]);

  const handleFileChange = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;

    setUploading(true);

    try {
      // Upload each file and get file IDs
      const fileIds = await Promise.all(selectedFiles.map(uploadFile));
      const validFileIds = fileIds.filter((id) => id !== null);

      // Update assistant with new files
      if (assistant && validFileIds.length > 0) {
        const updateResponse = await fetch(`https://api.openai.com/v1/assistants/${assistant.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'OpenAI-Beta': 'assistants=v1',
          },
          body: JSON.stringify({
            file_ids: [...(assistant.file_ids || []), ...validFileIds],
          }),
        });

        if (!updateResponse.ok) {
          throw new Error(`Assistant update failed: ${updateResponse.statusText}`);
        }

        setFiles((prev) => [...prev, ...selectedFiles.map((f) => f.name)]);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `Fo' shizzle! Added ${selectedFiles.length} file${
              selectedFiles.length > 1 ? 's' : ''
            }. What would you like to know about them?`,
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      console.error('File handling error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'My bad, had some trouble with those files. Try again?',
          timestamp: new Date(),
        },
      ]);
    }
    setUploading(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || !apiKey || !assistant || !thread) return;

    setLoading(true);
    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    try {
      // Add message to thread
      const addMessageResponse = await fetch(
        `https://api.openai.com/v1/threads/${thread.id}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'OpenAI-Beta': 'assistants=v1',
          },
          body: JSON.stringify({
            role: 'user',
            content: input,
          }),
        }
      );

      if (!addMessageResponse.ok) {
        throw new Error(`Adding message failed: ${addMessageResponse.statusText}`);
      }

      // Run the assistant
      const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'OpenAI-Beta': 'assistants=v1',
        },
        body: JSON.stringify({
          assistant_id: assistant.id,
        }),
      });

      if (!runResponse.ok) {
        throw new Error(`Running assistant failed: ${runResponse.statusText}`);
      }

      const runData = await runResponse.json();

      // Poll for completion with a timeout
      const pollForCompletion = async () => {
        const maxAttempts = 30; // 30 seconds timeout
        let attempts = 0;
        while (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          const statusResponse = await fetch(
            `https://api.openai.com/v1/threads/${thread.id}/runs/${runData.id}`,
            {
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'OpenAI-Beta': 'assistants=v1',
              },
            }
          );

          if (!statusResponse.ok) {
            throw new Error(`Status check failed: ${statusResponse.statusText}`);
          }

          const statusData = await statusResponse.json();
          if (statusData.status === 'completed') {
            return statusData;
          }
          attempts += 1;
        }
        throw new Error('Assistant response timed out.');
      };

      const completedRun = await pollForCompletion();

      // Get messages
      const messagesResponse = await fetch(
        `https://api.openai.com/v1/threads/${thread.id}/messages`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'OpenAI-Beta': 'assistants=v1',
          },
        }
      );

      if (!messagesResponse.ok) {
        throw new Error(`Fetching messages failed: ${messagesResponse.statusText}`);
      }

      const messagesData = await messagesResponse.json();

      // Assuming the latest message is the assistant's response
      const latestMessage = messagesData.data.find(
        (msg) =>
          msg.role === 'assistant' &&
          !messages.some((m) => m.content === msg.content[0].text.value)
      );

      if (latestMessage) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: latestMessage.content[0].text.value,
            timestamp: new Date(),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Hmm, I didn’t catch that. Could you rephrase?',
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Yo, something went wrong. Check that API key and try again, fam.',
          timestamp: new Date(),
        },
      ]);
    }
    setLoading(false);
  };

  return (
    <Card className="max-w-2xl mx-auto mt-10">
      {/* API Key Input */}
      <Input
        type="password"
        placeholder="Enter OpenAI API Key"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        className="mb-4"
        aria-label="OpenAI API Key"
      />

      {/* File Upload */}
      <div className="mb-4">
        <label className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50">
          <Upload className="h-5 w-5 text-gray-500" />
          <span>Drop files here or click to upload</span>
          <input
            type="file"
            onChange={handleFileChange}
            multiple
            className="hidden"
            accept=".pdf,.csv,.txt,.json"
            aria-label="File Upload"
          />
        </label>
        {uploading && (
          <div className="mt-2 flex items-center text-sm text-gray-600">
            <Loader2 className="animate-spin mr-2 h-4 w-4" />
            Uploading files...
          </div>
        )}
        {files.length > 0 && (
          <div className="mt-2 text-sm text-gray-600">
            Uploaded: {files.join(', ')}
          </div>
        )}
      </div>

      {/* Chat Window */}
      <div className="h-96 overflow-y-auto mb-4 border rounded p-4 bg-gray-50">
        {messages.map((msg, i) => (
          <Message
            key={i}
            role={msg.role}
            content={msg.content}
            timestamp={msg.timestamp}
          />
        ))}
        {loading && (
          <div className="flex items-center justify-center mt-4">
            <Loader2 className="animate-spin h-6 w-6 text-purple-600" />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="What's on your mind?"
          disabled={loading || !assistant || !thread}
          aria-label="Message Input"
        />
        <button
          onClick={sendMessage}
          disabled={!apiKey || !input.trim() || loading || !assistant || !thread}
          className="p-2 bg-purple-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Send Message"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </Card>
  );
};

export default SnoopChat;