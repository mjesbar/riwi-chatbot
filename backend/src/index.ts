// Importar módulos necesarios
import * as functions from '@google-cloud/functions-framework';
import type { HttpFunction } from '@google-cloud/functions-framework';
import type { Request, Response } from '@google-cloud/functions-framework'; // Usar Request/Response de functions-framework
import dotenv from 'dotenv';
import OpenAI from 'openai';

// Cargar variables de entorno
dotenv.config();

// Interfaz para la solicitud del chat
interface ChatRequest {
  question: string;
  customerId?: string;
}

// Interfaz para la respuesta del chat
interface ChatResponse {
  answer: string;
  status?: string;
  eta?: string;
  carrier?: string;
}

// Inicializar OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Función principal del handler del chat
export const chatHandler: HttpFunction = async (req: Request, res: Response) => {
  // Configurar cabeceras CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    // Pre-flight request para CORS
    res.status(204).send('');
    return;
  }

  // Validar que la solicitud sea POST
  if (req.method !== 'POST') {
    console.warn(`WARN: Método no permitido: ${req.method}`);
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const { question, customerId }: ChatRequest = req.body;

  // 3a. Validar input: question
  if (!question || question.trim() === '') {
    console.log('INFO: Solicitud inválida: la pregunta es requerida.');
    res.status(400).json({ error: 'question is required' });
    return;
  }

  console.log(`INFO: Pregunta recibida: "${question}" para customerId: "${customerId || 'N/A'}"`);

  // Normalizar la pregunta para matching (minúsculas, sin acentos)
  const normalizedQuestion = question.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  let answer: string = "No tengo esa respuesta aún, ¿puedes reformular?"; // Opción A por defecto
  let responseData: ChatResponse = { answer };

  // 4. Reglas de respuesta (case-insensitive, soportar acentos)
  if (normalizedQuestion.includes("envio")) {
    responseData.answer = "Los pedidos tardan 2–3 días hábiles a ciudades principales.";
  } else if (normalizedQuestion.includes("devolucion")) {
    responseData.answer = "Tienes 30 días para devolver; aplica política de estado y factura.";
  } else if (normalizedQuestion.includes("precio")) {
    responseData.answer = "Los precios se actualizan a diario; verifica la ficha del producto.";
  } else if (normalizedQuestion.includes("estado de pedido") && customerId) {
    // 4d. Estado de pedido con customerId
    responseData = {
      answer: "Tu pedido está en camino.",
      status: "EN_CAMINO",
      eta: "48h",
      carrier: "MockExpress"
    };
  } else {
    // 5b. Opción B (con LLM, opcional)
    if (process.env.OPENAI_API_KEY) {
      try {
        console.log('INFO: Intentando obtener respuesta de LLM...');
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: question }],
          max_tokens: 150,
        });
        const llmResponseContent = completion.choices[0]?.message?.content;
        if (llmResponseContent) {
          responseData.answer = llmResponseContent;
          console.log('INFO: Respuesta obtenida de LLM.');
        } else {
          console.warn('WARN: LLM no devolvió contenido, degradando a respuesta por defecto.');
        }
      } catch (error: any) {
        console.error(`ERROR: Error al llamar a OpenAI: ${error.message}. Degradando a respuesta por defecto.`);
      }
    } else {
      console.log('INFO: OPENAI_API_KEY no configurada, usando respuesta por defecto.');
    }
  }

  // Enviar respuesta
  res.status(200).json(responseData);
};

functions.http('chatHandler', chatHandler);