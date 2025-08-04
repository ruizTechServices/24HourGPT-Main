// This is your reusable "dumb" UI component. 
// It doesn't know anything about embeddings; it only knows how 
// to display an input field and a button. 
// It takes the handleEmbedding function as a prop and calls it when needed

'use client';

import { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import DOMPurify from 'dompurify';

interface EmbedInputProps {
  handleEmbedding: (text: string) => Promise<void>;
  isLoading: boolean;
}

export default function EmbedInput({ handleEmbedding, isLoading }: EmbedInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const sanitizedText = DOMPurify.sanitize(inputValue);
    await handleEmbedding(sanitizedText);
    setInputValue(''); // Clear input after submission
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-row items-center w-full">
      <Input
        ref={inputRef}
        type="text"
        placeholder="Enter text to embed..."
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        disabled={isLoading}
        className="flex-grow"
      />
      <Button type="submit" disabled={isLoading || !inputValue.trim()}>
        {isLoading ? 'Sending...' : 'Send'}
      </Button>
    </form>
  );
}


//# Example on how to use this component:
// 'use client';
// import EmbedInput from "@/components/app/special_components/embedInput";



// export default function InputEmbedder() {
//   // Handles embedding submission coming from the EmbedInput client component
//   const handleEmbedding = (text: string) => {
//     console.log("Embedding:", text);
//     // TODO: Replace console.log with actual embedding logic
//   };

//   return <EmbedInput handleEmbedding={handleEmbedding} />;
// }
