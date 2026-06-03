import { supabase } from "@/integrations/supabase/client";

export type FormPrefix = "NAV" | "MAK" | "LAND" | "GOV" | "MOKK" | "POST" | "GEN";

export interface InstitutionOption {
  value: string;
  label: string;
}

export const INSTITUTIONS: InstitutionOption[] = [
  { value: "Nemzeti Adó- és Vámhivatal", label: "NAV" },
  { value: "Magyar Államkincstár", label: "MÁK" },
  { value: "Földhivatal", label: "Földhivatal" },
  { value: "Kormányablak", label: "Kormányablak" },
  { value: "MOKK", label: "MOKK" },
  { value: "Magyar Posta", label: "Magyar Posta" },
  { value: "Kúria", label: "Kúria" },
  { value: "Országos Bírósági Hivatal", label: "Országos Bírósági Hivatal" },
  { value: "Egyéb", label: "Egyéb" },
];

/**
 * Infer prefix from filename based on keywords
 */
export function inferPrefixFromFilename(filename: string): FormPrefix {
  const lower = filename.toLowerCase();
  
  if (lower.includes("nav")) return "NAV";
  if (lower.includes("mak") || lower.includes("allamkincstar") || lower.includes("államkincstár")) return "MAK";
  if (lower.includes("foldhivatal") || lower.includes("földhivatal")) return "LAND";
  if (lower.includes("kormanyablak") || lower.includes("kormányablak")) return "GOV";
  if (lower.includes("mokk")) return "MOKK";
  if (lower.includes("posta")) return "POST";
  
  return "GEN";
}

/**
 * Convert filename to human-readable name
 */
export function humanizeName(filename: string): string {
  // Remove extension (PDF or DOCX)
  const withoutExt = filename.replace(/\.(pdf|docx)$/i, "");
  
  // Replace underscores, hyphens, dots with spaces
  const spaced = withoutExt.replace(/[_\-.]/g, " ");
  
  // Capitalize first letter
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Generate next available key with prefix
 */
export function generateNextKey(prefix: FormPrefix, existingKeys: string[]): string {
  // Filter keys with this prefix
  const prefixKeys = existingKeys.filter(key => key.startsWith(prefix + "-"));
  
  // Extract numbers
  const numbers = prefixKeys
    .map(key => {
      const match = key.match(/^[A-Z]+-(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(n => !isNaN(n));
  
  // Find max number
  const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
  
  // Generate next number with 2 digits
  const nextNum = (maxNum + 1).toString().padStart(2, "0");
  
  return `${prefix}-${nextNum}`;
}

/**
 * Sanitize filename for storage
 */
export function sanitizeFilename(filename: string): string {
  // Remove extension
  const ext = filename.substring(filename.lastIndexOf('.'));
  let name = filename.substring(0, filename.lastIndexOf('.'));
  
  // Convert to lowercase
  name = name.toLowerCase();
  
  // Replace Hungarian accented characters
  name = name
    .replace(/á/g, 'a')
    .replace(/é/g, 'e')
    .replace(/í/g, 'i')
    .replace(/ó/g, 'o')
    .replace(/ö/g, 'o')
    .replace(/ő/g, 'o')
    .replace(/ú/g, 'u')
    .replace(/ü/g, 'u')
    .replace(/ű/g, 'u');
  
  // Replace spaces with dashes
  name = name.replace(/\s+/g, '-');
  
  // Remove characters not allowed in Supabase storage: / \ ? % * : | " < >
  name = name.replace(/[/\\?%*:|"<>]/g, '');
  
  // Remove multiple consecutive dashes
  name = name.replace(/-+/g, '-');
  
  // Remove leading/trailing dashes
  name = name.replace(/^-+|-+$/g, '');
  
  // If name is empty after sanitization, use a default
  if (!name) {
    name = 'form';
  }
  
  return name + ext;
}

/**
 * Find unique key by appending -1, -2, -3, etc.
 */
export async function findUniqueStorageKey(baseKey: string): Promise<string> {
  const { data: existing } = await supabase
    .from("forms")
    .select("key")
    .eq("key", baseKey)
    .maybeSingle();
  
  if (!existing) {
    return baseKey;
  }
  
  // Extract base name without extension and counter
  const ext = baseKey.substring(baseKey.lastIndexOf('.'));
  const baseName = baseKey.substring(0, baseKey.lastIndexOf('.'));
  
  let counter = 1;
  let uniqueKey = `${baseName}-${counter}${ext}`;
  
  while (true) {
    const { data: exists } = await supabase
      .from("forms")
      .select("key")
      .eq("key", uniqueKey)
      .maybeSingle();
    
    if (!exists) {
      return uniqueKey;
    }
    
    counter++;
    uniqueKey = `${baseName}-${counter}${ext}`;
  }
}

/**
 * Calculate SHA1 hash of file
 */
export async function sha1File(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-1", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

/**
 * Get public URL for storage path
 */
export function publicUrlFor(supabaseUrl: string, bucket: string, path: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

/**
 * Guess institution from prefix
 */
export function guessInstitution(prefix: FormPrefix): string {
  switch (prefix) {
    case "NAV": return "Nemzeti Adó- és Vámhivatal";
    case "MAK": return "Magyar Államkincstár";
    case "LAND": return "Földhivatal";
    case "GOV": return "Kormányablak";
    case "MOKK": return "MOKK";
    case "POST": return "Magyar Posta";
    default: return "Egyéb";
  }
}
