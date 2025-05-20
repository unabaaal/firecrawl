import { Request, Response } from 'express';
import { messiChatbotController } from '../messiChatbot';
import { generateCompletions } from '../../../lib/LLM-extraction';
import fs from 'fs/promises';

// Mock the external dependencies
jest.mock('../../../lib/LLM-extraction');
jest.mock('fs/promises');

describe('messiChatbotController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseJson: any;
  let responseStatus: number;

  beforeEach(() => {
    // Reset mocks and response objects for each test
    jest.clearAllMocks();
    responseJson = {};
    responseStatus = 0;

    mockRequest = {
      body: {},
    };
    mockResponse = {
      status: jest.fn().mockImplementation((status) => {
        responseStatus = status;
        return {
          json: jest.fn().mockImplementation((json) => {
            responseJson = json;
          }),
        } as any; // Type assertion to satisfy Response structure
      }),
      json: jest.fn().mockImplementation((json) => {
        responseJson = json;
      }),
    };
  });

  it('should return a 200 status and an answer when a question is provided', async () => {
    mockRequest.body = { question: 'Who is Messi?' };
    const mockAnswer = 'Messi is a football player.';
    (generateCompletions as jest.Mock).mockResolvedValue({ data: mockAnswer });
    (fs.readFile as jest.Mock).mockResolvedValue('Mocked Markdown Content');

    await messiChatbotController(mockRequest as Request, mockResponse as Response);

    expect(responseStatus).toBe(200);
    expect(responseJson.answer).toBe(mockAnswer);
    expect(fs.readFile).toHaveBeenCalledWith(expect.stringContaining('messi_history.md'), 'utf-8');
    expect(generateCompletions).toHaveBeenCalled();
  });

  it('should return a 400 status when no question is provided', async () => {
    await messiChatbotController(mockRequest as Request, mockResponse as Response);

    expect(responseStatus).toBe(400);
    expect(responseJson.error).toBe('Question is required');
    expect(fs.readFile).not.toHaveBeenCalled();
    expect(generateCompletions).not.toHaveBeenCalled();
  });

  it('should return a 500 status if generateCompletions throws an error', async () => {
    mockRequest.body = { question: 'Who is Messi?' };
    const errorMessage = 'LLM Error';
    (generateCompletions as jest.Mock).mockRejectedValue(new Error(errorMessage));
    (fs.readFile as jest.Mock).mockResolvedValue('Mocked Markdown Content');
    // Mock console.error to prevent logging during tests
    jest.spyOn(console, 'error').mockImplementation(() => {});


    await messiChatbotController(mockRequest as Request, mockResponse as Response);

    expect(responseStatus).toBe(500);
    expect(responseJson.error).toBe(errorMessage);
    expect(fs.readFile).toHaveBeenCalled();
    expect(generateCompletions).toHaveBeenCalled();
    (console.error as jest.Mock).mockRestore(); // Restore console.error
  });

  it('should return a 500 status if fs.readFile throws an error', async () => {
    mockRequest.body = { question: 'Who is Messi?' };
    const errorMessage = 'File system Error';
    (fs.readFile as jest.Mock).mockRejectedValue(new Error(errorMessage));
    // Mock console.error to prevent logging during tests
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await messiChatbotController(mockRequest as Request, mockResponse as Response);

    expect(responseStatus).toBe(500);
    expect(responseJson.error).toBe(errorMessage);
    expect(fs.readFile).toHaveBeenCalled();
    expect(generateCompletions).not.toHaveBeenCalled();
    (console.error as jest.Mock).mockRestore(); // Restore console.error
  });
  
  it('should return a 500 status if generateCompletions returns an empty response', async () => {
    mockRequest.body = { question: 'Who is Messi?' };
    (generateCompletions as jest.Mock).mockResolvedValue({ data: null }); // or { data: [] }
    (fs.readFile as jest.Mock).mockResolvedValue('Mocked Markdown Content');
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await messiChatbotController(mockRequest as Request, mockResponse as Response);

    expect(responseStatus).toBe(500);
    expect(responseJson.error).toBe('Failed to get a response from the chatbot.');
    expect(fs.readFile).toHaveBeenCalled();
    expect(generateCompletions).toHaveBeenCalled();
    (console.error as jest.Mock).mockRestore();
  });
});
