import { Request, Response } from 'express';
import { generateCompletions } from '../../lib/LLM-extraction';
import { Document, ExtractorOptions } from '../../lib/LLM-extraction/types';
import fs from 'fs/promises';
import path from 'path';

export const messiChatbotController = async (req: Request, res: Response) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const systemPrompt = "You are a Messi history expert. Provide concise and accurate information about Lionel Messi's career, achievements, and important moments. If you don't know the answer, say so.";
    const userPrompt = question;

    // Read content from messi_history.md
    const knowledgeBasePath = path.join(__dirname, '../../knowledge_base/messi_history.md');
    const messiHistoryMarkdown = await fs.readFile(knowledgeBasePath, 'utf-8');

    const documents: Document[] = [{ url: "messi_knowledge_base/messi_history.md", markdown: messiHistoryMarkdown }];
    
    const options: ExtractorOptions = {
      schema: {},
      systemPrompt,
      userPrompt,
    };

    const llmResponse = await generateCompletions(documents, options, 'markdown');

    if (!llmResponse || !llmResponse.data || llmResponse.data.length === 0) {
      console.error('Error in messiChatbotController: LLM response is empty or invalid', llmResponse);
      return res.status(500).json({ error: 'Failed to get a response from the chatbot.' });
    }
    
    // Assuming the response is plain text and directly usable
    const answer = llmResponse.data;

    res.status(200).json({ answer });
  } catch (error) {
    console.error('Error in messiChatbotController:', error);
    // Check if the error is an object and has a message property
    const errorMessage = error && typeof error === 'object' && 'message' in error ? (error as any).message : 'Internal server error';
    res.status(500).json({ error: errorMessage });
  }
};
