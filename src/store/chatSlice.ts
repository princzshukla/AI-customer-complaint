import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ChatMessage } from '../types';

interface ChatState {
  messages: ChatMessage[];
  isProcessing: boolean;
  ocrProgress: string | null;
}

const initialMessages: ChatMessage[] = [
  {
    id: 'msg-welcome',
    sender: 'assistant',
    text: 'Ready to process new complaints. You can paste the raw email from the customer, or upload a PDF of the complaint report. I will extract the data and run the initial risk assessment.',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
];

const initialState: ChatState = {
  messages: initialMessages,
  isProcessing: false,
  ocrProgress: null
};

export const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<ChatMessage>) => {
      state.messages.push(action.payload);
    },
    setProcessing: (state, action: PayloadAction<boolean>) => {
      state.isProcessing = action.payload;
    },
    setOcrProgress: (state, action: PayloadAction<string | null>) => {
      state.ocrProgress = action.payload;
    },
    resetChat: (state) => {
      state.messages = initialMessages;
      state.isProcessing = false;
      state.ocrProgress = null;
    }
  }
});

export const { addMessage, setProcessing, setOcrProgress, resetChat } = chatSlice.actions;
export default chatSlice.reducer;
