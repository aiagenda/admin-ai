import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.7";

// CORS headers for all responses
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type SearchIntent = 
  | "search_similar"
  | "search_by_category"
  | "search_by_date"
  | "search_by_deadline"
  | "search_by_institution"
  | "search_forms"
  | "general_query";

type SearchResult = {
  type: "document" | "analysis" | "form";
  id: string;
  title: string;
  description?: string;
  url?: string;
  metadata?: Record<string, any>;
};

/**
 * Analyze user query to extract intent and entities
 */
async function analyzeQuery(
  query: string,
  openaiApiKey: string
): Promise<{ intent: SearchIntent; entities: Record<string, any> }> {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are a query analyzer for a Hungarian administrative document management system.
Analyze the user's query and extract:
1. Intent: One of: "search_similar", "search_by_category", "search_by_date", "search_by_deadline", "search_by_institution", "search_forms", "general_query"
   - Use "search_by_deadline" if the query asks about deadlines (határidő, lejárat, befizetési határidő, stb.)
   - Use "search_by_date" only if the query asks about upload dates (feltöltési dátum)
2. Entities: Extract relevant information like:
   - category: "adozas", "egeszsegugy", "oktatas", "szocialis", "kozlekedes", "ingatlan", "uzlet", "egyeb"
   - tags: Array of relevant tags
   - date_range: { start: "YYYY-MM-DD" or null, end: "YYYY-MM-DD" or null } - ONLY for upload dates
   - deadline_range: { start: "YYYY-MM-DD" or null, end: "YYYY-MM-DD" or null } - ONLY for deadlines
   - institution: "NAV", "TB", "EESZT", etc.
   - search_text: Text to search for in document names/descriptions

IMPORTANT: Distinguish between deadline queries (határidő, lejárat) and upload date queries (feltöltés, feltöltve).

Respond with JSON: { "intent": "...", "entities": { ... } }`,
          },
          {
            role: "user",
            content: query,
          },
        ],
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${await response.text()}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI API returned empty content");
    }

    const parsed = JSON.parse(content);
    return {
      intent: parsed.intent || "general_query",
      entities: parsed.entities || {},
    };
  } catch (error) {
    console.error("Query analysis error:", error);
    // Fallback to general query
    return {
      intent: "general_query",
      entities: { search_text: query },
    };
  }
}

/**
 * Search documents based on intent and entities
 */
async function searchDocuments(
  supabase: ReturnType<typeof createClient>,
  intent: SearchIntent,
  entities: Record<string, any>,
  userId: string
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  try {
    switch (intent) {
      case "search_similar":
      case "search_by_category": {
        const { data, error } = await supabase.rpc("search_similar_documents", {
          _category: entities.category || null,
          _tags: entities.tags || null,
          _user_id: userId,
        });

        if (error) throw error;

        if (data) {
          results.push(
            ...data.map((doc: any) => ({
              type: "document" as const,
              id: doc.id,
              title: doc.filename,
              description: `Category: ${doc.category || "N/A"}`,
              url: `/result/${doc.analysis_id || doc.id}`,
              metadata: {
                category: doc.category,
                tags: doc.tags,
                severity: doc.severity,
                deadline: doc.deadline,
              },
            }))
          );
        }
        break;
      }

      case "search_by_date": {
        // Search by upload date
        const { data, error } = await supabase.rpc("search_by_date_range", {
          _start_date: entities.date_range?.start || null,
          _end_date: entities.date_range?.end || null,
          _user_id: userId,
        });

        if (error) throw error;

        if (data) {
          results.push(
            ...data.map((doc: any) => ({
              type: "document" as const,
              id: doc.id,
              title: doc.filename,
              description: `Feltöltve: ${new Date(doc.upload_date).toLocaleDateString("hu-HU")}`,
              url: `/result/${doc.analysis_id || doc.id}`,
              metadata: {
                upload_date: doc.upload_date,
                category: doc.category,
              },
            }))
          );
        }
        break;
      }

      case "search_by_deadline": {
        // Search by deadline (not upload date)
        const startDate = entities.deadline_range?.start || null;
        const endDate = entities.deadline_range?.end || null;

        // First get user's document IDs
        const { data: userDocuments } = await supabase
          .from("documents")
          .select("id")
          .eq("user_id", userId);

        if (!userDocuments || userDocuments.length === 0) {
          break;
        }

        const userDocIds = userDocuments.map((d) => d.id);

        // Search analyses by deadline
        let query = supabase
          .from("analyses")
          .select("*, documents(id, filename, upload_date, category, tags)")
          .not("deadline", "is", null)
          .in("document_id", userDocIds);

        if (startDate) {
          query = query.gte("deadline", startDate);
        }
        if (endDate) {
          query = query.lte("deadline", endDate);
        }

        const { data: analyses, error } = await query;

        if (error) throw error;

        if (analyses && analyses.length > 0) {
          results.push(
            ...analyses.map((a: any) => ({
              type: "document" as const,
              id: a.documents?.id || a.document_id,
              title: a.documents?.filename || "Ismeretlen",
              description: `Határidő: ${new Date(a.deadline).toLocaleDateString("hu-HU")}`,
              url: `/result/${a.id}`,
              metadata: {
                deadline: a.deadline,
                category: a.documents?.category,
                severity: a.severity,
              },
            }))
          );
        }
        break;
      }

      case "search_forms": {
        let query = supabase.from("forms").select("*");

        if (entities.category) {
          query = query.eq("category", entities.category);
        }

        if (entities.tags && entities.tags.length > 0) {
          query = query.overlaps("tags", entities.tags);
        }

        if (entities.search_text) {
          query = query.or(`name.ilike.%${entities.search_text}%,description.ilike.%${entities.search_text}%`);
        }

        const { data, error } = await query.limit(20);

        if (error) throw error;

        if (data) {
          results.push(
            ...data.map((form: any) => ({
              type: "form" as const,
              id: form.id,
              title: form.name,
              description: form.description || `Intézmény: ${form.institution || "N/A"}`,
              url: `/form/${form.key}`,
              metadata: {
                institution: form.institution,
                category: form.category,
                fillable_online: form.fillable_online,
              },
            }))
          );
        }
        break;
      }

      case "general_query": {
        // General search across documents and forms
        const searchText = entities.search_text || "";

        // Search documents
        const { data: docs, error: docsError } = await supabase
          .from("documents")
          .select("*, analyses(id, severity, deadline)")
          .eq("user_id", userId)
          .or(`filename.ilike.%${searchText}%,category.ilike.%${searchText}%`)
          .limit(10);

        if (!docsError && docs) {
          results.push(
            ...docs.map((doc: any) => ({
              type: "document" as const,
              id: doc.id,
              title: doc.filename,
              description: `Category: ${doc.category || "N/A"}`,
              url: `/result/${doc.analyses?.[0]?.id || doc.id}`,
              metadata: {
                category: doc.category,
                tags: doc.tags,
              },
            }))
          );
        }

        // Search forms
        const { data: forms, error: formsError } = await supabase
          .from("forms")
          .select("*")
          .or(`name.ilike.%${searchText}%,description.ilike.%${searchText}%`)
          .limit(10);

        if (!formsError && forms) {
          results.push(
            ...forms.map((form: any) => ({
              type: "form" as const,
              id: form.id,
              title: form.name,
              description: form.description || `Intézmény: ${form.institution || "N/A"}`,
              url: `/form/${form.key}`,
              metadata: {
                institution: form.institution,
                category: form.category,
              },
            }))
          );
        }
        break;
      }
    }
  } catch (error) {
    console.error("Search error:", error);
    throw error;
  }

  return results;
}

/**
 * Generate natural language response
 */
async function generateResponse(
  results: SearchResult[],
  originalQuery: string,
  openaiApiKey: string
): Promise<string> {
  try {
    const resultsSummary = results
      .slice(0, 5)
      .map((r, i) => `${i + 1}. ${r.title}${r.description ? ` - ${r.description}` : ""}`)
      .join("\n");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content: `You are a helpful assistant for a Hungarian administrative document management system.
Generate a natural, friendly response in Hungarian that DIRECTLY answers the user's question.

CRITICAL RULES:
1. ONLY answer the specific question asked - do NOT mention irrelevant information
2. If the user asks about deadlines, ONLY mention documents with matching deadlines - do NOT mention upload dates
3. If the user asks about upload dates, ONLY mention documents with matching upload dates - do NOT mention deadlines
4. If there are NO relevant results, clearly state that no matching documents were found
5. Do NOT mention results that don't match the query criteria
6. Keep the response concise and focused on answering the question

Example:
- User asks: "Are there any letters with a deadline in November?"
- If no matching deadlines found: "I didn't find any documents with a deadline in November 2025."
- Do NOT say: "I didn't find such a deadline, but there are documents uploaded in November" - this is irrelevant!`,
          },
          {
            role: "user",
            content: `User question: "${originalQuery}"\n\nSearch results (relevant only):\n${resultsSummary || "No results"}\n\nAnswer the question DIRECTLY in English. If there are no relevant results, clearly state that no such document was found. Do not mention irrelevant information.`,
          },
        ],
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${await response.text()}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "Search complete.";
  } catch (error) {
    console.error("Response generation error:", error);
    return results.length > 0
      ? `Found ${results.length} result(s).`
      : "No results found for your search.";
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.query) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required field: query" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { query, user_id } = body;

    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey || !openaiApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing environment variables" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Analyze query
    console.log("Analyzing query:", query);
    const { intent, entities } = await analyzeQuery(query, openaiApiKey);
    console.log("Intent:", intent, "Entities:", entities);

    // Search documents
    const results = await searchDocuments(supabase, intent, entities, user_id || "");

    // Generate natural language response
    const responseText = await generateResponse(results, query, openaiApiKey);

    return new Response(
      JSON.stringify({
        success: true,
        intent,
        entities,
        results,
        response: responseText,
        count: results.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("AI Search error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message ?? "Unexpected error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

