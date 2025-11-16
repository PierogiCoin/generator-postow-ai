import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// 1. Upewniamy się, że .env jest wczytany
dotenv.config();

const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
    console.error("Brak klucza GEMINI_API_KEY w pliku .env. Upewnij się, że klucz jest poprawny.");
    process.exit(1);
}

// 🟢 KLUCZOWA POPRAWKA: Prawidłowe utworzenie instancji (które już było, ale musimy być pewni, że działa)
const ai = new GoogleGenerativeAI(geminiApiKey);

async function listAvailableImagenModels() {
  console.log("Łączenie z Google API w celu pobrania listy modeli...");
  
  try {
    // 🟢 Wywołanie metody listModels() na instancji 'ai' jest POPRAWNE. 
    // Jeśli nadal nie działa, to wskazuje na niekompletną instalację/konfigurację.
    const response = await ai.listModels(); 
    
    // Filtrowanie modeli związanych z generowaniem obrazów
    const imagenModels = response.models.filter(model => 
        (model.name.includes('imagen') || model.name.includes('vision') || model.name.includes('veo')) && 
        model.supportedGenerationMethods.includes('generateContent')
    );

    if (imagenModels.length > 0) {
      console.log("\n✅ ZNALEZIONE DOSTĘPNE MODELE DO GENEROWANIA OBRAZÓW/MULTIMEDIÓW:");
      imagenModels.forEach(model => {
        console.log(`  - Nazwa modelu: ${model.name}`);
        console.log(`    Wspierane metody: ${model.supportedGenerationMethods.join(', ')}`);
        console.log("--------------------");
      });
      console.log("\nUżyj jednej z tych nazw, która wydaje się być modelem Imagen (np. models/imagen-generate-002), zamiast 'imagen-4.0-generate-001' w pliku index.ts.");
    } else {
      console.log("\n⚠️ NIE ZNALEZIONO DOSTĘPNYCH MODELI IMAGEN. (Pamiętaj o Aktywacji Płatności w Google Cloud!)");
    }
    
  } catch (error: any) {
    // ❌ Jeśli teraz wystąpi błąd, to najprawdopodobniej problem z kluczem API, który nie jest 'valid' (np. bo jest blokowany przez płatności)
    console.error("\n❌ WYSTĄPIŁ BŁĄD PODCZAS POBIERANIA LISTY MODELI:");
    console.error(`Błąd: ${error.message}`);
  }
}

listAvailableImagenModels();