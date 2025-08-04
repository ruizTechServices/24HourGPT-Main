// This is your reusable "dumb" UI component. 
// It doesn't know anything about embeddings; it only knows how 
// to display an input field and a button. 
// It takes the handleEmbedding function as a prop and calls it when needed

'use client';

import { useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import DOMPurify from 'dompurify';

interface EmbedInputProps {
  handleEmbedding: (text: string) => void;
}

export default function EmbedInput({ handleEmbedding }: EmbedInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const MAX_INPUT_LENGTH = 5500;

  const submitEmbedding = () => {
    if (inputRef.current && inputRef.current.value.trim()) {
      const trimmedValue = inputRef.current.value.trim();

      // 1. Validate input length
      if (trimmedValue.length > MAX_INPUT_LENGTH) {
        // Optionally, provide feedback to the user about the length limit
        console.error(`Input exceeds maximum length of ${MAX_INPUT_LENGTH} characters.`);
        return;
      }

      // 2. Sanitize the input to prevent XSS
      const sanitizedInput = DOMPurify.sanitize(trimmedValue);

      // Pass the sanitized and validated input
      handleEmbedding(sanitizedInput);
      inputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-row items-center w-1/2">
      <Input
        ref={inputRef}
        placeholder="Input Query..."
        maxLength={MAX_INPUT_LENGTH}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            submitEmbedding();
          }
        }}
      />
      <Button onClick={submitEmbedding}>Submit</Button>
    </div>
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
