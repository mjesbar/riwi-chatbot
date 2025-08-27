'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';

// Interfaz para un mensaje en el chat
interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  status?: string;
  eta?: string;
  carrier?: string;
}

// Interfaz para la respuesta del backend
interface ChatResponse {
  answer: string;
  status?: string;
  eta?: string;
  carrier?: string;
  error?: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [customerId, setCustomerId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Desplazarse al último mensaje
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Manejar el envío del formulario
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (input.trim() === '') return;

    const userMessage: Message = { id: Date.now(), text: input, sender: 'user' };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8080/chatHandler', { // Asumiendo que el backend corre en 8080
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: userMessage.text, customerId: customerId || undefined }),
      });

      const data: ChatResponse = await response.json();

      if (response.status === 400) {
        // Mostrar errores de validación del backend
        const errorMessage: Message = { id: Date.now() + 1, text: data.error || 'Error de validación desconocido', sender: 'bot' };
        setMessages((prevMessages) => [...prevMessages, errorMessage]);
      } else if (!response.ok) {
        const errorMessage: Message = { id: Date.now() + 1, text: data.error || 'Error al conectar con el chatbot.', sender: 'bot' };
        setMessages((prevMessages) => [...prevMessages, errorMessage]);
      } else {
        const botMessage: Message = {
          id: Date.now() + 1,
          text: data.answer,
          sender: 'bot',
          status: data.status,
          eta: data.eta,
          carrier: data.carrier,
        };
        setMessages((prevMessages) => [...prevMessages, botMessage]);
      }
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      const errorMessage: Message = { id: Date.now() + 1, text: 'Error de red o servidor.', sender: 'bot' };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-blue-600 text-white p-4 shadow-md">
        <h1 className="text-2xl font-bold text-center">Chatbot de Soporte</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-3xl mx-auto w-full">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow ${
                message.sender === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-300 text-gray-800'
              }`}
            >
              <p>{message.text}</p>
              {message.status && (
                <div className="text-sm mt-1">
                  <p><strong>Estado:</strong> {message.status}</p>
                  <p><strong>ETA:</strong> {message.eta}</p>
                  <p><strong>Transportista:</strong> {message.carrier}</p>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-4 border-t border-gray-200 flex items-center max-w-3xl mx-auto w-full">
        <input
          type="text"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          placeholder="ID Cliente (opcional)"
          className="flex-none w-32 p-2 border border-gray-300 rounded-lg mr-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu pregunta..."
          className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
        <button
          type="submit"
          className="ml-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Enviando...' : 'Enviar'}
        </button>
      </form>
    </div>
  );
}