import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateImageFromPrompt(prompt: string): Promise<string> {
  const res = await openai.images.generate({
    model: "gpt-image-1",
    prompt,
    size: "1024x1024"
  });
  const url = (res as any).data?.[0]?.url;
  if (!url) throw new Error("No se recibió URL de imagen");
  return url as string;
}
