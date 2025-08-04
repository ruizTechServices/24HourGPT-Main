// This component acts as the "brain" for your input field. 
// Its main job is to define the handleEmbedding function, which contains the logic for what happens when a user submits text. 
// Right now, it just logs to the console, but this is where you would add the actual embedding API call.


'use client';
import EmbedInput from "@/components/app/special_components/embedInput";

interface InputEmbedderProps {
  handleEmbedding: (text: string) => Promise<void>;
  isLoading: boolean;
}

export default function InputEmbedder({ handleEmbedding, isLoading }: InputEmbedderProps) {
  // Handles embedding submission coming from the EmbedInput client component
  // const handleEmbedding = async (text: string) => {
  //   console.log("Input Embedder Output:", text);

    // try {
    //   const response = await fetch('/api/embed', {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify({ text }),
    //   });

    //   if (!response.ok) {
    //     throw new Error('Failed to get embedding.');
    //   }

    //   const { embedding } = await response.json();
    //   console.log("Embedding:", embedding);
    //   //todo: submit to context window.
    //   //currently `text` and `embedding` are the variables that are passed to the handleEmbedding function.
    //   //todo: I want to send both text and embedding to context window.
    //   //COntext window should handle the embedding and text and put it into JSONL format.
    // } catch (error) {
    //   console.error("Error getting embedding:", error);
    // };



  return <EmbedInput handleEmbedding={handleEmbedding} isLoading={isLoading} />;
}
