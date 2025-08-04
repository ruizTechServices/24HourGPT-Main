// This component acts as the "brain" for your input field. 
// Its main job is to define the handleEmbedding function, which contains the logic for what happens when a user submits text. 
// Right now, it just logs to the console, but this is where you would add the actual embedding API call.


'use client';
import EmbedInput from "@/components/app/special_components/embedInput";


export default function InputEmbedder() {
  // Handles embedding submission coming from the EmbedInput client component
  const handleEmbedding = async (text: string) => {
    console.log("Input Embedder Output:", text);

    try {
      const response = await fetch('/api/embed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('Failed to get embedding.');
      }

      const { embedding } = await response.json();
      console.log("Embedding:", embedding);
      // TODO: Continue with the rest of the workflow using the embedding
      // 2. Prepare embedding with metadata for storage
      // 3. Send embedding to upsert API for vector database storage
      // 4. Send text to chat API for response generation
      // 5. Save text to jsonl file for logging/training data
      // 6. Store the embedding in state variable for UI updates
      // 7. Route response to chat context component for display
      // 8. Done - complete workflow executed
    } catch (error) {
      console.error("Error getting embedding:", error);
    };


  };

  return <EmbedInput handleEmbedding={handleEmbedding} />;
}
