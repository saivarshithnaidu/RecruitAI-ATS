import { openai } from "./ai";
import { supabaseAdmin } from "./supabaseAdmin";

/**
 * RAG ENGINE UTILITY
 * Handles Document Embedding, Storage, and Context Retrieval
 */

const EMBEDDING_MODEL = "openai/text-embedding-3-small"; // 1536 dims
const GENERATION_MODEL = "google/gemini-2.0-flash-001";

/**
 * 1. Generate Embeddings for a piece of text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    try {
        const response = await openai.embeddings.create({
            model: EMBEDDING_MODEL,
            input: text.replace(/\n/g, ' '),
        });
        return response.data[0].embedding;
    } catch (error: any) {
        console.error("[RAG] Embedding Error:", error.message);
        throw error;
    }
}

/**
 * 2. Process and Store Document Chunks
 */
export async function processDocument(docId: string, fullText: string, metadata: any = {}) {
    // Basic chunking logic: Split by sentences/paragraphs (approx 1000 chars)
    const chunkSize = 1000;
    const chunks: string[] = [];
    
    for (let i = 0; i < fullText.length; i += chunkSize) {
        chunks.push(fullText.slice(i, i + chunkSize + 100)); // 100 char overlap
    }

    console.log(`[RAG] Splitting document into ${chunks.length} chunks...`);

    for (const chunk of chunks) {
        const embedding = await generateEmbedding(chunk);
        
        const { error } = await supabaseAdmin
            .from('document_chunks')
            .insert({
                doc_id: docId,
                content: chunk,
                embedding: embedding,
                metadata: metadata
            });

        if (error) {
            console.error("[RAG] Chunk Save Error:", error);
        }
    }
}

/**
 * 3. Retrieve Context for a Query
 */
export async function retrieveContext(query: string, limit = 5) {
    const queryEmbedding = await generateEmbedding(query);

    // Use Supabase RPC to perform vector similarity search
    // Requirement: Must have 'match_chunks' function in Postgres
    const { data: chunks, error } = await supabaseAdmin.rpc('match_chunks', {
        query_embedding: queryEmbedding,
        match_threshold: 0.3,
        match_count: limit,
    });

    if (error) {
        console.error("[RAG] Context Retrieval Error:", error);
        return [];
    }

    return chunks;
}
